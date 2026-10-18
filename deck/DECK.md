# Closing Copilot — pitch deck content (12 slides, 16:9)

Rules from the organiser: "a compelling vision for your AI solution, highlighting its positive impact", clearly identify the problem statement, English. Judging: Technical Merit & Gen AI 40% · Problem Alignment & Impact 25% · Innovation 25% · UX 10%.
Only real, measured numbers. Anything estimated is labelled as such.

---

## 1. Title
**Closing Copilot**
The AI copilot that helps property agents close on time — and keep every client for life.
Problem statement: **Future of Work & Enterprise Productivity**
AI Builder Cup 2026 · Team: {{TEAM}}
Built on Google Cloud: Gemini · Agent Development Kit · Document AI · Cloud Run

## 2. The problem
A Singapore new-launch purchase is a chain of legal deadlines that all run from one date:
- S&P delivered within **14 days** of the Option to Purchase
- Buyer must sign within **3 weeks** — or the option lapses and **25% of the booking fee is forfeited** (e.g. **$17,750** on a $1.42M unit)
- Buyer's & Additional Buyer's Stamp Duty within **14 days** of signing
- 15% downpayment within **8 weeks**
Every document must match the verified buyer exactly. Meanwhile, client conversations live in WhatsApp, and after handover the relationship is forgotten.
> Knowledge is scattered, deadlines are manual, and the most valuable asset — the client relationship — isn't captured anywhere.

## 3. Who we help
CEA-registered property agents selling new launches (individuals and agencies).
Their day: showflat viewings, WhatsApp threads, document chasing, and after-sales favours (tenants, furnishing, tax questions).
What they need: one place that **knows every deal, every client and every date** — and does the paperwork reading for them.

## 4. The solution — four jobs, one copilot
1. **Close** — reads IDs, OTPs, S&Ps and receipts; cross-checks them; tracks every legal deadline.
2. **Capture** — turns WhatsApp and profile screenshots into a CRM record with dated follow-ups.
3. **Match** — recommends projects from a catalog of 24 real 2025–26 launches.
4. **Care** — after-sales: family & important dates (with consent), tenancy, furnishing, tax reminders.
Plus a **Copilot agent** you can ask anything: "What do I need to do today?"

## 5. Close: documents that check themselves  *(screenshot: deal page with the red mismatch alert)*
- NRIC photo → Document AI OCR → Gemini structured extraction → customer + due-diligence record (13 s in our test, tilted phone photo)
- S&P uploaded → **caught "TAN WEI MIN" vs "TAN WEI MING" and two swapped NRIC digits** before signing
- Gemini reads; **deterministic code compares** — every flag is explainable
- NRIC masked everywhere outside the customer record; ID image not stored (PDPA data minimisation)

## 6. Capture: WhatsApp → CRM in one review  *(screenshot: import review screen)*
- 2 screenshots → **19 messages**, summary, key points, budget, family, EC eligibility hints
- Dated follow-ups for every promise ("Send floor plans by Tue 20 Oct", "Viewing Sat 24 Oct")
- Finds the existing customer (phone/name match) or proposes a new one
- **Agent confirms before anything is saved**

## 7. Match & care  *(screenshots: matched projects; Family & dates circle; After-sales tab)*
- AI matches a buyer's budget, area, bedrooms and EC eligibility to the project catalog, with reasons
- Builds the client's circle — spouse, children, advisors — **only with recorded consent**; withdrawal deletes it
- After-sales services: find a tenant, furnishing, tenancy follow-up, rental-income & property-tax filing
- Company research with **Gemini + Google Search grounding**, saved with sources (company-level only — no person profiling)

## 8. One reminders list for everything  *(screenshot: Reminders)*
Agent's own reminders · AI-suggested follow-ups · legal deal deadlines · birthdays & anniversaries · lease renewals · tax deadlines.
"Send wishes" → Copilot drafts a warm, non-salesy message.

## 9. The Copilot agent (ADK)
- **Agent Development Kit (TypeScript)** — one LlmAgent, 10 tools: deals, deadlines, stamp duty, follow-ups, project search, customers, reminders, after-sales
- Facts only from tools; **stamp duty computed in code** (IRAS 2023 rates), never by the model
- Knows what you're looking at (deal or customer) and streams answers
- Refuses to reveal full NRIC numbers

## 10. Architecture  *(diagram)*
Phone/desktop PWA (React) → **Cloud Run** (Hono API) →
- **ADK agent** ↔ **Gemini (Vertex AI)** — reasoning, structured extraction, follow-up plans, project matching, eval judge
- **Document AI** OCR → Gemini → rule-based cross-checks
- **Google Search grounding** — company research with citations
- **Firestore** — deals, customers, notes, reminders, people, dates, services
Installable PWA; offline shell caches no customer data.

## 11. Responsible by design · and measured
- PDPA: consent before storing anyone's circle; NRIC masking; images not stored; data minimisation
- Human in the loop: every AI import is reviewed; stage changes need the agent
- Grounded: dates, amounts and checks come from documents, code and tools
- **Evaluation:** 7 end-to-end agent cases (priorities, stamp duty, mismatch-first, NRIC refusal, after-sales, drafting, project catalog) scored on tool use + Gemini judge — **7/7 pass**

## 12. Impact & what's next
**Impact (for an agent):** fewer missed legal deadlines, document errors caught before signing, follow-ups never lost in chat, and relationships that turn into referrals and repeat purchases.
**Next:** WhatsApp Business API instead of screenshots · Google Calendar sync · team/agency dashboards · resale & HDB flows · voice notes after viewings (Gemini Live) · Agent Engine deployment.
Live demo: https://closing-copilot-898383619830.asia-southeast1.run.app · Video: https://youtu.be/B1xBDnm9Te8
