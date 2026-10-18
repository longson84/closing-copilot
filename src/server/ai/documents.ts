// Document intelligence: Document AI OCR -> Gemini structured extraction -> deterministic cross-checks.
// Gemini reads; code decides. Every check below is plain comparison logic so a flagged
// mismatch is always explainable and never a model guess.

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DealDocument, DocCheck, DocType, StageKey } from '../../shared/types.js';
import type { Deal } from '../../shared/types.js';
import { diffDays } from '../domain/dates.js';
import { maskId, normalizeId, normalizeName } from '../domain/identity.js';
import type { StoredCustomer } from '../store.js';
import { ocr } from './docai.js';
import { generateJson } from './gemini.js';

type File = { mimeType: string; data: Buffer; fileName: string };

const SYSTEM =
    'You extract fields from Singapore property transaction documents for a licensed estate agent. ' +
    'Copy values exactly as printed — do not correct spelling, names or numbers. ' +
    'Use null for anything not present. Dates as YYYY-MM-DD. Amounts as plain numbers in SGD.';

function withOcr(prompt: string, text: string | null): string {
    return text ? `${prompt}\n\nOCR text from Document AI (use it to read small print accurately):\n"""\n${text}\n"""` : prompt;
}

// ---------- Identity documents (booking / CDD) ----------

const IdentitySchema = z.object({
    isIdentityDocument: z.boolean(),
    idType: z.enum(['NRIC', 'FIN', 'PASSPORT']).nullable(),
    idNumber: z.string().nullable(),
    fullName: z.string().nullable(),
    dateOfBirth: z.string().nullable(),
    sex: z.enum(['M', 'F']).nullable(),
    nationality: z.string().nullable().describe('Country of birth or nationality as printed'),
    address: z.string().nullable(),
});
export type ExtractedIdentity = z.infer<typeof IdentitySchema>;

export async function extractIdentity(file: File): Promise<ExtractedIdentity & { ocrUsed: boolean }> {
    const text = await ocr(file);
    const out = await generateJson({
        schema: IdentitySchema,
        system: SYSTEM,
        file,
        prompt: withOcr(
            'This should be a Singapore NRIC / FIN card or a passport of a property buyer. Extract the holder details.',
            text,
        ),
    });
    return { ...out, ocrUsed: text !== null };
}

// ---------- Transaction documents (OTP, S&P, receipts) ----------

const TransactionSchema = z.object({
    docType: z.enum(['OTP', 'SPA', 'RECEIPT', 'IDENTITY', 'OTHER']),
    purchaserName: z.string().nullable(),
    purchaserIdNumber: z.string().nullable(),
    project: z.string().nullable(),
    unit: z.string().nullable().describe('Unit number like #12-05'),
    purchasePrice: z.number().nullable(),
    bookingFee: z.number().nullable(),
    amountPaid: z.number().nullable().describe('For receipts: the amount received'),
    paymentFor: z
        .enum(['BOOKING_FEE', 'DOWNPAYMENT_15', 'STAMP_DUTY', 'PROGRESS_PAYMENT', 'OTHER'])
        .nullable()
        .describe('For receipts: what the payment is for'),
    documentDate: z.string().nullable().describe('Date the document was issued, delivered, or the payment received'),
    summary: z.string().describe('One or two plain-English sentences an agent can read at a glance'),
});
type Extracted = z.infer<typeof TransactionSchema>;

function check(field: string, ok: boolean, okMsg: string, badMsg: string): DocCheck {
    return { field, status: ok ? 'OK' : 'MISMATCH', message: ok ? okMsg : badMsg };
}

function money(n: number): string {
    return `$${n.toLocaleString('en-SG')}`;
}

