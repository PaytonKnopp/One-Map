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
custom remark plugin (`src/content/wikiLinks.ts`) for `[[id]]` /
`[[id|text]]` wiki links, and `rehype-sanitize` so lore bodies (plain
text, publicly editable over a world's lifetime) can never inject
arbitrary HTML/scripts into the viewer. A wiki link encodes its target
id in the link's own `#/?e=<id>` URL rather than a custom HTML
attribute — simpler, and sidesteps needing to teach rehype-sanitize's
schema about a custom `data-*` attribute. Frontmatter parsing:
hand-rolled split + `js-yaml`, not `gray-matter` — see that entry
below, added once lore rendering actually landed (M3).

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

**Decision: text labels are rendered as a DOM/SVG overlay**
(`src/map/LabelOverlay.tsx`), a React component kept in sync with the
map's camera via `map.on('move')` + `map.project()`, using ordinary
self-hosted webfonts (`@fontsource/*` — no PBF generation, no native
deps; see the "Fonts self-hosted" entry below). Region-name curving
uses SVG `<textPath>` along the region's actual boundary-derived
baseline, which is arguably more direct than MapLibre's
`symbol-placement: line`. Label collision/zoom-rank visibility is
implemented in that same component (greedy rank-priority box overlap
check) rather than relying on MapLibre's built-in symbol collision
index.

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

## 2026-10-01 — Frontmatter parsing: hand-rolled split + `js-yaml`, not `gray-matter`

`gray-matter` is the ecosystem-standard frontmatter parser, so it was
the first choice for lore files (brief §3). It doesn't work in the
browser, though: confirmed via a real runtime error (`ReferenceError:
Buffer is not defined`) when the viewer loaded lore content —
`gray-matter`'s `to-file.js` unconditionally calls Node's `Buffer` on
every parse, with no option to avoid it. Lore parsing has to run in
both the browser (the viewer, `src/content/lore.ts`) and Node
(`scripts/validate.ts`), so a Node-only library doesn't fit.

Replaced with `src/core/frontmatter.ts`: a small regex split of the
`---\n...\n---\n` block from the body, then `js-yaml` (pure JS, no
Node builtins) to parse the YAML itself — js-yaml does the actual hard
part (full YAML spec support), so this isn't a hand-rolled YAML parser,
just a hand-rolled _delimiter_ split, which is a one-line regex. Shared
by both the viewer and `scripts/lib/load-lore.ts`, so lore parsing
can't drift between them — same pattern as `src/core/geometry.ts`/
`calendar.ts`.

**Lesson for later additions**: any dependency meant to run in the
viewer needs checking for Node-only assumptions (`Buffer`, `fs`,
`process`) before adopting it, not just "does it have the API I need" —
`gray-matter`'s README gives no indication it's Node-only.

## 2026-10-01 — Routing: a ~40-line custom hash router, not react-router

Brief §3 only asks for hash-based routing so deep links survive on
GitHub Pages with no server rewrites. The app has two "pages" (the map,
optionally with an info panel open; the browse index) and one query
param that matters (`e`, the selected entity). `src/routing/
useHashRoute.ts` is a small hook: parse `location.hash` into
`{path, params}`, a `navigate()` that sets `location.hash`, and a
`hashchange` listener. Back/forward history comes free — setting
`location.hash` already pushes a browser history entry, confirmed
working via a real back-button test. Pulling in react-router for this
would be the opposite of "boring tech, few dependencies" — it solves
problems (nested route trees, data loaders, server rendering) this app
doesn't have.

## 2026-10-01 — Entity id resolves via `href`, not a custom HTML attribute

A wiki link needs the viewer to know, at render time, whether its
target entity actually exists (to style a dangling link differently).
The natural-looking approach — stash the target id in a custom
`data-wiki-link` attribute via the remark plugin's `hProperties`, read
it back in a custom `<a>` component — depends on that attribute
surviving `rehype-sanitize`'s schema (which strips unrecognized
attributes by default) and on hast's data-attribute casing convention,
neither of which was worth the risk to get exactly right without a
live browser to check against. Simpler and more robust: the link's
`href` is already `#/?e=<id>` (that's the real navigation target
anyway), so the renderer just parses the id back out of `href` with
`URLSearchParams`. No custom attribute, no sanitize-schema change
needed — the default (conservative) schema is used as-is.

