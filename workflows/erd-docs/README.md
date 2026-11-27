# erd-docs

Regenerates the plugin ERD docs on every product PR and pushes them to a
same-named branch on `ktbhealth/docs` — the producer half of product's
`erd` CI check (which fails on stale docs and already looks for a
docs branch matching the PR head ref).

## Flow

`pull_request` (opened / synchronize / reopened / ready_for_review) →
guard (repo match, fork skip, per-sha run state) → regen:

1. fresh `product` clone (`--filter=blob:none`, token header on every
   git call) checked out at `pull/<n>/head`
2. fresh `docs` clone
3. `bun install --frozen-lockfile && bun run db:erd`
4. docs tree dirty → `checkout -B <head_ref>` (fork `owner:` prefix and
   `refs/heads/` stripped), commit, `push origin HEAD:refs/heads/<branch>`
   via a scoped git credential helper + `GITHUB_TOKEN`
5. clean tree → `erd-docs.clean.<sha>` no-op

Everything lives in throwaway clones under `worktree_base` — the
bundle never touches `repos/product` or `repos/docs` checkouts.

## Bundle-specifics

- **No lasius/sepia** — the work is one deterministic script; shell
  nodes end to end. The docs push is a raw `git push` because
  `lasius forge` has no docs-branch verb (PR/status verbs only).
- **Auth** — webhook HMAC via `webhook_secret_env` (BUPHA_WH_*); the
  docs clone/push reuses the `GITHUB_TOKEN` secret (scoped
  credential helper — `http.extraHeader` conflicts with the host's
  `gh auth git-credential` helper; token never in URLs or `.git/config`). The token needs `contents:write`
  on `ktbhealth/docs` — if the shared forge token is product-scoped,
  mint a docs-capable one under the same secret name.
- **Drafts included** — the `erd` check runs on drafts; regenerating
  early means `ready_for_review` arrives with docs already fresh.
- **Forks skipped** — docs branches mirror trusted-repo refs only.
- **Failures** — non-zero exits emit `erd-docs.failed.<sha>`; the run
  dir (`run-<sha>/pr.txt`) is kept, the worktree is always removed.
  Recovery is automatic: the next `synchronize`/manual re-run retries.

## Install

Same as every bundle — see [`../README.md`](../README.md): secrets in
`~/.config/peregrin/env`, webhook on the repo → shared listener,
`tamias install --allow-drivers` + `tamias deploy`, set REQUIRED
`config:` keys in the rendered serve yaml, restart
`peregrin-campaign`.

For product: `repo: ktbhealth/product`,
`webhook_secret_env: BUPHA_WH_KTBHEALTH_PRODUCT` (verify the exact
name against the other product bundles' rendered configs).
