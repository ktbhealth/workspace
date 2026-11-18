// src/index.ts
const PLUGIN_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\](?:index|client)\.ts$/;
const KERNEL = "@ktb/kernel";
const importedName = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
 * Named imports in the file: local binding name → { source, imported }.
 * Covers `import { X }`, `import { X as Y }` and `import type { X }`.
 */
const namedImports = (program) => {
  const map = /* @__PURE__ */ new Map();
  for (const stmt of program.body) {
    if (stmt.type !== "ImportDeclaration") continue;
    for (const spec of stmt.specifiers ?? [])
      if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier")
        map.set(spec.local.name, {
          source: stmt.source.value,
          imported: importedName(spec),
        });
  }
  return map;
};
/** Top-level variable declarators (`const`/`let`/`var`), keyed by name. */
const topLevelDeclarators = (program) => {
  const decls = /* @__PURE__ */ new Map();
  for (const stmt of program.body) {
    const declaration =
      stmt.type === "VariableDeclaration"
        ? stmt
        : stmt.type === "ExportNamedDeclaration" && stmt.declaration?.type === "VariableDeclaration"
          ? stmt.declaration
          : void 0;
    if (!declaration) continue;
    for (const d of declaration.declarations)
      if (d.id.type === "Identifier") decls.set(d.id.name, d);
  }
  return decls;
};
/** Names exported from the module (named exports only). */
const exportedNames = (program) => {
  const names = /* @__PURE__ */ new Set();
  for (const stmt of program.body) {
    if (stmt.type !== "ExportNamedDeclaration") continue;
    const decl = stmt.declaration;
    if (decl?.type === "VariableDeclaration") {
      for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
    } else if (decl?.id?.type === "Identifier") names.add(decl.id.name);
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
const isDefinePluginInit = (init, imports) => {
  const callee = init?.type === "CallExpression" ? init.callee : void 0;
  if (
    callee?.type !== "Identifier" ||
    init.arguments.length === 0 ||
    init.arguments[0]?.type !== "ObjectExpression"
  )
    return false;
  const binding = imports.get(callee.name);
  return binding?.source === KERNEL && binding.imported === "definePlugin";
};
const plugin = {
  meta: { name: "arch-plugin-contract" },
  rules: {
    "plugin-contract": {
      create(context) {
        return {
          Program(node) {
            if (!PLUGIN_ENTRY_RE.test(context.filename)) return;
            const imports = namedImports(node);
            const decls = topLevelDeclarators(node);
            const declarator = decls.get("plugins");
            const elements =
              declarator?.init?.type === "ArrayExpression" ? declarator.init.elements : void 0;
            if (
              !exportedNames(node).has("plugins") ||
              elements === void 0 ||
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
              const init =
                el?.type === "Identifier"
                  ? decls.get(el.name)?.init
                  : el?.type === "CallExpression"
                    ? el
                    : void 0;
              if (init === void 0 || !isDefinePluginInit(init, imports))
                context.report({
                  node: el ?? node,
                  message:
                    '`plugins` entries must be `definePlugin({...})` calls or consts initialized with `definePlugin` imported from "@ktb/kernel" (arch-plugin-contract/plugin-contract)',
                });
            }
          },
        };
      },
    },
  },
};
export { plugin as default };
