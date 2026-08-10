import { describe, expect, it } from 'vitest';
import { DEFAULT_API_BASE_URL, XataApi } from './client';

const oidcToken = {
  type: 'oidc',
  client: { issuer: 'https://auth.xata.io/realms/xata', clientId: 'cli', clientSecret: 'secret' },
  accessToken: 'access',
  refreshToken: 'refresh',
  expiresAt: new Date()
} as const;

describe('XataApi constructor', () => {
  it('falls back to the default base url', () => {
    expect(new XataApi({ token: 'key' }).baseUrl).toBe(DEFAULT_API_BASE_URL);
    expect(new XataApi({ baseUrl: undefined, token: 'key' }).baseUrl).toBe(DEFAULT_API_BASE_URL);
  });

  it('keeps an explicit base url', () => {
    expect(new XataApi({ baseUrl: 'https://api.staging.maki.cooking', token: 'key' }).baseUrl).toBe(
      'https://api.staging.maki.cooking'
    );
  });

  it('accepts an oidc token and an unauthenticated client', () => {
    expect(new XataApi({ token: oidcToken }).token).toStrictEqual(oidcToken);
    expect(new XataApi({ token: null }).token).toBeNull();
  });

  it('rejects a base url that is not an http(s) url', () => {
    expect(() => new XataApi({ baseUrl: '', token: null })).toThrow(/baseUrl/);
    expect(() => new XataApi({ baseUrl: 'api.xata.tech', token: null })).toThrow(/baseUrl/);
    expect(() => new XataApi({ baseUrl: 'ftp://api.xata.tech', token: null })).toThrow(/baseUrl/);
  });

  it('rejects a token that would silently fail every request', () => {
    expect(() => new XataApi({ token: '' })).toThrow(/token/);
    expect(() => new XataApi({ token: { ...oidcToken, accessToken: '' } })).toThrow(/token/);
    expect(() => new XataApi({ token: { ...oidcToken, client: { ...oidcToken.client, issuer: '' } } })).toThrow(
      /token/
    );
  });

  it('rejects hooks that are not callable', () => {
    expect(() => new XataApi({ token: 'key', fetch: 'nope' as never })).toThrow(/fetch/);
    expect(() => new XataApi({ token: 'key', callbacks: { onTokenRefresh: 'nope' as never } })).toThrow(
      /onTokenRefresh/
    );
  });

  it('rejects a malformed retry configuration', () => {
    expect(() => new XataApi({ token: 'key', retry: { attempts: 0 } })).toThrow(/retry/);
    expect(() => new XataApi({ token: 'key', retry: { statuses: [1.5] } })).toThrow(/retry/);
    expect(new XataApi({ token: 'key', retry: false }).retry).toBe(false);
  });
});
