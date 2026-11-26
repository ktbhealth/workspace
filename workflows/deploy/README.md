# deploy

Push to a watched repo's deploy ref → detached worktree at the pushed
sha → dependency install + the service's own deploy command →
verdict commit status → **cooldown throttle**. Continuous deployment
as a tamias-installable peregrin campaign bundle — the ktbhealth
counterpart of 9aia's `docs-deploy`, generalized from a fixed
docs-branch pipeline to per-service deploy commands (the alchemy /
Cloudflare Workers services).

## Behavior

```
push (refs/heads/<deploy_ref>)
  → route      repo/ref gate + pending commit status
  → run        lasius fetch → worktree add @sha → install_cmd →
               deploy_cmd → verdict status → trap cleanup
  → cooldown   sleep cooldown_secs → run ends
```

**Throttle, not debounce.** The deploy fires immediately on push;
the run then parks in `cooldown` for `cooldown_secs` (default 900 =
15 min). Pushes arriving while a run is active — deploying *or*
cooling down — queue behind it, and `supersede` `latest-wins`
collapses every pending trigger for the repo to the newest push.
Net effect: **at most one deploy per service per cooldown window**,
and a burst of merges deploys only the latest sha.

`cancel_running: false` is deliberate:

- An in-flight `alchemy deploy` is never killed — a cancelled deploy
  can leave half-applied infra; alchemy deploys are idempotent, so
  letting it finish and letting the newest queued sha deploy next is
  strictly safer.
- The cooldown is never cut short — that is the throttle.

Failed deploys throttle too: `deploy.failed.*` feeds the same
cooldown node, so a broken deploy rate-limits retries instead of
hot-looping.

## Deploy auth — no injected secrets

The child env is sanitized (allowlist: `PATH`, `HOME`, locale, proxy
vars). That is sufficient because:

- `cuora run` resolves secrets through the host's tardigrada
  identity (`~/.config/cuora`) — `HOME` is passed, no
  `CUORA_CF_TOKEN` needed (verified with `cuora check`).
- `alchemy deploy` authenticates through its local profile under
  `$HOME` — same as a manual `bun run deploy`.
- `bun`/`cuora`/`lasius` are prepended onto `PATH` inside the run
  node (`~/.bun/bin`, `~/.local/bin`) since the service env's `PATH`
  may not carry them.

The only injected secret is `GITHUB_TOKEN` (for
`lasius forge status create` → `gh api`), resolved cuora-first like
pr-review.

## Opting a service in

One bundle install, N serve files — same pattern as `pr-review`.

1. **Webhook secret** — `BUPHA_WH_<OWNER>_<REPO>` (uppercased, `-` →
   `_`) in `~/.config/peregrin/env`, e.g.
   `BUPHA_WH_KTBHEALTH_PRODUCT`.

2. **GitHub webhook** — the repo's existing webhook (the one
   pr-review uses) must also deliver **`push`** events to
   `https://tamias.luisfuturist.com/hook`. Add `push` to its event
   set — one webhook serves every campaign watching the repo; the
   shared listener demuxes by `repository.full_name` and each
   campaign's `push_refs`/`repos:` filters keep the streams apart
   (pr-review never subscribes `push`, deploy never subscribes
   `pull_request`/`check_*`).

3. **Configure + install** — `tamias install --allow-drivers
   <path-to-bundle>` then `tamias deploy`. Deploy renders
   `~/.config/peregrin/serve/deploy.yaml`; copy it per service as
   `deploy-<service>.yaml` and set the per-deployment values:

   | key               | required | meaning                                             |
   | ----------------- | -------- | --------------------------------------------------- |
   | `repo`            | yes      | `owner/name` watched repo                           |
   | `webhook_secret_env` | yes   | env var name holding the HMAC                       |
   | `checkout`        | yes      | local clone path (`repos/<name>`)                   |
   | `deploy_cmd`      | yes      | command run at the worktree root                    |
   | `deploy_ref`      | no       | trigger ref (default `refs/heads/main`)             |
   | `install_cmd`     | no       | pre-deploy install (default bun frozen-lockfile)    |
   | `cooldown_secs`   | no       | throttle window (default 900; < 3660 node timeout)  |
   | `status_context`  | no       | commit-status context, e.g. `deploy/product`        |
   | `worktree_base`, `lasius_root` | no | paths (absolute — no `$HOME` expansion in params) |

   If the webhook secret env var isn't in `~/.config/peregrin/env`,
   add its name under `capabilities.secrets` there too. Then
   `systemctl --user restart peregrin-campaign` — every
   peregrin-bundle renders into that one shared service.

   > `tamias deploy` **regenerates** the serve file — re-apply the
   > config block after every deploy/uninstall cycle.

