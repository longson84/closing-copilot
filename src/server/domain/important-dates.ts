// Important dates: stored ones plus dates derived from the profile (birthdays, handover
// anniversaries, lease ends, tax deadlines). Pure functions — callers pass the records in.

import type { AfterSalesService, Deal, ImportantDate, Person, Relation } from '../../shared/types.js';
import { diffDays } from './dates.js';

const FULL = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEARLESS = /^--(\d{2})-(\d{2})$/;

export function isValidDate(d: string): boolean {
    return FULL.test(d) || YEARLESS.test(d);
}

function monthDay(date: string): [number, number] | null {
    const m = FULL.exec(date) ?? YEARLESS.exec(date);
    if (!m) return null;
    return FULL.test(date) ? [Number(m[2]), Number(m[3])] : [Number(m[1]), Number(m[2])];
}

function ymd(y: number, m: number, d: number): string {
    // 29 Feb falls back to 28 Feb in non-leap years.
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

/** Next date on or after `today` this falls on, or null for a one-off date already past. */
export function nextOccurrence(date: string, yearly: boolean, today: string): string | null {
    if (!yearly) return FULL.test(date) && date >= today ? date : null;
    const md = monthDay(date);
    if (!md) return null;
    const y = Number(today.slice(0, 4));
    const thisYear = ymd(y, md[0], md[1]);
    return thisYear >= today ? thisYear : ymd(y + 1, md[0], md[1]);
}

/** Age reached on `on`, when the birth year is known. */
export function ageOn(birthday: string, on: string): number | null {
    const m = FULL.exec(birthday);
    if (!m) return null;
    return Number(on.slice(0, 4)) - Number(m[1]) - (on.slice(5) < birthday.slice(5) ? 1 : 0);
}

const RELATION_WORD: Record<Relation, string> = {
    SPOUSE: 'spouse',
    CHILD: 'child',
    PARENT: 'parent',
    SIBLING: 'sibling',
    OTHER_RELATIVE: 'relative',
    COLLEAGUE: 'colleague',
    FRIEND: 'friend',
    ADVISOR: 'advisor',
    TENANT: 'tenant',
    OTHER: 'contact',
};

export function relationText(p: Person): string {
    return (p.relationLabel ?? RELATION_WORD[p.relation]).toLowerCase();
}

function derived(id: string, customerId: string, rest: Omit<ImportantDate, 'id' | 'customerId' | 'source' | 'createdAt'>): ImportantDate {
    return { id, customerId, source: 'SYSTEM', createdAt: '', ...rest };
}

/** Dates implied by the customer file, never stored (they follow the source data). */
export function derivedDates(input: {
    customerId: string;
    customerName: string;
    customerBirthday: string | null;
    people: Person[];
    deals: Deal[];
    services: AfterSalesService[];
}): ImportantDate[] {
    const out: ImportantDate[] = [];
    const { customerId } = input;
    if (input.customerBirthday && isValidDate(input.customerBirthday)) {
        out.push(derived(`birthday:customer:${customerId}`, customerId, { personId: null, serviceId: null, kind: 'BIRTHDAY', label: `${input.customerName}'s birthday`, date: input.customerBirthday, yearly: true, remindDaysBefore: 3 }));
    }
    for (const p of input.people) {
        if (!p.birthday || !isValidDate(p.birthday)) continue;
        out.push(derived(`birthday:${p.id}`, customerId, { personId: p.id, serviceId: null, kind: 'BIRTHDAY', label: `${p.name}'s birthday`, date: p.birthday, yearly: true, remindDaysBefore: 3 }));
    }
    for (const d of input.deals) {
        const keys = d.stages.find((s) => s.key === 'KEYS')?.completedAt;
        if (keys) {
            out.push(derived(`handover:${d.id}`, customerId, { personId: null, serviceId: null, kind: 'HANDOVER', label: `Home anniversary — ${d.project} ${d.unit}`, date: keys, yearly: true, remindDaysBefore: 7 }));
        }
    }
    for (const s of input.services) {
        if (s.status === 'DONE' || s.status === 'CANCELLED') continue;
        const leaseEnd = s.details.leaseEnd;
        if (s.type === 'TENANCY' && typeof leaseEnd === 'string' && FULL.test(leaseEnd)) {
            out.push(derived(`lease-end:${s.id}`, customerId, { personId: null, serviceId: s.id, kind: 'LEASE', label: `Lease ends — ${s.property ?? s.title} (discuss renewal)`, date: leaseEnd, yearly: false, remindDaysBefore: 90 }));
        }
        const ya = Number(s.details.taxYear);
        if (s.type === 'TAX' && ya >= 2000 && ya <= 2100) {
            const isPropertyTax = String(s.details.taxType ?? '').toLowerCase().includes('property tax');
            // IRAS: individual e-filing by 18 Apr of the Year of Assessment; property tax due by 31 Jan.
            out.push(
                derived(`tax:${s.id}`, customerId, {
                    personId: null,
                    serviceId: s.id,
                    kind: 'TAX',
                    label: isPropertyTax ? `Property tax due (${ya}) — ${s.property ?? s.title}` : `File income tax incl. rental income (YA${ya})`,
                    date: isPropertyTax ? `${ya}-01-31` : `${ya}-04-18`,
                    yearly: false,
                    remindDaysBefore: 21,
                }),
            );
        }
    }
    return out;
}

/** True when the reminder for this date falls inside [.., today + days] and the date is not past. */
export function dueWithin(date: ImportantDate, today: string, days: number): { next: string; daysLeft: number } | null {
    const next = nextOccurrence(date.date, date.yearly, today);
    if (!next) return null;
    const daysLeft = diffDays(today, next);
    return daysLeft - date.remindDaysBefore <= days ? { next, daysLeft } : null;
}
