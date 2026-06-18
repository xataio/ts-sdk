import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import fetcher, { ApiError, NetworkError } from './fetcher';

const jsonResponse = (status: number, body: unknown, ok = status >= 200 && status < 300) =>
  ({
    ok,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body)
  }) as unknown as Response;

const textResponse = (status: number, body: string) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: async () => {
      throw new SyntaxError('not json');
    },
    text: async () => body
  }) as unknown as Response;

const call = (response: Response | (() => Promise<Response>)) => {
  const fetchImpl = vi.fn().mockImplementation(typeof response === 'function' ? response : async () => response);
  return fetcher({
    url: '/x',
    method: 'GET',
    baseUrl: 'https://api.example.com',
    retry: false,
    fetchImpl: fetchImpl as unknown as typeof fetch
  });
};

describe('fetcher', () => {
  it('returns parsed JSON on 2xx', async () => {
    const result = await call(jsonResponse(200, { hello: 'world' }));
    expect(result).toEqual({ hello: 'world' });
  });

  it('returns text body for non-JSON content type', async () => {
    const result = await call(textResponse(200, 'plain'));
    expect(result).toEqual('plain');
  });

  it('throws ApiError preserving status, message, and body from JSON', async () => {
    const error = (await call(
      jsonResponse(409, { id: 'org_has_projects', message: 'Organization has active projects' })
    ).catch((e) => e)) as ApiError<{ id: string; message: string }>;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(409);
    expect(error.message).toBe('Organization has active projects');
    expect(error.body).toEqual({ id: 'org_has_projects', message: 'Organization has active projects' });
  });

  it('throws ApiError with fallback message when body has no message', async () => {
    await expect(call(jsonResponse(500, null, false))).rejects.toMatchObject({
      name: 'ApiError',
      status: 500,
      message: 'Request failed with status 500'
    });
  });

  it('throws ApiError with undefined body when response is not JSON', async () => {
    const response = {
      ok: false,
      status: 502,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => {
        throw new SyntaxError('not json');
      }
    } as unknown as Response;
    const error = (await call(response).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(502);
    expect(error.body).toBeUndefined();
  });

  it('throws NetworkError when fetch itself rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('failed to fetch'));
    const error = (await fetcher({
      url: '/x',
      method: 'GET',
      baseUrl: 'https://api.example.com',
      retry: false,
      fetchImpl: fetchImpl as unknown as typeof fetch
    }).catch((e) => e)) as NetworkError;
    expect(error).toBeInstanceOf(NetworkError);
    expect(error.message).toBe('failed to fetch');
    expect(error.cause).toBeInstanceOf(TypeError);
  });

  it('captures the x-request-id header on ApiError for support tracing', async () => {
    const response = {
      ok: false,
      status: 504,
      headers: new Headers({ 'content-type': 'application/json', 'x-request-id': 'req-abc-123' }),
      json: async () => ({ message: 'gateway timeout' }),
      text: async () => '{"message":"gateway timeout"}'
    } as unknown as Response;
    const error = (await call(response).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.requestId).toBe('req-abc-123');
    expect(error.message).toBe('gateway timeout (request id: req-abc-123)');
  });

  it('lets `.status === N` narrow `ApiError | NetworkError` to the typed ApiError', () => {
    type Body409 = { message: string };
    const error: ApiError<Body409, 409> | NetworkError = new ApiError<Body409, 409>(409, { message: 'taken' }, 'taken');
    if (error.status === 409) {
      expectTypeOf(error).toEqualTypeOf<ApiError<Body409, 409>>();
      expect(error.body).toEqual({ message: 'taken' });
    } else {
      throw new Error('expected ApiError');
    }
  });
});

describe('fetcher retries', () => {
  const fast = { baseDelayMs: 0, maxDelayMs: 0 } as const;
  const run = (method: string, response: () => Promise<Response>, extra: Record<string, unknown> = {}) => {
    const fetchImpl = vi.fn().mockImplementation(response);
    const promise = fetcher({
      url: '/x',
      method,
      baseUrl: 'https://api.example.com',
      retry: fast,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      ...extra
    });
    return { fetchImpl, promise };
  };

  it('retries a NetworkError on an idempotent GET and then succeeds', async () => {
    let n = 0;
    const { fetchImpl, promise } = run('GET', async () => {
      if (n++ === 0) throw new TypeError('Failed to fetch');
      return jsonResponse(200, { ok: true });
    });
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries a retryable 5xx status and then succeeds', async () => {
    let n = 0;
    const { fetchImpl, promise } = run('GET', async () =>
      n++ === 0 ? jsonResponse(503, { message: 'unavailable' }, false) : jsonResponse(200, { ok: true })
    );
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-retryable status (404)', async () => {
    const { fetchImpl, promise } = run('GET', async () => jsonResponse(404, { message: 'not found' }, false));
    await expect(promise).rejects.toMatchObject({ name: 'ApiError', status: 404 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('does not retry a non-idempotent POST by default', async () => {
    const { fetchImpl, promise } = run('POST', async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(promise).rejects.toBeInstanceOf(NetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries a POST when explicitly marked retryable', async () => {
    let n = 0;
    const { fetchImpl, promise } = run(
      'POST',
      async () => {
        if (n++ === 0) throw new TypeError('Failed to fetch');
        return jsonResponse(200, { ok: true });
      },
      { retryable: true }
    );
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured number of attempts', async () => {
    const { fetchImpl, promise } = run(
      'GET',
      async () => {
        throw new TypeError('Failed to fetch');
      },
      { retry: { ...fast, attempts: 3 } }
    );
    await expect(promise).rejects.toBeInstanceOf(NetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('does not retry when retries are disabled', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      fetcher({
        url: '/x',
        method: 'GET',
        baseUrl: 'https://api.example.com',
        retry: false,
        fetchImpl: fetchImpl as unknown as typeof fetch
      })
    ).rejects.toBeInstanceOf(NetworkError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
