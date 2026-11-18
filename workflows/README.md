# workflows/

Peregrin campaign bundles for ktbhealth repos — event-driven
automation (agent sessions, CI gates, forge ops) installed via tamias.

| bundle | what it does |
| --- | --- |
| [`pr-review/`](pr-review/) | PR opened/updated → sepia agent reviews + adjusts → verified-green checks → squash merge |

## Bundle anatomy

Every bundle is a directory with the same four files:

| file | role |
| --- | --- |
| `main.yaml` | the campaign — nodes, drivers, event routing, `config:` knobs |
| `tamias.yaml` | bundle manifest (`type: peregrin-bundle`) + provider/service render spec |
| `params.schema.json` | operator-facing config schema (documents every `config:` key) |
| `README.md` | bundle-specifics only — behavior, safety model, ops. Generic install steps live HERE. |

## Installing a bundle

1. **Secrets** — names only; values resolve cuora-first
   (`cuora put cuora://peregrin/<NAME>`), with `~/.config/peregrin/env`
   as a fallback leg. Typical entries: `PEREGRIN_TOKEN` + a per-repo
   `BUPHA_WH_<OWNER>_<REPO>` webhook HMAC.
2. **Ingress** — if the bundle has a `github-webhook` node, register a
   GitHub webhook on the repo pointing at the shared listener's public
   URL (`https://tamias.luisfuturist.com/hook`) with the event types
   the bundle's ingress node emits.
3. **Install + deploy** — `tamias install --allow-drivers <bundle-dir>`
   then `tamias deploy`. Deploy renders
   `~/.config/peregrin/serve/<name>.yaml` (an `include:` of `main.yaml`
   plus a `config:` block deep-merged over the bundle defaults).
4. **Configure** — set the bundle's REQUIRED `config:` keys in that
   rendered file (`repo`, `webhook_secret_env`, `checkout`, … — each
   bundle's `params.schema.json` says which). If a secret name isn't
   in cuora yet, `cuora put` it and list it under
   `capabilities.secrets` in the bundle too.
5. **Restart** — `systemctl --user restart peregrin-campaign` (all
   peregrin bundles share the one service).

> `tamias deploy` **regenerates** the serve file — re-apply the
> `config:` block after every deploy/uninstall cycle.

## Boundaries

lasius owns git/forge calls · sepia owns agent sessions · peregrin
owns event routing · tamias owns distribution/services · bupha (9aia
org only) owns CI-job execution. No raw `git`/`gh`/agent CLIs in
`main.yaml` — git/forge goes through `lasius` (shell) or
`driver: ops` → `tamias serve` → `tamias-driver-*`; agent sessions go
through `driver: ops` → `sessions.*` on `tamias-driver-sepia` (the
node's `/api/sessions/run` remains for HTTP callers).

## Ops

- Run logs: `tamias logs <bundle>` / history JSONL under
  `~/.local/share/peregrin/serve-history/<bundle>.jsonl`.
- Validate a bundle without installing:
  `peregrin campaign validate workflows/<name>/main.yaml`.
- State dirs live under each bundle's `worktree_base` (default
  `~/.local/share/<name>/worktrees`) — worktrees, attempt ledgers,
  locks; safe to delete when idle.

## Adding a bundle

Copy an existing bundle's four-file shape, write `main.yaml` against
the driver contracts above, fill `params.schema.json`, keep the
README to bundle-specifics. Validate before committing.
