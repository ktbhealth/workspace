# eslint-plugin-plugin-route-gate

Oxlint JS plugin (plugin id `arch-route-gate`, rule `arch-route-gate/plugin-route-gate`) that gates plugin page routes: modules under `plugins/<pkg>/src/routes/**` must build `Route` via `createPluginFileRoute("<pkg>.routes")` from `@ktb/server-fns`, which 404s when the package's routes plugin is disabled. Bare `createFileRoute`/`createLazyFileRoute` imports from `@tanstack/react-router` are banned; wrong gate-id literals are flagged. Self-filters by filename; `*.test.*` exempt. API routes are covered by `eslint-plugin-plugin-api-route-gate`.

```ts
lint: {
  jsPlugins: [{ name: "arch-route-gate", specifier: "eslint-plugin-plugin-route-gate" }],
  overrides: [
    {
      files: ["plugins/*/src/routes/**/*.{ts,tsx}"],
      rules: { "arch-route-gate/plugin-route-gate": "error" },
    },
    {
      files: ["plugins/*/src/routes/**/*.test.{ts,tsx}"],
      rules: { "arch-route-gate/plugin-route-gate": "off" },
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
