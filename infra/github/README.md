# infra/github — ktbhealth org GitHub policies

Pulumi (`@pulumi/github`) codifying org-level GitHub policy for
`github.com/ktbhealth` (myco T-054). Applied 2026-11-18 — stack `prod`
is converged (22 resources, zero drift on `pulumi preview`).

- **`src/repos.ts`** — explicit desired-state map for all 10 org repos:
  squash-only merge (`allow_merge_commit`/`allow_rebase_merge` off),
  `delete_branch_on_merge`, `visibility: "public"`.
  - **website-draft and presentation-draft were flipped private →
    public intentionally**: branch rulesets on private repos require
    GitHub Pro, and org policy is to protect `main` everywhere.
- **`src/rulesets.ts`** — branch rulesets: `main-protected` (deletion +
  non-fast-forward on default branch, bypass luisfuturist/always) on all
  10 repos, plus product's `guard quality-gate paths` (PR rule on
  `refs/heads/main`, squash-only merge methods). Direct push stays
  allowed — no PR-required gate (org decision, myco T-054).
- **Org webhook** — `github.OrganizationWebhook` →
  `https://ci.ktbhealth.workers.dev/` (the `ci` worker in
  `repos/product/infra/ci-hook`), events `repository` + `workflow_run`,
  `content_type: json`, secret from pulumi config
  `ktbhealth:githubWebhookSecret`. Toggle with
  `ktbhealth:manageOrgWebhook=false` if the token lacks `admin:org_hook`.
- **`src/reconcile.ts`** — `bun run reconcile` diffs `gh api
  orgs/ktbhealth/repos` against `REPOS`; unmanaged repos get the baseline
  squash-only policy patched in and the script exits 1 so CI flags them.

## Bootstrap

```sh
cd infra/github
bun install
```

State backend: Cloudflare R2 DIY backend (S3-compatible). **The live
stack currently sits on the local backend (`file://~`) as an interim** —
migrate once R2 S3 credentials exist:

```sh
export AWS_ACCESS_KEY_ID=...        # cuora://ktb/r2-access-key-id (pending)
export AWS_SECRET_ACCESS_KEY=...    # cuora://ktb/r2-secret-access-key (pending)
export AWS_REGION=auto
export PULUMI_BACKEND_URL="s3://ktbhealth-pulumi-state?endpoint=2c03574ae47e534415b762ab3c474815.r2.cloudflarestorage.com&s3ForcePathStyle=true&region=auto"
export PULUMI_CONFIG_PASSPHRASE=... # cuora://ktb/pulumi-passphrase
```

Migration path: `pulumi stack export > stack.json` → `pulumi login`
against the R2 backend → `pulumi stack init prod --secrets-provider
passphrase` → `pulumi stack import < stack.json`.

Or let cuora inject secrets: `cuora run --env prod -- pulumi preview`
(this directory has its own `cuora.toml`; the R2 key refs are declared
commented until minted — uncomment after `cuora put`).

```sh
pulumi stack init prod --secrets-provider passphrase   # local backend: bare name
pulumi config set github:owner ktbhealth
pulumi config set ktbhealth:githubWebhookSecret "$GITHUB_WEBHOOK_SECRET"
pulumi config set ktbhealth:manageOrgWebhook true   # false if token lacks admin:org_hook
```

GitHub auth: `GITHUB_TOKEN` env (token with `admin:org`, `repo`, and
`admin:org_hook` for the webhook) or `pulumi config set github:token`.
The org is pinned via `github:owner` config — there is deliberately no
explicit provider resource, because `pulumi import` binds resources to
the default provider.

## Import existing resources (one-time, already done)

Import BEFORE the first `pulumi up` so nothing is recreated. Type tokens
for this provider include the module path
(`github:index/repository:Repository`,
`github:index/repositoryRuleset:RepositoryRuleset`) — bare
`github:Repository` is rejected. Repo import IDs are bare names (org
pinned via `github:owner`); ruleset IDs are `<repo>:<rulesetId>`.

```sh
cd infra/github
for r in product ui storybook project docs slidev-theme-ktb .github workspace website-draft presentation-draft; do
  pulumi import github:index/repository:Repository "repo-$r" "$r"
done
# main-protected rulesets (IDs verified 2026-11-18):
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-product-main-protected            product:26884936
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-ui-main-protected                 ui:26884937
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-storybook-main-protected          storybook:26884939
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-project-main-protected            project:26884941
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-docs-main-protected               docs:27004564
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-slidev-theme-ktb-main-protected    slidev-theme-ktb:26884948
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-.github-main-protected            .github:26884950
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-workspace-main-protected          workspace:27004563
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-website-draft-main-protected      website-draft:26884943
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-presentation-draft-main-protected  presentation-draft:26884946
# product quality-gate ruleset:
pulumi import github:index/repositoryRuleset:RepositoryRuleset ruleset-product-guard-quality-gate-paths   product:27518534
```

Gotchas hit on first apply (kept for posterity):

- `pulumi import` fails with "unrecognized resource type (Read)" if the
  provider's `owner` config isn't set yet — set `github:owner` first.
- Ruleset creation raced the private→public flip on the first `up`:
  GitHub returned 403/"locked" but actually created the rulesets;
  second `up` then failed "Name must be unique". Fixed by importing the
  created rulesets (IDs above) — always re-check remote state after a
  failed create before retrying.
- `main-protected` on website-draft/presentation-draft was created by
  the first `up`, not imported — same end state.

Notes:

- The org webhook cannot be imported (listing org hooks needs
  `admin:org_hook`). If a webhook to `ci.ktbhealth.workers.dev` already
  exists, delete it in org settings or let Pulumi create a second one.
- Known provider gap: `guard quality-gate paths` has GitHub-side params
  the provider schema doesn't model (`dismissal_restriction`,
  `require_extra_approval_for_unattributed_changes`) — verify they
  survived the first `pulumi up` (rules diff was applied; spot-check in
  repo Settings → Rules).

## CI

`.github/workflows/github-policy.yml` (workspace repo) runs:

- `pulumi preview` on PRs touching `infra/github/**`
- `pulumi up --yes --skip-preview` + `bun run reconcile` on pushes to
  main, daily cron, and manual dispatch

Required secrets: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
`PULUMI_CONFIG_PASSPHRASE`, and a GitHub token. `GITHUB_TOKEN` (the
workflow default) lacks `admin:org`/`admin:org_hook` — store an org-admin
PAT as `GITHUB_ORG_TOKEN`; the workflow uses
`secrets.GITHUB_ORG_TOKEN || secrets.GITHUB_TOKEN`.

Stack name is bare `prod` (DIY backends don't have org-scoped stack
names) — same name after the R2 migration via `stack export`/`import`.
