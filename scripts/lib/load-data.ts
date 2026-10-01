import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Node-side (fs-based) equivalent of src/map/data.ts's Vite glob loading — scripts run as plain Node, not through Vite, so file discovery is necessarily separate from the browser bundle's; see docs/DECISIONS.md. Both read the exact same files on disk and validate against the exact same Zod schemas in src/core/schema/. */

export function listMapIds(): string[] {
  const dir = 'data/maps';
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function listThemeIds(): string[] {
  const dir = 'data/themes';
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -'.json'.length))
    .sort();
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Layer folder ids actually present on disk for a map, regardless of whether map.json declares them. */
export function listLayerFoldersOnDisk(mapId: string): string[] {
  const dir = `data/maps/${mapId}/layers`;
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export interface LoadedLayerFile {
  path: string;
  raw: unknown;
}

/** Every .geojson file under one map/layer folder, parsed (not yet schema-validated). */
export function loadLayerFiles(mapId: string, layerId: string): LoadedLayerFile[] {
  const dir = join('data/maps', mapId, 'layers', layerId);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.geojson'))
    .sort()
    .map((f) => {
      const path = join(dir, f).split('\\').join('/');
      return { path, raw: readJson(path) };
    });
}

export function iconExists(iconId: string): boolean {
  return existsSync(`assets/icons/${iconId}.svg`);
}

/** Whether a path under assets/ (e.g. an art layer's `src`) actually exists. */
export function assetExists(assetPath: string): boolean {
  return existsSync(`assets/${assetPath}`);
}
