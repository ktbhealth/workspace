import { ExternalPluginEntry, OxlintOverride } from "vite-plus/lint";
/** Port/domain packages — the same set banned from importing adapters. */
export declare const PORT_PACKAGE_NAMES: readonly ["kernel", "auth", "authz", "bot", "captcha", "email", "transcription", "anamnesis", "export-pdf", "interop", "db", "driver-framework", "tenant", "rbac", "server-fns", "eval-core", "platform"];
/** Files held to the strict boundary: ports, domain packages, plugins,
 * and eval domain packs. */
export declare const PORT_GLOBS: string[];
/** Test files inside the strict boundary — relaxed by the test override
 * (Node APIs and impl mocks are fine in tests). */
export declare const PORT_TEST_GLOBS: string[];
/** Source trees scanned by arch/package-boundary: a relative import may
 * not resolve outside the importing package's root. */
export declare const PACKAGE_BOUNDARY_GLOBS: string[];
/** UI source trees held to arch/no-hardcoded-colors. */
export declare const UI_GLOBS: string[];
export declare const UI_TEST_GLOBS: string[];
/** Import specifiers that tie code to a runtime or cloud platform. */
export declare const PLATFORM_IMPORT_PATTERNS: string[];
/** Globals that only exist on specific runtimes. */
export declare const PLATFORM_GLOBALS: string[];
/**
 * String literals that name a provider — model ids, endpoints, product
 * prefixes. Domain code must not hardcode these; they belong in
 * adapters or deploy config.
 */
export declare const PROVIDER_LITERAL_PATTERNS: readonly [RegExp, RegExp, RegExp, RegExp, RegExp, RegExp];
/**
 * Import specifiers port/domain files may never use: the deploy target,
 * the composition root, infra adapters and every adapter package.
 */
export declare const IMPL_IMPORT_PATTERNS: string[];
/**
 * Provider-literal exemptions for product(): deliberate product
 * surfaces, not port leakage — the theme plugin's font pipeline
 * fetches fonts.googleapis.com css2 by design, and the ai-endpoints
 * console ships known LLM baseUrls as pickable presets.
 */
export declare const PROVIDER_LOCKIN_EXEMPTIONS: readonly ["plugins/theme/src/assets.ts", "plugins/theme/src/present.ts", "plugins/ai-endpoints/src/views/EndpointsPage.tsx"];
/** Fragment consumers spread into their oxlint `lint` config. The
 * override/plugin shapes are oxlint's own types (re-exported through
 * `vite-plus/lint`) so the fragment drops into `defineConfig` without
 * casts. */
export interface ArchLintFragment {
  jsPlugins: ExternalPluginEntry[];
  overrides: OxlintOverride[];
}
interface SpecifierOption {
  /** Module specifier oxlint resolves for `eslint-plugin-arch` —
   * override when the package is installed under a different
   * name/subpath (e.g. `@ktbhealth/workspace/eslint-plugin-arch`). */
  pluginSpecifier?: string;
}
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
export declare function product(options?: SpecifierOption): ArchLintFragment;
export interface UiPresetOptions {
  /** Source globs the color rule applies to. */
  sources?: string[];
  /** Test globs where the color rule is off. */
  tests?: string[];
}
/**
 * UI preset — enables only arch/no-hardcoded-colors for UI repos
 * (e.g. the design-system repo): palette utilities, arbitrary color
 * values and literal white/black fills bypass theme tokens.
 */
export declare function ui(options?: UiPresetOptions & SpecifierOption): ArchLintFragment;
/** Preset namespace — `arch.product()`, `arch.ui()`. */
export declare const arch: {
  product: typeof product;
  ui: typeof ui;
};
export { arch as default };