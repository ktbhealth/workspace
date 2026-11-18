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
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

// Matches a hardcoded color utility inside any string: optional variant
// prefixes (dark:, hover:…), a color-capable utility prefix, then either
// a palette shade (red-500), an arbitrary color value ([#fff],
// [oklch(…)]) or literal white/black — with optional /opacity.
const PALETTE_NAME =
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)";
const COLOR_UTILITY_RE = new RegExp(
  "(?:^|[\\s\"'`{(:])" +
    "(?:[a-zA-Z-]+:)*" +
    "(?:bg|text|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|shadow|placeholder)-" +
    "(?:" +
    `${PALETTE_NAME}-\\d{2,3}` +
    "|\\[(?:#|oklch|oklab|rgb|hsl|hwb|lab|lch|color-mix)[^\\]]*\\]" +
    "|white|black" +
    ")" +
    "(?:\\/[\\d.]+%?)?" +
    "(?![\\w-])",
);

const COLOR_MESSAGE =
  "hardcoded color utility — use theme tokens (bg-primary, text-foreground, bg-destructive, bg-warning/10, …) so runtime themes and WCAG foreground pairs stay automatic (arch-colors/no-hardcoded-colors)";

const noHardcodedColors: Rule = {
  create(context) {
    const check = (node: AstNode, value: unknown) => {
      if (typeof value !== "string" || !COLOR_UTILITY_RE.test(value)) return;
      context.report({ node, message: COLOR_MESSAGE });
    };
    return {
      Literal(node: AstNode) {
        check(node, node.value);
      },
      TemplateLiteral(node: AstNode) {
        for (const quasi of node.quasis ?? []) {
          const cooked = quasi.value?.cooked ?? quasi.value?.raw;
          if (typeof cooked === "string" && COLOR_UTILITY_RE.test(cooked)) {
            context.report({ node: quasi, message: COLOR_MESSAGE });
            return;
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-colors" },
  rules: {
    "no-hardcoded-colors": noHardcodedColors,
  },
};

export default plugin;
