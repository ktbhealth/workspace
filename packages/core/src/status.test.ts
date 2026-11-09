import { describe, expect, it } from "vitest";

import {
	formatStatusHeader,
	formatStatusRow,
	formatStatusTable,
	parseGitStatus,
	type GitStatus,
} from "./status.ts";

const status = (overrides: Partial<GitStatus> = {}): GitStatus => ({
	branch: "main",
	upstream: true,
	ahead: 0,
	behind: 0,
	dirty: 0,
	...overrides,
});

describe("parseGitStatus", () => {
	it("parses branch, upstream counts, and dirty entries", () => {
		const porcelain = [
			"# branch.oid abc123",
			"# branch.head main",
			"# branch.upstream origin/main",
			"# branch.ab +2 -1",
			"1 .M N... 100644 100644 100644 abc def src/a.ts",
			"? src/new.ts",
			"",
		].join("\n");

		expect(parseGitStatus(porcelain)).toEqual({
			branch: "main",
			upstream: true,
			ahead: 2,
			behind: 1,
			dirty: 2,
		});
	});

	it("handles a detached head", () => {
		const porcelain = "# branch.head (detached)\n# branch.ab +0 -0\n";
		expect(parseGitStatus(porcelain)).toEqual({
			branch: "(detached)",
			upstream: true,
			ahead: 0,
			behind: 0,
			dirty: 0,
		});
	});

	it("handles no upstream", () => {
		const porcelain = "# branch.head feature\n1 .M N... 100644 100644 100644 abc def f.ts\n";
		expect(parseGitStatus(porcelain)).toEqual({
			branch: "feature",
			upstream: false,
			ahead: 0,
			behind: 0,
			dirty: 1,
		});
	});

	it("ignores other comment lines and blank lines", () => {
		const porcelain = "# branch.oid abc\n# branch.head main\n# something else\n\n";
		expect(parseGitStatus(porcelain)).toEqual({
			branch: "main",
			upstream: false,
			ahead: 0,
			behind: 0,
			dirty: 0,
		});
	});

	it("keeps upstream flag but zero counts when branch.ab is malformed", () => {
		const porcelain = "# branch.head main\n# branch.ab garbage\n";
		expect(parseGitStatus(porcelain)).toEqual({
			branch: "main",
			upstream: true,
			ahead: 0,
			behind: 0,
			dirty: 0,
		});
	});

	it("returns detached defaults for empty output", () => {
		expect(parseGitStatus("")).toEqual({
			branch: "(detached)",
			upstream: false,
			ahead: 0,
			behind: 0,
			dirty: 0,
		});
	});
});

describe("formatStatusRow", () => {
	it("formats a row with upstream counts", () => {
		expect(formatStatusRow("product", status({ ahead: 1, behind: 2, dirty: 3 }))).toBe(
			"product                main                    3  +1/-2",
		);
	});

	it("formats a row without upstream", () => {
		expect(formatStatusRow("ui", status({ branch: "feature-x", upstream: false, dirty: 12 }))).toBe(
			"ui                     feature-x              12  no upstream",
		);
	});
});

describe("formatStatusTable", () => {
	it("prints the header and one line per repo", () => {
		const table = formatStatusTable([
			{ name: "product", status: status() },
			{ name: "ui", status: status({ upstream: false }) },
		]);
		expect(table).toBe(
			[
				formatStatusHeader(),
				"product                main                    0  +0/-0",
				"ui                     main                    0  no upstream",
			].join("\n"),
		);
	});

	it("prints only the header for no repos", () => {
		expect(formatStatusTable([])).toBe(formatStatusHeader());
	});
});
