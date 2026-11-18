/**
 * eslint-plugin-plugin-api-route-gate — Oxlint JS plugin.
 *
 * Plugin id: `arch-api-route-gate` — rule id `arch-api-route-gate/plugin-api-route-gate`.
 *
 * API/server route modules under `plugins/<pkg>/src/api-routes/**` must
 * build `Route` via `createPluginApiRoute("<pkg>.routes")` from
 * `@ktb/server-fns` — server routes never run beforeLoad, so the
 * helper wraps `server.handlers` with the same enabled-state check,
 * answering a 404 when the plugin is disabled. Bare
 * `createFileRoute`/`createLazyFileRoute` value imports from
 * `@tanstack/react-router` are banned there so the gate can't be
 * bypassed. The rule self-filters by filename; test files are exempt.
 * Page routes (`src/routes/**`) are covered by the sibling
 * `eslint-plugin-plugin-route-gate` package.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides` on the routes tree.
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
    "plugin-api-route-gate": Rule;
  };
};
export { plugin as default };
