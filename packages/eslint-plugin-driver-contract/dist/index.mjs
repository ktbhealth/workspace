// src/index.ts
const DRIVER_NAME_RE = /Drivers?$/;
const DRIVER_FRAMEWORK = "@ktb/driver-framework";
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
/** Whether the file imports `name` (value or type) from `source`. */
const hasNamedImport = (program, source, name) => [...namedImports(program).values()].some((entry) => entry.source === source && entry.imported === name);
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
	meta: { name: "arch-driver" },
	rules: { "driver-contract": { create(context) {
		return { Program(node) {
			const decls = topLevelDeclarators(node);
			const exported = exportedNames(node);
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
export { plugin as default };
