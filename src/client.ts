import type { RequiredKeys } from '@xata.io/lang';
import { z } from 'zod';
import {
  createDeviceSession,
  exchangeDeviceCode,
  type OpenIdClient,
  openIdClientSchema,
  type OpenIdToken,
  openIdTokenSchema,
  refreshToken
} from './auth';
import {
  DEFAULT_API_BASE_URL,
  type OperationErrors,
  type OperationErrorStatus,
  type operationsByPath,
  operationsByTag,
  type tagDictionary
} from './generated/components';
import { retryOptionsSchema } from './retry';
import type { FetchImpl } from './utils/fetch';
import fetchFn, { type FetcherConfig } from './utils/fetcher';
import { type XataAgentFields, withXataAgentHeader } from './utils/xata-agent';

export { DEFAULT_API_BASE_URL };

const callableSchema = <T>() => {
  return z.custom<T>((value) => {
    return typeof value === 'function';
  }, 'must be a function');
};

const apiOptionsSchema = z.object({
  token: z.nullable(
    z.union([
      z.string().min(1),
      z.object({ type: z.literal('oidc'), client: openIdClientSchema }).extend(openIdTokenSchema.shape)
    ])
  ),
  baseUrl: z.url({ protocol: /^https?$/ }).default(DEFAULT_API_BASE_URL),
  fetch: z.optional(callableSchema<FetchImpl>()),
  callbacks: z.optional(
    z.object({ onTokenRefresh: z.optional(callableSchema<(token: OpenIdToken) => void | Promise<void>>()) })
  ),
  xataAgent: z.optional(z.record(z.string(), z.optional(z.string()))),
  retry: z.optional(z.union([z.literal(false), retryOptionsSchema]))
});

export type ApiOptions = z.input<typeof apiOptionsSchema>;

export type ApiClient = {
  [Tag in keyof typeof operationsByTag]: {
    [Method in keyof (typeof operationsByTag)[Tag]]: (typeof operationsByTag)[Tag][Method] extends infer Operation extends
      (...args: any) => any
      ? Omit<Parameters<Operation>[0], keyof FetcherConfig> & { headers?: Record<string, string> } extends infer Params
        ? RequiredKeys<Params> extends never
          ? (params?: Params) => ReturnType<Operation>
          : (params: Params) => ReturnType<Operation>
        : never
      : never;
  };
};

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type ApiOperation = {
  [Tag in keyof typeof operationsByTag]: keyof (typeof operationsByTag)[Tag] extends string
    ? `${Tag}.${keyof (typeof operationsByTag)[Tag]}`
    : never;
}[keyof typeof operationsByTag];

export type ApiOperationByMethod<Method extends HttpMethod> = {
  [Tag in keyof typeof tagDictionary]: {
    [TagMethod in keyof (typeof tagDictionary)[Tag]]: TagMethod extends Method
      ? (typeof tagDictionary)[Tag][TagMethod] extends readonly any[]
        ? `${Tag}.${(typeof tagDictionary)[Tag][TagMethod][number]}`
        : never
      : never;
  }[keyof (typeof tagDictionary)[Tag]];
}[keyof typeof tagDictionary];

export type ApiOperationParams<T extends ApiOperation> = T extends `${infer Tag}.${infer Operation}`
  ? Tag extends keyof typeof operationsByTag
    ? Operation extends keyof (typeof operationsByTag)[Tag]
      ? (typeof operationsByTag)[Tag][Operation] extends infer Operation extends (...args: any) => any
        ? Omit<Parameters<Operation>[0], keyof FetcherConfig> & { headers?: Record<string, string> }
        : never
      : never
    : never
  : never;

export type ApiOperationResult<T extends ApiOperation> = T extends `${infer Tag}.${infer Operation}`
  ? Tag extends keyof typeof operationsByTag
    ? Operation extends keyof (typeof operationsByTag)[Tag]
      ? (typeof operationsByTag)[Tag][Operation] extends (...args: any) => any
        ? Awaited<ReturnType<(typeof operationsByTag)[Tag][Operation]>>
        : never
      : never
    : never
  : never;

export type ApiOperationError<T extends ApiOperation> = T extends keyof OperationErrors ? OperationErrors[T] : never;

