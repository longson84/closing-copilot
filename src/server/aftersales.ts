// After-sales relationship management: the customer's circle (people), important dates,
// after-sales services, PDPA consent, and web research on the customer's company.

import { randomUUID } from 'node:crypto';
import type { AfterSalesService, CustomerDetail, DateInput, Person, PersonInput, ServiceInput } from '../shared/types.js';
import { generateGrounded } from './ai/gemini.js';
import { customerDetail } from './crm.js';
import { BadRequest, NotFound } from './deals.js';
import { isValidDate } from './domain/important-dates.js';
import { store, type StoredCustomer } from './store.js';

function now(): string {
    return new Date().toISOString();
}

async function loadCustomer(id: string): Promise<StoredCustomer> {
    const c = await store.getCustomer(id);
    if (!c) throw new NotFound(`Customer ${id} not found`);
    return c;
}

function requireConsent(c: StoredCustomer): void {
    if (!c.consent.givenAt) throw new BadRequest("Record the customer's consent before storing family or contact details.");
}

async function owned<K extends 'people' | 'dates' | 'services'>(kind: K, customerId: string, id: string) {
    const doc = (await store.list(kind, customerId)).find((d) => d.id === id);
    if (!doc) throw new NotFound(`Not found: ${id}`);
    return doc;
}

// ---------- Consent ----------

export async function setConsent(customerId: string, given: boolean, method?: string): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    if (given) {
        c.consent = { givenAt: now(), method: method?.trim() || null };
    } else {
        // Withdrawal: stop holding details about the customer's circle.
        c.consent = { givenAt: null, method: null };
        for (const p of await store.list('people', customerId)) await store.remove('people', p.id);
        for (const d of await store.list('dates', customerId)) if (d.personId) await store.remove('dates', d.id);
    }
    c.updatedAt = now();
    await store.saveCustomer(c);
    return customerDetail(customerId);
}

// ---------- People ----------

function checkBirthday(b: string | null) {
    if (b !== null && !isValidDate(b)) throw new BadRequest('Birthday must be YYYY-MM-DD or --MM-DD.');
}

export async function addPerson(customerId: string, input: PersonInput): Promise<CustomerDetail> {
    requireConsent(await loadCustomer(customerId));
    checkBirthday(input.birthday);
    const person: Person = { ...input, id: randomUUID(), customerId, source: 'MANUAL', createdAt: now(), updatedAt: now() };
    await store.save('people', person);
    return customerDetail(customerId);
}

export async function updatePerson(customerId: string, personId: string, patch: Partial<PersonInput>): Promise<CustomerDetail> {
    requireConsent(await loadCustomer(customerId));
    const p = await owned('people', customerId, personId);
    if (patch.birthday !== undefined) checkBirthday(patch.birthday);
    await store.save('people', { ...p, ...patch, updatedAt: now() });
    return customerDetail(customerId);
}

export async function deletePerson(customerId: string, personId: string): Promise<CustomerDetail> {
    await owned('people', customerId, personId);
    await store.remove('people', personId);
    for (const d of await store.list('dates', customerId)) if (d.personId === personId) await store.remove('dates', d.id);
    return customerDetail(customerId);
}

// ---------- Important dates ----------

export async function addDate(customerId: string, input: DateInput): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    if (!isValidDate(input.date)) throw new BadRequest('Date must be YYYY-MM-DD or --MM-DD.');
    if (!input.yearly && input.date.startsWith('--')) throw new BadRequest('A one-off date needs a year.');
    if (input.personId) {
        requireConsent(c);
        await owned('people', customerId, input.personId);
    }
    await store.save('dates', { ...input, id: randomUUID(), customerId, source: 'MANUAL', createdAt: now() });
    return customerDetail(customerId);
}

export async function updateDate(customerId: string, dateId: string, patch: Partial<DateInput>): Promise<CustomerDetail> {
    const d = await owned('dates', customerId, dateId);
    if (patch.date !== undefined && !isValidDate(patch.date)) throw new BadRequest('Date must be YYYY-MM-DD or --MM-DD.');
    await store.save('dates', { ...d, ...patch });
    return customerDetail(customerId);
}

export async function deleteDate(customerId: string, dateId: string): Promise<CustomerDetail> {
    await owned('dates', customerId, dateId);
    await store.remove('dates', dateId);
    return customerDetail(customerId);
}

// ---------- After-sales services ----------

export async function addService(customerId: string, input: ServiceInput): Promise<CustomerDetail> {
    await loadCustomer(customerId);
    if (input.dealId) {
        const deal = await store.getDeal(input.dealId);
        if (!deal || deal.customerId !== customerId) throw new BadRequest('That deal is not this customer’s.');
    }
    const service: AfterSalesService = { ...input, id: randomUUID(), customerId, createdAt: now(), updatedAt: now() };
    await store.save('services', service);
    return customerDetail(customerId);
}

export async function updateService(customerId: string, serviceId: string, patch: Partial<ServiceInput>): Promise<CustomerDetail> {
    const s = await owned('services', customerId, serviceId);
    await store.save('services', { ...s, ...patch, details: { ...s.details, ...patch.details }, updatedAt: now() });
    return customerDetail(customerId);
}

export async function deleteService(customerId: string, serviceId: string): Promise<CustomerDetail> {
    await owned('services', customerId, serviceId);
    await store.remove('services', serviceId);
    for (const d of await store.list('dates', customerId)) if (d.serviceId === serviceId) await store.remove('dates', d.id);
    return customerDetail(customerId);
}

export async function listServices(status?: AfterSalesService['status']) {
    const [services, customers] = await Promise.all([store.list('services'), store.listCustomers()]);
    const name = new Map(customers.map((c) => [c.id, c.fullName]));
    return services
        // "OPEN" means still active: not started or in progress.
        .filter((s) => !status || s.status === status || (status === 'OPEN' && s.status === 'IN_PROGRESS'))
        .map((s) => ({ ...s, customerName: name.get(s.customerId) ?? 'Unknown' }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// ---------- Web research (Gemini + Google Search grounding) ----------

export async function researchCompany(customerId: string): Promise<CustomerDetail> {
    const c = await loadCustomer(customerId);
    requireConsent(c);
    if (!c.company) throw new BadRequest('Add the customer’s company first.');
    // Company-level research only: searching a private person by name is unreliable and intrusive.
    const { text, sources } = await generateGrounded({
        system:
            'You brief a Singapore property agent on a client’s employer so they can build rapport and judge buying ' +
            'capacity. Use Google Search. Be factual, cite only what the sources say, and do not research the individual.',
        prompt: `Company: "${c.company}"${c.jobTitle ? ` (client's role: ${c.jobTitle})` : ''}, likely in Singapore.
In at most 6 short bullets: what the company does, size/industry position, Singapore presence, any notable recent news (last 12 months), and one or two conversation starters for the agent. If you cannot identify the company with confidence, say so instead of guessing.`,
    });
    if (!text.trim()) throw new BadRequest('No research result. Try again later.');
    await store.saveNote({
        id: randomUUID(),
        customerId,
        kind: 'THOUGHT',
        text: `Company research: ${c.company}\n\n${text.trim()}`,
        source: 'WEB_AI',
        keyPoints: [],
        transcript: [],
        sources: sources.slice(0, 8),
        occurredAt: null,
        createdAt: now(),
    });
    return customerDetail(customerId);
}
