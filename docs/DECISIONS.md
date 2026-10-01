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

## 2026-10-01 — Labels: DOM/SVG overlay, not MapLibre symbol layers (fontnik rejected)

Tested directly: `npm install fontnik` fails to build on this machine —
`cmake` is not installed, and fontnik has no prebuilt binary for current
Node. Requiring every contributor (just Payton today, but the repo is
public) to install a C++ toolchain and `cmake` just to regenerate label
fonts fails the "must work on Windows/macOS/Linux with Node-based
scripts only" requirement outright.

**Decision: text labels are rendered as a DOM/SVG overlay**, a React
component kept in sync with the map's camera via `map.on('move')` +
`map.project()`, using ordinary self-hosted `.woff2` fonts and CSS
`@font-face` (`npm run fonts` just copies/subsets font files — no PBF
generation, no native deps). Region-name curving uses SVG `<textPath>`
along the region's actual boundary-derived baseline, which is arguably
more direct than MapLibre's `symbol-placement: line`. Label
collision/zoom-rank visibility is implemented in `src/map/labels/` (see
that module) rather than relying on MapLibre's built-in symbol
collision index.

**Icons remain MapLibre symbol layers** (icon-image only, no text) —
icons need no glyphs at all, only a sprite image, so MapLibre's own
placement/collision for icon markers is used normally.

This also means `data/themes/*.json` styles label text (font, size,
color, halo) as plain CSS-shaped values consumed by the overlay
component, not as MapLibre layout/paint properties.

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

## 2026-10-01 — Fonts self-hosted via `@fontsource/*` npm packages

Needed two OFL-licensed webfonts (brief §9): a decorative serif for
region/title text and a clean sans for general labels. `@fontsource/*`
packages (maintained, widely used) ship the actual `.woff2`/`.woff`
files plus `@font-face` CSS for the exact Google-Fonts-sourced OFL
fonts, installed like any other npm dependency and bundled by Vite at
build time — no runtime CDN call, no manual binary download, no
license ambiguity (each package carries the font's own `LICENSE`
file, OFL 1.1, verified in `node_modules/@fontsource/*/LICENSE`).
Chose **Cinzel** (decorative, a classic engraved-serif look for map
titles/region names) and **Inter** (sans, general-purpose labels).
Only the weights actually used (Cinzel 400/700, Inter 400/500/700) are
imported, not the full family, to keep the bundle lean. See
`docs/ASSETS.md` for the attribution entries (OFL doesn't require
on-product attribution, but the license files are kept and credited
there regardless, for transparency).

## 2026-10-01 — Icon sprite tooling: `svgstore`

Small, single-purpose, maintained package that does exactly one job
(combine `assets/icons/*.svg` into one `<symbol>`-based sprite referenced
by `#id`). Used by `scripts/icons.ts` (built in M2, ahead of its original
M5 slot, since the viewer needed real icons to render — see
`docs/PROGRESS.md`).

## 2026-10-01 — Icon set: a curated Lucide (ISC) subset, vendored as files

`assets/icons/*.svg` are individual Lucide icons (ISC-licensed, no
attribution required), copied in once and committed — not a live
`lucide-static` dependency. One icon per registered `place` subtype
(`city`→building-2, `town`→houses, `village`→home, `fortress`→castle,
`port`→anchor, `temple`→church, `ruin`→columns-2, `landmark`→landmark,
`camp`→tent) plus a generic `marker` fallback. Matches brief §8's "drop
in more SVGs, reference them by id" model — `assets/icons/` is the
editable source of truth, not a generated/library-driven thing.

Map markers don't use MapLibre's SDF icon recoloring (`addImage(...,
{sdf:true})`), which needs a genuine signed-distance-field image, not a
plain alpha mask — instead each (icon, theme-resolved color) pair is
rasterized once onto a canvas and registered as a normal raster image
(`src/map/icons.ts`). Simpler, visually correct, and re-rasterizing on a
theme switch is cheap.

## 2026-10-01 — `assets/` is Vite's `publicDir`

Vite's default `publicDir` is `public/`, but the brief's repo layout
(§5) puts icons/fonts/images under `assets/` at the root. Setting
`publicDir: 'assets'` in `vite.config.ts` means that IS the static
asset directory — `assets/icons/city.svg` is fetchable at runtime as
`${BASE_URL}icons/city.svg`, needed to rasterize icons onto the map
canvas, with no duplicate `public/` folder.

## 2026-10-01 — MapLibre's worker needs manual wiring under Vite

MapLibre GL JS processes GeoJSON sources off the main thread via an
internal Web Worker, resolved by relative URL from its own script
location. Once Vite bundles MapLibre's entry into our single chunk,
that relative lookup no longer points anywhere real — the worker
silently fails to load and **no GeoJSON source ever renders** (fill/
line/symbol layers stay empty; confirmed by screenshot — only the
background layer painted). No console error pointed at the real cause
either; `Worker failed to load` is MapLibre's generic catch-all.

Pointing `setWorkerUrl()` at the worker file alone (even via Vite's
`?url` asset import, which does correctly emit the file) still fails
the same way, because that worker file itself statically imports a
sibling chunk (`maplibre-gl-shared.mjs`) by relative path — copying one
file without the other breaks that import. Fix: a small Vite plugin
(`copyMaplibreWorkerPlugin` in `vite.config.ts`) copies both files,
under their original unhashed names, into `assets/vendor/maplibre-gl/`
on every `dev`/`build` (gitignored, regenerated from whatever
`maplibre-gl` version is installed — never hand-committed), and
`setWorkerUrl()` points at that stable path directly. Confirmed working
via a one-off Playwright check (see `docs/PROGRESS.md`); a committed
automated check belongs to `npm run snapshot` once that lands (M5).

**Note for later:** this is a real bug class worth watching for when
`maplibre-gl` is upgraded — if a future version restructures its worker
chunk's own imports, `copyMaplibreWorkerPlugin`'s hardcoded two
filenames may need updating.

## 2026-10-01 — The map canvas is inset slightly from the true Mercator extent

Brief §4.1 calls for `maxBounds` locked to "the full Web-Mercator
extent" (`±180°` lng, `±85.0511288°` lat — the standard square Web
Mercator projects onto). Setting MapLibre's `maxBounds` to exactly that
range crashes on any zoom/resize: `TypeError: Cannot read properties of
null (reading '0')` inside MapLibre's internal `_calcMatrices`,
confirmed by bisection (±170°/±80° works; the literal extent doesn't).
This reads as a MapLibre edge case in its bounds-constraint math when
`maxBounds` spans (at or very near) the full valid range.

Rather than fight it, `data/maps/world/map.json`'s `bounds` is inset to
`±179°` lng / `±84°` lat — negligibly smaller than the true extent (still
"about 40,000 × 40,000 world-km," brief's own phrasing), comfortably
clear of whatever triggers the crash, confirmed stable in testing. If a
future `maplibre-gl` upgrade fixes the underlying bug, this inset can be
tightened back toward the true extent — it's not load-bearing for
anything in the data model.
