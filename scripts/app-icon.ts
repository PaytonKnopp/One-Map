#!/usr/bin/env node
/**
 * Renders the app icon's PNG sizes (favicon fallback, apple-touch-icon,
 * web-app-manifest icons) from the single hand-edited source,
 * assets/app-icon/icon.svg, via headless Playwright. Re-run after editing
 * the SVG; the PNGs are committed so the build itself needs no browser.
 *
 * "Full-bleed" variants square off the background tile (#bg) and shrink
 * the artwork (#art) toward the centre: iOS rounds the corners itself, and
 * Android's maskable icons may crop anything outside the middle 80% circle.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

const ICON_DIR = 'assets/app-icon';
const SOURCE_FILE = `${ICON_DIR}/icon.svg`;

interface IconVariant {
  file: string;
  size: number;
  /** Square background, artwork scaled by this factor. Omit for the rounded tile as drawn. */
  fullBleedScale?: number;
}

const VARIANTS: IconVariant[] = [
  { file: 'favicon-32.png', size: 32 },
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180, fullBleedScale: 0.9 },
  { file: 'icon-maskable-512.png', size: 512, fullBleedScale: 0.78 },
];

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`Usage: npm run app-icon

Renders ${ICON_DIR}/*.png (${VARIANTS.map((v) => v.file).join(', ')})
from ${SOURCE_FILE}.

Set CHROMIUM_PATH to use a specific Chromium binary instead of Playwright's own.

  --help   Show this message.
`);
  process.exit(0);
}

const svg = readFileSync(SOURCE_FILE, 'utf8');

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
try {
  const page = await browser.newPage();
  for (const variant of VARIANTS) {
    await page.setViewportSize({ width: variant.size, height: variant.size });
    await page.setContent(
      `<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`,
    );
    await page.evaluate(
      ({ size, fullBleedScale }) => {
        const root = document.querySelector('svg')!;
        root.setAttribute('width', String(size));
        root.setAttribute('height', String(size));
        root.style.display = 'block';
        if (fullBleedScale !== undefined) {
          root.querySelector('#bg')!.setAttribute('rx', '0');
          root
            .querySelector('#art')!
            .setAttribute(
              'transform',
              `translate(256 256) scale(${fullBleedScale}) translate(-256 -256)`,
            );
        }
      },
      { size: variant.size, fullBleedScale: variant.fullBleedScale },
    );
    await page.screenshot({
      path: `${ICON_DIR}/${variant.file}`,
      omitBackground: variant.fullBleedScale === undefined,
    });
    console.log(`Wrote ${ICON_DIR}/${variant.file} (${variant.size}x${variant.size})`);
  }
} finally {
  await browser.close();
}
