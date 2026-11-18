# eslint-config-arch

Lint presets for the ktbhealth `arch` oxlint plugin
(`eslint-plugin-arch`). Preset factories return `lint` config fragments
consumers spread into their vite-plus/oxlint config:

```ts
import { defineConfig } from "vite-plus";
import { arch } from "eslint-config-arch";

export default defineConfig({
  lint: {
    ...arch.product(), // or arch.ui()
    options: { typeAware: true },
  },
});
```

Requires `eslint-plugin-arch` to be installed alongside (the presets
emit `jsPlugins: [{ name: "arch", specifier: "eslint-plugin-arch" }]`).

## Presets

- `arch.product()` / `product()` — reproduces the product repo's
  arch-policy wiring: all nine `arch/<rule>` rules as `"error"` on the
  ported globs, test exemptions `"off"`, provider-lockin file
  exemptions, and the port/domain platform/impl import restrictions.
  Product-specific extras (composition-root exceptions, `apps/web`
  adapter bans, import-cycle rules) stay in the consumer's config.
- `arch.ui()` / `ui(options?)` — enables only
  `arch/no-hardcoded-colors` for UI repos. Options:
  `{ sources?: string[]; tests?: string[] }` with defaults
  `["src/**/*.{ts,tsx}", "packages/**/*.{ts,tsx}", "stories/**/*.{ts,tsx}", "*.stories.*"]`
  and `["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"]`.

## Exported glob constants

For consumers that hand-wire overrides: `PORT_GLOBS`,
`PORT_TEST_GLOBS`, `PACKAGE_BOUNDARY_GLOBS`, `UI_GLOBS`,
`UI_TEST_GLOBS`, `PLATFORM_IMPORT_PATTERNS`, `PLATFORM_GLOBALS`,
`PROVIDER_LITERAL_PATTERNS`, `IMPL_IMPORT_PATTERNS`,
`PROVIDER_LOCKIN_EXEMPTIONS`, `PORT_PACKAGE_NAMES`.

## Develop

```sh
bun install
bun run build   # vp pack → dist/
bun run test    # vitest
```
