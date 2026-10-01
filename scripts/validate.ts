#!/usr/bin/env node
/**
 * Validates data/world.json and data/registry/*.json: schema conformance,
 * cross-reference consistency (relation reciprocals, type-key collisions),
 * and canonical formatting. Exits non-zero with grouped, actionable
 * messages on failure.
 *
 * This script is architected to grow: once maps/layers/lore exist (M2+),
 * their checks (dangling references, invalid GeoJSON, undeclared layers,
 * unregistered types, etc. — see docs/DATA_MODEL.md and brief Section 7)
 * get added here alongside what's already validated, not as a rewrite.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import {
  EntityTypesRegistrySchema,
  RelationTypesRegistrySchema,
  WorldSchema,
} from '../src/core/schema/index.ts';
import { formatJson } from './lib/canonical-json.ts';
import { listDataJsonFiles } from './lib/data-files.ts';

const { values } = parseArgs({
  options: {
    help: { type: 'boolean', short: 'h' },
  },
});

if (values.help) {
  console.log(`Usage: npm run validate

Validates data/world.json and data/registry/*.json against their schemas,
checks cross-reference consistency, and checks canonical formatting.
Exits 1 if anything fails.
`);
  process.exit(0);
}

interface Problem {
  file: string;
  message: string;
}

const problems: Problem[] = [];

function fail(file: string, message: string): void {
  problems.push({ file, message });
}

function loadJson(file: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    fail(file, 'file not found');
    return undefined;
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    fail(file, `invalid JSON: ${(error as Error).message}`);
    return undefined;
  }
}

// --- world.json ---------------------------------------------------------

const worldPath = 'data/world.json';
const worldJson = loadJson(worldPath);
if (worldJson !== undefined) {
  const result = WorldSchema.safeParse(worldJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(worldPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  }
}

// --- registry/entity-types.json ------------------------------------------

const entityTypesPath = 'data/registry/entity-types.json';
const entityTypesJson = loadJson(entityTypesPath);
if (entityTypesJson !== undefined) {
  const result = EntityTypesRegistrySchema.safeParse(entityTypesJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(entityTypesPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  } else {
    const spatialKeys = Object.keys(result.data.spatial);
    const nonSpatialKeys = Object.keys(result.data.nonSpatial);
    const collisions = spatialKeys.filter((key) => nonSpatialKeys.includes(key));
    for (const key of collisions) {
      fail(entityTypesPath, `type "${key}" is registered as both spatial and non-spatial`);
    }
    for (const [typeKey, def] of Object.entries(result.data.spatial)) {
      const seen = new Set<string>();
      for (const subtype of def.subtypes) {
        if (seen.has(subtype)) {
          fail(entityTypesPath, `type "${typeKey}" lists subtype "${subtype}" more than once`);
        }
        seen.add(subtype);
      }
    }
  }
}

// --- registry/relation-types.json ----------------------------------------

const relationTypesPath = 'data/registry/relation-types.json';
const relationTypesJson = loadJson(relationTypesPath);
if (relationTypesJson !== undefined) {
  const result = RelationTypesRegistrySchema.safeParse(relationTypesJson);
  if (!result.success) {
    for (const issue of result.error.issues) {
      fail(relationTypesPath, `${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
  } else {
    for (const [key, def] of Object.entries(result.data.relations)) {
      const reciprocalDef = result.data.relations[def.reciprocal];
      if (!reciprocalDef) {
        fail(
          relationTypesPath,
          `relation "${key}" declares reciprocal "${def.reciprocal}", which is not registered`,
        );
        continue;
      }
      if (reciprocalDef.reciprocal !== key) {
        fail(
          relationTypesPath,
          `relation "${key}" -> reciprocal "${def.reciprocal}" -> reciprocal ` +
            `"${reciprocalDef.reciprocal}" is not symmetric (expected "${key}")`,
        );
      }
    }
  }
}

// --- canonical formatting -------------------------------------------------

for (const file of listDataJsonFiles()) {
  const raw = readFileSync(file, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Already reported above for files we explicitly load; for any other
    // malformed data file, report it here too.
    fail(file, 'invalid JSON');
    continue;
  }
  if (formatJson(parsed) !== raw) {
    fail(file, 'not canonically formatted — run `npm run format:data`');
  }
}

// --- report ---------------------------------------------------------------

if (problems.length > 0) {
  const byFile = new Map<string, string[]>();
  for (const { file, message } of problems) {
    const existing = byFile.get(file) ?? [];
    existing.push(message);
    byFile.set(file, existing);
  }
  console.error(`✗ ${problems.length} problem(s) found:\n`);
  for (const [file, messages] of byFile) {
    console.error(file);
    for (const message of messages) {
      console.error(`  - ${message}`);
    }
  }
  process.exitCode = 1;
} else {
  console.log('✓ validation passed');
}
