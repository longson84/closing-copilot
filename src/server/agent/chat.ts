import { InMemorySessionService, Runner, StreamingMode, getFunctionCalls } from '@google/adk';
import type { ChatEvent } from '../../shared/types.js';
import { logger } from '../logger.js';
import { rootAgent } from './agent.js';

const APP = 'closing_copilot';
const USER = 'agent';

const sessions = new InMemorySessionService();
const runner = new Runner({ appName: APP, agent: rootAgent, sessionService: sessions });

export async function* chat(input: { sessionId: string; message: string; dealId?: string; customerId?: string; signal: AbortSignal }): AsyncGenerator<ChatEvent> {
    const existing = await sessions.getSession({ appName: APP, userId: USER, sessionId: input.sessionId });
    if (!existing) await sessions.createSession({ appName: APP, userId: USER, sessionId: input.sessionId });

    for await (const event of runner.runAsync({
        userId: USER,
        sessionId: input.sessionId,
        newMessage: { role: 'user', parts: [{ text: input.message }] },
        stateDelta: { current_deal_id: input.dealId ?? null, current_customer_id: input.customerId ?? null },
        runConfig: { streamingMode: StreamingMode.SSE },
        abortSignal: input.signal,
    })) {
        if (event.errorMessage) {
            logger.error({ errorCode: event.errorCode, errorMessage: event.errorMessage }, 'copilot model error');
            yield { type: 'error', message: 'The copilot hit a problem. Please try again.' };
            continue;
        }
        for (const call of getFunctionCalls(event)) yield { type: 'tool', name: call.name ?? 'tool' };
        // With SSE streaming, partial events carry the text deltas and the final aggregated
        // event repeats the whole text, so only partials are forwarded.
        if (event.partial) {
            const text = (event.content?.parts ?? [])
                .filter((p) => p.text && !p.thought)
                .map((p) => p.text)
                .join('');
            if (text) yield { type: 'text', text };
        }
    }
    yield { type: 'done' };
}
