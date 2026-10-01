# CLAUDE.md

This is a lifelong, ever-expanding fictional-world map. Payton builds one
world over his whole life as a zoomable map with names, icons, regions,
routes, lore, and history. **"One World" is a placeholder project name** —
the world's real name lives in exactly one place, `data/world.json` →
`name`, and nowhere else. Never hard-code it in UI, page titles, READMEs,
or docs; if you need to refer to it in prose, say "the world (currently
called One World)".

Canon lives in `data/` (GeoJSON — spatial entities, config) and `lore/`
(Markdown + YAML frontmatter — long-form text and non-spatial entities).
No database, no backend. Everything the site needs is in this repo or
generated at build time. The repo is **public** — see "Public repo" below.

> **Build status:** as of 2026-10-01 this project has completed
> Milestones 1–5 (Foundation, Map core, Info layer, Depth, Tooling) of
> the plan in the original build brief. A real map viewer exists
> (MapLibre, two themes with a switcher, a small tagged-`sample` seed
> world including a nested city map, 2 people, 2 factions, 3 events)
> with a working info panel, lore rendering + wiki links, search, a
> browse view, a timeline, a measure tool, and chronicle/about pages.
> Every helper script this file describes now exists (`find`, `show`,
> `where`, `offset`, `measure`, `shape`, `add`, `move`, `delete`,
> `rename-id`, `new-map`, `new-layer`, `new-type`, `snapshot`,
> `export`, `clear-sample`, `icons`) and every one supports `--help`.
> `.claude/commands/` has the slash commands this file's workflow maps
> to. Only Milestone 6 (hardening: accessibility, mobile, performance,
> final docs) remains — check `docs/PROGRESS.md` for exactly what's
> left there.

## The standard edit workflow

1. Read `docs/DATA_MODEL.md` for field definitions, and `lore/
_world-bible.md` if the request touches lore, naming, tone, or world
   rules.
