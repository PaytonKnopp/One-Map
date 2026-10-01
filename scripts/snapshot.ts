#!/usr/bin/env node
/**
 * Renders a PNG of a map view via headless Playwright (brief §10) — run
 * this after every geometry change and actually look at the image
 * (CLAUDE.md's edit workflow, step 6). Builds the site, serves it on a
 * throwaway port, navigates to the requested view, and screenshots it.
 */
import { execSync, spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { parseArgs } from 'node:util';

import { chromium } from 'playwright';

import { loadEntities, world } from './lib/entities.ts';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
    id: { type: 'string' },
    center: { type: 'string' },
    zoom: { type: 'string' },
    bbox: { type: 'string' }, // "minLng,minLat,maxLng,maxLat"
    map: { type: 'string' },
    theme: { type: 'string' },
    year: { type: 'string' },
    out: { type: 'string', default: 'private/snapshot.png' },
    width: { type: 'string', default: '1280' },
    height: { type: 'string', default: '800' },
    'no-build': { type: 'boolean' },
  },
});

if (values.help) {
  console.log(`Usage: npm run snapshot -- [--id <id> | --center <lng,lat> --zoom <n> | --bbox <minLng,minLat,maxLng,maxLat>] [options]

Renders a PNG of a map view. Builds the site first (skip with
--no-build if dist/ is already current).

  --id <id>        Center on this entity.
  --center <lng,lat> --zoom <n>   Or specify the camera directly.
  --bbox <minLng,minLat,maxLng,maxLat>   Or fit to a bounding box.
  --map <id>        Which map (default: the world's defaultMap).
  --theme <id>      Theme override.
  --year <year>     Timeline year (default: the world's currentYear).
  --out <path>      Output PNG path (default: private/snapshot.png).
  --width/--height  Viewport size in px (default 1280x800).
  --no-build        Skip the build step (use the existing dist/).
`);
  process.exit(0);
}

if (!values['no-build']) {
  console.log('Building...');
  execSync('npm run build', { stdio: 'inherit' });
}

const PORT = 4173 + Math.floor(Math.random() * 1000);
console.log(`Starting preview server on port ${PORT}...`);
// A single command string (not an args array) with shell:true — passing
// both is a documented Node footgun (args aren't escaped), even though
// every value here is our own literal/number, not user input.
const preview = spawn(`npx vite preview --port ${PORT} --strictPort`, {
  stdio: 'pipe',
  shell: true,
});

async function waitForServer(url: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Preview server didn't come up within ${timeoutMs}ms.`);
}

function basePath(): string {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = /\/([^/]+?)(?:\.git)?$/.exec(remoteUrl);
    const repo = match?.[1];
    return repo && !repo.endsWith('.github.io') ? `/${repo}/` : '/';
  } catch {
    return '/';
  }
}

async function main(): Promise<void> {
  const base = basePath();
  const url = `http://localhost:${PORT}${base}`;
  await waitForServer(url);

  const mapId = values.map ?? world.defaultMap;
  const params = new URLSearchParams();
  params.set('map', mapId);
  if (values.theme) params.set('theme', values.theme);
  if (values.year) params.set('year', values.year);
  if (values.id) params.set('e', values.id);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: Number(values.width), height: Number(values.height) },
    });
    await page.goto(`${url}#/?${params.toString()}`, { waitUntil: 'load' });
    await page.waitForFunction(() =>
      Boolean((window as unknown as { __oneWorldMap?: unknown }).__oneWorldMap),
    );
    await page.waitForTimeout(1000); // let tiles/icons/fonts settle

    if (values.center || values.bbox) {
      await page.evaluate(
        ({ center, zoom, bbox }) => {
          const map = (window as unknown as { __oneWorldMap: import('maplibre-gl').Map })
            .__oneWorldMap;
          if (bbox) {
            const [minLng, minLat, maxLng, maxLat] = bbox;
            map.fitBounds(
              [
                [minLng, minLat],
                [maxLng, maxLat],
              ],
              { animate: false },
            );
          } else if (center) {
            map.jumpTo(zoom === undefined ? { center } : { center, zoom });
          }
        },
        {
          center: values.center
            ? (values.center.split(',').map(Number) as [number, number])
            : undefined,
          zoom: values.zoom ? Number(values.zoom) : undefined,
          bbox: values.bbox
            ? (values.bbox.split(',').map(Number) as [number, number, number, number])
            : undefined,
        },
      );
      await page.waitForTimeout(500);
    } else if (values.id) {
      const entity = loadEntities().get(values.id);
      if (!entity)
        console.warn(`Warning: "${values.id}" not found — screenshot will show the default view.`);
    }

    mkdirSync(dirname(values.out), { recursive: true });
    await page.screenshot({ path: values.out });
    console.log(`Saved ${values.out}`);
  } finally {
    await browser.close();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    preview.kill();
  });
