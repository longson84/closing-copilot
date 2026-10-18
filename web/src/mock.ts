// Dev-only in-browser fixtures. Loaded only when VITE_MOCK=1 (dynamic import, tree-shaken otherwise).
// All people and numbers here are fictional.
import type {
  ChatEvent,
  Customer,
  Deal,
  DealDetail,
  DealDocument,
  DealSummary,
  FollowUp,
  Project,
  Risk,
  Stage,
  StageKey,
} from '../../src/shared/types';
import { daysBetween, todayISO } from './format';

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const T = todayISO();

const STAGE_DEFS: { key: StageKey; label: string; description: string }[] = [
  { key: 'BOOKING', label: 'Booking', description: 'OTP issued and 5% booking fee paid.' },
  { key: 'CDD', label: 'Customer due diligence', description: 'Verify buyer identity and complete CEA CDD checks.' },
  { key: 'SPA_DELIVERED', label: 'S&P delivered', description: "Developer's solicitor delivers the Sale & Purchase Agreement (within 2 weeks of OTP)." },
  { key: 'SPA_EXERCISED', label: 'S&P exercised', description: 'Buyer signs and returns the S&P within 3 weeks of delivery.' },
  { key: 'STAMP_DUTY', label: 'Stamp duty paid', description: 'BSD and any ABSD paid to IRAS within 14 days of exercise.' },
  { key: 'DOWNPAYMENT_15', label: '15% downpayment', description: 'Balance 15% of purchase price paid (within 8 weeks of OTP).' },
  { key: 'KEYS', label: 'Keys / TOP', description: 'Temporary Occupation Permit issued and keys collected.' },
];

function buildStages(otpDate: string, completed: Partial<Record<StageKey, string>>): Stage[] {
  const due: Partial<Record<StageKey, string | null>> = {};
  due.BOOKING = otpDate;
  due.CDD = addDays(otpDate, 3);
  due.SPA_DELIVERED = addDays(otpDate, 14);
  const deliv = completed.SPA_DELIVERED;
  due.SPA_EXERCISED = deliv ? addDays(deliv, 21) : null;
  const ex = completed.SPA_EXERCISED;
  due.STAMP_DUTY = ex ? addDays(ex, 14) : null;
  due.DOWNPAYMENT_15 = addDays(otpDate, 56);
  due.KEYS = null;
  return STAGE_DEFS.map((s) => ({
    ...s,
    dueDate: due[s.key] ?? null,
    completedAt: completed[s.key] ?? null,
  }));
}

function currentOf(stages: Stage[]): StageKey {
  return (stages.find((s) => !s.completedAt) ?? stages[stages.length - 1]).key;
}

function riskOf(deal: Deal): { risk: Risk; daysLeft: number | null; next: string | null } {
  const open = deal.stages.find((s) => !s.completedAt);
  if (!open) return { risk: 'DONE', daysLeft: null, next: null };
  if (!open.dueDate) return { risk: 'ON_TRACK', daysLeft: null, next: null };
  const d = daysBetween(T, open.dueDate);
  return { risk: d < 0 ? 'OVERDUE' : d <= 7 ? 'DUE_SOON' : 'ON_TRACK', daysLeft: d, next: open.dueDate };
}

function cust(
  id: string,
  fullName: string,
  masked: string,
  residency: Customer['residency'],
  extra: Partial<Customer> & { profile: Customer['profile'] },
): Customer {
  const now = new Date().toISOString();
  return {
    status: 'BOOKED',
    source: null,
    budgetMinSgd: null,
    budgetMaxSgd: null,
    preferences: { segments: [], areas: [], bedrooms: [], executiveCondo: null, timeline: null, notes: null },
    tags: [],
    createdAt: now,
    updatedAt: now,
    id,
    fullName,
    idType: residency === 'FOREIGNER' ? 'PASSPORT' : residency === 'SPR' ? 'FIN' : 'NRIC',
    idNumberMasked: masked,
    dateOfBirth: null,
    nationality: null,
    sex: null,
    address: null,
    residency,
    phone: null,
    email: null,
    preferredLanguage: 'English',
    ...extra,
  };
}

