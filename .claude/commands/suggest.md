---
description: Propose new canon ideas (places, lore, connections) without writing anything yet
argument-hint: [optional steer, e.g. "something for the empty region south of Sample Country"]
---

Propose ideas — write nothing yet. $ARGUMENTS

Per `CLAUDE.md`: "don't invent major new canon unasked" — this command is the sanctioned way to float ideas for Payton to accept, tweak, or reject before anything is written.

1. Read `lore/_world-bible.md` for tone/conventions, and skim the current world via `npm run find` / `npm run show` / the browse view to see what already exists and where the gaps are (empty map regions, entities with no lore, factions with no members, a timeline era with no events, loose "needs-name" tags).
2. Propose 2-4 concrete, specific ideas (not vague categories) that fit what's already established — each with: what it is, roughly where/when it'd fit, and why it fits the existing canon (point at the specific entity/convention it connects to).
3. For each, note what it would take to add (a place + lore file; a new event; a new relation between two existing entities) so Payton can say "yes, do #2" and have that turn directly into a `/add-*` command.
4. Don't write any file, run `add`/`new-type`/etc., or commit anything in this command — it's proposal-only.

If Payton approves one, that becomes a normal `/add-place`, `/add-lore`, `/add-event`, etc. in a follow-up request.