## 2026-10-01 — Backlinks and computed spatial facts: plain functions over the loaded entity graph

Brief §6 says containment, nearest-neighbor, route length/region area,
and relation backlinks must be _computed_, never hand-maintained. Since
the whole world's data is already loaded into memory for the viewer
(it's a static site — there's no server to precompute on), "computed
at build" and "computed on access from the in-memory graph" come out
the same for the user: `src/content/entities.ts` builds the backlink
index once (iterate every entity's `relations[]`, look up the
registered reciprocal, push onto the target's `backlinks[]`) when the
module first loads; `src/content/computed.ts` has plain functions
(`containingRegions`, `routeLengthInWorldUnits`,
`regionAreaInWorldUnits`) called on demand by the info panel, reusing
`src/core/geometry.ts`'s existing planar math (a new `pointInRing`/
`pointInPolygonRings` pair, even-odd ray casting — topological, so it
works directly on [lng, lat] with no mercator projection needed).
Nothing is persisted or cached beyond the entity graph itself; a future
session adding/editing entities never has to touch a derived-data file.

## 2026-10-01 — Search: MiniSearch over name/aliases/tags/summary/lore text

One index built once at module load (`src/content/search.ts`) from
every entity's denormalized text fields, boosted name > aliases/tags >
summary > lore body, with `prefix: true` and light `fuzzy: 0.2` so
partial/slightly-misspelled queries still find things. Confirmed
working end-to-end in a real browser: searching "Aldric" found both
"Aldric Sample" (name match) and, via fuzzy matching, surfaced
"Sampleton" through its lore body mentioning him.

## 2026-10-01 — Timeline: imperative MapLibre filter/paint updates, not source rebuilds

Scrubbing the timeline slider (brief §4.3) has to stay smooth, so it
can't go through the full map-rebuild effect (`MapView.tsx`'s mount
effect — rebuilds sources, re-registers icons, the works). Every
feature gets `_fromKey`/`_toKey` (sortable numbers, open-ended sides
filled with large sentinel constants — see `src/map/timeline.ts`)
baked into its GeoJSON properties once, at source-build time. From
then on, a year/ghost change just calls `map.setFilter`/
`map.setPaintProperty` on each already-added layer
(`updateTimelineStyling` in `MapView.tsx`) with the viewed year's sort
key as a literal in the expression — no source touched. Not-ghosted
hides out-of-range features via `filter`; ghosted keeps them visible
but dims opacity via a `case` expression, so "doesn't exist right now"
reads as a visual state rather than disappearing.

## 2026-10-01 — Nested maps: `parentEntity` both ways, cross-checked

A nested map's `map.json` names the spatial entity it belongs under
(`parentEntity`); that entity's own feature names the map it opens
(`properties.map`) — both directions are explicit data, not derived,
so `scripts/validate.ts` checks they agree (`parentEntity`'s target
exists and its `map` field, if set, points back at this same map) —
confirmed catching a deliberately broken reference in testing.
Breadcrumbs (`src/ui/Breadcrumbs.tsx`) read `parentEntity` to show
World › \<parent\> › \<map name\>, skipping the last segment when it would
just repeat the parent's name (the sample nested map is named
"Sampleton," same as the place it belongs to).

## 2026-10-01 — Theme switching and current map are route state, not local state

