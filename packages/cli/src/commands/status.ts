import { Console, Effect, Result } from "effect";
import { Command } from "effect/cli";
import { ChildProcess } from "effect/process";
import { formatStatusTable, parseGitStatus, type StatusRow } from "@ktbhealth/workspace-core";

import { capture, listLocalRepos, repoDir, rootFlag } from "../platform.ts";

export const statusCommand = Command.make("status", { root: rootFlag }, (config) =>
	Effect.gen(function* () {
		const names = yield* listLocalRepos(config.root);
		const rows: Array<StatusRow> = [];
		const failures: Array<string> = [];
		for (const name of names) {
			const result = yield* capture(
				ChildProcess.make("git", [
					"-C",
					repoDir(config.root, name),
					"status",
					"--porcelain=v2",
					"--branch",
				]),
			).pipe(
				Effect.mapError((error) => new Error(`git status ${name}: ${String(error)}`)),
				Effect.result,
			);
			if (Result.isFailure(result)) {
				const detail = String(result.failure);
				yield* Console.error(`ERR     ${name.padEnd(22)} ${detail}`);
				failures.push(`${name}: ${detail}`);
			} else if (result.success.exitCode === 0) {
				rows.push({ name, status: parseGitStatus(result.success.stdout) });
			} else {
				const detail = `git status ${name} failed with exit code ${
					result.success.exitCode
				}: ${result.success.stderr.trim() || result.success.stdout.trim()}`;
				yield* Console.error(`ERR     ${name.padEnd(22)} ${detail}`);
				failures.push(`${name}: ${detail}`);
			}
		}
		yield* Console.log(formatStatusTable(rows));
		if (failures.length > 0) {
			return yield* Effect.fail(
				new Error(`${failures.length} repo(s) failed status: ${failures.join("; ")}`),
			);
		}
	}),
).pipe(Command.withDescription("Show branch / dirty / sync status for every clone"));
