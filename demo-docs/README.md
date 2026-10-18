# Closing Copilot - demo document pack (FICTIONAL)

Everything in this folder is invented for a hackathon demo video. No real people, NRIC holders, developers,
projects, law firms, banks, logos or government crests. Identity cards carry a diagonal **SPECIMEN - DEMO ONLY**
watermark; PDFs carry a "FICTIONAL DOCUMENT - DEMO ONLY" footer. Reference "today" = **18 Oct 2026**.

Regenerate: `cd _gen && uv run --with reportlab --with pillow --with qrcode python cards.py && uv run --with reportlab --with pillow python docs.py && uv run python seed_readme.py`

## Files

| File | What it is |
|---|---|
| `01-nric-tan-wei-ming.png` | Stylised specimen identity card (front), hero buyer TAN WEI MING, flat scan |
| `01b-nric-tan-wei-ming-photo.jpg` | Same card photographed on a desk: ~4 deg rotation, shadow, mild blur + noise (real-world capture for OCR) |
| `02-otp-aurelia-bay-12-05.pdf` | Option to Purchase, 2 pages, dated 5 Oct 2026 |
| `03-spa-aurelia-bay-12-05.pdf` | S&P Agreement excerpt, 3 pages, delivered 15 Oct 2026 - **contains the planted errors** |
| `03b-spa-aurelia-bay-12-05-corrected.pdf` | Same S&P with the correct name and NRIC |
| `04-receipt-15pct-downpayment.pdf` | Developer's official receipt for the 15% balance downpayment, 20 Nov 2026 |
| `05-nric-sarah-ong.png` | Second specimen card: ONG SHU HUI SARAH (for a live "new booking") |
| `seed.json` | 6 pre-existing fictional deals in varied stages (hero buyer not included) |
| `_gen/` | Generator scripts |

## Fictional world

