import { adapterOas } from '@kubb/adapter-oas';
import { pluginTs } from '@kubb/plugin-ts';
import { pluginZod } from '@kubb/plugin-zod';
import { defineConfig } from 'kubb';
import { ast } from 'kubb/kit';
import { env } from './env';
import { pluginClient } from './kubb/plugin';

function bodySuffix(node: ast.OperationNode): string {
  return ast.isHttpOperationNode(node) && node.method === 'GET' ? 'QueryRequest' : 'MutationRequest';
}

export default defineConfig(() => {
  return {
    root: '.',
    input: `${env.NEXT_PUBLIC_BACKEND_API_URL}/openapi.json`,
    adapter: adapterOas({
      validate: true,
      server: { index: 0 },
      contentType: 'application/json',
      dateType: 'string',
      integerType: 'number',
      unknownType: 'unknown',
      enumSuffix: 'Enum'
    }),
    output: {
      path: './src/generated',
      format: 'biome',
      lint: false,
      clean: true,
      barrel: false
    },
    plugins: [
      pluginTs({
        output: {
          path: './types.ts',
          mode: 'file'
        },
        enum: { type: 'asConst', typeSuffix: '' },
        optionalType: 'questionTokenAndUndefined',
        resolver: {
          param: {
            path(node) {
              return this.name(`${node.operationId} PathParams`);
            },
            query(node) {
              return this.name(`${node.operationId} QueryParams`);
            },
            headers(node) {
              return this.name(`${node.operationId} HeaderParams`);
            }
          },
          response: {
            status(node, statusCode) {
              return this.name(`${node.operationId} ${statusCode}`);
            },
            body(node) {
              return this.name(`${node.operationId} ${bodySuffix(node)}`);
            }
          }
        }
      }),
      pluginClient({
        output: {
          path: './components.ts',
          mode: 'file'
        },
        importPath: '../utils/fetcher'
      }),
      pluginZod({
        output: {
          path: './schemas.ts',
          mode: 'file'
        },
        importPath: 'zod'
      })
    ]
  };
});
