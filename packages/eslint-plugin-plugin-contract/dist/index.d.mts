/**
 * eslint-plugin-plugin-contract — Oxlint JS plugin.
 *
 * Plugin id: `arch-plugin-contract` — rule id
 * `arch-plugin-contract/plugin-contract`.
 *
 * Each plugin's entry file (`plugins/<pkg>/src/index.ts` or
 * `src/client.ts`) must export `plugins` — a non-empty array of
 * single-concern plugins each initialized with `definePlugin({...})`
 * (or the server-only `clientStub({...})` mirror marker, T-149, in
 * `client.ts` only) imported from the kernel package — so the host's
 * filesystem plugin discovery keeps working.
 *
 * Enable per-glob via `lint.jsPlugins` + `lint.overrides` — the rule
 * self-filters to `plugins/<pkg>/src/{index,client}.ts`.
 */
type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: {
    node: AstNode;
    message: string;
  }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = {
  create: (context: RuleContext) => Visitor;
};
declare const plugin: {
  meta: {
    name: string;
  };
  rules: {
    "plugin-contract": Rule;
  };
};
export { plugin as default };