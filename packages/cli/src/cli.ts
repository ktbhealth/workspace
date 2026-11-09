import { Command } from "effect/cli";

import { cloneCommand } from "./commands/clone.ts";
import { codeWorkspaceGenerateCommand } from "./commands/code-workspace.ts";
import { initCommand } from "./commands/init.ts";
import { statusCommand } from "./commands/status.ts";
import { updateCommand } from "./commands/update.ts";

export const cli = Command.make("ktbw").pipe(
	Command.withDescription("Manage ktbhealth org repo clones under repos/"),
	Command.withSubcommands([
		initCommand,
		cloneCommand,
		updateCommand,
		statusCommand,
		codeWorkspaceGenerateCommand,
	]),
);