Both `?theme=` and `?map=` live in the hash route (brief §9's "theme
switcher," §4.4's nested maps), not `useState` — picking a theme or
opening a nested map is something worth landing on if you share the
link or hit Back. `src/map/data.ts`'s `loadMapData` takes an optional
theme-id override specifically so a route param can outrank a map's
own configured theme. One early bug here, caught by testing in a real
browser rather than assumed fixed: switching to Chronicle/About/Browse
originally called `navigate(path)` with no params, silently dropping
the current `map`/`theme` — fixed by threading a `preserved` params
object through every navigation in `App.tsx`.

## 2026-10-01 — Chronicle: a Vite virtual module wrapping `git log`, not a data file

The "World chronicle" (brief §8) needs recent git history, but this is
a static site with no server to precompute anything on. `vite.config.ts`'s
`chroniclePlugin` resolves `virtual:chronicle` to a module whose source
is generated by running `git log` (capped at 300 commits, `--date=format`

- a `\x1f`-separated `--pretty=format` to survive commit messages with
  odd characters) at dev-server-start/build time — an ordinary `import
commits from 'virtual:chronicle'` in `src/ui/ChroniclePage.tsx`, no
  extra file written anywhere, no runtime git access needed (there isn't
  any once deployed). Falls back to an empty array if `git log` fails
  (e.g. building from a source archive instead of a clone) rather than
  failing the build. This is also why CI fetches full history
  (`fetch-depth: 0`, already set in M1 for this reason) — a shallow
  checkout would just make the chronicle short, not broken.

## 2026-10-01 — Parchment theme skips actual fill-pattern textures

Brief §9 describes parchment as "using patterns and a decorative label
font." The label font is real (`fonts.decorative` used far more
broadly than atlas — region labels _and_ place labels, see
`data/themes/parchment.json`'s `default.label.font`). Textured fill
patterns (a paper-grain tile for land, say) are not — that needs an
actual image asset plus `fill-pattern` paint wiring, and the theme
reads as clearly "old-map" from palette and typography alone (warm
sepia background, ink-brown strokes, muted sea green). Deferred to
`docs/ROADMAP.md` rather than built now; the `TypeStyle` schema has no
pattern field yet either, so adding one later is additive, not a
migration.

## 2026-10-01 — M5 scripts: Node's native JSON-import attribute vs. `readJson`

Node's native ESM loader requires `import x from './y.json' with { type:
'json' }` for a direct JSON import; Vite doesn't need (or want) that
attribute. Rather than branch on runtime, every Node script reads JSON
via the existing `readJson()` helper (`readFileSync` + `JSON.parse`,
`scripts/lib/load-data.ts`) and never uses a native JSON import — one
convention across all scripts, and it matches what `scripts/validate.ts`
already did since M1. `scripts/lib/entities.ts` (the Node-side mirror of
`src/content/entities.ts`, built for M5's read/write scripts) hit this
directly: an initial `import worldJson from '../../data/world.json'`
threw `ERR_IMPORT_ATTRIBUTE_MISSING` the first time any script actually
ran under plain `node`.

## 2026-10-01 — `where`/`measure` must not mix coordinates across maps

Each map has its own independent planar coordinate space (brief §4.4) —
a point at `[0, 0]` on the world map and `[0, 0]` on a nested city map
are unrelated locations. `scripts/where.ts`'s "nearest entities" and
`scripts/measure.ts`'s distance both initially computed across every
entity regardless of map, producing numbers that looked plausible but
meant nothing (confirmed by testing: `sampleton-city`'s entities showed
up as the "nearest" things to a world-map point, at a bogus distance).
Fixed by scoping `where` to one map (`--map`, default
`world.defaultMap`) and making `measure` refuse outright when its two
points resolve to different maps, naming both maps in the error instead
of silently producing a number.

## 2026-10-01 — `rename-id`: write-then-delete, never `rename`, for a changed lore filename

`rename-id` renames a lore file (`lore/<type>/<old-id>.md` →
`lore/<type>/<new-id>.md`) as part of updating every reference. The
first draft wrote the new content to the new path, then called
`renameSync(oldPath, newPath)` to "finish the move" — but the old file
still held the stale pre-rename content at that point, so the rename
would have overwritten the just-written new content with it. Fixed to
`unlinkSync(oldPath)` strictly after the new content is written, and
never use `renameSync` for this. Also switched frontmatter
serialization from a hand-rolled `JSON.stringify`-per-field line (valid
but flow-style, e.g. `tags: ["sample"]`) to `js-yaml`'s `dump()`, which
produces the same block style every other file already uses.

## 2026-10-01 — `snapshot.ts`: a single shell command string, not an args array, with `shell: true`

Node's `child_process.spawn` deprecation-warns (`DEP0190`) on passing
both an argument array and `shell: true` — the array's elements aren't
shell-escaped, which is the unsafe pattern the warning exists for, even
though every argument here is our own literal/number, never user
input. Fixed by building one command string
(`` `npx vite preview --port ${PORT} --strictPort` ``) instead. Separately,
`map.jumpTo({ center, zoom })` fails typecheck under
`exactOptionalPropertyTypes` when `zoom` is possibly `undefined` (MapLibre's
type wants `number`, not `number | undefined`) — fixed with a
conditional object literal rather than a non-null assertion.

## 2026-10-01 — `archiver` v8 has no callable factory export; use its `ZipArchive` class

The old `archiver('zip', options)` factory-function API (what most
examples online still show) doesn't exist in `archiver@8` — its actual
runtime export (confirmed by reading `node_modules/archiver/index.js`)
is a set of named classes (`Archiver`, `ZipArchive`, `TarArchive`,
`JsonArchive`), and `@types/archiver@8` matches that: no default
export. `scripts/export.ts` uses `new ZipArchive({ zlib: { level: 9 } })`
instead.

## 2026-10-01 — `clear-sample` defaults to a dry run, and removes whole nested sample maps

Every M2–M4 sample entity (and the sample lore added in M5) is tagged
`sample`; `scripts/clear-sample.ts` deletes exactly that set the same
way `delete.ts` deletes anything (feature removed from its `.geojson`,
file deleted if now empty; lore file deleted) plus a dangling-reference
report. One addition `delete.ts` doesn't need: any map whose
`parentEntity` is itself a sample entity (here, `sampleton-city`,
nested under the sample place `sampleton`) is entirely sample content
too, so its whole map folder is removed, not just left orphaned.
Because this is a one-shot mass deletion by design (unlike `delete.ts`,
which only mass-deletes past a 5-entity threshold), it prints exactly
what it would remove and requires `--yes` to actually do it, rather
than using the same numeric threshold.

## 2026-10-01 — `.claude/settings.json` pre-allows read-only and idempotent scripts only

Per brief §11/§16, `find`/`show`/`where`/`offset`/`measure` (read-only),
`format:data`/`format:check` (idempotent canonical formatting),
`validate`/`typecheck`/`lint`/`test`/`build` (checks, no data mutation),
and `snapshot` (builds + screenshots, no data mutation) are pre-allowed
so a future session doesn't need a permission prompt for routine,
non-destructive work. Every script that writes or deletes content
(`add`, `move`, `delete`, `rename-id`, `new-map`, `new-layer`,
`new-type`, `export`, `clear-sample`) is deliberately left out — those
still prompt, consistent with `CLAUDE.md`'s destructive-change rule —
and force-push/`reset --hard`/`clean`/`rebase`/`commit --amend` are
explicitly denied.

## 2026-10-01 — No Dependabot version-update PRs; dependencies updated on purpose

Payton wants this to be a stable personal project, not a stream of bot
pull requests (the first one, a grouped ESLint 10 bump, couldn't even
install because `eslint-plugin-jsx-a11y` doesn't support ESLint 10
yet). Every dependency is pinned to an exact version and
`package-lock.json` is committed, and the deployed site is static
files, so nothing breaks by standing still. `.github/dependabot.yml` was
removed. Dependencies and GitHub Actions versions get updated
deliberately instead, in one `chore:` commit, when there's a reason:
a security advisory that actually affects the shipped site, a feature
that needs a newer library, or CI/deploy breaking because GitHub
retired an old Actions runtime.