export type ApiOperationErrorStatus<T extends ApiOperation> = T extends keyof OperationErrorStatus
  ? OperationErrorStatus[T]
  : never;

type RequestEndpointParams<T extends keyof typeof operationsByPath> = Omit<
  Parameters<(typeof operationsByPath)[T]>[0],
  keyof FetcherConfig
> & {
  headers?: Record<string, string>;
};

type RequestEndpointResult<T extends keyof typeof operationsByPath> = ReturnType<(typeof operationsByPath)[T]>;

export class XataApi {
  baseUrl: string;
  token: ApiOptions['token'];
  fetch: FetchImpl;
  callbacks?: ApiOptions['callbacks'];
  xataAgent: XataAgentFields;
  retry: FetcherConfig['retry'];

  constructor(options: ApiOptions) {
    const parsed = apiOptionsSchema.safeParse(options);
    if (!parsed.success) {
      throw new Error(`Invalid XataApi options:\n${z.prettifyError(parsed.error)}`);
    }

    const { baseUrl, token, callbacks, xataAgent, retry, fetch: fetchImpl } = parsed.data;
    this.baseUrl = baseUrl;
    this.token = token;
    this.callbacks = callbacks;
    this.xataAgent = xataAgent ?? {};
    this.retry = retry;

    this.fetch = fetchImpl ?? (fetch as FetchImpl);
    if (!this.fetch) throw new Error('Fetch is required');
  }

  static async *deviceLogin(client: OpenIdClient): AsyncGenerator<
    | {
        type: 'prompt';
        verifyUrl: string;
        userCode: string;
        deviceCode: string;
      }
    | {
        type: 'token';
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
      },
    void,
    unknown
  > {
    const deviceData = await createDeviceSession(client);
    yield { type: 'prompt', ...deviceData };

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, deviceData.interval * 1000));

      const tokenData = await exchangeDeviceCode(client, deviceData.deviceCode);
      if (tokenData) {
        yield { type: 'token', ...tokenData };
        return;
      }
    }
  }

  get api() {
    const getConfig = async (headers: Record<string, string> | undefined): Promise<FetcherConfig> => ({
      baseUrl: this.baseUrl,
      token: await this.refreshToken(),
      fetchImpl: this.fetch,
      headers: withXataAgentHeader(headers, this.xataAgent),
      retry: this.retry
    });

    return new Proxy(
      {},
      {
        get: (_target, namespace: keyof typeof operationsByTag) => {
          if (operationsByTag[namespace] === undefined) {
            return undefined;
          }

          return new Proxy(
            {},
            {
              get: (_target, operation: keyof (typeof operationsByTag)[keyof typeof operationsByTag]) => {
                if (operationsByTag[namespace][operation] === undefined) {
                  return undefined;
                }

                const method = operationsByTag[namespace][operation] as any;

                return async (params: Record<string, any> = {}) => {
                  return await method({ ...params, config: await getConfig(params.headers) });
                };
              }
            }
          );
        }
      }
    ) as ApiClient;
  }

  public async request<Endpoint extends keyof typeof operationsByPath>(
    endpoint: Endpoint,
    params: RequestEndpointParams<Endpoint>
  ) {
    const [method = '', url = ''] = endpoint.split(' ');
    const headers = withXataAgentHeader(params.headers, this.xataAgent);

    const result: RequestEndpointResult<Endpoint> = await fetchFn({
      ...params,
      method,
      url,
      baseUrl: this.baseUrl,
      token: await this.refreshToken(),
      fetchImpl: this.fetch,
      headers,
      retry: this.retry
    });

    return result;
  }

  public async refreshToken() {
    if (!this.token) {
      throw new Error('No token provided');
    }

    if (typeof this.token === 'string') {
      return this.token;
    }

    const newToken = await refreshToken(this.fetch, this.token);
    this.token = {
      ...this.token,
      accessToken: newToken.accessToken,
      refreshToken: newToken.refreshToken,
      expiresAt: newToken.expiresAt
    };
    await this.callbacks?.onTokenRefresh?.(this.token);

    return this.token.accessToken;
  }
}
