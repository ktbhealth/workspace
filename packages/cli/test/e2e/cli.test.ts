import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../../bin/ktbw.ts", import.meta.url));

const run = (args: ReadonlyArray<string>, env: NodeJS.ProcessEnv = {}) =>
	spawnSync("bun", [bin, ...args], {
		encoding: "utf8",
		env: { ...process.env, ...env },
		timeout: 30_000,
	});

const makeRoot = (): string => mkdtempSync(join(tmpdir(), "ktbw-e2e-"));

/** Create a real git repo with one commit so `git clone` has something to fetch. */
const makeGitRepo = (path: string): void => {
	mkdirSync(path, { recursive: true });
	spawnSync("git", ["init", "-b", "main", path]);
	spawnSync("git", [
		"-C",
		path,
		"-c",
		"user.email=t@t",
		"-c",
		"user.name=t",
		"commit",
		"--allow-empty",
		"-m",
		"init",
	]);
};

/** Install a fake `gh` that serves a fixed repo list. */
const fakeGh = (dir: string, repos: ReadonlyArray<{ name: string; path: string }>): string => {
	const binDir = join(dir, "bin");
	mkdirSync(binDir, { recursive: true });
	const payload = JSON.stringify(
		repos.map((r) => ({ name: r.name, sshUrl: `file://${r.path}`, isArchived: false })),
	);
	writeFileSync(join(binDir, "gh"), `#!/bin/sh\necho '${payload}'\n`);
	chmodSync(join(binDir, "gh"), 0o755);
	return `${binDir}:${process.env.PATH}`;
};

describe("ktbw e2e", () => {
	it("clone → status → update → workspace against real git repos", () => {
		const base = makeRoot();
		const root = join(base, "ws");
		const orgDir = join(base, "org");
		makeGitRepo(join(orgDir, "alpha"));
		makeGitRepo(join(orgDir, "beta"));
		const pathEnv = fakeGh(base, [
			{ name: "alpha", path: join(orgDir, "alpha") },
			{ name: "beta", path: join(orgDir, "beta") },
		]);
		const env = { PATH: pathEnv };

		const clone = run(["clone", "--root", root], env);
		expect(clone.status).toBe(0);
		expect(clone.stdout).toContain("cloned  alpha");
		expect(clone.stdout).toContain("cloned  beta");
		expect(existsSync(join(root, "repos", "alpha", ".git"))).toBe(true);

		const status = run(["status", "--root", root], env);
		expect(status.status).toBe(0);
		expect(status.stdout).toContain("alpha");
		expect(status.stdout).toContain("main");

		const update = run(["update", "--root", root], env);
		expect(update.status).toBe(0);
		expect(update.stdout).toContain("ok      alpha");

		const workspace = run(["code-workspace:generate", "--root", root], env);
		expect(workspace.status).toBe(0);
		const parsed = JSON.parse(readFileSync(join(root, "ktbhealth.code-workspace"), "utf8"));
		expect(parsed.folders.map((f: { name: string }) => f.name)).toEqual([
			"ktbhealth",
			"alpha",
			"beta",
		]);
	});

	it("clone is idempotent — second run skips everything", () => {
		const base = makeRoot();
		const root = join(base, "ws");
		const orgDir = join(base, "org");
		makeGitRepo(join(orgDir, "alpha"));
		const env = { PATH: fakeGh(base, [{ name: "alpha", path: join(orgDir, "alpha") }]) };

		expect(run(["clone", "--root", root], env).status).toBe(0);
		const second = run(["clone", "--root", root], env);
		expect(second.status).toBe(0);
		expect(second.stdout).toContain("skip    alpha (already cloned)");
	});

	it("exits non-zero when gh fails", () => {
		const base = makeRoot();
		const root = join(base, "ws");
		const binDir = join(base, "bin");
		mkdirSync(binDir, { recursive: true });
		writeFileSync(join(binDir, "gh"), "#!/bin/sh\nexit 1\n");
		chmodSync(join(binDir, "gh"), 0o755);

		const result = run(["clone", "--root", root], { PATH: `${binDir}:${process.env.PATH}` });
		expect(result.status).not.toBe(0);
	});
});
