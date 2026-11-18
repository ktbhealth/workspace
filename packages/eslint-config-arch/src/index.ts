/**
 * eslint-config-arch — lint presets for the ktbhealth architecture
 * rules (`eslint-plugin-arch`, plugin id `arch`).
 *
 * Exports preset factories that return oxlint/vite-plus `lint` config
 * fragments — consumers spread the result into their own config:
 *
 * ```ts
 * import { defineConfig } from "vite-plus";
 * import { arch } from "eslint-config-arch";
 *
 * export default defineConfig({
 *   lint: {
 *     ...arch.product(), // or arch.ui()
 *     options: { typeAware: true },
 *   },
 * });
 * ```
 *
 * The glob constants live here (not in the rule packages) because they
 * describe *where* each rule applies — ported from the product repo's
 * former tools/arch-policy.mjs. Product-specific extras that stay
 * consumer-side: composition-root exceptions and host overrides.
 */

import type { ExternalPluginEntry, OxlintOverride } from "vite-plus/lint";

/* ------------------------------------------------------------------ */
/* Glob constants — ported from product/tools/arch-policy.mjs          */
/* ------------------------------------------------------------------ */

/** Port/domain packages — the same set banned from importing adapters. */
export const PORT_PACKAGE_NAMES = [
  "kernel",
  "auth",
  "authz",
  "bot",
  "captcha",
  "email",
  "transcription",
  "anamnesis",
  "export-pdf",
  "interop",
  "db",
  "driver-framework",
  // Tenancy ports/helpers — platform capability, not an adapter.
  "tenant",
  "rbac",
  // The server-fn runtime registry is port infrastructure, not an adapter.
  "server-fns",
  // Eval framework core: generic suite/runner machinery — domain code
  // held to the same boundary as every other port.
  "eval-core",
  // Host infrastructure below the plugin system.
  "platform",
] as const;

const pkgGlob = (names: readonly string[]) => `packages/{${names.join(",")}}/src/**/*.{ts,tsx}`;

/** Files held to the strict boundary: ports, domain packages, plugins,
 * and eval domain packs. */
export const PORT_GLOBS = [
  pkgGlob(PORT_PACKAGE_NAMES),
  "plugins/**/*.{ts,tsx}",
  "evals/**/*.{ts,tsx}",
];

/** Test files inside the strict boundary — relaxed by the test override
 * (Node APIs and impl mocks are fine in tests). */
export const PORT_TEST_GLOBS = [
  `packages/{${PORT_PACKAGE_NAMES.join(",")}}/src/**/*.test.{ts,tsx}`,
  "plugins/**/*.test.{ts,tsx}",
  "evals/**/*.test.{ts,tsx}",
];

/** Source trees scanned by arch/package-boundary: a relative import may
 * not resolve outside the importing package's root. */
export const PACKAGE_BOUNDARY_GLOBS = [
  "plugins/**/*.{ts,tsx}",
  "packages/**/*.{ts,tsx}",
  "apps/**/*.{ts,tsx}",
  "evals/**/*.{ts,tsx}",
];

/** UI source trees held to arch/no-hardcoded-colors. */
export const UI_GLOBS = [
  "plugins/**/*.{ts,tsx}",
  "packages/**/*.{ts,tsx}",
  "apps/**/*.{ts,tsx}",
  "evals/**/*.{ts,tsx}",
];

export const UI_TEST_GLOBS = [
  "plugins/**/*.test.{ts,tsx}",
  "packages/**/*.test.{ts,tsx}",
  "apps/**/*.test.{ts,tsx}",
  "evals/**/*.test.{ts,tsx}",
];

/** Import specifiers that tie code to a runtime or cloud platform. */
export const PLATFORM_IMPORT_PATTERNS = ["node:*", "bun:*", "deno:*", "cloudflare:*", "workerd:*"];

/** Globals that only exist on specific runtimes. */
export const PLATFORM_GLOBALS = ["process", "Bun", "Deno"];

/**
 * String literals that name a provider — model ids, endpoints, product
 * prefixes. Domain code must not hardcode these; they belong in
 * adapters or deploy config.
 */
