import { Console, Effect } from "effect";
import { Command } from "effect/cli";
import { ChildProcess } from "effect/process";

import { capture, lastLine, listLocalRepos, repoDir, rootFlag } from "../platform.ts";

export const updateCommand = Command.make("update", { root: rootFlag }, (config) =>
	Effect.gen(function* () {
		const names = yield* listLocalRepos(config.root);
		let failed = 0;
		for (const name of names) {
			const result = yield* capture(
				ChildProcess.make("git", ["-C", repoDir(config.root, name), "pull", "--ff-only"]),
			).pipe(Effect.mapError((error) => new Error(`git pull ${name}: ${String(error)}`)));
			if (result.exitCode === 0) {
				yield* Console.log(`ok      ${name.padEnd(22)} ${lastLine(result.stdout)}`);
			} else {
				yield* Console.log(
					`FAIL    ${name.padEnd(22)} ${result.stderr.trim() || result.stdout.trim()}`,
				);
				failed += 1;
			}
		}
		if (failed > 0) {
			return yield* Effect.fail(new Error(`${failed} repo(s) failed to update`));
		}
	}),
).pipe(Command.withDescription("Fast-forward pull every clone under repos/"));
