# eslint-plugin-driver-contract

Oxlint JS plugin (plugin id `arch-driver`, rule `arch-driver/driver-contract`) that keeps port→impl selection typed: any file exporting a `*Driver`/`*Drivers` **descriptor** (object or array literal) must import `Driver` from `@ktb/driver-framework`. Function exports that merely end in `*Driver(s)` (e.g. `resolveDriver` helpers) are not descriptors and are ignored.

```ts
lint: {
  jsPlugins: [{ name: "arch-driver", specifier: "eslint-plugin-driver-contract" }],
  overrides: [
    {
      files: ["packages/*/src/**", "plugins/**", "evals/**"],
      rules: { "arch-driver/driver-contract": "error" },
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
