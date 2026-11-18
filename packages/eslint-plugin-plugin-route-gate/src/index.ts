/**
 * eslint-plugin-plugin-route-gate — Oxlint JS plugin.
 *
 * Plugin id: `arch-route-gate` — rule id `arch-route-gate/plugin-route-gate`.
 *
 * Page route modules under `plugins/<pkg>/src/routes/**` must build
 * `Route` via `createPluginFileRoute("<pkg>.routes")` from
 * `@ktb/server-fns`, which 404s when the package's routes plugin is
 * disabled. Bare `createFileRoute`/`createLazyFileRoute` value imports
 * from `@tanstack/react-router` are banned there so the gate can't be
 * bypassed. The rule self-filters by filename; test files are exempt.
 * API routes (`src/api-routes/**`) are covered by the sibling
 * `eslint-plugin-plugin-api-route-gate` package.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides` on the routes tree.
 */

type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

const PLUGIN_PAGE_ROUTE_RE =
  /(?:^|[/\\])plugins[/\\]([^/\\]+)[/\\]src[/\\]routes[/\\].*\.(?:ts|tsx)$/;
const SERVER_FNS_PKG = "@ktb/server-fns";
const ROUTER_PKG = "@tanstack/react-router";
const HELPER_NAME = "createPluginFileRoute";
const BANNED_ROUTE_CREATORS = new Set(["createFileRoute", "createLazyFileRoute"]);
const TEST_FILE_RE = /\.test\.tsx?$/;

const importedName = (spec: any) => spec.imported?.name ?? spec.imported?.value;

/**
 * Named imports in the file: local binding name → { source, imported }.
 * Covers `import { X }`, `import { X as Y }` and `import type { X }`.
 */
const namedImports = (program: any) => {
  const map = new Map<string, { source: string; imported: string }>();
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    for (const spec of stmt.specifiers ?? []) {
      if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") {
        map.set(spec.local.name, {
          source: stmt.source.value,
          imported: importedName(spec),
        });
      }
    }
  }
  return map;
};

/** Names exported from the module (named exports only). */
const exportedNames = (program: any) => {
  const names = new Set<string>();
  for (const stmt of program.body) {
    if (stmt.type !== "ExportNamedDeclaration") continue;
    const decl = stmt.declaration;
    if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations) {
        if (d.id.type === "Identifier") names.add(d.id.name);
      }
    } else if (decl?.id?.type === "Identifier") {
      names.add(decl.id.name);
    }
    for (const spec of stmt.specifiers ?? []) {
      const exported = spec.exported?.name ?? spec.exported?.value;
      if (exported) names.add(exported);
    }
  }
  return names;
};

const pluginRouteGate: Rule = {
  create(context) {
    const match = context.filename.match(PLUGIN_PAGE_ROUTE_RE);
    if (match === null || TEST_FILE_RE.test(context.filename)) {
      return {};
    }
    const expectedId = `${match[1]}.routes`;
    // Set by the Program visitor; CallExpression runs after it.
    let imports: Map<string, { source: string; imported: string }> | undefined;
    return {
      Program(node: AstNode) {
        imports = namedImports(node);

        // Value imports of the bare route creators bypass the gate.
        for (const stmt of node.body) {
          if (stmt.type !== "ImportDeclaration" || stmt.importKind === "type") continue;
          if (stmt.source?.value !== ROUTER_PKG) continue;
          for (const spec of stmt.specifiers ?? []) {
            const imported = importedName(spec);
            if (typeof imported === "string" && BANNED_ROUTE_CREATORS.has(imported)) {
              context.report({
                node: spec,
                message:
                  `plugin route modules must use ${HELPER_NAME}("${expectedId}") ` +
                  `from "${SERVER_FNS_PKG}" — bare ${imported} bypasses the ` +
                  "enabled-state gate (arch-route-gate/plugin-route-gate)",
              });
            }
          }
        }

        // Modules that export a Route must build it through the helper.
        if (!exportedNames(node).has("Route")) return;
        const usesHelper = [...imports.values()].some(
          (entry) => entry.source === SERVER_FNS_PKG && entry.imported === HELPER_NAME,
        );
        if (!usesHelper) {
          context.report({
            node,
            message:
              "plugin route modules must build Route via " +
              `${HELPER_NAME}("${expectedId}") from "${SERVER_FNS_PKG}" ` +
              "(arch-route-gate/plugin-route-gate)",
          });
        }
      },
      CallExpression(node: AstNode) {
        const callee = node.callee;
        if (callee?.type !== "Identifier" || imports === undefined) return;
        const binding = imports.get(callee.name);
        if (binding?.source !== SERVER_FNS_PKG || binding.imported !== HELPER_NAME) return;
        const arg = node.arguments[0];
        if (arg?.type === "Literal" && typeof arg.value === "string" && arg.value !== expectedId) {
          context.report({
            node: arg,
            message:
              `${HELPER_NAME} must gate on this package's routes plugin id ` +
              `"${expectedId}" (arch-route-gate/plugin-route-gate)`,
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-route-gate" },
  rules: {
    "plugin-route-gate": pluginRouteGate,
  },
};

export default plugin;
