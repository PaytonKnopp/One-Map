---
description: Add or expand long-form lore — a non-spatial entity (person/faction/item/creature/religion/culture/concept/note) or a spatial entity's lore body
argument-hint: <who/what, and what should be written about them>
---

Add or expand lore. $ARGUMENTS

Follow `CLAUDE.md`'s standard edit workflow and "Consistency duty" section before writing anything:

1. Read `lore/_world-bible.md` for tone, naming conventions, and established rules this needs to fit.
2. `npm run find -- <keywords>` and `npm run show -- <id>` on anything related — check this doesn't already exist, doesn't contradict an existing relation/date/fact, and matches established naming style.
3. If this is a **non-spatial entity** (person/faction/item/creature/religion/culture/concept/note): check `data/registry/entity-types.json` has the type registered (`new-type -- non-spatial <type>` if not). Create `lore/<type>/<id>.md` with ALL structured fields in frontmatter (`id`, `type`, `name`, `tags`, `status`, `relations`, `from`/`to`, …) and the long-form text as the Markdown body, using `[[id]]` / `[[id|display text]]` wiki links to connect to other entities.
4. If this is **lore for an existing spatial entity**, edit/create `lore/<type>/<id>.md` with frontmatter holding only `id`/`type` — every structured field already lives on the GeoJSON feature; don't duplicate it (`npm run validate` will reject a field defined in both places).
5. Declare each relation **once**, on whichever side reads more naturally — the reciprocal shows up automatically as a computed backlink on the other entity; don't declare both directions by hand.
6. `npm run format:data && npm run validate`.
7. Report: the id, which relations/wiki-links you added, and anything you flagged as a new-canon suggestion rather than writing outright (see "Don't invent major new canon unasked" in `CLAUDE.md`).

If the request contradicts existing canon, or invents something bigger than a small load-bearing detail (a new faction's founding myth, a new war, a new rule of magic), stop and propose it separately instead of writing it in.
