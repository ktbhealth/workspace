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
type Rule = { create: (context: RuleContext) => Visitor };

/** `<abs>/plugins/<pkg>` (or packages/apps/evals) prefix of a filename. */
const PACKAGE_ROOT_RE = /^(.*[/\\])?(?:plugins|packages|apps|evals)[/\\][^/\\]+/;
const BOUNDARY_EXEMPT_BASENAME_RE =
  /(?:^|[/\\])(?:schema\.tsx?|[^/\\]*\.gen\.tsx?|[^/\\]*\.test\.tsx?)$/;

/** Resolve "." and ".." segments in a "/" -joined path. */
const normalizePath = (path: string): string => {
  const parts: string[] = [];
  for (const seg of path.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/");
};

const MESSAGE =
  "relative import escapes the package root — import through the package's export map instead (arch-boundary/package-boundary)";

const packageBoundary: Rule = {
  create(context) {
    const filename = context.filename.replaceAll("\\", "/");
    const rootMatch = filename.match(PACKAGE_ROOT_RE);
    if (rootMatch === null || BOUNDARY_EXEMPT_BASENAME_RE.test(filename)) return {};
    // normalizePath drops the leading "/" — normalize the root the
    // same way so the prefix comparison below is apples-to-apples.
    const root = normalizePath(rootMatch[0]);

    const checkSource = (node: AstNode, source: unknown) => {
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
      ImportDeclaration(node: AstNode) {
        checkSource(node, node.source?.value);
      },
      ExportNamedDeclaration(node: AstNode) {
        if (node.source) checkSource(node, node.source.value);
      },
      ExportAllDeclaration(node: AstNode) {
        if (node.source) checkSource(node, node.source.value);
      },
      ImportExpression(node: AstNode) {
        const source = node.source;
        checkSource(node, source?.type === "Literal" ? source.value : undefined);
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-boundary" },
  rules: {
    "package-boundary": packageBoundary,
  },
};

export default plugin;
