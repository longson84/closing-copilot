// Rebuilds the demo world from scratch: wipes every collection, re-seeds the deals, then layers on
// documents, CRM notes, reminders, families, important dates, after-sales services and project matches.
// Screenshots that exist in demo-docs/whatsapp are imported through the real AI pipeline.
//
// Deliberately NOT seeded (they are performed live in the demo video):
//   - Tan Wei Ming: new booking from NRIC photo, then the S&P with the planted mismatch
//   - Kelvin Tay: new-lead WhatsApp import
//
// Usage: FIRESTORE_DATABASE='(default)' pnpm exec tsx --env-file=.env scripts/reset-demo.ts --confirm

import { Firestore } from '@google-cloud/firestore';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { DealDocument, DocCheck, StageKey } from '../src/shared/types.js';
import { addDate, addPerson, addService, setConsent } from '../src/server/aftersales.js';
import { addMatch, addNote, addReminder, analyzeWhatsApp, commitWhatsApp, createCustomer, setMatchStatus, suggestMatches, updateCustomer } from '../src/server/crm.js';
import { seedIfEmpty } from '../src/server/seed.js';
import { store, type StoredCustomer } from '../src/server/store.js';

const COLLECTIONS = ['deals', 'customers', 'notes', 'reminders', 'people', 'dates', 'services'];

if (!process.argv.includes('--confirm')) {
    console.error('Refusing to run without --confirm (this deletes all data in the target store).');
    process.exit(1);
}

async function wipe() {
    const databaseId = process.env.FIRESTORE_DATABASE;
    if (!databaseId) return; // in-memory store starts empty anyway
    const db = new Firestore({ databaseId });
    for (const name of COLLECTIONS) {
        const snap = await db.collection(name).get();
        for (let i = 0; i < snap.docs.length; i += 400) {
            const batch = db.batch();
            for (const d of snap.docs.slice(i, i + 400)) batch.delete(d.ref);
            await batch.commit();
        }
        console.log(`wiped ${name}: ${snap.size}`);
    }
}

async function customer(namePrefix: string): Promise<StoredCustomer> {
    const c = (await store.listCustomers()).find((x) => x.fullName.toUpperCase().startsWith(namePrefix.toUpperCase()));
    if (!c) throw new Error(`No customer ${namePrefix}`);
    return c;
}

// ---------- Deal documents (hand-authored, consistent with demo-docs) ----------

const ok = (field: string, message: string): DocCheck => ({ field, status: 'OK', message });

function doc(type: DealDocument['type'], fileName: string, uploadedAt: string, summary: string, extracted: DealDocument['extracted'], checks: DocCheck[], suggestedStage: StageKey | null): DealDocument {
    return { id: randomUUID(), type, fileName, uploadedAt: `${uploadedAt}T10:30:00+08:00`, summary, extracted, checks, suggestedStage };
}

