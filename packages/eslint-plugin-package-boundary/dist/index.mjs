// src/index.ts
/** `<abs>/plugins/<pkg>` (or packages/apps/evals) prefix of a filename. */
const PACKAGE_ROOT_RE = /^(.*[/\\])?(?:plugins|packages|apps|evals)[/\\][^/\\]+/;
const BOUNDARY_EXEMPT_BASENAME_RE =
  /(?:^|[/\\])(?:schema\.tsx?|[^/\\]*\.gen\.tsx?|[^/\\]*\.test\.tsx?)$/;
/** Resolve "." and ".." segments in a "/" -joined path. */
const normalizePath = (path) => {
  const parts = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
};
const MESSAGE =
  "relative import escapes the package root — import through the package's export map instead (arch-boundary/package-boundary)";
const plugin = {
  meta: { name: "arch-boundary" },
  rules: {
    "package-boundary": {
      create(context) {
        const filename = context.filename.replaceAll("\\", "/");
        const rootMatch = filename.match(PACKAGE_ROOT_RE);
        if (rootMatch === null || BOUNDARY_EXEMPT_BASENAME_RE.test(filename)) return {};
        const root = normalizePath(rootMatch[0]);
        const checkSource = (node, source) => {
          if (typeof source !== "string" || !source.startsWith(".")) return;
          const dir = filename.slice(0, filename.lastIndexOf("/") + 1);
          const resolved = normalizePath(`${dir}${source}`);
          if (resolved === root || resolved.startsWith(`${root}/`)) return;
          context.report({
            node,
            message: `${MESSAGE}: "${source}"`,
          });
        };
        return {
          ImportDeclaration(node) {
            checkSource(node, node.source?.value);
          },
          ExportNamedDeclaration(node) {
            if (node.source) checkSource(node, node.source.value);
          },
          ExportAllDeclaration(node) {
            if (node.source) checkSource(node, node.source.value);
          },
          ImportExpression(node) {
            const source = node.source;
            checkSource(node, source?.type === "Literal" ? source.value : void 0);
          },
        };
      },
    },
  },
};
export { plugin as default };
