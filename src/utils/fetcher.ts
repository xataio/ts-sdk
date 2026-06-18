import { compactObject, retry as retryAsync } from '@xata.io/lang';
import type { FetchImpl } from './fetch';

export type RetryOptions = {
  /** Total attempts including the first one. */
  attempts?: number;
  /** HTTP status codes that should be retried. */
  statuses?: number[];
  /** Request methods that are safe to retry (idempotent). */
  methods?: string[];
  baseDelayMs?: number;
  maxDelayMs?: number;
};

export type FetcherConfig = {
  baseUrl?: string;
  token?: string | null;
  fetchImpl?: FetchImpl;
  headers?: Record<string, string>;
  /** Retry policy, or `false` to disable retries. */
  retry?: RetryOptions | false;
};

export type FetcherOptions<TBody, THeaders, TQueryParams, TPathParams> = {
  url: string;
  method: string;
  body?: TBody | undefined;
  headers?: THeaders | undefined;
  queryParams?: TQueryParams | undefined;
  pathParams?: TPathParams | undefined;
  signal?: AbortSignal | undefined;
  /** Override the method-based idempotency check for this request. */
  retryable?: boolean | undefined;
} & FetcherConfig;

const DEFAULT_RETRY = {
  attempts: 3,
  statuses: [408, 429, 500, 502, 503, 504],
  methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  baseDelayMs: 300,
  maxDelayMs: 5000
} satisfies Required<RetryOptions>;

export class ApiError<TBody = unknown, TStatus extends number = number> extends Error {
  readonly status: TStatus;
  readonly body: TBody;
  /** Server-requested delay before retrying, in milliseconds (from the `Retry-After` header). */
  retryAfterMs?: number;
  /** Server-side request identifier (from the `x-request-id` header), for support tracing. */
  requestId?: string;

  constructor(status: TStatus, body: TBody, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export class NetworkError extends Error {
  readonly status: undefined;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NetworkError';
  }
}

async function client<
  TData,
  TError,
  TBody extends Record<string, unknown> | FormData | undefined | null,
  THeaders extends Record<string, unknown>,
  TQueryParams extends Record<string, unknown>,
  TPathParams extends Partial<Record<string, unknown>>
>({
  url,
  method,
  body,
  headers,
  queryParams,
  signal,
  token = null,
  baseUrl = '',
  fetchImpl = fetch,
  retry,
  retryable
}: FetcherOptions<TBody, THeaders, TQueryParams, TPathParams>): Promise<TData> {
  const requestHeaders: HeadersInit = compactObject({
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : undefined,
    ...headers
  });

  /**
   * As the fetch API is being used, when multipart/form-data is specified
   * the Content-Type header must be deleted so that the browser can set
   * the correct boundary.
   * https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects#sending_files_using_a_formdata_object
   */
  if (requestHeaders['Content-Type']?.toLowerCase().includes('multipart/form-data')) {
    delete requestHeaders['Content-Type'];
  }

  const payload =
    body instanceof FormData
      ? body
      : requestHeaders['Content-Type'] === 'application/json'
        ? JSON.stringify(body)
        : (body as unknown as string);

  const fullUrl = `${baseUrl}${resolveUrl(url, queryParams)}`;
  const methodUpper = method.toUpperCase();

  const run = async (): Promise<TData> => {
    const response = await fetchImpl(fullUrl, {
      signal,
      method: methodUpper,
      body: payload,
      headers: requestHeaders
    }).catch((e: unknown) => {
      throw new NetworkError(e instanceof Error && e.message ? e.message : 'Network error', { cause: e });
    });

    if (!response.ok) {
      const parsedBody = (await response.json().catch(() => undefined)) as TError | undefined;
      const requestId = response.headers?.get('x-request-id') ?? undefined;
      const baseMessage =
        parsedBody &&
        typeof parsedBody === 'object' &&
        'message' in parsedBody &&
        typeof parsedBody.message === 'string'
          ? parsedBody.message
          : `Request failed with status ${response.status}`;
      const message = requestId ? `${baseMessage} (request id: ${requestId})` : baseMessage;
      const error = new ApiError<TError | undefined>(response.status, parsedBody, message);
      error.requestId = requestId;
      error.retryAfterMs = parseRetryAfterMs(response.headers?.get('retry-after') ?? null);
      throw error;
    }

    if (response.headers?.get('content-type')?.includes('json')) {
      return await response.json();
    } else {
      // if it is not a json response, assume it is a blob and cast it to TData
      return (await response.text()) as unknown as TData;
    }
  };

  const retryConfig = retry === false ? null : { ...DEFAULT_RETRY, ...retry };
  const isIdempotent = retryable ?? retryConfig?.methods.includes(methodUpper) ?? false;
  if (!retryConfig || !isIdempotent) return run();

  // `shouldRetry` runs immediately before `delay`, so we stash the error to honor its `Retry-After`.
  const ctx: { error: unknown } = { error: undefined };
  return retryAsync(run, {
    retries: retryConfig.attempts - 1,
    signal,
    shouldRetry: (error) => {
      ctx.error = error;
      if (error instanceof NetworkError) return true;
      if (error instanceof ApiError) return retryConfig.statuses.includes(error.status);
      return false;
    },
    delay: (attempt) => retryDelayMs(attempt, ctx.error, retryConfig)
  });
}

function retryDelayMs(attempt: number, error: unknown, config: Required<RetryOptions>): number {
  if (error instanceof ApiError && typeof error.retryAfterMs === 'number') {
    return Math.min(error.retryAfterMs, 30_000);
  }
  const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);
  // jitter in the [50%, 100%] band to avoid synchronized retries (thundering herd)
  return Math.round(exponential * (0.5 + Math.random() * 0.5));
}

function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);
  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now());
  return undefined;
}

const resolveUrl = (url: string, queryParams: Record<string, any> = {}) => {
  let query = new URLSearchParams(queryParams).toString();
  if (query) query = `?${query}`;
  return url + query;
};

export default client;
