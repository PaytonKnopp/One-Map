---
description: Add a historical event to the timeline
argument-hint: <what happened, roughly when, and where>
---

Add a new `event` entity. $ARGUMENTS

Events are non-spatial (Markdown-only, no GeoJSON feature of their own) and happen at a single point in time, not a span.

1. Read `lore/_world-bible.md` and `npm run show` on everything this event involves (places, factions, people) — check the date actually fits what's already on the timeline and doesn't contradict an existing event or relation.
2. Pick a kebab-case `id`, and a `date: {y, m?, d?}` using the world's calendar (`data/world.json` → `calendar`; `currentYear` is the present day — an event can be in the past up to it, or stop and ask if it would be in the future).
3. Create `lore/event/<id>.md`:
   ```
   ---
   id: <id>
   type: event
   name: <Name>
   summary: <one line>
   tags: [...]
   status: canon
   date:
     y: <year>
   relations:
     - type: occurred-at
       target: <place-or-route-id>
   ---

   <Long-form account, with [[id]] wiki links to everyone/everywhere involved.>
   ```
   Add further relations for factions/people involved as fits (e.g. `has-member`-adjacent context lives on the faction/person entities themselves, not duplicated here).
4. `npm run format:data && npm run validate`.
5. Report the id, the date chosen and why, and confirm it now shows up at the right point on the timeline (`npm run show -- <id>`).

If the event's date or participants would contradict existing canon (someone already dead, a place that didn't exist yet), stop and ask rather than silently adjusting either side.
