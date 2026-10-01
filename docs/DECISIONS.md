# Decisions

ADR-style log of choices made while building this project, and why. Newest
entries at the bottom. Add an entry whenever you make a decision a future
session would otherwise have to re-derive or might reverse by accident.

## 2026-10-01 — Validation: Zod, not JSON Schema + Ajv

Zod gives one source of truth: the schema **is** the TypeScript type
(`z.infer<...>`), with no separate `.d.ts`/`.schema.json` pair to keep in
sync by hand. Runtime `safeParse` produces precise, path-qualified error
messages without extra tooling. Ajv would need JSON Schema files maintained
alongside hand-written TS types, which is exactly the kind of drift this
project can't afford across a years-long edit history.

## 2026-10-01 — Map rendering: MapLibre GL JS directly, no react-map-gl

Nothing in this project needs react-map-gl's declarative-React-children
abstraction over MapLibre's imperative API; the viewer's map interactions
(custom scale bar, label overlays, measure tool, snapshot tool) are better
served by holding the `maplibregl.Map` instance directly. One fewer
dependency, one fewer place for version-compatibility issues between the
wrapper and MapLibre itself.

## 2026-10-01 — Search: MiniSearch, not Pagefind

This is a single-page hash-routed SPA, not a multi-page static site.
MiniSearch builds an in-memory index from the same entity data the app
already loads and ships it as part of the normal build; Pagefind's model
(crawl rendered HTML pages, serve a separate search bundle) fits
multi-page static sites better than an SPA.

## 2026-10-01 — Scripts run as plain `.ts` via Node's built-in type stripping

Verified on the installed Node v24.20.0: `node scripts/foo.ts` runs
directly, no `ts-node`/`tsx` needed. This is strictly simpler and more
durable — one less dependency, nothing to break across Node upgrades or
platforms.

**Constraint this imposes:** anything run this way (or imported by
something run this way) must stick to syntax Node's stripper can erase —
no TS-only runtime constructs (`enum`, `namespace`, parameter-property
shorthand in constructors). Use union types / `as const` objects instead.
Relative imports must use explicit `.ts` extensions (Node ESM requires an
extension on relative specifiers); `tsconfig.json` sets
`allowImportingTsExtensions` so the same import style type-checks under
Vite's bundler resolution too — one import style serves both runtimes.

## 2026-10-01 — Shared pure logic lives in `src/core/`

`src/core/geometry.ts`, `src/core/calendar.ts`, `src/core/ids.ts`, and
`src/core/schema/` are imported by both the browser app (`src/`) and the
Node CLI scripts (`scripts/`). There is exactly one implementation of
planar distance/area/bearing math and calendar math — never a
viewer-copy and a scripts-copy that can drift apart. Anything placed here
must stay pure (no DOM, no Node `fs`/`child_process`) so it works
unmodified in both environments.

## 2026-10-01 — Markdown pipeline

`react-markdown` + `remark-gfm` for GitHub-flavored Markdown, a small
custom remark plugin for `[[id]]` / `[[id|text]]` wiki links, and
`rehype-sanitize` so lore bodies (plain text, publicly editable over a
world's lifetime) can never inject arbitrary HTML/scripts into the viewer.
Frontmatter parsed with `gray-matter`. (Not yet installed — lands in M3
when lore rendering is built.)

## 2026-10-01 — CLI argument parsing: `node:util parseArgs`

Node's built-in `parseArgs` covers every script's needs (`--help`, a
handful of named flags) without adding `commander`/`yargs`.

## 2026-10-01 — Canonical JSON formatting rule: alphabetical key sort

"Stable key order" (brief §2.5) only needs to be _deterministic_, not any
particular preferred order. Recursive alphabetical sort is the simplest
rule that is fully deterministic, requires no per-file-type ordering
table to maintain, and happens to put GeoJSON's `type`/`properties`/
`geometry` in a sensible order for free (`geometry`, `properties`,
`type`). Array order is never touched — order is semantically meaningful
(month sequence, polygon ring winding, future layer z-order). Numbers are
only rounded (to 6 decimals) when found inside a `coordinates` subtree, at
any nesting depth; every other number is left exactly as written.
Implemented once in `scripts/lib/canonical-json.ts` and used by both
`npm run format:data` (writes) and `npm run validate` (checks without
writing), so they can never disagree.

## 2026-10-01 — Vite `base` detected from the git remote

GitHub Pages project sites serve from `/<repo>/`; a custom domain or a
`<user>.github.io` user/org-page repo serves from `/`. `vite.config.ts`
reads `git config --get remote.origin.url` at config-load time and derives
the base path from the repo name, with a `VITE_BASE_PATH` env override and
a `public/CNAME`-presence check (for a future custom domain). Nothing
about the repo's name is hard-coded in the config.

## 2026-10-01 — Font glyph generation: open risk, flagged now

MapLibre symbol layers (needed for curved/collision-aware labels, per
brief §8) require a `glyphs` endpoint serving SDF glyph PBFs — there is no
way around this for text rendered through MapLibre's own label engine.
The only non-abandoned, non-404 generator found on npm is `fontnik`
(0.7.7), a native `node-gyp` module last touched years ago; it is an open
question whether it builds cleanly on Node 24 / Windows without a C++
toolchain already installed.

**Not resolved now** — fonts aren't needed until M2 (themes) at the
earliest. If `fontnik` doesn't build, the fallback is to render map labels
as DOM/SVG overlays positioned via `map.project()`, using plain
self-hosted `.woff2` fonts with ordinary CSS `@font-face` — no PBF
generation needed at all, still no runtime font CDN, and arguably _more_
control over curving decorative region-name text along an arbitrary path
than MapLibre's `symbol-placement: line` gives. Revisit at M2 and update
this entry with the outcome.

## 2026-10-01 — TypeScript pinned to 6.0.3, not the 7.0.2 "latest"

`npm view typescript version` currently resolves to 7.0.2, but
`typescript-eslint@8.71.0` (the latest stable, and the only typescript-eslint
with ESLint 10 support) declares `peerDependencies.typescript: ">=4.8.4
<6.1.0"` — it does not support TypeScript 7 yet, almost certainly because
TS 7 is a from-scratch native-compiler rewrite that the lint tooling
ecosystem hasn't caught up to. Installing TS 7 produced an `ERESOLVE`
conflict. Pinned to `6.0.3` (the newest 6.x release) instead — a working,
lintable toolchain beats being one major ahead on the compiler. Revisit
this pin once typescript-eslint publishes TS 7 support.

## 2026-10-01 — ESLint pinned to 9.39.5, not the 10.x "latest"

Same shape of problem: `eslint-plugin-jsx-a11y@6.10.2` (latest; no newer
version exists) declares `peerDependencies.eslint` up to `^9` only, not 10. Accessibility linting is an explicit project requirement (brief §8,
and the dedicated M6 accessibility pass) — rather than ship without it
now and bolt it on later, ESLint is pinned to the latest 9.x release,
which every other lint package here (`typescript-eslint`,
`eslint-plugin-react-hooks`, `eslint-config-prettier`) also supports.
Revisit once `eslint-plugin-jsx-a11y` adds ESLint 10 support.

## 2026-10-01 — Icon sprite tooling: `svgstore`

Small, single-purpose, maintained package that does exactly one job
(combine `assets/icons/*.svg` into one `<symbol>`-based sprite referenced
by `#id`). Not installed yet — lands when icons are actually added
(M2/M5).
