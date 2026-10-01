import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';

import { entitiesById } from './entities.ts';
import { remarkWikiLinks } from './wikiLinks.ts';

// Lore bodies are plain text written by whoever edits this public repo over
// its lifetime — sanitize unconditionally so Markdown can never smuggle in
// a script/event-handler attribute, independent of how careful any one
// edit was. The default schema already allows a plain `href` on `<a>`,
// which is all our wiki links need (see wikiLinks.ts for why they don't
// use a custom attribute).
const sanitizeSchema = defaultSchema;

/** An entity id, if `href` is one of our own `#/?e=<id>` entity links. */
function entityIdFromHref(href: string | undefined): string | undefined {
  if (!href?.startsWith('#/?')) return undefined;
  return new URLSearchParams(href.slice(href.indexOf('?'))).get('e') ?? undefined;
}

function WikiAwareLink({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  const targetId = entityIdFromHref(href);
  const isDanglingWikiLink = targetId !== undefined && !entitiesById.has(targetId);

  return (
    <a
      href={href}
      title={isDanglingWikiLink ? `"${targetId}" doesn't exist yet` : undefined}
      style={isDanglingWikiLink ? { color: '#a33', textDecoration: 'underline dashed' } : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}

const components: Components = {
  a: WikiAwareLink,
};

/** Renders a lore body: GitHub-flavored Markdown, `[[wiki links]]`, sanitized. */
export function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkWikiLinks]}
      rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
}
