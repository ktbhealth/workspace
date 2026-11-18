/**
 * Desired state for every ktbhealth org repository.
 *
 * Explicit list — NOT auto-discovered — so adding a repo to the org is a
 * deliberate act: either add it here (managed by Pulumi) or let
 * `bun run reconcile` apply the baseline merge policy and warn.
 *
 * Single source of truth: consumed by both the Pulumi program
 * (repos.ts resources) and src/reconcile.ts.
 *
 * Current-state notes (verified via `gh api`):
 * - All repos currently allow squash + merge + rebase; this codifies the
 *   org decision (myco T-054): squash-only going forward.
 * - website-draft and presentation-draft are currently PRIVATE. They are
 *   declared `public` on purpose: branch rulesets on private repos
 *   require GitHub Pro, and the org policy is to protect `main` on every
 *   repo. The private→public flip is intentional.
 * - has_issues/has_wiki/has_projects are pinned to their current values
 *   so `pulumi import` produces no drift; only the fields below are
 *   policy, everything else is left to GitHub defaults.
 */
export interface RepoSpec {
  readonly name: string;
  readonly hasIssues: boolean;
  readonly hasWiki: boolean;
  readonly hasProjects: boolean;
}

export const REPOS: readonly RepoSpec[] = [
  { name: "product", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "ui", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "storybook", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "project", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "docs", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "slidev-theme-ktb", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: ".github", hasIssues: true, hasWiki: true, hasProjects: true },
  { name: "workspace", hasIssues: true, hasWiki: true, hasProjects: true },
  // Currently private — flipped public intentionally (see header).
  { name: "website-draft", hasIssues: true, hasWiki: false, hasProjects: true },
  { name: "presentation-draft", hasIssues: true, hasWiki: false, hasProjects: true },
];

export const MANAGED_REPO_NAMES: readonly string[] = REPOS.map((repo) => repo.name);
