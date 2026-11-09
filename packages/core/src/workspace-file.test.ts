import { describe, expect, it } from "vitest";

import { buildWorkspaceFile, workspaceFileName } from "./workspace-file.ts";

describe("buildWorkspaceFile", () => {
	it("includes the root folder and no repo folders when empty", () => {
		const parsed = JSON.parse(buildWorkspaceFile([]));
		expect(parsed.folders).toEqual([{ name: "ktbhealth", path: "." }]);
		expect(parsed.settings["search.exclude"]["**/node_modules"]).toBe(true);
	});

	it("adds one folder per repo under repos/, sorted by name", () => {
		const parsed = JSON.parse(buildWorkspaceFile(["ui", "product", ".github"]));
		expect(parsed.folders).toEqual([
			{ name: "ktbhealth", path: "." },
			{ name: ".github", path: "repos/.github" },
			{ name: "product", path: "repos/product" },
			{ name: "ui", path: "repos/ui" },
		]);
	});

	it("does not mutate the input array", () => {
		const names = ["ui", "product"];
		buildWorkspaceFile(names);
		expect(names).toEqual(["ui", "product"]);
	});

	it("produces valid JSON with a trailing newline", () => {
		const text = buildWorkspaceFile(["product"]);
		expect(text.endsWith("}\n")).toBe(true);
		expect(() => JSON.parse(text)).not.toThrow();
	});
});

describe("workspaceFileName", () => {
	it("is ktbhealth.code-workspace", () => {
		expect(workspaceFileName).toBe("ktbhealth.code-workspace");
	});
});
