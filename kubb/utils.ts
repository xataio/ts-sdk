import { pluginTsName } from '@kubb/plugin-ts';
import type { ast, GeneratorContext } from 'kubb/kit';
import type { PluginClient } from './plugin';

export type ClientContext = GeneratorContext<PluginClient>;

export function fileEntry(node: ast.HttpOperationNode) {
  return { name: node.operationId, extname: '.ts' as const, tag: node.tags[0] ?? 'default', path: node.path };
}

export function clientFile(ctx: ClientContext, node: ast.HttpOperationNode) {
  return ctx.resolver.file({ ...fileEntry(node), root: ctx.root, output: ctx.options.output });
}

export function typesFile(ctx: ClientContext, node: ast.HttpOperationNode) {
  const output = ctx.requirePlugin(pluginTsName).options?.output ?? ctx.options.output;
  return ctx.getResolver(pluginTsName).file({ ...fileEntry(node), root: ctx.root, output });
}

export function operationName(ctx: ClientContext, node: ast.HttpOperationNode): string {
  return ctx.resolver.name(node.operationId);
}

export function fileBanner(ctx: ClientContext, file: { path: string; baseName: string }) {
  const context = { output: ctx.options.output, config: ctx.config, file };
  return {
    banner: ctx.resolver.default.banner(ctx.meta, context),
    footer: ctx.resolver.default.footer(ctx.meta, context)
  };
}
