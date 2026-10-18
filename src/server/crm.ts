// Mini CRM: customers, notes, reminders, project matches, and the WhatsApp import.
// Gemini reads chats and proposes plans/matches; nothing it proposes is saved until the agent confirms.

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
    AfterSalesService,
    CustomerDetail,
    ImportantDate,
    Person,
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
} from '../shared/types.js';
import { generateJson } from './ai/gemini.js';
import { config } from './config.js';
import { BadRequest, NotFound, listSummaries } from './deals.js';
import { addDays, diffDays, formatDate, todaySg } from './domain/dates.js';
import { normalizeName } from './domain/identity.js';
import { STAGE_DEFS } from './domain/stages.js';
import { derivedDates, dueWithin, isValidDate, relationText } from './domain/important-dates.js';
import { getProject, listProjects } from './projects.js';
import { store, toPublicCustomer, withCrmDefaults, type StoredCustomer } from './store.js';

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function now(): string {
    return new Date().toISOString();
}

async function loadCustomer(id: string): Promise<StoredCustomer> {
    const c = await store.getCustomer(id);
    if (!c) throw new NotFound(`Customer ${id} not found`);
    return c;
}

// ---------- Customers ----------

export async function customerDetail(id: string): Promise<CustomerDetail> {
    const c = await loadCustomer(id);
    const [notes, reminders, deals, people, dates, services] = await Promise.all([
        store.listNotes(id),
        store.listReminders(id),
        store.listDeals(),
        store.list('people', id),
        store.list('dates', id),
        store.list('services', id),
    ]);
    const own = deals.filter((d) => d.customerId === id);
    const dealIds = new Set(own.map((d) => d.id));
    const allDates = [
        ...dates,
        ...derivedDates({ customerId: id, customerName: c.fullName, customerBirthday: c.consent.givenAt ? c.dateOfBirth : null, people, deals: own, services }),
    ];
    const statusOrder = { OPEN: 0, DONE: 1, DISMISSED: 2 } as const;
    return {
        customer: toPublicCustomer(c),
        notes: notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        reminders: reminders.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || a.dueDate.localeCompare(b.dueDate)),
        matches: c.matches.flatMap((m) => {
            const project = getProject(m.projectId);
            return project ? [{ ...m, project }] : [];
        }),
        deals: (await listSummaries()).filter((d) => dealIds.has(d.id)),
        people: people.sort((a, b) => a.relation.localeCompare(b.relation) || a.name.localeCompare(b.name)),
        dates: allDates,
        services: services.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
}

