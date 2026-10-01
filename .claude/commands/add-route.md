---
description: Add a new route (road, river, sea-lane, trade-route, or border) to the map
argument-hint: <description of the route, e.g. "a road connecting Stormhaven to the capital">
---

Add a new spatial `route` entity (a LineString). $ARGUMENTS

Follow `CLAUDE.md`'s standard edit workflow:

1. `npm run find -- <keywords>` to check it doesn't already exist, and `npm run show` on both endpoints to get their real coordinates.
2. Build the geometry — don't hand-write coordinates:
   - A straight or gently-meandering path between two points: `npm run shape -- route --from <lng,lat> --to <lng,lat> --meander <0-1 fraction of the distance> --seed <n>`.
   - A river following terrain you already know the shape of: author the LineString by hand in a scratch file.
     Pipe the shape's output into `add` with `--geometry-file -`, or save to a file first.
3. Pick a kebab-case `id`, a registered `subtype` (road/river/sea-lane/trade-route/border), and `rank`.
4. `npm run add -- route <id> --map <mapId> --layer <layerId> --name "<name>" --subtype <subtype> --geometry-file <path|-> --rank <n> [--summary "..."] [--tags a,b] [--relation type:target ...]`.
5. `npm run format:data && npm run validate`, then `npm run snapshot -- --id <id>` and check the path visually — does it actually connect the places it's supposed to, without crossing something it shouldn't?
6. `npm run measure -- <from-id> <to-id>` to report the route's real-world length/travel-time alongside the id.
7. Report the id, how the geometry was generated, and the measured length.

If the route would need to cross a region/border in a way that contradicts existing canon (e.g. a road through a sea no ferry/bridge is recorded for), stop and ask.
