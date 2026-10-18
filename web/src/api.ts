import type {
  ChatEvent,
  DealDetail,
  DealDocument,
  DealSummary,
  FollowUp,
  StageKey,
} from '../../src/shared/types';

export const MOCK = import.meta.env.VITE_MOCK === '1';

async function mock() {
  return import('./mock');
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body && typeof body.error === 'string') msg = body.error;
      else if (body && typeof body.message === 'string') msg = body.message;
    } catch {
      /* not JSON */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function listDeals(): Promise<DealSummary[]> {
  if (MOCK) return (await mock()).listDeals();
  return json(await fetch('/api/deals'));
}

export async function getDeal(id: string): Promise<DealDetail> {
  if (MOCK) return (await mock()).getDeal(id);
  return json(await fetch(`/api/deals/${encodeURIComponent(id)}`));
}

export async function createBooking(form: FormData): Promise<DealDetail> {
  if (MOCK) return (await mock()).createBooking(form);
  return json(await fetch('/api/bookings', { method: 'POST', body: form }));
}

export async function uploadDocument(
  dealId: string,
  file: File,
): Promise<{ deal: DealDetail; document: DealDocument }> {
  if (MOCK) return (await mock()).uploadDocument(dealId, file);
  const fd = new FormData();
  fd.append('file', file);
  return json(
    await fetch(`/api/deals/${encodeURIComponent(dealId)}/documents`, { method: 'POST', body: fd }),
  );
}

export async function completeStage(dealId: string, key: StageKey, date: string): Promise<DealDetail> {
  if (MOCK) return (await mock()).completeStage(dealId, key, date);
  return json(
    await fetch(`/api/deals/${encodeURIComponent(dealId)}/stages/${key}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date }),
    }),
  );
}

export async function getFollowups(dealId: string): Promise<FollowUp[]> {
  if (MOCK) return (await mock()).getFollowups(dealId);
  return json(await fetch(`/api/deals/${encodeURIComponent(dealId)}/followups`));
}

/** Streams ChatEvents from POST /api/chat (text/event-stream, one JSON ChatEvent per `data:` line). */
export async function* streamChat(
  body: { sessionId: string; message: string; dealId?: string },
  signal?: AbortSignal,
): AsyncGenerator<ChatEvent> {
  if (MOCK) {
    yield* (await mock()).streamChat(body);
    return;
  }
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Copilot is unavailable (${res.status}).`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).replace(/\r$/, '');
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      try {
        yield JSON.parse(payload) as ChatEvent;
      } catch {
        /* ignore malformed line */
      }
    }
  }
}
