// src/index.ts
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
const plugin = {
	meta: { name: "arch-tenant" },
	rules: { "tenant-scope": tenantScope }
};
export { plugin as default };
