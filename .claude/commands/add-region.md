---
description: Add a new region (country, province, biome, sea, forest, or desert) to the map
argument-hint: <description of the region, e.g. "a desert covering the southern half of the continent">
---

Add a new spatial `region` entity (a Polygon or MultiPolygon). $ARGUMENTS

Follow `CLAUDE.md`'s standard edit workflow:

1. Read `lore/_world-bible.md` if naming or tone matters here.
2. `npm run find -- <keywords>` to check it doesn't already exist. Use `npm run show -- <id>` on neighboring regions/places to understand what's already there so the new boundary doesn't overlap or contradict existing geography.
3. Build the geometry — don't hand-write coordinates:
   - A rough circular/blob territory: `npm run shape -- blob --center <lng,lat> --radius <meters> --roughness <0-1> --seed <n>` (pipe its output into `add` via `--geometry-file -`).
   - A rectangle: `npm run shape -- rectangle --center <lng,lat> --width <m> --height <m>`.
   - Otherwise author the Polygon/MultiPolygon by hand in a scratch file and pass `--geometry-file <path>`.
4. Pick a kebab-case `id`, a registered `subtype` (`data/registry/entity-types.json`), and a `rank`.
5. `npm run add -- region <id> --map <mapId> --layer <layerId> --name "<name>" --subtype <subtype> --geometry-file <path|-> --rank <n> [--summary "..."] [--tags a,b] [--relation type:target ...]`.
6. Add `lore/place/<id>.md` (or the matching type folder) if it needs long-form text — frontmatter holds only `id`/`type`.
7. `npm run format:data && npm run validate`, then `npm run snapshot -- --id <id>` and look at the image — check the boundary visually before calling it done.
8. Report the id, how the shape was generated (seed/params, so it's reproducible), and any assumption made.

If the described boundary would overlap or contradict an existing region/border in a way that doesn't make sense, stop and ask rather than silently resolving it.
