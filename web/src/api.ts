import type {
  ChatEvent,
  DealDetail,
  DealDocument,
  DealSummary,
  FollowUp,
  Project,
  CustomerDetail,
  CustomerInput,
  CustomerSummary,
  NoteKind,
  ProjectMatch,
  Reminder,
  ReminderItem,
  SuggestedReminder,
  WhatsAppAnalysis,
  WhatsAppCommit,
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

let projectsCache: Promise<Project[]> | null = null;

/** GET /api/projects, fetched once per page load and shared by every screen. */
export function listProjects(): Promise<Project[]> {
  if (!projectsCache) {
    projectsCache = (MOCK ? mock().then((m) => m.listProjects()) : fetch('/api/projects').then((r) => json<Project[]>(r))).catch(
      (e) => {
        projectsCache = null;
        throw e;
      },
    );
  }
  return projectsCache;
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
  body: { sessionId: string; message: string; dealId?: string; customerId?: string },
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

// ---------- CRM ----------

async function crm() {
  return import('./mockCrm');
}

const jsonInit = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const enc = encodeURIComponent;

export async function listCustomers(q = '', status = ''): Promise<CustomerSummary[]> {
  if (MOCK) return (await crm()).listCustomers(q, status);
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  if (status) p.set('status', status);
  return json(await fetch(`/api/customers${p.size ? `?${p}` : ''}`));
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).getCustomer(id);
  return json(await fetch(`/api/customers/${enc(id)}`));
}

export async function createCustomer(input: CustomerInput): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).createCustomer(input);
  return json(await fetch('/api/customers', jsonInit('POST', input)));
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).updateCustomer(id, input);
  return json(await fetch(`/api/customers/${enc(id)}`, jsonInit('PATCH', input)));
}

export async function addNote(
  id: string,
  body: { kind: NoteKind; text: string; occurredAt?: string; remindOn?: string },
): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).addNote(id, body);
  return json(await fetch(`/api/customers/${enc(id)}/notes`, jsonInit('POST', body)));
}

export async function deleteNote(id: string, noteId: string): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).deleteNote(id, noteId);
  return json(await fetch(`/api/customers/${enc(id)}/notes/${enc(noteId)}`, jsonInit('DELETE')));
}

export async function planFollowups(id: string): Promise<SuggestedReminder[]> {
  if (MOCK) return (await crm()).planFollowups(id);
  return json(await fetch(`/api/customers/${enc(id)}/plan`, jsonInit('POST')));
}

export async function addReminder(id: string, r: SuggestedReminder & { origin: 'AI' | 'AGENT' }): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).addReminder(id, r);
  return json(await fetch(`/api/customers/${enc(id)}/reminders`, jsonInit('POST', r)));
}

export async function updateReminder(
  rid: string,
  patch: Partial<Pick<Reminder, 'status' | 'dueDate' | 'title' | 'detail'>>,
): Promise<Reminder> {
  if (MOCK) return (await crm()).updateReminder(rid, patch);
  return json(await fetch(`/api/reminders/${enc(rid)}`, jsonInit('PATCH', patch)));
}

export async function listReminders(): Promise<ReminderItem[]> {
  if (MOCK) return (await crm()).listReminders();
  return json(await fetch('/api/reminders?status=OPEN&days=30'));
}

export async function suggestMatches(id: string): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).suggestMatches(id);
  return json(await fetch(`/api/customers/${enc(id)}/matches/suggest`, jsonInit('POST')));
}

export async function addMatch(id: string, projectId: string, reason?: string): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).addMatch(id, projectId, reason);
  return json(await fetch(`/api/customers/${enc(id)}/matches`, jsonInit('POST', { projectId, ...(reason ? { reason } : {}) })));
}

export async function updateMatch(id: string, projectId: string, status: ProjectMatch['status']): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).updateMatch(id, projectId, status);
  return json(await fetch(`/api/customers/${enc(id)}/matches/${enc(projectId)}`, jsonInit('PATCH', { status })));
}

export async function deleteMatch(id: string, projectId: string): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).deleteMatch(id, projectId);
  return json(await fetch(`/api/customers/${enc(id)}/matches/${enc(projectId)}`, jsonInit('DELETE')));
}

export async function analyzeWhatsApp(files: File[]): Promise<WhatsAppAnalysis> {
  if (MOCK) return (await crm()).analyzeWhatsApp(files);
  const fd = new FormData();
  for (const f of files) fd.append('files', f);
  return json(await fetch('/api/whatsapp/analyze', { method: 'POST', body: fd }));
}

export async function commitWhatsApp(body: WhatsAppCommit): Promise<CustomerDetail> {
  if (MOCK) return (await crm()).commitWhatsApp(body);
  return json(await fetch('/api/whatsapp/commit', jsonInit('POST', body)));
}
