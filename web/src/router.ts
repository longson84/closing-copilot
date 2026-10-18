import { useEffect, useState } from 'react';

export type Route =
  | { name: 'pipeline' }
  | { name: 'deal'; id: string; review: boolean }
  | { name: 'new' }
  | { name: 'projects' };

function parse(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  const m = path.match(/^\/deals\/([^/]+)$/);
  if (m) return { name: 'deal', id: decodeURIComponent(m[1]), review: new URLSearchParams(query).has('review') };
  if (path === '/new') return { name: 'new' };
  if (path === '/projects') return { name: 'projects' };
  return { name: 'pipeline' };
}

export function navigate(to: string) {
  window.location.hash = to;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash));
      document.querySelector('.main')?.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
