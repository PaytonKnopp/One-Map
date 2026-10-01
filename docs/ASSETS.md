# Assets: licensing, attribution, image rules

Nothing lives under `assets/` yet — this file is a stub, filled in as
icons (M2/M5), fonts (M2), and images (as you add them) actually land.
Keep it accurate as you go; it's where every third-party license and
attribution this project owes gets recorded.

## Rules (apply from the first asset added onward)

- **No runtime third-party calls.** No font CDNs, no icon CDNs, no tile
  servers. Everything the site needs ships from this repo and is built
  into the static output.
- **Size:** binary assets over 1 MB get a warning from `npm run validate`
  (not a hard failure). Prefer SVG for icons/line art and WebP for
  raster images. No Git LFS unless explicitly requested later.
- **Licensing:** every third-party asset gets an entry below — source,
  license, and (if the license requires it) the attribution text, which
  also needs to appear in the viewer's About/credits page (M4) for any
  license that requires on-product attribution (e.g. CC BY).
- **Original art/content** (anything Payton draws or writes) falls under
  `CONTENT-LICENSE.md`, not this file.

## Icons

Not added yet. Planned: a permissively-licensed base set (Lucide, ISC
license — no attribution required) referenced by id through an
`svgstore`-built SVG sprite (`npm run icons` regenerates it, M5). If
game-icons.net icons are added later, each one needs a CC BY 3.0
attribution line here and a corresponding credit in the viewer's About
page.

## Fonts

Not added yet. Planned: two OFL-licensed webfonts (one decorative serif
for region/title text, one clean sans for general labels), self-hosted
under `assets/fonts/`. See `docs/DECISIONS.md` for the open question
about whether MapLibre glyph PBFs (`npm run fonts`) or a DOM/SVG label
overlay ends up being used — either way, fonts are self-hosted, no CDN.

## Images

None yet. When added: WebP preferred, alt text required in the entity's
`images[]` field (accessibility, brief §8).

## Third-party asset log

_(empty — add a row per asset as they're introduced)_

| Asset | Source | License | Attribution required? |
| ----- | ------ | ------- | --------------------- |
| —     | —      | —       | —                     |
