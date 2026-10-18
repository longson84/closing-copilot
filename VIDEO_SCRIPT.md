# Closing Copilot — 3-minute demo video

**Problem statement:** Future of Work & Enterprise Productivity
**Length:** 3:00 max · English · screen recording at 1440×900 (desktop) plus one phone segment
**Before recording:** run the reset in `DEMO.md`, open the app, close other tabs, hide bookmarks bar, zoom 100%.

Voice-over word count is ~400 words (≈ 140 wpm). Timings are targets; cut the italic lines first if you run long.

---

### 0:00 – 0:15 · The problem
**Screen:** Pipeline. Slowly hover the red "Overdue" badge on Lee Jun Hao.

> A Singapore property agent closing a new-launch condo juggles hard legal deadlines — S&P in three weeks, stamp duty in fourteen days — and every document has to match the buyer exactly. Miss one, and the buyer can lose a quarter of their booking fee. Today that lives in spreadsheets and WhatsApp.

### 0:15 – 0:40 · Booking from an ID photo
**Screen:** New booking → pick *Aurelia Bay Residences* → fill unit/price/OTP → drop `01b-nric-tan-wei-ming-photo.jpg` (the tilted phone photo) → progress → deal page with extracted buyer.

> Closing Copilot is built on Google Cloud. The agent snaps the buyer's NRIC — even a tilted phone photo. Document AI reads it, Gemini structures it, and the customer record is created with the ID masked everywhere. Due-diligence is recorded, and the image is never stored.

### 0:40 – 1:05 · The catch (hero moment)
**Screen:** On Tan's deal, upload `03-spa-aurelia-bay-12-05.pdf` → red alert: name "TAN WEI MIN", ID mismatch. Pause 2 s on it. *(Optional: upload `03b-…-corrected.pdf` → all green, "S&P delivered" suggested.)*

> When the developer's lawyer sends the Sale & Purchase Agreement, Copilot cross-checks it against the verified buyer. Here it caught a missing letter in the name and two swapped digits in the NRIC — before the buyer signs. Gemini reads; plain code compares, so every flag is explainable.

### 1:05 – 1:40 · WhatsApp to CRM in seconds
**Screen:** Customers → Import screenshots → drop `chat-new-lead-kelvin-1.png` + `-2.png` → review screen: "New customer: Kelvin Tay", bubbles, key points, facts ticked, follow-ups "Send floor plans Tue 20 Oct", "Viewing Sat 24 Oct" → Save → customer page → Matched projects → Suggest with AI → Coastal Cabana EC.

> Most selling happens on WhatsApp. The agent screenshots the chat; Gemini turns it into a customer — budget, family, preferences — plus dated follow-ups for every promise made. Nothing is saved until the agent confirms. Then Copilot matches him against twenty-four real 2025–26 launches: an EC in Pasir Ris that fits his family and budget.

### 1:40 – 2:15 · After the sale: relationships
**Screen:** Customers → Goh Boon Kiat → Family & dates (circle map, Michelle's birthday 12 Nov) → After-sales tab (rent out at $6,800, furnishing, tax YA2028). Then Reminders → Joanne Ng's birthday → "Send wishes" → Copilot drafts a message.

> The relationship doesn't end at the keys. From a chat and a profile screenshot, Copilot built Mr Goh's circle — with his consent, as Singapore's PDPA requires — and his after-sales needs: finding a tenant, furnishing, declaring rental income. Birthdays, anniversaries, lease renewals and tax deadlines land in one reminders list, and Copilot drafts the message.

### 2:15 – 2:40 · Ask Copilot
**Screen:** Copilot panel → "What do I need to do today?" → streamed answer with tool chips (Checking deadlines, Checking reminders).

> And when the agent just asks "what do I need to do today", the ADK agent checks deadlines, reminders and customer files through its tools — it never guesses a date, an amount or a stamp-duty figure; those come from code.

### 2:40 – 3:00 · How it's built
**Screen:** Architecture slide (from the deck) → then a 2-second phone shot of the installed app.

> Gemini on Vertex AI with the Agent Development Kit, Document AI, Google Search grounding, Firestore and Cloud Run — evaluated end to end, seven out of seven cases passing. Closing Copilot: fewer missed deadlines, deeper relationships, more time with clients.

---

## Shot list & files
| Scene | Files / inputs |
|---|---|
| Booking | Project *Aurelia Bay Residences*, unit `#12-05`, price `1850000`, OTP `2026-10-05`, SC, investment, 1 property · `demo-docs/01b-nric-tan-wei-ming-photo.jpg` |
| Mismatch | `demo-docs/03-spa-aurelia-bay-12-05.pdf` (then `03b-…-corrected.pdf`) |
| WhatsApp | `demo-docs/whatsapp/chat-new-lead-kelvin-1.png`, `chat-new-lead-kelvin-2.png` |
| After-sales | Seeded: Goh Boon Kiat, Ng Kok Wei (Joanne's birthday 24 Oct) |
| Phone | Installed PWA, Pipeline → tap a deal (optional: "Take photo" button) |

## Recording tips
- AI steps take 10–20 s: record them, then cut the wait in editing (keep the progress text visible for ~1 s).
- Record each scene separately; reset the demo before re-taking the booking or Kelvin scenes (they create data).
- Keep the cursor still while speaking; zoom in (editing) on the mismatch alert and the follow-up dates.
- Upload as **Public** on YouTube (the rules ask for a public YouTube/Vimeo/Drive link; "Unlisted" may not qualify), title: *Closing Copilot — AI Builder Cup 2026 (Future of Work)*.
