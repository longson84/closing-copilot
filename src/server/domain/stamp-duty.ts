// Singapore residential stamp duty, rates effective 27 Apr 2023 (IRAS).
// Computed in code so the copilot never does tax arithmetic itself.

import type { Residency } from '../../shared/types.js';

const BSD_TIERS: Array<[upTo: number, rate: number]> = [
    [180_000, 0.01],
    [180_000, 0.02],
    [640_000, 0.03],
    [500_000, 0.04],
    [1_500_000, 0.05],
    [Infinity, 0.06],
];

// Index = number of residential properties owned AFTER this purchase, capped at 3.
const ABSD_RATES: Record<Residency, [first: number, second: number, thirdPlus: number]> = {
    SC: [0, 0.2, 0.3],
    SPR: [0.05, 0.3, 0.35],
    FOREIGNER: [0.6, 0.6, 0.6],
};

export interface StampDuty {
    price: number;
    bsd: number;
    bsdBreakdown: Array<{ band: string; rate: string; amount: number }>;
    absdRate: number;
    absd: number;
    total: number;
    basis: string;
}

export function calcStampDuty(price: number, residency: Residency, propertiesOwnedBefore: number): StampDuty {
    let remaining = price;
    let lower = 0;
    let bsd = 0;
    const bsdBreakdown: StampDuty['bsdBreakdown'] = [];
    for (const [size, rate] of BSD_TIERS) {
        if (remaining <= 0) break;
        const slice = Math.min(remaining, size);
        const amount = Math.floor(slice * rate);
        bsdBreakdown.push({
            band: size === Infinity ? `above $${lower.toLocaleString()}` : `$${lower.toLocaleString()}–$${(lower + size).toLocaleString()}`,
            rate: `${rate * 100}%`,
            amount,
        });
        bsd += amount;
        remaining -= slice;
        lower += size;
    }
    const nth = Math.min(propertiesOwnedBefore + 1, 3);
    const absdRate = ABSD_RATES[residency][nth - 1];
    const absd = Math.floor(price * absdRate);
    const who = { SC: 'Singapore Citizen', SPR: 'Singapore PR', FOREIGNER: 'Foreigner' }[residency];
    return {
        price,
        bsd,
        bsdBreakdown,
        absdRate,
        absd,
        total: bsd + absd,
        basis: `${who} buying residential property #${propertiesOwnedBefore + 1}; IRAS rates from 27 Apr 2023. Payable within 14 days of signing the S&P.`,
    };
}
