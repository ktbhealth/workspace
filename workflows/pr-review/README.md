# pr-review

Pull request → sepia agent review + adjustments → push → verified-green
checks → campaign-driven squash merge.

A tamias-installable peregrin campaign bundle — the ktbhealth
counterpart of 9aia's `pr-heal`. When a pull request is opened or
updated, an agent session (sepia — `devin` by default, driven through
`tamias-driver-sepia`'s `sessions.*` ops queries) gets a detached
worktree at the PR head, reviews the diff against the base branch,
applies the adjustments that are actually needed, and leaves the tree
dirty; the campaign commits and pushes through lasius. GitHub
`check_run`/`check_suite`/`status` webhook deliveries then drive the
merge: once an open PR's _current_ head sha has every check green on
`lasius forge pr checks`, the campaign squash-merges through lasius
forge.

Unlike `pr-heal` there is no bupha on this org — CI completion arrives
as ordinary forge webhook deliveries and the merge gate is the live
check rollup, not a `ci.job.completed` inject.

## Requirements

- **peregrin ≥ the `driver: ops` merge** — the worktree/commit/agent
  nodes use `driver: ops` (peregrin main `d27ca7b` or later; not yet
  in a tamias release). Older peregrin builds reject the bundle.
- **tamias ≥ `662daeb`** — each ops node spawns `tamias serve` and
  sends one `driver.query`; the serve must know the `driver.*` ops.
- **`tamias-driver-sepia` ≥ 9aia/sepia `3e65c524`** — the agent nodes
  query `sessions.create`/`sessions.set_mode`/`sessions.prompt_wait`
  on its ops manifest; older drivers answer `unknown query`.
- **`sepia` engine resolvable by the driver** — `tamias-driver-sepia`
  spawns `sepia serve` per query (a sibling `sepia` binary, `$SEPIA_BIN`,
  `sepiaBin` param, or its own `run serve` fallback). The installed
  `sepia`/`tamias-driver-sepia` binaries must be refreshed after the
  sepia bump (`cargo xtask install` / `cargo xtask pack` +
  `tamias install --allow-drivers ./libraries/sepia`) — a stale
  driver binary silently lacks the `sessions.*` queries.
- **`tamias` on the campaign service's PATH** — ops nodes spawn
  `tamias serve` (default `serve_argv`); same PATH requirement the
  shell nodes already have for `lasius`/`jq`.
- `lasius` new enough to serve the `cli.vcs.*` ops manifest queries
  (`vcs.fetch`, `vcs.worktree.add/remove`, `vcs.commit`).

## Boundaries

| concern                                                 | owner                                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| git / forge (worktree, commit, push, PR, merge, checks) | lasius                                                                                      |
| agent session (create, prompt_wait, set_mode)           | sepia — via `sessions.*` ops queries, NOT the node's `/api/sessions/run` (see caveat below) |
| orchestration, routing, policy                          | peregrin                                                                                    |
| webhook verification + event normalization              | peregrin `github-webhook` driver                                                            |
| distribution, shims, services                           | tamias                                                                                      |

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

   | key                            | required | meaning                                                              |
   | ------------------------------ | -------- | -------------------------------------------------------------------- |
   | `repo`                         | yes      | `owner/name` watched repo                                            |
   | `webhook_secret_env`           | yes      | env var name holding the HMAC                                        |
   | `checkout`                     | yes      | local clone lasius operates on                                       |
   | `agent` / `agent_mode`         | no       | sepia agent id + ACP mode (`bypass` default — see below)             |
   | `max_review_attempts`          | no       | per-PR review cap (default 2, durable ledger)                        |
   | `verify_cmd`                   | no       | check the agent must leave passing (default `bun run check`)         |
   | `merge_method`                 | no       | `lasius forge pr merge --method` (default `squash`)                  |
   | `worktree_base`, `lasius_root` | no       | paths (must be absolute — ops params get no shell `$HOME` expansion) |

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

- **Verified-sha merge** — merge only fires when an open PR's _current_
  `head_sha` equals the sha that produced the CI signal. Stale signals
  find no PR and skip.
- **Push-after-merge guard** — before pushing, the push node re-lists
  open PRs and requires one whose `head_sha` still matches; a PR merged
  (or head moved) while the agent ran emits `push.skipped` instead of
  orphaning a commit on a dead branch.
- **CI pre-filter** — `ci.route` drops check/status deliveries whose sha
  isn't any open PR's head (`ci.ignored`, one `forge pr list` per event,
  fails open on forge errors), so main-branch CI never reaches the merge
  node as `merge.skipped` noise.
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

## Caveats

- **Sessions bypass the peregrin node registry** — the agent chain
  calls `tamias serve` → `tamias-driver-sepia` → `sepia serve`
  directly, so review sessions live purely in sepia's plane. They do
  not appear in `peregrin serve` session tooling and carry no
  PEREGRIN_TOKEN auth (the ops wire is localhost `tamias serve`).
- **Blocking turn** — `sessions.prompt_wait` blocks up to 29 min
  (`timeoutMs` 1740000, under tamias serve's 30 min `driver.query`
  clamp); a timed-out turn is cancelled by sepia and fails the
  `agent.gate` node honestly (`agent.failed`).
- **Prompt transport** — the assembled prompt rides event payloads
  (`echo: ["stdout"]`), not files: the prep node's stdout IS the
  prompt. `${file()}`/`${shell()}` template functions can't substitute
  (literal args only, no nested `${}`), which is why prompt assembly
  stays a shell node.

## Loop behavior

The agent's push triggers `synchronize` → a second review of its own
adjustments (the prompt tells it to no-op on its own `review:`
commits). Bounded by `max_review_attempts`; each round that produces a
diff retriggers CI, and the merge gate only fires on the live head.

## Ops

- Run logs: `tamias logs pr-review` / campaign history JSONL under
  `~/.local/share/peregrin/serve-history/pr-review.jsonl`.
- Worktrees: `<worktree_base>/<sha>` (full head sha) — removed
  automatically on every terminal path (pushed, gaveup, agent/push
  failure) along with the agent session (`devin-gc --cwd`); a dirty
  worktree that `lasius` refuses to remove stays for inspection
  (`lasius --root <ws> vcs worktree remove <checkout> --dir <path>`
  to gc manually).
- PR map: `<worktree_base>/prs/<sha>` holds `number`, head `ref`,
  `base_ref` for each signalled sha.
- Attempt ledgers: `<worktree_base>/attempts/pr-<n>-reviews` — delete
  the file to reset that PR's review budget.
- Agent locks: `<worktree_base>/<sha>.agent-lock` — stale locks are
  removed by cleanup nodes; delete manually if a run died mid-flight
  (it also blocks merges for that sha until removed).
- Sepia sessions: review sessions are ordinary sepia sessions —
  inspect with `sepia list` / the tamias-driver-sepia views; they are
  NOT registered on the peregrin node. Every terminal path deletes the
  session with the worktree (`devin-gc --cwd`); a plain `devin-gc`
  sweep collects anything left behind.