export const PROVIDER_LITERAL_PATTERNS = [
  /^@cf\//, // Cloudflare Workers AI model ids
  /\bapi\.anthropic\.com\b/,
  /\bapi\.openai\.com\b/,
  /\bgoogleapis\.com\b/, // fonts.googleapis.com css2 + generativelanguage.googleapis.com LLM endpoint
  /\btypesafe\.ai\b/, // Jev decision-model endpoint
  /\/v1\/systemone\b/, // Jev API path — belongs in adapters
] as const;

/** Adapter packages — implementations of ports. Banned from being
 * imported by ports/plugins (IMPL_IMPORT_PATTERNS). */
const ADAPTER_PACKAGE_NAMES = [
  "auth-better",
  "bot-recall",
  "captcha-stub",
  "captcha-turnstile",
  "email-cloudflare",
  "email-smtp",
  "email-stub",
  "anamnesis-llm",
  "interop-fhir",
  "interop-openehr",
  "transcription-whisper",
  "transcription-webspeech",
  "db-sqlite",
  // Eval platform adapters.
  "eval-adapter-stub",
  "eval-adapter-local",
  "eval-adapter-cloud",
  // Generative-endpoint adapters: OpenAI-compat chat, the ACP
  // ws/http transport, and the Node-runtime spawned-agent driver.
  "ai-adapter-openai",
  "ai-adapter-acp",
  "ai-adapter-node",
  // The ACP bridge: the Durable Object holding the agent's outbound
  // WebSocket and the local byte-pipe CLI.
  "ai-bridge",
] as const;

/**
 * Import specifiers port/domain files may never use: the deploy target,
 * the composition root, infra adapters and every adapter package.
 */
export const IMPL_IMPORT_PATTERNS = [
  "**/apps/**",
  "@ktb/web",
  "@ktb/app-host",
  "@ktb/app-host/**",
  "@ktb/infra-cloudflare",
  "@ktb/infra-cloudflare/**",
  "@ktb/infra-oci",
  "@ktb/infra-oci/**",
  "cloudflare:*",
  ...ADAPTER_PACKAGE_NAMES.flatMap((name) => [`@ktb/${name}`, `@ktb/${name}/**`]),
];

/**
 * Provider-literal exemptions for product(): deliberate product
 * surfaces, not port leakage — the theme plugin's font pipeline
 * fetches fonts.googleapis.com css2 by design, and the ai-provider
 * console ships known LLM baseUrls as pickable presets.
 */
export const PROVIDER_LOCKIN_EXEMPTIONS = [
  "plugins/theme/src/assets.ts",
  "plugins/theme/src/present.ts",
  "plugins/ai-provider/src/views/EndpointsPage.tsx",
] as const;

/* ------------------------------------------------------------------ */
/* Preset fragment types                                              */
/* ------------------------------------------------------------------ */

/** Fragment consumers spread into their oxlint `lint` config. The
 * override/plugin shapes are oxlint's own types (re-exported through
 * `vite-plus/lint`) so the fragment drops into `defineConfig` without
 * casts. */
export interface ArchLintFragment {
  jsPlugins: ExternalPluginEntry[];
  overrides: OxlintOverride[];
}

const PLUGIN_SPECIFIER = "eslint-plugin-arch";

const jsPluginsFor = (specifier = PLUGIN_SPECIFIER): ExternalPluginEntry[] => [
  { name: "arch", specifier },
];

interface SpecifierOption {
  /** Module specifier oxlint resolves for `eslint-plugin-arch` —
   * override when the package is installed under a different
   * name/subpath (e.g. `@ktbhealth/workspace/eslint-plugin-arch`). */
  pluginSpecifier?: string;
}

/* ------------------------------------------------------------------ */
/* Presets                                                            */
/* ------------------------------------------------------------------ */

/**
 * Product preset — reproduces the ktbhealth product repo's effective
 * the former arch-policy wiring: all nine `arch/<rule>`
 * rules as "error" on the right globs, test exemptions "off", and the
 * provider-lockin file exemptions. Also carries the port/domain
 * platform/impl import restrictions that share the same override
 * blocks.
 *
 * Product-specific extras that stay in the consumer's own config:
 * the `packages/**` import-cycle rules, the `apps/web` impl-import
 * ban with its composition-root exception list, and the vitest
 * plugin wiring.
 */