async function attachDocuments() {
    for (const deal of await store.listDeals()) {
        const c = (await store.getCustomer(deal.customerId))!;
        const done = (k: StageKey) => deal.stages.find((s) => s.key === k)?.completedAt ?? null;
        const money = (n: number) => `$${n.toLocaleString('en-SG')}`;
        const base = { purchaserName: c.fullName, purchaserIdNumber: c.idNumberMasked, project: deal.project, unit: deal.unit, purchasePrice: deal.price };
        const docs: DealDocument[] = [
            doc('IDENTITY', `${c.idType?.toLowerCase() ?? 'id'}-${c.fullName.split(' ')[0].toLowerCase()}.jpg`, deal.otpDate, `${c.idType} of ${c.fullName}. Customer record created and customer due diligence recorded.`, { fullName: c.fullName, idType: c.idType, idNumber: c.idNumberMasked, dateOfBirth: c.dateOfBirth, ocr: 'Document AI' }, [ok('Identity document', `${c.idType} read and verified; CDD recorded.`), ok('Data minimisation', 'Image not stored; ID number masked everywhere outside the customer record (PDPA).')], null),
            doc('OTP', `otp-${deal.unit.replace('#', '')}.pdf`, deal.otpDate, `Option to Purchase issued on ${deal.otpDate} for ${deal.unit} at ${deal.project}, price ${money(deal.price)}, 5% booking fee ${money(deal.bookingFee)}.`, { ...base, bookingFee: deal.bookingFee, documentDate: deal.otpDate, ocr: 'Document AI' }, [ok('purchaserName', `Matches the buyer's ${c.idType}.`), ok('purchaserIdNumber', `Matches the verified ${c.idType} (${c.idNumberMasked}).`), ok('unit', `Unit ${deal.unit} matches.`), ok('purchasePrice', `${money(deal.price)} matches.`), ok('bookingFee', `${money(deal.bookingFee)} is 5% of the price.`)], 'BOOKING'),
        ];
        const spa = done('SPA_DELIVERED');
        if (spa) {
            // Chen's S&P carries a typo in the price — a pre-existing issue for the pipeline view.
            const isChen = c.fullName.startsWith('CHEN');
            const printed = isChen ? 2_005_000 : deal.price;
            docs.push(
                doc('SPA', `spa-${deal.unit.replace('#', '')}.pdf`, spa, `Sale and Purchase Agreement delivered on ${spa} for ${deal.unit} at ${deal.project}${isChen ? `, stating a purchase price of ${money(printed)}` : ''}.`, { ...base, purchasePrice: printed, documentDate: spa, ocr: 'Document AI' }, [
                    ok('purchaserName', `Matches the buyer's ${c.idType}.`),
                    ok('purchaserIdNumber', `Matches the verified ${c.idType} (${c.idNumberMasked}).`),
                    ok('unit', `Unit ${deal.unit} matches.`),
                    isChen ? { field: 'purchasePrice', status: 'MISMATCH', message: `Document shows ${money(printed)}; the booking was ${money(deal.price)}.` } : ok('purchasePrice', `${money(deal.price)} matches.`),
                    ok('documentDate', 'Delivered within 14 days of the OTP.'),
                ], isChen ? null : 'SPA_DELIVERED'),
            );
        }
        const duty = done('STAMP_DUTY');
        if (duty && c.fullName.startsWith('JAMES')) {
            docs.push(doc('RECEIPT', 'iras-stamp-duty-receipt.pdf', duty, 'IRAS receipt for Buyer’s and Additional Buyer’s Stamp Duty: $2,104,400 (BSD $136,400 + ABSD 60% $1,968,000).', { ...base, amountPaid: 2_104_400, paymentFor: 'STAMP_DUTY', documentDate: duty, ocr: 'Document AI' }, [ok('purchaserName', 'Matches the buyer’s passport.')], 'STAMP_DUTY'));
        }
        deal.documents = docs;
        await store.saveDeal(deal);
    }
    console.log('attached deal documents');
}

// ---------- Screenshot imports through the real AI pipeline ----------

async function importScreenshots(files: string[], opts: { customerPrefix?: string; consent?: string; createLeads?: boolean }) {
    const analysis = await analyzeWhatsApp(files.map((f) => ({ mimeType: 'image/png', data: readFileSync(`demo-docs/whatsapp/${f}`) })));
    const target = opts.customerPrefix ? await customer(opts.customerPrefix) : null;
    const detail = await commitWhatsApp({
        analysis,
        customerId: target?.id ?? null,
        newCustomerName: target ? null : analysis.contactName,
        applyFacts: true,
        reminders: analysis.suggestedReminders,
        consentGiven: !!opts.consent,
        consentMethod: opts.consent ?? null,
        createCustomersFor: opts.createLeads ? analysis.people.filter((p) => p.isProspect).map((p) => p.name) : [],
    });
    console.log(`imported ${files.join(' + ')} -> ${detail.customer.fullName}: ${detail.people.length} people, ${detail.services.length} services, ${detail.reminders.length} reminders`);
    return detail;
}

// ---------- Hand-authored CRM layer ----------

