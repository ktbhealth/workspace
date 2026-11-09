# ktbhealth workspace

Metarepo for the [ktbhealth](https://github.com/ktbhealth) GitHub org —
this repo is **config only**. All cloning, syncing, and workspace-file
generation is done by [lasius](https://github.com/9aia/lasius), the
generic workspace gardener.

`repos/` is gitignored — each entry is an independent clone with its
own history, branches, and remotes. No submodules.
`ktbhealth.code-workspace` is generated at runtime, never committed.

## Config

Everything lives in [`lasius.toml`](lasius.toml):

```toml
org = "ktbhealth"
exclude = ["workspace"]   # the metarepo itself is not a member
```

Repo discovery is automatic — every non-archived repo in the org gets
cloned. Archive a repo on GitHub to exclude it; add a glob to `exclude`
for finer control.

## Bootstrap

```bash
# install lasius (until published: from source)
cargo install lasius
# or: cargo install --git https://github.com/9aia/lasius

lasius init      # clone every org repo into repos/ + generate the workspace file
```

Requires `git` and an authenticated `gh` on PATH.

Open `ktbhealth.code-workspace` in VSCode/Windsurf for the full org.

## Commands

```bash
lasius clone                     # clone missing org repos
lasius update                    # git pull --ff-only in every clone
lasius status                    # branch / dirty / ahead-behind matrix
lasius code-workspace generate   # regenerate ktbhealth.code-workspace
lasius doctor                    # env + drift diagnostics
lasius exec -- <cmd>             # run a command in every clone
lasius rm <repo>                 # remove a clone after safety checks
```

All accept `--root <dir>`; `lasius.toml` is discovered upward from the
current directory.

## Repo map

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

## Conventions

See [AGENTS.md](AGENTS.md) — org map and cross-repo rules for coding
agents. Each repo under `repos/` also has its own `AGENTS.md`; read it
before working inside that repo.
