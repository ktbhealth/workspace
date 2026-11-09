import { Command } from "effect/cli";

import { cloneCommand } from "./commands/clone.ts";
import { statusCommand } from "./commands/status.ts";
import { updateCommand } from "./commands/update.ts";
import { workspaceCommand } from "./commands/workspace.ts";

export const cli = Command.make("ktbw").pipe(
	Command.withDescription("Manage ktbhealth org repo clones under repos/"),
	Command.withSubcommands([cloneCommand, updateCommand, statusCommand, workspaceCommand]),
);
