// Shared contract between the API (src/server) and the web app (web/).

export type Residency = 'SC' | 'SPR' | 'FOREIGNER';
export type Purpose = 'OWN_STAY' | 'INVESTMENT';

export interface Customer {
    id: string;
    fullName: string;
    idType: 'NRIC' | 'FIN' | 'PASSPORT';
    /** Always masked in API responses, e.g. "S****567D". */
    idNumberMasked: string;
    dateOfBirth: string | null; // YYYY-MM-DD
    nationality: string | null;
    sex: 'M' | 'F' | null;
    address: string | null;
    residency: Residency;
    phone: string | null;
    email: string | null;
    preferredLanguage: string; // e.g. "English"
    profile: {
        purpose: Purpose;
        propertiesOwned: number; // residential properties already owned, before this purchase
        household: string | null; // free text, e.g. "Married, 2 young children"
    };
}

/** A Singapore new-launch project from the catalog (src/server/data/projects.json). */
export interface Project {
    id: string;
    name: string;
    developer: string | null;
    address: string | null;
    district: string | null; // e.g. "D19"
    segment: 'CCR' | 'RCR' | 'OCR' | null;
    type: 'CONDO' | 'EC' | 'LANDED_STRATA';
    tenure: string | null;
    totalUnits: number | null;
    launchDate: string | null; // YYYY-MM
    expectedTop: string | null; // YYYY-MM or YYYY
    priceFromSgd: number | null;
    avgPsfSgd: number | null;
    unitMix: string[];
    sources: string[];
    /** True for the made-up demo project the sample documents refer to. */
    fictional: boolean;
}

export type StageKey =
    | 'BOOKING'
    | 'CDD'
    | 'SPA_DELIVERED'
    | 'SPA_EXERCISED'
    | 'STAMP_DUTY'
    | 'DOWNPAYMENT_15'
    | 'KEYS';

export interface Stage {
    key: StageKey;
    label: string;
    description: string;
    dueDate: string | null; // YYYY-MM-DD, null when it depends on an earlier stage not yet done
    completedAt: string | null; // YYYY-MM-DD
}

export type DocType = 'IDENTITY' | 'OTP' | 'SPA' | 'RECEIPT' | 'OTHER';

export interface DocCheck {
    field: string;
    status: 'OK' | 'MISMATCH' | 'MISSING';
    message: string;
}

export interface DealDocument {
    id: string;
    type: DocType;
    fileName: string;
    uploadedAt: string; // ISO datetime
    /** Fields Gemini extracted; values already masked where they are ID numbers. */
    extracted: Record<string, string | number | null>;
    checks: DocCheck[];
    /** Short plain-English summary from the model. */
    summary: string;
    /** Stage this document is evidence for, if any. */
    suggestedStage: StageKey | null;
}

export interface Deal {
    id: string;
    customerId: string;
    agentName: string;
    /** Catalog id when the project came from the catalog. */
    projectId: string | null;
    project: string;
    unit: string;
    price: number; // SGD
    otpDate: string; // YYYY-MM-DD
    bookingFee: number; // SGD
    currentStage: StageKey;
    stages: Stage[];
    documents: DealDocument[];
    createdAt: string;
}

export type Risk = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'DONE';

export interface DealSummary {
    id: string;
    customerName: string;
    project: string;
    unit: string;
    price: number;
    currentStage: StageKey;
    currentStageLabel: string;
    nextDueDate: string | null;
    daysLeft: number | null; // negative when overdue
    risk: Risk;
    openIssues: number; // MISMATCH/MISSING checks across documents
}

export interface DealDetail {
    deal: Deal;
    customer: Customer;
    risk: Risk;
}

export interface FollowUp {
    title: string;
    when: string; // human-readable timing, e.g. "Before 12 Nov 2026"
    why: string;
    channel: 'CALL' | 'MESSAGE' | 'EMAIL' | 'MEETING';
    draftMessage: string | null;
}

/**
 * HTTP API (all JSON unless noted):
 *   GET  /api/projects                       -> Project[] (newest launch first)
 *   GET  /api/deals                          -> DealSummary[]
 *   GET  /api/deals/:id                      -> DealDetail
 *   POST /api/bookings   (multipart)         -> DealDetail
 *        fields: file (ID image/PDF), projectId? (catalog id; fills project name), project, unit, price, otpDate, residency,
 *                purpose, propertiesOwned, household?, phone?, email?
 *   POST /api/deals/:id/documents (multipart: file) -> { deal: DealDetail, document: DealDocument }
 *   POST /api/deals/:id/stages/:key/complete  { date: 'YYYY-MM-DD' } -> DealDetail
 *   GET  /api/deals/:id/followups            -> FollowUp[]
 *   POST /api/chat  { sessionId, message, dealId? } -> text/event-stream of ChatEvent
 */
export type ChatEvent =
    | { type: 'text'; text: string }
    | { type: 'tool'; name: string }
    | { type: 'done' }
    | { type: 'error'; message: string };