4. **Deploy auth on the host** — `cuora` identity and the `alchemy`
   profile must be usable from a systemd user service (they live
   under `$HOME`; `cuora check` + a trial `bun run deploy` inside a
   sanitized env is the smoke test).

### ktbhealth services

| serve file              | repo                  | deploy_cmd                          | status_context    |
| ----------------------- | --------------------- | ----------------------------------- | ----------------- |
| `deploy-product.yaml`   | `ktbhealth/product`   | `bun run build && bun run deploy`   | `deploy/product`  |
| `deploy-docs.yaml`      | `ktbhealth/docs`      | `bun run deploy` (self-builds)      | `deploy/docs`     |
| `deploy-website.yaml`   | `ktbhealth/website-draft` | `bun run build && bun run deploy` | `deploy/website`  |
| `deploy-storybook.yaml` | `ktbhealth/storybook` | `bun run build && bun run deploy`   | `deploy/storybook`|

Repos without a deploy path (`ui`, `slidev-theme-ktb`,
`presentation-draft`, `project`) get no deployment.

## Safety model

- **Verified-sha deploy** — the worktree checks out the exact pushed
  `after` sha; superseded pending triggers never run, so the deployed
  sha is always the newest push seen.
- **Never kills in-flight work** — `cancel_running: false`; deploys
  and cooldowns run to completion. Only *pending* triggers are
  replaced (latest-wins).
- **Worktree isolation** — deploys run in a detached lasius worktree
  under `worktree_base`, never in the operator's checkouts; the dir
  is removed by `trap cleanup EXIT` on every path (a dirty worktree
  lasius refuses to remove stays for inspection).
- **Deploy-then-throttle** — cooldown covers success AND failure, so
  retries are rate-limited too.
- **Status honesty** — the verdict status is posted inside the run
  node the moment the deploy settles; it is not delayed by the
  cooldown. Status posts are best-effort (`|| warn`) — a forge
  hiccup never blocks a deploy.
- **Ref pinning** — `push_refs` at the driver plus a defensive
  repo/ref re-check in the route node; tags, deletes (zero-sha
  `after`), and non-deploy refs are dropped before any work.

## Caveats

- **Cooldown holds the worker** — each run occupies its campaign's
  single run slot for deploy + `cooldown_secs`. That is the throttle;
  other services have their own serve files/supervisors and are
  unaffected. A service restart mid-cooldown loses the remaining
  wait (the durable queue keeps pending triggers; an in-flight run
  is reclaimed, not re-run).
- **Deploy-from-worktree cost** — every deploy pays `install_cmd`
  from scratch (bun's global cache keeps it fast). A persistent
  checkout would be faster but needs a checkout-sync verb lasius
  doesn't have; revisit if install time hurts.
- **Deploy cmds are per-service config** — the bundle ships no
  defaults; each serve file carries its repo's real build+deploy
  command. Verify `deploy_cmd` manually once before pointing live
  traffic at it.
- **Webhook `push` coverage** — deliveries only flow while the repo
  webhook lists `push`; merges via the GitHub UI, `gh pr merge`, and
  lasius forge all produce real push events.

## Ops

- Run logs: `tamias logs deploy` / history JSONL under
  `~/.local/share/peregrin/serve-history/deploy-<service>.jsonl`.
- Worktrees: `<worktree_base>/deploy-<repo>-<sha>` — auto-removed on
  every terminal path; gc manually with
  `lasius --root <ws> vcs worktree remove <checkout> --dir <path>`.
- Queue state: `<queue-store-dir>/deploy-<service>.db` (sqlite) —
  pending triggers survive restarts.
- Validate without installing:
  `peregrin campaign validate workflows/deploy/main.yaml`.
