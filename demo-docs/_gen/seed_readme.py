"""Generate seed.json and README.md (all fictional)."""
import json
from datetime import date, timedelta

from common import *  # noqa

TODAY = date(2026, 10, 18)


def iso(x):
    return x.isoformat() if x else None


def bsd(price):
    tiers = [(180_000, .01), (180_000, .02), (640_000, .03), (500_000, .04), (1_500_000, .05), (10**12, .06)]
    tax, rem = 0, price
    for amt, r in tiers:
        take = min(rem, amt)
        tax += take * r
        rem -= take
        if rem <= 0:
            break
    return round(tax)


STAGES = ["BOOKING", "CDD", "SPA_DELIVERED", "SPA_EXERCISED", "STAMP_DUTY", "DOWNPAYMENT_15", "KEYS"]

projects = [
    {"id": "aurelia-bay", "name": PROJECT, "developer": DEVELOPER, "address": PROJECT_ADDR,
     "tenure": "99-year leasehold", "developerSolicitors": SOLICITORS, "expectedTop": "2029-06-30"},
    {"id": "kingsmere-park", "name": "Kingsmere Park", "developer": "Kingsmere Land Pte Ltd",
     "address": "7 Kingsmere Lane, Singapore 279876", "tenure": "99-year leasehold",
     "developerSolicitors": "Halden Yeo LLC", "topDate": "2026-01-09"},
]


def buyer(name, prefix, digits, dob, nat, sex, res, purpose, owned, household, phone, email, address):
    idno = make_id(prefix, digits)
    assert is_valid(idno)
    return {"fullName": name, "idType": "NRIC" if prefix in "ST" else "FIN", "idNumber": idno,
            "dateOfBirth": dob, "nationality": nat, "sex": sex, "address": address, "residency": res,
            "phone": phone, "email": email,
            "profile": {"purpose": purpose, "propertiesOwned": owned, "household": household}}


DUE = {"SPA_DELIVERED": lambda c, otp: otp + timedelta(days=14),
       "SPA_EXERCISED": lambda c, otp: c["SPA_DELIVERED"] + timedelta(days=21) if c.get("SPA_DELIVERED") else None,
       "STAMP_DUTY": lambda c, otp: c["SPA_EXERCISED"] + timedelta(days=14) if c.get("SPA_EXERCISED") else None,
       "DOWNPAYMENT_15": lambda c, otp: otp + timedelta(days=56)}


def risk(c, otp):
    dues = [f(c, otp) for k, f in DUE.items() if not c.get(k)]
    dues = [x for x in dues if x]
    if not dues:
        return "ON_TRACK", None
    nxt = min(dues)
    days = (nxt - TODAY).days
    return ("OVERDUE" if days < 0 else "DUE_SOON" if days <= 7 else "ON_TRACK"), nxt


META = []


def deal(expected, b, project, unit, price, c, note):
    otp = c["BOOKING"]
    r, nxt = risk(c, otp)
    assert r == expected, (b["fullName"], r, expected)
    META.append({"status": "COMPLETED" if c.get("KEYS") else r, "name": b["fullName"], "id": b["idNumber"],
                 "res": b["residency"], "unit": f"{project} {unit}", "price": price, "note": note})
    return {"customer": b, "deal": {"project": project, "unit": unit, "price": price, "otpDate": iso(otp),
                                    "completed": {k: iso(c.get(k)) for k in STAGES}}}


