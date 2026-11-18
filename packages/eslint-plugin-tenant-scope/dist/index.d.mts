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
type Rule = {
  create: (context: RuleContext) => Visitor;
};
declare const plugin: {
  meta: {
    name: string;
  };
  rules: {
    "tenant-scope": Rule & {
      tableExports: Map<string, Set<string>>;
      fileTenantNames: Map<string, Set<string>>;
    };
  };
};
export { plugin as default };
