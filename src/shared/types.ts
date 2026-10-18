// Shared contract between the API (src/server) and the web app (web/).

export type Residency = 'SC' | 'SPR' | 'FOREIGNER';
export type Purpose = 'OWN_STAY' | 'INVESTMENT';

export interface SocialProfile {
    platform: 'LINKEDIN' | 'INSTAGRAM' | 'FACEBOOK' | 'OTHER';
    url: string;
}

/** Where the customer is in the agent's funnel. BOOKED/AFTER_SALES are set by deals. */
export type CustomerStatus = 'LEAD' | 'PROSPECT' | 'BOOKED' | 'AFTER_SALES' | 'LOST';

export interface Customer {
    id: string;
    fullName: string;
    /** Identity fields are only known once an ID document is read (at booking). */
    idType: 'NRIC' | 'FIN' | 'PASSPORT' | null;
    /** Always masked in API responses, e.g. "S****567D". */
    idNumberMasked: string | null;
    dateOfBirth: string | null; // YYYY-MM-DD
    nationality: string | null;
    sex: 'M' | 'F' | null;
    address: string | null;
    residency: Residency | null;
    phone: string | null;
    email: string | null;
    preferredLanguage: string; // e.g. "English"
    profile: {
        purpose: Purpose | null;
        propertiesOwned: number | null; // residential properties already owned, before this purchase
        household: string | null; // free text, e.g. "Married, 2 young children"
    };
    status: CustomerStatus;
    source: string | null; // e.g. "WhatsApp", "Showflat walk-in", "Referral from Priya"
    budgetMinSgd: number | null;
    budgetMaxSgd: number | null;
    preferences: {
        segments: Array<'CCR' | 'RCR' | 'OCR'>;
        areas: string[]; // free text, e.g. "Tampines", "near Lentor MRT"
        bedrooms: string[]; // e.g. "2BR", "3BR"
        executiveCondo: boolean | null; // open to / wants an EC
        timeline: string | null; // e.g. "Buy within 3 months"
        notes: string | null;
    };
    tags: string[];
    company: string | null;
    jobTitle: string | null;
    /** Links the agent recorded (not scraped). */
    socialProfiles: SocialProfile[];
    /** PDPA: consent to keep personal details about the customer's family and contacts. */
    consent: { givenAt: string | null; method: string | null };
    createdAt: string; // ISO
    updatedAt: string; // ISO
}

// ---------- CRM ----------

export type NoteKind = 'DISCUSSION' | 'THOUGHT' | 'PLAN';

export interface WhatsAppMessage {
    from: 'AGENT' | 'CUSTOMER';
    time: string | null; // as shown, e.g. "10:42" or "Yesterday 21:03"
    text: string;
}

export interface Note {
    id: string;
    customerId: string;
    kind: NoteKind;
    text: string; // the agent's text, or the AI summary for WhatsApp notes
    source: 'MANUAL' | 'WHATSAPP_AI' | 'WEB_AI';
    keyPoints: string[];
    /** Web sources for WEB_AI notes (Google Search grounding). */
    sources?: Array<{ title: string; url: string }>; // AI-extracted highlights (empty for manual notes)
    transcript: WhatsAppMessage[]; // WhatsApp only
    occurredAt: string | null; // YYYY-MM-DD the conversation happened, if known
    createdAt: string; // ISO
}

export interface Reminder {
    id: string;
    customerId: string;
    title: string;
    detail: string | null;
    dueDate: string; // YYYY-MM-DD
    origin: 'AI' | 'AGENT';
    status: 'OPEN' | 'DONE' | 'DISMISSED';
    noteId: string | null; // note it came from
    createdAt: string;
    completedAt: string | null;
}

/** One row on the reminders screen: a stored reminder, or a legal deadline computed from a deal. */
// ---------- Relationships, important dates, after-sales ----------

export type Relation =
    | 'SPOUSE'
    | 'CHILD'
    | 'PARENT'
    | 'SIBLING'
    | 'OTHER_RELATIVE'
    | 'COLLEAGUE'
    | 'FRIEND'
    | 'ADVISOR' // lawyer, banker, accountant…
    | 'TENANT'
    | 'OTHER';

/** Someone in the customer's circle. */
export interface Person {
    id: string;
    customerId: string;
    name: string;
    relation: Relation;
    relationLabel: string | null; // free text, e.g. "Brother", "Conveyancing lawyer", "Elder son"
    /** "YYYY-MM-DD", or "--MM-DD" when the year is unknown. */
    birthday: string | null;
    company: string | null;
    jobTitle: string | null;
    school: string | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    /** When this person is also a customer (e.g. a referred sibling). */
    linkedCustomerId: string | null;
    source: 'MANUAL' | 'WHATSAPP_AI';
    createdAt: string;
    updatedAt: string;
}

export type DateKind = 'BIRTHDAY' | 'ANNIVERSARY' | 'HANDOVER' | 'SCHOOL' | 'LEASE' | 'TAX' | 'CUSTOM';

