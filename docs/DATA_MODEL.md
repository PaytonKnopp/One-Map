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

## Field ownership (not yet relevant — no spatial/lore entities exist yet)

Once entities exist (M2+): a spatial entity's structured fields live in
its GeoJSON feature `properties`; its long-form text lives in
`lore/<type>/<id>.md`, whose frontmatter holds only `id`/`type` plus any
field not already present on the feature. `npm run validate` will reject
a field defined in both places. Non-spatial entities are Markdown-only —
all their fields live in frontmatter.

## What doesn't exist yet

`data/maps/`, `data/themes/`, `lore/<type>/*.md` (beyond the placeholder
`lore/_world-bible.md`), and `assets/` are not created until later
milestones reference them — see `docs/PROGRESS.md`.
