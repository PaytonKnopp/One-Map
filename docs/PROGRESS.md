# Progress

Milestone checklist, kept current so a new session (possibly months
later, with no memory of this one) can see exactly what's done and what's
next. Check items off in the same commit that finishes them. Non-blocking
open questions for Payton go in the "Open questions" section at the
bottom instead of stopping the build.

## M1 — Foundation

- [x] Tooling: `package.json`, Vite + TS (strict) + React, Vitest, ESLint
      (flat config) + Prettier
- [x] Hygiene files: `.gitignore`, `.gitattributes`, `.editorconfig`,
      `.nvmrc`, `LICENSE` (MIT), `CONTENT-LICENSE.md`
- [x] `data/world.json` (placeholder name, scale, calendar)
- [x] `data/registry/entity-types.json`, `data/registry/relation-types.json`
- [x] Shared core modules + tests: `src/core/geometry.ts`,
      `src/core/calendar.ts`, `src/core/ids.ts`, `src/core/schema/`
- [x] `scripts/validate.ts`, `scripts/format-data.ts` (+ shared
      `scripts/lib/canonical-json.ts`)
- [x] CI skeleton (`.github/workflows/ci.yml`): install, typecheck, lint,
      test, validate, build — on PR + push to `main`. No deploy job yet.
- [x] Minimal placeholder app shell (`src/App.tsx`) proving the world's
      name is read from `data/world.json`, nowhere else
- [x] First draft of `CLAUDE.md`, `README.md`, `lore/_world-bible.md`
- [x] `docs/DATA_MODEL.md`, `docs/DECISIONS.md`, `docs/SCALING.md`,
      `docs/ASSETS.md`, `docs/ROADMAP.md`, this file

**Verification:** `npm install`, `npm run typecheck`, `npm run lint`,
`npm run test`, `npm run validate`, `npm run build` all pass from a clean
state on Windows.

## M2 — Map core

- [ ] MapLibre viewer, `atlas` theme
- [ ] `data/maps/world/map.json` + layer folders
- [ ] Zoom-dependent labels/icons; resolve the fontnik-vs-DOM-overlay font
      question (`docs/DECISIONS.md`)
- [ ] Custom planar scale bar (not MapLibre's geodesic `ScaleControl`)
- [ ] Minimal seed data
- [ ] GitHub Pages deploy workflow added to CI; site live

## M3 — Info layer

- [ ] Info panel, lore rendering (`react-markdown` + wiki links), sanitized
- [ ] Relations + computed backlinks
- [ ] MiniSearch-powered search; Browse/Index view; filters; deep links

## M4 — Depth

- [ ] Timeline slider
- [ ] Nested maps + breadcrumbs
- [ ] `parchment` theme + switcher
- [ ] Measure tool, scale bar, coordinate readout
- [ ] Chronicle page (from git log) + About/Stats page

## M5 — Tooling

- [ ] Remaining helper scripts: `find`, `show`, `where`, `offset`,
      `measure`, `shape`, `add`, `rename-id`, `move`, `delete`, `snapshot`
      (Playwright), `export`, `icons`, `fonts`, `new-map`, `new-layer`,
      `new-type`, `clear-sample`
- [ ] Full sample world content (tagged `sample`, removable via
      `clear-sample`)
- [ ] `.claude/commands/*`, `.claude/settings.json`

## M6 — Hardening

- [ ] Accessibility pass
- [ ] Mobile pass
- [ ] Stress test with a generated (uncommitted) ~20k-feature world —
      report results here
- [ ] Final docs pass; final `CLAUDE.md` pass
- [ ] CI fully green; final report to Payton

## Open questions (non-blocking)

- Content license (`CONTENT-LICENSE.md` currently defaults to all-rights-
  reserved) — Payton may want something more permissive later.
- Calendar placeholder names (months, weekdays, era labels) — waiting on
  Payton's naming.
- World name (`data/world.json` → `name`) — currently the literal
  placeholder `"One World"`.
- Theme colors/fonts for `atlas`/`parchment` — will be built with
  reasonable defaults at M2/M4; Payton can restyle anytime via
  `data/themes/*.json`, no code change needed.
- Font glyph generation tool (`fontnik`) — unverified on Windows/Node 24;
  see `docs/DECISIONS.md`. Will resolve at M2.
