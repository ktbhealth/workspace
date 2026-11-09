# ktbhealth workspace

Metarepo for the [ktbhealth](https://github.com/ktbhealth) GitHub org.
This repo tracks the org-level docs, agent guidance, and scripts that
manage every org repository cloned under `repos/`.

`repos/` is gitignored — each entry is an independent clone with its
own history, branches, and remotes. No submodules.

## Bootstrap

```bash
gh auth login              # needs gh + ssh access to github.com/ktbhealth
./script/clone             # clone every org repo into repos/
```

Open `ktbhealth.code-workspace` in VSCode/Windsurf for the full org
(regenerate with `./script/workspace` after cloning new repos).

## Repo map

| repo | what it is |
|---|---|
| `repos/product` | KTB Health app — main monorepo (bun, TanStack Start on Cloudflare) |
| `repos/ui` | `@ktbhealth/ui` design system — Tailwind v4 tokens + React/Vue component libs |
| `repos/storybook` | Component catalog for `ui` (`bun run dev` → :3100) |
| `repos/project` | myco ledger — proposals, ADRs, tasks across all org repos |
| `repos/website-draft` | Marketing site — TanStack Start SSR on Cloudflare, Paraglide i18n |
| `repos/presentation-draft` | Slidev deck for the HackBrasil talk (pt-BR) |
| `repos/slidev-theme-ktb` | `@ktbhealth/slidev-theme-ktb` — Slidev theme matching product tokens |
| `repos/.github` | Org profile README + community health files |

## Scripts

- `./script/clone` — clone missing org repos (discovers via `gh repo list ktbhealth`)
- `./script/update` — `git pull --ff-only` in every clone
- `./script/status` — branch / dirty / ahead-behind matrix
- `./script/workspace` — regenerate `ktbhealth.code-workspace` from local clones

The repo list is auto-discovered — every non-archived repo in the org
gets cloned. Archive a repo on GitHub to exclude it.

## Conventions

See [AGENTS.md](AGENTS.md) — org map and cross-repo rules for coding
agents. Each repo under `repos/` also has its own `AGENTS.md`; read it
before working inside that repo.