deals = [
    deal("OVERDUE",
         buyer("LEE JUN HAO", "S", "8531462", "1985-06-21", "Singapore", "M", "SC", "OWN_STAY", 0,
               "Married, 1 child", "+65 8123 4471", "lee.junhao@example.com", "Blk 210 Fictional Rise #05-33, Singapore 650210"),
         PROJECT, "#08-03", 1_420_000,
         {"BOOKING": date(2026, 9, 11), "CDD": date(2026, 9, 11), "SPA_DELIVERED": date(2026, 9, 25)},
         "S&P delivered 25 Sep; 3-week exercise window ended 16 Oct 2026 (2 days overdue) - option at risk of lapsing, 25% booking fee forfeit."),
    deal("DUE_SOON",
         buyer("PRIYA NAIR D/O RAMESH", "S", "9047218", "1990-02-08", "Singapore", "F", "SC", "OWN_STAY", 0,
               "Single", "+65 8264 1907", "priya.nair@example.com", "88 Example Grove #11-04, Singapore 438888"),
         PROJECT, "#15-11", 1_180_000,
         {"BOOKING": date(2026, 9, 8), "CDD": date(2026, 9, 8), "SPA_DELIVERED": date(2026, 9, 21), "SPA_EXERCISED": date(2026, 10, 9)},
         "S&P exercised 9 Oct; stamp duty due 23 Oct 2026 (5 days left)."),
    deal("ON_TRACK",
         buyer("MUHAMMAD HAFIZ BIN ISMAIL", "S", "9418350", "1994-11-30", "Singapore", "M", "SC", "OWN_STAY", 0,
               "Married, no children", "+65 8735 2280", "hafiz.ismail@example.com", "Blk 45 Sample Street 2 #03-118, Singapore 520045"),
         PROJECT, "#05-02", 1_150_000,
         {"BOOKING": date(2026, 10, 12), "CDD": date(2026, 10, 12)},
         "Booked 12 Oct; developer to deliver S&P by 26 Oct 2026 (8 days)."),
    deal("ON_TRACK",
         buyer("CHEN XIAOLING", "S", "8762904", "1987-04-17", "China", "F", "SPR", "OWN_STAY", 0,
               "Married, 2 children", "+65 8490 6613", "chen.xiaoling@example.com", "21 Placeholder Walk #07-02, Singapore 597621"),
         PROJECT, "#20-08", 2_050_000,
         {"BOOKING": date(2026, 10, 1), "CDD": date(2026, 10, 1), "SPA_DELIVERED": date(2026, 10, 9)},
         "S&P delivered 9 Oct; exercise deadline 30 Oct 2026 (12 days). SPR 1st property: ABSD 5%."),
    deal("ON_TRACK",
         buyer("JAMES ARTHUR WHITFIELD", "G", "7341285", "1981-09-03", "United Kingdom", "M", "FOREIGNER", "INVESTMENT", 1,
               "Married, 2 children", "+65 8817 3054", "james.whitfield@example.com", "5 Mock Hill Road #14-01, Singapore 248555"),
         PROJECT, "#18-01", 3_280_000,
         {"BOOKING": date(2026, 9, 3), "CDD": date(2026, 9, 3), "SPA_DELIVERED": date(2026, 9, 14),
          "SPA_EXERCISED": date(2026, 9, 28), "STAMP_DUTY": date(2026, 10, 6)},
         "At 15% downpayment stage: S$492,000 due 29 Oct 2026 (OTP + 56 days, 11 days left). Foreigner ABSD 60% paid."),
    deal("ON_TRACK",
         buyer("GOH BOON KIAT", "S", "7925836", "1979-12-12", "Singapore", "M", "SC", "OWN_STAY", 0,
               "Married, 3 children", "+65 8352 9146", "goh.boonkiat@example.com", "7 Kingsmere Lane #03-07, Singapore 279876"),
         "Kingsmere Park", "#03-07", 2_260_000,
         {"BOOKING": date(2022, 11, 10), "CDD": date(2022, 11, 10), "SPA_DELIVERED": date(2022, 11, 18),
          "SPA_EXERCISED": date(2022, 12, 5), "STAMP_DUTY": date(2022, 12, 12), "DOWNPAYMENT_15": date(2023, 1, 2),
          "KEYS": date(2025, 11, 20)},
         "All stages done; keys 20 Nov 2025. 12-month defects liability period ends 19 Nov 2026 (32 days). Suggested after-sales talking point: loan lock-in ends 15 Dec 2026 (not in seed schema)."),
]

with open(f"{OUT}/seed.json", "w") as f:
    json.dump(deals, f, indent=2)
    f.write("\n")

