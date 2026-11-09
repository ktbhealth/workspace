import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { ChildProcess } from "effect/process";
import { formatStatusTable, parseGitStatus, type StatusRow } from "@ktbhealth/workspace-core";

import { exec, listLocalRepos, repoDir, rootFlag } from "../platform.ts";

export const statusCommand = Command.make("status", { root: rootFlag }, (config) =>
	Effect.gen(function* () {
		const names = yield* listLocalRepos(config.root);
		const rows: Array<StatusRow> = [];
		for (const name of names) {
			const result = yield* exec(
				`git status ${name}`,
				ChildProcess.make("git", [
					"-C",
					repoDir(config.root, name),
					"status",
					"--porcelain=v2",
					"--branch",
				]),
			);
			rows.push({ name, status: parseGitStatus(result.stdout) });
		}
		yield* Console.log(formatStatusTable(rows));
	}),
).pipe(Command.withDescription("Show branch / dirty / sync status for every clone"));
