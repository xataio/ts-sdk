import { pluginTsName } from '@kubb/plugin-ts';
import { definePlugin, type Output, type PluginFactoryOptions } from 'kubb/kit';
import { extraGenerator } from './client/extra';
import { clientGenerator } from './client/operations';

type Options = {
  output: Output;
  importPath: string;
};

export const pluginClientName = 'plugin-client';

export type PluginClient = PluginFactoryOptions<typeof pluginClientName, Options, Options>;

declare global {
  namespace Kubb {
    interface PluginRegistry {
      'plugin-client': PluginClient;
    }
  }
}

export const pluginClient = definePlugin<PluginClient>((options) => {
  return {
    name: pluginClientName,
    options,
    dependencies: [pluginTsName],
    hooks: {
      'kubb:plugin:setup'(ctx) {
        ctx.setOptions(options);
        ctx.addGenerator(clientGenerator, extraGenerator);
      }
    }
  };
});
