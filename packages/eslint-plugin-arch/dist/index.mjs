// ../eslint-plugin-client-contract/src/index.ts
const CLIENT_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\]client\.ts$/;
/**
* Modules a client manifest may value-import: the kernel contract, the
* UI kit, and component files (relative .tsx — platform-page wrappers
* and views). Anything else is server-side and would drag the server
* graph into the browser bundle.
*/
const CLIENT_IMPORT_ALLOWLIST = [
	"@ktb/kernel",
	"@ktbhealth/",
	"lucide-react",
	"react",
	"react-dom",
	"@tanstack/react-router",
	"@tanstack/virtual-file-routes",
	"@ktb/audit/activity-page"
];
const CLIENT_RELATIVE_RE = /^\.\.?\/.*\.tsx$/;
const clientImportAllowed = (source) => CLIENT_IMPORT_ALLOWLIST.some((allowed) => allowed.endsWith("/") ? source.startsWith(allowed) : source === allowed) || CLIENT_RELATIVE_RE.test(source);
const plugin$9 = {
	meta: { name: "arch-client" },
	rules: { "client-contract": { create(context) {
		return { ImportDeclaration(node) {
			if (!CLIENT_ENTRY_RE.test(context.filename)) return;
			if (node.importKind === "type") return;
			const source = node.source?.value;
			if (typeof source !== "string" || clientImportAllowed(source)) return;
			context.report({
				node,
				message: `client manifest may not value-import "${source}" — src/client.ts ships to the browser bundle; keep server code in src/index.ts (arch-client/client-contract)`
			});
		} };
	} } }
};
// ../eslint-plugin-driver-contract/src/index.ts
const DRIVER_NAME_RE = /Drivers?$/;
const DRIVER_FRAMEWORK = "@ktb/driver-framework";
const importedName$4 = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
* Named imports in the file: local binding name → { source, imported }.
* Covers `import { X }`, `import { X as Y }` and `import type { X }`.
*/
const namedImports$4 = (program) => {
	const map = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers ?? []) if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") map.set(spec.local.name, {
			source: stmt.source.value,
			imported: importedName$4(spec)
		});
	}
	return map;
};
/** Whether the file imports `name` (value or type) from `source`. */
const hasNamedImport = (program, source, name) => [...namedImports$4(program).values()].some((entry) => entry.source === source && entry.imported === name);
/** Top-level variable declarators (`const`/`let`/`var`), keyed by name. */
const topLevelDeclarators$1 = (program) => {
	const decls = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		const declaration = stmt.type === "VariableDeclaration" ? stmt : stmt.type === "ExportNamedDeclaration" && stmt.declaration?.type === "VariableDeclaration" ? stmt.declaration : void 0;
		if (!declaration) continue;
		for (const d of declaration.declarations) if (d.id.type === "Identifier") decls.set(d.id.name, d);
	}
	return decls;
};
/** Names exported from the module (named exports only). */
const exportedNames$3 = (program) => {
	const names = /* @__PURE__ */ new Set();
	for (const stmt of program.body) {
		if (stmt.type !== "ExportNamedDeclaration") continue;
		const decl = stmt.declaration;
		if (decl?.type === "VariableDeclaration") {
			for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
		} else if (decl?.id?.type === "Identifier") names.add(decl.id.name);
		for (const spec of stmt.specifiers ?? []) {
			const exported = spec.exported?.name ?? spec.exported?.value;
			if (exported) names.add(exported);
		}
	}
	return names;
};
const plugin$8 = {
	meta: { name: "arch-driver" },
	rules: { "driver-contract": { create(context) {
		return { Program(node) {
			const decls = topLevelDeclarators$1(node);
			const exported = exportedNames$3(node);
			const descriptors = [];
			for (const name of exported) {
				if (!DRIVER_NAME_RE.test(name)) continue;
				const declarator = decls.get(name);
				const init = declarator?.init;
				if (init?.type === "ObjectExpression" || init?.type === "ArrayExpression") descriptors.push(declarator);
			}
			if (descriptors.length === 0) return;
			if (hasNamedImport(node, DRIVER_FRAMEWORK, "Driver")) return;
			for (const d of descriptors) context.report({
				node: d,
				message: "files exporting *Driver(s) descriptors must import `Driver` from \"@ktb/driver-framework\" (arch-driver/driver-contract)"
			});
		} };
	} } }
};
// ../eslint-plugin-no-hardcoded-colors/src/index.ts
const COLOR_UTILITY_RE = new RegExp(`(?:^|[\\s"'\`{(:])(?:[a-zA-Z-]+:)*(?:bg|text|border(?:-[tblrxyse])?|ring|fill|stroke|from|via|to|divide|outline|decoration|caret|accent|shadow|placeholder)-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}|\\[(?:#|oklch|oklab|rgb|hsl|hwb|lab|lch|color-mix)[^\\]]*\\]|white|black)(?:\\/[\\d.]+%?)?(?![\\w-])`);
const COLOR_MESSAGE = "hardcoded color utility — use theme tokens (bg-primary, text-foreground, bg-destructive, bg-warning/10, …) so runtime themes and WCAG foreground pairs stay automatic (arch-colors/no-hardcoded-colors)";
const plugin$7 = {
	meta: { name: "arch-colors" },
	rules: { "no-hardcoded-colors": { create(context) {
		const check = (node, value) => {
			if (typeof value !== "string" || !COLOR_UTILITY_RE.test(value)) return;
			context.report({
				node,
				message: COLOR_MESSAGE
			});
		};
		return {
			Literal(node) {
				check(node, node.value);
			},
			TemplateLiteral(node) {
				for (const quasi of node.quasis ?? []) {
					const cooked = quasi.value?.cooked ?? quasi.value?.raw;
					if (typeof cooked === "string" && COLOR_UTILITY_RE.test(cooked)) {
						context.report({
							node: quasi,
							message: COLOR_MESSAGE
						});
						return;
					}
				}
			}
		};
	} } }
};
// ../eslint-plugin-package-boundary/src/index.ts
/** `<abs>/plugins/<pkg>` (or packages/apps/evals) prefix of a filename. */
const PACKAGE_ROOT_RE = /^(.*[/\\])?(?:plugins|packages|apps|evals)[/\\][^/\\]+/;
const BOUNDARY_EXEMPT_BASENAME_RE = /(?:^|[/\\])(?:schema\.tsx?|[^/\\]*\.gen\.tsx?|[^/\\]*\.test\.tsx?)$/;
/** Resolve "." and ".." segments in a "/" -joined path. */
const normalizePath$1 = (path) => {
	const parts = [];
	for (const seg of path.split("/")) {
		if (seg === "" || seg === ".") continue;
		if (seg === "..") parts.pop();
		else parts.push(seg);
	}
	return parts.join("/");
};
const MESSAGE$1 = "relative import escapes the package root — import through the package's export map instead (arch-boundary/package-boundary)";
const plugin$6 = {
	meta: { name: "arch-boundary" },
	rules: { "package-boundary": { create(context) {
		const filename = context.filename.replaceAll("\\", "/");
		const rootMatch = filename.match(PACKAGE_ROOT_RE);
		if (rootMatch === null || BOUNDARY_EXEMPT_BASENAME_RE.test(filename)) return {};
		const root = normalizePath$1(rootMatch[0]);
		const checkSource = (node, source) => {
			if (typeof source !== "string" || !source.startsWith(".")) return;
			const dir = filename.slice(0, filename.lastIndexOf("/") + 1);
			const resolved = normalizePath$1(`${dir}${source}`);
			if (resolved === root || resolved.startsWith(`${root}/`)) return;
			context.report({
				node,
				message: `${MESSAGE$1}: "${source}"`
			});
		};
		return {
			ImportDeclaration(node) {
				checkSource(node, node.source?.value);
			},
			ExportNamedDeclaration(node) {
				if (node.source) checkSource(node, node.source.value);
			},
			ExportAllDeclaration(node) {
				if (node.source) checkSource(node, node.source.value);
			},
			ImportExpression(node) {
				const source = node.source;
				checkSource(node, source?.type === "Literal" ? source.value : void 0);
			}
		};
	} } }
};
// ../eslint-plugin-plugin-api-route-gate/src/index.ts
const PLUGIN_API_ROUTE_RE = /(?:^|[/\\])plugins[/\\]([^/\\]+)[/\\]src[/\\]api-routes[/\\].*\.(?:ts|tsx)$/;
const SERVER_FNS_PKG$1 = "@ktb/server-fns";
const ROUTER_PKG$1 = "@tanstack/react-router";
const HELPER_NAME$1 = "createPluginApiRoute";
const BANNED_ROUTE_CREATORS$1 = /* @__PURE__ */ new Set(["createFileRoute", "createLazyFileRoute"]);
const TEST_FILE_RE$2 = /\.test\.tsx?$/;
const importedName$3 = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
* Named imports in the file: local binding name → { source, imported }.
* Covers `import { X }`, `import { X as Y }` and `import type { X }`.
*/
const namedImports$3 = (program) => {
	const map = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers ?? []) if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") map.set(spec.local.name, {
			source: stmt.source.value,
			imported: importedName$3(spec)
		});
	}
	return map;
};
/** Names exported from the module (named exports only). */
const exportedNames$2 = (program) => {
	const names = /* @__PURE__ */ new Set();
	for (const stmt of program.body) {
		if (stmt.type !== "ExportNamedDeclaration") continue;
		const decl = stmt.declaration;
		if (decl?.type === "VariableDeclaration") {
			for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
		} else if (decl?.id?.type === "Identifier") names.add(decl.id.name);
		for (const spec of stmt.specifiers ?? []) {
			const exported = spec.exported?.name ?? spec.exported?.value;
			if (exported) names.add(exported);
		}
	}
	return names;
};
const plugin$5 = {
	meta: { name: "arch-api-route-gate" },
	rules: { "plugin-api-route-gate": { create(context) {
		const match = context.filename.match(PLUGIN_API_ROUTE_RE);
		if (match === null || TEST_FILE_RE$2.test(context.filename)) return {};
		const expectedId = `${match[1]}.routes`;
		let imports;
		return {
			Program(node) {
				imports = namedImports$3(node);
				for (const stmt of node.body) {
					if (stmt.type !== "ImportDeclaration" || stmt.importKind === "type") continue;
					if (stmt.source?.value !== ROUTER_PKG$1) continue;
					for (const spec of stmt.specifiers ?? []) {
						const imported = importedName$3(spec);
						if (typeof imported === "string" && BANNED_ROUTE_CREATORS$1.has(imported)) context.report({
							node: spec,
							message: `plugin api route modules must use ${HELPER_NAME$1}("${expectedId}") from "${SERVER_FNS_PKG$1}" — bare ${imported} bypasses the enabled-state gate (arch-api-route-gate/plugin-api-route-gate)`
						});
					}
				}
				if (!exportedNames$2(node).has("Route")) return;
				if (![...imports.values()].some((entry) => entry.source === SERVER_FNS_PKG$1 && entry.imported === HELPER_NAME$1)) context.report({
					node,
					message: `plugin api route modules must build Route via ${HELPER_NAME$1}("${expectedId}") from "${SERVER_FNS_PKG$1}" (arch-api-route-gate/plugin-api-route-gate)`
				});
			},
			CallExpression(node) {
				const callee = node.callee;
				if (callee?.type !== "Identifier" || imports === void 0) return;
				const binding = imports.get(callee.name);
				if (binding?.source !== SERVER_FNS_PKG$1 || binding.imported !== HELPER_NAME$1) return;
				const arg = node.arguments[0];
				if (arg?.type === "Literal" && typeof arg.value === "string" && arg.value !== expectedId) context.report({
					node: arg,
					message: `${HELPER_NAME$1} must gate on this package's routes plugin id "${expectedId}" (arch-api-route-gate/plugin-api-route-gate)`
				});
			}
		};
	} } }
};
// ../eslint-plugin-plugin-contract/src/index.ts
const PLUGIN_ENTRY_RE = /(?:^|[/\\])plugins[/\\][^/\\]+[/\\]src[/\\](?:index|client)\.ts$/;
const KERNEL = "@ktb/kernel";
const importedName$2 = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
* Named imports in the file: local binding name → { source, imported }.
* Covers `import { X }`, `import { X as Y }` and `import type { X }`.
*/
const namedImports$2 = (program) => {
	const map = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers ?? []) if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") map.set(spec.local.name, {
			source: stmt.source.value,
			imported: importedName$2(spec)
		});
	}
	return map;
};
/** Top-level variable declarators (`const`/`let`/`var`), keyed by name. */
const topLevelDeclarators = (program) => {
	const decls = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		const declaration = stmt.type === "VariableDeclaration" ? stmt : stmt.type === "ExportNamedDeclaration" && stmt.declaration?.type === "VariableDeclaration" ? stmt.declaration : void 0;
		if (!declaration) continue;
		for (const d of declaration.declarations) if (d.id.type === "Identifier") decls.set(d.id.name, d);
	}
	return decls;
};
/** Names exported from the module (named exports only). */
const exportedNames$1 = (program) => {
	const names = /* @__PURE__ */ new Set();
	for (const stmt of program.body) {
		if (stmt.type !== "ExportNamedDeclaration") continue;
		const decl = stmt.declaration;
		if (decl?.type === "VariableDeclaration") {
			for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
		} else if (decl?.id?.type === "Identifier") names.add(decl.id.name);
		for (const spec of stmt.specifiers ?? []) {
			const exported = spec.exported?.name ?? spec.exported?.value;
			if (exported) names.add(exported);
		}
	}
	return names;
};
/**
* Whether `init` is a `definePlugin({...})` call with `definePlugin`
* imported from the kernel package.
*/
const isDefinePluginInit = (init, imports) => {
	const callee = init?.type === "CallExpression" ? init.callee : void 0;
	if (callee?.type !== "Identifier" || init.arguments.length === 0 || init.arguments[0]?.type !== "ObjectExpression") return false;
	const binding = imports.get(callee.name);
	return binding?.source === KERNEL && binding.imported === "definePlugin";
};
const plugin$4 = {
	meta: { name: "arch-plugin-contract" },
	rules: { "plugin-contract": { create(context) {
		return { Program(node) {
			if (!PLUGIN_ENTRY_RE.test(context.filename)) return;
			const imports = namedImports$2(node);
			const decls = topLevelDeclarators(node);
			const declarator = decls.get("plugins");
			const elements = declarator?.init?.type === "ArrayExpression" ? declarator.init.elements : void 0;
			if (!exportedNames$1(node).has("plugins") || elements === void 0 || elements.length === 0) {
				context.report({
					node,
					message: "plugin entry must export `plugins` — a non-empty array of `definePlugin({...})` plugins for host discovery (arch-plugin-contract/plugin-contract)"
				});
				return;
			}
			for (const el of elements) {
				const init = el?.type === "Identifier" ? decls.get(el.name)?.init : el?.type === "CallExpression" ? el : void 0;
				if (init === void 0 || !isDefinePluginInit(init, imports)) context.report({
					node: el ?? node,
					message: "`plugins` entries must be `definePlugin({...})` calls or consts initialized with `definePlugin` imported from \"@ktb/kernel\" (arch-plugin-contract/plugin-contract)"
				});
			}
		} };
	} } }
};
// ../eslint-plugin-plugin-route-gate/src/index.ts
const PLUGIN_PAGE_ROUTE_RE = /(?:^|[/\\])plugins[/\\]([^/\\]+)[/\\]src[/\\]routes[/\\].*\.(?:ts|tsx)$/;
const SERVER_FNS_PKG = "@ktb/server-fns";
const ROUTER_PKG = "@tanstack/react-router";
const HELPER_NAME = "createPluginFileRoute";
const BANNED_ROUTE_CREATORS = /* @__PURE__ */ new Set(["createFileRoute", "createLazyFileRoute"]);
const TEST_FILE_RE$1 = /\.test\.tsx?$/;
const importedName$1 = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
* Named imports in the file: local binding name → { source, imported }.
* Covers `import { X }`, `import { X as Y }` and `import type { X }`.
*/
const namedImports$1 = (program) => {
	const map = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers ?? []) if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") map.set(spec.local.name, {
			source: stmt.source.value,
			imported: importedName$1(spec)
		});
	}
	return map;
};
/** Names exported from the module (named exports only). */
const exportedNames = (program) => {
	const names = /* @__PURE__ */ new Set();
	for (const stmt of program.body) {
		if (stmt.type !== "ExportNamedDeclaration") continue;
		const decl = stmt.declaration;
		if (decl?.type === "VariableDeclaration") {
			for (const d of decl.declarations) if (d.id.type === "Identifier") names.add(d.id.name);
		} else if (decl?.id?.type === "Identifier") names.add(decl.id.name);
		for (const spec of stmt.specifiers ?? []) {
			const exported = spec.exported?.name ?? spec.exported?.value;
			if (exported) names.add(exported);
		}
	}
	return names;
};
const plugin$3 = {
	meta: { name: "arch-route-gate" },
	rules: { "plugin-route-gate": { create(context) {
		const match = context.filename.match(PLUGIN_PAGE_ROUTE_RE);
		if (match === null || TEST_FILE_RE$1.test(context.filename)) return {};
		const expectedId = `${match[1]}.routes`;
		let imports;
		return {
			Program(node) {
				imports = namedImports$1(node);
				for (const stmt of node.body) {
					if (stmt.type !== "ImportDeclaration" || stmt.importKind === "type") continue;
					if (stmt.source?.value !== ROUTER_PKG) continue;
					for (const spec of stmt.specifiers ?? []) {
						const imported = importedName$1(spec);
						if (typeof imported === "string" && BANNED_ROUTE_CREATORS.has(imported)) context.report({
							node: spec,
							message: `plugin route modules must use ${HELPER_NAME}("${expectedId}") from "${SERVER_FNS_PKG}" — bare ${imported} bypasses the enabled-state gate (arch-route-gate/plugin-route-gate)`
						});
					}
				}
				if (!exportedNames(node).has("Route")) return;
				if (![...imports.values()].some((entry) => entry.source === SERVER_FNS_PKG && entry.imported === HELPER_NAME)) context.report({
					node,
					message: `plugin route modules must build Route via ${HELPER_NAME}("${expectedId}") from "${SERVER_FNS_PKG}" (arch-route-gate/plugin-route-gate)`
				});
			},
			CallExpression(node) {
				const callee = node.callee;
				if (callee?.type !== "Identifier" || imports === void 0) return;
				const binding = imports.get(callee.name);
				if (binding?.source !== SERVER_FNS_PKG || binding.imported !== HELPER_NAME) return;
				const arg = node.arguments[0];
				if (arg?.type === "Literal" && typeof arg.value === "string" && arg.value !== expectedId) context.report({
					node: arg,
					message: `${HELPER_NAME} must gate on this package's routes plugin id "${expectedId}" (arch-route-gate/plugin-route-gate)`
				});
			}
		};
	} } }
};
// ../eslint-plugin-provider-lockin/src/index.ts
/**
* String literals that name a provider — model ids, endpoints, product
* prefixes. Domain code must not hardcode these; they belong in adapters
* or deploy config. Extend this list when a new provider leaks in.
*/
const PROVIDER_LITERAL_PATTERNS = [
	/^@cf\//,
	/\bapi\.anthropic\.com\b/,
	/\bapi\.openai\.com\b/,
	/\bgoogleapis\.com\b/,
	/\btypesafe\.ai\b/,
	/\/v1\/systemone\b/
];
const MESSAGE = "provider-named literal in port/domain code — move it to an adapter or deploy config";
const plugin$2 = {
	meta: { name: "arch-provider" },
	rules: { "provider-lockin": { create(context) {
		const check = (node, value) => {
			if (typeof value !== "string") return;
			if (!PROVIDER_LITERAL_PATTERNS.some((re) => re.test(value))) return;
			context.report({
				node,
				message: MESSAGE
			});
		};
		return {
			Literal(node) {
				check(node, node.value);
			},
			TemplateLiteral(node) {
				for (const quasi of node.quasis ?? []) {
					const cooked = quasi.value?.cooked ?? quasi.value?.raw;
					if (typeof cooked === "string" && PROVIDER_LITERAL_PATTERNS.some((re) => re.test(cooked))) {
						context.report({
							node: quasi,
							message: MESSAGE
						});
						return;
					}
				}
			}
		};
	} } }
};
// ../eslint-plugin-tenant-scope/src/index.ts
const TENANT_TABLE_FN = "tenantTable";
const TENANT_PKG = "@ktb/tenant";
const TENANT_SCOPE_METHODS = /* @__PURE__ */ new Set([
	"from",
	"innerJoin",
	"leftJoin",
	"rightJoin",
	"fullJoin",
	"insert",
	"update",
	"delete"
]);
const TEST_FILE_RE = /\.test\.tsx?$/;
const importedName = (spec) => spec.imported?.name ?? spec.imported?.value;
/**
* Named imports in the file: local binding name → { source, imported }.
* Covers `import { X }`, `import { X as Y }` and `import type { X }`.
*/
const namedImports = (program) => {
	const map = /* @__PURE__ */ new Map();
	for (const stmt of program.body) {
		if (stmt.type !== "ImportDeclaration") continue;
		for (const spec of stmt.specifiers ?? []) if (spec.type === "ImportSpecifier" && spec.local?.type === "Identifier") map.set(spec.local.name, {
			source: stmt.source.value,
			imported: importedName(spec)
		});
	}
	return map;
};
/** Resolve "." and ".." segments in a "/" -joined path. */
const normalizePath = (path) => {
	const parts = [];
	for (const seg of path.split("/")) {
		if (seg === "" || seg === ".") continue;
		if (seg === "..") parts.pop();
		else parts.push(seg);
	}
	return parts.join("/");
};
/** repo-relative candidate paths for an import specifier. */
const candidateModules = (source, filename) => {
	const out = [];
	if (source.startsWith(".")) {
		const dir = filename.slice(0, filename.lastIndexOf("/") + 1);
		const resolved = normalizePath(dir + source);
		out.push(resolved, `${resolved}.ts`, `${resolved}/index.ts`);
	} else if (source.startsWith("@ktb/")) {
		const rest = source.slice(5);
		const slash = rest.indexOf("/");
		const pkg = slash === -1 ? rest : rest.slice(0, slash);
		const sub = slash === -1 ? "" : rest.slice(slash + 1);
		for (const base of [`plugins/${pkg}/src`, `packages/${pkg}/src`]) if (sub === "") out.push(`${base}/index.ts`, `${base}/schema.ts`);
		else out.push(`${base}/${sub}.ts`, `${base}/${sub}/index.ts`);
	}
	return out;
};
/** Whether recorded filename `file` matches repo-relative candidate `cand`. */
const moduleMatches = (file, cand) => file === cand || file.endsWith(`/${cand}`) || cand.endsWith(`/${file}`);
const tenantScope = {
	tableExports: /* @__PURE__ */ new Map(),
	fileTenantNames: /* @__PURE__ */ new Map(),
	create(context) {
		const rule = tenantScope;
		return {
			Program(node) {
				if (TEST_FILE_RE.test(context.filename)) return;
				const filename = context.filename;
				const imports = namedImports(node);
				const local = /* @__PURE__ */ new Set();
				const exported = /* @__PURE__ */ new Set();
				const isTenantTableInit = (init) => {
					const callee = init?.type === "CallExpression" ? init.callee : void 0;
					if (callee?.type !== "Identifier") return false;
					if (callee.name === TENANT_TABLE_FN) return true;
					const binding = imports.get(callee.name);
					return binding !== void 0 && binding.imported === TENANT_TABLE_FN && (binding.source === TENANT_PKG || binding.source.startsWith(`${TENANT_PKG}/`));
				};
				for (const stmt of node.body) {
					const decl = stmt.type === "VariableDeclaration" ? stmt : stmt.type === "ExportNamedDeclaration" && stmt.declaration?.type === "VariableDeclaration" ? stmt.declaration : void 0;
					const isExport = stmt.type === "ExportNamedDeclaration";
					if (!decl) continue;
					for (const d of decl.declarations) {
						if (d.id.type !== "Identifier" || !isTenantTableInit(d.init)) continue;
						local.add(d.id.name);
						if (isExport) exported.add(d.id.name);
					}
				}
				if (exported.size > 0) rule.tableExports.set(filename, exported);
				const tenantNames = new Set(local);
				for (const [localName, binding] of imports) for (const cand of candidateModules(binding.source, filename)) for (const [file, names] of rule.tableExports) {
					if (!moduleMatches(file, cand)) continue;
					if (names.has(binding.imported)) tenantNames.add(localName);
				}
				rule.fileTenantNames.set(filename, tenantNames);
			},
			CallExpression(node) {
				const filename = context.filename;
				if (TEST_FILE_RE.test(filename)) return;
				const tenantNames = rule.fileTenantNames?.get(filename);
				if (tenantNames === void 0 || tenantNames.size === 0) return;
				const callee = node.callee;
				if (callee?.type !== "MemberExpression" || callee.computed) return;
				const method = callee.property?.name;
				if (typeof method !== "string" || !TENANT_SCOPE_METHODS.has(method)) return;
				const arg = node.arguments[0];
				if (arg?.type !== "Identifier" || !tenantNames.has(arg.name)) return;
				context.report({
					node: arg,
					message: `tenant-scoped table "${arg.name}" must be queried through the scoped-repo factory — raw drizzle access bypasses tenant isolation (arch-tenant/tenant-scope)`
				});
			},
			MemberExpression(node) {
				const filename = context.filename;
				if (TEST_FILE_RE.test(filename)) return;
				const tenantNames = rule.fileTenantNames?.get(filename);
				if (tenantNames === void 0 || tenantNames.size === 0) return;
				if (node.computed || node.property?.type !== "Identifier") return;
				if (!tenantNames.has(node.property.name)) return;
				const obj = node.object;
				if (obj?.type === "MemberExpression" && !obj.computed && obj.property?.type === "Identifier" && obj.property.name === "query") context.report({
					node,
					message: `tenant-scoped table "${node.property.name}" must be queried through the scoped-repo factory — db.query.* bypasses tenant isolation (arch-tenant/tenant-scope)`
				});
			}
		};
	}
};
const plugin$1 = {
	meta: { name: "arch-tenant" },
	rules: { "tenant-scope": tenantScope }
};
// src/index.ts
/**
* eslint-plugin-arch — bundled Oxlint JS plugin.
*
* Plugin id: `arch` — rule ids `arch/<rule>`:
*
* - arch/no-hardcoded-colors      (eslint-plugin-no-hardcoded-colors)
* - arch/provider-lockin          (eslint-plugin-provider-lockin)
* - arch/package-boundary         (eslint-plugin-package-boundary)
* - arch/tenant-scope             (eslint-plugin-tenant-scope)
* - arch/plugin-contract          (eslint-plugin-plugin-contract)
* - arch/plugin-route-gate        (eslint-plugin-plugin-route-gate)
* - arch/plugin-api-route-gate    (eslint-plugin-plugin-api-route-gate)
* - arch/client-contract          (eslint-plugin-client-contract)
* - arch/driver-contract          (eslint-plugin-driver-contract)
*
* Oxlint registers jsPlugins by name and rejects duplicates, so the
* standalone `eslint-plugin-*` packages cannot share one `arch` id —
* this bundle re-exports all nine rule implementations under a single
* plugin meta so consumers get a unified `arch/<rule>` namespace.
*
* Self-contained at runtime: the rule sources are imported from the
* sibling packages' `src/` and inlined into `dist/index.mjs` by
* `vp pack` — consumers install ONLY this package (no dependency on
* the sibling eslint-plugin-* packages, which keeps git-tag installs
* working). `vp pack` refuses cross-package relative imports, so
* `vite.config.ts` carries a tiny rolldown `resolveId` plugin that
* maps the sibling `eslint-plugin-<name>/src/index` specifiers to
* absolute paths; src (not the
* siblings' committed dist) is bundled so future rule edits rebuild
* together in one pack run.
*/
const plugin = {
	meta: { name: "arch" },
	rules: {
		"no-hardcoded-colors": plugin$7.rules["no-hardcoded-colors"],
		"provider-lockin": plugin$2.rules["provider-lockin"],
		"package-boundary": plugin$6.rules["package-boundary"],
		"tenant-scope": plugin$1.rules["tenant-scope"],
		"plugin-contract": plugin$4.rules["plugin-contract"],
		"plugin-route-gate": plugin$3.rules["plugin-route-gate"],
		"plugin-api-route-gate": plugin$5.rules["plugin-api-route-gate"],
		"client-contract": plugin$9.rules["client-contract"],
		"driver-contract": plugin$8.rules["driver-contract"]
	}
};
export { plugin as default };
