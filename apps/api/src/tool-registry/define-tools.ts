import { ToolDefinition } from './tool-registry.types';

/**
 * Boilerplate-reduction helper for registering a module's tools. This is the
 * "generate tool definitions automatically where possible" mechanism — it is
 * NOT reflection-based schema inference (most existing DTOs in this codebase
 * are untyped `body: any`, so that isn't realistic), it just:
 *  - auto-prefixes `name` with `${moduleName}.` if the spec didn't already
 *    provide a dot-namespaced name
 *  - stamps `module` onto every tool so callers don't repeat it
 *
 * Usage:
 *   defineTools('wallet', [
 *     { name: 'read', description: '...', inputSchema: {...}, permissionKey: 'wallet.read',
 *       sensitive: false, defaultGranted: true, handler: (ctx, input) => walletsService.getMyWallet(ctx.userId) },
 *   ])
 */
export function defineTools(
  moduleName: string,
  specs: Array<Omit<ToolDefinition, 'module' | 'name'> & { name: string }>,
): ToolDefinition[] {
  return specs.map((spec) => ({
    ...spec,
    name: spec.name.includes('.') ? spec.name : `${moduleName}.${spec.name}`,
    module: moduleName,
  }));
}
