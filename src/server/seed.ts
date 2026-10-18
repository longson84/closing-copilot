// Loads fictional demo deals from demo-docs/seed.json into an empty store.

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import type { Customer, Deal, StageKey } from '../shared/types.js';
import { config } from './config.js';
import { maskId } from './domain/identity.js';
import { buildStages, currentStage } from './domain/stages.js';
import { logger } from './logger.js';
import { store } from './store.js';

const SEED_FILE = 'demo-docs/seed.json';

interface SeedEntry {
    customer: Omit<Customer, 'id' | 'idNumberMasked' | 'preferredLanguage'> & { idNumber: string };
    deal: {
        project: string;
        unit: string;
        price: number;
        otpDate: string;
        completed: Partial<Record<StageKey, string | null>>;
    };
}

export async function seedIfEmpty(): Promise<void> {
    if (!existsSync(SEED_FILE) || !(await store.isEmpty())) return;
    const entries = JSON.parse(readFileSync(SEED_FILE, 'utf8')) as SeedEntry[];
    for (const e of entries) {
        const customerId = randomUUID();
        await store.saveCustomer({
            ...e.customer,
            id: customerId,
            idNumberMasked: maskId(e.customer.idNumber),
            preferredLanguage: 'English',
        });
        const stages = buildStages(e.deal.otpDate, e.deal.completed);
        const deal: Deal = {
            id: randomUUID(),
            customerId,
            agentName: config.agentName,
            project: e.deal.project,
            unit: e.deal.unit,
            price: e.deal.price,
            otpDate: e.deal.otpDate,
            bookingFee: Math.round(e.deal.price * 0.05),
            currentStage: currentStage(stages)?.key ?? 'KEYS',
            stages,
            documents: [],
            createdAt: new Date(`${e.deal.otpDate}T10:00:00+08:00`).toISOString(),
        };
        await store.saveDeal(deal);
    }
    logger.info({ deals: entries.length }, 'seeded demo data');
}
