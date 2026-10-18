import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';
import type { StageKey } from '../shared/types.js';
import { chat } from './agent/chat.js';
import { todaySg } from './domain/dates.js';
import { BadRequest, NotFound, addDocument, completeStage, createBooking, getDetail, listSummaries, suggestFollowUps } from './deals.js';
import { logger } from './logger.js';
import { listProjects } from './projects.js';
import {
    addMatch,
    addNote,
    addReminder,
    analyzeWhatsApp,
    commitWhatsApp,
    createCustomer,
    customerDetail,
    customerSummaries,
    deleteNote,
    reminderFeed,
    setMatchStatus,
    suggestMatches,
    suggestPlan,
    updateCustomer,
    updateReminder,
} from './crm.js';

const MAX_UPLOAD = 15 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

async function readFile(form: FormData) {
    const file = form.get('file');
    if (!(file instanceof File)) throw new BadRequest('Attach a file in the "file" field.');
    if (!ALLOWED.includes(file.type)) throw new BadRequest('Upload a PNG, JPEG, WebP or PDF.');
    if (file.size > MAX_UPLOAD) throw new BadRequest('File is larger than 15 MB.');
    return { mimeType: file.type, data: Buffer.from(await file.arrayBuffer()), fileName: file.name };
}

const BookingFields = z.object({
    projectId: z.string().optional(),
    customerId: z.string().optional(),
    project: z.string().min(1),
    unit: z.string().min(1),
    price: z.coerce.number().positive(),
    otpDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    residency: z.enum(['SC', 'SPR', 'FOREIGNER']),
    purpose: z.enum(['OWN_STAY', 'INVESTMENT']),
    propertiesOwned: z.coerce.number().int().min(0),
    household: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
});

export const app = new Hono();

app.onError((err, c) => {
    if (err instanceof NotFound) return c.json({ error: err.message }, 404);
    if (err instanceof BadRequest) return c.json({ error: err.message }, 400);
    if (err instanceof z.ZodError) return c.json({ error: 'Invalid input', issues: err.issues }, 400);
    logger.error({ err: String(err), path: c.req.path }, 'request failed');
    return c.json({ error: 'Something went wrong' }, 500);
});

// Enforced while streaming, before the body is buffered or parsed: uploads get room for one file, everything else 64 KB.
const uploadLimit = bodyLimit({ maxSize: MAX_UPLOAD + 1024 * 1024, onError: (c) => c.json({ error: 'File is larger than 15 MB.' }, 413) });
const chatsLimit = bodyLimit({ maxSize: 5 * MAX_UPLOAD + 1024 * 1024, onError: (c) => c.json({ error: 'Screenshots are too large.' }, 413) });
const commitLimit = bodyLimit({ maxSize: 256 * 1024, onError: (c) => c.json({ error: 'Request too large' }, 413) });
const jsonLimit = bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'Request too large' }, 413) });
app.use('/api/*', (c, next) => {
    const p = c.req.path;
    if (/^\/api\/(bookings|deals\/[^/]+\/documents)$/.test(p)) return uploadLimit(c, next);
    if (p === '/api/whatsapp/analyze') return chatsLimit(c, next);
    if (p === '/api/whatsapp/commit') return commitLimit(c, next);
    return jsonLimit(c, next);
});

app.get('/api/health', (c) => c.json({ ok: true, today: todaySg() }));

app.get('/api/projects', (c) => c.json(listProjects()));

app.get('/api/deals', async (c) => c.json(await listSummaries()));

app.get('/api/deals/:id', async (c) => c.json(await getDetail(c.req.param('id'))));

app.post('/api/bookings', async (c) => {
    const form = await c.req.formData();
    const file = await readFile(form);
    const f = BookingFields.parse(Object.fromEntries([...form.entries()].filter(([k]) => k !== 'file')));
    return c.json(
        await createBooking({ ...f, file, projectId: f.projectId || null, customerId: f.customerId || null, household: f.household || null, phone: f.phone || null, email: f.email || null }),
    );
});

app.post('/api/deals/:id/documents', async (c) => {
    const file = await readFile(await c.req.formData());
    return c.json(await addDocument(c.req.param('id'), file));
});