2. Use `find`/`show` to see what already exists before adding
   anything — avoid duplicates, and check for conflicts (see "Consistency
   duty" below).
3. Make minimal, targeted edits. Don't refactor or "clean up" unrelated
   data while you're in a file.
4. Use the helper scripts for geometry (`offset`, `measure`, `shape`)
   rather than hand-computing or guessing coordinates.
5. Run `npm run format:data` then `npm run validate`. Both must pass.
6. If you changed geometry, run `npm run snapshot` and actually look
   at the image — verify placement, labels, and that nothing overlaps
   badly before calling the change done.
7. Commit with a clear, single-purpose message, prefixed `add:`, `edit:`,
   `delete:`, `lore:`, `fix:`, or `chore:`. One logical change per commit.
8. Report back: which entity/file IDs changed, any assumptions you made,
   and anything that needs Payton's decision.

## Interpreting requests

- **Vague placement** ("a port city at the mouth of the Silverrun", "north
  of Stormhaven near the coast"): compute it with the geometry helpers
  (`where`, `offset`), look at the snapshot, and tell Payton the
  resulting coordinates and what you assumed.
- **Unnamed things**: propose a name that fits the world bible's naming
  conventions (`lore/_world-bible.md`). If the world bible doesn't cover
  that culture/region yet, or Payton hasn't chosen, tag the entity
  `needs-name` instead of inventing a final name.
- **Ambiguous scope**: if a request could mean one small edit or a
  sprawling addition, do the small, literal reading and mention the
  larger interpretation as an option — don't build the larger one
  unasked.

## Consistency duty

Before adding anything, check it against existing canon: dates (does this
fit the timeline?), geography (does this location make sense given what's
already mapped?), relations (does this contradict an existing relation?),
names (is this name already used, or does it clash in style?).

- If a request **contradicts existing canon**, stop and ask before
  writing — don't silently resolve the conflict either direction.
- **Never silently change existing lore.** Edits to existing entries only
  happen when asked, and must preserve the existing entry's tone and
  voice, not replace it with a generic one.
- **Don't invent major new canon unasked.** Small, load-bearing details
  needed to fulfill a request (a name, a minor date) are fine per
  "Interpreting requests" above. A new faction's founding myth, a new
  war, a new rule of magic — that's new canon; propose it separately,
  clearly labeled as a suggestion, and wait.

## Destructive changes

Nothing is ever truly lost — it's all in Git history, and this project
never force-pushes or rewrites history. Still:

- **Any deletion of more than ~5 entities, or any lore file with
  substantial text**, requires listing exactly what will be removed and
  getting Payton's confirmation first.
- Every deletion must clean up (or clearly report) every dangling
  reference it creates — relations pointing at the deleted entity, wiki
  links, `location`/`map` references, etc.
- Destructive requests Payton makes explicitly are fine to execute — the
  rule above is about _scope confirmation_, not refusal.

## IDs

Every entity has an immutable, kebab-case `id` (`stormhaven`,
`silverrun-river`), unique across the whole repo (`src/core/ids.ts`
defines the format). **Renaming changes `name`, never `id`.** If an ID
genuinely must change, that's the `rename-id` script — it updates
every reference atomically. Never hand-edit an ID that's already
referenced elsewhere.

## Field ownership

A spatial entity's structured fields (name, type, tags, dates, relations,
…) live in its GeoJSON feature `properties`. Its long-form text lives in
`lore/<type>/<id>.md`, whose frontmatter holds only `id`/`type` plus any
field not already on the feature. The same field must never be defined in
both places — `npm run validate` rejects that. Non-spatial entities
(`person`, `faction`, `event`, …) are Markdown-only; every field lives in
frontmatter. Details and examples: `docs/DATA_MODEL.md`.

## Status and visibility

`status` is `canon` (default), `draft`, or `retired`. `draft` is hidden
from the production build by default; `retired` is shown only via a
viewer toggle. **Both are still fully public in the Git history** — status
controls viewer visibility, not repo visibility. Don't use `draft`/
`retired` as a substitute for the `private/` folder below.

## Public repo

Everything committed here is public, including `draft`/`retired`
content. For anything Payton never wants published — notes to self, real
names, anything sensitive — use the gitignored `private/` folder. Never
commit something there "temporarily."

## Commands cheat sheet

```
npm run dev          # local dev server
npm run build         # typecheck + production build
npm run test           # unit tests
npm run validate       # schema + cross-reference + canonical-format checks
npm run format:data    # canonically reformat data/**/*.json, data/**/*.geojson
npm run lint / format  # code (not data) linting/formatting
npm run icons           # rebuild assets/icons/sprite.svg from assets/icons/*.svg
```

```
npm run find -- <text>                    search by name/alias/tag/summary
npm run show -- <id>                       print an entity's full record
npm run where -- <lng,lat> [--map]          what contains this point; nearest entities
npm run offset -- <id|lng,lat> <dist> <dir> compute a point at a distance/bearing
npm run measure -- <a> <b> [--map]          planar distance (+ travel time)
npm run shape -- <circle|rectangle|blob|route> ...   generate geometry
npm run add -- <type> <id> --map <m> --layer <l> ...  add a spatial entity
npm run move -- <id> <lng,lat> | --offset <dist> <dir>
npm run delete -- <id> [<id> ...] [--yes]   delete entities, reports dangling refs
npm run rename-id -- <old-id> <new-id>      change an id everywhere, atomically
npm run new-map -- <id> [--parent-entity ...]
npm run new-layer -- <mapId> <layerId>
npm run new-type -- subtype|non-spatial|relation ...
npm run snapshot -- [--id <id> | --center ... | --bbox ...]  screenshot a map view
npm run export                               backup data/lore/assets to backups/
npm run clear-sample [-- --yes]              remove all sample-tagged content
```

Every one of these supports `--help`. `.claude/commands/` wraps the
common requests (`/add-place`, `/add-region`, `/add-route`,
`/add-lore`, `/add-event`, `/edit`, `/delete`, `/new-map`,
`/check-world`, `/chronicle`, `/suggest`) around these scripts plus
this file's workflow — use those for anything they cover rather than
reinventing the steps by hand.

## File map

```
data/world.json             world name, scale, calendar, defaults
data/registry/               entity + relation type registry
data/maps/<id>/map.json      per-map config, layers, bounds
data/maps/<id>/layers/<l>/   GeoJSON feature folders
data/themes/*.json           map styling, fully data-driven
lore/_world-bible.md          canon reference — read before lore work
lore/<type>/<id>.md           non-spatial entities + spatial lore bodies
assets/icons/                icon source SVGs + generated sprite (npm run icons)
assets/vendor/                gitignored, regenerated by Vite — not yours to edit
src/core/                    geometry, calendar, ids, rank, schemas — shared by app + scripts
src/map/                     the viewer: MapLibre setup, label overlay, scale bar, icons
src/                         viewer (React + MapLibre)
scripts/                     Node CLI tools (run as plain .ts, see docs/DECISIONS.md)
docs/                        DATA_MODEL, DECISIONS, SCALING, ASSETS, ROADMAP, PROGRESS
private/                     gitignored — never published
```

## Conventions

- **Naming**: entity `name` is display text (can change anytime); `id` is
  permanent kebab-case. Tags are lowercase kebab-case, free-form, reused
  consistently (check `find`/existing data before inventing a new tag
  that duplicates one that already exists, once that tooling lands).
- **Rank** (spatial entities, 1–5): controls the zoom level a label/icon
  appears at — 1 is most prominent (always visible, e.g. a capital or a
  sea), 5 is least (a minor camp, only visible fully zoomed in).
- **Icons**: referenced by id from `assets/icons/<id>.svg` (falls back to
  `subtype`, then the generic `marker` icon). Run `npm run icons` after
  adding one to regenerate the DOM-UI sprite.

## Extending the model

- **New entity/relation type**: `npm run new-type -- subtype|non-spatial|relation ...`
  (or edit `data/registry/entity-types.json` / `relation-types.json`
  directly) — never a code change. See `docs/DATA_MODEL.md`.
- **New layer**: `npm run new-layer -- <mapId> <layerId>` (or add the
  folder and declare it in that map's `map.json` by hand).
- **New theme**: add `data/themes/<id>.json` — no code change.
- **New nested map**: `npm run new-map -- <id> --parent-entity <id>`
  scaffolds `data/maps/<id>/` and cross-links the parent entity.
- **Calendar change**: see `docs/DATA_MODEL.md`'s `world.json` section for
  what changing month counts/lengths does and doesn't invalidate.

## When to stop and ask vs. decide

**Decide and proceed**, documenting the assumption in your report: exact
coordinates for a vaguely-described location, a name that fits an
established culture's conventions, which existing tag applies, minor
formatting/structural choices.

**Stop and ask**: the request contradicts existing canon; it would
delete more than ~5 entities or a substantial lore file; it invents
major new canon (not just a load-bearing detail); the world bible
doesn't cover something the request depends on (e.g. no naming
convention exists yet for the culture involved); or you're genuinely
unsure whether Payton wants the literal or the expansive reading of a
request.
