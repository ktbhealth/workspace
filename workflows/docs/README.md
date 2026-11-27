# docs

Keeps the **hand-written** documentation on `ktbhealth/docs` in sync
with `ktbhealth/product` after every merge to `main`. A sepia agent
reviews product@`origin/main` (read-only) and updates the MDX under
`content/docs/{en,pt-BR}/` — commands, routes, env vars, feature
descriptions, UI behavior — then the campaign commits, pushes
`docs/sync-<sha>`, and opens a PR for human review.

Companion to [`erd-docs/`](../erd-docs/): that bundle owns **generated**
content (ERD/schema pages via `bun run db:erd`); this one owns prose.
The agent is forbidden from touching generated files (`reference/`
dirs, `*.mmd`, `*.gen.*`, `src/paraglide/`, `routeTree.gen.ts`,
anything marked generated) — the pipelines never overlap.

## Flow

`pull_request` (`closed`) → guard: repo + `base_ref` match, then
`lasius forge pr view` verifies `state == "merged"` (the normalized
webhook payload carries **no** `merged` bit — `closed` also fires for
unmerged closes) → global `.sync-lock` → run state `run-<sha>/pr.json`
→ fetch product `main` (`git fetch` + `rev-parse FETCH_HEAD`, fetch-only
raw-git exception) + `lasius vcs fetch` on the docs clone → detached
worktree at docs `origin/main` → sepia `sessions.run` (agent edits,
never commits) → gate (`stopReason`/`timedOut`, releases lock) →
publish: clean tree → `docs.clean.<sha>` no-op; dirty → `lasius vcs
commit` → `push HEAD:refs/heads/docs/sync-<sha12>` → `lasius forge pr
create` → worktree remove → cleanup (lock, worktree, session).

## Bundle-specifics

- **Cumulative, not per-merge** — each run syncs docs to product main
  HEAD, so one run covers every merge since the last sync. The
  `supersede` key is the constant `docs-sync` (deliberately NOT `{sha}`):
  under `campaign serve` a burst of merges collapses to the newest
  *pending* run, which still covers the evicted ones. Keying per-sha
  would queue one ~30 min agent run per merge for zero extra coverage.
  `cancel_running: false` — an in-flight turn always finishes.
- **Lock trade-off, honestly** — `.sync-lock` is belt-and-suspenders
  for non-queue invocations; queued triggers serialize on the single
  run slot anyway. A merge whose run is *evicted* by a newer pending
  sync is covered by it (main HEAD includes it). The residual gap: if
  the docs PR from a run is still **open** when the next sync runs, the
  next agent starts from docs `origin/main` without the unmerged PR's
  changes and may produce a duplicate PR — merge or close the older
  one first. And if a merge is the *last ever* while a sync is in
  flight, its content lands in the next sync whenever that happens —
  there is no timer fallback; docs can lag until the next product
  merge (or a manual `campaign run`).
- **Auth** — webhook HMAC via `webhook_secret_env` (BUPHA_WH_*);
  `lasius forge` calls use the `GITHUB_TOKEN` secret (needs
  `pull-requests:write` + `contents:write` on `ktbhealth/docs`). Git
  transport is the clones' own ssh remotes — the campaign service env
  must reach ssh-agent/gh credentials, same requirement pr-review
  already has for `lasius vcs fetch`. The only raw-git calls are
  fetch-only (`git -C <product> fetch origin <base>` + `rev-parse
  FETCH_HEAD`) and read-only status/diff in publish — fetch mutates
  `.git`, never the user's worktree.
- **Agent sandbox** — `SEPIA_AGENT_DEVIN_COMMAND` wraps the agent in
  bubblewrap: whole fs read-only except the docs worktree (rw) and
  agent state dirs; `~/.bun` is an overlay so `bun install` works but
  cache writes are discarded. The product checkout stays read-only —
  exactly what the prompt demands. `SEPIA_AGENT_DEVIN_COMMAND` is
  keyed to `config.agent: devin`; change both together.
- **Verification** — the agent must leave `bun install` +
  `bun run types:check` (and `bun run build` if feasible) passing in
  the worktree; the campaign itself runs no checks — review happens
  on the opened PR.
- **Failures** — non-zero exits emit `docs.failed.<sha>` /
  `docs.agent.failed.<sha>`; cleanup releases the lock, removes the
  worktree, deletes the sepia session, and appends to
  `cleanup-ledger.jsonl`. A publish failure *after* push can leave a
  remote `docs/sync-<sha>` branch without a PR — harmless; the next
  sync uses a different sha. Recovery is the next merge or a manual
  `peregrin campaign run`.

## Install

Same as every bundle — see [`../README.md`](../README.md): secrets in
`~/.config/peregrin/env`, webhook on `ktbhealth/product` → shared
listener (`pull_request` → `closed`), `tamias install --allow-drivers`
+ `tamias deploy`, set REQUIRED `config:` keys in the rendered serve
yaml, restart `peregrin-campaign`.

For this deployment:

- `repo: ktbhealth/product`
- `webhook_secret_env: BUPHA_WH_KTBHEALTH_PRODUCT` (verify against the
  other product bundles' rendered configs)
- `checkout: <path to the ktbhealth/docs clone>` (e.g.
  `/home/luis/GitHub/ktbhealth/repos/docs`)
- `product_checkout: <path to the ktbhealth/product clone>` (e.g.
  `/home/luis/GitHub/ktbhealth/repos/product`)