export async function customerSummaries(q?: string, status?: string): Promise<CustomerSummary[]> {
    const today = todaySg();
    const [customers, notes, reminders, deals] = await Promise.all([
        store.listCustomers(),
        store.listAllNotes(),
        store.listReminders(),
        store.listDeals(),
    ]);
    const needle = q?.trim().toLowerCase();
    const digits = needle?.replace(/\D/g, '');
    const out = customers
        .filter((c) => !status || c.status === status)
        .filter(
            (c) =>
                !needle ||
                c.fullName.toLowerCase().includes(needle) ||
                (!!digits && digits.length >= 4 && (c.phone ?? '').replace(/\D/g, '').includes(digits)),
        )
        .map((c): CustomerSummary => {
            const own = notes.filter((n) => n.customerId === c.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
            const open = reminders.filter((r) => r.customerId === c.id && r.status === 'OPEN').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
            const last = own[0];
            return {
                id: c.id,
                fullName: c.fullName,
                phone: c.phone,
                status: c.status,
                budgetMinSgd: c.budgetMinSgd,
                budgetMaxSgd: c.budgetMaxSgd,
                lastContactAt: last ? (last.occurredAt ?? last.createdAt.slice(0, 10)) : null,
                lastNoteSnippet: last ? last.text.slice(0, 140) : null,
                openReminders: open.length,
                nextReminderDate: open[0]?.dueDate ?? null,
                overdueReminders: open.filter((r) => r.dueDate < today).length,
                deals: deals.filter((d) => d.customerId === c.id).length,
                shortlisted: c.matches.filter((m) => m.status === 'SHORTLISTED').length,
            };
        });
    // Needs attention first: overdue, then soonest reminder, then most recently contacted.
    return out.sort(
        (a, b) =>
            b.overdueReminders - a.overdueReminders ||
            (a.nextReminderDate ?? '9999').localeCompare(b.nextReminderDate ?? '9999') ||
            (b.lastContactAt ?? '').localeCompare(a.lastContactAt ?? ''),
    );
}

function applyInput(c: StoredCustomer, input: Partial<CustomerInput>): StoredCustomer {
    const next = structuredClone(c);
    if (input.fullName !== undefined) next.fullName = input.fullName.trim();
    if (input.phone !== undefined) next.phone = input.phone;
    if (input.email !== undefined) next.email = input.email;
    if (input.source !== undefined) next.source = input.source;
    if (input.status !== undefined) next.status = input.status;
    if (input.residency !== undefined) next.residency = input.residency;
    if (input.purpose !== undefined) next.profile.purpose = input.purpose;
    if (input.propertiesOwned !== undefined) next.profile.propertiesOwned = input.propertiesOwned;
    if (input.household !== undefined) next.profile.household = input.household;
    if (input.budgetMinSgd !== undefined) next.budgetMinSgd = input.budgetMinSgd;
    if (input.budgetMaxSgd !== undefined) next.budgetMaxSgd = input.budgetMaxSgd;
    if (input.preferences) next.preferences = { ...next.preferences, ...input.preferences };
    if (input.tags !== undefined) next.tags = input.tags;
    if (input.company !== undefined) next.company = input.company;
    if (input.jobTitle !== undefined) next.jobTitle = input.jobTitle;
    if (input.dateOfBirth !== undefined) next.dateOfBirth = input.dateOfBirth;
    if (input.socialProfiles !== undefined) next.socialProfiles = input.socialProfiles;
    next.updatedAt = now();
    return next;
}

export async function createCustomer(input: CustomerInput): Promise<CustomerDetail> {
    const c = applyInput(withCrmDefaults({ id: randomUUID(), fullName: input.fullName.trim() }), input);
    await store.saveCustomer(c);
    return customerDetail(c.id);
}

export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<CustomerDetail> {
    await store.saveCustomer(applyInput(await loadCustomer(id), input));
    return customerDetail(id);
}

// ---------- Notes & reminders ----------

export async function addNote(
    customerId: string,
    input: { kind: NoteKind; text: string; occurredAt?: string | null; remindOn?: string | null },
): Promise<CustomerDetail> {
    await loadCustomer(customerId);
    const note: Note = {
        id: randomUUID(),
        customerId,
        kind: input.kind,
        text: input.text.trim(),
        source: 'MANUAL',
        keyPoints: [],
        transcript: [],
        occurredAt: input.occurredAt ?? todaySg(),
        createdAt: now(),
    };
    await store.saveNote(note);
    if (input.kind === 'PLAN' && input.remindOn) {
        await saveReminder(customerId, { title: firstLine(note.text), detail: note.text, dueDate: input.remindOn }, 'AGENT', note.id);
    }
    return customerDetail(customerId);
}

function firstLine(text: string): string {
    const line = text.split('\n')[0].trim();
    return line.length > 90 ? `${line.slice(0, 87)}…` : line;
}

export async function deleteNote(customerId: string, noteId: string): Promise<CustomerDetail> {
    const notes = await store.listNotes(customerId);
    if (!notes.some((n) => n.id === noteId)) throw new NotFound(`Note ${noteId} not found`);
    await store.deleteNote(noteId);
    return customerDetail(customerId);
}

async function saveReminder(customerId: string, r: SuggestedReminder, origin: 'AI' | 'AGENT', noteId: string | null): Promise<Reminder> {
    if (!DATE.test(r.dueDate)) throw new BadRequest('dueDate must be YYYY-MM-DD');
    const reminder: Reminder = {
        id: randomUUID(),
        customerId,
        title: r.title.trim(),
        detail: r.detail?.trim() || null,
        dueDate: r.dueDate,
        origin,
        status: 'OPEN',
        noteId,
        createdAt: now(),
        completedAt: null,
    };
    await store.saveReminder(reminder);
    return reminder;
}

export async function addReminder(customerId: string, r: SuggestedReminder & { origin: 'AI' | 'AGENT' }): Promise<CustomerDetail> {
    await loadCustomer(customerId);
    await saveReminder(customerId, r, r.origin, null);
    return customerDetail(customerId);
}

export async function updateReminder(
    id: string,
    patch: { status?: Reminder['status']; dueDate?: string; title?: string; detail?: string | null },
): Promise<Reminder> {
    const r = await store.getReminder(id);
    if (!r) throw new NotFound(`Reminder ${id} not found`);
    if (patch.dueDate !== undefined) {
        if (!DATE.test(patch.dueDate)) throw new BadRequest('dueDate must be YYYY-MM-DD');
        r.dueDate = patch.dueDate;
    }
    if (patch.title !== undefined) r.title = patch.title;
    if (patch.detail !== undefined) r.detail = patch.detail;
    if (patch.status !== undefined) {
        r.status = patch.status;
        r.completedAt = patch.status === 'OPEN' ? null : now();
    }
    await store.saveReminder(r);
    return r;
}

/** Everything due, across all customers: stored reminders plus legal deadlines from open deals. */
export async function reminderFeed(status: Reminder['status'] = 'OPEN', days = 30): Promise<ReminderItem[]> {
    const today = todaySg();
    const horizon = addDays(today, days);
    const [customers, reminders, deals] = await Promise.all([store.listCustomers(), store.listReminders(), store.listDeals()]);
    const name = new Map(customers.map((c) => [c.id, c.fullName]));
    const items: ReminderItem[] = reminders
        .filter((r) => r.status === status && (status !== 'OPEN' || r.dueDate <= horizon))
        .map((r) => ({
            kind: 'REMINDER',
            id: r.id,
            customerId: r.customerId,
            customerName: name.get(r.customerId) ?? 'Unknown',
            title: r.title,
            detail: r.detail,
            dueDate: r.dueDate,
            daysLeft: diffDays(today, r.dueDate),
            origin: r.origin,
            status: r.status,
            dealId: null,
        }));
    if (status === 'OPEN') {
        for (const d of deals) {
            for (const s of d.stages) {
                if (s.completedAt || !s.dueDate || s.dueDate > horizon) continue;
                items.push({
                    kind: 'DEAL_DEADLINE',
                    id: `${d.id}:${s.key}`,
                    customerId: d.customerId,
                    customerName: name.get(d.customerId) ?? 'Unknown',
                    title: `${s.label} — ${d.project} ${d.unit}`,
                    detail: STAGE_DEFS.find((x) => x.key === s.key)?.description ?? null,
                    dueDate: s.dueDate,
                    daysLeft: diffDays(today, s.dueDate),
                    origin: 'DEAL',
                    status: 'OPEN',
                    dealId: d.id,
                });
            }
        }
    }
    if (status === 'OPEN') {
        const [people, dates, services] = await Promise.all([store.list('people'), store.list('dates'), store.list('services')]);
        const personById = new Map(people.map((p) => [p.id, p]));
        for (const c of customers) {
            const all = [
                ...dates.filter((d) => d.customerId === c.id),
                ...derivedDates({
                    customerId: c.id,
                    customerName: c.fullName,
                    customerBirthday: c.consent.givenAt ? c.dateOfBirth : null,
                    people: people.filter((p) => p.customerId === c.id),
                    deals: deals.filter((d) => d.customerId === c.id),
                    services: services.filter((x) => x.customerId === c.id),
                }),
            ];
            for (const d of all) {
                const due = dueWithin(d, today, days);
                if (!due) continue;
                const person = d.personId ? personById.get(d.personId) : undefined;
                items.push({
                    kind: 'IMPORTANT_DATE',
                    id: `date:${d.id}:${due.next}`,
                    customerId: c.id,
                    customerName: c.fullName,
                    title: dateTitle(d, person, c.fullName, due.next),
                    detail: person ? `${person.name} is ${c.fullName}'s ${relationText(person)}.` : null,
                    dueDate: due.next,
                    daysLeft: due.daysLeft,
                    origin: 'DATE',
                    status: 'OPEN',
                    dealId: null,
                    dateKind: d.kind,
                    personName: person?.name ?? null,
                    relationLabel: person ? relationText(person) : null,
                });
            }
        }
    }
    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** "GOH BOON KIAT" -> "Goh Boon Kiat" (names read from IDs are upper case). */
function titleCase(name: string): string {
    return name === name.toUpperCase() ? name.toLowerCase().replace(/\b([a-z])/g, (ch) => ch.toUpperCase()) : name;
}

function dateTitle(d: ImportantDate, person: Person | undefined, customerName: string, on: string): string {
    if (d.kind === 'BIRTHDAY') {
        const name = person?.name ?? titleCase(customerName);
        const whose = person ? ` (${relationText(person)} of ${titleCase(customerName)})` : '';
        const m = /^(\d{4})-/.exec(d.date);
        const age = m ? Number(on.slice(0, 4)) - Number(m[1]) : null;
        return age !== null && age > 0 && age < 120 ? `${name} turns ${age}${whose}` : `${name}'s birthday${whose}`;
    }
    return person ? `${d.label} — ${person.name}` : d.label;
}

// ---------- AI: follow-up plan ----------

const PlanSchema = z.object({
    reminders: z
        .array(z.object({ title: z.string(), detail: z.string().nullable(), dueDate: z.string().regex(DATE) }))
        .min(1)
        .max(5),
});

async function customerContext(id: string) {
    const d = await customerDetail(id);
    return {
        today: todaySg(),
        customer: d.customer,
        recentNotes: d.notes.slice(0, 8).map((n) => ({
            kind: n.kind,
            when: n.occurredAt,
            text: n.text,
            keyPoints: n.keyPoints,
            transcript: n.transcript.slice(-30),
        })),
        openReminders: d.reminders.filter((r) => r.status === 'OPEN').map((r) => ({ title: r.title, dueDate: r.dueDate })),
        matchedProjects: d.matches.map((m) => ({ name: m.project.name, status: m.status, reason: m.reason, expectedTop: m.project.expectedTop })),
        deals: d.deals,
    };
}

export async function suggestPlan(customerId: string): Promise<SuggestedReminder[]> {
    const ctx = await customerContext(customerId);
    const out = await generateJson({
        schema: PlanSchema,
        system:
            'You are a senior Singapore property agent planning follow-ups for a colleague. Propose concrete, dated next ' +
            'actions that move this customer forward (from lead to booking, or through closing and after-sales). Ground ' +
            'every item in the notes and data; honour promises already made (e.g. "send floor plans by Tuesday"). ' +
            'Do not repeat reminders that are already open. Never invent facts, prices or ID numbers.',
        prompt: `Today is ${formatDate(ctx.today)} (${ctx.today}). Dates must be on or after today, YYYY-MM-DD.
Customer file (JSON):
${JSON.stringify(ctx, null, 2)}

Return 2–5 reminders, soonest first. title: short imperative ("Call Kelvin to confirm Saturday viewing"). detail: one or two sentences with the why and what to bring/say.`,
    });
    return out.reminders.map((r) => ({ ...r, dueDate: r.dueDate < ctx.today ? ctx.today : r.dueDate }));
}

// ---------- Project matches ----------

export async function suggestMatches(customerId: string): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    const catalog = listProjects().filter((p) => !p.fictional);
    const ids = catalog.map((p) => p.id) as [string, ...string[]];
    const ctx = await customerContext(customerId);
    const out = await generateJson({
        schema: z.object({
            matches: z.array(z.object({ projectId: z.enum(ids), reason: z.string() })).max(5),
        }),
        system:
            'You match Singapore property buyers to new-launch projects. Use only the catalog given. Respect budget, ' +
            'segment/area, bedroom needs and EC eligibility hints (ECs are for Singapore Citizen households, first-timers ' +
            'typically). Explain each match in one sentence citing the customer facts and project facts. Return fewer ' +
            'matches rather than weak ones; return none if the profile is too thin.',
        prompt: `Customer (JSON):
${JSON.stringify({ customer: ctx.customer, recentNotes: ctx.recentNotes.slice(0, 4) }, null, 2)}

Catalog (JSON):
${JSON.stringify(catalog.map(({ sources: _s, fictional: _f, ...p }) => p))}

Already matched (skip these): ${c.matches.map((m) => m.projectId).join(', ') || 'none'}`,
    });
    const existing = new Set(c.matches.map((m) => m.projectId));
    for (const m of out.matches) {
        if (existing.has(m.projectId)) continue;
        c.matches.push({ projectId: m.projectId, origin: 'AI', reason: m.reason, status: 'SUGGESTED', createdAt: now() });
        existing.add(m.projectId);
    }
    c.updatedAt = now();
    await store.saveCustomer(c);
    return customerDetail(customerId);
}

export async function addMatch(customerId: string, projectId: string, reason?: string): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    if (!getProject(projectId)) throw new BadRequest(`Unknown project ${projectId}`);
    const existing = c.matches.find((m) => m.projectId === projectId);
    if (existing) {
        existing.status = 'SHORTLISTED';
        if (reason) existing.reason = reason;
    } else {
        c.matches.push({ projectId, origin: 'AGENT', reason: reason?.trim() || 'Added by agent', status: 'SHORTLISTED', createdAt: now() });
    }
    c.updatedAt = now();
    await store.saveCustomer(c);
    return customerDetail(customerId);
}

