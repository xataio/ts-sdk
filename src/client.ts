import type { RequiredKeys } from '@xata.io/lang';
import { createDeviceSession, exchangeDeviceCode, type OpenIdClient, type OpenIdToken, refreshToken } from './auth';
import { type operationsByPath, operationsByTag, type tagDictionary } from './generated/components';
import type { FetchImpl } from './utils/fetch';
import fetchFn, { type FetcherConfig } from './utils/fetcher';
import { type XataAgentFields, withXataAgentHeader } from './utils/xata-agent';

type Token = string | ({ type: 'oidc'; client: OpenIdClient } & OpenIdToken);

type Callbacks = {
  onTokenRefresh?: (token: OpenIdToken) => void | Promise<void>;
};

export type ApiOptions = {
  token: Token | null;
  baseUrl: string;
  fetch?: FetchImpl;
  callbacks?: Callbacks;
  xataAgent?: XataAgentFields;
};

export type ApiClient = {
  [Tag in keyof typeof operationsByTag]: {
    [Method in keyof (typeof operationsByTag)[Tag]]: (typeof operationsByTag)[Tag][Method] extends infer Operation extends
      (...args: any) => any
      ? Omit<Parameters<Operation>[0], keyof FetcherConfig> extends infer Params
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
        ? Omit<Parameters<Operation>[0], keyof FetcherConfig>
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

type RequestEndpointParams<T extends keyof typeof operationsByPath> = Omit<
  Parameters<(typeof operationsByPath)[T]>[0],
  keyof FetcherConfig
> & {
  headers?: Record<string, string>;
};

type RequestEndpointResult<T extends keyof typeof operationsByPath> = ReturnType<(typeof operationsByPath)[T]>;

export class XataApi {
  baseUrl: string;
  token: Token | null;
  fetch: FetchImpl;
  callbacks?: Callbacks;
  xataAgent: XataAgentFields;

  constructor(options: ApiOptions) {
    this.baseUrl = options.baseUrl;
    this.token = options.token;
    this.callbacks = options.callbacks;
    this.xataAgent = options.xataAgent ?? {};

    this.fetch = options.fetch || (fetch as FetchImpl);
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
      headers: withXataAgentHeader(headers, this.xataAgent)
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
      headers
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
