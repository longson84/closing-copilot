// Dev-only CRM fixtures for VITE_MOCK=1. All people, numbers and chats are fictional.
import type {
  AfterSalesService,
  DateInput,
  ImportantDate,
  Person,
  PersonInput,
  ServiceInput,
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
import { daysBetween, nextOccurrence, relationLabel, todayISO, turnsAge } from './format';
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
    company: null,
    jobTitle: null,
    consent: { givenAt: null, method: null },
    socialProfiles: [],
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

// ---------- Family, dates, after-sales (Ahmad bin Ismail, c5, has given consent) ----------

Object.assign(customers.c5, {
  company: 'Keppel Offshore & Marine (mock)',
  jobTitle: 'Senior project engineer',
  consent: { givenAt: iso(addDays(T, -40)), method: 'Verbal, at the Tembusu Grand showflat' },
  socialProfiles: [{ platform: 'LINKEDIN', url: 'https://www.linkedin.com/in/example-ahmad' }],
});
Object.assign(customers.c6, { company: 'DBS Bank (mock)', jobTitle: 'Treasury analyst' });
const pnow = iso(addDays(T, -40));
const yearsAgo = (n: number, offsetDays: number) => {
  const d = addDays(T, offsetDays);
  return `${Number(d.slice(0, 4)) - n}${d.slice(4)}`;
};
const people: Record<string, Person[]> = {
  c5: [
    { id: 'p-1', customerId: 'c5', name: 'Siti Aminah', relation: 'SPOUSE', relationLabel: 'Wife', birthday: '--02-14', company: 'Raffles Hospital (mock)', jobTitle: 'Nurse manager', school: null, phone: '+65 9666 7001', email: null, notes: 'Decides on interiors. Prefers calls after 7pm.', linkedCustomerId: null, source: 'MANUAL', createdAt: pnow, updatedAt: pnow },
    { id: 'p-2', customerId: 'c5', name: 'Irfan Ahmad', relation: 'CHILD', relationLabel: 'Son', birthday: yearsAgo(7, 5), company: null, jobTitle: null, school: 'Tao Nan School (P1 next year)', phone: null, email: null, notes: 'Loves football.', linkedCustomerId: null, source: 'MANUAL', createdAt: pnow, updatedAt: pnow },
    { id: 'p-3', customerId: 'c5', name: 'Aisyah Ahmad', relation: 'CHILD', relationLabel: 'Daughter', birthday: yearsAgo(4, 120), company: null, jobTitle: null, school: 'PCF Sparkletots', phone: null, email: null, notes: null, linkedCustomerId: null, source: 'WHATSAPP_AI', createdAt: pnow, updatedAt: pnow },
    { id: 'p-4', customerId: 'c5', name: 'Rajesh Kumar', relation: 'ADVISOR', relationLabel: 'Conveyancing lawyer', birthday: null, company: 'Kumar & Tan LLC (mock)', jobTitle: 'Partner', school: null, phone: '+65 6222 1100', email: 'rajesh@example.com', notes: 'Handled the Tembusu Grand conveyancing.', linkedCustomerId: null, source: 'MANUAL', createdAt: pnow, updatedAt: pnow },
    { id: 'p-5', customerId: 'c5', name: 'Hafiz Ismail', relation: 'SIBLING', relationLabel: 'Younger brother', birthday: null, company: null, jobTitle: null, school: null, phone: '+65 9001 2345', email: null, notes: 'Looking for a 2BR resale near Bedok.', linkedCustomerId: 'c8', source: 'WHATSAPP_AI', createdAt: pnow, updatedAt: pnow },
  ],
};
const dates: Record<string, ImportantDate[]> = {
  c5: [
    { id: 'dt-1', customerId: 'c5', personId: null, serviceId: null, kind: 'ANNIVERSARY', label: 'Wedding anniversary', date: yearsAgo(12, 26), yearly: true, remindDaysBefore: 7, source: 'MANUAL', createdAt: pnow },
    { id: 'dt-2', customerId: 'c5', personId: 'p-2', serviceId: null, kind: 'SCHOOL', label: 'Irfan starts Primary 1', date: `${Number(T.slice(0, 4)) + 1}-01-02`, yearly: false, remindDaysBefore: 14, source: 'MANUAL', createdAt: pnow },
    { id: 'dt-3', customerId: 'c5', personId: null, serviceId: 's-1', kind: 'LEASE', label: 'Trilliant lease ends', date: addDays(T, 70), yearly: false, remindDaysBefore: 60, source: 'SYSTEM', createdAt: pnow },
    { id: 'dt-4', customerId: 'c5', personId: null, serviceId: 's-2', kind: 'TAX', label: 'File Form B (rental income)', date: `${Number(T.slice(0, 4)) + 1}-04-18`, yearly: false, remindDaysBefore: 14, source: 'MANUAL', createdAt: pnow },
  ],
};
const services: Record<string, AfterSalesService[]> = {
  c5: [
    { id: 's-1', customerId: 'c5', dealId: null, property: 'The Tampines Trilliant #08-11', type: 'TENANCY', title: 'Tenancy follow-up', status: 'IN_PROGRESS', details: { tenantName: 'Mr & Mrs Lim', tenantPhone: '+65 8123 9090', monthlyRentSgd: 4200, depositSgd: 8400, leaseStart: addDays(T, -295), leaseEnd: addDays(T, 70), stampDutyPaid: true }, notes: 'Tenant wants to renew for 1 year if rent stays under S$4,300.', createdAt: pnow, updatedAt: pnow },
    { id: 's-2', customerId: 'c5', dealId: null, property: 'The Tampines Trilliant #08-11', type: 'TAX', title: 'File rental income tax', status: 'OPEN', details: { taxYear: `YA${Number(T.slice(0, 4)) + 1}`, taxType: 'Rental income (Form B/B1)', annualRentSgd: 50400, filedOn: null }, notes: 'Collect agent fee and repair receipts for deductions.', createdAt: pnow, updatedAt: pnow },
    { id: 's-3', customerId: 'c5', dealId: 'd-1005', property: 'Tembusu Grand #16-01', type: 'FURNISHING', title: 'Furnish the unit', status: 'OPEN', details: { budgetSgd: 45000, vendor: 'Ethan Interiors (mock)', scope: 'Kitchen cabinets, wardrobes, lighting' }, notes: null, createdAt: pnow, updatedAt: pnow },
  ],
};

/** Derived (SYSTEM) dates: birthdays from people and handover anniversaries from collected keys. */
function derivedDates(id: string): ImportantDate[] {
  const out: ImportantDate[] = [];
  for (const p of people[id] ?? [])
    if (p.birthday)
      out.push({ id: `bd-${p.id}`, customerId: id, personId: p.id, serviceId: null, kind: 'BIRTHDAY', label: `${p.name.split(' ')[0]}'s birthday`, date: p.birthday, yearly: true, remindDaysBefore: 3, source: 'SYSTEM', createdAt: p.createdAt });
  const c = customers[id];
  if (c?.dateOfBirth && c.consent.givenAt)
    out.push({ id: `bd-${id}`, customerId: id, personId: null, serviceId: null, kind: 'BIRTHDAY', label: `${c.fullName.split(' ')[0]}'s birthday`, date: c.dateOfBirth, yearly: true, remindDaysBefore: 3, source: 'SYSTEM', createdAt: c.createdAt });
  for (const d of deals.filter((x) => x.customerId === id)) {
    const keys = d.stages.find((s) => s.key === 'KEYS')?.completedAt;
    if (keys)
      out.push({ id: `ho-${d.id}`, customerId: id, personId: null, serviceId: null, kind: 'HANDOVER', label: `${d.project} handover anniversary`, date: keys, yearly: true, remindDaysBefore: 7, source: 'SYSTEM', createdAt: keys });
  }
  return out;
}
const allDates = (id: string) => [...(dates[id] ?? []), ...derivedDates(id)];

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
    people: people[id] ?? [],
    dates: allDates(id),
    services: services[id] ?? [],
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
  for (const c of Object.values(customers)) {
    for (const d of allDates(c.id)) {
      const next = nextOccurrence(d.date, d.yearly);
      if (!next) continue;
      const days = daysBetween(T, next);
      if (days < 0 || days > Math.max(30, d.remindDaysBefore)) continue;
      const person = d.personId ? (people[c.id] ?? []).find((p) => p.id === d.personId) : null;
      const rel = person ? (person.relationLabel ?? relationLabel[person.relation]).toLowerCase() : null;
      const age = d.kind === 'BIRTHDAY' ? turnsAge(d.date) : null;
      const title =
        d.kind === 'BIRTHDAY'
          ? `${person ? `${person.name} (${rel})` : c.fullName} ${age ? `turns ${age}` : 'birthday'}`
          : d.kind === 'ANNIVERSARY' && d.yearly && /^\d{4}/.test(d.date)
            ? `${d.label} (${Number(next.slice(0, 4)) - Number(d.date.slice(0, 4))} years)`
            : d.label;
      items.push({
        kind: 'IMPORTANT_DATE',
        id: `${d.id}:${next}`,
        customerId: c.id,
        customerName: c.fullName,
        title,
        detail: null,
        dueDate: next,
        daysLeft: days,
        origin: 'DATE',
        dateKind: d.kind,
        personName: person?.name ?? null,
        status: 'OPEN',
        dealId: null,
      });
    }
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
    customerUpdates: { company: 'DBS Bank', jobTitle: 'Vice President, Treasury', birthday: '1991-11-02' },
    people: [
      { name: 'Jasmine Lee', relation: 'SPOUSE', relationLabel: 'Wife', birthday: null, company: 'MOE', jobTitle: 'Primary school teacher', school: null, phone: null, notes: 'Wants a 3BR + study for the baby.', isProspect: false },
      { name: 'Kevin Lee', relation: 'SIBLING', relationLabel: 'Younger brother', birthday: null, company: null, jobTitle: null, school: null, phone: '+65 9188 4411', notes: 'Getting married next year, looking for a 2BR.', isProspect: true },
    ],
    importantDates: [
      { label: 'Baby due', kind: 'CUSTOM', date: `${Number(T.slice(0, 4)) + 1}-05-15`, yearly: false, personName: 'Jasmine Lee' },
      { label: 'Wedding anniversary', kind: 'ANNIVERSARY', date: '2019-11-23', yearly: true, personName: null },
    ],
    services: [{ type: 'OTHER', title: 'Sell the Marine Parade HDB flat', details: {}, notes: 'Completion in March; needs an HDB agent referral.' }],
    socialProfiles: [{ platform: 'LINKEDIN', url: 'https://www.linkedin.com/in/example-marcus-lee' }],
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
  const now2 = new Date().toISOString();
  if (body.consentGiven && !c.consent.givenAt) c.consent = { givenAt: now2, method: body.consentMethod };
  const cu = a.customerUpdates;
  if (cu.company) c.company = cu.company;
  if (cu.jobTitle) c.jobTitle = cu.jobTitle;
  if (cu.birthday && /^\d{4}/.test(cu.birthday)) c.dateOfBirth = cu.birthday;
  for (const sp of a.socialProfiles ?? []) if (!c.socialProfiles.some((x) => x.url === sp.url)) c.socialProfiles.push(sp);
  const canKeep = !!c.consent.givenAt;
  if (canKeep)
    for (const p of a.people) {
      let linked: string | null = null;
      if (body.createCustomersFor.includes(p.name)) {
        linked = `c${Object.keys(customers).length + 1}`;
        customers[linked] = blank(linked, p.name, { phone: p.phone, source: `Referral from ${c.fullName}` });
      }
      (people[id] ??= []).push({ id: nid('p'), customerId: id, name: p.name, relation: p.relation, relationLabel: p.relationLabel, birthday: p.birthday, company: p.company, jobTitle: p.jobTitle, school: p.school, phone: p.phone, email: null, notes: p.notes, linkedCustomerId: linked, source: 'WHATSAPP_AI', createdAt: now2, updatedAt: now2 });
    }
  for (const d of a.importantDates) {
    if (d.personName && !canKeep) continue;
    const pid = d.personName ? (people[id] ?? []).find((p) => p.name === d.personName)?.id ?? null : null;
    (dates[id] ??= []).push({ id: nid('dt'), customerId: id, personId: pid, serviceId: null, kind: d.kind, label: d.label, date: d.date, yearly: d.yearly, remindDaysBefore: 7, source: 'WHATSAPP_AI', createdAt: now2 });
  }
  for (const sv of a.services)
    (services[id] ??= []).push({ id: nid('s'), customerId: id, dealId: null, property: null, type: sv.type, title: sv.title, status: 'OPEN', details: sv.details, notes: sv.notes, createdAt: now2, updatedAt: now2 });
  for (const r of body.reminders)
    reminders.push({ id: nid('r'), customerId: id, ...r, origin: 'AI', status: 'OPEN', noteId: note.id, createdAt: note.createdAt, completedAt: null });
  return crmDetail(id);
}

// ---------- People / dates / services / consent / research ----------

export async function addPerson(id: string, input: PersonInput): Promise<CustomerDetail> {
  await sleep(250);
  if (!cfind(id).consent.givenAt) throw new Error('Record consent before storing family or contact details.');
  const now = new Date().toISOString();
  (people[id] ??= []).push({ ...input, id: nid('p'), customerId: id, source: 'MANUAL', createdAt: now, updatedAt: now });
  return crmDetail(id);
}
export async function updatePerson(id: string, pid: string, input: Partial<PersonInput>): Promise<CustomerDetail> {
  await sleep(200);
  const p = (people[id] ?? []).find((x) => x.id === pid);
  if (p) Object.assign(p, input, { updatedAt: new Date().toISOString() });
  return crmDetail(id);
}
export async function deletePerson(id: string, pid: string): Promise<CustomerDetail> {
  await sleep(200);
  people[id] = (people[id] ?? []).filter((x) => x.id !== pid);
  dates[id] = (dates[id] ?? []).filter((x) => x.personId !== pid);
  return crmDetail(id);
}
export async function addDate(id: string, input: DateInput): Promise<CustomerDetail> {
  await sleep(200);
  (dates[id] ??= []).push({ ...input, id: nid('dt'), customerId: id, source: 'MANUAL', createdAt: new Date().toISOString() });
  return crmDetail(id);
}
export async function updateDate(id: string, did: string, input: Partial<DateInput>): Promise<CustomerDetail> {
  await sleep(200);
  const d = (dates[id] ?? []).find((x) => x.id === did);
  if (d) Object.assign(d, input);
  return crmDetail(id);
}
export async function deleteDate(id: string, did: string): Promise<CustomerDetail> {
  await sleep(200);
  dates[id] = (dates[id] ?? []).filter((x) => x.id !== did);
  return crmDetail(id);
}
export async function addService(id: string, input: ServiceInput): Promise<CustomerDetail> {
  await sleep(250);
  const now = new Date().toISOString();
  const sid = nid('s');
  (services[id] ??= []).push({ ...input, id: sid, customerId: id, createdAt: now, updatedAt: now });
  const end = input.type === 'TENANCY' ? input.details.leaseEnd : null;
  if (typeof end === 'string' && end)
    (dates[id] ??= []).push({ id: nid('dt'), customerId: id, personId: null, serviceId: sid, kind: 'LEASE', label: 'Lease ends', date: end, yearly: false, remindDaysBefore: 60, source: 'SYSTEM', createdAt: now });
  return crmDetail(id);
}
export async function updateService(id: string, sid: string, input: Partial<ServiceInput>): Promise<CustomerDetail> {
  await sleep(200);
  const sv = (services[id] ?? []).find((x) => x.id === sid);
  if (sv) Object.assign(sv, input, { updatedAt: new Date().toISOString() });
  return crmDetail(id);
}
export async function deleteService(id: string, sid: string): Promise<CustomerDetail> {
  await sleep(200);
  services[id] = (services[id] ?? []).filter((x) => x.id !== sid);
  return crmDetail(id);
}
export async function setConsent(id: string, given: boolean, method?: string): Promise<CustomerDetail> {
  await sleep(250);
  cfind(id).consent = given ? { givenAt: new Date().toISOString(), method: method ?? null } : { givenAt: null, method: null };
  return crmDetail(id);
}
export async function listServices(): Promise<Array<AfterSalesService & { customerName: string }>> {
  await sleep(250);
  return Object.entries(services).flatMap(([cid, list]) =>
    list.filter((s) => s.status === 'OPEN' || s.status === 'IN_PROGRESS').map((s) => ({ ...s, customerName: customers[cid]?.fullName ?? 'Unknown' })),
  );
}
export async function researchCompany(id: string): Promise<CustomerDetail> {
  await sleep(2200);
  const c = cfind(id);
  if (!c.consent.givenAt) throw new Error('Record consent first.');
  if (!c.company) throw new Error('Add the company first.');
  (notes[id] ??= []).unshift({
    id: nid('n-web'),
    customerId: id,
    kind: 'THOUGHT',
    text: `${c.company} is a large Singapore employer in its sector. Recent news mentions a new project pipeline and a hiring push for engineers, which suggests stable income for ${c.fullName.split(' ')[0]}. Good conversation openers: the company's recent contract wins and its move to new offices in the west.`,
    source: 'WEB_AI',
    keyPoints: ['Stable employer with a strong order book', 'Moving offices to Jurong in 2027 (commute angle for future purchases)', 'Mention the recent contract win as an ice-breaker'],
    sources: [
      { title: 'Company announcement (mock)', url: 'https://example.com/news/contract-win' },
      { title: 'Business Times article (mock)', url: 'https://example.com/bt/expansion' },
    ],
    transcript: [],
    occurredAt: T,
    createdAt: new Date().toISOString(),
  });
  return crmDetail(id);
}
