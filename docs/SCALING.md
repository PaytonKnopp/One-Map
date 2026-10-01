# Scaling path

The viewer stays fully static and must keep working whether the world is
a handful of places or tens of thousands. This document is the plan for
when raw GeoJSON stops being enough — nothing here is built yet.

## Where things stand (M1)

No map/layer data exists yet. The architecture is chosen so the swap
described below is a contained, later change:

- Layers are **folders** of `.geojson` files (`data/maps/<map>/layers/
<layer>/*.geojson`), merged at build/load time — not one giant file —
  so the natural first scaling step (splitting a layer by region or era)
  costs nothing structurally.
- All geometry math (`src/core/geometry.ts`) works on plain `[lng, lat]`
  coordinate pairs and GeoJSON-shaped structures, not on a
  MapLibre-specific or GeoJSON-source-specific API, so it keeps working
  unchanged regardless of how the data reaches the map.

## The planned path

1. **Now → low thousands of features:** ship layer GeoJSON directly as
   MapLibre GeoJSON sources. Simplest possible pipeline; this is what M2
   builds.
2. **Low thousands → tens of thousands:** convert layers to vector tiles
   (PMTiles) at build time with `tippecanoe`, served as static `.pmtiles`
   files (no tile server needed — PMTiles reads range requests directly
   from a static host, which GitHub Pages supports). The source data
   (GeoJSON under `data/`) stays the editable source of truth; PMTiles
   become a generated build artifact, not something hand-edited or
   committed.
3. **Validator/scripts stay on the GeoJSON source files** regardless of
   which stage the _viewer_ is in — `find`/`show`/`validate`/etc. always
   read `data/`, never the generated tiles.

## Where the swap is contained

The only code that should need to change when step 2 happens is the
layer-loading code in the viewer (replace "fetch GeoJSON, add as a
GeoJSON source" with "add a vector source pointing at the generated
`.pmtiles` file") and a new `npm run build:tiles` step wired into the
build. `src/core/geometry.ts`, the schema/validation layer, and every
helper script are untouched by this change — they operate on the
GeoJSON source files either way.

This step is explicitly **out of scope to build now** (brief §8) — revisit
this document and implement it only once real content growth actually
needs it.

## M6 stress test: concrete numbers at 20,000 features

Per the brief's hardening checklist, a synthetic ~20,000-feature world
was generated in a throwaway scratch copy of the repo (never committed —
built, measured, and deleted; `data/maps/world`'s real content was
untouched throughout) and measured with a headless Playwright browser.
20,000 `place` features (a realistic rank distribution: 2% rank 1, 8%
rank 2, 20% rank 3, 35% rank 4, 35% rank 5 — not a uniform 1–5 spread,
which would make an unrealistic ~20% of the world "always visible")
across 20 `.geojson` files on the `world` map, all other content
untouched:

- **Production JS bundle**: 1.6 MB → **9.97 MB** (455 KB → **889 KB
  gzip**). The current architecture bundles every map's GeoJSON
  straight into the app's JS (via Vite's module loading) rather than
  fetching it at runtime — this is exactly the scaling limit the plan
  above anticipates, now with a real number attached.
- **Time to `map.on('idle')`** (every source loaded, first paint done):
  **~10 seconds** from page load, on localhost with no network
  latency — would be meaningfully worse over a real connection, since
  it's downstream of fetching/parsing that ~9 MB bundle at all. At the
  current sample-world scale this is well under 1 second.
- **Runtime pan/zoom, once loaded**: smooth, ~58–60 fps, no jank beyond
  a single frame at the start of a programmatic pan. The cost here is
  almost entirely in the initial load, not per-frame rendering — good
  news for the eventual fix, since it means the GeoJTS-source rendering
  itself isn't the bottleneck, just getting the data there (the
  GeoJSON-source rendering, once data is in memory, is cheap).
- **Heap memory**: ~82 MB used / 150 MB total — unremarkable.
- **A confirmed, independent issue, not just a scale one**: the DOM/SVG
  label overlay (`src/map/LabelOverlay.tsx`, the M2 fontnik-build-failure
  fallback — see the M2 entry above) has **no label-collision/
  decluttering logic**. `rank` controls how many labels are eligible to
  show at a given zoom, but doesn't prevent the eligible ones from
  overlapping each other on screen — confirmed visually (a stress-test
  screenshot at zoom 2 showed heavy label overlap even with the
  realistic rank distribution, since "only 10% of 20,000 is visible at
  this zoom" is still ~2,000 features spread across one viewport). This
  would start being visible at far lower feature counts than 20,000,
  in any sufficiently dense cluster (a crowded city map, say) — it's
  not purely a large-world problem.

**Practical takeaway**: nothing here needs fixing today — a real
hand-built world realistically reaches dozens to low hundreds of
entities per map even over years, nowhere near 20,000, and the existing
sample world's handful of features is nowhere near a problem. Two
concrete, independent signals for when action is actually warranted:

1. **A single map's feature count approaches ~1,000–2,000**: follow
   the PMTiles path above (step 2) — convert that map's layers to
   vector tiles at build time instead of bundling GeoJSON into the JS.
2. **Any view (dense or not) shows overlapping labels**: that's the
   label-overlay decluttering gap, independent of total world size —
   worth a basic "skip a label if its screen-space bounding box
   collides with one already placed this frame" pass in
   `LabelOverlay.tsx` whenever it's first actually noticed in real use,
   rather than pre-building it unneeded.
