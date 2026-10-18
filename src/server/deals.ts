import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DealDetail, DealSummary, Deal, FollowUp, Purpose, Residency, StageKey } from '../shared/types.js';
import { analyzeDealDocument, extractIdentity } from './ai/documents.js';
import { generateJson } from './ai/gemini.js';
import { config } from './config.js';
import { todaySg, formatDate } from './domain/dates.js';
import { maskId } from './domain/identity.js';
import { buildStages, completedMap, currentStage, riskOf, summarize, STAGE_DEFS } from './domain/stages.js';
import { calcStampDuty } from './domain/stamp-duty.js';
import { store, toPublicCustomer, type StoredCustomer } from './store.js';

export class NotFound extends Error {}
export class BadRequest extends Error {}

export async function listSummaries(): Promise<DealSummary[]> {
    const today = todaySg();
    const deals = await store.listDeals();
    const out = await Promise.all(
        deals.map(async (d) => summarize(d, (await store.getCustomer(d.customerId))?.fullName ?? 'Unknown', today)),
    );
    const order = { OVERDUE: 0, DUE_SOON: 1, ON_TRACK: 2, DONE: 3 } as const;
    return out.sort((a, b) => order[a.risk] - order[b.risk] || (a.daysLeft ?? 9e9) - (b.daysLeft ?? 9e9));
}

async function load(id: string): Promise<{ deal: Deal; customer: StoredCustomer }> {
    const deal = await store.getDeal(id);
    if (!deal) throw new NotFound(`Deal ${id} not found`);
    const customer = await store.getCustomer(deal.customerId);
    if (!customer) throw new NotFound(`Customer for deal ${id} not found`);
    return { deal, customer };
}

export async function getDetail(id: string): Promise<DealDetail> {
    const { deal, customer } = await load(id);
    return { deal, customer: toPublicCustomer(customer), risk: riskOf(deal.stages, todaySg()).risk };
}

export interface BookingInput {
    file: { mimeType: string; data: Buffer; fileName: string };
    project: string;
    unit: string;
    price: number;
    otpDate: string;
    residency: Residency;
    purpose: Purpose;
    propertiesOwned: number;
    household: string | null;
    phone: string | null;
    email: string | null;
}

export async function createBooking(input: BookingInput): Promise<DealDetail> {
    const id = await extractIdentity(input.file);
    if (!id.isIdentityDocument || !id.idNumber || !id.fullName) {
        throw new BadRequest('Could not read an NRIC, FIN or passport from that file. Try a clearer photo.');
    }
    const customer: StoredCustomer = {
        id: randomUUID(),
        fullName: id.fullName,
        idType: id.idType ?? 'NRIC',
        idNumber: id.idNumber,
        idNumberMasked: maskId(id.idNumber),
        dateOfBirth: id.dateOfBirth,
        nationality: id.nationality,
        sex: id.sex,
        address: id.address,
        residency: input.residency,
        phone: input.phone,
        email: input.email,
        preferredLanguage: 'English',
        profile: { purpose: input.purpose, propertiesOwned: input.propertiesOwned, household: input.household },
    };
    const today = todaySg();
    const deal: Deal = {
        id: randomUUID(),
        customerId: customer.id,
        agentName: config.agentName,
        project: input.project,
        unit: input.unit,
        price: input.price,
        otpDate: input.otpDate,
        bookingFee: Math.round(input.price * 0.05),
        currentStage: 'CDD',
        stages: buildStages(input.otpDate, { BOOKING: input.otpDate, CDD: today }),
        documents: [
            {
                id: randomUUID(),
                type: 'IDENTITY',
                fileName: input.file.fileName,
                uploadedAt: new Date().toISOString(),
                extracted: {
                    fullName: id.fullName,
                    idType: id.idType,
                    idNumber: customer.idNumberMasked,
                    dateOfBirth: id.dateOfBirth,
                    sex: id.sex,
                    nationality: id.nationality,
                    ocr: id.ocrUsed ? 'Document AI' : 'Gemini vision',
                },
                checks: [
                    { field: 'Identity document', status: 'OK', message: `${customer.idType} read and verified; CDD recorded.` },
                    { field: 'Data minimisation', status: 'OK', message: 'Image not stored; ID number masked everywhere outside the customer record (PDPA).' },
                ],
                summary: `${customer.idType} of ${id.fullName}. Customer record created and customer due diligence recorded.`,
                suggestedStage: null,
            },
        ],
        createdAt: new Date().toISOString(),
    };
    deal.currentStage = currentStage(deal.stages)?.key ?? 'KEYS';
    await store.saveCustomer(customer);
    await store.saveDeal(deal);
    return getDetail(deal.id);
}

