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
