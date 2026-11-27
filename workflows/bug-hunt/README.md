# bug-hunt

Deep bug sweep over a repo — one slice per run: a sepia agent audits
the slice for real bugs, then per confirmed finding a second agent
applies a minimal fix that must pass scoped verification before a
`bug-hunt/*` branch is pushed and a PR opened. The installed
[`pr-review`](../pr-review/) bundle then reviews, verifies green, and
squash-merges it — bug-hunt never merges anything itself.

A tamias-installable peregrin campaign bundle — the ktbhealth
counterpart of a scheduled audit sweep. Unlike `pr-review` there is
no webhook: runs are **manual** (`peregrin campaign run` /
`campaign submit`), one slice per run, cursor round-robining through
the slice manifest so repeated runs cover the whole repo.

## Flow

```
start → pick (next un-audited slice) → fetch → worktree.add
  (audit-current @ base_ref) → audit.prompt → audit.run (sepia)
  → audit.gate → findings.ready | findings.none | findings.failed

findings.ready → fix.pick (next eligible finding)
  → wt.rm → wt.add (fix-current @ base_ref) → fix.prompt
  → fix.run (sepia) → fix.gate (dirty-tree check)
  → verify (bun install + vp check <changed> + per-package vitest
     + playwright e2e when paths match) → commit → push
  → ship (forge pr create) → pr.opened → fix.cleanup → fixdone
  → fix.pick (loop until backlog exhausted or run cap hit)

slicedone / findings.none → finish → run.done
```

## Requirements

- Same driver floor as pr-review: peregrin with `driver: ops`,
  tamias serving `cli.*`/`sessions.*` ops, `tamias-driver-sepia`
  with `sessions.run`, `sepia-agent-sandbox` on PATH (the
  `SEPIA_AGENT_DEVIN_COMMAND` env is keyed on `agent: devin` — change
  both together for other agents).
- `lasius` new enough for `cli.vcs.*` + `cli.forge.pr.create`.
- `gh` auth for `lasius forge` — `GITHUB_TOKEN` secret (declared in
  `capabilities.secrets`).
- The forge identity that opens PRs must be a **trusted author** in
  pr-review (`trusted_actors`/`trusted_team`) or the PRs will be
  skipped by the review guard.
- `bun`, `jq`, `git`, `playwright` browsers (only when e2e triggers).

## Running a sweep

```bash
# whole bundle as installed (after tamias install + deploy config):
peregrin campaign submit --bundle bug-hunt

# or straight from the repo, overriding config per run:
peregrin campaign run workflows/bug-hunt/main.yaml \
  --config '{"checkout":"/home/luis/GitHub/ktbhealth/repos/product"}'
```

`campaign run` executes locally and prints the event log; `submit`
returns `{run_id, log}` — poll with `peregrin campaign status|events`.
Each run processes **one slice** (audit + up to
`max_fixes_per_run` findings). Re-run to continue the round-robin.

## State (under `worktree_base`, default `~/.local/share/bug-hunt/worktrees`)

| path | what |
| ---- | ---- |
| `cursor` | last picked slice id (round-robin position) |
| `current-slice` / `current-finding.json` | in-flight slice / finding (branch, attempts, run token) |
| `run-token` | per-run id bounding `max_fixes_per_run` |
| `audited/<slice>` | stamp file — mtime drives `rescan_days` skip |
| `slices/<slice>.findings.json` | durable findings ledger (dedupe, status, attempts, pr#) |
| `audit-current/`, `fix-current/` | disposable worktrees at `base_ref` |
| `sessions/{audit,fix}` | sepia session ids for cleanup |
| `cleanup-ledger.jsonl` | session/worktree cleanup outcomes (reconcile retries) |

Finding statuses: `pending` → `picked` (attempts++) → `shipped`
(PR opened) or `failed` (attempts exhausted → terminal). A `picked`
finding whose run token doesn't match the current run becomes
eligible again — dead runs don't strand findings.

## Verify contract (per finding, inside `fix-current`)

1. `bun install --frozen-lockfile`
2. `<verify_cmd> <changed files>` — default `bunx vp check` (fmt +
   lint + typecheck scoped to the agent-reported
   `.bughunt/changed.txt`, falling back to the finding's path, then
   `git status`)
3. `bunx vitest run` in every touched dir containing
   `vitest.config.*`
4. e2e: `e2e_mode=auto` runs `e2e_cmd` from `apps/web` when a changed
   file matches `e2e_path_prefixes`

Only then: `lasius vcs commit` → `vcs push HEAD:refs/heads/<branch>`
→ `forge pr create` (never draft — pr-review skips drafts).

## Safety model

- **Audit is read-only** — the audit prompt forbids source edits;
  findings are data (`.bughunt/findings.json`, validated as a JSON
  array before merging).
- **Dedupe ledger** — findings keyed `path:line:title-slug`; old
  entries win, capped by `max_findings_per_slice` (severity-sorted).
- **Attempt budget** — `max_fix_attempts` per finding across runs;
  `max_fixes_per_run` per run; both durable.
- **Verify-before-ship** — nothing pushes without green scoped
  checks; GitHub CI + pr-review remain the authoritative gate.
- **Honest no-op** — an agent that finds the finding invalid writes
  an empty `changed.txt`; the dirty-tree gate emits `fix.nodiff`
  and the finding is marked failed rather than shipping an empty
  commit (`vcs commit` has no `--allow-empty`).
- **Loop safety** — `max_fires` caps + per-run token + attempt
  budgets; slices re-audited only after `rescan_days`.
- **Cleanup** — every terminal path removes its worktree; sessions
  deleted on shipped paths, retained 7d otherwise
  (`cleanup-ledger.jsonl`, same reconcile story as pr-review).

## Caveats

- **Unsuffixed event types** — the `start` trigger carries no
  payload, so slice/finding identity lives in files, not event-type
  suffixes. One slice + one finding in flight per run makes this
  safe; observability is per-node in the run log.
- **`git -C` exceptions** — `fix.gate`'s dirty check and the verify
  fallback use read-only `git status`; `commit` uses `rm -rf
  .bughunt` (agent bookkeeping must not ship). No forge/history
  mutation outside lasius.
- **Worktree base drift** — fix worktrees cut from `base_ref` at
  pick time; a moved base surfaces as a PR conflict for pr-review's
  `merge.conflict` path, not silent corruption.
- **`bun run check` on the whole repo can OOM** on memory-tight
  hosts (tsgolint) — that's why verify is *scoped* to changed files
  and `verify_cmd` is configurable.
- **Sessions bypass the peregrin node registry** — same caveat as
  pr-review (sepia plane, `sepia list` to inspect).

## Ops

- Run logs: `tamias logs bug-hunt` / history JSONL under
  `~/.local/share/peregrin/serve-history/` (or `--history` on
  `campaign run`).
- Force a specific slice: `campaign submit --config
  '{"slices":"<only-this-slice>"}'` or delete
  `<worktree_base>/audited/*` to reset the rescan window; delete
  `<worktree_base>/cursor` to restart rotation.
- Reset a slice's findings: delete
  `<worktree_base>/slices/<slice>.findings.json`.
- Stuck worktrees: `<worktree_base>/{audit,fix}-current` — removed
  automatically on every terminal path and gc'd at pick; manual gc:
  `lasius --root <ws> vcs worktree remove <checkout> --dir <path>`.
