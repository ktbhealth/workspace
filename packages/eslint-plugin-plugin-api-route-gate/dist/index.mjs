// src/index.ts
const PLUGIN_API_ROUTE_RE = /(?:^|[/\\])plugins[/\\]([^/\\]+)[/\\]src[/\\]api-routes[/\\].*\.(?:ts|tsx)$/;
const SERVER_FNS_PKG = "@ktb/server-fns";
const ROUTER_PKG = "@tanstack/react-router";
const HELPER_NAME = "createPluginApiRoute";
const BANNED_ROUTE_CREATORS = /* @__PURE__ */ new Set(["createFileRoute", "createLazyFileRoute"]);
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
const plugin = {
	meta: { name: "arch-api-route-gate" },
	rules: { "plugin-api-route-gate": { create(context) {
		const match = context.filename.match(PLUGIN_API_ROUTE_RE);
		if (match === null || TEST_FILE_RE.test(context.filename)) return {};
		const expectedId = `${match[1]}.routes`;
		let imports;
		return {
			Program(node) {
				imports = namedImports(node);
				for (const stmt of node.body) {
					if (stmt.type !== "ImportDeclaration" || stmt.importKind === "type") continue;
					if (stmt.source?.value !== ROUTER_PKG) continue;
					for (const spec of stmt.specifiers ?? []) {
						const imported = importedName(spec);
						if (typeof imported === "string" && BANNED_ROUTE_CREATORS.has(imported)) context.report({
							node: spec,
							message: `plugin api route modules must use ${HELPER_NAME}("${expectedId}") from "${SERVER_FNS_PKG}" — bare ${imported} bypasses the enabled-state gate (arch-api-route-gate/plugin-api-route-gate)`
						});
					}
				}
				if (!exportedNames(node).has("Route")) return;
				if (![...imports.values()].some((entry) => entry.source === SERVER_FNS_PKG && entry.imported === HELPER_NAME)) context.report({
					node,
					message: `plugin api route modules must build Route via ${HELPER_NAME}("${expectedId}") from "${SERVER_FNS_PKG}" (arch-api-route-gate/plugin-api-route-gate)`
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
					message: `${HELPER_NAME} must gate on this package's routes plugin id "${expectedId}" (arch-api-route-gate/plugin-api-route-gate)`
				});
			}
		};
	} } }
};
export { plugin as default };
