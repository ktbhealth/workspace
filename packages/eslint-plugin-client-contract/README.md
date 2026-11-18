# eslint-plugin-client-contract

Oxlint JS plugin (plugin id `arch-client`, rule `arch-client/client-contract`) that keeps client manifests browser-safe: `plugins/<pkg>/src/client.ts` ships to the browser bundle, so its **value** imports are restricted to an allowlist — the kernel contract, the UI kit, React/lucide/router primitives, and relative `.tsx` components. Everything else is server-side. `import type` is exempt (erased at build time). The rule self-filters by filename.

```ts
lint: {
  jsPlugins: [{ name: "arch-client", specifier: "eslint-plugin-client-contract" }],
  overrides: [
    {
      files: ["plugins/*/src/client.ts"],
      rules: { "arch-client/client-contract": "error" },
    },
  ],
}
```

The allowlist is compiled into the rule (`CLIENT_IMPORT_ALLOWLIST` in `src/index.ts`) — extend it there when a new client-safe module appears.

## Develop

```sh
bun install
bun run build   # vp pack → dist/
bun run test    # vitest
```
