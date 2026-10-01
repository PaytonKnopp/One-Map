import { describe, expect, it } from 'vitest';

import { parseFrontmatter } from '../../src/core/frontmatter.ts';

describe('parseFrontmatter', () => {
  it('splits YAML frontmatter from the body', () => {
    const raw = [
      '---',
      'id: sampleton',
      'type: place',
      'tags: [sample, capital]',
      '---',
      '',
      'Body text here.',
    ].join('\n');
    const { data, content } = parseFrontmatter(raw);
    expect(data).toEqual({ id: 'sampleton', type: 'place', tags: ['sample', 'capital'] });
    expect(content).toBe('Body text here.');
  });

  it('treats a file with no frontmatter block as having none, body unchanged', () => {
    const { data, content } = parseFrontmatter('Just a plain body, no frontmatter.');
    expect(data).toEqual({});
    expect(content).toBe('Just a plain body, no frontmatter.');
  });

  it('trims leading/trailing whitespace from the body', () => {
    const { content } = parseFrontmatter('---\nid: x\n---\n\n\n  Body.  \n\n');
    expect(content).toBe('Body.');
  });
});