export async function setMatchStatus(customerId: string, projectId: string, status: ProjectMatch['status'] | null): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    const i = c.matches.findIndex((m) => m.projectId === projectId);
    if (i < 0) throw new NotFound(`No match for project ${projectId}`);
    if (status === null) c.matches.splice(i, 1);
    else c.matches[i].status = status;
    c.updatedAt = now();
    await store.saveCustomer(c);
    return customerDetail(customerId);
}

// ---------- WhatsApp import ----------

const Residency = z.enum(['SC', 'SPR', 'FOREIGNER']).nullable();
const Purpose = z.enum(['OWN_STAY', 'INVESTMENT']).nullable();
const Segment = z.enum(['CCR', 'RCR', 'OCR']);

export const ChatSchema = z.object({
    contactName: z.string().nullable(),
    contactPhone: z.string().nullable(),
    occurredAt: z.string().nullable(),
    transcript: z.array(z.object({ from: z.enum(['AGENT', 'CUSTOMER']), time: z.string().nullable(), text: z.string() })),
    summary: z.string(),
    keyPoints: z.array(z.string()),
    facts: z.object({
        residency: Residency,
        purpose: Purpose,
        propertiesOwned: z.number().int().min(0).nullable(),
        household: z.string().nullable(),
        budgetMinSgd: z.number().nullable(),
        budgetMaxSgd: z.number().nullable(),
        areas: z.array(z.string()),
        bedrooms: z.array(z.string()),
        segments: z.array(Segment),
        executiveCondo: z.boolean().nullable(),
        timeline: z.string().nullable(),
    }),
    suggestedReminders: z.array(z.object({ title: z.string(), detail: z.string().nullable(), dueDate: z.string().regex(DATE) })).max(6),
});

