import { isNetworkError } from '@xata.io/lang';
import { ApiError, NetworkError } from './errors';

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

export const DEFAULT_RETRY = {
  attempts: 3,
  statuses: [408, 429, 500, 502, 503, 504],
  methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'],
  baseDelayMs: 300,
  maxDelayMs: 5000
} satisfies Required<RetryOptions>;

/** Whether a failed request is worth repeating. Anything else is a settled answer. */
export function isRetryableError(error: unknown, statuses: number[] = DEFAULT_RETRY.statuses): boolean {
  if (error instanceof NetworkError) return true;
  if (error instanceof ApiError) return statuses.includes(error.status);
  return isNetworkError(error);
}

export function retryDelayMs(attempt: number, error: unknown, config: Required<RetryOptions> = DEFAULT_RETRY): number {
  if (error instanceof ApiError && typeof error.retryAfterMs === 'number') {
    return Math.min(error.retryAfterMs, 30_000);
  }
  const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** attempt);
  // jitter in the [50%, 100%] band to avoid synchronized retries (thundering herd)
  return Math.round(exponential * (0.5 + Math.random() * 0.5));
}
