# eslint-plugin-plugin-api-route-gate

Oxlint JS plugin (plugin id `arch-api-route-gate`, rule `arch-api-route-gate/plugin-api-route-gate`) that gates plugin API/server routes: modules under `plugins/<pkg>/src/api-routes/**` must build `Route` via `createPluginApiRoute("<pkg>.routes")` from `@ktb/server-fns` — server routes never run `beforeLoad`, so the helper wraps `server.handlers` with the same enabled-state check, answering a 404 when the plugin is disabled. Bare `createFileRoute`/`createLazyFileRoute` imports are banned; wrong gate-id literals are flagged. Self-filters by filename; `*.test.*` exempt. Page routes are covered by `eslint-plugin-plugin-route-gate`.

```ts
lint: {
  jsPlugins: [{ name: "arch-api-route-gate", specifier: "eslint-plugin-plugin-api-route-gate" }],
  overrides: [
    {
      files: ["plugins/*/src/api-routes/**/*.{ts,tsx}"],
      rules: { "arch-api-route-gate/plugin-api-route-gate": "error" },
    },
    {
      files: ["plugins/*/src/api-routes/**/*.test.{ts,tsx}"],
      rules: { "arch-api-route-gate/plugin-api-route-gate": "off" },
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
