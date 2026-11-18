import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { REPOS } from "./repos.ts";

/**
 * Codifies the org's branch rulesets — 9 existing rulesets mirrored
 * exactly (verified via `gh api repos/ktbhealth/<repo>/rulesets`),
 * plus main-protected created fresh on the two repos that flip
 * public in this same program.
 * Per org decision (myco T-054) there is deliberately NO
 * pull_request_required rule: direct push stays allowed for all members;
 * these rulesets only block branch deletion, force-push, and (on
 * product) unreviewed path changes.
 *
 * website-draft and presentation-draft had NO rulesets while private
 * (free plan). This program flips them public (see repos.ts), so they
 * get the same main-protected ruleset as every other repo — org policy
 * is identical rules everywhere.
 *
 * KNOWN PROVIDER GAP: the product "guard quality-gate paths" ruleset has
 * GitHub-side parameters the @pulumi/github schema does not model
 * (`dismissal_restriction`, `require_extra_approval_for_unattributed_
 * changes`). `pulumi up` may drop those on update — re-check after the
 * first apply.
 */

/** Bypass actor shared by every main-protected ruleset: luisfuturist. */
const BYPASS_USER = { actorType: "User", actorId: 91754457, bypassMode: "always" } as const;

const repoName = (name: string): string => {
	const repo = REPOS.find((candidate) => candidate.name === name);
	if (!repo) {
		throw new Error(`rulesets.ts references unmanaged repo "${name}" — add it to repos.ts`);
	}
	return repo.name;
};

/**
 * "main-protected" — Rules: block branch deletion + non-fast-forward
 * (force-push) on the default branch. On all 10 repos: 8 imported
 * (existing rulesets — IDs in README), 2 created fresh here.
 */
const MAIN_PROTECTED_REPOS = [
	"product",
	"ui",
	"storybook",
	"project",
	"docs",
	"slidev-theme-ktb",
	".github",
	"workspace",
	"website-draft",
	"presentation-draft",
] as const;

/**
 * product "guard quality-gate paths" (ruleset id 27518534) — verbatim
 * codification of `gh api repos/ktbhealth/product/rulesets/27518534`.
 * Pull-request rule scoped to refs/heads/main with code-owner review;
 * bypass: team actor 20751573, always.
 */
export const registerRulesets = (opts: pulumi.ResourceOptions): void => {
	for (const name of MAIN_PROTECTED_REPOS) {
		new github.RepositoryRuleset(
			`ruleset-${name}-main-protected`,
			{
				repository: repoName(name),
				name: "main-protected",
				target: "branch",
				enforcement: "active",
				conditions: {
					refName: { includes: ["~DEFAULT_BRANCH"], excludes: [] },
				},
				rules: {
					deletion: true,
					nonFastForward: true,
				},
				bypassActors: [BYPASS_USER],
			},
			opts,
		);
	}

	new github.RepositoryRuleset(
		"ruleset-product-guard-quality-gate-paths",
		{
			repository: repoName("product"),
			name: "guard quality-gate paths",
			target: "branch",
			enforcement: "active",
			conditions: {
				refName: { includes: ["refs/heads/main"], excludes: [] },
			},
			rules: {
				pullRequest: {
					requiredApprovingReviewCount: 0,
					dismissStaleReviewsOnPush: false,
					requireCodeOwnerReview: true,
					requireLastPushApproval: false,
					requiredReviewThreadResolution: false,
					requiredReviewers: [],
					allowedMergeMethods: ["squash"],
				},
			},
			bypassActors: [{ actorType: "Team", actorId: 20751573, bypassMode: "always" }],
		},
		opts,
	);
};
