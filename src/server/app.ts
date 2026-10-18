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
const jsonLimit = bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'Request too large' }, 413) });
app.use('/api/*', (c, next) => (/^\/api\/(bookings|deals\/[^/]+\/documents)$/.test(c.req.path) ? uploadLimit(c, next) : jsonLimit(c, next)));

app.get('/api/health', (c) => c.json({ ok: true, today: todaySg() }));

app.get('/api/deals', async (c) => c.json(await listSummaries()));

app.get('/api/deals/:id', async (c) => c.json(await getDetail(c.req.param('id'))));

app.post('/api/bookings', async (c) => {
    const form = await c.req.formData();
    const file = await readFile(form);
    const f = BookingFields.parse(Object.fromEntries([...form.entries()].filter(([k]) => k !== 'file')));
    return c.json(
        await createBooking({ ...f, file, household: f.household || null, phone: f.phone || null, email: f.email || null }),
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

// Built web app (vite build -> dist/web), with SPA fallback.
app.use('/*', serveStatic({ root: './dist/web' }));
app.get('*', serveStatic({ path: './dist/web/index.html' }));