| Item | Value |
|---|---|
| Agency / agent | Harbour Realty Pte Ltd - Rachel Lim, CEA Reg. No. R061234Z |
| Developer | Aurelia Bay Development Pte Ltd (UEN 202312345K, Developer's Licence C1234) |
| Project | Aurelia Bay Residences, 18 Marina Crest Road, Singapore 018947 - 99-year leasehold condominium |
| Developer's solicitors | Chua & Partners LLP |
| Unit | #12-05, 3-Bedroom, Type C2, 1,130 sq ft (105 sq m) |
| Purchase price | S$1,850,000 |
| OTP date | 5 Oct 2026 (Option No. ABR/OTP/2026/0412) |
| Booking fee (5%) | S$92,500 - received |
| S&P delivered | 15 Oct 2026 (within 14 days of OTP - OK) |
| S&P exercise deadline | 5 November 2026 (3 weeks after receipt) |
| 15% balance downpayment | S$277,500, due by 30 November 2026 (8 weeks from OTP); receipt dated 20 Nov 2026, Cashier's Order No. 718204 |
| Expected TOP | 30 Jun 2029; legal completion by 30 Jun 2032 |

### Hero buyer (created live, NOT in seed.json)

| Field | Value |
|---|---|
| Name | TAN WEI MING |
| NRIC | **S8807416E** |
| Residency / sex / DOB | Singapore Citizen / Male / 14 Mar 1988 |
| Country of birth / race | Singapore / Chinese |
| Address | Blk 123 Fictional Ave 4 #08-12, Singapore 560123 |
| Purpose | Investment; already owns 1 residential property (this is his 2nd) |
| Household | Married, 2 young children |

NRIC checksum (weights 2,7,6,5,4,3,2; S offset 0; table `JZIHGFEDCBA`):

- `S8807416`: 8x2 + 8x7 + 0x6 + 7x5 + 4x4 + 1x3 + 6x2 = 16 + 56 + 0 + 35 + 16 + 3 + 12 = 138; + offset 0 = 138; 138 mod 11 = 6; letter[6] of `JZIHGFEDCBA` = **E** -> **S8807416E**

### Second buyer (05-nric-sarah-ong.png)

ONG SHU HUI SARAH - Singapore PR, female, DOB 2 Jul 1992, country of birth Malaysia, NRIC **S9263158C**.

- `S9263158`: 9x2 + 2x7 + 6x6 + 3x5 + 1x4 + 5x3 + 8x2 = 18 + 14 + 36 + 15 + 4 + 15 + 16 = 118; + offset 0 = 118; 118 mod 11 = 8; letter[8] of `JZIHGFEDCBA` = **C** -> **S9263158C**

## Planted errors (in `03-spa-aurelia-bay-12-05.pdf` only)

| Field | NRIC card / OTP (truth) | S&P as delivered | Error |
|---|---|---|---|
| Purchaser name | `TAN WEI MING` | `TAN WEI MIN` | missing final "G" |
| Purchaser NRIC | `S8807416E` | `S8870416E` | digits 3 and 4 transposed (`07` -> `70`) |

The wrong NRIC also **fails the checksum**: digits `8870416` would need check letter `I`
(i.e. `S8870416I`), but the S&P prints `E`. Both errors appear on the summary cover, the
Parties clause and the signature block. Everything else (unit, price, dates, schedule) is consistent with the OTP.

## Expected checks the AI should flag / pass

1. **FLAG - name mismatch**: S&P purchaser "TAN WEI MIN" != NRIC/OTP "TAN WEI MING". Ask developer's solicitors (Chua & Partners LLP) to amend before signing.
2. **FLAG - NRIC mismatch**: S&P `S8870416E` != NRIC card `S8807416E` (transposition), and the S&P value is checksum-invalid.
3. **FLAG - deadline**: S&P must be signed and returned by **5 November 2026**, otherwise the option lapses and 25% of the booking fee (S$23,125) is forfeited. Today is 18 Oct 2026 -> 18 days left; the correction must happen inside this window.
4. **INFO - stamp duty** (2nd property, Singapore Citizen): BSD on S$1,850,000 = **S$62,100** (1%/2%/3%/4%/5% tiers); ABSD 20% = **S$370,000**; total **S$432,100**, payable within 14 days of exercising the S&P.
5. **PASS** - unit, price, booking fee (5% = S$92,500), OTP date and project match across OTP, S&P and receipt.
6. **PASS** - S&P delivered 15 Oct 2026, within 14 days of OTP (deadline 19 Oct 2026).
7. **PASS** - payment schedule totals 100% (20% downpayment incl. 5% booking fee, 10, 10, 5, 5, 5, 5, 25 TOP, 15 CSC) and amounts sum to S$1,850,000.
8. **PASS** - receipt: S$277,500 = 15% of price, payer TAN WEI MING with correct NRIC; 20% received to date = S$370,000.
   Note: receipt date 20 Nov 2026 is within the 8-week window (due by 30 November 2026).
9. **PASS (after fix)** - `03b` corrected S&P matches the NRIC card exactly.

## seed.json deals (today = 18 Oct 2026)

| ID | Status | Buyer | ID no. | Residency | Unit | Price | Situation |
|---|---|---|---|---|---|---|---|
| 1 | OVERDUE | LEE JUN HAO | `S8531462I` | SC | Aurelia Bay Residences #08-03 | S$1,420,000 | S&P delivered 25 Sep; 3-week exercise window ended 16 Oct 2026 (2 days overdue) - option at risk of lapsing, 25% booking fee forfeit. |
| 2 | DUE_SOON | PRIYA NAIR D/O RAMESH | `S9047218F` | SC | Aurelia Bay Residences #15-11 | S$1,180,000 | S&P exercised 9 Oct; stamp duty due 23 Oct 2026 (5 days left). |
| 3 | ON_TRACK | MUHAMMAD HAFIZ BIN ISMAIL | `S9418350B` | SC | Aurelia Bay Residences #05-02 | S$1,150,000 | Booked 12 Oct; developer to deliver S&P by 26 Oct 2026 (8 days). |
| 4 | ON_TRACK | CHEN XIAOLING | `S8762904Z` | SPR | Aurelia Bay Residences #20-08 | S$2,050,000 | S&P delivered 9 Oct; exercise deadline 30 Oct 2026 (12 days). SPR 1st property: ABSD 5%. |
| 5 | ON_TRACK | JAMES ARTHUR WHITFIELD | `G7341285X` | FOREIGNER | Aurelia Bay Residences #18-01 | S$3,280,000 | At 15% downpayment stage: S$492,000 due 29 Oct 2026 (OTP + 56 days, 11 days left). Foreigner ABSD 60% paid. |
| 6 | COMPLETED | GOH BOON KIAT | `S7925836I` | SC | Kingsmere Park #03-07 | S$2,260,000 | All stages done; keys 20 Nov 2025. 12-month defects liability period ends 19 Nov 2026 (32 days). Suggested after-sales talking point: loan lock-in ends 15 Dec 2026 (not in seed schema). |

Format: top-level JSON array of `{customer: {fullName, idType, idNumber, dateOfBirth, nationality, sex, address, residency, phone, email, profile: {purpose, propertiesOwned, household}}, deal: {project, unit, price, otpDate, completed: {BOOKING, CDD, SPA_DELIVERED, SPA_EXERCISED, STAMP_DUTY, DOWNPAYMENT_15, KEYS}}}` (date when completed, `null` if not done).
Status is what the app's rules compute (earliest due date among uncompleted stages: SPA_DELIVERED = OTP+14d, SPA_EXERCISED = delivery+21d, STAMP_DUTY = exercise+14d, DOWNPAYMENT_15 = OTP+56d; <0 days OVERDUE, <=7 DUE_SOON). The generator asserts each one.
Project metadata (not in seed.json): Kingsmere Park, 7 Kingsmere Lane, Singapore 279876, by Kingsmere Land Pte Ltd (fictional), TOP Nov 2025. All ID numbers in seed.json pass the
NRIC/FIN checksum (FIN uses G offset 4 and table `XWUTRQPNMLK`). Phones are `+65 8xxx xxxx`, emails `@example.com`.

## Caveats

- ID numbers are format-valid only; they are randomly chosen and not knowingly assigned to anyone. Any real-world
  collision is coincidental - never use them outside this demo.
- Card layout is a generic stylised design (no crest, chip, hologram, or official colours) and is labelled as a specimen.
- Legal wording is simplified illustrative text, not the statutory form.
