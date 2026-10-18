// Persistence: Firestore when FIRESTORE_DATABASE is set, otherwise in-memory (local dev, evals).

import { Firestore } from '@google-cloud/firestore';
import type { Customer, Deal } from '../shared/types.js';

/** The only place the full ID number exists. Never returned by the API. */
export interface StoredCustomer extends Customer {
    idNumber: string;
}

export interface Store {
    listDeals(): Promise<Deal[]>;
    getDeal(id: string): Promise<Deal | null>;
    saveDeal(deal: Deal): Promise<void>;
    getCustomer(id: string): Promise<StoredCustomer | null>;
    saveCustomer(customer: StoredCustomer): Promise<void>;
    isEmpty(): Promise<boolean>;
}

class MemoryStore implements Store {
    private deals = new Map<string, Deal>();
    private customers = new Map<string, StoredCustomer>();
    async listDeals() {
        return [...this.deals.values()].map((d) => structuredClone(d));
    }
    async getDeal(id: string) {
        const d = this.deals.get(id);
        return d ? structuredClone(d) : null;
    }
    async saveDeal(deal: Deal) {
        this.deals.set(deal.id, structuredClone(deal));
    }
    async getCustomer(id: string) {
        const c = this.customers.get(id);
        return c ? structuredClone(c) : null;
    }
    async saveCustomer(customer: StoredCustomer) {
        this.customers.set(customer.id, structuredClone(customer));
    }
    async isEmpty() {
        return this.deals.size === 0;
    }
}

class FirestoreStore implements Store {
    private db: Firestore;
    constructor(databaseId: string) {
        this.db = new Firestore({ databaseId, ignoreUndefinedProperties: true });
    }
    async listDeals() {
        const snap = await this.db.collection('deals').get();
        return snap.docs.map((d) => d.data() as Deal);
    }
    async getDeal(id: string) {
        const d = await this.db.collection('deals').doc(id).get();
        return d.exists ? (d.data() as Deal) : null;
    }
    async saveDeal(deal: Deal) {
        await this.db.collection('deals').doc(deal.id).set(deal);
    }
    async getCustomer(id: string) {
        const d = await this.db.collection('customers').doc(id).get();
        return d.exists ? (d.data() as StoredCustomer) : null;
    }
    async saveCustomer(customer: StoredCustomer) {
        await this.db.collection('customers').doc(customer.id).set(customer);
    }
    async isEmpty() {
        const snap = await this.db.collection('deals').limit(1).get();
        return snap.empty;
    }
}

export const store: Store = process.env.FIRESTORE_DATABASE
    ? new FirestoreStore(process.env.FIRESTORE_DATABASE)
    : new MemoryStore();

export function toPublicCustomer(c: StoredCustomer): Customer {
    const { idNumber: _full, ...rest } = c;
    return rest;
}
