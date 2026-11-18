# eslint-plugin-no-hardcoded-colors

Oxlint JS plugin (plugin id `arch-colors`, rule `arch-colors/no-hardcoded-colors`) that bans hardcoded color utilities in string literals — Tailwind palette shades, arbitrary color values (`bg-[#fff]`, `text-[oklch(…)]`) and literal `white`/`black` fills, including `dark:`/`hover:` variant prefixes. All color must come from theme tokens so runtime themes and WCAG foreground pairs stay authoritative.

Standalone, dependency-free. Enable per-glob via `lint.jsPlugins` + `lint.overrides` in the consumer's `vite.config.ts`:

```ts
lint: {
  jsPlugins: [{ name: "arch-colors", specifier: "eslint-plugin-no-hardcoded-colors" }],
  overrides: [
    {
      files: ["plugins/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "apps/**/*.{ts,tsx}"],
      rules: { "arch-colors/no-hardcoded-colors": "error" },
    },
    {
      files: ["**/*.test.{ts,tsx}"],
      rules: { "arch-colors/no-hardcoded-colors": "off" },
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