app.post('/api/deals/:id/stages/:key/complete', async (c) => {
    const { date } = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(await c.req.json());
    return c.json(await completeStage(c.req.param('id'), c.req.param('key') as StageKey, date));
});

app.get('/api/deals/:id/followups', async (c) => c.json(await suggestFollowUps(c.req.param('id'))));

app.post('/api/chat', async (c) => {
    const body = z
        .object({ sessionId: z.string().min(8).max(100), message: z.string().min(1).max(4000), dealId: z.string().optional() })
        .parse(await c.req.json());
    return streamSSE(c, async (stream) => {
        const ac = new AbortController();
        stream.onAbort(() => ac.abort());
        try {
            for await (const ev of chat({ ...body, signal: ac.signal })) await stream.writeSSE({ data: JSON.stringify(ev) });
        } catch (err) {
            logger.error({ err: String(err) }, 'chat failed');
            await stream.writeSSE({ data: JSON.stringify({ type: 'error', message: 'The copilot hit a problem. Please try again.' }) });
        }
    });
});

// ---------- CRM ----------

const Date10 = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Money = z.number().min(0).max(1e9).nullable();
const CustomerFields = z.object({
    fullName: z.string().trim().min(1).max(120),
    phone: z.string().max(40).nullable().optional(),
    email: z.string().max(120).nullable().optional(),
    source: z.string().max(120).nullable().optional(),
    status: z.enum(['LEAD', 'PROSPECT', 'BOOKED', 'AFTER_SALES', 'LOST']).optional(),
    residency: z.enum(['SC', 'SPR', 'FOREIGNER']).nullable().optional(),
    purpose: z.enum(['OWN_STAY', 'INVESTMENT']).nullable().optional(),
    propertiesOwned: z.number().int().min(0).max(50).nullable().optional(),
    household: z.string().max(300).nullable().optional(),
    budgetMinSgd: Money.optional(),
    budgetMaxSgd: Money.optional(),
    preferences: z
        .object({
            segments: z.array(z.enum(['CCR', 'RCR', 'OCR'])).max(3),
            areas: z.array(z.string().max(60)).max(20),
            bedrooms: z.array(z.string().max(20)).max(10),
            executiveCondo: z.boolean().nullable(),
            timeline: z.string().max(200).nullable(),
            notes: z.string().max(2000).nullable(),
        })
        .partial()
        .optional(),
    tags: z.array(z.string().max(40)).max(20).optional(),
});
const ReminderFields = z.object({ title: z.string().trim().min(1).max(200), detail: z.string().max(2000).nullable(), dueDate: Date10 });

app.get('/api/customers', async (c) => c.json(await customerSummaries(c.req.query('q'), c.req.query('status'))));
app.post('/api/customers', async (c) => c.json(await createCustomer(CustomerFields.parse(await c.req.json()))));
app.get('/api/customers/:id', async (c) => c.json(await customerDetail(c.req.param('id'))));
app.patch('/api/customers/:id', async (c) => c.json(await updateCustomer(c.req.param('id'), CustomerFields.partial().parse(await c.req.json()))));

app.post('/api/customers/:id/notes', async (c) => {
    const body = z
        .object({ kind: z.enum(['DISCUSSION', 'THOUGHT', 'PLAN']), text: z.string().trim().min(1).max(10_000), occurredAt: Date10.nullable().optional(), remindOn: Date10.nullable().optional() })
        .parse(await c.req.json());
    return c.json(await addNote(c.req.param('id'), body));
});
app.delete('/api/customers/:id/notes/:noteId', async (c) => c.json(await deleteNote(c.req.param('id'), c.req.param('noteId'))));

