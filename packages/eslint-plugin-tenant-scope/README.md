# eslint-plugin-tenant-scope

Oxlint JS plugin (plugin id `arch-tenant`, rule `arch-tenant/tenant-scope`) that keeps tenant isolation honest: tables declared via `tenantTable(...)` may not be queried through raw drizzle — `.from()`, `.insert()`, `.update()`, `.delete()`, joins, or the `db.query.<table>` relational API. All access must go through the scoped-repo factory.

The rule keeps a per-run map of which modules export tenant tables, then flags raw access to those bindings in other files. Cross-file resolution covers relative specifiers and `@<scope>/<pkg>[/<sub>]` imports mapped onto `plugins/<pkg>/src` and `packages/<pkg>/src`. `*.test.*` files are exempt (fixtures may seed directly).

```ts
lint: {
  jsPlugins: [{ name: "arch-tenant", specifier: "eslint-plugin-tenant-scope" }],
  overrides: [
    {
      files: ["plugins/**", "packages/**", "evals/**"],
      rules: { "arch-tenant/tenant-scope": "error" },
    },
    {
      files: ["**/*.test.{ts,tsx}"],
      rules: { "arch-tenant/tenant-scope": "off" },
    },
  ],
}
```

## Develop

```sh
bun install
bun run build   # vp pack → dist/
bun run test    # vitest
```
