/**
 * eslint-plugin-client-contract — Oxlint JS plugin.
 *
 * Plugin id: `arch-client` — rule id `arch-client/client-contract`.
 *
 * `plugins/<pkg>/src/client.ts` manifests ship to the browser bundle:
 * their value imports are restricted to an allowlist (kernel, UI kit,
 * React/lucide/router primitives and relative .tsx components).
 * Everything else (plugin index.ts entries, api/fns/schema modules,
 * db/cqrs/server-fns, effect, app-host) is server-side and would drag
 * the server graph into the browser bundle. Type-only imports are
 * exempt — they are erased at build time and never reach the bundle.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides`; the rule
 * self-filters to `plugins/<pkg>/src/client.ts`.
 */
type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
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
    "client-contract": Rule;
  };
};
export { plugin as default };
