import type { Link, Root, Text } from 'mdast';
import type { Parent } from 'unist';
import { visit } from 'unist-util-visit';

const WIKI_LINK_PATTERN = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;

/**
 * A remark plugin for `[[entity-id]]` / `[[entity-id|display text]]` wiki
 * links (brief §4/§8), rewriting them into ordinary mdast link nodes
 * pointing at the entity's hash route. Resolving whether the target
 * actually exists (and styling a dangling link differently) happens in the
 * Markdown renderer (src/content/Markdown.tsx), not here — this plugin
 * only knows syntax, not the entity index.
 */
export function remarkWikiLinks() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined || !WIKI_LINK_PATTERN.test(node.value)) return;
      WIKI_LINK_PATTERN.lastIndex = 0;

      const children: (Text | Link)[] = [];
      let lastEnd = 0;
      let match: RegExpExecArray | null;

      while ((match = WIKI_LINK_PATTERN.exec(node.value))) {
        const [whole, targetId, displayText] = match;
        if (!targetId) continue;
        if (match.index > lastEnd) {
          children.push({ type: 'text', value: node.value.slice(lastEnd, match.index) });
        }
        children.push({
          type: 'link',
          // The entity id round-trips through this URL's own `e` query
          // param — the renderer (src/content/Markdown.tsx) reads it back
          // out of `href` rather than a custom attribute, since arbitrary
          // data-* attributes aren't guaranteed to survive rehype-sanitize.
          url: `#/?e=${encodeURIComponent(targetId.trim())}`,
          children: [{ type: 'text', value: (displayText ?? targetId).trim() }],
        });
        lastEnd = match.index + whole.length;
      }
      if (lastEnd < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastEnd) });
      }

      parent.children.splice(index, 1, ...children);
    });
  };
}
