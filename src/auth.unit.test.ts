import { describe, expect, it } from 'vitest';
import { refreshToken } from './auth';
import { SessionExpiredError } from './errors';

const client = { issuer: 'https://issuer.example', clientId: 'cli', clientSecret: 'secret' };

// A refresh token that has already expired, forcing the network call.
const expiredToken = {
  client,
  accessToken: 'old-access',
  refreshToken: 'old-refresh',
  expiresAt: new Date(Date.now() - 1000)
};

function mockFetch(response: { ok: boolean; status: number; body: unknown }) {
  return async () =>
    ({
      ok: response.ok,
      status: response.status,
      statusText: 'status',
      headers: { get: () => 'application/json' },
      json: async () => response.body
    }) as unknown as Response;
}

describe('refreshToken', () => {
  it('throws SessionExpiredError when the offline session is expired', async () => {
    const fetch = mockFetch({ ok: false, status: 400, body: { error: 'invalid_grant' } });
    await expect(refreshToken(fetch as never, expiredToken)).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it('throws a generic error for other refresh failures', async () => {
    const fetch = mockFetch({ ok: false, status: 500, body: { error: 'server_error' } });
    await expect(refreshToken(fetch as never, expiredToken)).rejects.not.toBeInstanceOf(SessionExpiredError);
  });

  it('returns refreshed tokens on success', async () => {
    const fetch = mockFetch({
      ok: true,
      status: 200,
      body: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 300 }
    });
    const result = await refreshToken(fetch as never, expiredToken);
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
  });

  it('does not call the token endpoint when the access token is still valid', async () => {
    let called = false;
    const fetch = (async () => {
      called = true;
      return {} as Response;
    }) as never;
    const validToken = { ...expiredToken, expiresAt: new Date(Date.now() + 60 * 1000) };
    const result = await refreshToken(fetch, validToken);
    expect(called).toBe(false);
    expect(result.accessToken).toBe('old-access');
  });
});
