/**
 * eslint-plugin-tenant-scope — Oxlint JS plugin.
 *
 * Plugin id: `arch-tenant` — rule id `arch-tenant/tenant-scope`.
 *
 * Tenant-scoped tables are declared via `tenantTable(...)` (from the
 * tenant package, re-exported by schema modules). The rule keeps a
 * per-run map of which modules export tenant tables, then flags raw
 * drizzle access to those bindings anywhere else (`.from()`,
 * `.insert()`, `.update()`, `.delete()`, joins, `db.query.<table>`) —
 * all of which must go through the scoped-repo factory so tenant
 * isolation holds. Cross-file resolution covers relative specifiers
 * and `@<scope>/<pkg>[/<sub>]` mapped onto `plugins/<pkg>/src` and
 * `packages/<pkg>/src`. Test files are exempt.
 *
 * Enable per-glob via `lint.jsPlugins` + `lint.overrides` — source trees
 * that can declare or query tenant tables; relax on `*.test.*`.
 */

type AstNode = any;
type RuleContext = {
  filename: string;
  report: (diagnostic: { node: AstNode; message: string }) => void;
};
type Visitor = Record<string, ((node: AstNode) => void) | undefined>;
type Rule = { create: (context: RuleContext) => Visitor };

const TENANT_TABLE_FN = "tenantTable";
const TENANT_PKG = "@ktb/tenant";
const TENANT_SCOPE_METHODS = new Set([
  "from",
  "innerJoin",
  "leftJoin",
  "rightJoin",
  "fullJoin",
  "insert",
  "update",
  "delete",
]);
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

/** repo-relative candidate paths for an import specifier. */
const candidateModules = (source: string, filename: string): string[] => {
  const out: string[] = [];
  if (source.startsWith(".")) {
    const dir = filename.slice(0, filename.lastIndexOf("/") + 1);
    const resolved = normalizePath(dir + source);
    out.push(resolved, `${resolved}.ts`, `${resolved}/index.ts`);
  } else if (source.startsWith("@ktb/")) {
    const rest = source.slice("@ktb/".length);
    const slash = rest.indexOf("/");
    const pkg = slash === -1 ? rest : rest.slice(0, slash);
    const sub = slash === -1 ? "" : rest.slice(slash + 1);
    for (const base of [`plugins/${pkg}/src`, `packages/${pkg}/src`]) {
      if (sub === "") out.push(`${base}/index.ts`, `${base}/schema.ts`);
      else out.push(`${base}/${sub}.ts`, `${base}/${sub}/index.ts`);
    }
  }
  return out;
};

/** Whether recorded filename `file` matches repo-relative candidate `cand`. */
const moduleMatches = (file: string, cand: string) =>
  file === cand || file.endsWith(`/${cand}`) || cand.endsWith(`/${file}`);

const tenantScope: Rule & {
  tableExports: Map<string, Set<string>>;
  fileTenantNames: Map<string, Set<string>>;
} = {
  // filename → Set<exported tenant-table names> (schema modules)
  tableExports: new Map(),
  // filename → Set<local names that resolve to tenant tables
  fileTenantNames: new Map(),

  create(context) {
    const rule = tenantScope;
    return {
      Program(node: AstNode) {
        if (TEST_FILE_RE.test(context.filename)) return;
        const filename = context.filename;
        const imports = namedImports(node);

        // Local `const x = tenantTable(...)` bindings (exported or
        // not) — same-file raw queries on `x` are banned.
        const local = new Set<string>();
        const exported = new Set<string>();
        const isTenantTableInit = (init: any): boolean => {
          const callee = init?.type === "CallExpression" ? init.callee : undefined;
          if (callee?.type !== "Identifier") return false;
          if (callee.name === TENANT_TABLE_FN) return true;
          const binding = imports.get(callee.name);
          return (
            binding !== undefined &&
            binding.imported === TENANT_TABLE_FN &&
            (binding.source === TENANT_PKG || binding.source.startsWith(`${TENANT_PKG}/`))
          );
        };
        for (const stmt of node.body) {
          const decl =
            stmt.type === "VariableDeclaration"
              ? stmt
              : stmt.type === "ExportNamedDeclaration" &&
                  stmt.declaration?.type === "VariableDeclaration"
                ? stmt.declaration
                : undefined;
          const isExport = stmt.type === "ExportNamedDeclaration";
          if (!decl) continue;
          for (const d of decl.declarations) {
            if (d.id.type !== "Identifier" || !isTenantTableInit(d.init)) continue;
            local.add(d.id.name);
            if (isExport) exported.add(d.id.name);
          }
        }
        if (exported.size > 0) rule.tableExports.set(filename, exported);

        // Imported bindings that resolve to tenant-table exports.
        const tenantNames = new Set(local);
        for (const [localName, binding] of imports) {
          for (const cand of candidateModules(binding.source, filename)) {
            for (const [file, names] of rule.tableExports) {
              if (!moduleMatches(file, cand)) continue;
              if (names.has(binding.imported)) tenantNames.add(localName);
            }
          }
        }
        rule.fileTenantNames.set(filename, tenantNames);
      },

      CallExpression(node: AstNode) {
        const filename = context.filename;
        if (TEST_FILE_RE.test(filename)) return;
        const tenantNames = rule.fileTenantNames?.get(filename);
        if (tenantNames === undefined || tenantNames.size === 0) return;

        const callee = node.callee;
        if (callee?.type !== "MemberExpression" || callee.computed) return;
        const method = callee.property?.name;
        if (typeof method !== "string" || !TENANT_SCOPE_METHODS.has(method)) return;

        const arg = node.arguments[0];
        if (arg?.type !== "Identifier" || !tenantNames.has(arg.name)) return;

        context.report({
          node: arg,
          message:
            `tenant-scoped table "${arg.name}" must be queried through the scoped-repo ` +
            "factory — raw drizzle access bypasses tenant isolation " +
            "(arch-tenant/tenant-scope)",
        });
      },

      // Relational query API: db.query.<table>.findMany() etc.
      MemberExpression(node: AstNode) {
        const filename = context.filename;
        if (TEST_FILE_RE.test(filename)) return;
        const tenantNames = rule.fileTenantNames?.get(filename);
        if (tenantNames === undefined || tenantNames.size === 0) return;
        if (node.computed || node.property?.type !== "Identifier") return;
        if (!tenantNames.has(node.property.name)) return;
        const obj = node.object;
        if (
          obj?.type === "MemberExpression" &&
          !obj.computed &&
          obj.property?.type === "Identifier" &&
          obj.property.name === "query"
        ) {
          context.report({
            node,
            message:
              `tenant-scoped table "${node.property.name}" must be queried through ` +
              "the scoped-repo factory — db.query.* bypasses tenant isolation " +
              "(arch-tenant/tenant-scope)",
          });
        }
      },
    };
  },
};

const plugin = {
  meta: { name: "arch-tenant" },
  rules: {
    "tenant-scope": tenantScope,
  },
};

export default plugin;
