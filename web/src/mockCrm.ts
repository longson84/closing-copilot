// Dev-only CRM fixtures for VITE_MOCK=1. All people, numbers and chats are fictional.
import type {
  Customer,
  CustomerDetail,
  CustomerInput,
  CustomerSummary,
  Note,
  NoteKind,
  ProjectMatch,
  Reminder,
  ReminderItem,
  SuggestedReminder,
  WhatsAppAnalysis,
  WhatsAppCommit,
} from '../../src/shared/types';
import { daysBetween, todayISO } from './format';
import { addDays, customers, deals, MOCK_PROJECTS, sleep, summary } from './mock';

const T = todayISO();
const iso = (d: string, time = '10:00') => `${d}T${time}:00+08:00`;
let seq = 100;
const nid = (p: string) => `${p}-${++seq}`;

function blank(id: string, fullName: string, extra: Partial<Customer>): Customer {
  const now = new Date().toISOString();
  return {
    id,
    fullName,
    idType: null,
    idNumberMasked: null,
    dateOfBirth: null,
    nationality: null,
    sex: null,
    address: null,
    residency: null,
    phone: null,
    email: null,
    preferredLanguage: 'English',
    profile: { purpose: null, propertiesOwned: null, household: null },
    status: 'LEAD',
    source: null,
    budgetMinSgd: null,
    budgetMaxSgd: null,
    preferences: { segments: [], areas: [], bedrooms: [], executiveCondo: null, timeline: null, notes: null },
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...extra,
  };
}

// Enrich the booked buyers from the deal fixtures.
Object.assign(customers.c1, { source: 'Showflat walk-in', budgetMinSgd: 1_500_000, budgetMaxSgd: 1_800_000, tags: ['First-time buyer'] });
Object.assign(customers.c2, { source: 'Referral from Sarah Lim', budgetMaxSgd: 2_200_000 });
Object.assign(customers.c5, { status: 'AFTER_SALES', source: 'Roadshow' });

