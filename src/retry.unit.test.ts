import { describe, expect, it } from 'vitest';
import { ApiError, NetworkError } from './errors';
import { DEFAULT_RETRY, isRetryableError, retryDelayMs } from './retry';

const apiError = (status: number, retryAfterMs?: number) => {
  const error = new ApiError(status, undefined, `Request failed with status ${status}`);
  error.retryAfterMs = retryAfterMs;
  return error;
};

describe('isRetryableError', () => {
  it('retries the transient statuses', () => {
    for (const status of DEFAULT_RETRY.statuses) {
      expect(isRetryableError(apiError(status))).toBe(true);
    }
  });

  it('does not retry statuses the server has already settled', () => {
    expect(isRetryableError(apiError(400))).toBe(false);
    expect(isRetryableError(apiError(401))).toBe(false);
    expect(isRetryableError(apiError(403))).toBe(false);
    expect(isRetryableError(apiError(404))).toBe(false);
    expect(isRetryableError(apiError(422))).toBe(false);
  });

  it('honours a caller-supplied status list', () => {
    expect(isRetryableError(apiError(404), [404])).toBe(true);
    expect(isRetryableError(apiError(500), [404])).toBe(false);
  });

  it('retries network failures, whether wrapped or message-shaped', () => {
    expect(isRetryableError(new NetworkError('fetch failed'))).toBe(true);
    expect(isRetryableError(new Error('Failed to fetch'))).toBe(true);
    expect(isRetryableError(new Error('Load failed'))).toBe(true);
  });

  it('does not retry errors that carry neither a status nor a network failure', () => {
    expect(isRetryableError(new Error('Not authenticated'))).toBe(false);
    expect(isRetryableError(undefined)).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it('backs off exponentially within the jitter band', () => {
    const { baseDelayMs, maxDelayMs } = DEFAULT_RETRY;
    for (const attempt of [0, 1, 2]) {
      const expected = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      const delay = retryDelayMs(attempt, apiError(500));
      expect(delay).toBeGreaterThanOrEqual(expected * 0.5);
      expect(delay).toBeLessThanOrEqual(expected);
    }
  });

  it('caps the backoff at the configured maximum', () => {
    expect(retryDelayMs(20, apiError(500))).toBeLessThanOrEqual(DEFAULT_RETRY.maxDelayMs);
  });

  it('prefers the server-requested delay, capped at 30s', () => {
    expect(retryDelayMs(0, apiError(429, 2000))).toBe(2000);
    expect(retryDelayMs(0, apiError(429, 120_000))).toBe(30_000);
  });
});
