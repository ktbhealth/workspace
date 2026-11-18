# pr-review

Pull request → sepia agent review + adjustments → push → verified-green
checks → campaign-driven squash merge.

A tamias-installable peregrin campaign bundle — the ktbhealth
counterpart of 9aia's `pr-heal`. When a pull request is opened or
updated, an agent session (sepia — `devin` by default) gets a detached
worktree at the PR head, reviews the diff against the base branch,
applies the adjustments that are actually needed, and leaves the tree
dirty; the campaign commits and pushes through lasius. GitHub
`check_run`/`check_suite`/`status` webhook deliveries then drive the
merge: once an open PR's *current* head sha has every check green on
`lasius forge pr checks`, the campaign squash-merges through lasius
forge.

Unlike `pr-heal` there is no bupha on this org — CI completion arrives
as ordinary forge webhook deliveries and the merge gate is the live
check rollup, not a `ci.job.completed` inject.

## Boundaries

| concern | owner |
| --- | --- |
| git / forge (worktree, commit, push, PR, merge, checks) | lasius |
| agent session (create, prompt, mode) | sepia |
| orchestration, routing, policy | peregrin |
| webhook verification + event normalization | peregrin `github-webhook` driver |
| distribution, shims, services | tamias |

No raw `git`/`gh`/`devin` anywhere in `main.yaml`.

## Opting a repo in

1. **Webhook secret** — put the repo's webhook HMAC secret in the
   campaign env as `BUPHA_WH_<OWNER>_<REPO>` (uppercased, `-` → `_`),
   e.g. `BUPHA_WH_KTBHEALTH_PRODUCT` in `~/.config/peregrin/env`.

2. **GitHub webhook** — register a webhook on the repo pointing at the
   shared listener's public URL (`https://tamias.luisfuturist.com/hook`
   on this deployment) with events `pull_request`, `check_run`,
   `check_suite`, and `status` — those are the only deliveries this
   campaign consumes.

3. **Configure + install** — `tamias install --allow-drivers
   <path-to-bundle>` then `tamias deploy`. Deploy renders
   `~/.config/peregrin/serve/pr-review.yaml`, which `include:`s the
   bundle's `main.yaml` and carries a `config:` block — the loader
   deep-merges it over the bundle defaults (outer keys win). Set the
   per-deployment values there:

   | key | required | meaning |
   | --- | --- | --- |
   | `repo` | yes | `owner/name` watched repo |
   | `webhook_secret_env` | yes | env var name holding the HMAC |
   | `checkout` | yes | local clone lasius operates on |
   | `agent` / `agent_mode` | no | sepia agent id + ACP mode (`bypass` default — see below) |
   | `max_review_attempts` | no | per-PR review cap (default 2, durable ledger) |
   | `verify_cmd` | no | check the agent must leave passing (default `bun run check`) |
   | `merge_method` | no | `lasius forge pr merge --method` (default `squash`) |
   | `worktree_base`, `node_url`, `lasius_root` | no | paths/URLs |

   If the webhook secret env var isn't in `~/.config/peregrin/env`,
   also add its name under `capabilities.secrets` in the same file
   (the dict deep-merges too). Then
   `systemctl --user restart peregrin-campaign` — every
   peregrin-bundle renders into that one shared service.

   > `tamias deploy` **regenerates** this file — re-apply the config
   > block after every deploy/uninstall cycle.

4. **Agent auth** — the sepia agent (devin) must be authenticated on
   the host; sessions run unattended.

## Safety model

- **Verified-sha merge** — merge only fires when an open PR's *current*
  `head_sha` equals the sha that produced the CI signal. Stale signals
  find no PR and skip.
- **All-checks-green gate** — `lasius forge pr checks` must report a
  non-empty rollup where every check's verdict is
  `SUCCESS`/`NEUTRAL`/`SKIPPED`; pending or failed blocks
  (`merge.waiting`, retried by the next check delivery).
- **No merge under a live review** — while the per-sha agent lock is
  held, the merge node waits: the head is about to move.
- **Fork PRs skipped** — the local clone can't fetch fork objects
  through lasius; fork deliveries emit `worktree.skipped`.
- **Per-PR review ledger** — `<worktree_base>/attempts/pr-<n>-reviews`
  counts agent runs per PR (default cap 2); over-cap emits
  `attempts.gaveup` and leaves the PR for a human. The merge path is
  unaffected — CI green still merges.
- **Per-sha agent lock** — duplicate `pull_request` deliveries for one
  sha can't start parallel agents.
- **`agent_mode` is required** — unattended turns cannot answer ACP
  `session/request_permission`; devin's default `accept-edits` prompts
  on exec and deadlocks. `bypass` auto-approves everything (fine in a
  disposable worktree); `smart` is the safer middle ground.
- **No-empty-commit honesty** — an agent that finds nothing to change
  fails `vcs commit` (no `--allow-empty`) → `push.failed`, chain
  stops; the in-flight CI still reaches the merge gate.
- **Merge conflicts are reported, not healed** — an unmergeable PR
  emits `merge.conflict` terminally. Pair with a conflict-healing
  workflow (or resolve by hand) — the review pass itself may reduce
  how often this happens.

## Loop behavior

The agent's push triggers `synchronize` → a second review of its own
adjustments (the prompt tells it to no-op on its own `review:`
commits). Bounded by `max_review_attempts`; each round that produces a
diff retriggers CI, and the merge gate only fires on the live head.

## Ops

- Run logs: `tamias logs pr-review` / campaign history JSONL under
  `~/.local/share/peregrin/serve-history/pr-review.jsonl`.
- Worktrees: `<worktree_base>/<sha12>` — removed automatically after a
  successful push and on give-up; kept on failures for inspection
  (`lasius --root <ws> vcs worktree remove <checkout> --dir <path>`
  to gc manually).
- PR map: `<worktree_base>/prs/<sha>` holds `number`, head `ref`,
  `base_ref` for each signalled sha.
- Attempt ledgers: `<worktree_base>/attempts/pr-<n>-reviews` — delete
  the file to reset that PR's review budget.
- Agent locks: `<worktree_base>/<sha12>.agent-lock` — stale locks are
  removed by cleanup nodes; delete manually if a run died mid-flight
  (it also blocks merges for that sha until removed).
