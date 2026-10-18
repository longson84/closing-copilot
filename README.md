# Closing Copilot

An AI copilot that helps Singapore new-launch property agents close bookings on time and keep serving buyers after the sale.

Built for the **AI Builder Cup 2026** (Google Cloud JAPAC) — *Future of Work & Enterprise Productivity*.

## The problem

After a buyer books a new-launch condo, the agent has to drive a chain of legal deadlines that all run from the Option to Purchase date: S&P delivered within 14 days, signed within 3 weeks or the option lapses (25% of the booking fee forfeited), stamp duty within 14 days of signing, 15% downpayment within 8 weeks. Each step brings a document that must match the buyer exactly. Agents track this across spreadsheets and chat threads — and a one-letter typo in a buyer's name on the S&P can derail a sale.

## What it does

1. **Register a booking from an ID photo** — Document AI OCR + Gemini extract the buyer's NRIC details into a customer record. The NRIC is masked everywhere outside that record and the image is not stored (PDPA data minimisation); CEA customer due diligence is recorded.
2. **Track every deal through the Singapore new-launch stages**, with deadlines computed from the OTP date and a risk view (overdue / due soon / on track).
3. **Read and cross-check each stage document** (OTP, S&P, receipts). Gemini extracts; deterministic code compares against the verified buyer and the deal — wrong name, transposed NRIC digit, wrong 5% booking fee, late S&P delivery.
4. **Copilot chat (ADK agent)** — "What do I need to do today?", "Is this deal on track?", "How much stamp duty?", "Draft a reminder". Every fact comes from a tool; stamp duty (BSD/ABSD, IRAS 2023 rates) is computed in code.
5. **After-sales suggestions** personalised to the buyer: progress payments, defects-liability inspection, loan lock-in review, tenant search for investors, referral asks — each with a draft message.

## Architecture

```
React (Vite) ──► Hono API on Cloud Run ──► ADK LlmAgent (TypeScript) ──► Gemini on Vertex AI
                        │                        └─ tools: list_deals_needing_action, find_deals,
                        │                                  get_deal, calc_stamp_duty, suggest_followups
                        ├─► Document AI OCR ─► Gemini structured extraction ─► rule-based cross-checks
                        └─► Firestore (deals, customers)
```

| Google Cloud | Used for |
|---|---|
| Gemini (`gemini-3.8-flash`) on Vertex AI | Extraction with JSON schemas, agent reasoning, follow-up generation, eval judge |
| Agent Development Kit (TypeScript) | Copilot agent, tools, sessions, streaming |
| Document AI (OCR processor) | Reading phone photos and PDFs |
| Firestore | Application data |
| Cloud Run + Cloud Build | Deployment |

## Guardrails

- The model never states a date, amount or check result that a tool did not return.
- Full ID numbers never leave the server: API responses, documents and the agent only see `S****416E`.
- Stage changes need the human agent to confirm on the deal page.

## Evaluation

`pnpm eval` runs the real agent over seeded data and scores each case on tool trajectory plus a Gemini judge with a per-case rubric (today's priorities, stamp duty, mismatch-first, refusing full NRIC, after-sales, drafting). Current result: **6/6 pass**.

## Run locally

```bash
pnpm install
cp .env.example .env      # fill in project, model, Document AI processor
gcloud auth application-default login
pnpm build && pnpm start  # http://localhost:8080
pnpm dev:web:mock         # UI only, with in-browser demo data
```

## Demo data

Everything in `demo-docs/` is fictional: people, ID numbers (format-valid only), developer, project and documents. See `demo-docs/README.md`.
