// One-off: give customers created before the CRM a status from their deals and a source.
import { store } from '../src/server/store.js';

const deals = await store.listDeals();
for (const c of await store.listCustomers()) {
    const own = deals.filter((d) => d.customerId === c.id);
    if (own.length === 0 || c.status !== 'LEAD') continue;
    c.status = own.every((d) => d.stages.every((s) => s.completedAt)) ? 'AFTER_SALES' : 'BOOKED';
    c.source ??= 'Showflat walk-in';
    c.createdAt = own.map((d) => d.createdAt).sort()[0];
    await store.saveCustomer(c);
    console.log(c.fullName, '->', c.status);
}
