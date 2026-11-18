/**
 * eslint-plugin-plugin-route-gate — Oxlint JS plugin.
 *
 * Plugin id: `arch-route-gate` — rule id `arch-route-gate/plugin-route-gate`.
 *
 * Page route modules under `plugins/<pkg>/src/routes/**` must build
 * `Route` via `createPluginFileRoute("<pkg>.routes")` from
 * `@ktb/server-fns`, which 404s when the package's routes plugin is
 * disabled. Bare `createFileRoute`/`createLazyFileRoute` value imports
 * from `@tanstack/react-router` are banned there so the gate can't be
 * bypassed. The rule self-filters by filename; test files are exempt.
 * API routes (`src/api-routes/**`) are covered by the sibling
 * `eslint-plugin-plugin-api-route-gate` package.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides` on the routes tree.
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
    "plugin-route-gate": Rule;
  };
};
export { plugin as default };