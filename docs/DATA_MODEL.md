# Data model

Every field that exists so far, with examples. This file grows alongside
the data model — update it in the same commit as any schema change. The
authoritative definitions are the Zod schemas under `src/core/schema/`;
this document explains them in prose.

## Conventions used throughout

- **IDs** (`src/core/ids.ts`): lowercase kebab-case (`stormhaven`,
  `silverrun-river`), immutable once assigned. Renaming an entity changes
  its `name`, never its `id`. (The `rename-id` script that changes an ID
  everywhere it's referenced arrives in M5.)
- **Canonical JSON formatting**: 2-space indent, object keys sorted
  alphabetically at every level, numbers inside any `coordinates` key
  rounded to 6 decimal places, trailing newline. Enforced by
  `npm run format:data` / checked by `npm run validate`. See
  `docs/DECISIONS.md` for why alphabetical sort was chosen. Array order is
  never changed.
- **Dates** are always structured `{ "y": number, "m"?: number, "d"?: number }`,
  never formatted strings. See `src/core/calendar.ts`.

## `data/world.json`

The single file that configures the whole world. Schema:
`src/core/schema/world.ts` (`WorldSchema`).

| Field                                      | Type                      | Notes                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                            | positive integer          | Bump + add a migration script under `scripts/migrations/` + a `docs/DECISIONS.md` entry on any breaking format change.                                                                                                                                                     |
| `name`                                     | string                    | **The world's name — the ONE place it lives.** Never hard-code it in UI, titles, or docs; read it from here. Currently the literal placeholder `"One World"`.                                                                                                              |
| `scale.unit`                               | string                    | Display name for one world unit, e.g. `"world-km"`.                                                                                                                                                                                                                        |
| `scale.planeMetersPerUnit`                 | positive number           | How many EPSG:3857 planar meters make up one world unit. All distance/area math goes through `src/core/geometry.ts`, which works in planar meters first and converts to world units via this factor — see that file's header comment for why this is planar, not geodesic. |
| `scale.travelSpeeds`                       | array (optional)          | `{ id, name, unitsPerDay }` — feeds the measure tool's travel-time estimate (M4). Not set yet.                                                                                                                                                                             |
| `calendar.eraBefore` / `calendar.eraAfter` | string                    | Era labels either side of year 0 (the Epoch). Currently placeholders `"BE"` / `"AE"`.                                                                                                                                                                                      |
| `calendar.epochYear`                       | literal `0`               | Always 0 by definition; kept explicit in the schema for clarity.                                                                                                                                                                                                           |
| `calendar.months`                          | array of `{ name, days }` | Currently 12 placeholder 30-day months. Order matters (never alphabetized) — it's the actual month sequence.                                                                                                                                                               |
| `calendar.weekdays`                        | array of string           | Currently 6 placeholder day names.                                                                                                                                                                                                                                         |
| `calendar.currentYear`                     | integer                   | The in-world "now". Entities with no `to` date are current as of this year. Placeholder value `1000`.                                                                                                                                                                      |
| `defaultTheme`                             | string (theme id)         | Which `data/themes/*.json` loads by default. Set to `"atlas"` — the theme file itself doesn't exist until M2.                                                                                                                                                              |
| `defaultMap`                               | string (map id)           | Which `data/maps/<id>/` opens by default. Set to `"world"` — the map itself doesn't exist until M2.                                                                                                                                                                        |

**Changing the calendar later:** month names can be renamed freely (data
stores `{y,m,d}` integers, never month names). Changing the _number_ of
months or any month's day _count_ changes what `src/core/calendar.ts`
computes for every stored date's absolute day-offset and therefore
`durationDays`/`compareDates` results against dates stored under the old
layout — comparisons and formatting of individual dates stay correct
(they only use the month index and the _current_ month lengths), but a
previously-computed duration spanning the change point would no longer
match if recomputed. In practice this only matters if you've recorded
precise day-level durations across eras; flag it in `docs/DECISIONS.md`
if you ever do.

## `data/registry/entity-types.json`

Registers every spatial and non-spatial entity type and its allowed
subtypes. Schema: `src/core/schema/registry.ts`
(`EntityTypesRegistrySchema`). Adding a new type or subtype is a data
edit here, never a code change (the `new-type` script, M5, automates it).

```json
{
  "schemaVersion": 1,
  "spatial": {
    "place": { "subtypes": ["city", "port", "..."] },
    "region": { "subtypes": ["country", "sea", "..."] },
    "route": { "subtypes": ["road", "river", "..."] },
    "label": { "subtypes": [] }
  },
  "nonSpatial": {
    "person": {},
    "faction": {}
  }
}
```

- A type key may only appear under _either_ `spatial` or `nonSpatial`, not
  both — `npm run validate` checks this.
- `spatial.<type>.subtypes` must not contain duplicates.
- `nonSpatial.<type>` is intentionally an open object (can grow extra
  fields later, e.g. required-frontmatter hints, without a schema
  migration).

The four spatial kinds (`place`/Point, `region`/Polygon, `route`/
LineString, `label`/free text) are fixed by the brief; their _subtypes_
and the full set of non-spatial types are open and registry-driven.

## `data/registry/relation-types.json`

Registers every relation type and its reciprocal label. Schema:
`src/core/schema/registry.ts` (`RelationTypesRegistrySchema`).

```json
{
  "schemaVersion": 1,
  "relations": {
    "capital-of": { "reciprocal": "capital" },
    "capital": { "reciprocal": "capital-of" }
  }
}
```

Every relation's `reciprocal` must point at another registered relation
whose own `reciprocal` points back — `npm run validate` checks this
symmetry. A relation can be its own reciprocal (e.g. `"allied-with"` ↔
`"allied-with"`) for symmetric relationships. The viewer computes and
shows both directions automatically from a single stored `relations[]`
entry on one entity — the reverse is never hand-maintained on the other
entity (not yet implemented; lands with the info panel in M3).

## `data/maps/<id>/map.json`

One per map (the top-level world map is `data/maps/world/map.json`;
nested maps, brief §4.4, get their own `<id>` from M4 on). Schema:
`src/core/schema/map.ts` (`MapConfigSchema`).

| Field                                     | Type                                                    | Notes                                                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                           | positive integer                                        |                                                                                                                                                                                                                                                    |
| `id`                                      | kebab-case string                                       | Must match the directory name — `npm run validate` checks this.                                                                                                                                                                                    |
| `name`                                    | string                                                  |                                                                                                                                                                                                                                                    |
| `parentEntity`                            | id (optional)                                           | The entity this map is nested under (brief §4.4). Absent for the world map.                                                                                                                                                                        |
| `unit`                                    | string                                                  | This map's own distance-unit display name — may differ from the world's (e.g. a city map might use `"m"`).                                                                                                                                         |
| `planeMetersPerUnit`                      | positive number                                         | This map's own scale factor, independent of the world's.                                                                                                                                                                                           |
| `theme`                                   | id (optional)                                           | Overrides `data/world.json`'s `defaultTheme` for this map. Must reference an existing `data/themes/<id>.json` (checked).                                                                                                                           |
| `defaultView.center` / `defaultView.zoom` | `[lng, lat]` / number                                   | Where the viewer opens this map.                                                                                                                                                                                                                   |
| `bounds`                                  | `[[minLng, minLat], [maxLng, maxLat]]`                  | Locks MapLibre's `maxBounds` — this map's canvas. For the world map this is (almost) the full Web Mercator extent; see `docs/DECISIONS.md` for why it's inset very slightly from the true `±180°`/`±85.0511288°`.                                  |
| `minZoom` / `maxZoom`                     | number (optional)                                       |                                                                                                                                                                                                                                                    |
| `layers`                                  | array of `{ id, name, types?, defaultVisible, zIndex }` | Declares every layer folder under this map's `layers/`. `types` (optional) restricts/documents which spatial entity `type`s belong in that layer — checked if set. `zIndex` controls draw order (higher paints on top) and must be unique per map. |

A layer folder with no corresponding entry in `layers` is flagged by
`npm run validate` ("exists on disk but isn't declared"). A declared
layer with no folder yet is fine (just empty).

## `data/maps/<id>/layers/<layer>/*.geojson`

Any number of standard GeoJSON `FeatureCollection` files per layer
folder — split them however makes sense (by region, era, whatever);
they're merged at load time. Every feature's `properties` validates
against one of four schemas based on `properties.type`
(`src/core/schema/entity.ts`): `PlaceFeatureSchema` (Point geometry),
`RegionFeatureSchema` (Polygon/MultiPolygon), `RouteFeatureSchema`
(LineString), `LabelFeatureSchema` (Point or LineString, requires
`text`).

Common `properties` fields (every spatial entity):

| Field         | Type                                                      | Notes                                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | kebab-case string                                         | Unique across the **whole repo**, not just this file/layer/map — checked by `npm run validate`.                                                                                                                                                 |
| `type`        | `"place" \| "region" \| "route" \| "label"`               | Fixed by the data model; determines which geometry type is required.                                                                                                                                                                            |
| `subtype`     | string (optional)                                         | Must be registered under this `type` in `data/registry/entity-types.json`.                                                                                                                                                                      |
| `name`        | string (optional)                                         | Display name. Required in practice for anything that should show a label (labels use `text` instead — see below).                                                                                                                               |
| `aliases`     | string[] (optional)                                       |                                                                                                                                                                                                                                                 |
| `summary`     | string (optional)                                         | One line; shown in the click popup (full info panel lands M3).                                                                                                                                                                                  |
| `tags`        | kebab-case string[] (optional)                            |                                                                                                                                                                                                                                                 |
| `rank`        | integer 1–5 (optional, default `3`)                       | Controls the zoom level the icon/label appears at — see `src/core/rank.ts`. 1 = always visible from the map's `minZoom`; 5 = only once zoomed well in. The exact per-rank zoom offsets are in `src/core/rank.ts`'s `ZOOM_OFFSET_BY_RANK` table. |
| `icon`        | string (optional)                                         | An id under `assets/icons/` (without `.svg`). Falls back to the entity's `subtype`, then to the generic `marker` icon, if unset/not found.                                                                                                      |
| `from` / `to` | `DateKey` (optional)                                      | Existence span (brief §4.3). Open-ended if one side is omitted; no dates at all means "timeless," always visible regardless of the timeline (not built until M4).                                                                               |
| `relations`   | array of `{ type, target, from?, to?, note? }` (optional) | `type` must be a registered relation (`data/registry/relation-types.json`); `target` must be another existing entity id. The reverse direction is computed from the registry's reciprocal label, never hand-maintained on the other entity.     |
| `status`      | `"canon" \| "draft" \| "retired"` (default `"canon"`)     | See `CLAUDE.md`'s "Status and visibility."                                                                                                                                                                                                      |
| `map`         | id (optional)                                             | A nested map this entity opens into (brief §4.4; viewer support lands M4).                                                                                                                                                                      |
| `images`      | array of `{ src, alt, caption? }` (optional)              |                                                                                                                                                                                                                                                 |
| `style`       | object (optional)                                         | Per-entity override, same shape as a theme's `TypeStyle` (`src/core/schema/theme.ts`). Not yet read by the viewer — layer styling currently only resolves from the theme; wiring this in is a small follow-up once a real use case needs it.    |
| `text`        | string                                                    | **Required for `label`-type entities only** — the actual label text.                                                                                                                                                                            |
| `rotation`    | number (optional)                                         | `label`-type, Point geometry only — rotates straight (non-curved) label text.                                                                                                                                                                   |

**Field ownership**: all of the above lives in the GeoJSON feature's
`properties` for a spatial entity. Its long-form lore body (if any)
lives separately in `lore/<type>/<id>.md`, whose frontmatter holds only
`id`/`type` plus any field not already present on the feature — the
same field must never be defined in both places (`npm run validate`
will reject that once the lore pipeline exists, M3). Non-spatial
entities (`person`, `faction`, …) are Markdown-only; every field lives
in frontmatter.

**Computed, never stored**: which region(s) a place geometrically sits
inside, what a region contains, nearest neighbors, and route
lengths/region areas in world units are all _derived_ at build/load
time (brief §6) — never hand-written as data. In particular, don't add
a `located-in`/`contains` relation for plain geometric containment
(e.g. "this village is inside this country" when the village's point
literally falls within the country's polygon) — that's exactly what
the (not-yet-built, M3) computed-facts pass is for. Reserve `relations`
for facts geometry alone can't tell you (`capital-of`, `ruler-of`,
`member-of`, …). The sample data (`data/maps/world/layers/`)
deliberately only records `sampleton`'s `capital-of` relation this way,
as a worked example.

## `data/themes/<id>.json`

Fully data-driven map styling — adding a theme is a new JSON file, no
code change. Schema: `src/core/schema/theme.ts` (`ThemeSchema`).

| Field                             | Type                                        | Notes                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schemaVersion`                   | positive integer                            |                                                                                                                                                                                         |
| `id`                              | kebab-case string                           | Must match the filename.                                                                                                                                                                |
| `name`                            | string                                      |                                                                                                                                                                                         |
| `background`                      | hex color                                   | The canvas/ocean background.                                                                                                                                                            |
| `fonts.decorative` / `fonts.sans` | string                                      | CSS `font-family` names — must be a family actually loaded (currently Cinzel / Inter via `@fontsource/*`, see `docs/DECISIONS.md` and `docs/ASSETS.md`).                                |
| `default`                         | `TypeStyle`                                 | Fallback style for anything `byType`/`bySubtype` don't cover.                                                                                                                           |
| `byType`                          | map of entity type → `TypeStyle` (optional) |                                                                                                                                                                                         |
| `bySubtype`                       | map of subtype → `TypeStyle` (optional)     | Wins over `byType`, which wins over `default` — merged field-by-field (including one level into `label`), not replaced wholesale. See `resolveTypeStyle` in `src/core/schema/theme.ts`. |

A `TypeStyle` is: `fill`, `fillOpacity`, `stroke`, `strokeWidth`,
`lineDasharray`, `pointColor`, `pointRadius` (all optional), plus a
nested `label` object (`font`: `"decorative"`\|`"sans"`, `color`,
`haloColor`, `haloWidth`, `size`, `letterSpacing`, `uppercase`).

Labels are rendered as a DOM/SVG overlay, not MapLibre symbol-layer
text — see `docs/DECISIONS.md`'s "Labels" entry for why, and
`src/map/LabelOverlay.tsx` for the renderer. `size` is the label's font
size in CSS px; there is currently no additional per-rank size scaling
beyond whatever `byType`/`bySubtype` already encode (e.g. `region`
labels are simply styled bigger in `atlas.json`).

Ships with one theme so far: `atlas` ("clean, modern" per brief §9).
`parchment` lands at M4.

## `assets/`

Doubles as Vite's `publicDir` (see `docs/DECISIONS.md`) — everything
under it is served verbatim at the site root, fetchable at runtime
(`${import.meta.env.BASE_URL}icons/city.svg`, etc.), not bundled into
the JS. `assets/icons/*.svg` are the icon source files (one per id,
referenced from `properties.icon`); `assets/icons/sprite.svg` is a
generated `<symbol>`-sprite build artifact (`npm run icons`) for future
DOM UI use (not yet consumed) — map markers themselves rasterize the individual
source SVGs directly (`src/map/icons.ts`), not the sprite. Fonts are
_not_ placed here — see `docs/DECISIONS.md`, they're self-hosted via
`@fontsource/*` npm packages instead. Full licensing/attribution log:
`docs/ASSETS.md`.

## `lore/<type>/<id>.md`

A non-spatial entity (`person`, `faction`, `event`, …), or a spatial
entity's long-form text — see "Field ownership" above for which. YAML
frontmatter + a Markdown body. Schema: `src/core/schema/lore.ts`
(`LoreFrontmatterSchema`). Parsed with `src/core/frontmatter.ts` (a
hand-rolled `---` split + `js-yaml`), not `gray-matter` — see
`docs/DECISIONS.md` for why.

| Field                                                             | Type                                                  | Notes                                                                                                                                                                                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                              | kebab-case string                                     | For a spatial entity's lore file, must match an existing feature id. For a non-spatial entity, this is where its id is assigned.                                                                                  |
| `type`                                                            | registered type id                                    | A spatial type (`place`/`region`/`route`/`label`) means this file is that feature's lore body; any other registered type (`data/registry/entity-types.json` → `nonSpatial`) means this file _is_ the entity.      |
| `name`                                                            | string (optional)                                     | Non-spatial entities only in practice — a spatial entity's `name` already lives on its feature, and defining it here too is a field-ownership violation.                                                          |
| `aliases`, `summary`, `tags`, `from`, `to`, `relations`, `images` | —                                                     | Same shape and meaning as the matching fields on a spatial feature (`docs/DATA_MODEL.md`'s layer-file section) — these are the fields `npm run validate` checks aren't _also_ set on a matching feature.          |
| `date`                                                            | `DateKey` (optional)                                  | A single point in time, for `event`-type entities that happen rather than span — distinct from `from`/`to`.                                                                                                       |
| `status`                                                          | `"canon" \| "draft" \| "retired"` (default `"canon"`) |                                                                                                                                                                                                                   |
| `location`                                                        | id or id[] (optional)                                 | Spatial entity id(s) this non-spatial entity should be shown at on the map. Not yet rendered as extra map markers (noted in `docs/PROGRESS.md`) — currently only used for schema completeness and future tooling. |

The Markdown body supports GitHub-flavored Markdown (tables, strikethrough,
task lists, …) plus `[[entity-id]]` / `[[entity-id|display text]]` wiki
links, sanitized before rendering (`src/content/Markdown.tsx`) so a lore
edit can never inject HTML/scripts into the viewer.

## The unified entity graph (`src/content/entities.ts`)

Every spatial feature (across every map) and every lore file are merged
into one `Entity` per id at load time — the shape every UI component
(`InfoPanel`, `BrowseView`, `SearchBox`) reads, so nothing needs to know
whether a given field came from a GeoJSON feature or a lore file's
frontmatter. Built once per page load; nothing is cached to disk or
precomputed by a build script, since the whole world's data is already
in memory for a static site either way (brief §6's "computed, never
hand-maintained" is satisfied by _when_ it's computed, not by a
separate build artifact — see `docs/DECISIONS.md`).

- **Backlinks**: the reverse of every `relations[]` entry, labeled with
  the registered reciprocal type, attached to the _target_ entity —
  never hand-written on both ends.
- **Computed spatial facts** (`src/content/computed.ts`): which
  region(s) a point-geometry entity falls inside (even-odd ray casting,
  `src/core/geometry.ts`'s `pointInRing`/`pointInPolygonRings`), a
  route's length, a region's area — all in the owning map's own world
  units.

## Routing and deep links

Hash-based (brief §3): `#/?e=<id>` opens that entity's info panel over
the map (brief's "a deep link for every entity"); `#/browse?...` opens
the Browse view. `src/routing/useHashRoute.ts` is the whole router — no
routing library; see `docs/DECISIONS.md`. Back/forward works via the
browser's native history, since setting `location.hash` already pushes
an entry.

## Search (`src/content/search.ts`)

A MiniSearch index over every entity's `name`/`aliases`/`tags`/
`summary`/lore body, built once at load. Not persisted; rebuilt fresh
on every page load from the same in-memory entity graph.

## What doesn't exist yet

Nested maps aren't created until a later milestone references them
(M4) — see `docs/PROGRESS.md`.
