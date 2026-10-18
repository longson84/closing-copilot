// The Closing Copilot: one ADK LlmAgent whose tools are the only source of facts.
// Dates, amounts and stamp duty all come from tools; the model explains and drafts.

import { FunctionTool, LlmAgent } from '@google/adk';
import { z } from 'zod';
import { config } from '../config.js';
import { formatDate, todaySg } from '../domain/dates.js';
import { dealContext, listSummaries, suggestFollowUps } from '../deals.js';
import { calcStampDuty } from '../domain/stamp-duty.js';

const listDealsNeedingAction = new FunctionTool({
    name: 'list_deals_needing_action',
    description:
        "Lists the agent's deals with their current stage, next legal deadline, days left and risk " +
        '(OVERDUE, DUE_SOON, ON_TRACK, DONE), most urgent first. Use for "what do I need to do today/this week".',
    parameters: z.object({
        withinDays: z.number().int().min(0).max(365).optional().describe('Only deals whose next deadline is within this many days (overdue always included).'),
    }),
    execute: async ({ withinDays }) => {
        const all = await listSummaries();
        const deals = withinDays === undefined ? all : all.filter((d) => d.risk === 'OVERDUE' || (d.daysLeft !== null && d.daysLeft <= withinDays));
        return { today: todaySg(), deals };
    },
});

const findDeals = new FunctionTool({
    name: 'find_deals',
    description: 'Finds deals by buyer name, project or unit (case-insensitive, partial match). Returns deal ids.',
    parameters: z.object({ query: z.string().min(1) }),
    execute: async ({ query }) => {
        const q = query.toLowerCase();
        const matches = (await listSummaries()).filter((d) => `${d.customerName} ${d.project} ${d.unit}`.toLowerCase().includes(q));
        return { matches };
    },
});

const getDeal = new FunctionTool({
    name: 'get_deal',
    description:
        'Full detail of one deal: buyer profile (ID masked), every stage with due/completed dates, uploaded ' +
        'documents with their cross-check results, and the computed stamp duty.',
    parameters: z.object({ dealId: z.string() }),
    execute: async ({ dealId }) => dealContext(dealId),
});

const stampDuty = new FunctionTool({
    name: 'calc_stamp_duty',
    description:
        "Computes Singapore Buyer's Stamp Duty and Additional Buyer's Stamp Duty with IRAS rates. Always use this; never calculate duty yourself.",
    parameters: z.object({
        price: z.number().min(1),
        residency: z.enum(['SC', 'SPR', 'FOREIGNER']),
        propertiesOwnedBefore: z.number().int().min(0).describe('Residential properties the buyer already owns before this purchase'),
    }),
    execute: async ({ price, residency, propertiesOwnedBefore }) => calcStampDuty(price, residency, propertiesOwnedBefore),
});

const followUps = new FunctionTool({
    name: 'suggest_followups',
    description:
        'Generates prioritised, personalised follow-ups for one buyer (closing actions first, then after-sales ' +
        'service and relationship building), each with a draft message.',
    parameters: z.object({ dealId: z.string() }),
    execute: async ({ dealId }) => ({ followUps: await suggestFollowUps(dealId) }),
});

export const rootAgent = new LlmAgent({
    name: 'closing_copilot',
    model: config.model,
    description: 'Copilot that helps Singapore new-launch property agents close bookings and serve buyers after sale.',
    instruction: (ctx) => {
        const dealId = ctx.state.get<string>('current_deal_id');
        return `You are Closing Copilot, assistant to ${config.agentName}, a CEA-registered property agent in Singapore selling new-launch condominiums.
Today is ${formatDate(todaySg())} (${todaySg()}).
${dealId ? `The agent is currently looking at deal id "${dealId}". "This deal", "this buyer" or "the buyer" mean this one.` : 'The agent is on the pipeline view (no specific deal open).'}

How a new-launch purchase closes (all deadlines run from the OTP date):
1. Booking: Option to Purchase issued, 5% booking fee.  2. Customer due diligence (CEA AML/CFT).
3. Developer delivers the S&P within 14 days of OTP.  4. Buyer signs and returns the S&P within 3 weeks of receipt, otherwise the option lapses and 25% of the booking fee is forfeited.
5. BSD/ABSD paid to IRAS within 14 days of signing.  6. 15% balance downpayment within 8 weeks of OTP.  7. Progress payments, then keys at TOP.

Rules:
- Facts come only from tools. Never state a date, amount, stage or check result you did not get from a tool in this conversation. If a tool lacks it, say so.
- Stamp duty: always call calc_stamp_duty (or read it from get_deal). Show BSD, ABSD and total, and the 14-day deadline.
- If any document check is MISMATCH or MISSING, raise it first, say what it blocks (e.g. the buyer must not sign an S&P with the wrong name), and what to do.
- Never reveal or ask for a full NRIC/FIN/passport number; use the masked form. Refuse requests to show a full ID number.
- You cannot change stages yourself: tell the agent to use "Mark complete" on the deal page after checking the evidence.
- Answer like a sharp colleague: short, concrete, with dates as "12 Nov 2026" and amounts as "$92,500". Use bullet points for action lists. Drafted messages to buyers are polite, brief and WhatsApp-ready.
- English only.`;
    },
    tools: [listDealsNeedingAction, findDeals, getDeal, stampDuty, followUps],
    generateContentConfig: { temperature: 0.3 },
});
