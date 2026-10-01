---
description: Add a new place (city, town, village, fortress, port, temple, ruin, landmark, or camp) to the map
argument-hint: <description of the place, e.g. "a fishing village north of Stormhaven on the coast">
---

Add a new spatial `place` entity. $ARGUMENTS

Follow `CLAUDE.md`'s standard edit workflow:

1. Read `lore/_world-bible.md` if naming or tone matters here.
2. `npm run find -- <keywords>` to check this doesn't already exist and to see neighboring entities. Use `npm run where -- <lng,lat> --map <id>` and `npm run offset -- <id> <distance> <direction>` to resolve a vague location into real coordinates — never guess numbers by hand.
3. Pick a kebab-case `id` (permanent — never renamed later without `rename-id`), an appropriate `subtype` (check `data/registry/entity-types.json` for the registered place subtypes; propose a new one via `new-type` only if truly none fit, and say so in your report), and a `rank` 1–5 (1 = always visible, 5 = only at full zoom).
4. Create it: `npm run add -- place <id> --map <mapId> --layer <layerId> --name "<name>" --subtype <subtype> --point <lng,lat> --rank <n> [--summary "..."] [--tags a,b] [--relation type:target ...]`.
5. If it needs long-form lore text, add `lore/place/<id>.md` with frontmatter holding only `id`/`type` (everything else already lives on the feature — see "Field ownership" in `CLAUDE.md`).
6. `npm run format:data && npm run validate` — both must pass.
7. `npm run snapshot -- --id <id>` and actually look at the PNG: placement, label, icon, no bad overlap.
8. Report: the new id, the coordinates you computed and how, any assumption made (especially an invented name — flag it clearly so Payton can confirm or rename it later).

If the request contradicts existing geography/canon, or the world bible has no naming convention for this culture/region yet, stop and ask instead of guessing.
