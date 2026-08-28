import { pluginTsName } from '@kubb/plugin-ts';
import { ast, defineGenerator } from 'kubb/kit';
import { File, jsxRenderer } from 'kubb/jsx';
import { ClientOperation, resolveTypeSchemas, typeNames } from '../components/client-operation';
import type { PluginClient } from '../plugin';
import { clientFile, fileBanner, operationName, typesFile } from '../utils';

export const clientGenerator = defineGenerator<PluginClient>({
  name: 'client',
  renderer: jsxRenderer,
  operation(node, ctx) {
    if (!ast.isHttpOperationNode(node)) return null;

    const { importPath } = ctx.options;
    const file = clientFile(ctx, node);
    const typeSchemas = resolveTypeSchemas(node, ctx.getResolver(pluginTsName));
    const typeImports = typeNames(typeSchemas);

    return (
      <File baseName={file.baseName} path={file.path} meta={file.meta} {...fileBanner(ctx, file)}>
        <File.Import name={'client'} path={importPath} />
        <File.Import name={['FetcherConfig']} path={importPath} isTypeOnly />
        {typeImports.length > 0 && (
          <File.Import name={typeImports} root={file.path} path={typesFile(ctx, node).path} isTypeOnly />
        )}

        <ClientOperation name={operationName(ctx, node)} node={node} typeSchemas={typeSchemas} />
      </File>
    );
  }
});
