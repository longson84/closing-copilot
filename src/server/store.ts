// Persistence: Firestore when FIRESTORE_DATABASE is set, otherwise in-memory (local dev, evals).

import { Firestore } from '@google-cloud/firestore';
import type { AfterSalesService, Customer, Deal, ImportantDate, Note, Person, ProjectMatch, Reminder } from '../shared/types.js';

/** The only place the full ID number exists. Never returned by the API. */
export interface StoredCustomer extends Customer {
    idNumber: string | null;
    matches: ProjectMatch[];
}

export interface Store {
    listDeals(): Promise<Deal[]>;
    getDeal(id: string): Promise<Deal | null>;
    saveDeal(deal: Deal): Promise<void>;
    listCustomers(): Promise<StoredCustomer[]>;
    getCustomer(id: string): Promise<StoredCustomer | null>;
    saveCustomer(customer: StoredCustomer): Promise<void>;
    listNotes(customerId: string): Promise<Note[]>;
    listAllNotes(): Promise<Note[]>;
    saveNote(note: Note): Promise<void>;
    deleteNote(id: string): Promise<void>;
    listReminders(customerId?: string): Promise<Reminder[]>;
    getReminder(id: string): Promise<Reminder | null>;
    saveReminder(reminder: Reminder): Promise<void>;
    isEmpty(): Promise<boolean>;
    /** Per-customer records kept in their own collections. */
    list<K extends Kind>(kind: K, customerId?: string): Promise<KindMap[K][]>;
    save<K extends Kind>(kind: K, doc: KindMap[K]): Promise<void>;
    remove(kind: Kind, id: string): Promise<void>;
}

interface KindMap {
    people: Person;
    dates: ImportantDate;
    services: AfterSalesService;
}
type Kind = keyof KindMap;

/** Records written before the CRM existed lack these fields. */
export function withCrmDefaults(c: Partial<StoredCustomer> & { id: string; fullName: string }): StoredCustomer {
    const now = new Date().toISOString();
    return {
        idType: null,
        idNumber: null,
        idNumberMasked: null,
        dateOfBirth: null,
        nationality: null,
        sex: null,
        address: null,
        residency: null,
        phone: null,
        email: null,
        preferredLanguage: 'English',
        status: 'LEAD',
        source: null,
        budgetMinSgd: null,
        budgetMaxSgd: null,
        tags: [],
        matches: [],
        company: null,
        jobTitle: null,
        socialProfiles: [],
        consent: { givenAt: null, method: null },
        createdAt: now,
        updatedAt: now,
        ...c,
        profile: { purpose: null, propertiesOwned: null, household: null, ...c.profile },
        preferences: { segments: [], areas: [], bedrooms: [], executiveCondo: null, timeline: null, notes: null, ...c.preferences },
    };
}

class MemoryStore implements Store {
    private deals = new Map<string, Deal>();
    private customers = new Map<string, StoredCustomer>();
    private notes = new Map<string, Note>();
    private reminders = new Map<string, Reminder>();
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
    async listCustomers() {
        return [...this.customers.values()].map((c) => withCrmDefaults(structuredClone(c)));
    }
    async getCustomer(id: string) {
        const c = this.customers.get(id);
        return c ? withCrmDefaults(structuredClone(c)) : null;
    }
    async saveCustomer(customer: StoredCustomer) {
        this.customers.set(customer.id, structuredClone(customer));
    }
    async listNotes(customerId: string) {
        return [...this.notes.values()].filter((n) => n.customerId === customerId).map((n) => structuredClone(n));
    }
    async listAllNotes() {
        return [...this.notes.values()].map((n) => structuredClone(n));
    }
    async saveNote(note: Note) {
        this.notes.set(note.id, structuredClone(note));
    }
    async deleteNote(id: string) {
        this.notes.delete(id);
    }
    async listReminders(customerId?: string) {
        return [...this.reminders.values()].filter((r) => !customerId || r.customerId === customerId).map((r) => structuredClone(r));
    }
    async getReminder(id: string) {
        const r = this.reminders.get(id);
        return r ? structuredClone(r) : null;
    }
    async saveReminder(reminder: Reminder) {
        this.reminders.set(reminder.id, structuredClone(reminder));
    }
    async isEmpty() {
        return this.deals.size === 0;
    }
    private docs: { [K in Kind]: Map<string, KindMap[K]> } = { people: new Map(), dates: new Map(), services: new Map() };
    async list<K extends Kind>(kind: K, customerId?: string) {
        const all = [...(this.docs[kind] as Map<string, KindMap[K]>).values()];
        return all.filter((d) => !customerId || d.customerId === customerId).map((d) => structuredClone(d));
    }
    async save<K extends Kind>(kind: K, doc: KindMap[K]) {
        (this.docs[kind] as Map<string, KindMap[K]>).set(doc.id, structuredClone(doc));
    }
    async remove(kind: Kind, id: string) {
        this.docs[kind].delete(id);
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
    async listCustomers() {
        const snap = await this.db.collection('customers').get();
        return snap.docs.map((d) => withCrmDefaults(d.data() as StoredCustomer));
    }
    async getCustomer(id: string) {
        const d = await this.db.collection('customers').doc(id).get();
        return d.exists ? withCrmDefaults(d.data() as StoredCustomer) : null;
    }
    async saveCustomer(customer: StoredCustomer) {
        await this.db.collection('customers').doc(customer.id).set(customer);
    }
    async listNotes(customerId: string) {
        const snap = await this.db.collection('notes').where('customerId', '==', customerId).get();
        return snap.docs.map((d) => d.data() as Note);
    }
    async listAllNotes() {
        const snap = await this.db.collection('notes').get();
        return snap.docs.map((d) => d.data() as Note);
    }
    async saveNote(note: Note) {
        await this.db.collection('notes').doc(note.id).set(note);
    }
    async deleteNote(id: string) {
        await this.db.collection('notes').doc(id).delete();
    }
    async listReminders(customerId?: string) {
        const col = this.db.collection('reminders');
        const snap = await (customerId ? col.where('customerId', '==', customerId) : col).get();
        return snap.docs.map((d) => d.data() as Reminder);
    }
    async getReminder(id: string) {
        const d = await this.db.collection('reminders').doc(id).get();
        return d.exists ? (d.data() as Reminder) : null;
    }
    async saveReminder(reminder: Reminder) {
        await this.db.collection('reminders').doc(reminder.id).set(reminder);
    }
    async isEmpty() {
        const snap = await this.db.collection('deals').limit(1).get();
        return snap.empty;
    }
    async list<K extends Kind>(kind: K, customerId?: string) {
        const col = this.db.collection(kind);
        const snap = await (customerId ? col.where('customerId', '==', customerId) : col).get();
        return snap.docs.map((d) => d.data() as KindMap[K]);
    }
    async save<K extends Kind>(kind: K, doc: KindMap[K]) {
        await this.db.collection(kind).doc(doc.id).set(doc);
    }
    async remove(kind: Kind, id: string) {
        await this.db.collection(kind).doc(id).delete();
    }
}

export const store: Store = process.env.FIRESTORE_DATABASE
    ? new FirestoreStore(process.env.FIRESTORE_DATABASE)
    : new MemoryStore();

export function toPublicCustomer(c: StoredCustomer): Customer {
    const { idNumber: _full, matches: _matches, ...rest } = c;
    return rest;
}
