import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import * as NodePath from "@effect/platform-node/NodePath";
import { Effect, Layer, PlatformError, Sink, Stdio, Stream, Terminal } from "effect";
import { Command } from "effect/cli";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import { describe, expect, it } from "vitest";

import { cli } from "../../src/cli.ts";

interface FakeReply {
	readonly stdout: string;
	readonly stderr: string;
	readonly exitCode: number;
}

const encoder = new TextEncoder();

const fakeHandle = (reply: FakeReply) =>
	ChildProcessSpawner.makeHandle({
		pid: ChildProcessSpawner.ProcessId(1),
		exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(reply.exitCode)),
		isRunning: Effect.succeed(false),
		kill: () => Effect.void,
		stdin: Sink.drain,
		stdout: Stream.make(encoder.encode(reply.stdout)),
		stderr: Stream.make(encoder.encode(reply.stderr)),
		all: Stream.make(encoder.encode(reply.stdout + reply.stderr)),
		getInputFd: () => Sink.drain,
		getOutputFd: () => Stream.empty,
		unref: Effect.die("unused"),
	});

const commandText = (command: ChildProcess.Command): string => {
	const c = command as unknown as { command: string; args: ReadonlyArray<unknown> };
	return [c.command, ...c.args.map(String)].join(" ");
};

const terminalLayer = Layer.succeed(
	Terminal.Terminal,
	Terminal.make({
		columns: Effect.succeed(80),
		rows: Effect.succeed(24),
		size: Effect.die("unused"),
		readInput: Effect.die("unused"),
		readLine: Effect.die("unused"),
		display: () => Effect.void,
	}),
);

const makeLayer = (spawner: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>) =>
	Layer.mergeAll(NodeFileSystem.layer, NodePath.layer, Stdio.layerTest({}), terminalLayer, spawner);

const spawnerFor = (respond: (command: ChildProcess.Command) => FakeReply) =>
	Layer.succeed(
		ChildProcessSpawner.ChildProcessSpawner,
		ChildProcessSpawner.make((command) => Effect.succeed(fakeHandle(respond(command)))),
	);

const run = (
	args: ReadonlyArray<string>,
	spawner: Layer.Layer<ChildProcessSpawner.ChildProcessSpawner>,
): Promise<void> =>
	Effect.runPromise(
		Command.runWith(cli, { version: "test" })(args).pipe(Effect.provide(makeLayer(spawner))),
	);

const runWith = (
	args: ReadonlyArray<string>,
	respond: (command: ChildProcess.Command) => FakeReply,
): Promise<void> => run(args, spawnerFor(respond));

const makeRoot = (): string => mkdtempSync(join(tmpdir(), "ktbw-"));

const addGitRepo = (root: string, name: string): void => {
	mkdirSync(join(root, "repos", name, ".git"), { recursive: true });
};

const ghJson = (repos: ReadonlyArray<Record<string, unknown>>): string => JSON.stringify(repos);

const ok = (stdout = ""): FakeReply => ({ stdout, stderr: "", exitCode: 0 });

describe("clone", () => {
	it("clones missing repos and regenerates the workspace file", async () => {
		const root = makeRoot();
		const calls: Array<string> = [];
		await runWith(["clone", "--root", root], (command) => {
			const text = commandText(command);
			calls.push(text);
			if (text.startsWith("gh repo list")) {
				return ok(
					ghJson([
						{ name: "beta", sshUrl: "git@github.com:ktbhealth/beta.git", isArchived: false },
						{ name: "old", sshUrl: "git@github.com:ktbhealth/old.git", isArchived: true },
						{ name: "alpha", sshUrl: "git@github.com:ktbhealth/alpha.git", isArchived: false },
					]),
				);
			}
			// simulate a successful clone by creating the target .git dir
			const target = text.split(" ").at(-1) ?? "";
			mkdirSync(join(target, ".git"), { recursive: true });
			return ok("Cloning into 'x'...\n");
		});

		expect(calls.filter((c) => c.startsWith("git clone"))).toHaveLength(2);
		expect(existsSync(join(root, "repos", "alpha", ".git"))).toBe(true);
		expect(existsSync(join(root, "repos", "beta", ".git"))).toBe(true);

		const workspace = JSON.parse(readFileSync(join(root, "ktbhealth.code-workspace"), "utf8"));
		expect(workspace.folders.map((f: { name: string }) => f.name)).toEqual([
			"ktbhealth",
			"alpha",
			"beta",
		]);
	});

	it("skips existing clones and warns on non-git directories", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		mkdirSync(join(root, "repos", "gamma"), { recursive: true });
		const calls: Array<string> = [];
		await runWith(["clone", "--root", root], (command) => {
			const text = commandText(command);
			calls.push(text);
			return ok(
				ghJson([
					{ name: "alpha", sshUrl: "u", isArchived: false },
					{ name: "gamma", sshUrl: "u", isArchived: false },
				]),
			);
		});
		expect(calls.filter((c) => c.startsWith("git clone"))).toHaveLength(0);
	});

	it("fails when gh exits non-zero", async () => {
		const root = makeRoot();
		await expect(
			runWith(["clone", "--root", root], () => ({
				stdout: "boom",
				stderr: "",
				exitCode: 1,
			})),
		).rejects.toThrow("gh repo list failed with exit code 1: boom");
	});

	it("fails when gh output is not valid repo JSON", async () => {
		const root = makeRoot();
		await expect(runWith(["clone", "--root", root], () => ok("garbage"))).rejects.toThrow(
			"could not parse gh repo list output",
		);
	});
});