customers.c6 = blank('c6', 'Marcus Lee', {
  status: 'PROSPECT',
  phone: '+65 9734 2210',
  source: 'WhatsApp',
  residency: 'SC',
  profile: { purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, baby on the way' },
  budgetMinSgd: 1_600_000,
  budgetMaxSgd: 1_900_000,
  preferences: { segments: ['RCR'], areas: ['Dunman', 'Katong'], bedrooms: ['3BR'], executiveCondo: false, timeline: 'Within 3 months', notes: 'Wants to be near his parents in Marine Parade.' },
  tags: ['Hot lead'],
  createdAt: iso(addDays(T, -12)),
});
customers.c7 = blank('c7', 'Nurul Huda binte Rahman', {
  status: 'LEAD',
  phone: '+65 8122 0456',
  email: 'nurul.h@example.com',
  source: 'Showflat walk-in',
  residency: 'SC',
  profile: { purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Couple, both 29' },
  budgetMaxSgd: 1_650_000,
  preferences: { segments: ['OCR'], areas: ['Tengah', 'Bukit Batok'], bedrooms: ['3BR', '4BR'], executiveCondo: true, timeline: 'Next 6 months', notes: null },
  tags: ['EC eligible'],
  createdAt: iso(addDays(T, -5)),
});
customers.c8 = blank('c8', 'Daniel Koh', {
  status: 'PROSPECT',
  phone: '+65 9011 7788',
  source: 'Referral from Tan Wei Ming',
  residency: 'SC',
  profile: { purpose: 'INVESTMENT', propertiesOwned: 1, household: 'Married, 2 teenagers' },
  budgetMinSgd: 1_200_000,
  budgetMaxSgd: 1_500_000,
  preferences: { segments: ['OCR', 'RCR'], areas: ['near Lentor MRT'], bedrooms: ['2BR'], executiveCondo: false, timeline: 'No rush', notes: 'Cares about rental yield, aware of 20% ABSD.' },
  tags: ['Investor'],
  createdAt: iso(addDays(T, -30)),
});
customers.c9 = blank('c9', 'Wong Mei Xin', {
  status: 'LOST',
  phone: '+65 8555 3141',
  source: 'Facebook ad',
  preferences: { segments: ['CCR'], areas: ['River Valley'], bedrooms: ['1BR'], executiveCondo: false, timeline: null, notes: null },
  createdAt: iso(addDays(T, -60)),
});

const notes: Record<string, Note[]> = {
  c6: [
    {
      id: 'n-wa-1',
      customerId: 'c6',
      kind: 'DISCUSSION',
      text: 'Marcus and his wife liked Grand Dunman at the showflat but are worried about the 15% downpayment timing because their HDB sale completes in March. He asked for a 3BR stack facing away from the PIE and wants to bring his parents for a second viewing on Saturday.',
      source: 'WHATSAPP_AI',
      keyPoints: [
        'Budget S$1.6M–1.9M, 3BR only',
        'HDB sale completes in March; cash timing for 15% is the main worry',
        'Second viewing with parents this Saturday',
        'Prefers a stack facing away from the PIE',
      ],
      transcript: [
        { from: 'CUSTOMER', time: '20:41', text: 'Hi Rachel, thanks for the tour today! My wife and I really liked the 3 bedder at Grand Dunman.' },
        { from: 'AGENT', time: '20:44', text: 'So glad you both liked it Marcus! Any stack you were leaning towards?' },
        { from: 'CUSTOMER', time: '20:46', text: 'Something not facing the PIE please. Budget max 1.9M, ideally around 1.7.' },
        { from: 'CUSTOMER', time: '20:47', text: 'Our HDB sale only completes in March though, worried about the 15% payment timing.' },
        { from: 'AGENT', time: '20:52', text: "Understand. The 15% is due within 8 weeks of the OTP, so let's plan the booking date around your HDB completion. I'll work out the numbers for you." },
        { from: 'CUSTOMER', time: '20:55', text: 'Great. Can we come again on Saturday with my parents?' },
        { from: 'AGENT', time: '20:56', text: 'Of course! Saturday 11am works?' },
        { from: 'CUSTOMER', time: '20:57', text: '👍 see you then' },
      ],
      occurredAt: addDays(T, -2),
      createdAt: iso(addDays(T, -2), '21:05'),
    },
    {
      id: 'n-2',
      customerId: 'c6',
      kind: 'THOUGHT',
      text: 'Serious buyer. Wife is the decision maker on layout; Marcus on budget. Do not push the 4BR.',
      source: 'MANUAL',
      keyPoints: [],
      transcript: [],
      occurredAt: addDays(T, -2),
      createdAt: iso(addDays(T, -2), '21:20'),
    },
    {
      id: 'n-1',
      customerId: 'c6',
      kind: 'DISCUSSION',
      text: 'First call. Saw our Grand Dunman ad. Upgrading from a 4-room HDB in Marine Parade.',
      source: 'MANUAL',
      keyPoints: [],
      transcript: [],
      occurredAt: addDays(T, -12),
      createdAt: iso(addDays(T, -12)),
    },
  ],
  c7: [
    {
      id: 'n-3',
      customerId: 'c7',
      kind: 'PLAN',
      text: 'Send EC eligibility checklist and Copen Grand brochure. Check household income ceiling (S$16k).',
      source: 'MANUAL',
      keyPoints: [],
      transcript: [],
      occurredAt: addDays(T, -5),
      createdAt: iso(addDays(T, -5)),
    },
  ],
  c8: [
    {
      id: 'n-4',
      customerId: 'c8',
      kind: 'DISCUSSION',
      text: 'Coffee at Lentor. Wants a 2BR for rental, expects 3% gross yield. Already owns a condo, so 20% ABSD applies.',
      source: 'MANUAL',
      keyPoints: [],
      transcript: [],
      occurredAt: addDays(T, -9),
      createdAt: iso(addDays(T, -9)),
    },
  ],
  c1: [
    {
      id: 'n-5',
      customerId: 'c1',
      kind: 'THOUGHT',
      text: 'Very detail oriented. Prefers WhatsApp over calls.',
      source: 'MANUAL',
      keyPoints: [],
      transcript: [],
      occurredAt: addDays(T, -20),
      createdAt: iso(addDays(T, -20)),
    },
  ],
};

const reminders: Reminder[] = [
  { id: 'r-1', customerId: 'c6', title: 'Second viewing with Marcus and parents', detail: 'Saturday 11am at the Grand Dunman showflat. Prepare 3BR stacks away from the PIE.', dueDate: addDays(T, 2), origin: 'AI', status: 'OPEN', noteId: 'n-wa-1', createdAt: iso(addDays(T, -2)), completedAt: null },
  { id: 'r-2', customerId: 'c6', title: 'Send downpayment timing plan', detail: 'Map OTP date against HDB completion in March so the 15% falls after the sale proceeds.', dueDate: T, origin: 'AI', status: 'OPEN', noteId: 'n-wa-1', createdAt: iso(addDays(T, -2)), completedAt: null },
  { id: 'r-3', customerId: 'c7', title: 'Send EC eligibility checklist', detail: null, dueDate: addDays(T, -1), origin: 'AGENT', status: 'OPEN', noteId: 'n-3', createdAt: iso(addDays(T, -5)), completedAt: null },
  { id: 'r-4', customerId: 'c8', title: 'Share rental comparables near Lentor MRT', detail: '2BR rents in D26 for the last 6 months.', dueDate: addDays(T, 9), origin: 'AGENT', status: 'OPEN', noteId: null, createdAt: iso(addDays(T, -9)), completedAt: null },
  { id: 'r-5', customerId: 'c1', title: 'Wish Wei Ming happy birthday', detail: null, dueDate: addDays(T, 20), origin: 'AI', status: 'OPEN', noteId: null, createdAt: iso(addDays(T, -20)), completedAt: null },
  { id: 'r-6', customerId: 'c8', title: 'Call about Lentor launch preview', detail: null, dueDate: addDays(T, -6), origin: 'AGENT', status: 'DONE', noteId: null, createdAt: iso(addDays(T, -9)), completedAt: addDays(T, -6) },
];

const matches: Record<string, ProjectMatch[]> = {
  c6: [
    { projectId: 'mock-grand-dunman', origin: 'AGENT', reason: 'Viewed the showflat, likes the 3BR layout.', status: 'SHORTLISTED', createdAt: iso(addDays(T, -2)) },
    { projectId: 'aurelia-bay-residences', origin: 'AI', reason: 'RCR, D15 near Katong, 3BR from about S$1.7M fits the budget and is close to his parents.', status: 'SUGGESTED', createdAt: iso(addDays(T, -1)) },
    { projectId: 'mock-the-continuum', origin: 'AI', reason: 'Freehold in D15, but entry 3BR prices are likely above S$1.9M.', status: 'REJECTED', createdAt: iso(addDays(T, -1)) },
  ],
  c7: [{ projectId: 'mock-copen-grand', origin: 'AI', reason: 'EC in Tengah, matches the EC preference and the S$1.65M ceiling.', status: 'SUGGESTED', createdAt: iso(addDays(T, -4)) }],
  c8: [
    { projectId: 'mock-lentor-hills-residences', origin: 'AGENT', reason: '2BR near Lentor MRT for rental.', status: 'SHORTLISTED', createdAt: iso(addDays(T, -9)) },
    { projectId: 'mock-hillock-green', origin: 'AI', reason: 'Lower entry price, same MRT catchment.', status: 'SUGGESTED', createdAt: iso(addDays(T, -8)) },
  ],
};

function cfind(id: string): Customer {
  const c = customers[id];
  if (!c) throw new Error('Customer not found.');
  return c;
}

function crmDetail(id: string): CustomerDetail {
  const c = cfind(id);
  const rs = reminders
    .filter((r) => r.customerId === id)
    .sort((a, b) => (a.status === 'OPEN' ? 0 : 1) - (b.status === 'OPEN' ? 0 : 1) || a.dueDate.localeCompare(b.dueDate));
  return structuredClone({
    customer: c,
    notes: [...(notes[id] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    reminders: rs,
    matches: (matches[id] ?? [])
      .map((m) => ({ ...m, project: MOCK_PROJECTS.find((p) => p.id === m.projectId)! }))
      .filter((m) => m.project),
    deals: deals.filter((d) => d.customerId === id).map(summary),
  });
}

function lastContact(id: string): string | null {
  const n = (notes[id] ?? [])[0];
  return n ? n.occurredAt ?? n.createdAt.slice(0, 10) : null;
}

function custSummary(c: Customer): CustomerSummary {
  const open = reminders.filter((r) => r.customerId === c.id && r.status === 'OPEN').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const ns = [...(notes[c.id] ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    id: c.id,
    fullName: c.fullName,
    phone: c.phone,
    status: c.status,
    budgetMinSgd: c.budgetMinSgd,
    budgetMaxSgd: c.budgetMaxSgd,
    lastContactAt: ns[0] ? ns[0].occurredAt ?? ns[0].createdAt.slice(0, 10) : lastContact(c.id),
    lastNoteSnippet: ns[0] ? ns[0].text.slice(0, 90) : null,
    openReminders: open.length,
    nextReminderDate: open[0]?.dueDate ?? null,
    overdueReminders: open.filter((r) => r.dueDate < T).length,
    deals: deals.filter((d) => d.customerId === c.id).length,
    shortlisted: (matches[c.id] ?? []).filter((m) => m.status === 'SHORTLISTED').length,
  };
}

export async function listCustomers(q = '', status = ''): Promise<CustomerSummary[]> {
  await sleep(250);
  const s = q.trim().toLowerCase();
  return Object.values(customers)
    .filter((c) => !status || c.status === status)
    .filter((c) => !s || c.fullName.toLowerCase().includes(s) || (c.phone ?? '').replace(/\s/g, '').includes(s.replace(/\s/g, '')))
    .map(custSummary)
    .sort((a, b) => b.overdueReminders - a.overdueReminders || (a.nextReminderDate ?? '9999').localeCompare(b.nextReminderDate ?? '9999'));
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  await sleep(200);
  return crmDetail(id);
}

function applyInput(c: Customer, input: Partial<CustomerInput>) {
  const { purpose, propertiesOwned, household, preferences, ...rest } = input;
  Object.assign(c, rest);
  if (purpose !== undefined) c.profile.purpose = purpose;
  if (propertiesOwned !== undefined) c.profile.propertiesOwned = propertiesOwned;
  if (household !== undefined) c.profile.household = household;
  if (preferences) c.preferences = { ...c.preferences, ...preferences };
  c.updatedAt = new Date().toISOString();
}

export async function createCustomer(input: CustomerInput): Promise<CustomerDetail> {
  await sleep(400);
  const id = `c${Object.keys(customers).length + 1}`;
  customers[id] = blank(id, input.fullName, {});
  applyInput(customers[id], input);
  return crmDetail(id);
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<CustomerDetail> {
  await sleep(300);
  applyInput(cfind(id), input);
  return crmDetail(id);
}

export async function addNote(id: string, body: { kind: NoteKind; text: string; occurredAt?: string; remindOn?: string }): Promise<CustomerDetail> {
  await sleep(300);
  const note: Note = {
    id: nid('n'),
    customerId: id,
    kind: body.kind,
    text: body.text,
    source: 'MANUAL',
    keyPoints: [],
    transcript: [],
    occurredAt: body.occurredAt ?? T,
    createdAt: new Date().toISOString(),
  };
  (notes[id] ??= []).unshift(note);
  if (body.kind === 'PLAN' && body.remindOn) {
    reminders.push({ id: nid('r'), customerId: id, title: body.text.split(/[.\n]/)[0].slice(0, 80), detail: body.text, dueDate: body.remindOn, origin: 'AGENT', status: 'OPEN', noteId: note.id, createdAt: note.createdAt, completedAt: null });
  }
  return crmDetail(id);
}

export async function deleteNote(id: string, noteId: string): Promise<CustomerDetail> {
  await sleep(200);
  notes[id] = (notes[id] ?? []).filter((n) => n.id !== noteId);
  return crmDetail(id);
}

export async function planFollowups(id: string): Promise<SuggestedReminder[]> {
  await sleep(1500);
  const c = cfind(id);
  const first = c.fullName.split(' ')[0];
  return [
    { title: `Send ${first} a shortlist of 3 stacks`, detail: 'Use the shortlisted projects and stay inside the stated budget.', dueDate: addDays(T, 1) },
    { title: 'Prepare a cash-flow table', detail: 'Booking fee, 15% downpayment, stamp duty and the first progress payment, with dates.', dueDate: addDays(T, 3) },
    { title: `Check in with ${first} after the weekend`, detail: 'Ask what the family thought of the second viewing.', dueDate: addDays(T, 5) },
  ];
}

export async function addReminder(id: string, r: SuggestedReminder & { origin: 'AI' | 'AGENT' }): Promise<CustomerDetail> {
  await sleep(250);
  reminders.push({ id: nid('r'), customerId: id, title: r.title, detail: r.detail, dueDate: r.dueDate, origin: r.origin, status: 'OPEN', noteId: null, createdAt: new Date().toISOString(), completedAt: null });
  return crmDetail(id);
}

export async function updateReminder(rid: string, patch: Partial<Pick<Reminder, 'status' | 'dueDate' | 'title' | 'detail'>>): Promise<Reminder> {
  await sleep(200);
  const r = reminders.find((x) => x.id === rid);
  if (!r) throw new Error('Reminder not found.');
  Object.assign(r, patch);
  if (patch.status === 'DONE') r.completedAt = T;
  return structuredClone(r);
}

export async function listReminders(): Promise<ReminderItem[]> {
  await sleep(250);
  const items: ReminderItem[] = reminders
    .filter((r) => r.status === 'OPEN')
    .map((r) => ({
      kind: 'REMINDER',
      id: r.id,
      customerId: r.customerId,
      customerName: customers[r.customerId]?.fullName ?? 'Unknown',
      title: r.title,
      detail: r.detail,
      dueDate: r.dueDate,
      daysLeft: daysBetween(T, r.dueDate),
      origin: r.origin,
      status: r.status,
      dealId: null,
    }));
  for (const d of deals) {
    const s = d.stages.find((x) => !x.completedAt);
    if (!s || !s.dueDate) continue;
    const days = daysBetween(T, s.dueDate);
    if (days > 30) continue;
    items.push({
      kind: 'DEAL_DEADLINE',
      id: `${d.id}:${s.key}`,
      customerId: d.customerId,
      customerName: customers[d.customerId]?.fullName ?? 'Unknown',
      title: `${s.label} deadline`,
      detail: `${d.project} ${d.unit}. ${s.description}`,
      dueDate: s.dueDate,
      daysLeft: days,
      origin: 'DEAL',
      status: 'OPEN',
      dealId: d.id,
    });
  }
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export async function suggestMatches(id: string): Promise<CustomerDetail> {
  await sleep(1600);
  const c = cfind(id);
  const have = new Set((matches[id] ?? []).map((m) => m.projectId));
  const max = c.budgetMaxSgd ?? Infinity;
  const picks = MOCK_PROJECTS.filter((p) => !have.has(p.id) && (p.priceFromSgd ?? 0) <= max)
    .filter((p) => !c.preferences.segments.length || (p.segment && c.preferences.segments.includes(p.segment)) || (c.preferences.executiveCondo && p.type === 'EC'))
    .slice(0, 2);
  for (const p of picks)
    (matches[id] ??= []).push({
      projectId: p.id,
      origin: 'AI',
      reason: `${p.segment ?? ''} ${p.district ?? ''}, entry price ${p.priceFromSgd ? `S$${p.priceFromSgd.toLocaleString('en-SG')}` : 'n/a'} within budget; TOP ${p.expectedTop ?? 'TBC'}.`.trim(),
      status: 'SUGGESTED',
      createdAt: new Date().toISOString(),
    });
  return crmDetail(id);
}

export async function addMatch(id: string, projectId: string, reason?: string): Promise<CustomerDetail> {
  await sleep(250);
  const list = (matches[id] ??= []);
  const ex = list.find((m) => m.projectId === projectId);
  if (ex) Object.assign(ex, { status: 'SHORTLISTED', origin: 'AGENT', reason: reason || ex.reason });
  else list.push({ projectId, origin: 'AGENT', reason: reason || 'Added by you.', status: 'SHORTLISTED', createdAt: new Date().toISOString() });
  return crmDetail(id);
}

export async function updateMatch(id: string, projectId: string, status: ProjectMatch['status']): Promise<CustomerDetail> {
  await sleep(200);
  const m = (matches[id] ?? []).find((x) => x.projectId === projectId);
  if (m) m.status = status;
  return crmDetail(id);
}

export async function deleteMatch(id: string, projectId: string): Promise<CustomerDetail> {
  await sleep(200);
  matches[id] = (matches[id] ?? []).filter((m) => m.projectId !== projectId);
  return crmDetail(id);
}

export async function analyzeWhatsApp(files: File[]): Promise<WhatsAppAnalysis> {
  await sleep(1500 + files.length * 300);
  return {
    contactName: 'Marcus Lee',
    contactPhone: '+65 9734 2210',
    occurredAt: T,
    transcript: [
      { from: 'CUSTOMER', time: '09:12', text: 'Morning Rachel! My parents loved the place on Saturday 😊' },
      { from: 'AGENT', time: '09:15', text: "That's wonderful to hear! Did they have a favourite stack?" },
      { from: 'CUSTOMER', time: '09:18', text: 'The 3 bedder on stack 08, high floor. Can we keep it under 1.85M?' },
      { from: 'CUSTOMER', time: '09:19', text: 'Also my wife asked if there is a 3BR with a study. Baby coming in May so we may need the extra room.' },
      { from: 'AGENT', time: '09:24', text: "Let me check the price list for stack 08 and the 3BR+study units. I'll revert by tomorrow." },
      { from: 'CUSTOMER', time: '09:25', text: 'Thanks! We are hoping to book before end of the month.' },
    ],
    summary:
      "Marcus's parents liked the Grand Dunman showflat. The family is leaning towards a high-floor 3BR on stack 08 and wants to stay under S$1.85M. His wife asked about 3BR + study units because a baby is due in May. They hope to book before the end of the month.",
    keyPoints: ['Prefers stack 08, high floor', 'Ceiling now S$1.85M', 'Asked about 3BR + study (baby due in May)', 'Wants to book before month end'],
    facts: {
      residency: null,
      purpose: 'OWN_STAY',
      propertiesOwned: null,
      household: 'Married, baby due in May',
      budgetMinSgd: null,
      budgetMaxSgd: 1_850_000,
      areas: [],
      bedrooms: ['3BR', '3BR + study'],
      segments: [],
      executiveCondo: null,
      timeline: 'Book before end of the month',
    },
    suggestedReminders: [
      { title: 'Send stack 08 and 3BR + study prices', detail: 'Promised in the chat to revert by tomorrow.', dueDate: addDays(T, 1) },
      { title: 'Hold a unit for Marcus before month end', detail: 'Check booking slots with the developer sales team.', dueDate: addDays(T, 4) },
    ],
    candidates: [
      { customerId: 'c6', fullName: 'Marcus Lee', phone: '+65 9734 2210', confidence: 0.96, why: 'Phone number in the chat header matches exactly.' },
      { customerId: 'c8', fullName: 'Daniel Koh', phone: '+65 9011 7788', confidence: 0.12, why: 'Also a prospect for a 3BR, but the name and phone differ.' },
    ],
  };
}

export async function commitWhatsApp(body: WhatsAppCommit): Promise<CustomerDetail> {
  await sleep(600);
  let id = body.customerId;
  if (!id) {
    id = `c${Object.keys(customers).length + 1}`;
    customers[id] = blank(id, body.newCustomerName || body.analysis.contactName || 'New contact', {
      phone: body.analysis.contactPhone,
      source: 'WhatsApp',
    });
  }
  const c = cfind(id);
  const a = body.analysis;
  const note: Note = {
    id: nid('n-wa'),
    customerId: id,
    kind: 'DISCUSSION',
    text: a.summary,
    source: 'WHATSAPP_AI',
    keyPoints: a.keyPoints,
    transcript: a.transcript,
    occurredAt: a.occurredAt,
    createdAt: new Date().toISOString(),
  };
  (notes[id] ??= []).unshift(note);
  if (body.applyFacts) {
    const f = a.facts;
    if (f.residency) c.residency = f.residency;
    if (f.purpose) c.profile.purpose = f.purpose;
    if (f.propertiesOwned !== null) c.profile.propertiesOwned = f.propertiesOwned;
    if (f.household) c.profile.household = f.household;
    if (f.budgetMinSgd !== null) c.budgetMinSgd = f.budgetMinSgd;
    if (f.budgetMaxSgd !== null) c.budgetMaxSgd = f.budgetMaxSgd;
    if (f.areas.length) c.preferences.areas = [...new Set([...c.preferences.areas, ...f.areas])];
    if (f.bedrooms.length) c.preferences.bedrooms = [...new Set([...c.preferences.bedrooms, ...f.bedrooms])];
    if (f.segments.length) c.preferences.segments = [...new Set([...c.preferences.segments, ...f.segments])];
    if (f.executiveCondo !== null) c.preferences.executiveCondo = f.executiveCondo;
    if (f.timeline) c.preferences.timeline = f.timeline;
  }
  for (const r of body.reminders)
    reminders.push({ id: nid('r'), customerId: id, ...r, origin: 'AI', status: 'OPEN', noteId: note.id, createdAt: note.createdAt, completedAt: null });
  return crmDetail(id);
}
