# One World

_(placeholder name — the real name lives in `data/world.json` → `name`,
change it anytime; nothing else needs to change)_

A lifelong, ever-expanding world-building map: a zoomable fictional-world
atlas with names, icons, regions, routes, lore, and history, built up over
years. Plain-text data in Git — GeoJSON, Markdown, JSON — no database, no
backend, deployed as a static site on GitHub Pages.

> **Status:** Milestones 1–5 (Foundation, Map core, Info layer, Depth,
> Tooling) — a real MapLibre viewer with two switchable themes, info
> panel, lore rendering with wiki links, search, a browse view, a
> nested city map with breadcrumbs, a timeline, a measure tool,
> chronicle/about pages, the full set of editing/geometry helper
> scripts, `.claude/commands/` slash commands, and a small tagged-
> `sample` seed world (2 people, 2 factions, 3 events, a nested city
> map). Only the hardening pass (M6 — accessibility, mobile, perf,
> final docs) is still ahead. See `docs/PROGRESS.md` for exactly what's
> built.

## How this is used

The day-to-day workflow is: open [Claude Code](https://claude.com/claude-code)
in this repo and describe what to add, edit, or delete in plain language
("add a port city at the mouth of the Silverrun", "rename the Ashen
Empire to..."). Each session may be months apart with no memory of the
last one — **`CLAUDE.md`** is what makes that work; read it first if
you're a human making changes too, since it documents the actual editing
rules (ID stability, field ownership, consistency duty, destructive-change
confirmation, etc.).

## Quick start

Requires Node 24+ (see `.nvmrc`) and npm.

```bash
# bash / macOS / Linux / WSL
npm install
npm run dev
```

```powershell
# PowerShell / Windows
npm install
npm run dev
```

Other scripts (same on every platform):

```
npm run build          # typecheck + production build to dist/
npm run test            # unit tests (Vitest)
npm run validate        # schema + cross-reference + canonical-format checks
npm run format:data     # canonically reformat data/**/*.json, data/**/*.geojson
npm run lint             # ESLint
npm run format           # Prettier, for code (not data/lore — see .prettierignore)
```

## Adding content

Open [Claude Code](https://claude.com/claude-code) in this repo and
describe what to add, edit, or delete in plain language — the slash
commands in `.claude/commands/` (`/add-place`, `/add-region`,
`/add-route`, `/add-lore`, `/add-event`, `/edit`, `/delete`,
`/new-map`, `/check-world`, `/chronicle`, `/suggest`) cover the common
requests end to end, using the helper scripts under `npm run <name>
-- --help` (`find`, `show`, `where`, `offset`, `measure`, `shape`,
`add`, `move`, `delete`, `rename-id`, `new-map`, `new-layer`,
`new-type`, `snapshot`, `export`, `clear-sample`) to look things up,
compute geometry, write canonically-formatted files, and verify the
result with a real screenshot before calling anything done. See
`CLAUDE.md` for the full editing rules (ID stability, field ownership,
consistency duty, destructive-change confirmation).

## Deploying

GitHub Actions (`.github/workflows/ci.yml`) builds and deploys to
GitHub Pages automatically on every push to `main`, after typecheck/
lint/test/validate/build all pass. **One manual, one-time step**: in
the repo's GitHub settings, **Settings → Pages → Source: GitHub
Actions**. After that, pushing to `main` is the whole deploy process —
no separate deploy command to run.

## Backup / restore

`npm run export` writes a timestamped JSON bundle and a `.zip` of
`data/`, `lore/`, and original `assets/` to the gitignored `backups/`
folder — a quick copy to keep elsewhere, not a substitute for Git
history. Every change is already preserved in Git regardless —
`git log`/`git revert` work today for recovering anything, and nothing
here ever force-pushes or rewrites history.

## Starting your own world

Everything under the `sample` tag is placeholder seed content meant to
be replaced. Run `npm run clear-sample` to see exactly what that
removes, or `npm run clear-sample -- --yes` to actually clear it —
before writing real content, see "Top things to decide first" below.

## Top things to decide first

Everything below works with sensible placeholders — nothing is
blocked on these, but they're the things most worth Payton's own
decision before (or instead of) asking Claude Code to guess:

1. **The world's actual name** — `data/world.json` → `name` (currently
   the literal placeholder `"One World"`).
2. **Calendar names** — month names, weekday names, era labels
   (`data/world.json` → `calendar`; currently `"Month 1"`, `"Day 1"`,
   `"AE"`/`"BE"`).
3. **Theme colors/fonts** — `data/themes/atlas.json` /
   `parchment.json` are fully data-driven; restyle either (or add a
   third) with no code change.
4. **Content license** — `CONTENT-LICENSE.md` currently defaults to
   all-rights-reserved for `data/`/`lore/`/original `assets/`; the code
   itself is MIT (`LICENSE`).
5. **Whether to keep or clear the sample world** — see "Starting your
   own world" above.

## Troubleshooting

- **Wrong Node version**: this project needs Node 24+ for `tsc`, Vite,
  and for scripts (which run as plain `.ts` files via Node's built-in
  type stripping — see `docs/DECISIONS.md`). Check with `node --version`;
  install via [nvm](https://github.com/nvm-sh/nvm) /
  [nvm-windows](https://github.com/coreybutler/nvm-windows) using the
  version in `.nvmrc`.
- **`npm run validate` fails on formatting**: run `npm run format:data`
  first, then re-run validate.

## License

Code: MIT, see `LICENSE`. The world's content (`data/`, `lore/`, original
`assets/`) is separately licensed — see `CONTENT-LICENSE.md`.