async function seedCrm() {
    // Lee Jun Hao — overdue S&P exercise; the agent is chasing.
    const lee = await customer('LEE JUN HAO');
    await setConsent(lee.id, true, 'Verbal, at the Aurelia Bay showflat on 11 Sep 2026');
    await addNote(lee.id, { kind: 'DISCUSSION', text: 'Called Jun Hao. His lawyer was on leave last week, so the S&P has not been signed. He still wants the unit and will sign as soon as the lawyer is back.', occurredAt: '2026-10-15' });
    await addNote(lee.id, { kind: 'THOUGHT', text: 'Real risk the option lapses — 25% of the booking fee ($17,750) would be forfeited. Ask the developer for a short extension in writing today.', occurredAt: '2026-10-16' });
    await addReminder(lee.id, { title: 'Chase Jun Hao and his lawyer on S&P signing', detail: 'Exercise deadline was 16 Oct. Get the signed S&P or a written extension from the developer.', dueDate: '2026-10-16', origin: 'AGENT' });
    await addPerson(lee.id, { name: 'Tan Mei Ling', relation: 'SPOUSE', relationLabel: 'Wife', birthday: '--02-14', company: null, jobTitle: 'Teacher', school: null, phone: null, email: null, notes: 'Joins all viewings; cares about the school nearby.', linkedCustomerId: null });
    await addPerson(lee.id, { name: 'Lucas Lee', relation: 'CHILD', relationLabel: 'Son', birthday: '2021-10-28', company: null, jobTitle: null, school: 'Pre-school', phone: null, email: null, notes: null, linkedCustomerId: null });

    // Muhammad Hafiz — just booked; consent not recorded yet (shows the consent notice).
    const hafiz = await customer('MUHAMMAD HAFIZ');
    await addNote(hafiz.id, { kind: 'DISCUSSION', text: 'Booked #05-02 on 12 Oct. Expects the S&P from the developer’s solicitor next week; will use CPF + cash for the 15%.', occurredAt: '2026-10-12' });
    await addReminder(hafiz.id, { title: 'Check S&P delivery with Chua & Partners', detail: 'Developer must deliver within 14 days of OTP (by 26 Oct).', dueDate: '2026-10-22', origin: 'AGENT' });

    // Chen Xiaoling — S&P price typo found; family details with consent.
    const chen = await customer('CHEN XIAOLING');
    await setConsent(chen.id, true, 'WhatsApp, 1 Oct 2026');
    await addNote(chen.id, { kind: 'PLAN', text: 'Ask the developer’s solicitor to correct the S&P price ($2,005,000 → $2,050,000) before Xiaoling signs.', remindOn: '2026-10-19' });
    await addPerson(chen.id, { name: 'Wang Jun', relation: 'SPOUSE', relationLabel: 'Husband', birthday: null, company: 'Northwind Logistics (fictional)', jobTitle: 'Operations Manager', school: null, phone: null, email: null, notes: null, linkedCustomerId: null });
    await addPerson(chen.id, { name: 'Emily Wang', relation: 'CHILD', relationLabel: 'Daughter', birthday: '2018-11-05', company: null, jobTitle: null, school: 'Primary 2', phone: null, email: null, notes: 'Loves swimming — ask about the condo pool.', linkedCustomerId: null });
    await addDate(chen.id, { personId: null, serviceId: null, kind: 'ANNIVERSARY', label: 'Wedding anniversary', date: '2012-11-24', yearly: true, remindDaysBefore: 7 });

    // James Whitfield — foreign investor; plans to rent out after TOP.
    const james = await customer('JAMES ARTHUR');
    await setConsent(james.id, true, 'Email, 3 Sep 2026');
    await addNote(james.id, { kind: 'DISCUSSION', text: 'Stamp duty paid on 6 Oct (ABSD 60% as a foreigner). Next: 15% downpayment by 29 Oct. Wants the unit tenanted from TOP — budget for a full furnishing package.', occurredAt: '2026-10-06' });
    await addPerson(james.id, { name: 'Daniel Chua', relation: 'ADVISOR', relationLabel: 'Conveyancing lawyer', birthday: null, company: 'Chua & Partners LLP', jobTitle: 'Partner', school: null, phone: '+65 6123 4567', email: null, notes: 'Handles the 15% downpayment transfer.', linkedCustomerId: null });
    await addService(james.id, { dealId: null, property: 'Aurelia Bay Residences #18-01', type: 'RENTAL', title: 'Find a tenant from TOP', status: 'OPEN', details: { askingRentSgd: 9500, availableFrom: '2029-07-01' }, notes: 'Corporate lease preferred.' });
    await addReminder(james.id, { title: 'Confirm 15% downpayment transfer with Daniel Chua', detail: '$492,000 due by 29 Oct.', dueDate: '2026-10-26', origin: 'AI' });

    // Ng Kok Wei — past client with an active tenancy, tax filing, and a birthday this week.
    const ng = await createCustomer({ fullName: 'Ng Kok Wei', phone: '+65 9012 3388', email: 'kokwei.ng@example.com', source: 'Past client (2023)', status: 'AFTER_SALES', residency: 'SC', purpose: 'INVESTMENT', propertiesOwned: 2, household: 'Married, 1 teenage son', company: 'Ridgeway Capital (fictional)', jobTitle: 'Finance Director' });
    const ngId = ng.customer.id;
    await setConsent(ngId, true, 'Verbal, at tenancy signing 2 Jan 2025');
    await addPerson(ngId, { name: 'Joanne Ng', relation: 'SPOUSE', relationLabel: 'Wife', birthday: '--10-24', company: null, jobTitle: 'Interior designer', school: null, phone: '+65 9012 3399', email: null, notes: 'Handled the furnishing last time — great taste, ask her for vendor tips.', linkedCustomerId: null });
    await addPerson(ngId, { name: 'Ryan Ng', relation: 'CHILD', relationLabel: 'Son', birthday: '2011-05-09', company: null, jobTitle: null, school: 'Secondary 4 — O-Levels this year', phone: null, email: null, notes: null, linkedCustomerId: null });
    await addPerson(ngId, { name: 'Daniel Brooks', relation: 'TENANT', relationLabel: 'Tenant', birthday: null, company: 'Expat engineer', jobTitle: null, school: null, phone: '+65 8123 7766', email: null, notes: 'Quiet, pays on time. Interested in renewing.', linkedCustomerId: null });
    await addDate(ngId, { personId: null, serviceId: null, kind: 'ANNIVERSARY', label: 'Wedding anniversary', date: '2008-11-02', yearly: true, remindDaysBefore: 7 });
    await addService(ngId, { dealId: null, property: 'Kingsmere Park #12-02', type: 'TENANCY', title: 'Tenancy — Daniel Brooks', status: 'IN_PROGRESS', details: { tenantName: 'Daniel Brooks', tenantPhone: '+65 8123 7766', monthlyRentSgd: 4200, depositSgd: 8400, leaseStart: '2025-01-01', leaseEnd: '2026-12-31', stampDutyPaid: true }, notes: 'Two-year lease. Tenant hinted he wants to renew — propose 2 more years at $4,400.' });
    await addService(ngId, { dealId: null, property: 'Kingsmere Park #12-02', type: 'TAX', title: 'Rental income — YA2027', status: 'OPEN', details: { taxYear: 2027, taxType: 'Rental income (Form B/B1)', annualRentSgd: 50400 }, notes: 'Send the rental income and expense summary to Kok Wei’s accountant by March.' });
    await addNote(ngId, { kind: 'DISCUSSION', text: 'Lunch with Kok Wei. Happy with the tenant; open to renewing for 2 years. Considering a third property in 2027 for his son.', occurredAt: '2026-10-10' });

    // Daniel Koh — prospect for Thomson Reserve.
    const daniel = await createCustomer({ fullName: 'Daniel Koh', phone: '+65 9011 7788', email: 'daniel.koh@example.com', source: 'Instagram ad', status: 'PROSPECT', residency: 'SC', purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, baby due in March', budgetMinSgd: 1_900_000, budgetMaxSgd: 2_200_000, preferences: { segments: ['RCR'], areas: ['Thomson', 'Bishan'], bedrooms: ['3BR'], executiveCondo: false, timeline: 'Book within 1 month', notes: 'Wants a 3BR near an MRT station; wife works at Novena.' } });
    const danielId = daniel.customer.id;
    await addNote(danielId, { kind: 'DISCUSSION', text: 'Saw the Thomson Reserve preview online. Wants 3BR, high floor, under $2.2M. Booking day is 31 Oct — needs the e-brochure and price list.', occurredAt: '2026-10-17' });
    await addReminder(danielId, { title: 'Send Thomson Reserve e-brochure and 3BR price list', detail: 'Promised on our call yesterday.', dueDate: '2026-10-18', origin: 'AGENT' });
    await addReminder(danielId, { title: 'Confirm Daniel’s booking-day slot', detail: 'Thomson Reserve booking day 31 Oct.', dueDate: '2026-10-29', origin: 'AI' });
    await addMatch(danielId, 'thomson-reserve', 'Upper Thomson 3BR within budget; booking day 31 Oct.');
    await suggestMatches(danielId);

    // Nurul Huda — first-timer EC lead.
    const nurul = await createCustomer({ fullName: 'Nurul Huda binte Rahman', phone: '+65 8765 2201', source: 'Roadshow at Jurong Point', status: 'LEAD', residency: 'SC', purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, first home', budgetMinSgd: 1_300_000, budgetMaxSgd: 1_550_000, preferences: { segments: ['OCR'], areas: ['Jurong', 'Tengah'], bedrooms: ['3BR'], executiveCondo: true, timeline: 'Within 6 months', notes: null } });
    await addNote(nurul.customer.id, { kind: 'DISCUSSION', text: 'Met at the roadshow. First-timers, combined income within the EC ceiling. Interested in the west — asked about upcoming ECs.', occurredAt: '2026-10-11' });
    await addReminder(nurul.customer.id, { title: 'Send Nurul the EC eligibility checklist', detail: 'HDB EC eligibility: citizenship, income ceiling, first-timer status.', dueDate: '2026-10-20', origin: 'AI' });
    await suggestMatches(nurul.customer.id);

    console.log('seeded hand-authored CRM layer');
}

async function main() {
    await wipe();
    await seedIfEmpty();
    await attachDocuments();
    await seedCrm();

    // AI imports: Priya (existing buyer, opens a lead for her brother), Mr Wong (new investor lead),
    // Goh (after-sales: family, dates, rental/furnishing/tax from chat + profile screenshots).
    await importScreenshots(['chat-existing-priya.png'], { customerPrefix: 'PRIYA', consent: 'WhatsApp, 18 Oct 2026', createLeads: true });
    const wong = await importScreenshots(['chat-investor-mr-wong.png'], {});
    // Name as printed in the chat header; OCR occasionally drops a letter.
    await updateCustomer(wong.customer.id, { fullName: 'Wong Chee Keong' });
    await suggestMatches(wong.customer.id);
    const arjun = (await store.listCustomers()).find((c) => c.fullName.toUpperCase().startsWith('ARJUN'));
    if (arjun) await suggestMatches(arjun.id);
    await importScreenshots(['chat-aftersales-goh-1.png', 'chat-aftersales-goh-2.png', 'profile-goh-professional.png'], { customerPrefix: 'GOH', consent: 'WhatsApp, 18 Oct 2026' });

    // Shortlist the first AI suggestion for each prospect so the matches tab shows both states.
    for (const c of await store.listCustomers()) {
        const first = c.matches.find((m) => m.origin === 'AI' && m.status === 'SUGGESTED');
        if (first && c.status !== 'BOOKED') await setMatchStatus(c.id, first.projectId, 'SHORTLISTED');
    }

    const counts = await Promise.all([store.listDeals(), store.listCustomers(), store.listAllNotes(), store.listReminders(), store.list('people'), store.list('dates'), store.list('services')]);
    console.log('done:', ['deals', 'customers', 'notes', 'reminders', 'people', 'dates', 'services'].map((n, i) => `${n}=${counts[i].length}`).join(' '));
}

await main();