function crossCheck(x: Extracted, deal: Deal, customer: StoredCustomer): DocCheck[] {
    const checks: DocCheck[] = [];
    if (x.purchaserName) {
        const ok = normalizeName(x.purchaserName) === normalizeName(customer.fullName);
        checks.push(
            check(
                'purchaserName',
                ok,
                `Matches the buyer's ${customer.idType} (${customer.fullName}).`,
                `Document says "${x.purchaserName}" but the buyer's ${customer.idType} says "${customer.fullName}". Ask the developer's solicitor to correct it before the buyer signs.`,
            ),
        );
    } else if (x.docType === 'OTP' || x.docType === 'SPA') {
        checks.push({ field: 'purchaserName', status: 'MISSING', message: 'No purchaser name found on the document.' });
    }
    if (x.purchaserIdNumber) {
        const ok = normalizeId(x.purchaserIdNumber) === normalizeId(customer.idNumber);
        checks.push(
            check(
                'purchaserIdNumber',
                ok,
                `Matches the verified ${customer.idType} (${customer.idNumberMasked}).`,
                `ID number on the document does not match the verified ${customer.idType} ${customer.idNumberMasked}. Ask the solicitor to re-check it against the buyer's ${customer.idType}.`,
            ),
        );
    }
    if (x.unit) {
        const norm = (u: string) => u.replace(/[^0-9-]/g, '');
        checks.push(
            check('unit', norm(x.unit) === norm(deal.unit), `Unit ${deal.unit} matches.`, `Document shows unit ${x.unit}; this deal is ${deal.unit}.`),
        );
    }
    if (x.purchasePrice !== null) {
        checks.push(
            check(
                'purchasePrice',
                x.purchasePrice === deal.price,
                `${money(deal.price)} matches.`,
                `Document shows ${money(x.purchasePrice)}; the booking was ${money(deal.price)}.`,
            ),
        );
    }
    if (x.docType === 'OTP' && x.bookingFee !== null) {
        const expected = Math.round(deal.price * 0.05);
        checks.push(
            check('bookingFee', x.bookingFee === expected, `${money(expected)} is 5% of the price.`, `Booking fee ${money(x.bookingFee)} is not 5% of the price (${money(expected)}).`),
        );
    }
    if (x.docType === 'SPA' && x.documentDate) {
        const days = diffDays(deal.otpDate, x.documentDate);
        checks.push(
            check(
                'documentDate',
                days <= 14,
                `Delivered ${days} days after the OTP (limit 14).`,
                `Delivered ${days} days after the OTP — later than the 14 days the developer must meet.`,
            ),
        );
    }
    if (x.docType === 'RECEIPT' && x.paymentFor === 'DOWNPAYMENT_15' && x.amountPaid !== null) {
        const expected = Math.round(deal.price * 0.15);
        checks.push(
            check('amountPaid', x.amountPaid === expected, `${money(expected)} is 15% of the price.`, `Received ${money(x.amountPaid)}; 15% of the price is ${money(expected)}.`),
        );
    }
    return checks;
}

function suggestedStage(x: Extracted, checks: DocCheck[]): StageKey | null {
    if (checks.some((c) => c.status !== 'OK')) return null;
    if (x.docType === 'OTP') return 'BOOKING';
    if (x.docType === 'SPA') return 'SPA_DELIVERED';
    if (x.docType === 'RECEIPT') {
        if (x.paymentFor === 'DOWNPAYMENT_15') return 'DOWNPAYMENT_15';
        if (x.paymentFor === 'STAMP_DUTY') return 'STAMP_DUTY';
    }
    return null;
}

export async function analyzeDealDocument(file: File, deal: Deal, customer: StoredCustomer): Promise<DealDocument> {
    const text = await ocr(file);
    const x = await generateJson({
        schema: TransactionSchema,
        system: SYSTEM,
        file,
        prompt: withOcr(
            `Classify this document and extract its fields. Context: new-launch condo deal for unit ${deal.unit} at ${deal.project}.`,
            text,
        ),
    });
    const checks = crossCheck(x, deal, customer);
    return {
        id: randomUUID(),
        type: x.docType as DocType,
        fileName: file.fileName,
        uploadedAt: new Date().toISOString(),
        extracted: {
            purchaserName: x.purchaserName,
            purchaserIdNumber: x.purchaserIdNumber ? maskId(x.purchaserIdNumber) : null,
            project: x.project,
            unit: x.unit,
            purchasePrice: x.purchasePrice,
            bookingFee: x.bookingFee,
            amountPaid: x.amountPaid,
            paymentFor: x.paymentFor,
            documentDate: x.documentDate,
            ocr: text ? 'Document AI' : 'Gemini vision',
        },
        checks,
        summary: x.summary,
        suggestedStage: suggestedStage(x, checks),
    };
}
