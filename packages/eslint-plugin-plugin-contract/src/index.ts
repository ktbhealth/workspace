/**
 * eslint-plugin-plugin-contract — Oxlint JS plugin.
 *
 * Plugin id: `arch-plugin-contract` — rule id
 * `arch-plugin-contract/plugin-contract`.
 *
 * Each plugin's entry file (`plugins/<pkg>/src/index.ts` or
 * `src/client.ts`) must export `plugins` — a non-empty array of
 * single-concern plugins each initialized with `definePlugin({...})`
 * imported from the kernel package — so the host's filesystem plugin
 * discovery keeps working.
 *
 * Enable per-glob via `lint.jsPlugins` + `lint.overrides` — the rule
 * self-filters to `plugins/<pkg>/src/{index,client}.ts`.
 */

type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

const PLUGIN_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\](?:index|client)\.ts$/;
const KERNEL = "@ktb/kernel";

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

/** Top-level variable declarators (`const`/`let`/`var`), keyed by name. */
const topLevelDeclarators = (program: any) => {
  const decls = new Map<string, any>();
  for (const stmt of program.body) {
    const declaration =
      stmt.type === "VariableDeclaration"
        ? stmt
        : stmt.type === "ExportNamedDeclaration" && stmt.declaration?.type === "VariableDeclaration"
          ? stmt.declaration
          : undefined;
    if (!declaration) continue;
    for (const d of declaration.declarations) {
      if (d.id.type === "Identifier") decls.set(d.id.name, d);
    }
  }
  return decls;
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

/**
 * Whether `init` is a `definePlugin({...})` call with `definePlugin`
 * imported from the kernel package.
 */
const isDefinePluginInit = (
  init: any,
  imports: Map<string, { source: string; imported: string }>,
) => {
  const callee = init?.type === "CallExpression" ? init.callee : undefined;
  if (
    callee?.type !== "Identifier" ||
    init.arguments.length === 0 ||
    init.arguments[0]?.type !== "ObjectExpression"
  ) {
    return false;
  }
  const binding = imports.get(callee.name);
  return binding?.source === KERNEL && binding.imported === "definePlugin";
};

const pluginContract: Rule = {
  create(context) {
    return {
      Program(node: AstNode) {
        if (!PLUGIN_ENTRY_RE.test(context.filename)) return;

        const imports = namedImports(node);
        const decls = topLevelDeclarators(node);
        const declarator = decls.get("plugins");
        const elements =
          declarator?.init?.type === "ArrayExpression" ? declarator.init.elements : undefined;

        if (
          !exportedNames(node).has("plugins") ||
          elements === undefined ||
          elements.length === 0
        ) {
          context.report({
            node,
            message:
              "plugin entry must export `plugins` — a non-empty array of `definePlugin({...})` plugins for host discovery (arch-plugin-contract/plugin-contract)",
          });
          return;
        }

        for (const el of elements) {
          // Each element is either an inline `definePlugin({...})`
          // call or a const bound to one.
          const init =
            el?.type === "Identifier"
              ? decls.get(el.name)?.init
              : el?.type === "CallExpression"
                ? el
                : undefined;
          if (init === undefined || !isDefinePluginInit(init, imports)) {
            context.report({
              node: el ?? node,
              message:
                '`plugins` entries must be `definePlugin({...})` calls or consts initialized with `definePlugin` imported from "@ktb/kernel" (arch-plugin-contract/plugin-contract)',
            });
          }
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-plugin-contract" },
  rules: {
    "plugin-contract": pluginContract,
  },
};

export default plugin;
