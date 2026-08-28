import type { ResolverTs } from '@kubb/plugin-ts';
import { compact, uniq } from '@xata.io/lang';
import { File, Function as JSXFunction, type KubbReactNode } from 'kubb/jsx';
import type { ast } from 'kubb/kit';

type ParamGroup = { name: string; required: boolean };

export type TypeSchemas = {
  response: { name: string };
  request: { name: string } | undefined;
  errors: Array<{ name: string; statusCode: number }>;
  path: ParamGroup | undefined;
  query: ParamGroup | undefined;
  headers: ParamGroup | undefined;
};

export function resolveTypeSchemas(node: ast.HttpOperationNode, tsResolver: ResolverTs): TypeSchemas {
  const successResponse = node.responses.find(isSuccess);

  return {
    response: {
      name: successResponse
        ? tsResolver.response.status(node, successResponse.statusCode)
        : tsResolver.response.response(node)
    },
    request: node.requestBody?.content?.[0]?.schema ? { name: tsResolver.response.body(node) } : undefined,
    errors: node.responses.filter(isError).map((res) => {
      return { name: tsResolver.response.status(node, res.statusCode), statusCode: Number(res.statusCode) };
    }),
    path: paramGroup(node, 'path', tsResolver),
    query: paramGroup(node, 'query', tsResolver),
    headers: paramGroup(node, 'header', tsResolver)
  };
}

export function typeNames(typeSchemas: TypeSchemas): string[] {
  const { response, request, errors, path, query, headers } = typeSchemas;
  return uniq(
    compact([response.name, request?.name, path?.name, query?.name, headers?.name, ...errors.map((e) => e.name)])
  );
}

type ParamLocation = 'path' | 'query' | 'header';

function paramsAt(node: ast.HttpOperationNode, where: ParamLocation): ast.ParameterNode[] {
  return node.parameters.filter((param) => {
    return param.in === where;
  });
}

// `plugin-ts` names a parameter group after its first member, and only emits the aggregated type
// when the group is non-empty, so the client signature has to follow the same rule.
function paramGroup(node: ast.HttpOperationNode, where: ParamLocation, tsResolver: ResolverTs): ParamGroup | undefined {
  const params = paramsAt(node, where);
  const first = params[0];
  if (!first) return undefined;

  const resolve = { path: tsResolver.param.path, query: tsResolver.param.query, header: tsResolver.param.headers };
  return { name: resolve[where].call(tsResolver, node, first), required: params.some((param) => param.required) };
}

function isSuccess(res: ast.ResponseNode): boolean {
  const code = Number(res.statusCode);
  return code >= 200 && code < 300;
}

function isError(res: ast.ResponseNode): boolean {
  return Number(res.statusCode) >= 400;
}

function jsdoc(node: ast.HttpOperationNode): string[] {
  const lines: string[] = [];
  if (node.summary) lines.push(`@summary ${node.summary}`);
  if (node.description) lines.push(`@description ${node.description}`);
  if (node.deprecated) lines.push('@deprecated');
  lines.push(`{@link ${node.path.replace(/\{([^}]+)\}/g, ':$1')}}`);
  return lines;
}

type Props = {
  name: string;
  node: ast.HttpOperationNode;
  typeSchemas: TypeSchemas;
};

export function ClientOperation({ name, node, typeSchemas }: Props): KubbReactNode {
  const { response, request, errors, path, query, headers } = typeSchemas;
  const bodyRequired = node.requestBody?.required ?? false;

  // The URL template and the guards both dereference `pathParams`, so it stays required.
  const params = compact([
    path && { key: 'pathParams', field: `pathParams: ${path.name}` },
    request && { key: 'body', field: `body${bodyRequired ? '' : '?'}: ${request.name}` },
    query && { key: 'queryParams', field: `queryParams${query.required ? '' : '?'}: ${query.name}` },
    headers && { key: 'headers', field: `headers${headers.required ? '' : '?'}: ${headers.name}` },
    { key: 'config = {}', field: 'config?: Partial<FetcherConfig> & { client?: typeof client }' }
  ]);

  const paramsSignature = `{ ${params.map((p) => p.key).join(', ')} }: { ${params.map((p) => p.field).join('; ')} }`;

  const generics = [
    response.name,
    errors.length > 0 ? errors.map((e) => e.name).join(' | ') : 'Error',
    request?.name ?? 'null',
    headers?.name ?? 'Record<string, string>',
    query?.name ?? 'Record<string, string>',
    path?.name ?? 'Record<string, string>'
  ];

  const guards = paramsAt(node, 'path')
    .filter((param) => {
      return param.required;
    })
    .map((param) => {
      return `if (!pathParams.${param.name}) {
    throw new Error(\`Missing required path parameter: ${param.name}\`);
  }`;
    })
    .join('\n\n  ');

  const url = node.path.replace(/\{([^}]+)\}/g, (_, raw: string) => `\${pathParams.${raw}}`);

  const callParts = compact([
    `method: ${JSON.stringify(node.method)}`,
    `url: \`${url}\``,
    query && 'queryParams',
    request && 'body',
    '...requestConfig',
    headers && 'headers: { ...headers, ...requestConfig.headers }'
  ]);

  const body = `  const { client: request = client, ...requestConfig } = config;
${guards ? `\n  ${guards}\n` : ''}
  const data = await request<${generics.join(', ')}>({ ${callParts.join(', ')} });

  return data;`;

  return (
    <File.Source name={name} isExportable isIndexable>
      <JSXFunction name={name} async export params={paramsSignature} JSDoc={{ comments: jsdoc(node) }}>
        {body}
      </JSXFunction>
    </File.Source>
  );
}