app.post('/api/customers/:id/plan', async (c) => c.json(await suggestPlan(c.req.param('id'))));
app.post('/api/customers/:id/reminders', async (c) =>
    c.json(await addReminder(c.req.param('id'), ReminderFields.extend({ origin: z.enum(['AI', 'AGENT']) }).parse(await c.req.json()))),
);
app.patch('/api/reminders/:id', async (c) => {
    const body = z
        .object({ status: z.enum(['OPEN', 'DONE', 'DISMISSED']).optional(), dueDate: Date10.optional(), title: z.string().trim().min(1).max(200).optional(), detail: z.string().max(2000).nullable().optional() })
        .parse(await c.req.json());
    return c.json(await updateReminder(c.req.param('id'), body));
});
app.get('/api/reminders', async (c) => {
    const status = z.enum(['OPEN', 'DONE', 'DISMISSED']).catch('OPEN').parse(c.req.query('status') ?? 'OPEN');
    const days = z.coerce.number().int().min(1).max(3650).catch(30).parse(c.req.query('days') ?? 30);
    return c.json(await reminderFeed(status, days));
});

app.post('/api/customers/:id/matches/suggest', async (c) => c.json(await suggestMatches(c.req.param('id'))));
app.post('/api/customers/:id/matches', async (c) => {
    const body = z.object({ projectId: z.string().min(1), reason: z.string().max(500).optional() }).parse(await c.req.json());
    return c.json(await addMatch(c.req.param('id'), body.projectId, body.reason));
});
app.patch('/api/customers/:id/matches/:projectId', async (c) => {
    const { status } = z.object({ status: z.enum(['SUGGESTED', 'SHORTLISTED', 'REJECTED']) }).parse(await c.req.json());
    return c.json(await setMatchStatus(c.req.param('id'), c.req.param('projectId'), status));
});
app.delete('/api/customers/:id/matches/:projectId', async (c) => c.json(await setMatchStatus(c.req.param('id'), c.req.param('projectId'), null)));

app.post('/api/whatsapp/analyze', async (c) => {
    const form = await c.req.formData();
    const files = form.getAll('files').filter((f): f is File => f instanceof File);
    for (const f of files) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type)) throw new BadRequest('Screenshots must be PNG, JPEG or WebP.');
        if (f.size > MAX_UPLOAD) throw new BadRequest('Each screenshot must be under 15 MB.');
    }
    return c.json(await analyzeWhatsApp(await Promise.all(files.map(async (f) => ({ mimeType: f.type, data: Buffer.from(await f.arrayBuffer()) })))));
});

const Msg = z.object({ from: z.enum(['AGENT', 'CUSTOMER']), time: z.string().max(40).nullable(), text: z.string().max(4000) });
app.post('/api/whatsapp/commit', async (c) => {
    const body = z
        .object({
            analysis: z.object({
                contactName: z.string().max(120).nullable(),
                contactPhone: z.string().max(40).nullable(),
                occurredAt: Date10.nullable(),
                transcript: z.array(Msg).max(300),
                summary: z.string().max(4000),
                keyPoints: z.array(z.string().max(500)).max(20),
                facts: z.object({
                    residency: z.enum(['SC', 'SPR', 'FOREIGNER']).nullable(),
                    purpose: z.enum(['OWN_STAY', 'INVESTMENT']).nullable(),
                    propertiesOwned: z.number().int().min(0).max(50).nullable(),
                    household: z.string().max(300).nullable(),
                    budgetMinSgd: Money,
                    budgetMaxSgd: Money,
                    areas: z.array(z.string().max(60)).max(20),
                    bedrooms: z.array(z.string().max(20)).max(10),
                    segments: z.array(z.enum(['CCR', 'RCR', 'OCR'])).max(3),
                    executiveCondo: z.boolean().nullable(),
                    timeline: z.string().max(200).nullable(),
                }),
                suggestedReminders: z.array(ReminderFields).max(10),
                candidates: z
                    .array(z.object({ customerId: z.string(), fullName: z.string(), phone: z.string().nullable(), confidence: z.number(), why: z.string() }))
                    .max(10),
            }),
            customerId: z.string().nullable(),
            newCustomerName: z.string().max(120).nullable(),
            applyFacts: z.boolean(),
            reminders: z.array(ReminderFields).max(10),
        })
        .parse(await c.req.json());
    return c.json(await commitWhatsApp(body));
});

// Built web app (vite build -> dist/web), with SPA fallback.
app.use('/*', serveStatic({ root: './dist/web' }));
app.get('*', serveStatic({ path: './dist/web/index.html' }));
