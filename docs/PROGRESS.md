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

- [x] MapLibre viewer, `atlas` theme
- [x] `data/maps/world/map.json` + layer folders (`regions`, `routes`,
      `labels`, `places`)
- [x] Zoom-dependent labels/icons by `rank` (`src/core/rank.ts`); fontnik
      rejected (fails to build — no `cmake` — see `docs/DECISIONS.md`) in
      favor of a DOM/SVG label overlay (`src/map/LabelOverlay.tsx`),
      including curved text along routes via `<textPath>`
- [x] Custom planar scale bar (`src/map/ScaleBar.tsx`) + coordinate
      readout (`src/map/CoordinateReadout.tsx`) — pulled forward from the
      M4 checklist since they're basic map chrome, not a separate feature
- [x] Minimal seed data, tagged `sample` (one country + sea, a river +
      road, 3 places of different ranks/subtypes, one free label) — built
      to already match brief §12's shape so M5 only needs to _expand_ it,
      not redo it
- [x] Icon set: 10 Lucide SVGs + `scripts/icons.ts` sprite builder —
      pulled forward from M5 since the viewer needed real icons to render
- [x] GitHub Pages deploy workflow added to CI (`.github/workflows/ci.yml`
      `deploy` job, gated on `main`)

**Two real bugs found and fixed while building this** (both documented
in `docs/DECISIONS.md` with the full diagnosis):

1. MapLibre's worker fails to load once bundled by Vite (its relative
   worker-URL lookup breaks, and the worker's own sibling-chunk import
   breaks too) — no GeoJSON source renders until fixed. Fixed via a
   small Vite plugin that copies both worker files to a stable
   `publicDir` path.
2. Setting `maxBounds` to the _exact_ full Mercator extent crashes
   MapLibre's internal `_calcMatrices` on resize. Fixed by insetting the
   canvas bounds very slightly (`±179°`/`±84°` instead of `±180°`/
   `±85.0511288°`).

**Verification:** `npm run validate`/`test`/`build` all pass (see
below), plus a one-off Playwright check (chromium, not committed —
`npm run snapshot`, the real tool for this, is M5) confirming: the map
renders real fill/line/icon layers (not just the background), all 8
sample labels show including two curved route labels, the scale bar
reads a sensible value, clicking a place icon opens a popup with its
name/summary, and zooming works with no console errors beyond benign
headless-GPU driver warnings.

## M3 — Info layer

- [x] Info panel (`src/ui/InfoPanel.tsx`) on click/tap: name, type/
      subtype, summary, dates (in-world calendar formatting), tags,
      computed containing region(s), relations both directions
      (outgoing + computed backlinks, clickable), images, full lore;
      Escape-to-close, focus management
- [x] Lore rendering (`src/content/Markdown.tsx`): `react-markdown` +
      `remark-gfm` + `rehype-sanitize`, `[[wiki links]]` via a custom
      remark plugin (`src/content/wikiLinks.ts`)
- [x] Relations + computed backlinks (`src/content/entities.ts`); computed
      spatial facts — containing region(s), route length, region area
      (`src/content/computed.ts`, new `pointInRing`/`pointInPolygonRings`
      in `src/core/geometry.ts`)
- [x] MiniSearch-powered search (`src/content/search.ts` +
      `src/ui/SearchBox.tsx`); Browse/Index view with type/tag/status
      filters (`src/ui/BrowseView.tsx`); deep links + back/forward via a
      small custom hash router (`src/routing/useHashRoute.ts`) —
      no routing library, see `docs/DECISIONS.md`
- [x] Non-spatial entities: `lore/<type>/<id>.md` with full frontmatter;
      merged into the same entity graph as spatial features
- [x] `scripts/validate.ts` extended: lore frontmatter schema, field-
      ownership conflicts (a field set on both a feature and its lore
      file), lore-file-without-matching-feature, relation targets across
      the whole entity graph (not just spatial), wiki-link dangling
      checks (warning), spatial-entity-with-no-lore-file (warning)