export function product(options: SpecifierOption = {}): ArchLintFragment {
  return {
    jsPlugins: jsPluginsFor(options.pluginSpecifier),
    overrides: [
      {
        // Port/domain boundary: ports, domain packages and plugins may
        // never reach into adapter implementations, the deploy target,
        // the composition root, or runtime/cloud platform APIs.
        files: PORT_GLOBS,
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: [...IMPL_IMPORT_PATTERNS, ...PLATFORM_IMPORT_PATTERNS] },
          ],
          "no-restricted-globals": [
            "error",
            ...PLATFORM_GLOBALS.map((name) => ({
              name,
              message: `${name} is runtime-specific; inject config via ports/layers`,
            })),
          ],
          "arch/provider-lockin": "error",
          // Tenant-scoped tables may only be queried through scopedRepo().
          "arch/tenant-scope": "error",
        },
      },
      {
        // Tests keep the adapter-import bans but are exempt from
        // platform-API and provider-literal rules.
        files: PORT_TEST_GLOBS,
        rules: {
          "no-restricted-imports": ["error", { patterns: IMPL_IMPORT_PATTERNS }],
          "no-restricted-globals": "off",
          "arch/provider-lockin": "off",
          "arch/tenant-scope": "off",
        },
      },
      {
        files: PACKAGE_BOUNDARY_GLOBS,
        rules: { "arch/package-boundary": "error" },
      },
      {
        // Theme tokens are the only color source.
        files: UI_GLOBS,
        rules: { "arch/no-hardcoded-colors": "error" },
      },
      {
        // Test fixtures may paint freely — the rule targets shipped UI.
        files: UI_TEST_GLOBS,
        rules: { "arch/no-hardcoded-colors": "off" },
      },
      {
        // Provider-literal exemptions (see PROVIDER_LOCKIN_EXEMPTIONS).
        files: [...PROVIDER_LOCKIN_EXEMPTIONS],
        rules: { "arch/provider-lockin": "off" },
      },
      {
        // Every plugin must export `plugins` — an array of
        // definePlugin({...}) entries — for host discovery.
        files: ["plugins/*/src/index.ts", "plugins/*/src/client.ts"],
        rules: { "arch/plugin-contract": "error" },
      },
      {
        // Plugin page routes are gated on plugin enable state
        // automatically — bare createFileRoute bypasses the gate.
        files: ["plugins/*/src/routes/**/*.{ts,tsx}"],
        rules: { "arch/plugin-route-gate": "error" },
      },
      {
        // Plugin API/server routes get the same enabled-state gate
        // through createPluginApiRoute.
        files: ["plugins/*/src/api-routes/**/*.{ts,tsx}"],
        rules: { "arch/plugin-api-route-gate": "error" },
      },
      {
        // Client manifests ship to the browser bundle: value imports
        // are allowlisted so server modules never leak into the graph.
        files: ["plugins/*/src/client.ts"],
        rules: { "arch/client-contract": "error" },
      },
      {
        // Driver descriptors must stay typed against the framework port.
        files: ["packages/**/*.ts", "plugins/**/*.ts"],
        rules: { "arch/driver-contract": "error" },
      },
    ],
  };
}

export interface UiPresetOptions {
  /** Source globs the color rule applies to. */
  sources?: string[];
  /** Test globs where the color rule is off. */
  tests?: string[];
}

const DEFAULT_UI_SOURCES = [
  "src/**/*.{ts,tsx}",
  "packages/**/*.{ts,tsx}",
  "stories/**/*.{ts,tsx}",
  "*.stories.*",
];

const DEFAULT_UI_TESTS = ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];

/**
 * UI preset — enables only arch/no-hardcoded-colors for UI repos
 * (e.g. the design-system repo): palette utilities, arbitrary color
 * values and literal white/black fills bypass theme tokens.
 */
export function ui(options: UiPresetOptions & SpecifierOption = {}): ArchLintFragment {
  const sources = options.sources ?? DEFAULT_UI_SOURCES;
  const tests = options.tests ?? DEFAULT_UI_TESTS;
  return {
    jsPlugins: jsPluginsFor(options.pluginSpecifier),
    overrides: [
      {
        files: sources,
        rules: { "arch/no-hardcoded-colors": "error" },
      },
      {
        files: tests,
        rules: { "arch/no-hardcoded-colors": "off" },
      },
    ],
  };
}

/** Preset namespace — `arch.product()`, `arch.ui()`. */
export const arch = { product, ui };

export default arch;
