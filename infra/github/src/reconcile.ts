/**
 * Reconcile unmanaged org repos against the managed list in repos.ts.
 *
 * Standalone script — no Pulumi runtime, no build step:
 *   bun run reconcile        (from infra/github/)
 *
 * Requires the `gh` CLI authenticated with repo admin on the org.
 *
 * For every repo in the ktbhealth org that is NOT in REPOS it applies
 * the baseline merge policy (squash-only, no merge/rebase commits) via
 * `gh api -X PATCH` and exits 1, printing which repos need a human
 * decision: either codify them in src/repos.ts or accept the baseline.
 */
import { execFileSync } from "node:child_process";
import { MANAGED_REPO_NAMES } from "./repos.ts";

const ORG = "ktbhealth";

const ghApi = (args: string[]): string =>
	execFileSync("gh", ["api", ...args], { encoding: "utf8" });

const listOrgRepos = (): string[] => {
	const out = ghApi([`orgs/${ORG}/repos`, "--paginate", "--jq", ".[].name"]);
	return out
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
};

const main = (): number => {
	const managed = new Set(MANAGED_REPO_NAMES);
	const orgRepos = listOrgRepos();
	const unmanaged = orgRepos.filter((name) => !managed.has(name));

	if (unmanaged.length === 0) {
		console.log(`All ${orgRepos.length} org repos are managed by infra/github.`);
		return 0;
	}

	for (const name of unmanaged) {
		console.log(`unmanaged repo ${ORG}/${name} — applying baseline squash-only policy`);
		ghApi([
			"-X",
			"PATCH",
			`repos/${ORG}/${name}`,
			"-F",
			"allow_squash_merge=true",
			"-F",
			"allow_merge_commit=false",
			"-F",
			"allow_rebase_merge=false",
		]);
	}

	console.error(
		`\n${unmanaged.length} unmanaged repo(s): ${unmanaged.join(", ")}\n` +
			"Decide per repo: add to infra/github/src/repos.ts (managed) or leave on the baseline.\n" +
			"This script will keep patching them on every CI run until then.",
	);
	return 1;
};

process.exit(main());
