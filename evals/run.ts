// Agent eval: runs the real ADK agent over seeded demo data, then scores each case on
// (1) tool trajectory — did it call the tools that hold the facts — and
// (2) an LLM judge against a per-case rubric. Usage: pnpm eval
import { InMemorySessionService, Runner, getFunctionCalls } from '@google/adk';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { rootAgent } from '../src/server/agent/agent.js';
import { generateJson } from '../src/server/ai/gemini.js';
import { listSummaries } from '../src/server/deals.js';
import { seedIfEmpty } from '../src/server/seed.js';
import { store } from '../src/server/store.js';

interface Case {
    id: string;
    prompt: string;
    /** Name of a seeded buyer whose deal is "open" in the UI, if any. */
    dealOf?: string;
    /** Inject a mismatched S&P into that deal before running. */
    withMismatch?: boolean;
    expectTools: string[];
    rubric: string;
}

const cases = JSON.parse(readFileSync(new URL('./cases.json', import.meta.url), 'utf8')) as Case[];
const Verdict = z.object({ pass: z.boolean(), score: z.number().min(0).max(1), reason: z.string() });

await seedIfEmpty();
const sessions = new InMemorySessionService();
const runner = new Runner({ appName: 'eval', agent: rootAgent, sessionService: sessions });

let passed = 0;
for (const c of cases) {
    let dealId: string | undefined;
    if (c.dealOf) {
        const d = (await listSummaries()).find((s) => s.customerName.toUpperCase().includes(c.dealOf!.toUpperCase()));
        if (!d) throw new Error(`No seeded deal for ${c.dealOf}`);
        dealId = d.id;
        if (c.withMismatch) {
            const deal = (await store.getDeal(d.id))!;
            deal.documents.push({
                id: 'eval-spa',
                type: 'SPA',
                fileName: 'spa.pdf',
                uploadedAt: new Date().toISOString(),
                extracted: {},
                checks: [{ field: 'Purchaser name', status: 'MISMATCH', message: `Document says "${d.customerName.slice(0, -1)}" but the buyer's NRIC says "${d.customerName}". Ask the developer's solicitor to correct it before the buyer signs.` }],
                summary: 'Sale & Purchase Agreement for the unit.',
                suggestedStage: null,
            });
            await store.saveDeal(deal);
        }
    }
    const session = await sessions.createSession({ appName: 'eval', userId: 'eval', state: { current_deal_id: dealId ?? null } });
    const tools: string[] = [];
    let answer = '';
    for await (const ev of runner.runAsync({ userId: 'eval', sessionId: session.id, newMessage: { role: 'user', parts: [{ text: c.prompt }] } })) {
        tools.push(...getFunctionCalls(ev).map((f) => f.name ?? ''));
        if (!ev.partial && ev.content?.role === 'model') answer += (ev.content.parts ?? []).filter((p) => p.text && !p.thought).map((p) => p.text).join('');
    }
    const trajectoryOk = c.expectTools.every((t) => tools.includes(t));
    const verdict = await generateJson({
        schema: Verdict,
        system: 'You grade an AI assistant for Singapore property agents. Be strict and factual.',
        prompt: `User asked: ${c.prompt}\n\nAssistant answered:\n"""\n${answer}\n"""\n\nTools it called: ${tools.join(', ') || 'none'}\n\nRubric (all must hold to pass):\n${c.rubric}`,
    });
    const ok = trajectoryOk && verdict.pass;
    if (ok) passed++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.id}  tools=[${tools.join(',')}]${trajectoryOk ? '' : ` expected ${c.expectTools}`}  judge=${verdict.score.toFixed(2)}  ${verdict.reason}`);
}
console.log(`\n${passed}/${cases.length} passed`);
