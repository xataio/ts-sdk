import { defineConfig } from '@kubb/core';
import { pluginClient } from '@kubb/plugin-client';
import { pluginOas } from '@kubb/plugin-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginZod } from '@kubb/plugin-zod';
import { env } from './env';
import { extraGenerator } from './kubb/client/extra';
import { clientGenerator } from './kubb/client/operations';

export default defineConfig(() => {
  return {
    root: '.',
    input: {
      path: `${env.NEXT_PUBLIC_BACKEND_API_URL}/openapi.json`
    },
    output: {
      path: './src/generated',
      format: 'biome',
      lint: false,
      clean: true
    },
    plugins: [
      pluginOas({
        validate: true,
        output: {
          path: './json',
          barrelType: false
        },
        serverIndex: 0,
        contentType: 'application/json'
      }),
      pluginTs({
        output: {
          path: './types.ts',
          barrelType: false
        },
        enumType: 'asConst',
        enumSuffix: 'Enum',
        dateType: 'string',
        unknownType: 'unknown',
        optionalType: 'questionTokenAndUndefined'
      }),
      pluginClient({
        output: {
          path: './components.ts',
          barrelType: false
        },
        dataReturnType: 'data',
        pathParamsType: 'object',
        paramsType: 'object',
        urlType: 'export',
        importPath: '../utils/fetcher',
        generators: [clientGenerator, extraGenerator] as any[] // Workaround for generator mismatches
      }),
      pluginZod({
        output: {
          path: './schemas.ts',
          barrelType: false
        },
        dateType: 'date',
        unknownType: 'unknown',
        importPath: 'zod',
        version: '4'
      })
    ]
  };
});
