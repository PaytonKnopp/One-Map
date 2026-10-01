# One World

_(placeholder name — the real name lives in `data/world.json` → `name`,
change it anytime; nothing else needs to change)_

A lifelong, ever-expanding world-building map: a zoomable fictional-world
atlas with names, icons, regions, routes, lore, and history, built up over
years. Plain-text data in Git — GeoJSON, Markdown, JSON — no database, no
backend, deployed as a static site on GitHub Pages.

> **Status:** Milestones 1–4 (Foundation, Map core, Info layer, Depth) —
> a real MapLibre viewer with two switchable themes, info panel, lore
> rendering with wiki links, search, a browse view, a nested city map
> with breadcrumbs, a timeline, a measure tool, and chronicle/about
> pages, over a small tagged-`sample` seed world. Most of the editing
> scripts (M5) and the hardening pass (M6) are still ahead. See
> `docs/PROGRESS.md` for exactly what's built.

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

The full plain-language workflow (open Claude Code, describe what to
add) needs the helper scripts from M5 to be comfortable — most of them
don't exist yet. Today, spatial entities (places/regions/routes/free
labels) can be hand-edited directly: add a GeoJSON Feature to a file
under `data/maps/world/layers/<layer>/`, following the shape of the
existing `sample-*.geojson` files and the field reference in
`docs/DATA_MODEL.md`, then run `npm run format:data && npm run
validate` and look at it with `npm run dev`. `data/world.json`,
`data/registry/*.json`, `data/maps/world/map.json`, and
`data/themes/atlas.json` are all editable the same way. See `CLAUDE.md`
for the full editing rules (ID stability, consistency duty,
destructive-change confirmation) even while the scripts that automate
parts of this are still being built.

## Deploying

GitHub Actions (`.github/workflows/ci.yml`) builds and deploys to
GitHub Pages automatically on every push to `main`, after typecheck/
lint/test/validate/build all pass. **One manual, one-time step**: in
the repo's GitHub settings, **Settings → Pages → Source: GitHub
Actions**. After that, pushing to `main` is the whole deploy process —
no separate deploy command to run.

## Backup / restore

Not built yet (M5, `npm run export`). Every change is already preserved
in Git history regardless — `git log`/`git revert` work today for
recovering anything.

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
