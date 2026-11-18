// src/index.ts
/** Port/domain packages — the same set banned from importing adapters. */
const PORT_PACKAGE_NAMES = [
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
	"tenant",
	"rbac",
	"server-fns",
	"eval-core",
	"platform"
];
const pkgGlob = (names) => `packages/{${names.join(",")}}/src/**/*.{ts,tsx}`;
/** Files held to the strict boundary: ports, domain packages, plugins,
* and eval domain packs. */
const PORT_GLOBS = [
	pkgGlob(PORT_PACKAGE_NAMES),
	"plugins/**/*.{ts,tsx}",
	"evals/**/*.{ts,tsx}"
];
/** Test files inside the strict boundary — relaxed by the test override
* (Node APIs and impl mocks are fine in tests). */
const PORT_TEST_GLOBS = [
	`packages/{${PORT_PACKAGE_NAMES.join(",")}}/src/**/*.test.{ts,tsx}`,
	"plugins/**/*.test.{ts,tsx}",
	"evals/**/*.test.{ts,tsx}"
];
/** Source trees scanned by arch/package-boundary: a relative import may
* not resolve outside the importing package's root. */
const PACKAGE_BOUNDARY_GLOBS = [
	"plugins/**/*.{ts,tsx}",
	"packages/**/*.{ts,tsx}",
	"apps/**/*.{ts,tsx}",
	"evals/**/*.{ts,tsx}"
];
/** UI source trees held to arch/no-hardcoded-colors. */
const UI_GLOBS = [
	"plugins/**/*.{ts,tsx}",
	"packages/**/*.{ts,tsx}",
	"apps/**/*.{ts,tsx}",
	"evals/**/*.{ts,tsx}"
];
const UI_TEST_GLOBS = [
	"plugins/**/*.test.{ts,tsx}",
	"packages/**/*.test.{ts,tsx}",
	"apps/**/*.test.{ts,tsx}",
	"evals/**/*.test.{ts,tsx}"
];
/** Import specifiers that tie code to a runtime or cloud platform. */
const PLATFORM_IMPORT_PATTERNS = [
	"node:*",
	"bun:*",
	"deno:*",
	"cloudflare:*",
	"workerd:*"
];
/** Globals that only exist on specific runtimes. */
const PLATFORM_GLOBALS = [
	"process",
	"Bun",
	"Deno"
];
/**
* String literals that name a provider — model ids, endpoints, product
* prefixes. Domain code must not hardcode these; they belong in
* adapters or deploy config.
*/
const PROVIDER_LITERAL_PATTERNS = [
	/^@cf\//,
	/\bapi\.anthropic\.com\b/,
	/\bapi\.openai\.com\b/,
	/\bgoogleapis\.com\b/,
	/\btypesafe\.ai\b/,
	/\/v1\/systemone\b/
];
/**
* Import specifiers port/domain files may never use: the deploy target,
* the composition root, infra adapters and every adapter package.
*/
const IMPL_IMPORT_PATTERNS = [
	"**/apps/**",
	"@ktb/web",
	"@ktb/app-host",
	"@ktb/app-host/**",
	"@ktb/infra-cloudflare",
	"@ktb/infra-cloudflare/**",
	"@ktb/infra-oci",
	"@ktb/infra-oci/**",
	"cloudflare:*",
	...[
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
		"eval-adapter-stub",
		"eval-adapter-local",
		"eval-adapter-cloud",
		"ai-adapter-openai",
		"ai-adapter-acp",
		"ai-adapter-node",
		"ai-bridge"
	].flatMap((name) => [`@ktb/${name}`, `@ktb/${name}/**`])
];
/**
* Provider-literal exemptions for product(): deliberate product
* surfaces, not port leakage — the theme plugin's font pipeline
* fetches fonts.googleapis.com css2 by design, and the ai-endpoints
* console ships known LLM baseUrls as pickable presets.
*/
const PROVIDER_LOCKIN_EXEMPTIONS = [
	"plugins/theme/src/assets.ts",
	"plugins/theme/src/present.ts",
	"plugins/ai-endpoints/src/views/EndpointsPage.tsx"
];
const PLUGIN_SPECIFIER = "eslint-plugin-arch";
const jsPluginsFor = (specifier = PLUGIN_SPECIFIER) => [{
	name: "arch",
	specifier
}];
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
function product(options = {}) {
	return {
		jsPlugins: jsPluginsFor(options.pluginSpecifier),
		overrides: [
			{
				files: PORT_GLOBS,
				rules: {
					"no-restricted-imports": ["error", { patterns: [...IMPL_IMPORT_PATTERNS, ...PLATFORM_IMPORT_PATTERNS] }],
					"no-restricted-globals": ["error", ...PLATFORM_GLOBALS.map((name) => ({
						name,
						message: `${name} is runtime-specific; inject config via ports/layers`
					}))],
					"arch/provider-lockin": "error",
					"arch/tenant-scope": "error"
				}
			},
			{
				files: PORT_TEST_GLOBS,
				rules: {
					"no-restricted-imports": ["error", { patterns: IMPL_IMPORT_PATTERNS }],
					"no-restricted-globals": "off",
					"arch/provider-lockin": "off",
					"arch/tenant-scope": "off"
				}
			},
			{
				files: PACKAGE_BOUNDARY_GLOBS,
				rules: { "arch/package-boundary": "error" }
			},
			{
				files: UI_GLOBS,
				rules: { "arch/no-hardcoded-colors": "error" }
			},
			{
				files: UI_TEST_GLOBS,
				rules: { "arch/no-hardcoded-colors": "off" }
			},
			{
				files: [...PROVIDER_LOCKIN_EXEMPTIONS],
				rules: { "arch/provider-lockin": "off" }
			},
			{
				files: ["plugins/*/src/index.ts", "plugins/*/src/client.ts"],
				rules: { "arch/plugin-contract": "error" }
			},
			{
				files: ["plugins/*/src/routes/**/*.{ts,tsx}"],
				rules: { "arch/plugin-route-gate": "error" }
			},
			{
				files: ["plugins/*/src/api-routes/**/*.{ts,tsx}"],
				rules: { "arch/plugin-api-route-gate": "error" }
			},
			{
				files: ["plugins/*/src/client.ts"],
				rules: { "arch/client-contract": "error" }
			},
			{
				files: ["packages/**/*.ts", "plugins/**/*.ts"],
				rules: { "arch/driver-contract": "error" }
			}
		]
	};
}
const DEFAULT_UI_SOURCES = [
	"src/**/*.{ts,tsx}",
	"packages/**/*.{ts,tsx}",
	"stories/**/*.{ts,tsx}",
	"*.stories.*"
];
const DEFAULT_UI_TESTS = ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];
/**
* UI preset — enables only arch/no-hardcoded-colors for UI repos
* (e.g. the design-system repo): palette utilities, arbitrary color
* values and literal white/black fills bypass theme tokens.
*/
function ui(options = {}) {
	const sources = options.sources ?? DEFAULT_UI_SOURCES;
	const tests = options.tests ?? DEFAULT_UI_TESTS;
	return {
		jsPlugins: jsPluginsFor(options.pluginSpecifier),
		overrides: [{
			files: sources,
			rules: { "arch/no-hardcoded-colors": "error" }
		}, {
			files: tests,
			rules: { "arch/no-hardcoded-colors": "off" }
		}]
	};
}
/** Preset namespace — `arch.product()`, `arch.ui()`. */
const arch = {
	product,
	ui
};
export { IMPL_IMPORT_PATTERNS, PACKAGE_BOUNDARY_GLOBS, PLATFORM_GLOBALS, PLATFORM_IMPORT_PATTERNS, PORT_GLOBS, PORT_PACKAGE_NAMES, PORT_TEST_GLOBS, PROVIDER_LITERAL_PATTERNS, PROVIDER_LOCKIN_EXEMPTIONS, UI_GLOBS, UI_TEST_GLOBS, arch, arch as default, product, ui };
