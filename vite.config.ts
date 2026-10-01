import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

/**
 * GitHub Pages serves project sites at /<repo>/, but a custom domain (CNAME
 * in assets/, this project's publicDir — see below) or a user/org page
 * (`<user>.github.io` repo) serves at /. Deriving this from the git remote
 * means the name used on GitHub can change without anyone having to
 * remember to edit this file.
 */
function detectBase(): string {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;
  if (existsSync(fileURLToPath(new URL('./assets/CNAME', import.meta.url)))) return '/';

  try {
    const remoteUrl = execSync('git config --get remote.origin.url', {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      encoding: 'utf8',
    }).trim();

    const match = /\/([^/]+?)(?:\.git)?$/.exec(remoteUrl);
    const repo = match?.[1];
    if (!repo) return '/';
    if (repo.endsWith('.github.io')) return '/';
    return `/${repo}/`;
  } catch {
    return '/';
  }
}

/**
 * MapLibre's own worker runs as an ES module and imports a sibling chunk
 * (`maplibre-gl-shared.mjs`) by relative path. Pointing `setWorkerUrl` at a
 * single file copied via a plain `?url` import (or any Vite-hashed/bundled
 * path) breaks that relative import, since nothing else copies its sibling
 * alongside it — the worker fails silently with no GeoJSON source ever
 * rendering. Copying both files, under their ORIGINAL unhashed names, into
 * a publicDir subfolder keeps their relative import intact. Regenerated
 * every `dev`/`build` from whatever maplibre-gl version is installed —
 * never hand-committed (see .gitignore: assets/vendor/).
 */
function copyMaplibreWorkerPlugin(): Plugin {
  return {
    name: 'copy-maplibre-worker',
    buildStart() {
      const destDir = fileURLToPath(new URL('./assets/vendor/maplibre-gl/', import.meta.url));
      mkdirSync(destDir, { recursive: true });
      for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        copyFileSync(
          fileURLToPath(new URL(`./node_modules/maplibre-gl/dist/${file}`, import.meta.url)),
          `${destDir}${file}`,
        );
      }
    },
  };
}

export default defineConfig({
  base: detectBase(),
  // `assets/` (icons/fonts/images, brief §5) is this project's static
  // asset directory and doubles as Vite's publicDir: its contents are
  // served/copied verbatim at the site root (e.g. assets/icons/city.svg ->
  // /icons/city.svg), fetchable at runtime without going through the JS
  // module graph — needed to rasterize icon SVGs onto the map canvas.
  publicDir: 'assets',
  plugins: [react(), copyMaplibreWorkerPlugin()],
  build: {
    outDir: 'dist',
  },
});
