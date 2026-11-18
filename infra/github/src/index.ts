import * as pulumi from "@pulumi/pulumi";
import * as github from "@pulumi/github";
import { REPOS } from "./repos.ts";
import { registerRulesets } from "./rulesets.ts";

/**
 * Pulumi program for ktbhealth org GitHub policies (myco T-054).
 *
 * Manages:
 * - github.Repository for every repo in REPOS (src/repos.ts): squash-only
 *   merge, delete-branch-on-merge, visibility public. Import existing
 *   repos first — see README for the `pulumi import` list.
 * - github.RepositoryRuleset resources codifying the existing
 *   "main-protected" / "guard quality-gate paths" rulesets
 *   (src/rulesets.ts).
 * - One github.OrganizationWebhook pointing at the CI receiver
 *   (repos/product/infra/ci-hook → https://ci.ktbhealth.workers.dev/),
 *   events ["repository", "workflow_run"], secret from pulumi config
 *   `ktbhealth:githubWebhookSecret`.
 *
 * Auth: a GitHub token with admin:org (+ admin:org_hook for the
 * webhook) via `GITHUB_TOKEN` env or `pulumi config set github:token`.
 * The current gh CLI token lacks admin:org_hook — set
 * `ktbhealth:manageOrgWebhook=false` to manage everything else, or
 * refresh the token with the scope.
 */

const config = new pulumi.Config("ktbhealth");

// No explicit provider resource: imports bind to the default provider,
// and the org is pinned via `github:owner` config / GITHUB_OWNER env.
for (const repo of REPOS) {
  new github.Repository(
    `repo-${repo.name}`,
    {
      name: repo.name,
      visibility: "public",
      allowSquashMerge: true,
      allowMergeCommit: false,
      allowRebaseMerge: false,
      deleteBranchOnMerge: true,
      hasIssues: repo.hasIssues,
      hasWiki: repo.hasWiki,
      hasProjects: repo.hasProjects,
    },
    {
      // Only the fields above are policy. Everything else on the repo
      // (description, homepageUrl, topics, …) is unmanaged — without
      // ignoreChanges Pulumi would null them out on update.
      ignoreChanges: ["description", "homepageUrl", "topics", "securityAndAnalysis"],
    },
  );
}

const manageOrgWebhook = config.getBoolean("manageOrgWebhook") ?? true;
registerRulesets({ protect: true });
if (manageOrgWebhook) {
  new github.OrganizationWebhook("org-webhook-ci", {
    active: true,
    events: ["repository", "workflow_run"],
    configuration: {
      url: "https://ci.ktbhealth.workers.dev/",
      contentType: "json",
      insecureSsl: false,
      secret: config.requireSecret("githubWebhookSecret"),
    },
  });
}
