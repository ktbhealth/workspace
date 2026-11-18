// src/index.ts
/**
 * String literals that name a provider — model ids, endpoints, product
 * prefixes. Domain code must not hardcode these; they belong in adapters
 * or deploy config. Extend this list when a new provider leaks in.
 */
const PROVIDER_LITERAL_PATTERNS = [
  /^@cf\//,
  /\bapi\.anthropic\.com\b/,
  /\bapi\.openai\.com\b/,
  /\bgoogleapis\.com\b/,
  /\btypesafe\.ai\b/,
  /\/v1\/systemone\b/,
];
const MESSAGE =
  "provider-named literal in port/domain code — move it to an adapter or deploy config";
const plugin = {
  meta: { name: "arch-provider" },
  rules: {
    "provider-lockin": {
      create(context) {
        const check = (node, value) => {
          if (typeof value !== "string") return;
          if (!PROVIDER_LITERAL_PATTERNS.some((re) => re.test(value))) return;
          context.report({
            node,
            message: MESSAGE,
          });
        };
        return {
          Literal(node) {
            check(node, node.value);
          },
          TemplateLiteral(node) {
            for (const quasi of node.quasis ?? []) {
              const cooked = quasi.value?.cooked ?? quasi.value?.raw;
              if (
                typeof cooked === "string" &&
                PROVIDER_LITERAL_PATTERNS.some((re) => re.test(cooked))
              ) {
                context.report({
                  node: quasi,
                  message: MESSAGE,
                });
                return;
              }
            }
          },
        };
      },
    },
  },
};
export { plugin as default };
