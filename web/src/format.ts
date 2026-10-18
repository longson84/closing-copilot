import type { AfterSalesService, CustomerStatus, DateKind, DocType, NoteKind, Purpose, Relation, Residency, Risk, ServiceType, StageKey } from '../../src/shared/types';

export const formatSGD = (n: number) =>
  `${n < 0 ? '-' : ''}S$${Math.abs(n).toLocaleString('en-SG', { maximumFractionDigits: 0 })}`;

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-SG', { day: 'numeric', month: 'short' });
}

/** "2026-03" -> "Mar 2026", "2028" -> "2028". */
export function formatMonth(ym: string | null | undefined): string {
  if (!ym) return '—';
  const m = ym.match(/^(\d{4})-(\d{2})/);
  if (!m) return ym;
  return new Date(Number(m[1]), Number(m[2]) - 1, 1).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function daysLeftLabel(days: number | null): string {
  if (days === null) return '—';
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Tomorrow';
  return `${days} days`;
}

export const riskLabel: Record<Risk, string> = {
  OVERDUE: 'Overdue',
  DUE_SOON: 'Due soon',
  ON_TRACK: 'On track',
  DONE: 'Completed',
};

export const residencyLabel: Record<Residency, string> = {
  SC: 'Singapore Citizen',
  SPR: 'Singapore PR',
  FOREIGNER: 'Foreigner',
};

export const purposeLabel: Record<Purpose, string> = {
  OWN_STAY: 'Own stay',
  INVESTMENT: 'Investment',
};

export const docTypeLabel: Record<DocType, string> = {
  IDENTITY: 'Identity document',
  OTP: 'Option to Purchase',
  SPA: 'Sale & Purchase Agreement',
  RECEIPT: 'Payment receipt',
  OTHER: 'Other document',
};

export const stageShort: Record<StageKey, string> = {
  BOOKING: 'Booking',
  CDD: 'CDD',
  SPA_DELIVERED: 'S&P delivered',
  SPA_EXERCISED: 'S&P exercised',
  STAMP_DUTY: 'Stamp duty',
  DOWNPAYMENT_15: '15% downpayment',
  KEYS: 'Keys / TOP',
};

const toolLabels: Record<string, string> = {
  list_deals_needing_action: 'Checking deadlines',
  get_deal: 'Reading deal file',
  calc_stamp_duty: 'Calculating stamp duty',
  draft_customer_message: 'Drafting message',
  suggest_followups: 'Planning follow-ups',
  search_projects: 'Searching projects',
  find_customers: 'Finding customers',
  get_customer: 'Reading customer file',
  list_reminders: 'Checking reminders',
  advance_stage: 'Updating stage',
  check_stage_document: 'Cross-checking document',
  extract_identity_document: 'Reading ID document',
};

export function humanizeTool(name: string): string {
  if (toolLabels[name]) return toolLabels[name];
  if (/_(people|dates)$/.test(name)) return 'Reading family & dates';
  if (/_services$/.test(name)) return 'Checking after-sales';
  if (/research/.test(name)) return 'Searching the web';
  const s = name.replace(/[_-]+/g, ' ').trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function humanizeField(key: string): string {
  const s = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatValue(key: string, v: string | number | null): string {
  if (v === null || v === '') return '—';
  if (typeof v === 'number') {
    if (/price|amount|fee|duty|paid|sum|total/i.test(key)) return formatSGD(v);
    return v.toLocaleString('en-SG');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDate(v);
  return v;
}

export const statusLabel: Record<CustomerStatus, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Prospect',
  BOOKED: 'Booked',
  AFTER_SALES: 'After-sales',
  LOST: 'Lost',
};

export const noteKindLabel: Record<NoteKind, string> = {
  DISCUSSION: 'Discussion',
  THOUGHT: 'My thoughts',
  PLAN: 'Plan',
};

/** Compact SGD for budgets: 1850000 -> "S$1.85M", 950000 -> "S$950k". */
export function formatSGDShort(n: number): string {
  if (n >= 1_000_000) return `S$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/0$/, '')}M`;
  if (n >= 1_000) return `S$${Math.round(n / 1_000)}k`;
  return `S$${n}`;
}

export function formatBudget(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${formatSGDShort(min)} – ${formatSGDShort(max)}`;
  if (max !== null) return `Up to ${formatSGDShort(max)}`;
  if (min !== null) return `From ${formatSGDShort(min)}`;
  return '—';
}

export function addDaysISO(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "Today", "Yesterday", "3 days ago", or a date. */
export function relativeDay(iso: string | null): string {
  if (!iso) return '—';
  const d = daysBetween(iso.slice(0, 10), todayISO());
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d > 1 && d < 7) return `${d} days ago`;
  if (d === -1) return 'Tomorrow';
  return formatDateShort(iso.slice(0, 10));
}

export function dueLabel(iso: string): string {
  const d = daysBetween(todayISO(), iso);
  if (d < 0) return `${-d}d overdue`;
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  if (d < 7) return `In ${d} days`;
  return formatDateShort(iso);
}

// ---------- Relationships, dates, after-sales ----------

export const relationLabel: Record<Relation, string> = {
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  OTHER_RELATIVE: 'Relative',
  COLLEAGUE: 'Colleague',
  FRIEND: 'Friend',
  ADVISOR: 'Advisor',
  TENANT: 'Tenant',
  OTHER: 'Other',
};

export const dateKindLabel: Record<DateKind, string> = {
  BIRTHDAY: 'Birthday',
  ANNIVERSARY: 'Anniversary',
  HANDOVER: 'Handover',
  SCHOOL: 'School',
  LEASE: 'Lease',
  TAX: 'Tax',
  CUSTOM: 'Other',
};

export const serviceTypeLabel: Record<ServiceType, string> = {
  RENTAL: 'Rental',
  FURNISHING: 'Furnishing',
  TENANCY: 'Tenancy',
  TAX: 'Tax',
  DEFECTS: 'Defects',
  REFINANCING: 'Refinancing',
  OTHER: 'Other',
};

export const serviceStatusLabel: Record<AfterSalesService['status'], string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
  CANCELLED: 'Cancelled',
};

/** Month-day of "YYYY-MM-DD" or "--MM-DD". */
function md(date: string): [number, number] | null {
  const m = date.match(/^(?:\d{4}|--)-?(\d{2})-(\d{2})$/) ?? date.match(/^--(\d{2})-(\d{2})$/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export const yearOf = (date: string): number | null => (/^\d{4}-/.test(date) ? Number(date.slice(0, 4)) : null);

/** Next time a date falls on or after today. One-off dates return themselves (even if past). */
export function nextOccurrence(date: string, yearly: boolean, from = todayISO()): string | null {
  if (!yearly && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const p = md(date);
  if (!p) return null;
  const y = Number(from.slice(0, 4));
  const pad = (n: number) => String(n).padStart(2, '0');
  let cand = `${y}-${pad(p[0])}-${pad(p[1])}`;
  if (cand < from) cand = `${y + 1}-${pad(p[0])}-${pad(p[1])}`;
  return cand;
}

/** "3 Mar 2019", or "3 Mar" when the year is unknown. */
export function formatDayMonth(date: string): string {
  const p = md(date);
  if (!p) return date;
  const y = yearOf(date);
  const d = new Date(y ?? 2000, p[0] - 1, p[1]);
  return d.toLocaleDateString('en-SG', y ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

/** Age the person turns on their next birthday, if the year is known. */
export function turnsAge(birthday: string): number | null {
  const y = yearOf(birthday);
  const next = nextOccurrence(birthday, true);
  return y && next ? Number(next.slice(0, 4)) - y : null;
}

export function currentAge(birthday: string): number | null {
  const y = yearOf(birthday);
  if (!y) return null;
  const next = nextOccurrence(birthday, true)!;
  const turns = Number(next.slice(0, 4)) - y;
  return next === todayISO() ? turns : turns - 1;
}

export function inDays(iso: string | null): string {
  if (!iso) return '—';
  const d = daysBetween(todayISO(), iso);
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d < 0) return `${-d} days ago`;
  return `in ${d} days`;
}
