import { load as loadYaml } from 'js-yaml';

/**
 * Splits a `---\n<yaml>\n---\n<body>` Markdown file into parsed frontmatter
 * and the remaining body text. A hand-rolled split (not gray-matter) because
 * gray-matter unconditionally calls Node's `Buffer`, which doesn't exist in
 * the browser — this needs to run in both the viewer and scripts/validate.ts
 * (see docs/DECISIONS.md). js-yaml itself is pure JS, safe in both.
 */
export interface ParsedFrontmatter {
  data: unknown;
  content: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = FRONTMATTER_PATTERN.exec(raw);
  if (!match) return { data: {}, content: raw };
  const [, frontmatterYaml, content] = match;
  const data = loadYaml(frontmatterYaml ?? '') ?? {};
  return { data, content: (content ?? '').trim() };
}
