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

## Lint plugin packages

`packages/eslint-plugin-*` are standalone [Oxlint JS
plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) — one per
architecture rule, no shared dependencies. Each builds to `dist/` via
`vp pack` (`bun run build`) and is consumed through the root `exports`
map, e.g. `@ktbhealth/workspace/eslint-plugin-no-hardcoded-colors` —
which maps to plugin id `arch-colors` and rule
`arch-colors/no-hardcoded-colors`:

| package                               | plugin id              | rule                    |
| ------------------------------------- | ---------------------- | ----------------------- |
| `eslint-plugin-no-hardcoded-colors`   | `arch-colors`          | `no-hardcoded-colors`   |
| `eslint-plugin-provider-lockin`       | `arch-provider`        | `provider-lockin`       |
| `eslint-plugin-package-boundary`      | `arch-boundary`        | `package-boundary`      |
| `eslint-plugin-tenant-scope`          | `arch-tenant`          | `tenant-scope`          |
| `eslint-plugin-plugin-contract`       | `arch-plugin-contract` | `plugin-contract`       |
| `eslint-plugin-plugin-route-gate`     | `arch-route-gate`      | `plugin-route-gate`     |
| `eslint-plugin-plugin-api-route-gate` | `arch-api-route-gate`  | `plugin-api-route-gate` |
| `eslint-plugin-client-contract`       | `arch-client`          | `client-contract`       |
| `eslint-plugin-driver-contract`       | `arch-driver`          | `driver-contract`       |

Enable per-glob in a consumer's `vite.config.ts` via `lint.jsPlugins` +
`lint.overrides` — see each package's README for the exact config.