// Second extraction pass (kept separate: one schema with everything exceeds Gemini's schema limits).
export const CircleSchema = z.object({
    customerUpdates: z.object({ company: z.string().nullable(), jobTitle: z.string().nullable(), birthday: z.string().nullable() }),
    socialProfiles: z.array(z.object({ platform: z.enum(['LINKEDIN', 'INSTAGRAM', 'FACEBOOK', 'OTHER']), url: z.string() })).max(6),
    people: z
        .array(
            z.object({
                name: z.string(),
                relation: z.enum(['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'OTHER_RELATIVE', 'COLLEAGUE', 'FRIEND', 'ADVISOR', 'TENANT', 'OTHER']),
                relationLabel: z.string().nullable(),
                birthday: z.string().nullable(),
                company: z.string().nullable(),
                jobTitle: z.string().nullable(),
                school: z.string().nullable(),
                phone: z.string().nullable(),
                notes: z.string().nullable(),
                isProspect: z.boolean(),
            }),
        )
        .max(15),
    importantDates: z
        .array(
            z.object({
                label: z.string(),
                kind: z.enum(['BIRTHDAY', 'ANNIVERSARY', 'HANDOVER', 'SCHOOL', 'LEASE', 'TAX', 'CUSTOM']),
                date: z.string(),
                yearly: z.boolean(),
                personName: z.string().nullable(),
            }),
        )
        .max(15),
    services: z
        .array(
            z.object({
                type: z.enum(['RENTAL', 'FURNISHING', 'TENANCY', 'TAX', 'DEFECTS', 'REFINANCING', 'OTHER']),
                title: z.string(),
                // Fixed keys (Gemini's schema support has no open maps); nulls are dropped after parsing.
                details: z.object({
                    askingRentSgd: z.number().nullable(),
                    availableFrom: z.string().nullable(),
                    budgetSgd: z.number().nullable(),
                    scope: z.string().nullable(),
                    vendor: z.string().nullable(),
                    tenantName: z.string().nullable(),
                    monthlyRentSgd: z.number().nullable(),
                    leaseStart: z.string().nullable(),
                    leaseEnd: z.string().nullable(),
                    taxYear: z.number().nullable(),
                    taxType: z.string().nullable(),
                }),
                notes: z.string().nullable(),
            }),
        )
        .max(6),
});
// Even this exceeds the limit in one call, so it is requested in two halves.
const PeopleSchema = CircleSchema.pick({ customerUpdates: true, socialProfiles: true, people: true });
const DatesServicesSchema = CircleSchema.pick({ importantDates: true, services: true });


function phoneDigits(p: string | null | undefined): string {
    return (p ?? '').replace(/\D/g, '').slice(-8);
}

/** Deterministic candidate matching: same phone wins; otherwise overlap of name words. */
function rankCandidates(customers: StoredCustomer[], name: string | null, phone: string | null): WhatsAppAnalysis['candidates'] {
    const want = new Set(normalizeName((name ?? '').replace(/\b(MR|MRS|MS|MDM|DR)\b\.?/gi, '')).split(' ').filter((w) => w.length > 1));
    const digits = phoneDigits(phone);
    return customers
        .map((c) => {
            if (digits.length === 8 && phoneDigits(c.phone) === digits) {
                return { customerId: c.id, fullName: c.fullName, phone: c.phone, confidence: 0.98, why: 'Same phone number' };
            }
            const have = new Set(normalizeName(c.fullName).split(' '));
            const shared = [...want].filter((w) => have.has(w)).length;
            const confidence = want.size ? shared / Math.max(want.size, 1) : 0;
            return { customerId: c.id, fullName: c.fullName, phone: c.phone, confidence: Math.round(confidence * 0.9 * 100) / 100, why: `${shared} of ${want.size} name words match` };
        })
        .filter((c) => c.confidence >= 0.5)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
}

export async function analyzeWhatsApp(files: Array<{ mimeType: string; data: Buffer }>): Promise<WhatsAppAnalysis> {
    if (files.length === 0 || files.length > 5) throw new BadRequest('Upload 1 to 5 screenshots.');
    const today = todaySg();
    const chatCall = generateJson({
        schema: ChatSchema,
        files,
        system:
            `You read WhatsApp chat screenshots for ${config.agentName}, a Singapore property agent. Her own messages are ` +
            'the outgoing bubbles on the right (AGENT); the contact is on the left (CUSTOMER). Screenshots may overlap — ' +
            'de-duplicate messages and keep chronological order. Copy message text faithfully. A screenshot may instead be ' +
            "a social profile (LinkedIn/Instagram/Facebook) of the contact: then transcript is empty, summarise the profile, " +
            'and extract work, family mentions, dates and the profile URL if visible. Extract only facts actually shown; ' +
            'use null/empty when not stated. Never include NRIC numbers.',
        prompt: `Today is ${formatDate(today)} (${today}, ${new Date(`${today}T00:00:00Z`).toLocaleDateString('en-SG', { weekday: 'long', timeZone: 'UTC' })}).
Resolve relative dates ("next Saturday", "Tuesday", "Yesterday") against today, as YYYY-MM-DD.
- contactName / contactPhone: from the chat header.
- occurredAt: date of the latest message.
- summary: 2–3 sentences an agent can scan.
- keyPoints: 3–7 crisp bullets (needs, objections, commitments either side, deadlines).
- facts: residency SC/SPR/FOREIGNER; purpose OWN_STAY/INVESTMENT; propertiesOwned = residential properties already owned (an HDB flat counts); budgets in SGD numbers; areas and bedrooms as short labels ("Tampines", "4BR"); segments only if clearly implied; executiveCondo true if they want/are open to an EC.
- suggestedReminders: concrete follow-ups for the agent with due dates, including every promise the agent made and any appointment.
`,
    });
    const peopleCall = generateJson({
        schema: PeopleSchema,
        files,
        system:
            `You read screenshots (WhatsApp chats or a social profile) for ${config.agentName}, a Singapore property agent, ` +
            'to build an after-sales relationship profile of the contact. Her messages are on the right; the contact on ' +
            'the left. Extract only what is actually shown; null/empty otherwise. Never include NRIC numbers.',
        prompt: `Today is ${formatDate(today)} (${today}). Resolve relative dates against today as YYYY-MM-DD.
- customerUpdates: the contact's own company, job title, birthday (YYYY-MM-DD, or --MM-DD if the year is not known).
- socialProfiles: profile URLs that are visible.
- people: everyone else mentioned in the contact's circle — spouse, children, parents, siblings, colleagues, friends, advisors (lawyer, banker), tenants — with relation from the contact's point of view, relationLabel in plain words ("Brother", "Younger daughter"), and any birthday/age-derived info only if stated (birthday as YYYY-MM-DD or --MM-DD). isProspect = they may buy or rent property themselves (e.g. a referral).
- importantDates: dates worth remembering (birthdays, wedding anniversary, key handover, school start, lease end, tax deadlines, events), with personName when it belongs to someone in people (null if it is the contact's own). yearly = recurs each year.
- services: after-sales help requested or clearly needed: RENTAL (find a tenant: askingRentSgd, availableFrom), FURNISHING (budgetSgd, scope), TENANCY (tenantName, monthlyRentSgd, leaseStart, leaseEnd), TAX (taxYear = Year of Assessment, taxType), DEFECTS, REFINANCING, OTHER.`,
    });
    const datesCall = generateJson({
        schema: DatesServicesSchema,
        files,
        system:
            `You read screenshots (WhatsApp chats or a social profile) for ${config.agentName}, a Singapore property agent, ` +
            'to build an after-sales relationship profile of the contact. Her messages are on the right; the contact on ' +
            'the left. Extract only what is actually shown; null/empty otherwise. Never include NRIC numbers.',
        prompt: `Today is ${formatDate(today)} (${today}). Resolve relative dates against today as YYYY-MM-DD.
- customerUpdates: the contact's own company, job title, birthday (YYYY-MM-DD, or --MM-DD if the year is not known).
- socialProfiles: profile URLs that are visible.
- people: everyone else mentioned in the contact's circle — spouse, children, parents, siblings, colleagues, friends, advisors (lawyer, banker), tenants — with relation from the contact's point of view, relationLabel in plain words ("Brother", "Younger daughter"), and any birthday/age-derived info only if stated (birthday as YYYY-MM-DD or --MM-DD). isProspect = they may buy or rent property themselves (e.g. a referral).
- importantDates: dates worth remembering (birthdays, wedding anniversary, key handover, school start, lease end, tax deadlines, events), with personName when it belongs to someone in people (null if it is the contact's own). yearly = recurs each year.
- services: after-sales help requested or clearly needed: RENTAL (find a tenant: askingRentSgd, availableFrom), FURNISHING (budgetSgd, scope), TENANCY (tenantName, monthlyRentSgd, leaseStart, leaseEnd), TAX (taxYear = Year of Assessment, taxType), DEFECTS, REFINANCING, OTHER.`,
    });
    const [out, people, dated] = await Promise.all([chatCall, peopleCall, datesCall]);
    const circle = { ...people, ...dated };
    return {
        ...out,
        ...circle,
        services: circle.services.map((sv) => ({ ...sv, details: Object.fromEntries(Object.entries(sv.details).filter(([, v]) => v !== null)) })),
        candidates: rankCandidates(await store.listCustomers(), out.contactName, out.contactPhone),
    };
}

export async function commitWhatsApp(input: WhatsAppCommit): Promise<CustomerDetail> {
    const a = input.analysis;
    let c: StoredCustomer;
    if (input.customerId) {
        c = await loadCustomer(input.customerId);
    } else {
        const name = input.newCustomerName?.trim();
        if (!name) throw new BadRequest('Confirm the customer name before saving.');
        c = withCrmDefaults({ id: randomUUID(), fullName: name, phone: a.contactPhone, source: 'WhatsApp' });
    }
    // PDPA: details about other people are stored only with the customer's consent.
    if (input.consentGiven && !c.consent.givenAt) c.consent = { givenAt: now(), method: input.consentMethod?.trim() || 'Recorded during screenshot import' };
    const hasConsent = !!c.consent.givenAt;
    const relativeDates = a.importantDates.filter((d) => d.personName);
    if (!hasConsent && (a.people.length > 0 || relativeDates.length > 0)) {
        throw new BadRequest("Record the customer's consent before saving family or contact details.");
    }

    if (!c.phone && a.contactPhone) c.phone = a.contactPhone;
    if (a.customerUpdates.company) c.company = a.customerUpdates.company;
    if (a.customerUpdates.jobTitle) c.jobTitle = a.customerUpdates.jobTitle;
    if (a.customerUpdates.birthday && isValidDate(a.customerUpdates.birthday)) c.dateOfBirth = a.customerUpdates.birthday;
    for (const sp of a.socialProfiles) if (!c.socialProfiles.some((x) => x.url === sp.url)) c.socialProfiles.push(sp);
    if (input.applyFacts) {
        const f = a.facts;
        if (f.residency) c.residency = f.residency;
        if (f.purpose) c.profile.purpose = f.purpose;
        if (f.propertiesOwned !== null) c.profile.propertiesOwned = f.propertiesOwned;
        if (f.household) c.profile.household = f.household;
        if (f.budgetMinSgd !== null) c.budgetMinSgd = f.budgetMinSgd;
        if (f.budgetMaxSgd !== null) c.budgetMaxSgd = f.budgetMaxSgd;
        const merge = <T>(x: T[], y: T[]) => [...new Set([...x, ...y])];
        c.preferences.areas = merge(c.preferences.areas, f.areas);
        c.preferences.bedrooms = merge(c.preferences.bedrooms, f.bedrooms);
        c.preferences.segments = merge(c.preferences.segments, f.segments);
        if (f.executiveCondo !== null) c.preferences.executiveCondo = f.executiveCondo;
        if (f.timeline) c.preferences.timeline = f.timeline;
        if (c.status === 'LEAD' && (f.budgetMaxSgd !== null || f.bedrooms.length > 0)) c.status = 'PROSPECT';
    }
    c.updatedAt = now();
    await store.saveCustomer(c);

    // People: update someone already in the circle (same name), otherwise add them.
    const existing = await store.list('people', c.id);
    const byName = new Map(existing.map((p) => [normalizeName(p.name), p]));
    const savedPeople = new Map<string, Person>();
    for (const x of a.people) {
        const key = normalizeName(x.name);
        const prev = byName.get(key);
        const person: Person = prev
            ? {
                  ...prev,
                  relationLabel: x.relationLabel ?? prev.relationLabel,
                  birthday: x.birthday && isValidDate(x.birthday) ? x.birthday : prev.birthday,
                  company: x.company ?? prev.company,
                  jobTitle: x.jobTitle ?? prev.jobTitle,
                  school: x.school ?? prev.school,
                  phone: x.phone ?? prev.phone,
                  notes: x.notes ? [prev.notes, x.notes].filter(Boolean).join('\n') : prev.notes,
                  updatedAt: now(),
              }
            : {
                  id: randomUUID(),
                  customerId: c.id,
                  name: x.name.trim(),
                  relation: x.relation,
                  relationLabel: x.relationLabel,
                  birthday: x.birthday && isValidDate(x.birthday) ? x.birthday : null,
                  company: x.company,
                  jobTitle: x.jobTitle,
                  school: x.school,
                  phone: x.phone,
                  email: null,
                  notes: x.notes,
                  linkedCustomerId: null,
                  source: 'WHATSAPP_AI',
                  createdAt: now(),
                  updatedAt: now(),
              };
        // Referral: open a lead for them, linked from this person.
        if (input.createCustomersFor.some((n) => normalizeName(n) === key) && !person.linkedCustomerId) {
            const lead = withCrmDefaults({ id: randomUUID(), fullName: person.name, phone: person.phone, source: `Referral from ${c.fullName}`, status: 'LEAD' });
            await store.saveCustomer(lead);
            await store.saveNote({
                id: randomUUID(),
                customerId: lead.id,
                kind: 'DISCUSSION',
                text: `Referred by ${c.fullName} (${person.relationLabel ?? person.relation.toLowerCase()}). ${person.notes ?? ''}`.trim(),
                source: 'WHATSAPP_AI',
                keyPoints: [],
                transcript: [],
                occurredAt: a.occurredAt,
                createdAt: now(),
            });
            person.linkedCustomerId = lead.id;
        }
        await store.save('people', person);
        savedPeople.set(key, person);
    }

    const savedDates = await store.list('dates', c.id);
    for (const d of a.importantDates) {
        if (!isValidDate(d.date)) continue;
        const person = d.personName ? (savedPeople.get(normalizeName(d.personName)) ?? byName.get(normalizeName(d.personName))) : undefined;
        if (d.personName && !person) continue; // never store a relative's date without the relative
        if (d.kind === 'BIRTHDAY' && person) {
            if (!person.birthday) await store.save('people', { ...person, birthday: d.date, updatedAt: now() });
            continue; // birthdays live on the person and are derived from there
        }
        if (savedDates.some((x) => x.date === d.date && normalizeName(x.label) === normalizeName(d.label))) continue;
        await store.save('dates', {
            id: randomUUID(),
            customerId: c.id,
            personId: person?.id ?? null,
            serviceId: null,
            kind: d.kind,
            label: d.label,
            date: d.date,
            yearly: d.yearly,
            remindDaysBefore: d.kind === 'BIRTHDAY' ? 3 : 7,
            source: 'WHATSAPP_AI',
            createdAt: now(),
        });
    }

    for (const sv of a.services) {
        const service: AfterSalesService = {
            id: randomUUID(),
            customerId: c.id,
            dealId: null,
            property: null,
            type: sv.type,
            title: sv.title,
            status: 'OPEN',
            details: sv.details,
            notes: sv.notes,
            createdAt: now(),
            updatedAt: now(),
        };
        await store.save('services', service);
    }

    const note: Note = {
        id: randomUUID(),
        customerId: c.id,
        kind: 'DISCUSSION',
        text: a.summary,
        source: 'WHATSAPP_AI',
        keyPoints: a.keyPoints,
        transcript: a.transcript,
        occurredAt: a.occurredAt,
        createdAt: now(),
    };
    await store.saveNote(note);
    for (const r of input.reminders) await saveReminder(c.id, r, 'AI', note.id);
    return customerDetail(c.id);
}
