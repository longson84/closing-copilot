import { useEffect, useState } from 'react';

export type Route =
  | { name: 'pipeline' }
  | { name: 'deal'; id: string; review: boolean }
  | { name: 'new' }
  | { name: 'projects' }
  | { name: 'customers' }
  | { name: 'customer-new' }
  | { name: 'customer'; id: string; note: string | null; tab: string | null }
  | { name: 'whatsapp'; customerId: string | null }
  | { name: 'reminders' }
  | { name: 'aftersales' };

function parse(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  const [path, query = ''] = h.split('?');
  const m = path.match(/^\/deals\/([^/]+)$/);
  if (m) return { name: 'deal', id: decodeURIComponent(m[1]), review: new URLSearchParams(query).has('review') };
  if (path === '/new') return { name: 'new' };
  if (path === '/projects') return { name: 'projects' };
  const qs = new URLSearchParams(query);
  if (path === '/customers') return { name: 'customers' };
  if (path === '/customers/new') return { name: 'customer-new' };
  const c = path.match(/^\/customers\/([^/]+)$/);
  if (c) return { name: 'customer', id: decodeURIComponent(c[1]), note: qs.get('note'), tab: qs.get('tab') };
  if (path === '/whatsapp') return { name: 'whatsapp', customerId: qs.get('customer') };
  if (path === '/reminders') return { name: 'reminders' };
  if (path === '/aftersales') return { name: 'aftersales' };
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
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
