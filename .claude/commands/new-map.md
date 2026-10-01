---
description: Scaffold a new nested map (e.g. zooming into a city, a building interior)
argument-hint: <what the map is of, and which existing entity it zooms into>
---

Scaffold a new nested map. $ARGUMENTS

1. Confirm the parent: the entity this map zooms into (a place, usually) must already exist — `npm run show -- <parent-id>` to confirm its id and that it doesn't already have a `map` of its own.
2. Pick sensible scale parameters for the nested map's own coordinate space — it is **independent** of the parent map's coordinates (see `docs/DATA_MODEL.md` on nested maps): a city map might use `--unit m --plane-meters-per-unit 1`, bounds a few hundred meters across; a building interior smaller still.
3. `npm run new-map -- <id> --name "<name>" --parent-entity <parent-id> --unit <unit> --plane-meters-per-unit <n> --center 0,0 --zoom <n> --half-size <n> [--theme <id>]`. This also writes `map: "<id>"` back onto the parent entity's feature automatically.
4. Add whatever layers it needs beyond the default `places`: `npm run new-layer -- <id> <layerId> --name "<name>" [--types a,b]`.
5. Add its content with `/add-place` etc., targeting `--map <id>`.
6. `npm run format:data && npm run validate`, then `npm run snapshot -- --map <id>` to look at the empty/seeded map.
7. Report the new map id and how to reach it (the parent entity's info panel now has an "Open map" link).

If it's unclear whether this should be a whole new nested map versus just more detail on the existing map, ask — nested maps are for a genuine scale jump (zooming into a city's streets), not for mild extra detail at the same scale.