export async function addDocument(dealId: string, file: BookingInput['file']) {
    const { deal, customer } = await load(dealId);
    const document = await analyzeDealDocument(file, deal, customer);
    deal.documents.push(document);
    await store.saveDeal(deal);
    return { deal: await getDetail(dealId), document };
}

export async function completeStage(dealId: string, key: StageKey, date: string): Promise<DealDetail> {
    const { deal } = await load(dealId);
    if (!STAGE_DEFS.some((s) => s.key === key)) throw new BadRequest(`Unknown stage ${key}`);
    const done = completedMap(deal.stages);
    done[key] = date;
    deal.stages = buildStages(deal.otpDate, done);
    deal.currentStage = currentStage(deal.stages)?.key ?? 'KEYS';
    await store.saveDeal(deal);
    return getDetail(dealId);
}

/** Everything the copilot may know about a deal. No full ID number, ever. */
export async function dealContext(dealId: string) {
    const { deal, customer } = await getDetail(dealId);
    const today = todaySg();
    const { risk, daysLeft, dueDate } = riskOf(deal.stages, today);
    return {
        today,
        customer,
        deal: {
            id: deal.id,
            project: deal.project,
            unit: deal.unit,
            price: deal.price,
            otpDate: deal.otpDate,
            bookingFee: deal.bookingFee,
            risk,
            daysLeftToNextDeadline: daysLeft,
            nextDeadline: dueDate,
            stages: deal.stages.map((s) => ({ key: s.key, label: s.label, dueDate: s.dueDate, completedAt: s.completedAt, description: s.description })),
            documents: deal.documents.map((d) => ({ type: d.type, fileName: d.fileName, summary: d.summary, checks: d.checks })),
        },
        stampDuty: calcStampDuty(deal.price, customer.residency, customer.profile.propertiesOwned),
    };
}

const FollowUpsSchema = z.object({
    followUps: z
        .array(
            z.object({
                title: z.string(),
                when: z.string(),
                why: z.string(),
                channel: z.enum(['CALL', 'MESSAGE', 'EMAIL', 'MEETING']),
                draftMessage: z.string().nullable(),
            }),
        )
        .min(3)
        .max(6),
});

export async function suggestFollowUps(dealId: string): Promise<FollowUp[]> {
    const ctx = await dealContext(dealId);
    const out = await generateJson({
        schema: FollowUpsSchema,
        system:
            'You are a senior Singapore new-launch property agent coaching a colleague. Suggest specific, ' +
            'timely follow-ups for ONE buyer that close the sale safely and then build a long-term relationship ' +
            '(after-sales service, referrals). Ground every suggestion in the deal data provided: real dates, ' +
            'real amounts, the buyer profile. Never invent figures. Never include the ID number.',
        prompt: `Today is ${formatDate(ctx.today)}. Deal data (JSON):
${JSON.stringify(ctx, null, 2)}

Singapore new-launch facts you may use:
- Option lapses if the S&P is not signed within 3 weeks of delivery; 25% of the booking fee is forfeited.
- Stamp duty (BSD + ABSD) is payable within 14 days of signing; late payment attracts penalties.
- Progressive payments follow construction stages (foundation 10%, RC framework 10%, walls 5%, ceiling 5%, electrical/plumbing 5%, roads/drains 5%, TOP 25%, CSC 15%); bank/CPF disbursement must be arranged for each.
- After keys: 12-month defects liability period — inspect and report defects before it ends.
- Home loans usually have a 2–3 year lock-in; review refinancing near the end.
- Investors: line up tenants or a property manager before TOP.
- Ask for referrals/reviews at milestones the buyer is happy about.

Return 3–6 follow-ups ordered by urgency. Pick ones that fit THIS deal's stage. If a document check failed, the first follow-up must fix it. draftMessage: a short WhatsApp-style message from the agent to the buyer (null for internal actions).`,
    });
    return out.followUps;
}