export interface ImportantDate {
    id: string;
    customerId: string;
    personId: string | null; // whose date it is (null = the customer)
    serviceId: string | null; // set when it belongs to an after-sales service
    kind: DateKind;
    label: string; // "Wedding anniversary", "Ethan starts Primary 1", "Lease ends"
    date: string; // YYYY-MM-DD, or --MM-DD for yearly dates with unknown year
    yearly: boolean;
    remindDaysBefore: number;
    source: 'MANUAL' | 'WHATSAPP_AI' | 'SYSTEM';
    createdAt: string;
}

export type ServiceType = 'RENTAL' | 'FURNISHING' | 'TENANCY' | 'TAX' | 'DEFECTS' | 'REFINANCING' | 'OTHER';

export interface AfterSalesService {
    id: string;
    customerId: string;
    dealId: string | null;
    property: string | null; // e.g. "Aurelia Bay Residences #12-05"
    type: ServiceType;
    title: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
    /**
     * Type-specific fields (all optional), e.g.
     * RENTAL: askingRentSgd, listedOn, availableFrom
     * FURNISHING: budgetSgd, vendor, scope
     * TENANCY: tenantName, tenantPhone, monthlyRentSgd, depositSgd, leaseStart, leaseEnd, stampDutyPaid
     * TAX: taxYear, taxType ("Rental income (Form B/B1)" | "Property tax"), annualRentSgd, filedOn
     */
    details: Record<string, string | number | boolean | null>;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface ReminderItem {
    kind: 'REMINDER' | 'DEAL_DEADLINE' | 'IMPORTANT_DATE';
    id: string; // reminder id, or `${dealId}:${stageKey}`
    customerId: string;
    customerName: string;
    title: string;
    detail: string | null;
    dueDate: string;
    daysLeft: number; // negative = overdue
    origin: 'AI' | 'AGENT' | 'DEAL' | 'DATE';
    /** For IMPORTANT_DATE rows. */
    dateKind?: DateKind;
    personName?: string | null;
    /** The person's relation to the customer in plain words, e.g. "wife", "son". */
    relationLabel?: string | null;
    status: 'OPEN' | 'DONE' | 'DISMISSED';
    dealId: string | null;
}

export interface ProjectMatch {
    projectId: string;
    origin: 'AI' | 'AGENT';
    reason: string;
    status: 'SUGGESTED' | 'SHORTLISTED' | 'REJECTED';
    createdAt: string;
}

export interface CustomerSummary {
    id: string;
    fullName: string;
    phone: string | null;
    status: CustomerStatus;
    budgetMinSgd: number | null;
    budgetMaxSgd: number | null;
    lastContactAt: string | null; // latest note occurredAt/createdAt
    lastNoteSnippet: string | null;
    openReminders: number;
    nextReminderDate: string | null;
    overdueReminders: number;
    deals: number;
    shortlisted: number;
}

export interface CustomerDetail {
    customer: Customer;
    notes: Note[]; // newest first
    reminders: Reminder[]; // open first, by due date
    matches: Array<ProjectMatch & { project: Project }>;
    deals: DealSummary[];
    people: Person[];
    dates: ImportantDate[]; // incl. derived ones (birthdays from people, handover anniversaries) with source SYSTEM
    services: AfterSalesService[];
}

/** Editable fields for creating/updating a customer by hand (all optional on update). */
export interface CustomerInput {
    fullName: string;
    phone?: string | null;
    email?: string | null;
    source?: string | null;
    status?: CustomerStatus;
    residency?: Residency | null;
    purpose?: Purpose | null;
    propertiesOwned?: number | null;
    household?: string | null;
    budgetMinSgd?: number | null;
    budgetMaxSgd?: number | null;
    preferences?: Partial<Customer['preferences']>;
    tags?: string[];
    company?: string | null;
    jobTitle?: string | null;
    dateOfBirth?: string | null;
    socialProfiles?: SocialProfile[];
}

export type PersonInput = Omit<Person, 'id' | 'customerId' | 'source' | 'createdAt' | 'updatedAt'>;
export type DateInput = Omit<ImportantDate, 'id' | 'customerId' | 'source' | 'createdAt'>;
export type ServiceInput = Omit<AfterSalesService, 'id' | 'customerId' | 'createdAt' | 'updatedAt'>;

export interface SuggestedReminder {
    title: string;
    detail: string | null;
    dueDate: string; // YYYY-MM-DD
}

/** Result of reading WhatsApp screenshots. Nothing is saved until /api/whatsapp/commit. */
export interface WhatsAppAnalysis {
    contactName: string | null; // as shown in the chat header
    contactPhone: string | null;
    occurredAt: string | null; // YYYY-MM-DD of the latest message, if determinable
    transcript: WhatsAppMessage[];
    summary: string;
    keyPoints: string[];
    /** Facts about the customer stated in the chat; null when not mentioned. */
    facts: {
        residency: Residency | null;
        purpose: Purpose | null;
        propertiesOwned: number | null;
        household: string | null;
        budgetMinSgd: number | null;
        budgetMaxSgd: number | null;
        areas: string[];
        bedrooms: string[];
        segments: Array<'CCR' | 'RCR' | 'OCR'>;
        executiveCondo: boolean | null;
        timeline: string | null;
    };
    suggestedReminders: SuggestedReminder[];
    /** Details about the customer themself. */
    customerUpdates: { company: string | null; jobTitle: string | null; birthday: string | null };
    /** People mentioned (family, colleagues, advisors). `isProspect` = may buy/rent themselves (e.g. a referral). */
    /** Profile screenshots (LinkedIn/Instagram/Facebook) are read the same way; social links seen are returned here. */
    socialProfiles: SocialProfile[];
    people: Array<{
        name: string;
        relation: Relation;
        relationLabel: string | null;
        birthday: string | null;
        company: string | null;
        jobTitle: string | null;
        school: string | null;
        phone: string | null;
        notes: string | null;
        isProspect: boolean;
    }>;
    importantDates: Array<{ label: string; kind: DateKind; date: string; yearly: boolean; personName: string | null }>;
    services: Array<{ type: ServiceType; title: string; details: Record<string, string | number | boolean | null>; notes: string | null }>;
    /** Existing customers that may be this contact, best first. */
    candidates: Array<{ customerId: string; fullName: string; phone: string | null; confidence: number; why: string }>;
}

export interface WhatsAppCommit {
    analysis: WhatsAppAnalysis; // possibly edited by the agent
    customerId: string | null; // existing customer, or null to create
    newCustomerName: string | null; // required when customerId is null
    applyFacts: boolean; // copy facts into the customer profile (only fills/updates mentioned fields)
    reminders: SuggestedReminder[]; // the ones the agent kept (possibly edited)
    /** Required to store people/dates about relatives; recorded on the customer. */
    consentGiven: boolean;
    consentMethod: string | null; // e.g. "Verbal, on WhatsApp 18 Oct 2026"
    /** Names (from analysis.people) to also create as their own customers (leads), linked both ways. */
    createCustomersFor: string[];
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
    /** Set when a later document of the same type passed every check; its issues no longer count. */
    supersededBy?: string | null;
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
 *
 * CRM:
 *   GET    /api/customers?q=&status=          -> CustomerSummary[] (needs attention first)
 *   POST   /api/customers   CustomerInput      -> CustomerDetail
 *   GET    /api/customers/:id                 -> CustomerDetail
 *   PATCH  /api/customers/:id  Partial<CustomerInput> -> CustomerDetail
 *   POST   /api/customers/:id/notes  { kind, text, occurredAt?, remindOn?: 'YYYY-MM-DD' } -> CustomerDetail
 *          (a PLAN note with remindOn also creates an AGENT reminder)
 *   DELETE /api/customers/:id/notes/:noteId   -> CustomerDetail
 *   POST   /api/customers/:id/plan            -> SuggestedReminder[]   (AI follow-up plan, not saved)
 *   POST   /api/customers/:id/reminders  SuggestedReminder & { origin: 'AI'|'AGENT' } -> CustomerDetail
 *   PATCH  /api/reminders/:id  { status?, dueDate?, title?, detail? } -> Reminder
 *   GET    /api/reminders?status=OPEN&days=30 -> ReminderItem[] (all customers, incl. deal deadlines; by due date)
 *   POST   /api/customers/:id/matches/suggest -> CustomerDetail   (AI adds SUGGESTED matches with reasons)
 *   POST   /api/customers/:id/matches  { projectId, reason? } -> CustomerDetail (AGENT, SHORTLISTED)
 *   PATCH  /api/customers/:id/matches/:projectId { status } -> CustomerDetail
 *   DELETE /api/customers/:id/matches/:projectId -> CustomerDetail
 *   POST   /api/whatsapp/analyze (multipart: files = 1..5 screenshots) -> WhatsAppAnalysis
 *   POST   /api/whatsapp/commit  WhatsAppCommit -> CustomerDetail
 *   POST   /api/customers/:id/people  PersonInput -> CustomerDetail ;  PATCH/DELETE /api/customers/:id/people/:personId
 *   POST   /api/customers/:id/dates   DateInput -> CustomerDetail   ;  PATCH/DELETE /api/customers/:id/dates/:dateId
 *   POST   /api/customers/:id/services ServiceInput -> CustomerDetail ; PATCH/DELETE /api/customers/:id/services/:serviceId
 *   POST   /api/customers/:id/research { topic: 'COMPANY' } -> CustomerDetail (adds a WEB_AI THOUGHT note with sources; needs consent + company)
 *   POST   /api/customers/:id/consent { given: boolean, method?: string } -> CustomerDetail
 *   GET    /api/services?status=OPEN -> Array<AfterSalesService & { customerName: string }>
 *   GET /api/reminders now also returns IMPORTANT_DATE rows (birthdays, anniversaries, handover, lease, tax) within the window, each remindDaysBefore ahead
 *   POST   /api/bookings also accepts optional customerId (book an existing CRM customer)
 */
export type ChatEvent =
    | { type: 'text'; text: string }
    | { type: 'tool'; name: string }
    | { type: 'done' }
    | { type: 'error'; message: string };
