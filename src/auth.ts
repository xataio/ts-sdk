import type { FetchImpl } from './utils/fetch';

export async function refreshToken(
  fetch: FetchImpl,
  {
    client: { issuer, clientId, clientSecret },
    accessToken,
    refreshToken,
    expiresAt
  }: { client: OpenIdClient } & OpenIdToken
): Promise<OpenIdToken> {
  // If the token doesn't expire in the next 30 seconds, do nothing
  if (expiresAt > new Date(Date.now() + 30 * 1000)) {
    return { accessToken, refreshToken, expiresAt };
  }

  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    }).toString()
  });

  if (!response.ok) {
    const isJson = response.headers?.get('Content-Type')?.includes('application/json');
    const errorData = isJson ? await response.json() : { error: 'Unknown error' };
    throw new Error(`HTTP error! status: ${response.status}, error: ${errorData?.error}`);
  }

  const tokenData: TokenResponse = await response.json();

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: new Date(Date.now() + tokenData.expires_in * 1000)
  };
}

export async function createDeviceSession({ issuer, clientId, clientSecret }: OpenIdClient) {
  const response = await fetch(`${issuer}/protocol/openid-connect/auth/device`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'openid offline_access'
    }).toString()
  });

  if (!response.ok) {
    const isJson = response.headers?.get('Content-Type')?.includes('application/json');
    const errorData = isJson ? await response.json() : { error: 'Unknown error' };
    throw new Error(`HTTP error! status: ${response.status}, error: ${errorData?.error}`);
  }

  const deviceData: DeviceResponse = await response.json();

  return {
    verifyUrl: deviceData.verification_uri,
    userCode: deviceData.user_code,
    deviceCode: deviceData.device_code,
    interval: deviceData.interval
  };
}

export async function exchangeDeviceCode({ issuer, clientId, clientSecret }: OpenIdClient, deviceCode: string) {
  const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      device_code: deviceCode
    }).toString()
  });

  if (response.ok) {
    const data: TokenResponse = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000)
    };
  }

  if (response.status === 400) {
    const isJson = response.headers?.get('Content-Type')?.includes('application/json');
    const errorData = isJson ? await response.json() : { error: 'Unknown error' };
    if (errorData?.error === 'authorization_pending') {
      return null; // The user has not yet authorized the device
    }

    throw new Error(`HTTP error! status: ${response.status}, error: ${errorData?.error}`);
  }

  throw new Error(`HTTP error! status: ${response.status}, error: ${response.statusText}`);
}

export type OpenIdClient = {
  issuer: string;
  clientId: string;
  clientSecret: string;
};

export type OpenIdToken = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

type DeviceResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  interval: number;
  expires_in: number;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
};
