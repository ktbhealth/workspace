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
type Rule = { create: (context: RuleContext) => Visitor };

const CLIENT_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\]client\.ts$/;
const KERNEL = "@ktb/kernel";

/**
 * Modules a client manifest may value-import: the kernel contract, the
 * UI kit, and component files (relative .tsx — platform-page wrappers
 * and views). Anything else is server-side and would drag the server
 * graph into the browser bundle.
 */
const CLIENT_IMPORT_ALLOWLIST = [
  KERNEL,
  "@ktbhealth/",
  "lucide-react",
  "react",
  "react-dom",
  "@tanstack/react-router",
  "@tanstack/virtual-file-routes",
];
const CLIENT_RELATIVE_RE = /^\.\.?\/.*\.tsx$/;

const clientImportAllowed = (source: string): boolean =>
  CLIENT_IMPORT_ALLOWLIST.some((allowed) =>
    allowed.endsWith("/") ? source.startsWith(allowed) : source === allowed,
  ) || CLIENT_RELATIVE_RE.test(source);

const clientContract: Rule = {
  create(context) {
    return {
      ImportDeclaration(node: AstNode) {
        if (!CLIENT_ENTRY_RE.test(context.filename)) return;
        // `import type` is erased at build time — it never reaches
        // the browser bundle, so only value imports are gated.
        if (node.importKind === "type") return;
        const source = node.source?.value;
        if (typeof source !== "string" || clientImportAllowed(source)) return;
        context.report({
          node,
          message: `client manifest may not value-import "${source}" — src/client.ts ships to the browser bundle; keep server code in src/index.ts (arch-client/client-contract)`,
        });
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-client" },
  rules: {
    "client-contract": clientContract,
  },
};

export default plugin;
