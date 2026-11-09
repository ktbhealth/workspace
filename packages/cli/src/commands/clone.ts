import { Console, Effect, FileSystem } from "effect";
import { Command } from "effect/cli";
import { ChildProcess } from "effect/process";

import {
	exec,
	listOrgRepos,
	refreshWorkspaceFile,
	repoDir,
	reposDir,
	rootFlag,
} from "../platform.ts";

export const cloneCommand = Command.make("clone", { root: rootFlag }, (config) =>
	Effect.gen(function* () {
		const orgRepos = yield* listOrgRepos();
		const fs = yield* FileSystem.FileSystem;
		const dir = reposDir(config.root);
		yield* fs.makeDirectory(dir, { recursive: true });

		let cloned = 0;
		let skipped = 0;
		for (const repo of orgRepos) {
			const target = repoDir(config.root, repo.name);
			// fs.exists throws ENOTDIR when an intermediate path is a file —
			// treat probe failures as "absent" so a stray file just warns.
			const exists = (path: string) => fs.exists(path).pipe(Effect.orElseSucceed(() => false));
			if (yield* exists(`${target}/.git`)) {
				yield* Console.log(`skip    ${repo.name} (already cloned)`);
				skipped += 1;
			} else if (yield* exists(target)) {
				yield* Console.warn(`warn    ${repo.name} exists but is not a git repo — leaving it alone`);
			} else {
				yield* exec(
					`git clone ${repo.sshUrl}`,
					ChildProcess.make("git", ["clone", repo.sshUrl, target]),
				);
				yield* Console.log(`cloned  ${repo.name}`);
				cloned += 1;
			}
		}
		yield* Console.log(`done: ${cloned} cloned, ${skipped} already present`);
		yield* refreshWorkspaceFile(config.root);
	}),
).pipe(Command.withDescription("Clone all ktbhealth org repos into repos/"));
