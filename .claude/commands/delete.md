---
description: Delete one or more entities
argument-hint: <id(s) or description of what to delete>
---

Delete entities. $ARGUMENTS

1. `npm run find -- <keywords>` to resolve exact id(s) if not given, and `npm run show -- <id>` on each to see what currently references it (relations, backlinks) before removing anything.
2. Per `CLAUDE.md`'s "Destructive changes" rule: if this is **more than ~5 entities, or any lore file with substantial text**, list exactly what will be removed (ids, and a one-line description of each) and get Payton's explicit confirmation before running the delete — don't just proceed because the tool allows `--yes`.
3. `npm run delete -- <id> [<id> ...] [--yes if >5]`. Read its dangling-reference report — it tells you every remaining relation/wiki link that now points at nothing; it does not fix these for you.
4. Fix every dangling reference it reported (edit the other entity's relation/wiki link, or ask Payton how it should be resolved if it's not obvious).
5. `npm run validate` — must pass clean, no leftover dangling references.
6. Report: what was deleted, what dangling references you found and how you resolved each.

Nothing is ever truly lost (it's all still in Git history), but a deletion is still a real content change — don't treat `--yes` as permission to skip the confirmation step above.
