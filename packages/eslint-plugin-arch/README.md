# eslint-plugin-arch

Bundled Oxlint JS plugin (plugin id `arch`) exposing all nine ktbhealth
architecture rules under a unified `arch/<rule>` namespace:

| rule id                      | source package                        |
| ---------------------------- | ------------------------------------- |
| `arch/no-hardcoded-colors`   | `eslint-plugin-no-hardcoded-colors`   |
| `arch/provider-lockin`       | `eslint-plugin-provider-lockin`       |
| `arch/package-boundary`      | `eslint-plugin-package-boundary`      |
| `arch/tenant-scope`          | `eslint-plugin-tenant-scope`          |
| `arch/plugin-contract`       | `eslint-plugin-plugin-contract`       |
| `arch/plugin-route-gate`     | `eslint-plugin-plugin-route-gate`     |
| `arch/plugin-api-route-gate` | `eslint-plugin-plugin-api-route-gate` |
| `arch/client-contract`       | `eslint-plugin-client-contract`       |
| `arch/driver-contract`       | `eslint-plugin-driver-contract`       |

Oxlint registers `jsPlugins` by name and rejects duplicates, so the
standalone packages cannot share one id — this bundle re-exports every
rule implementation under `meta.name: "arch"`.

**Self-contained**: consumers install only this package. The rule
sources are imported from the sibling packages' `src/` at build time
and inlined into `dist/index.mjs` by `vp pack` — there are no runtime
dependencies (workspace/git-tag safe). Prefer `src` over the siblings'
committed `dist` so rule edits rebuild together in one pack run.

Enable per-glob via `lint.jsPlugins` + `lint.overrides`, or spread the
presets from `eslint-config-arch`:

```ts
lint: {
  jsPlugins: [{ name: "arch", specifier: "eslint-plugin-arch" }],
  overrides: [
    { files: ["plugins/**/*.{ts,tsx}"], rules: { "arch/provider-lockin": "error" } },
  ],
}
```

## Develop

```sh
bun install
bun run build   # vp pack → dist/ (inlines sibling rule sources)
bun run test    # vitest
```
