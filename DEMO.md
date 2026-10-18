# Demo runbook

Live app: https://closing-copilot-898383619830.asia-southeast1.run.app · demo date pinned to **Sun 18 Oct 2026** (`DEMO_TODAY`).
All people, ID numbers, chats and documents are fictional.

## Reset before every rehearsal / recording

```bash
FIRESTORE_DATABASE='(default)' GOOGLE_CLOUD_QUOTA_PROJECT=era-closing-copilot \
  pnpm exec tsx --env-file=.env scripts/reset-demo.ts --confirm
```

Wipes the live database and rebuilds it (~2 min; Priya, Mr Wong and Goh are imported through the real AI pipeline, so wording varies slightly between resets). If it fails with `invalid_rapt`, run `gcloud auth application-default login` first.

## What is already there

| Where | What to point at |
|---|---|
| Pipeline | **Lee Jun Hao** overdue (S&P not signed, deadline 16 Oct) · **Priya** stamp duty due 23 Oct · **Chen Xiaoling** S&P with a price typo (1 issue) · **Goh** completed |
| Customers | 11: booked buyers, prospects **Daniel Koh** (Thomson Reserve, reminder due today), **Wong Chee Keong** (PR investor), leads **Nurul Huda** (EC), **Arjun** (referred by Priya), after-sales **Goh** and **Ng Kok Wei** |
| Goh Boon Kiat | Family & dates: wife Michelle (birthday 12 Nov), Ethan, Chloe, anniversary, home anniversary · After-sales: rent out at $6,800, furnishing ~$15k, rental-income tax YA2028 · ProNet profile link · company: Meridian Microsystems |
| Ng Kok Wei | Active tenancy (lease ends 31 Dec → renewal reminder), tax YA2027, **wife Joanne's birthday 24 Oct** (use for "Send wishes") |
| Muhammad Hafiz | No consent recorded → shows the PDPA consent notice |
| Reminders | AI, agent, deal deadlines and dates (birthdays, anniversaries, lease end) in one list |
| Projects | 24 real 2025–2026 launches + fictional Aurelia Bay / Kingsmere Park |

## Performed live (not seeded)

1. **New booking → Tan Wei Ming**: project *Aurelia Bay Residences*, unit `#12-05`, price `1850000`, OTP `2026-10-05`, SC, investment, 1 property owned. Upload `demo-docs/01b-nric-tan-wei-ming-photo.jpg`.
2. On his deal, upload `demo-docs/03-spa-aurelia-bay-12-05.pdf` → name + NRIC mismatch. Then `03b-…-corrected.pdf` → all green.
3. **Import screenshots → Kelvin Tay** (new lead): `demo-docs/whatsapp/chat-new-lead-kelvin-1.png` + `-2.png` → new customer, facts, viewing Sat 24 Oct; then **Suggest with AI** on Matched projects (expect Coastal Cabana EC).
4. Copilot: "What do I need to do today?" · on Goh: "Draft a birthday message for Michelle" · on Daniel Koh: "Which projects fit them best?"
