/**
 * eslint-plugin-package-boundary — Oxlint JS plugin.
 *
 * Plugin id: `arch-boundary` — rule id `arch-boundary/package-boundary`.
 *
 * A relative import (`../…`) may not resolve outside the importing
 * package's root (`plugins/<pkg>`, `packages/<pkg>`, `apps/<pkg>`,
 * `evals/<pkg>`): reaching into a sibling workspace package's sources
 * bypasses its export map and dependency edges — use `@<scope>/<pkg>`
 * package specifiers instead. Exemptions encoded in the rule: `schema.ts`
 * (CJS schema resolvers cannot follow package specifiers), `*.gen.*`
 * (generated aggregations) and `*.test.*` files.
 *
 * Enable per-glob via `lint.jsPlugins` + `lint.overrides` — source trees
 * of `plugins/`, `packages/`, `apps/`, `evals/`.
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
    "package-boundary": Rule;
  };
};
export { plugin as default };
