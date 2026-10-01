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

/**
 * The "World chronicle" page (brief §8) reads recent git history. There's
 * no server to precompute this on for a static site, so it's a Vite
 * virtual module instead: `git log` runs once at dev-server-start/build
 * time and its output becomes an importable JS array — no extra file,
 * no runtime git access (which wouldn't exist once deployed anyway).
 * CI needs full history for this to be meaningful (fetch-depth: 0 — see
 * .github/workflows/ci.yml); a shallow local clone just gets fewer commits.
 */
const CHRONICLE_MODULE_ID = 'virtual:chronicle';
const RESOLVED_CHRONICLE_MODULE_ID = `\0${CHRONICLE_MODULE_ID}`;
const CHRONICLE_COMMIT_LIMIT = 300;
const CHRONICLE_FIELD_SEPARATOR = '\x1f';

export interface ChronicleCommit {
  hash: string;
  date: string;
  message: string;
  author: string;
}

function chroniclePlugin(): Plugin {
  return {
    name: 'chronicle',
    resolveId(id) {
      if (id === CHRONICLE_MODULE_ID) return RESOLVED_CHRONICLE_MODULE_ID;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_CHRONICLE_MODULE_ID) return undefined;

      let commits: ChronicleCommit[] = [];
      try {
        const format = ['%H', '%ad', '%s', '%an'].join(CHRONICLE_FIELD_SEPARATOR);
        const output = execSync(
          `git log -n ${CHRONICLE_COMMIT_LIMIT} --date=format:%Y-%m-%d --pretty=format:${format}`,
          { cwd: fileURLToPath(new URL('.', import.meta.url)), encoding: 'utf8' },
        );
        commits = output
          .split('\n')
          .filter(Boolean)
          .map((line) => {
            const [hash, date, message, author] = line.split(CHRONICLE_FIELD_SEPARATOR);
            return {
              hash: hash ?? '',
              date: date ?? '',
              message: message ?? '',
              author: author ?? '',
            };
          });
      } catch {
        // No git history available (e.g. a source archive, not a clone) — ship an empty chronicle rather than failing the build.
      }

      return `export default ${JSON.stringify(commits)};`;
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
  plugins: [react(), copyMaplibreWorkerPlugin(), chroniclePlugin()],
  build: {
    outDir: 'dist',
  },
});
