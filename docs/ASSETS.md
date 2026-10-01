# Assets: licensing, attribution, image rules

What's under `assets/` (this project's Vite `publicDir` — see
`docs/DECISIONS.md`), with every third-party license and attribution
this project owes. Keep this accurate as you go.

## Rules (apply to every asset added)

- **No runtime third-party calls.** No font CDNs, no icon CDNs, no tile
  servers. Everything the site needs ships from this repo (or is
  installed via npm and bundled at build time) into the static output.
- **Size:** binary assets over 1 MB get a warning from `npm run
validate` (not yet implemented as a check — tracked in
  `docs/PROGRESS.md`; not a hard failure either way). Prefer SVG for
  icons/line art and WebP for raster images. No Git LFS unless
  explicitly requested later.
- **Licensing:** every third-party asset gets an entry below — source,
  license, and (if the license requires it) the attribution text, which
  also needs to appear in the viewer's About/credits page (M4) for any
  license that requires on-product attribution (e.g. CC BY). Neither
  Lucide (ISC) nor the OFL fonts below require on-product attribution,
  but both are credited here for transparency anyway.
- **Original art/content** (anything Payton draws or writes) falls under
  `CONTENT-LICENSE.md`, not this file.

## Icons

`assets/icons/*.svg` — a curated subset of [Lucide](https://lucide.dev)
(ISC license, no attribution required), copied in as individual files
and committed (not a live dependency on `lucide-static` — see
`docs/DECISIONS.md`). One per registered `place` subtype, plus a
generic fallback:

| icon id    | Lucide source icon | used for                                |
| ---------- | ------------------ | --------------------------------------- |
| `city`     | `building-2`       | place subtype `city`                    |
| `town`     | `houses`           | place subtype `town`                    |
| `village`  | `home`             | place subtype `village`                 |
| `fortress` | `castle`           | place subtype `fortress`                |
| `port`     | `anchor`           | place subtype `port`                    |
| `temple`   | `church`           | place subtype `temple`                  |
| `ruin`     | `columns-2`        | place subtype `ruin`                    |
| `landmark` | `landmark`         | place subtype `landmark`                |
| `camp`     | `tent`             | place subtype `camp`                    |
| `marker`   | `map-pin`          | fallback for any unmatched icon/subtype |

Drop a new permissively-licensed SVG into `assets/icons/<id>.svg` to add
more — reference it from an entity's `icon` field (or let it fall back
by `subtype`/the generic `marker`). Run `npm run icons` afterward to
rebuild `assets/icons/sprite.svg` (a `<symbol>`-sprite for future DOM UI
use, e.g. a legend or filter panel — map markers themselves rasterize
the individual source files directly, see `src/map/icons.ts`).

If a game-icons.net icon is ever added, it needs a CC BY 3.0 attribution
line here _and_ a corresponding credit in the viewer's About page (not
built yet) — that license, unlike Lucide's, requires on-product credit.

## Fonts

Self-hosted via `@fontsource/*` npm packages (OFL 1.1 — license files
verified in `node_modules/@fontsource/*/LICENSE`), not files physically
committed under `assets/fonts/` — see `docs/DECISIONS.md` for why.
Imported in `src/main.tsx`, only the weights actually used:

| Role                             | Font                                               | Source               | Weights imported |
| -------------------------------- | -------------------------------------------------- | -------------------- | ---------------- |
| `decorative` (region/title text) | [Cinzel](https://fonts.google.com/specimen/Cinzel) | `@fontsource/cinzel` | 400, 700         |
| `sans` (general labels)          | [Inter](https://rsms.me/inter/)                    | `@fontsource/inter`  | 400, 500, 700    |

A theme references these by role (`"decorative"` / `"sans"`), not by
raw font-family string — see `data/themes/atlas.json`'s `fonts` field
and `docs/DATA_MODEL.md`. To add a third font/role, `npm install` the
matching `@fontsource/*` package, import the weights needed in
`src/main.tsx`, and reference the family name from a theme.

Regenerating/updating: just `npm update @fontsource/cinzel
@fontsource/inter` (or bump the pin in `package.json`) — there's no
separate build step, Vite bundles the CSS + `.woff2`/`.woff` files
directly from the installed package.

## Images

None yet. When added: WebP preferred, alt text required in the entity's
`images[]` field (accessibility, brief §8).

## Third-party asset log

| Asset                                     | Source                                                                            | License | Attribution required? |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ------- | --------------------- |
| Icon set (`assets/icons/*.svg`, 10 files) | [Lucide](https://lucide.dev)                                                      | ISC     | No                    |
| Cinzel font                               | [Google Fonts](https://fonts.google.com/specimen/Cinzel) via `@fontsource/cinzel` | OFL 1.1 | No                    |
| Inter font                                | [rsms.me/inter](https://rsms.me/inter/) via `@fontsource/inter`                   | OFL 1.1 | No                    |
