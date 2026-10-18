// Singapore new-launch (developer sale) timeline, all driven by the OTP date.
// Sources: Housing Developers Rules standard OTP/S&P terms and IRAS stamp duty
// timing. Durations are the common defaults; a specific OTP can differ.

import type { Deal, DealSummary, Risk, Stage, StageKey } from '../../shared/types.js';
import { addDays, diffDays } from './dates.js';

export const SPA_DELIVERY_DAYS = 14; // developer delivers S&P within 14 days of OTP
export const EXERCISE_DAYS = 21; // buyer signs & returns S&P within 3 weeks of receipt
export const STAMP_DUTY_DAYS = 14; // BSD/ABSD due within 14 days of signing
export const DOWNPAYMENT_WEEKS = 8; // 15% balance within 8 weeks of OTP
const DUE_SOON_DAYS = 7;

interface StageDef {
    key: StageKey;
    label: string;
    description: string;
}

export const STAGE_DEFS: StageDef[] = [
    {
        key: 'BOOKING',
        label: 'Booking (OTP)',
        description: 'Option to Purchase issued; 5% booking fee paid to the developer.',
    },
    {
        key: 'CDD',
        label: 'Customer due diligence',
        description: 'Buyer identity verified and CEA customer due diligence recorded.',
    },
    {
        key: 'SPA_DELIVERED',
        label: 'S&P delivered',
        description: "Developer's solicitor delivers the Sale & Purchase Agreement (within 14 days of OTP).",
    },
    {
        key: 'SPA_EXERCISED',
        label: 'S&P signed (exercised)',
        description: 'Buyer signs and returns the S&P within 3 weeks of receiving it, or the option lapses.',
    },
    {
        key: 'STAMP_DUTY',
        label: 'Stamp duty paid',
        description: "Buyer's and Additional Buyer's Stamp Duty paid to IRAS within 14 days of signing.",
    },
    {
        key: 'DOWNPAYMENT_15',
        label: '15% downpayment',
        description: 'Balance of the 20% downpayment paid within 8 weeks of the OTP date.',
    },
    {
        key: 'KEYS',
        label: 'Keys (TOP)',
        description: 'Progress payments through construction; keys handed over at TOP.',
    },
];

export function stageLabel(key: StageKey): string {
    return STAGE_DEFS.find((s) => s.key === key)!.label;
}

/** Recomputes every due date from the OTP date and the completion dates recorded so far. */
export function buildStages(otpDate: string, completed: Partial<Record<StageKey, string | null>>): Stage[] {
    const done = (k: StageKey) => completed[k] ?? null;
    const spaDelivered = done('SPA_DELIVERED');
    const exercised = done('SPA_EXERCISED');
    const due: Record<StageKey, string | null> = {
        BOOKING: otpDate,
        CDD: otpDate,
        SPA_DELIVERED: addDays(otpDate, SPA_DELIVERY_DAYS),
        SPA_EXERCISED: addDays(spaDelivered ?? addDays(otpDate, SPA_DELIVERY_DAYS), EXERCISE_DAYS),
        STAMP_DUTY: exercised ? addDays(exercised, STAMP_DUTY_DAYS) : null,
        DOWNPAYMENT_15: addDays(otpDate, DOWNPAYMENT_WEEKS * 7),
        KEYS: null,
    };
    return STAGE_DEFS.map((d) => ({ ...d, dueDate: due[d.key], completedAt: done(d.key) }));
}

export function completedMap(stages: Stage[]): Partial<Record<StageKey, string | null>> {
    return Object.fromEntries(stages.map((s) => [s.key, s.completedAt]));
}

export function currentStage(stages: Stage[]): Stage | null {
    return stages.find((s) => !s.completedAt) ?? null;
}

export function riskOf(stages: Stage[], today: string): { risk: Risk; daysLeft: number | null; dueDate: string | null } {
    const current = currentStage(stages);
    if (!current) return { risk: 'DONE', daysLeft: null, dueDate: null };
    // Any open stage that is already late makes the deal overdue, not just the first one.
    const open = stages.filter((s) => !s.completedAt && s.dueDate);
    const nextDue = open.map((s) => s.dueDate!).sort()[0] ?? null;
    if (!nextDue) return { risk: 'ON_TRACK', daysLeft: null, dueDate: null };
    const daysLeft = diffDays(today, nextDue);
    const risk: Risk = daysLeft < 0 ? 'OVERDUE' : daysLeft <= DUE_SOON_DAYS ? 'DUE_SOON' : 'ON_TRACK';
    return { risk, daysLeft, dueDate: nextDue };
}

export function summarize(deal: Deal, customerName: string, today: string): DealSummary {
    const current = currentStage(deal.stages);
    const { risk, daysLeft, dueDate } = riskOf(deal.stages, today);
    return {
        id: deal.id,
        customerName,
        project: deal.project,
        unit: deal.unit,
        price: deal.price,
        currentStage: current?.key ?? 'KEYS',
        currentStageLabel: current?.label ?? 'Completed',
        nextDueDate: dueDate,
        daysLeft,
        risk,
        openIssues: deal.documents.flatMap((d) => d.checks).filter((c) => c.status !== 'OK').length,
    };
}
