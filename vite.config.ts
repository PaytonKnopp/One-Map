import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * GitHub Pages serves project sites at /<repo>/, but a custom domain (CNAME
 * in public/) or a user/org page (`<user>.github.io` repo) serves at /.
 * Deriving this from the git remote means the name used on GitHub can change
 * without anyone having to remember to edit this file.
 */
function detectBase(): string {
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH;
  if (existsSync(fileURLToPath(new URL('./public/CNAME', import.meta.url)))) return '/';

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

export default defineConfig({
  base: detectBase(),
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
});
