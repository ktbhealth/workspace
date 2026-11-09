# ktbhealth workspace — agent guide

Metarepo root for the ktbhealth org. **Config only** — repo management
is delegated to [lasius](https://github.com/9aia/lasius) via
`lasius.toml`. All org repositories are cloned under `repos/`
(gitignored); each is an independent repo with its own `AGENTS.md` —
read it before working inside.

## Repo map

| repo                       | what it is                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `repos/product`            | **KTB Health app** — main monorepo (bun, TanStack Start on Cloudflare). Entry point for product work.                              |
| `repos/ui`                 | `@ktbhealth/ui` design system — Tailwind v4 tokens + React (`@react`) and Vue (`@vue`) component libs. Source of truth for all UI. |
| `repos/storybook`          | Component catalog for `ui`. Check existing stories before building UI (`bun run dev` → :3100).                                     |
| `repos/project`            | myco ledger — proposals, ADRs, tasks across all org repos. Org-wide board.                                                         |
| `repos/website-draft`      | Marketing site — TanStack Start SSR on Cloudflare, Paraglide i18n (en/pt-BR/es).                                                   |
| `repos/presentation-draft` | Slidev deck for the HackBrasil talk (pt-BR).                                                                                       |
| `repos/slidev-theme-ktb`   | `@ktbhealth/slidev-theme-ktb` — Slidev theme matching product design tokens.                                                       |
| `repos/.github`            | Org profile README + community health files.                                                                                       |

## Cross-repo rules

- Sibling clones live at `repos/<name>`; references like `../ui`
  inside a repo's docs resolve within `repos/`.
- `ui` is the single source of truth for UI — never copy/vendor
  components into consumers. Add in `ui`, tag `vX.Y.Z`, bump the
  git-tag dep (`github:ktbhealth/ui#vX.Y.Z@react`/`@vue`). Same rule
  for `slidev-theme-ktb` and any other `github:ktbhealth/*` dep.
- `project` is the org-wide myco ledger — for cross-repo work run
  `myco status --prompt` inside `repos/project`, track with
  `myco todo add` / `myco proposal new`, hand off with
  `myco handoff <ID>`. Never hand-edit `project/` files — myco verbs
  are the write path. (`repos/project/project` is the myco worktree
  on the orphan `project` branch — leave it alone.)
- English everywhere (code, comments, commit messages).
- Never edit `node_modules` or generated files (paraglide output,
  `routeTree.gen.ts`, drizzle migrations, `dist/`, `coverage/`).

## Workspace commands

Managed by [lasius](https://github.com/9aia/lasius) — `lasius.toml`
is the only config:

- `lasius init` — bootstrap: clone all missing org repos + generate
  `ktbhealth.code-workspace`
- `lasius update` — fast-forward pull every clone
- `lasius status` — branch / dirty / sync matrix (`--json` available)
- `lasius code-workspace generate` — regenerate the workspace file
- `lasius doctor` — env + drift diagnostics
- `lasius exec -- <cmd>` — run a command in every clone
- `lasius rm <repo>` — remove a clone after safety checks
- all accept `--root <dir>` (default: `lasius.toml` discovered upward)
