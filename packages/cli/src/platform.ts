import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Effect, FileSystem, Result, Stream, type PlatformError } from "effect";
import { Flag } from "effect/cli";
import { ChildProcess, ChildProcessSpawner } from "effect/process";
import {
	buildWorkspaceFile,
	decodeRepoList,
	workspaceFileName,
	type Repo,
} from "@ktbhealth/workspace-core";

export const ORG = "ktbhealth";

/** Repo root — this file lives at packages/cli/src/platform.ts. */
export const defaultRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export const reposDir = (root: string): string => `${root}/repos`;
export const repoDir = (root: string, name: string): string => `${reposDir(root)}/${name}`;
export const workspaceFilePath = (root: string): string => `${root}/${workspaceFileName}`;

export const rootFlag = Flag.String("root").pipe(
	Flag.withDescription("Workspace root containing repos/"),
	Flag.withDefault(defaultRoot),
);

export const lastLine = (text: string): string => {
	const lines = text.trim().split("\n");
	return lines[lines.length - 1];
};

export interface CaptureResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

const collectText = (stream: Stream.Stream<Uint8Array, PlatformError.PlatformError>) =>
	Stream.mkString(Stream.decodeText(stream));

export const capture = (
	command: ChildProcess.Command,
): Effect.Effect<
	CaptureResult,
	PlatformError.PlatformError,
	ChildProcessSpawner.ChildProcessSpawner
> =>
	Effect.scoped(
		Effect.gen(function* () {
			const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
			const handle = yield* spawner.spawn(command);
			const [stdout, stderr, exitCode] = yield* Effect.all(
				[collectText(handle.stdout), collectText(handle.stderr), handle.exitCode],
				{ concurrency: "unbounded" },
			);
			return { exitCode: Number(exitCode), stdout, stderr };
		}),
	);

/**
 * Spawn a command and collect its output. Fails with an `Error` when the
 * process cannot be spawned or exits non-zero.
 */
export const exec = (
	label: string,
	command: ChildProcess.Command,
): Effect.Effect<CaptureResult, Error, ChildProcessSpawner.ChildProcessSpawner> =>
	capture(command).pipe(
		Effect.mapError((error) => new Error(`${label}: ${String(error)}`)),
		Effect.flatMap((result) =>
			result.exitCode === 0
				? Effect.succeed(result)
				: Effect.fail(
						new Error(
							`${label} failed with exit code ${result.exitCode}: ${
								result.stderr.trim() || result.stdout.trim()
							}`,
						),
					),
		),
	);

/** `gh repo list` for the org, decoded and sorted by name. */
export const listOrgRepos = (): Effect.Effect<
	ReadonlyArray<Repo>,
	Error,
	ChildProcessSpawner.ChildProcessSpawner
> =>
	exec(
		"gh repo list",
		ChildProcess.make("gh", [
			"repo",
			"list",
			ORG,
			"--limit",
			"200",
			"--json",
			"name,sshUrl,isArchived",
		]),
	).pipe(
		Effect.flatMap((result) => {
			const decoded = decodeRepoList(result.stdout);
			return Result.isFailure(decoded)
				? Effect.fail(new Error(`could not decode gh repo list output: ${String(decoded.failure)}`))
				: Effect.succeed(decoded.success);
		}),
	);

/** Names of git repos cloned under `<root>/repos/`, sorted. */
export const listLocalRepos = (
	root: string,
): Effect.Effect<ReadonlyArray<string>, PlatformError.PlatformError, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem;
		const dir = reposDir(root);
		if (!(yield* fs.exists(dir))) {
			return [];
		}
		const names: Array<string> = [];
		for (const entry of yield* fs.readDirectoryEntries(dir)) {
			if (entry.type !== "Directory") {
				continue;
			}
			if (yield* fs.exists(`${dir}/${entry.name}/.git`)) {
				names.push(entry.name);
			}
		}
		return names.sort((a, b) => a.localeCompare(b));
	});

export const writeWorkspaceFile = (
	root: string,
	repoNames: ReadonlyArray<string>,
): Effect.Effect<void, PlatformError.PlatformError, FileSystem.FileSystem> =>
	Effect.flatMap(FileSystem.FileSystem, (fs) =>
		fs.writeFileString(workspaceFilePath(root), buildWorkspaceFile(repoNames)),
	);

/** Regenerate the workspace file from whatever is currently cloned. */
export const refreshWorkspaceFile = (
	root: string,
): Effect.Effect<number, PlatformError.PlatformError, FileSystem.FileSystem> =>
	Effect.gen(function* () {
		const names = yield* listLocalRepos(root);
		yield* writeWorkspaceFile(root, names);
		return names.length;
	});