**One real bug found and fixed** (documented in `docs/DECISIONS.md`):
`gray-matter` (the originally-planned frontmatter parser) throws
`ReferenceError: Buffer is not defined` in the browser — it
unconditionally calls Node's `Buffer`. Replaced with a ~15-line hand-
rolled `---` delimiter split + `js-yaml` (pure JS) in the new
`src/core/frontmatter.ts`, shared by the viewer and `scripts/validate.ts`.

**Sample content added**: two lore files (`lore/place/sampleton.md`,
`lore/person/aldric-sample.md`) exercising a spatial entity's lore body,
a non-spatial entity, a relation (`ruler-of`) and its computed
reciprocal backlink (`ruled-by`), and wiki links both to a spatial and
a non-spatial entity — tagged `sample`, extending (not replacing) the
M2 seed world.

**Not built**: non-spatial entities with a `location` field aren't
rendered as extra map markers yet (schema support exists; noted as an
open question below) — not required by brief §8's M3 feature list, and
genuinely deferrable until real content needs it.

**Verification:** `npm run validate`/`test`/`build` all pass, plus a
one-off Playwright check (not committed) confirming, in a real browser:
searching "Aldric" finds both the person and (via lore-text fuzzy
match) Sampleton; selecting a result opens the info panel and flies the
map to it; the wiki link in Aldric's lore navigates to Sampleton;
Sampleton's panel shows the computed "In: Sample Country" and both the
direct `capital-of` relation and the computed `ruled-by` backlink; the
browser Back button correctly returns to Aldric's panel; Browse lists
all 9 entities (8 spatial + 1 non-spatial) with working filters.

## M4 — Depth

- [ ] Timeline slider
- [ ] Nested maps + breadcrumbs
- [ ] `parchment` theme + switcher
- [ ] Measure tool (scale bar + coordinate readout already done in M2)
- [ ] Chronicle page (from git log) + About/Stats page

## M5 — Tooling

- [ ] Remaining helper scripts: `find`, `show`, `where`, `offset`,
      `measure`, `shape`, `add`, `rename-id`, `move`, `delete`, `snapshot`
      (Playwright), `export`, `new-map`, `new-layer`, `new-type`,
      `clear-sample` (`icons` already done in M2)
- [ ] Expand the M2 seed data into the full brief §12 sample content
      (2 people, 2 factions, 3 events across different years, a nested
      city map, wiki links, a draft entity) — it's already tagged
      `sample` and structured to extend, not redo
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
- Theme colors for `atlas` (built, reasonable defaults) and `parchment`
  (M4) — Payton can restyle anytime via `data/themes/*.json`, no code
  change needed.
- The JS bundle is ~1.37 MB (~380 KB gzip), mostly MapLibre GL JS itself
  — normal for a WebGL map library, but flagged for the M6 performance
  check; dynamic `import()` code-splitting is the lever if it ever needs
  to come down.
- `properties.style` (per-entity style override) is defined in the
  schema (`docs/DATA_MODEL.md`) but not yet read by the viewer — theme
  `byType`/`bySubtype` resolution covers every subtype so far; wiring in
  the per-entity override is a small follow-up once something actually
  needs it.
- Non-spatial entities with a `location` field (brief §4.4/§6 — e.g. a
  person shown on the map at the place they rule) aren't rendered as
  map markers yet — only genuine spatial features (with their own
  geometry) show on the map today. Worth building once real content
  wants it; not a blocker for anything else.
- The production/draft visibility split (brief §6: `draft` hidden from
  the production build by default, visible in dev / via a toggle) isn't
  wired up yet — `BrowseView` currently defaults `draft` to visible
  unconditionally. A real show/hide toggle (and a build-time env check)
  is a small follow-up, probably natural to bundle with the M4
  `parchment` theme switcher UI work.