export const customers: Record<string, Customer> = {
  c1: cust('c1', 'Tan Wei Ming', 'S****567D', 'SC', {
    dateOfBirth: '1986-04-12',
    nationality: 'Singapore Citizen',
    sex: 'M',
    address: '28 Ang Mo Kio Ave 3, #09-114, Singapore 560028',
    phone: '+65 9123 4567',
    email: 'weiming.tan@example.com',
    profile: { purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, 2 young children' },
  }),
  c2: cust('c2', 'Priya Raman', 'S****912H', 'SPR', {
    dateOfBirth: '1990-09-03',
    nationality: 'Indian',
    sex: 'F',
    phone: '+65 8234 1100',
    email: 'priya.r@example.com',
    profile: { purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, no children' },
  }),
  c3: cust('c3', 'Liu Jian', 'E****1820', 'FOREIGNER', {
    dateOfBirth: '1979-01-22',
    nationality: 'Chinese',
    sex: 'M',
    phone: '+65 8800 2391',
    email: 'liu.jian@example.com',
    profile: { purpose: 'INVESTMENT', propertiesOwned: 1, household: null },
  }),
  c4: cust('c4', 'Sarah Lim Hui Min', 'T****044B', 'SC', {
    dateOfBirth: '1995-06-30',
    nationality: 'Singapore Citizen',
    sex: 'F',
    phone: '+65 9001 8822',
    email: 'sarah.lim@example.com',
    profile: { purpose: 'INVESTMENT', propertiesOwned: 1, household: 'Single, lives with parents' },
  }),
  c5: cust('c5', 'Ahmad bin Ismail', 'S****330A', 'SC', {
    dateOfBirth: '1972-11-05',
    nationality: 'Singapore Citizen',
    sex: 'M',
    phone: '+65 9666 7000',
    profile: { purpose: 'OWN_STAY', propertiesOwned: 0, household: 'Married, 3 teenage children' },
  }),
};

function idDoc(name: string, masked: string, uploadedAt: string): DealDocument {
  return {
    id: `doc-id-${masked}`,
    type: 'IDENTITY',
    fileName: 'nric_front_back.jpg',
    uploadedAt,
    extracted: { fullName: name, idNumber: masked, dateOfBirth: '1986-04-12', nationality: 'Singapore Citizen' },
    checks: [
      { field: 'idNumber', status: 'OK', message: 'NRIC checksum is valid.' },
      { field: 'fullName', status: 'OK', message: 'Name is legible and matches the booking form.' },
    ],
    summary: 'Singapore NRIC, front and back. All required CDD fields captured.',
    suggestedStage: 'CDD',
  };
}

// MOCK catalog for VITE_MOCK=1 only. Figures are rough placeholders, not verified market data;
// the real catalog comes from GET /api/projects.
export const MOCK_PROJECTS: Project[] = [
  {
    id: 'aurelia-bay-residences',
    name: 'Aurelia Bay Residences',
    developer: 'Aurelia Bay Development Pte Ltd (fictional)',
    address: '18 Aurelia Bay Drive, Singapore 438888 (fictional)',
    district: 'D15',
    segment: 'RCR',
    type: 'CONDO',
    tenure: '99-year leasehold',
    totalUnits: 640,
    launchDate: '2026-03',
    expectedTop: '2030-06',
    priceFromSgd: 1_380_000,
    avgPsfSgd: 2_450,
    unitMix: ['1BR', '2BR', '3BR', '4BR', 'Penthouse'],
    sources: [],
    fictional: true,
  },
  { id: 'mock-grand-dunman', name: 'Grand Dunman', developer: 'SingHaiyi Group (mock)', address: 'Dunman Road (mock)', district: 'D15', segment: 'RCR', type: 'CONDO', tenure: '99-year leasehold', totalUnits: 1008, launchDate: '2026-01', expectedTop: '2028', priceFromSgd: 1_300_000, avgPsfSgd: 2_500, unitMix: ['1BR', '2BR', '3BR', '4BR', '5BR'], sources: ['https://example.com/mock-source'], fictional: false },
  { id: 'mock-the-continuum', name: 'The Continuum', developer: 'Hoi Hup / Sunway (mock)', address: 'Thiam Siew Avenue (mock)', district: 'D15', segment: 'RCR', type: 'CONDO', tenure: 'Freehold', totalUnits: 816, launchDate: '2025-11', expectedTop: '2027', priceFromSgd: 1_450_000, avgPsfSgd: 2_750, unitMix: ['1BR', '2BR', '3BR', '4BR', '5BR'], sources: [], fictional: false },
  { id: 'mock-lentor-hills-residences', name: 'Lentor Hills Residences', developer: 'Hong Leong / GuocoLand (mock)', address: 'Lentor Hills Road (mock)', district: 'D26', segment: 'OCR', type: 'CONDO', tenure: '99-year leasehold', totalUnits: 598, launchDate: '2025-08', expectedTop: '2027', priceFromSgd: 1_100_000, avgPsfSgd: 2_100, unitMix: ['1BR', '2BR', '3BR', '4BR'], sources: [], fictional: false },
  { id: 'mock-hillock-green', name: 'Hillock Green', developer: 'Lentor Hills Pte Ltd (mock)', address: 'Lentor Central (mock)', district: 'D26', segment: 'OCR', type: 'CONDO', tenure: '99-year leasehold', totalUnits: 474, launchDate: '2025-06', expectedTop: '2027', priceFromSgd: 1_050_000, avgPsfSgd: 2_050, unitMix: ['1BR', '2BR', '3BR', '4BR'], sources: [], fictional: false },
  { id: 'mock-tembusu-grand', name: 'Tembusu Grand', developer: 'City Developments / MCL Land (mock)', address: 'Jalan Tembusu (mock)', district: 'D15', segment: 'RCR', type: 'CONDO', tenure: '99-year leasehold', totalUnits: 638, launchDate: '2025-03', expectedTop: '2026', priceFromSgd: 1_400_000, avgPsfSgd: 2_400, unitMix: ['1BR', '2BR', '3BR', '4BR', '5BR'], sources: [], fictional: false },
  { id: 'mock-copen-grand', name: 'Copen Grand', developer: 'CDL / MCL Land (mock)', address: 'Tengah Garden Walk (mock)', district: 'D24', segment: 'OCR', type: 'EC', tenure: '99-year leasehold', totalUnits: 639, launchDate: '2025-01', expectedTop: '2027', priceFromSgd: 1_100_000, avgPsfSgd: 1_400, unitMix: ['3BR', '4BR', '5BR'], sources: [], fictional: false },
];

const projectIdFor = (name: string) => MOCK_PROJECTS.find((p) => p.name === name)?.id ?? null;

export async function listProjects(): Promise<Project[]> {
  await sleep(200);
  return structuredClone(MOCK_PROJECTS);
}

function makeDeal(
  id: string,
  customerId: string,
  project: string,
  unit: string,
  price: number,
  otpOffset: number,
  completedOffsets: Partial<Record<StageKey, number>>,
  documents: DealDocument[],
): Deal {
  const otpDate = addDays(T, otpOffset);
  const completed: Partial<Record<StageKey, string>> = {};
  for (const [k, off] of Object.entries(completedOffsets)) completed[k as StageKey] = addDays(otpDate, off!);
  const stages = buildStages(otpDate, completed);
  return {
    id,
    customerId,
    agentName: 'Rachel Lim',
    project,
    projectId: projectIdFor(project),
    unit,
    price,
    otpDate,
    bookingFee: Math.round(price * 0.05),
    currentStage: currentOf(stages),
    stages,
    documents,
    createdAt: `${otpDate}T10:00:00+08:00`,
  };
}

export const deals: Deal[] = [
  makeDeal('d-1001', 'c1', 'Lentor Hills Residences', '#12-05', 1_688_000, -24, { BOOKING: 0, CDD: 1, SPA_DELIVERED: 10 }, [
    idDoc('TAN WEI MING', 'S****567D', addDays(T, -24) + 'T10:12:00+08:00'),
    {
      id: 'doc-otp-1001',
      type: 'OTP',
      fileName: 'OTP_LentorHills_12-05.pdf',
      uploadedAt: addDays(T, -23) + 'T15:40:00+08:00',
      extracted: { purchaserName: 'TAN WEI MENG', purchaserId: 'S****567D', unit: '#12-05', price: 1_688_000, bookingFee: 84_400, optionDate: addDays(T, -24) },
      checks: [
        { field: 'purchaserName', status: 'MISMATCH', message: 'OTP names the purchaser "TAN WEI MENG" but the NRIC reads "TAN WEI MING". Ask the developer\'s solicitor to correct the name before the S&P is exercised.' },
        { field: 'bookingFee', status: 'OK', message: 'Booking fee S$84,400 is exactly 5% of the purchase price.' },
        { field: 'unit', status: 'OK', message: 'Unit matches the booking.' },
      ],
      summary: 'Option to Purchase for #12-05 at S$1,688,000, 5% booking fee paid by cheque.',
      suggestedStage: 'BOOKING',
    },
  ]),
  makeDeal('d-1002', 'c2', 'The Continuum', '#08-12', 2_150_000, -37, { BOOKING: 0, CDD: 1, SPA_DELIVERED: 9, SPA_EXERCISED: 20 }, [
    {
      id: 'doc-spa-1002',
      type: 'SPA',
      fileName: 'SPA_Continuum_08-12_signed.pdf',
      uploadedAt: addDays(T, -17) + 'T11:05:00+08:00',
      extracted: { purchaserName: 'PRIYA RAMAN', unit: '#08-12', price: 2_150_000, exerciseDate: addDays(T, -17) },
      checks: [
        { field: 'purchaserName', status: 'OK', message: 'Matches identity document.' },
        { field: 'stampDuty', status: 'MISSING', message: 'No IRAS stamp certificate uploaded yet. BSD + 5% ABSD (SPR, first property) is due.' },
      ],
      summary: 'Signed Sale & Purchase Agreement, exercised and returned to the solicitor.',
      suggestedStage: 'SPA_EXERCISED',
    },
  ]),
  makeDeal('d-1003', 'c3', 'Grand Dunman', '#21-03', 3_080_000, -2, { BOOKING: 0 }, [
    {
      id: 'doc-id-1003',
      type: 'IDENTITY',
      fileName: 'passport_liujian.pdf',
      uploadedAt: addDays(T, -2) + 'T09:30:00+08:00',
      extracted: { fullName: 'LIU JIAN', idNumber: 'E****1820', nationality: 'Chinese', passportExpiry: addDays(T, 120) },
      checks: [{ field: 'passportExpiry', status: 'MISSING', message: 'Passport expires in 4 months. Request proof of address for enhanced CDD.' }],
      summary: 'PRC passport, bio page. Foreign buyer: ABSD 60% applies.',
      suggestedStage: 'CDD',
    },
  ]),
  makeDeal('d-1004', 'c4', 'Hillock Green', '#05-18', 1_288_000, -6, { BOOKING: 0, CDD: 1 }, []),
  makeDeal('d-1005', 'c5', 'Tembusu Grand', '#16-01', 2_430_000, -120, { BOOKING: 0, CDD: 1, SPA_DELIVERED: 12, SPA_EXERCISED: 25, STAMP_DUTY: 33, DOWNPAYMENT_15: 52, KEYS: 118 }, []),
];

export function summary(d: Deal): DealSummary {
  const r = riskOf(d);
  const stage = d.stages.find((s) => s.key === d.currentStage)!;
  return {
    id: d.id,
    customerName: customers[d.customerId].fullName,
    project: d.project,
    unit: d.unit,
    price: d.price,
    currentStage: d.currentStage,
    currentStageLabel: stage.label,
    nextDueDate: r.next,
    daysLeft: r.daysLeft,
    risk: r.risk,
    openIssues: d.documents.flatMap((x) => x.checks).filter((c) => c.status !== 'OK').length,
  };
}

function detail(d: Deal): DealDetail {
  return { deal: structuredClone(d), customer: structuredClone(customers[d.customerId]), risk: riskOf(d).risk };
}

function find(id: string): Deal {
  const d = deals.find((x) => x.id === id);
  if (!d) throw new Error('Deal not found.');
  return d;
}

export async function listDeals(): Promise<DealSummary[]> {
  await sleep(250);
  return deals.map(summary);
}

export async function getDeal(id: string): Promise<DealDetail> {
  await sleep(200);
  return detail(find(id));
}

export async function completeStage(id: string, key: StageKey, date: string): Promise<DealDetail> {
  await sleep(400);
  const d = find(id);
  const completed: Partial<Record<StageKey, string>> = {};
  for (const s of d.stages) if (s.completedAt) completed[s.key] = s.completedAt;
  completed[key] = date;
  d.stages = buildStages(d.otpDate, completed);
  d.currentStage = currentOf(d.stages);
  return detail(d);
}

export async function uploadDocument(id: string, file: File): Promise<{ deal: DealDetail; document: DealDocument }> {
  await sleep(2800);
  const d = find(id);
  const c = customers[d.customerId];
  const n = file.name.toLowerCase();
  let doc: DealDocument;
  if (n.includes('receipt')) {
    const paid = Math.round(d.price * 0.145);
    doc = {
      id: `doc-${Date.now()}`,
      type: 'RECEIPT',
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      extracted: { payer: c.fullName.toUpperCase(), amountPaid: paid, paymentDate: T, payee: `${d.project} Pte Ltd` },
      checks: [
        { field: 'amountPaid', status: 'MISMATCH', message: `Receipt shows S$${paid.toLocaleString('en-SG')} but 15% of S$${d.price.toLocaleString('en-SG')} is S$${Math.round(d.price * 0.15).toLocaleString('en-SG')}. Shortfall of S$${(Math.round(d.price * 0.15) - paid).toLocaleString('en-SG')}.` },
        { field: 'payer', status: 'OK', message: 'Payer matches the buyer.' },
      ],
      summary: 'Developer receipt for the balance downpayment, paid by bank transfer.',
      suggestedStage: 'DOWNPAYMENT_15',
    };
  } else if (n.includes('spa') || n.includes('s&p') || n.includes('sale')) {
    doc = {
      id: `doc-${Date.now()}`,
      type: 'SPA',
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      extracted: { purchaserName: c.fullName.toUpperCase(), unit: d.unit, price: d.price, deliveryDate: T },
      checks: [
        { field: 'purchaserName', status: 'OK', message: 'Matches the identity document.' },
        { field: 'price', status: 'OK', message: 'Price matches the OTP.' },
      ],
      summary: 'Sale & Purchase Agreement from the developer’s solicitor, ready for the buyer to sign.',
      suggestedStage: 'SPA_DELIVERED',
    };
  } else {
    doc = {
      id: `doc-${Date.now()}`,
      type: 'OTP',
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      extracted: { purchaserName: 'TAN WEI MENG', purchaserId: c.idNumberMasked, unit: d.unit, price: d.price, bookingFee: Math.round(d.price * 0.05) },
      checks: [
        { field: 'purchaserName', status: 'MISMATCH', message: `OTP names the purchaser "TAN WEI MENG" but the ID document reads "${c.fullName.toUpperCase()}". Get the name corrected before the S&P is exercised.` },
        { field: 'bookingFee', status: 'OK', message: 'Booking fee is exactly 5% of the purchase price.' },
      ],
      summary: `Option to Purchase for ${d.unit}, ${d.project}.`,
      suggestedStage: 'BOOKING',
    };
  }
  d.documents.push(doc);
  return { deal: detail(d), document: doc };
}

export async function createBooking(form: FormData): Promise<DealDetail> {
  await sleep(3200);
  const id = `d-${1000 + deals.length + 1}`;
  const existing = form.get('customerId') as string | null;
  const cid = existing && customers[existing] ? existing : `c${Object.keys(customers).length + 1}`;
  const residency = (form.get('residency') as Customer['residency']) || 'SC';
  if (existing && customers[existing]) {
    const c = customers[existing];
    Object.assign(c, { status: 'BOOKED', residency, idType: 'NRIC', idNumberMasked: c.idNumberMasked ?? 'S****204F' });
  } else customers[cid] = cust(cid, 'Chen Mei Ling', 'S****204F', residency, {
    dateOfBirth: '1988-02-14',
    nationality: residency === 'FOREIGNER' ? 'Malaysian' : 'Singapore Citizen',
    sex: 'F',
    address: '9 Tampines St 81, #04-22, Singapore 528829',
    phone: (form.get('phone') as string) || null,
    email: (form.get('email') as string) || null,
    profile: {
      purpose: (form.get('purpose') as Customer['profile']['purpose']) || 'OWN_STAY',
      propertiesOwned: Number(form.get('propertiesOwned') || 0),
      household: (form.get('household') as string) || null,
    },
  });
  const otpDate = (form.get('otpDate') as string) || T;
  const price = Number(form.get('price') || 0);
  const file = form.get('file') as File | null;
  const stages = buildStages(otpDate, { BOOKING: otpDate });
  const deal: Deal = {
    id,
    customerId: cid,
    agentName: 'Rachel Lim',
    project:
      MOCK_PROJECTS.find((p) => p.id === form.get('projectId'))?.name ?? ((form.get('project') as string) || 'Untitled project'),
    projectId: MOCK_PROJECTS.some((p) => p.id === form.get('projectId')) ? (form.get('projectId') as string) : null,
    unit: (form.get('unit') as string) || '—',
    price,
    otpDate,
    bookingFee: Math.round(price * 0.05),
    currentStage: currentOf(stages),
    stages,
    documents: [
      {
        ...idDoc('CHEN MEI LING', 'S****204F', new Date().toISOString()),
        id: `doc-${Date.now()}`,
        fileName: file?.name ?? 'id.jpg',
        extracted: { fullName: 'CHEN MEI LING', idNumber: 'S****204F', dateOfBirth: '1988-02-14', sex: 'F', address: '9 Tampines St 81, #04-22, Singapore 528829' },
      },
    ],
    createdAt: new Date().toISOString(),
  };
  deals.unshift(deal);
  return detail(deal);
}

export async function getFollowups(id: string): Promise<FollowUp[]> {
  await sleep(1400);
  const d = find(id);
  const c = customers[d.customerId];
  const first = c.fullName.split(' ').slice(-1)[0];
  const list: FollowUp[] = [
    {
      title: 'Confirm S&P signing appointment',
      when: 'This week',
      why: 'The S&P must be exercised within 3 weeks of delivery or the booking fee is at risk.',
      channel: 'MESSAGE',
      draftMessage: `Hi ${first}, hope you're well! Just a reminder that your S&P for ${d.project} ${d.unit} needs to be signed and returned to the solicitor soon. Would Thursday or Saturday work for a quick signing session? I'll bring everything you need.`,
    },
    {
      title: 'Introduce a mortgage banker for loan approval',
      when: 'Before 15% downpayment',
      why: `${c.profile.purpose === 'OWN_STAY' ? 'Owner-occupier' : 'Investor'} buyers usually need a final Letter of Offer before the 8-week downpayment deadline.`,
      channel: 'CALL',
      draftMessage: null,
    },
  ];
  if (/young|teenage/.test(c.profile.household ?? '')) {
    list.push({
      title: 'Share nearby school ballot information',
      when: 'After keys',
      why: `${c.profile.household}. Primary school registration priority depends on home distance.`,
      channel: 'EMAIL',
      draftMessage: `Dear ${first},\n\nCongratulations again on ${d.project}! Since you have young children, I've put together the primary schools within 1 km of the development and the key registration dates for next year. Happy to walk you through it.\n\nBest regards,\nRachel`,
    });
  }
  list.push({
    title: 'Schedule defects inspection',
    when: 'Within 1 year of TOP',
    why: 'Defects liability period: the developer must fix defects reported within 12 months.',
    channel: 'MEETING',
    draftMessage: null,
  });
  return list;
}

export async function* streamChat(body: { message: string; dealId?: string }): AsyncGenerator<ChatEvent> {
  await sleep(350);
  const m = body.message.toLowerCase();
  let tool = 'list_deals_needing_action';
  let reply =
    "Here's what needs your attention today:\n\n1. **Priya Raman — The Continuum #08-12**: stamp duty is **3 days overdue**. IRAS charges late-payment penalties, so collect the BSD + ABSD cheque today.\n2. **Tan Wei Ming — Lentor Hills #12-05**: the OTP spells the buyer's name *Tan Wei Meng*. Ask the developer's solicitor to correct it before the S&P is exercised.\n3. **Liu Jian — Grand Dunman #21-03**: CDD is due. Request proof of address for enhanced due diligence.\n\nWant me to draft the reminder to Priya?";
  if (m.includes('stamp')) {
    tool = 'calc_stamp_duty';
    reply =
      'For a **Singapore Citizen buying a first residential property** at S$1,688,000:\n\n- Buyer’s Stamp Duty (BSD): **S$59,920**\n- Additional Buyer’s Stamp Duty (ABSD): **S$0** (first property)\n- **Total payable: S$59,920**, due within 14 days of exercising the S&P.';
  } else if (m.includes('draft') || m.includes('reminder')) {
    tool = 'draft_customer_message';
    reply =
      "Here's a friendly reminder you can send on WhatsApp:\n\n> Hi Wei Ming, quick reminder that your S&P for Lentor Hills Residences #12-05 needs to be signed and returned by **this Friday**. I can bring the documents over. Does Thursday evening suit you?\n\nI kept it short and gave a specific next step.";
  } else if (m.includes('track')) {
    tool = 'get_deal';
    reply =
      "Mostly yes, with **one blocker**:\n\n- S&P was delivered on time; exercise is due in **2 days**.\n- The OTP has a **name mismatch** (Tan Wei *Meng* vs Tan Wei *Ming*). Fix this before signing, or the S&P may need to be re-issued.\n- 15% downpayment deadline is in about 4 weeks.";
  }
  yield { type: 'tool', name: tool };
  await sleep(700);
  for (const chunk of reply.match(/\S+\s*/g) ?? []) {
    yield { type: 'text', text: chunk };
    await sleep(18);
  }
  yield { type: 'done' };
}
