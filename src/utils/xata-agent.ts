import { compactObject } from '@xata.io/lang';
import { version as apiPackageVersion } from '../../package.json';

const XATA_AGENT_HEADER_NAME = 'X-Xata-Agent';

const DEFAULT_XATA_AGENT_FIELDS = {
  client: '@xata.io/api',
  version: apiPackageVersion
};

export type XataAgentFields = Record<string, string | undefined>;

export const buildXataAgentFields = (overrides: XataAgentFields = {}) => {
  return {
    ...DEFAULT_XATA_AGENT_FIELDS,
    ...compactObject(overrides)
  };
};

export const serializeXataAgent = (fields: XataAgentFields) => {
  return Object.entries(compactObject(fields))
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
};

export const withXataAgentHeader = (headers: Record<string, string> | undefined, overrides?: XataAgentFields) => {
  const headerValue = serializeXataAgent(buildXataAgentFields(overrides));
  if (!headerValue) {
    return headers;
  }

  return {
    ...(headers ?? {}),
    [XATA_AGENT_HEADER_NAME]: headerValue
  };
};
