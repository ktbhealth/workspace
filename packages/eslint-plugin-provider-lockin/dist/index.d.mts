/**
 * eslint-plugin-provider-lockin — Oxlint JS plugin.
 *
 * Plugin id: `arch-provider` — rule id `arch-provider/provider-lockin`.
 *
 * String literals in port/domain files may not name a provider (model
 * ids, endpoints, product prefixes); they belong in adapters or deploy
 * config. Scans `Literal` nodes and `TemplateLiteral` quasis. Enable
 * per-glob via `lint.jsPlugins` + `lint.overrides` — port/domain source
 * trees, tests relaxed or off.
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
    "provider-lockin": Rule;
  };
};
export { plugin as default };