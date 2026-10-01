import { useCallback, useEffect, useState } from 'react';

/**
 * Hash-based routing (brief §3) — works on GitHub Pages with no server
 * rewrites, and every deep link (`#/?e=<id>`) is just a URL. Back/forward
 * history comes for free: setting `location.hash` already pushes a
 * browser history entry, so no history-management library is needed.
 */
export interface HashRoute {
  /** The part between `#/` and `?` — `""` for the map view, `"browse"` for the index view. */
  path: string;
  params: URLSearchParams;
}

function parseHash(hash: string): HashRoute {
  const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
  const withoutSlash = withoutHash.startsWith('/') ? withoutHash.slice(1) : withoutHash;
  const questionMarkIndex = withoutSlash.indexOf('?');
  const path = questionMarkIndex === -1 ? withoutSlash : withoutSlash.slice(0, questionMarkIndex);
  const query = questionMarkIndex === -1 ? '' : withoutSlash.slice(questionMarkIndex + 1);
  return { path, params: new URLSearchParams(query) };
}

export type NavigateParams = Record<string, string | undefined>;

export function useHashRoute(): [HashRoute, (path: string, params?: NavigateParams) => void] {
  const [route, setRoute] = useState<HashRoute>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((path: string, params?: NavigateParams) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined) search.set(key, value);
    }
    const query = search.toString();
    window.location.hash = `/${path}${query ? `?${query}` : ''}`;
  }, []);

  return [route, navigate];
}
