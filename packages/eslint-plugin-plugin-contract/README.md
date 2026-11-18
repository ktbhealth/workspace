# eslint-plugin-plugin-contract

Oxlint JS plugin (plugin id `arch-plugin-contract`, rule `arch-plugin-contract/plugin-contract`) that enforces the plugin entry contract: `plugins/<pkg>/src/index.ts` and `src/client.ts` must export `plugins` — a non-empty array of `definePlugin({...})` calls (imported from `@ktb/kernel`) — so host filesystem plugin discovery keeps working. The rule self-filters by filename.

Standalone, dependency-free. Enable via `lint.jsPlugins` + `lint.overrides`:

```ts
lint: {
  jsPlugins: [{ name: "arch-plugin-contract", specifier: "eslint-plugin-plugin-contract" }],
  overrides: [
    {
      files: ["plugins/*/src/{index,client}.ts"],
      rules: { "arch-plugin-contract/plugin-contract": "error" },
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
