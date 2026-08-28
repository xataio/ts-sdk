import type { Document } from '@kubb/adapter-oas';
import { pluginTsName } from '@kubb/plugin-ts';
import { camelCase, uniq } from '@xata.io/lang';
import { ast, defineGenerator } from 'kubb/kit';
import { File, jsxRenderer } from 'kubb/jsx';
import { resolveTypeSchemas } from '../components/client-operation';
import type { PluginClient } from '../plugin';
import { type ClientContext, clientFile, fileBanner, operationName, typesFile } from '../utils';

type SecuredOperations = Record<string, { security?: Array<Record<string, string[] | undefined>> } | undefined>;

// The AST drops OAS `security`, so the xata scopes have to be read back off the source document.
function xataScopes(node: ast.HttpOperationNode, document: Document | null): string[] {
  const pathItem = document?.paths?.[node.path] as SecuredOperations | undefined;
  const security = pathItem?.[node.method.toLowerCase()]?.security ?? [];
  return security.flatMap((entry) => {
    return entry.xata ?? [];
  });
}

// Lowercased first so a tag like "GitHub App" keys as `githubApp` rather than `gitHubApp`.
function tagOf(name: string): string {
  return camelCase(name.toLowerCase());
}

function namesByMethod(ctx: ClientContext, nodes: ast.HttpOperationNode[]): Record<string, string[]> {
  const methods = uniq(nodes.map((node) => node.method.toUpperCase()));
  return Object.fromEntries(
    methods.map((method) => {
      const tagged = nodes.filter((node) => node.method.toUpperCase() === method);
      return [method, tagged.map((node) => operationName(ctx, node))];
    })
  );
}

export const extraGenerator = defineGenerator<PluginClient>({
  name: 'extra',
  renderer: jsxRenderer,
  operations(nodes, ctx) {
    const { adapter, meta, resolver, root } = ctx;
    const { output } = ctx.options;
    const tsResolver = ctx.getResolver(pluginTsName);

    if (!meta.baseURL) throw new Error('The OpenAPI document has no server URL to derive DEFAULT_API_BASE_URL from');

    const file = resolver.file({ name: 'extra', extname: '.ts', root, output });
    const document = adapter.document as Document | null;

    const httpNodes = nodes.filter(ast.isHttpOperationNode);
    const byTag = uniq(httpNodes.flatMap((node) => node.tags)).map((tag) => {
      return { key: tagOf(tag), nodes: httpNodes.filter((node) => node.tags.includes(tag)) };
    });

    const scopes = uniq(httpNodes.flatMap((node) => xataScopes(node, document)));

    const errorEntries = httpNodes.map((node) => {
      const { errors } = resolveTypeSchemas(node, tsResolver);
      const statusCodes = uniq(errors.map((error) => error.statusCode)).sort((a, b) => a - b);
      return {
        key: `${tagOf(node.tags[0] ?? 'default')}.${node.operationId}`,
        names: errors.map((error) => error.name),
        statusUnion: statusCodes.length > 0 ? statusCodes.join(' | ') : 'never'
      };
    });

    const errorImports = uniq(errorEntries.flatMap((entry) => entry.names)).sort();
    const firstNode = httpNodes[0];
    const typesPath = firstNode ? typesFile(ctx, firstNode).path : undefined;

    const byPathSource = httpNodes.map((node) => {
      return `  "${node.method.toUpperCase()} ${node.path}": ${operationName(ctx, node)}`;
    });

    const byTagSource = byTag.map(({ key, nodes: tagged }) => {
      const names = tagged.map((node) => `    ${operationName(ctx, node)}`);
      return `  "${key}": {\n${names.join(',\n')}\n  }`;
    });

    const tagDictionarySource = byTag.map(({ key, nodes: tagged }) => {
      return `  "${key}": ${JSON.stringify(namesByMethod(ctx, tagged), null, 2)}`;
    });

    return (
      <File baseName={file.baseName} path={file.path} meta={file.meta} {...fileBanner(ctx, file)}>
        {httpNodes.map((node) => {
          const name = operationName(ctx, node);
          return <File.Import key={name} name={[name]} root={file.path} path={clientFile(ctx, node).path} />;
        })}
        {typesPath && errorImports.length > 0 && (
          <File.Import name={errorImports} root={file.path} path={typesPath} isTypeOnly />
        )}

        <File.Source>
          {`
export const DEFAULT_API_BASE_URL = '${meta.baseURL}';

export const operationsByPath = {
${byPathSource.join(',\n')}
};

export const operationsByTag = {
${byTagSource.join(',\n')}
};

export const tagDictionary = {
${tagDictionarySource.join(',\n')}
} as const;

export const Scopes = ${JSON.stringify(scopes)} as const;

export type OperationErrors = {
${errorEntries.map((entry) => `  '${entry.key}': ${entry.names.length > 0 ? entry.names.join(' | ') : 'never'};`).join('\n')}
};

export type OperationErrorStatus = {
${errorEntries.map((entry) => `  '${entry.key}': ${entry.statusUnion};`).join('\n')}
};
`}
        </File.Source>
      </File>
    );
  }
});
