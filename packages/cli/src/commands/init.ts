import { Command } from "effect/cli";

import { rootFlag } from "../platform.ts";
import { cloneAll } from "./clone.ts";

export const initCommand = Command.make("init", { root: rootFlag }, cloneAll).pipe(
	Command.withDescription(
		"Bootstrap the workspace: clone all org repos and generate ktbhealth.code-workspace",
	),
);