# ---------------------------------------------------------------- README
def calc_md(prefix, digits):
    prods, total, rem, letter = checksum_detail(prefix, digits)
    terms = " + ".join(f"{dd}x{w}" for dd, w in zip(digits, WEIGHTS))
    return (f"`{prefix}{digits}`: {terms} = {' + '.join(map(str, prods))} = {sum(prods)}; "
            f"+ offset {OFFSET[prefix]} = {total}; {total} mod 11 = {rem}; "
            f"letter[{rem}] of `{'JZIHGFEDCBA' if prefix in 'ST' else 'XWUTRQPNMLK'}` = **{letter}** -> **{prefix}{digits}{letter}**")


bad_digits = HERO_NRIC_BAD[1:8]
bad_expected = make_id("S", bad_digits)
hero_bsd = bsd(PRICE)
hero_absd = round(PRICE * 0.20)
exercise_deadline = SPA_DELIVERED + timedelta(days=21)

seed_rows = "\n".join(
    f"| {i} | {m['status']} | {m['name']} | `{m['id']}` | {m['res']} | {m['unit']} | S${m['price']:,} | {m['note']} |"
    for i, m in enumerate(META, 1))

readme = f"""# Closing Copilot - demo document pack (FICTIONAL)

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
| Agency / agent | {AGENCY} - {AGENT}, CEA Reg. No. {AGENT_CEA} |
| Developer | {DEVELOPER} (UEN {DEVELOPER_UEN}, Developer's Licence {DEV_LICENCE}) |
| Project | {PROJECT}, {PROJECT_ADDR} - 99-year leasehold condominium |
| Developer's solicitors | {SOLICITORS} |
| Unit | {UNIT}, {UNIT_TYPE}, {AREA_SQFT:,} sq ft ({AREA_SQM:.0f} sq m) |
| Purchase price | S${PRICE:,} |
| OTP date | 5 Oct 2026 (Option No. ABR/OTP/2026/0412) |
| Booking fee (5%) | S${BOOKING_FEE:,} - received |
| S&P delivered | 15 Oct 2026 (within 14 days of OTP - OK) |
| S&P exercise deadline | {d(exercise_deadline)} (3 weeks after receipt) |
| 15% balance downpayment | S${DP15:,}, due by {d(OTP_DATE + timedelta(weeks=8))} (8 weeks from OTP); receipt dated 20 Nov 2026, Cashier's Order No. 718204 |
| Expected TOP | 30 Jun 2029; legal completion by 30 Jun 2032 |

### Hero buyer (created live, NOT in seed.json)

| Field | Value |
|---|---|
| Name | {HERO_NAME} |
| NRIC | **{HERO_NRIC}** |
| Residency / sex / DOB | Singapore Citizen / Male / 14 Mar 1988 |
| Country of birth / race | Singapore / Chinese |
| Address | {HERO_ADDR_1}, {HERO_ADDR_2} |
| Purpose | Investment; already owns 1 residential property (this is his 2nd) |
| Household | Married, 2 young children |

NRIC checksum (weights 2,7,6,5,4,3,2; S offset 0; table `JZIHGFEDCBA`):

- {calc_md("S", HERO_DIGITS)}

### Second buyer (05-nric-sarah-ong.png)

ONG SHU HUI SARAH - Singapore PR, female, DOB 2 Jul 1992, country of birth Malaysia, NRIC **{SARAH_NRIC}**.

- {calc_md("S", SARAH_DIGITS)}

## Planted errors (in `03-spa-aurelia-bay-12-05.pdf` only)

| Field | NRIC card / OTP (truth) | S&P as delivered | Error |
|---|---|---|---|
| Purchaser name | `{HERO_NAME}` | `{HERO_NAME_BAD}` | missing final "G" |
| Purchaser NRIC | `{HERO_NRIC}` | `{HERO_NRIC_BAD}` | digits 3 and 4 transposed (`07` -> `70`) |

The wrong NRIC also **fails the checksum**: digits `{bad_digits}` would need check letter `{bad_expected[-1]}`
(i.e. `{bad_expected}`), but the S&P prints `{HERO_NRIC_BAD[-1]}`. Both errors appear on the summary cover, the
Parties clause and the signature block. Everything else (unit, price, dates, schedule) is consistent with the OTP.

## Expected checks the AI should flag / pass

1. **FLAG - name mismatch**: S&P purchaser "TAN WEI MIN" != NRIC/OTP "TAN WEI MING". Ask developer's solicitors ({SOLICITORS}) to amend before signing.
2. **FLAG - NRIC mismatch**: S&P `{HERO_NRIC_BAD}` != NRIC card `{HERO_NRIC}` (transposition), and the S&P value is checksum-invalid.
3. **FLAG - deadline**: S&P must be signed and returned by **{d(exercise_deadline)}**, otherwise the option lapses and 25% of the booking fee (S$23,125) is forfeited. Today is 18 Oct 2026 -> 18 days left; the correction must happen inside this window.
4. **INFO - stamp duty** (2nd property, Singapore Citizen): BSD on S${PRICE:,} = **S${hero_bsd:,}** (1%/2%/3%/4%/5% tiers); ABSD 20% = **S${hero_absd:,}**; total **S${hero_bsd + hero_absd:,}**, payable within 14 days of exercising the S&P.
5. **PASS** - unit, price, booking fee (5% = S$92,500), OTP date and project match across OTP, S&P and receipt.
6. **PASS** - S&P delivered 15 Oct 2026, within 14 days of OTP (deadline 19 Oct 2026).
7. **PASS** - payment schedule totals 100% (20% downpayment incl. 5% booking fee, 10, 10, 5, 5, 5, 5, 25 TOP, 15 CSC) and amounts sum to S$1,850,000.
8. **PASS** - receipt: S$277,500 = 15% of price, payer TAN WEI MING with correct NRIC; 20% received to date = S$370,000.
   Note: receipt date 20 Nov 2026 is within the 8-week window (due by {d(OTP_DATE + timedelta(weeks=8))}).
9. **PASS (after fix)** - `03b` corrected S&P matches the NRIC card exactly.

## seed.json deals (today = 18 Oct 2026)

| ID | Status | Buyer | ID no. | Residency | Unit | Price | Situation |
|---|---|---|---|---|---|---|---|
{seed_rows}

Format: top-level JSON array of `{{customer: {{fullName, idType, idNumber, dateOfBirth, nationality, sex, address, residency, phone, email, profile: {{purpose, propertiesOwned, household}}}}, deal: {{project, unit, price, otpDate, completed: {{{", ".join(STAGES)}}}}}}}` (date when completed, `null` if not done).
Status is what the app's rules compute (earliest due date among uncompleted stages: SPA_DELIVERED = OTP+14d, SPA_EXERCISED = delivery+21d, STAMP_DUTY = exercise+14d, DOWNPAYMENT_15 = OTP+56d; <0 days OVERDUE, <=7 DUE_SOON). The generator asserts each one.
Project metadata (not in seed.json): Kingsmere Park, 7 Kingsmere Lane, Singapore 279876, by Kingsmere Land Pte Ltd (fictional), TOP Nov 2025. All ID numbers in seed.json pass the
NRIC/FIN checksum (FIN uses G offset 4 and table `XWUTRQPNMLK`). Phones are `+65 8xxx xxxx`, emails `@example.com`.

## Caveats

- ID numbers are format-valid only; they are randomly chosen and not knowingly assigned to anyone. Any real-world
  collision is coincidental - never use them outside this demo.
- Card layout is a generic stylised design (no crest, chip, hologram, or official colours) and is labelled as a specimen.
- Legal wording is simplified illustrative text, not the statutory form.
"""
with open(f"{OUT}/README.md", "w") as f:
    f.write(readme)
print("seed+readme ok; BSD", hero_bsd, "ABSD", hero_absd, "bad expected", bad_expected)
