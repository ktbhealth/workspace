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
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

/**
 * String literals that name a provider — model ids, endpoints, product
 * prefixes. Domain code must not hardcode these; they belong in adapters
 * or deploy config. Extend this list when a new provider leaks in.
 */
const PROVIDER_LITERAL_PATTERNS: RegExp[] = [
  /^@cf\//, // Cloudflare Workers AI model ids
  /\bapi\.anthropic\.com\b/,
  /\bapi\.openai\.com\b/,
  /\bgoogleapis\.com\b/, // fonts.googleapis.com css2 + generativelanguage.googleapis.com LLM endpoint
  /\btypesafe\.ai\b/, // Jev decision-model endpoint
  /\/v1\/systemone\b/, // Jev API path — belongs in adapters
];

const MESSAGE =
  "provider-named literal in port/domain code — move it to an adapter or deploy config";

const providerLockin: Rule = {
  create(context) {
    const check = (node: AstNode, value: unknown) => {
      if (typeof value !== "string") return;
      if (!PROVIDER_LITERAL_PATTERNS.some((re) => re.test(value))) return;
      context.report({ node, message: MESSAGE });
    };
    return {
      Literal(node: AstNode) {
        check(node, node.value);
      },
      // Template literals hide provider endpoints the same way —
      // e.g. `https://fonts.googleapis.com/css2?family=${x}` — so
      // every quasi's cooked text is scanned too.
      TemplateLiteral(node: AstNode) {
        for (const quasi of node.quasis ?? []) {
          const cooked = quasi.value?.cooked ?? quasi.value?.raw;
          if (
            typeof cooked === "string" &&
            PROVIDER_LITERAL_PATTERNS.some((re) => re.test(cooked))
          ) {
            context.report({ node: quasi, message: MESSAGE });
            return;
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-provider" },
  rules: {
    "provider-lockin": providerLockin,
  },
};

export default plugin;
