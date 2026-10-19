import { pluginTsName } from '@kubb/plugin-ts';
import { addGenerator, defineExtension, type Output, type PluginType } from 'kubb/kit';
import { extraGenerator } from './client/extra';
import { clientGenerator } from './client/operations';

type Options = {
  output: Output;
  importPath: string;
};

export const pluginClientName = 'plugin-client';

export type PluginClient = PluginType<typeof pluginClientName, Options, Options>;

declare global {
  namespace Kubb {
    interface PluginRegistry {
      'plugin-client': PluginClient;
    }
  }
}

export const pluginClient = defineExtension<PluginClient>({
  kind: 'plugin',
  meta: { name: pluginClientName },
  dependencies: [pluginTsName],
  setup(options) {
    addGenerator(clientGenerator, extraGenerator);
    return options;
  }
});
