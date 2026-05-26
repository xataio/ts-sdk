import { usePluginManager } from '@kubb/core/hooks';
import type { PluginClient } from '@kubb/plugin-client';
import { createReactGenerator } from '@kubb/plugin-oas/generators';
import { useOas, useOperationManager } from '@kubb/plugin-oas/hooks';
import { getBanner, getFooter } from '@kubb/plugin-oas/utils';
import { pluginTsName } from '@kubb/plugin-ts';
import { File } from '@kubb/react-fabric';
import c from 'case';

export const extraGenerator = createReactGenerator<PluginClient>({
  name: 'extra',
  Operations({ operations, generator, plugin }) {
    const pluginManager = usePluginManager();
    const oas = useOas();
    const { getFile, getName, getSchemas } = useOperationManager(generator);

    const fileName = 'extra';
    const file = pluginManager.getFile({ name: fileName, extname: '.ts', pluginKey: plugin.key });

    const imports = operations.map((operation) => {
      const name = getName(operation, {
        type: 'function'
      });

      return <File.Import key={name} name={[name]} root={file.path} path={getFile(operation).path} />;
    });

    const tags = Array.from(
      new Set(operations.flatMap((operation) => operation.getTags().map((tag: { name: string }) => tag.name)))
    );

    const operationsByPath = Object.fromEntries(
      operations
        .filter(
          (operation) =>
            ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(operation.method.toUpperCase()) &&
            operation.getOperationId() !== undefined
        )
        .map((operation) => [`${operation.method.toUpperCase()} ${operation.path}`, operation.getOperationId()])
    );

    const operationsByTag = Object.fromEntries(
      tags.map((name) => [
        c.camel(name.toLowerCase()),
        operations
          .filter((operation) => {
            return operation
              .getTags()
              .map((tag: { name: string }) => tag.name)
              .includes(name);
          })
          .map((operation) => operation.getOperationId())
      ])
    );

    const tagDictionary = Object.fromEntries(
      tags.map((name) => [
        c.camel(name.toLowerCase()),
        operations.reduce(
          (acc, operation) => {
            const upperMethod = operation.method.toUpperCase();
            if (
              operation
                .getTags()
                .map((tag: { name: string }) => tag.name)
                .includes(name) &&
              ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod) &&
              operation?.getOperationId() !== undefined
            ) {
              acc[upperMethod] = acc[upperMethod] ?? [];
              acc[upperMethod].push(operation.getOperationId());
            }

            return acc;
          },
          {} as Record<string, string[]>
        )
      ])
    );

    const xataScopes = Array.from(
      new Set(
        operations.flatMap((operation) =>
          operation.schema.security ? operation.schema.security.flatMap((security) => security.xata ?? []) : []
        )
      )
    );

    const operationErrorEntries = operations
      .filter((operation) => {
        const upperMethod = operation.method.toUpperCase();
        return (
          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(upperMethod) &&
          operation.getOperationId() !== undefined &&
          operation.getTags().length > 0
        );
      })
      .map((operation) => {
        const tagName = operation.getTags()[0]?.name ?? '';
        const tag = c.camel(tagName.toLowerCase());
        const opId = operation.getOperationId()!;
        const pascalOp = c.pascal(opId);
        const suffix = operation.method.toUpperCase() === 'GET' ? 'Query' : 'Mutation';
        const schemas = getSchemas(operation, { pluginKey: [pluginTsName], type: 'type' });
        const statusCodes = Array.from(
          new Set((schemas.errors ?? []).map((e) => e.statusCode).filter((s): s is number => typeof s === 'number'))
        ).sort((a, b) => a - b);
        const statusUnion = statusCodes.length > 0 ? statusCodes.join(' | ') : 'never';
        return { key: `${tag}.${opId}`, typeName: `${pascalOp}${suffix}`, statusUnion };
      });

    const operationErrorTypeNames = Array.from(new Set(operationErrorEntries.map((entry) => entry.typeName))).sort();

    const typesFile = operations[0] ? getFile(operations[0], { pluginKey: [pluginTsName] }) : { path: './types.ts' };

    return (
      <File
        baseName={file.baseName}
        path={file.path}
        meta={file.meta}
        banner={getBanner({ oas, output: plugin.options.output, config: pluginManager.config })}
        footer={getFooter({ oas, output: plugin.options.output })}
      >
        {imports}
        <File.Import name={operationErrorTypeNames} root={file.path} path={typesFile.path} isTypeOnly />

        <File.Source>
          {`
        export const operationsByPath = {
            ${Object.entries(operationsByPath)
              .map(([path, operation]) => `"${path}": ${operation}`)
              .join(',\n')}
        };

        export const operationsByTag = {
            ${Object.entries(operationsByTag)
              .map(
                ([tag, operations]) => `"${tag}": {
                ${operations.join(',\n')}
              }`
              )
              .join(',\n')}
        };

        export const tagDictionary = {
            ${Object.entries(tagDictionary)
              .map(([tag, operations]) => `"${tag}": ${JSON.stringify(operations, null, 2)}`)
              .join(',\n')}
        } as const;

        export const Scopes = ${JSON.stringify(xataScopes)} as const;

        export type OperationErrors = {
            ${operationErrorEntries
              .map((entry) => `'${entry.key}': ${entry.typeName}['Errors'];`)
              .join('\n            ')}
        };

        export type OperationErrorStatus = {
            ${operationErrorEntries.map((entry) => `'${entry.key}': ${entry.statusUnion};`).join('\n            ')}
        };
        `}
        </File.Source>
      </File>
    );
  }
});
