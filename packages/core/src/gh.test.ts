import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { decodeRepoList } from "./gh.ts";

describe("decodeRepoList", () => {
	it("decodes, filters archived, and sorts by name", () => {
		const json = JSON.stringify([
			{ name: "ui", sshUrl: "git@github.com:ktbhealth/ui.git", isArchived: false },
			{ name: "old", sshUrl: "git@github.com:ktbhealth/old.git", isArchived: true },
			{
				name: "product",
				sshUrl: "git@github.com:ktbhealth/product.git",
				isArchived: false,
			},
			{ name: ".github", sshUrl: "git@github.com:ktbhealth/.github.git", isArchived: false },
		]);

		const result = decodeRepoList(json);

		expect(Result.isSuccess(result)).toBe(true);
		if (Result.isSuccess(result)) {
			expect(result.success).toEqual([
				{ name: ".github", sshUrl: "git@github.com:ktbhealth/.github.git" },
				{ name: "product", sshUrl: "git@github.com:ktbhealth/product.git" },
				{ name: "ui", sshUrl: "git@github.com:ktbhealth/ui.git" },
			]);
		}
	});

	it("returns an empty list for an empty array", () => {
		const result = decodeRepoList("[]");
		expect(Result.isSuccess(result)).toBe(true);
		if (Result.isSuccess(result)) {
			expect(result.success).toEqual([]);
		}
	});

	it("fails on invalid JSON", () => {
		const result = decodeRepoList("not json");
		expect(Result.isFailure(result)).toBe(true);
	});

	it("fails when the payload is not an array", () => {
		const result = decodeRepoList(JSON.stringify({ name: "ui" }));
		expect(Result.isFailure(result)).toBe(true);
	});

	it("fails when a repo is missing a field", () => {
		const result = decodeRepoList(JSON.stringify([{ name: "ui", isArchived: false }]));
		expect(Result.isFailure(result)).toBe(true);
	});

	it("fails when a field has the wrong type", () => {
		const result = decodeRepoList(JSON.stringify([{ name: "ui", sshUrl: 42, isArchived: false }]));
		expect(Result.isFailure(result)).toBe(true);
	});
});
