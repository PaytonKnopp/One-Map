---
description: Edit an existing entity's fields, text, location, or id
argument-hint: <id or name of the entity, and what should change>
---

Edit an existing entity. $ARGUMENTS

1. `npm run find -- <keywords>` to locate the exact id if not given, then `npm run show -- <id>` to see its full current state (fields, relations, backlinks, lore body) before changing anything.
2. Figure out which kind of edit this is, and use the right tool — don't hand-edit JSON/Markdown for anything these scripts cover:
   - **Renaming the display name**: just edit `name` in the feature/frontmatter directly. The `id` never changes for a rename.
   - **Changing the id itself** (rare — only if the id was wrong/typo'd, never for a display-name change): `npm run rename-id -- <old-id> <new-id>`. Updates every relation, wiki link, and map `parentEntity` reference atomically.
   - **Moving it**: `npm run move -- <id> <lng,lat>` (a Point) or `npm run move -- <id> --offset <distance> <direction>` (any geometry, preserves shape).
   - **Changing a structured field** (tags, rank, status, subtype, dates, a relation): edit the GeoJSON feature's `properties` (spatial fields) or the lore frontmatter (non-spatial fields) directly — see "Field ownership" in `CLAUDE.md` for which file owns which field.
   - **Changing the long-form text**: edit the lore Markdown body directly. Preserve the existing tone/voice — don't rewrite it generically.
3. `npm run format:data && npm run validate`.
4. If geometry changed, `npm run snapshot -- --id <id>` and look at it.
5. Report what changed and why.

Before editing: check "Consistency duty" in `CLAUDE.md`. If the edit would contradict other canon, or **never silently change existing lore** beyond what was asked — stop and ask instead of also "fixing" nearby things that weren't part of the request.
