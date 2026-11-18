/**
 * eslint-plugin-driver-contract — Oxlint JS plugin.
 *
 * Plugin id: `arch-driver` — rule id `arch-driver/driver-contract`.
 *
 * Any file exporting a `*Driver`/`*Drivers` descriptor (object or array
 * literal) must import `Driver` from `@ktb/driver-framework`, keeping
 * port→impl selection typed. Function exports that merely end in
 * *Driver(s) — e.g. driver-framework's own `resolveDriver` helpers —
 * are not descriptors and are ignored.
 *
 * Enable via `lint.jsPlugins` + `lint.overrides` on source trees that
 * declare driver descriptors.
 */

type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

const DRIVER_NAME_RE = /Drivers?$/;
const DRIVER_FRAMEWORK = "@ktb/driver-framework";

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

/** Whether the file imports `name` (value or type) from `source`. */
const hasNamedImport = (program: any, source: string, name: string) =>
  [...namedImports(program).values()].some(
    (entry) => entry.source === source && entry.imported === name,
  );

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

const driverContract: Rule = {
  create(context) {
    return {
      Program(node: AstNode) {
        const decls = topLevelDeclarators(node);
        const exported = exportedNames(node);

        // Driver descriptors are data: object literals (`recallDriver`)
        // or arrays of them (`llmDrivers`). Function exports that merely
        // end in *Driver(s) — e.g. driver-framework's own `resolveDriver`
        // helpers — are not descriptors and are ignored.
        const descriptors = [];
        for (const name of exported) {
          if (!DRIVER_NAME_RE.test(name)) continue;
          const declarator = decls.get(name);
          const init = declarator?.init;
          if (init?.type === "ObjectExpression" || init?.type === "ArrayExpression") {
            descriptors.push(declarator);
          }
        }
        if (descriptors.length === 0) return;

        if (hasNamedImport(node, DRIVER_FRAMEWORK, "Driver")) return;

        for (const d of descriptors) {
          context.report({
            node: d,
            message:
              'files exporting *Driver(s) descriptors must import `Driver` from "@ktb/driver-framework" (arch-driver/driver-contract)',
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-driver" },
  rules: {
    "driver-contract": driverContract,
  },
};

export default plugin;
