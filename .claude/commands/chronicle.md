---
description: Summarize recent changes to the world in plain terms (not the same as the site's auto-generated Chronicle page)
argument-hint: [optional range, e.g. "since last week" or "the last 10 commits"]
---

Summarize recent world activity. $ARGUMENTS

The site's own "Chronicle" page (`src/ui/ChroniclePage.tsx`) already shows raw recent commit messages, grouped by date, generated automatically at build time from `git log` — you don't need to (and can't usefully) regenerate that; it's not a file you write.

This command is different: a plain-language digest for Payton, not in-world prose.

1. `git log --oneline -n 30` (or a date range if given) to see what's actually changed recently.
2. Group it sensibly: new entities added (by kind), lore expanded, edits/moves/renames, deletions, tooling/doc changes. Skip pure formatting/chore commits unless asked.
3. For each meaningful content change, one line: what was added/changed and its id, not the raw commit message.
4. If a cluster of related additions looks substantial enough to deserve its own in-world `event` entity (e.g. several related places/factions added together that tell a story), say so as a suggestion — don't create it unasked (see `/suggest` and `CLAUDE.md`'s "don't invent major new canon unasked").
5. Flag anything left unresolved: a dangling reference someone reported but didn't fix, an entity still tagged `needs-name`, an open question logged in `docs/PROGRESS.md`.

Keep the output short and scannable — this is a status digest, not a narrative.
