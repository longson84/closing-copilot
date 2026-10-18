# Demo chat screenshots (FAKE)

All people, numbers and conversations are fictional. These images copy only the general look of a mobile chat app: no logos and no trademarked icons. Each one has a small "DEMO" mark in the status bar.

- **Phone owner:** Rachel Lim, Harbour Realty. Her messages are the green ones on the right.
- **Size:** 1170x2532 PNG.
- **"Today":** Sun 18 Oct 2026.
- **Regenerate with:** `uv run --with pillow python demo-docs/_gen/whatsapp.py`

## 1. `chat-new-lead-kelvin-1.png` + `chat-new-lead-kelvin-2.png`: new lead Kelvin Tay

This chat is split across two screenshots for the multi-upload demo. Image 1 shows "Yesterday" (Sat 17 Oct). Image 2 shows the last message from yesterday, then "Today".

- **Contact:** Kelvin Tay, +65 9123 4471. New contact.
- **Source:** referred by Priya Nair, an existing client.
- **Residency:** SC. He and his wife are both Singapore Citizens.
- **Purpose:** OWN_STAY. This is their first private property.
- **propertiesOwned:** 1. They currently live in a 5-room HDB flat in Tampines. The 5-year MOP was completed in 2025.
- **Household:** married with 2 kids, aged 6 and 3.
- **Bedrooms:** 4.
- **Budget:** S$1.6M to S$1.8M.
- **Areas:** East: Tampines and Pasir Ris.
- **EC:** yes. Their combined income is within the EC ceiling, and they are open to an EC.
- **Timeline:** they want to move within 2 to 3 years.
- **Projects mentioned:** Rivelle Tampines is sold out. Coastal Cabana (an EC in Pasir Ris) was suggested.

Expected follow-ups:

| Date | Action |
|---|---|
| Tue 20 Oct 2026 | Send the 4-bedroom floor plans for Coastal Cabana to Kelvin |
| Before 24 Oct (no fixed date) | Check HDB MOP status and EC eligibility |
| before Sat 24 Oct | Confirm the show-flat slot with the developer |
| Sat 24 Oct 2026, 2pm | Viewing at the Coastal Cabana show flat with Kelvin and his wife |

## 2. `chat-existing-priya.png`: existing client Priya Nair

- **Contact:** Priya Nair, +65 8264 1907. This number matches `seed.json`, so the app can match her as an existing customer: PRIYA NAIR D/O RAMESH, Aurelia Bay Residences #15-11, S$1,180,000.
- **Deal update:** her lawyer will pay the stamp duty on Wed 21 Oct 2026 via CPF. The deadline is 23 Oct, so this matches the DUE_SOON stage in the seed.
- **Question:** can she switch her home loan bank before the 15% downpayment? Rachel says it should be possible if she accepts the new bank's Letter of Offer before the downpayment is due. Rachel will confirm the date. Priya should tell her lawyer early.
- **New referral lead:** her brother Arjun (surname not given; likely Nair), +65 9655 3082.
  - Purpose: INVESTMENT.
  - Bedrooms: 2.
  - Area: city fringe (RCR).
  - Budget: about S$1.3M.

Expected follow-ups:

| Date | Action |
|---|---|
| Mon 19 Oct 2026 | Call Arjun (Priya's brother) about a 2-bedroom RCR investment unit, about S$1.3M |
| Tue 20 Oct 2026 | Remind Priya about the stamp duty payment on Wed 21 Oct |
| Wed 21 Oct 2026 (expected) | Stamp duty paid by her lawyer via CPF. Get the payment confirmation and mark STAMP_DUTY complete |
| no fixed date | Confirm the 15% downpayment due date / refinancing window for Priya |

## 3. `chat-investor-mr-wong.png`: new investor lead Mr Wong

- **Contact:** Mr Wong Chee Keong, +65 9781 2203. New contact who found Rachel through an investor group.
- **Residency:** SPR (Singapore PR).
- **Purpose:** INVESTMENT. He wants rental yield and must be near an MRT station.
- **propertiesOwned:** 1. He owns one condo and lives there with his family. This would be his second property.
- **Bedrooms:** 1 or 2.
- **Budget:** up to S$1.5M.
- **Areas:** Lentor, and Jurong Lake District (Lucerne Grand).
- **EC:** no.
- **Timeline:** not stated.
- **Concern:** ABSD. In the chat, Rachel only says ABSD "will be significant" and that she will calculate the exact amount. She does not quote any figure.

Expected follow-ups:

| Date | Action |
|---|---|
| before Wed 21 Oct 2026 | Send Mr Wong the ABSD calculation (PR, 2nd property) |
| Wed 21 Oct 2026, 7.30pm | Call Mr Wong to go through the numbers and shortlist units |
