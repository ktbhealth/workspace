# ktbhealth workspace

Metarepo for the [ktbhealth](https://github.com/ktbhealth) GitHub org —
a Vite+ / bun monorepo whose `ktbw` CLI manages every org repository
cloned under `repos/`.

`repos/` is gitignored — each entry is an independent clone with its
own history, branches, and remotes. No submodules.
`ktbhealth.code-workspace` is also generated, not committed — `ktbw
init` (or `code-workspace:generate`) writes it.

## Layout

| path                       | what                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `repos/`                   | all org clones (gitignored)                                                                                          |
| `packages/core`            | `@ktbhealth/workspace-core` — pure logic: gh JSON decoding, workspace-file generation, git status parsing/formatting |
| `packages/cli`             | `@ktbhealth/workspace-cli` — `ktbw` CLI (`effect/cli` + `effect/process` + `effect/schema`, Node platform services)  |
| `ktbhealth.code-workspace` | VSCode multi-root workspace — generated at runtime, gitignored                                                       |

## Bootstrap

```bash
bun install
bun run ktbw init      # clone every org repo into repos/ + generate the workspace file
```

Open `ktbhealth.code-workspace` in VSCode/Windsurf for the full org.

## CLI

`ktbw` is also published as a bin (`bunx ktbw …` after `bun install`):

- `ktbw init` — bootstrap: clone missing org repos + generate `ktbhealth.code-workspace`
- `ktbw clone` — clone missing org repos (discovers via `gh repo list ktbhealth`)
- `ktbw update` — `git pull --ff-only` in every clone
- `ktbw status` — branch / dirty / ahead-behind matrix
- `ktbw code-workspace:generate` — regenerate `ktbhealth.code-workspace` from local clones (`workspace` alias)

All commands accept `--root <dir>` (defaults to the metarepo root).

The repo list is auto-discovered — every non-archived repo in the org
gets cloned. Archive a repo on GitHub to exclude it.

## Development

```bash
bun run check       # vp check — fmt + lint + typecheck
bun run test        # vp test — vitest, 100% coverage gate (unit + integration + e2e)
bun run typecheck   # tsrs --noEmit per package
bun run lint        # vp lint
bun run format      # vp fmt
```

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
