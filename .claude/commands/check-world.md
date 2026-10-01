---
description: Run the full validation/health check over the whole world and report what's wrong
argument-hint: [optional focus, e.g. "just the sampleton-city map"]
---

Run a full health check. $ARGUMENTS

1. `npm run validate` — schema errors, cross-reference errors (dangling relation/map targets, duplicate ids, missing icons/assets), and canonical-format drift. Report every error and warning, not just a pass/fail.
2. `npm run typecheck && npm run lint && npm run test` — code-level checks; these should basically never fail unless a script/source file was hand-edited incorrectly.
3. `npm run format:check` — if this fails, offer to run `npm run format` (code) or `npm run format:data` (data) to fix it, rather than leaving it dirty.
4. Scan for things `validate` doesn't catch:
   - Entities with no lore file and no summary (a validate warning already flags missing lore; also check for ones Payton might want fleshed out).
   - Any `status: draft` entity older than it should plausibly still be draft for (use judgment, don't guess at "should").
   - Orphaned sample content: `npm run clear-sample` (no `--yes`) to confirm exactly what's still tagged `sample`, in case some was meant to be replaced already.
5. Report a clear summary: what's clean, what's broken (with exact file/id), what's just a style nit, and anything you're flagging for Payton's judgment rather than fixing yourself.

This command never fixes content issues on its own initiative beyond formatting — report findings and let Payton decide what to do about lore/canon-level problems it surfaces.
