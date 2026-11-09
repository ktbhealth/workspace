#!/usr/bin/env bun
import { Effect } from "effect";
import { Command } from "effect/cli";
import * as NodeRuntime from "@effect/platform-node/NodeRuntime";
import * as NodeServices from "@effect/platform-node/NodeServices";

import { cli } from "../src/cli.ts";

NodeRuntime.runMain(
	Command.run(cli, { version: "0.1.0" }).pipe(Effect.provide(NodeServices.layer)),
);
