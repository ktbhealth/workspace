// src/index.ts
const CLIENT_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\]client\.ts$/;
/**
 * Modules a client manifest may value-import: the kernel contract, the
 * UI kit, and component files (relative .tsx — platform-page wrappers
 * and views). Anything else is server-side and would drag the server
 * graph into the browser bundle.
 */
const CLIENT_IMPORT_ALLOWLIST = [
  "@ktb/kernel",
  "@ktbhealth/",
  "lucide-react",
  "react",
  "react-dom",
  "@tanstack/react-router",
  "@tanstack/virtual-file-routes",
];
const CLIENT_RELATIVE_RE = /^\.\.?\/.*\.tsx$/;
const clientImportAllowed = (source) =>
  CLIENT_IMPORT_ALLOWLIST.some((allowed) =>
    allowed.endsWith("/") ? source.startsWith(allowed) : source === allowed,
  ) || CLIENT_RELATIVE_RE.test(source);
const plugin = {
  meta: { name: "arch-client" },
  rules: {
    "client-contract": {
      create(context) {
        return {
          ImportDeclaration(node) {
            if (!CLIENT_ENTRY_RE.test(context.filename)) return;
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
    },
  },
};
export { plugin as default };
