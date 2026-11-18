/**
 * eslint-plugin-no-hardcoded-colors — Oxlint JS plugin.
 *
 * Plugin id: `arch-colors` — rule id `arch-colors/no-hardcoded-colors`.
 *
 * String literals in UI source may not contain hardcoded color utilities:
 * Tailwind palette shades (`bg-red-500`, `text-amber-700`,
 * `border-l-amber-400`, incl. variant prefixes like `dark:`/`hover:`),
 * arbitrary color values (`bg-[#fff]`, `text-[oklch(…)]`) and literal
 * `white`/`black` fills. All color must come from theme tokens
 * (`bg-primary`, `text-destructive`, `bg-warning/10`, …) so runtime
 * themes and WCAG foreground pairs stay authoritative.
 *
 * Enable per-glob via `lint.jsPlugins` + `lint.overrides` in the
 * consumer's vite.config.ts — typically UI source trees, tests exempt.
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
    "no-hardcoded-colors": Rule;
  };
};
export { plugin as default };