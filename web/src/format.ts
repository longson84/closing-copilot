import type { DocType, Purpose, Residency, Risk, StageKey } from '../../src/shared/types';

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
  advance_stage: 'Updating stage',
  check_stage_document: 'Cross-checking document',
  extract_identity_document: 'Reading ID document',
};

export function humanizeTool(name: string): string {
  if (toolLabels[name]) return toolLabels[name];
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
