# eslint-plugin-provider-lockin

Oxlint JS plugin (plugin id `arch-provider`, rule `arch-provider/provider-lockin`) that bans provider-named string literals in port/domain code — model ids (`@cf/…`), provider endpoints (`api.anthropic.com`, `api.openai.com`, `googleapis.com`, `typesafe.ai`, `/v1/systemone`). They belong in adapters or deploy config, not domain code. Scans string literals and template-literal quasis.

Standalone, dependency-free. Enable per-glob via `lint.jsPlugins` + `lint.overrides` in the consumer's `vite.config.ts`:

```ts
lint: {
  jsPlugins: [{ name: "arch-provider", specifier: "eslint-plugin-provider-lockin" }],
  overrides: [
    {
      files: ["packages/*/src/**", "plugins/**", "evals/**"],
      rules: { "arch-provider/provider-lockin": "error" },
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