describe("update", () => {
	it("pulls every clone and succeeds when all are up to date", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		addGitRepo(root, "beta");
		writeFileSync(join(root, "repos", "notes.txt"), "not a repo\n");
		const calls: Array<string> = [];
		await runWith(["update", "--root", root], (command) => {
			calls.push(commandText(command));
			return ok("Already up to date.\n");
		});
		expect(calls).toHaveLength(2);
		expect(calls.every((c) => c.includes("pull --ff-only"))).toBe(true);
	});

	it("reports failures and exits non-zero", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		addGitRepo(root, "beta");
		addGitRepo(root, "gamma");
		await expect(
			runWith(["update", "--root", root], (command) => {
				const text = commandText(command);
				if (text.includes("/beta ")) {
					return { stdout: "", stderr: "diverged from upstream\n", exitCode: 1 };
				}
				if (text.includes("/gamma ")) {
					return { stdout: "fatal: no upstream\n", stderr: "", exitCode: 1 };
				}
				return ok("Already up to date.\n");
			}),
		).rejects.toThrow("2 repo(s) failed to update");
	});
});

describe("status", () => {
	it("prints a status table for every clone", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		const calls: Array<string> = [];
		await runWith(["status", "--root", root], (command) => {
			calls.push(commandText(command));
			return ok("# branch.head main\n# branch.ab +0 -0\n");
		});
		expect(calls[0]).toContain("status --porcelain=v2 --branch");
	});

	it("fails when git status fails", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		await expect(
			runWith(["status", "--root", root], () => ({
				stdout: "",
				stderr: "fatal: not a git repository",
				exitCode: 128,
			})),
		).rejects.toThrow("git status alpha failed with exit code 128");
	});
});

describe("workspace", () => {
	it("writes the workspace file for local clones", async () => {
		const root = makeRoot();
		addGitRepo(root, "beta");
		addGitRepo(root, "alpha");
		await runWith(["workspace", "--root", root], () => ok(""));
		const workspace = JSON.parse(readFileSync(join(root, "ktbhealth.code-workspace"), "utf8"));
		expect(workspace.folders.map((f: { name: string }) => f.name)).toEqual([
			"ktbhealth",
			"alpha",
			"beta",
		]);
	});

	it("writes a root-only workspace when repos/ does not exist", async () => {
		const root = makeRoot();
		await runWith(["workspace", "--root", root], () => ok(""));
		const workspace = JSON.parse(readFileSync(join(root, "ktbhealth.code-workspace"), "utf8"));
		expect(workspace.folders).toEqual([{ name: "ktbhealth", path: "." }]);
	});
});

describe("spawn failures", () => {
	it("wraps spawn PlatformErrors with the command label", async () => {
		const root = makeRoot();
		addGitRepo(root, "alpha");
		const failingSpawner = Layer.succeed(
			ChildProcessSpawner.ChildProcessSpawner,
			ChildProcessSpawner.make(() =>
				Effect.fail(
					PlatformError.badArgument({ module: "test", method: "spawn", description: "nope" }),
				),
			),
		);
		await expect(run(["status", "--root", root], failingSpawner)).rejects.toThrow(
			"git status alpha:",
		);
	});
});
