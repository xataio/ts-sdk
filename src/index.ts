import * as Components from './generated/components';
import * as Schemas from './generated/schemas';
import * as Types from './generated/types';

const { operationsByPath, operationsByTag, tagDictionary, Scopes, ...Fetchers } = Components;
const Helpers = { operationsByPath, operationsByTag, tagDictionary };

export * from './client';
export { Fetchers, Helpers, Schemas, Scopes, Types };
