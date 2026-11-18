# eslint-plugin-package-boundary

Oxlint JS plugin (plugin id `arch-boundary`, rule `arch-boundary/package-boundary`) that bans relative imports (`../…`) which resolve outside the importing package's root (`plugins/<pkg>`, `packages/<pkg>`, `apps/<pkg>`, `evals/<pkg>`). Cross-package references must go through the dependency's export map (`@<scope>/<pkg>/<subpath>`). Exempt: `schema.ts` (CJS schema resolvers), `*.gen.*` aggregations, `*.test.*` files.

Standalone, dependency-free. Enable per-glob via `lint.jsPlugins` + `lint.overrides` in the consumer's `vite.config.ts`:

```ts
lint: {
  jsPlugins: [{ name: "arch-boundary", specifier: "eslint-plugin-package-boundary" }],
  overrides: [
    {
      files: ["plugins/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}", "evals/**/*.{ts,tsx}"],
      rules: { "arch-boundary/package-boundary": "error" },
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
