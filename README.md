# ktbhealth workspace

Config-only metarepo for the [ktbhealth](https://github.com/ktbhealth) org.
[lasius](https://github.com/9aia/lasius) clones, syncs, and generates
`ktbhealth.code-workspace` from [`lasius.toml`](lasius.toml). `repos/`
is gitignored — every entry is an independent clone.

## Setup

```bash
cargo install lasius        # or: cargo install --git https://github.com/9aia/lasius
lasius init                 # clone all org repos + generate the workspace file
```

Requires `git` and an authenticated `gh`. Then open
`ktbhealth.code-workspace` in VSCode/Windsurf.

## Commands

```bash
lasius status                    # branch / dirty / sync matrix
lasius update                    # git pull --ff-only in every clone
lasius exec -- <cmd>             # run a command in every clone
lasius code-workspace generate   # regenerate the workspace file
lasius doctor                    # env + drift diagnostics
lasius rm <repo>                 # remove a clone after safety checks
```

All accept `--root <dir>`; `lasius.toml` is found upward from cwd.

## Repos

| repo                       | what it is                                                                    |
| -------------------------- | ----------------------------------------------------------------------------- |
| `repos/product`            | KTB Health app — main monorepo (bun, TanStack Start on Cloudflare)            |
| `repos/ui`                 | `@ktbhealth/ui` design system — Tailwind v4 tokens + React/Vue component libs |
| `repos/storybook`          | Component catalog for `ui` (`bun run dev` → :3100)                            |
| `repos/project`            | myco ledger — proposals, ADRs, tasks across all org repos                     |
| `repos/website-draft`      | Marketing site — TanStack Start SSR on Cloudflare, Paraglide i18n             |
| `repos/presentation-draft` | Slidev deck for the HackBrasil talk (pt-BR)                                   |
| `repos/slidev-theme-ktb`   | `@ktbhealth/slidev-theme-ktb` — Slidev theme matching product tokens          |
| `repos/.github`            | Org profile README + community health files                                   |

See [AGENTS.md](AGENTS.md) for org rules; each repo has its own `AGENTS.md`.
