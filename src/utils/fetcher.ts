import { compactObject, retry as retryAsync } from '@xata.io/lang';
import { ApiError, NetworkError } from '../errors';
import { DEFAULT_RETRY, isRetryableError, retryDelayMs, type RetryOptions } from '../retry';
import type { FetchImpl } from './fetch';

export { ApiError, NetworkError };
export type { RetryOptions };

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
      return isRetryableError(error, retryConfig.statuses);
    },
    delay: (attempt) => retryDelayMs(attempt, ctx.error, retryConfig)
  });
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
