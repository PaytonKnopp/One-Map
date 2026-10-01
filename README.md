# One World

_(placeholder name — the real name lives in `data/world.json` → `name`,
change it anytime; nothing else needs to change)_

A lifelong, ever-expanding world-building map: a zoomable fictional-world
atlas with names, icons, regions, routes, lore, and history, built up over
years. Plain-text data in Git — GeoJSON, Markdown, JSON — no database, no
backend, deployed as a static site on GitHub Pages.

> **Status:** Milestone 1 (Foundation) only — tooling, data schemas, and
> core math modules exist; there is no map viewer yet. See
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

Not yet meaningful until the map viewer and lore pipeline exist (M2–M3).
Once they do, this section documents the `npm run <script>` tools and
points to `CLAUDE.md` for the full workflow. For now, the only editable
data is `data/world.json` (world name, scale, calendar) and
`data/registry/*.json` (entity/relation types) — edit directly, then
`npm run format:data && npm run validate`.

## Deploying

Not set up yet (lands at M2). Planned: GitHub Actions builds and deploys
to GitHub Pages on every push to `main`. The one manual step once that
workflow exists: in the repo's GitHub settings, **Settings → Pages →
Source: GitHub Actions**.

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
