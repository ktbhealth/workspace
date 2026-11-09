import { Console, Effect } from "effect";
import { Command } from "effect/cli";

import { listLocalRepos, rootFlag, workspaceFilePath, writeWorkspaceFile } from "../platform.ts";

export const workspaceCommand = Command.make("workspace", { root: rootFlag }, (config) =>
	Effect.gen(function* () {
		const names = yield* listLocalRepos(config.root);
		yield* writeWorkspaceFile(config.root, names);
		yield* Console.log(`wrote ${workspaceFilePath(config.root)} (${names.length} repo folders)`);
	}),
).pipe(Command.withDescription("Regenerate ktbhealth.code-workspace from local clones"));
