"""Generate fictional OTP, S&P (erroneous + corrected) and receipt PDFs."""
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table,
                                TableStyle)

from common import *  # noqa

F = "/System/Library/Fonts/Supplemental/"
pdfmetrics.registerFont(TTFont("Arial", F + "Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", F + "Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", F + "Arial Italic.ttf"))
pdfmetrics.registerFontFamily("Arial", normal="Arial", bold="Arial-Bold", italic="Arial-Italic", boldItalic="Arial-Bold")

NAVY = colors.HexColor("#1F3A5F")
GOLD = colors.HexColor("#B08D57")

S = {
    "body": ParagraphStyle("body", fontName="Arial", fontSize=10, leading=14.2, alignment=TA_JUSTIFY, spaceAfter=6),
    "small": ParagraphStyle("small", fontName="Arial", fontSize=8.5, leading=11.5),
    "h1": ParagraphStyle("h1", fontName="Arial-Bold", fontSize=17, leading=22, alignment=TA_CENTER, spaceAfter=4, textColor=NAVY),
    "h2": ParagraphStyle("h2", fontName="Arial-Bold", fontSize=11.5, leading=15, spaceBefore=8, spaceAfter=5, textColor=NAVY),
    "center": ParagraphStyle("center", fontName="Arial", fontSize=10, leading=14, alignment=TA_CENTER),
    "cell": ParagraphStyle("cell", fontName="Arial", fontSize=9.5, leading=12.5),
    "cellb": ParagraphStyle("cellb", fontName="Arial-Bold", fontSize=9.5, leading=12.5),
    "cellr": ParagraphStyle("cellr", fontName="Arial", fontSize=9.5, leading=12.5, alignment=TA_RIGHT),
    "cellrb": ParagraphStyle("cellrb", fontName="Arial-Bold", fontSize=9.5, leading=12.5, alignment=TA_RIGHT),
}


def P(t, s="body"):
    return Paragraph(t, S[s])


def frame(title_right):
    def draw(c, doc):
        c.saveState()
        w, h = A4
        # fictional text-only letterhead (no real logo)
        c.setFillColor(NAVY)
        c.rect(0, h - 26 * mm, w, 26 * mm, stroke=0, fill=1)
        c.setFillColor(GOLD)
        c.circle(22 * mm, h - 13 * mm, 6.5 * mm, stroke=0, fill=1)
        c.setFillColor(NAVY)
        c.setFont("Arial-Bold", 11)
        c.drawCentredString(22 * mm, h - 14.6 * mm, "AB")
        c.setFillColor(colors.white)
        c.setFont("Arial-Bold", 14)
        c.drawString(32 * mm, h - 12 * mm, DEVELOPER.upper())
        c.setFont("Arial", 8.5)
        c.drawString(32 * mm, h - 17.5 * mm, f"UEN {DEVELOPER_UEN}  |  Developer's Licence No. {DEV_LICENCE}  |  {PROJECT_ADDR}")
        c.drawRightString(w - 15 * mm, h - 22 * mm, title_right)
        # footer
        c.setFillColor(colors.HexColor("#666666"))
        c.setFont("Arial", 7.5)
        c.drawString(15 * mm, 10 * mm, "FICTIONAL DOCUMENT — DEMO ONLY. All names, entities, ID numbers and addresses are invented.")
        c.drawRightString(w - 15 * mm, 10 * mm, f"Page {doc.page}")
        c.restoreState()
    return draw


def build(path, story, title_right, title):
    doc = SimpleDocTemplate(path, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=34 * mm, bottomMargin=18 * mm, title=title,
                            author=DEVELOPER + " (fictional)", subject="Demo document — fictional")
    fr = frame(title_right)
    doc.build(story, onFirstPage=fr, onLaterPages=fr)


def kv_table(rows, widths=(55 * mm, 119 * mm)):
    t = Table([[P(k, "cellb"), P(v, "cell")] for k, v in rows], colWidths=widths)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9AA5B1")),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#EEF2F6")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def sig_block(left_title, left_name, left_id, right_title, right_name, right_id):
    def col(title, name, idl):
        return [P(f"<b>{title}</b>", "cell"), Spacer(1, 16 * mm), P("_" * 38, "cell"),
                P(name, "cellb"), P(idl, "cell"), P("Date: ____________________", "cell")]
    t = Table([[col(left_title, left_name, left_id), col(right_title, right_name, right_id)]],
              colWidths=(87 * mm, 87 * mm))
    t.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    return t


# ---------------------------------------------------------------- OTP
def otp():
    s = []
    s.append(P("OPTION TO PURCHASE", "h1"))
    s.append(P(f"{PROJECT} — Unit {UNIT}", "center"))
    s.append(P("(Housing Developers (Control and Licensing) Act — fictional form for demonstration)", "center"))
    s.append(Spacer(1, 6 * mm))
    s.append(kv_table([
        ("Option No.", "ABR/OTP/2026/0412"),
        ("Option Date", d(OTP_DATE)),
        ("Purchaser", f"{HERO_NAME}<br/>NRIC No. {HERO_NRIC}<br/>{HERO_ADDR_1}, {HERO_ADDR_2}"),
        ("Vendor (Developer)", f"{DEVELOPER} (UEN {DEVELOPER_UEN})"),
        ("Housing Project", f"{PROJECT}, {PROJECT_ADDR}<br/>{LOT}"),
        ("Tenure", TENURE),
        ("Unit", f"{UNIT} — {UNIT_TYPE}, approx. {AREA_SQM:.0f} sq m ({AREA_SQFT:,} sq ft)"),
        ("Purchase Price", f"{money(PRICE)} (Singapore Dollars One Million Eight Hundred and Fifty Thousand Only)"),
        ("Booking Fee (5%)", f"{money(BOOKING_FEE)} — RECEIVED by cheque no. 004417 (fictional bank) on {d(OTP_DATE)}"),
        ("Marketing Agency", f"{AGENCY} — Salesperson {AGENT} (CEA Reg. No. {AGENT_CEA})"),
        ("Vendor's Solicitors", SOLICITORS),
    ]))
    s.append(Spacer(1, 4 * mm))
    s.append(P("TERMS OF OPTION", "h2"))
    clauses = [
        f"In consideration of the sum of <b>{money(BOOKING_FEE)}</b> being 5% of the Purchase Price (the \"Booking Fee\"), the receipt of which the Vendor hereby acknowledges, the Vendor grants to the Purchaser an option to purchase the Unit at the Purchase Price on the terms set out herein.",
        f"The Vendor shall, through its solicitors {SOLICITORS}, deliver to the Purchaser or the Purchaser's solicitors the Sale and Purchase Agreement (the \"S&amp;P Agreement\") in the prescribed form together with the title documents <b>within 14 days</b> from the Option Date.",
        "This Option may be exercised by the Purchaser signing the S&amp;P Agreement and returning it, duly signed, to the Vendor's solicitors <b>within 3 weeks</b> after the Purchaser's receipt of the S&amp;P Agreement and title documents.",
        "If the Purchaser fails to exercise this Option within the time stipulated in Clause 3, this Option shall lapse and the Vendor shall be entitled to <b>forfeit 25% of the Booking Fee</b> (i.e. S$23,125.00) and shall refund the balance of the Booking Fee (S$69,375.00) to the Purchaser without interest within 14 days, whereupon neither party shall have any claim against the other.",
        "Upon exercise of this Option, the Booking Fee shall be treated as part payment of the Purchase Price. The balance of the 20% downpayment (15% of the Purchase Price, S$277,500.00) shall be paid within 8 weeks from the Option Date.",
        "The Purchaser is responsible for payment of Buyer's Stamp Duty and any Additional Buyer's Stamp Duty payable on the S&amp;P Agreement within the time prescribed by law.",
        "This Option is personal to the Purchaser and shall not be assigned or transferred.",
    ]
    for i, c in enumerate(clauses, 1):
        s.append(P(f"<b>{i}.</b>&nbsp;&nbsp;{c}"))
    s.append(Spacer(1, 4 * mm))
    s.append(P(f"Dated this {d(OTP_DATE)}."))
    s.append(KeepTogether([Spacer(1, 4 * mm), sig_block(
        f"For and on behalf of the Vendor<br/>{DEVELOPER}", "LIM KAH SOON (fictional)", "Authorised Signatory",
        "Acknowledged by the Purchaser<br/>&nbsp;", HERO_NAME, f"NRIC No. {HERO_NRIC}")]))
    build(f"{OUT}/02-otp-aurelia-bay-12-05.pdf", s, "OPTION TO PURCHASE", "Option to Purchase - Aurelia Bay Residences #12-05")


# ---------------------------------------------------------------- S&P
def spa(path, name, nric, label):
    s = []
    s.append(Spacer(1, 18 * mm))
    s.append(P("SALE AND PURCHASE AGREEMENT", "h1"))
    s.append(P("(Excerpt — Form-style agreement for sale of a unit in a housing project under construction)", "center"))
    s.append(Spacer(1, 12 * mm))
    s.append(kv_table([
        ("Agreement Ref.", "CP/CONV/2026/7781 — ABR-1205"),
        ("Vendor", f"{DEVELOPER}"),
        ("Purchaser", f"{name}"),
        ("Purchaser NRIC No.", f"{nric}"),
        ("Housing Project", PROJECT),
        ("Unit", f"{UNIT} ({UNIT_TYPE})"),
        ("Purchase Price", money(PRICE)),
        ("Option Date", d(OTP_DATE)),
        ("Date of Delivery to Purchaser", d(SPA_DELIVERED)),
        ("Vendor's Solicitors", f"{SOLICITORS}, 8 Fictional Quay #20-01, Singapore 049999"),
    ]))
    s.append(Spacer(1, 14 * mm))
    s.append(P(f"Delivered to the Purchaser on <b>{d(SPA_DELIVERED)}</b>. To be signed and returned to {SOLICITORS} "
               f"within 3 weeks of receipt, failing which the Option to Purchase dated {d(OTP_DATE)} shall lapse.", "center"))
    s.append(PageBreak())

    s.append(P("1. PARTIES", "h2"))
    s.append(P(f"<b>THIS AGREEMENT</b> is made between <b>{DEVELOPER.upper()}</b> (UEN {DEVELOPER_UEN}), a company incorporated in Singapore "
               f"with its registered office at {PROJECT_ADDR} (the \"<b>Vendor</b>\") of the one part; and"))
    s.append(P(f"<b>{name}</b> (NRIC No. <b>{nric}</b>) of {HERO_ADDR_1}, {HERO_ADDR_2} (the \"<b>Purchaser</b>\") of the other part."))
    s.append(P("2. THE PROPERTY", "h2"))
    s.append(P(f"The Vendor agrees to sell and the Purchaser agrees to purchase the unit known as <b>{UNIT}</b> of the housing project "
               f"known as <b>{PROJECT}</b> erected on {LOT}, {PROJECT_ADDR}, held on a {TENURE}, with an approximate strata "
               f"floor area of {AREA_SQM:.0f} square metres ({AREA_SQFT:,} square feet) (the \"<b>Unit</b>\")."))
    s.append(P("3. PURCHASE PRICE AND SCHEDULE OF PAYMENTS", "h2"))
    s.append(P(f"The purchase price of the Unit is <b>{money(PRICE)}</b> (Singapore Dollars One Million Eight Hundred and Fifty Thousand Only) "
               "(the \"Purchase Price\"), payable by instalments in accordance with the Schedule of Payments below (Third Schedule). "
               "The 20% downpayment comprises the 5% booking fee paid on grant of the Option and the 15% balance payable within "
               "8 weeks from the Option Date."))
    rows = [[P("Item", "cellb"), P("Stage of payment", "cellb"), P("%", "cellrb"), P("Amount (S$)", "cellrb")]]
    for item, desc, pct in SCHEDULE:
        rows.append([P(item, "cell"), P(desc, "cell"), P(f"{pct}%", "cellr"), P(f"{PRICE * pct // 100:,.2f}", "cellr")])
    rows.append([P("", "cell"), P("<b>TOTAL</b>", "cell"), P("<b>100%</b>", "cellr"), P(f"<b>{PRICE:,.2f}</b>", "cellr")])
    t = Table(rows, colWidths=(12 * mm, 112 * mm, 16 * mm, 34 * mm), repeatRows=1)
    t.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9AA5B1")),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCE4EC")),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#EEF2F6")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    s.append(t)
    s.append(Spacer(1, 3 * mm))
    s.append(P("4. COMPLETION", "h2"))
    s.append(P(f"The Vendor shall deliver vacant possession of the Unit upon the issue of the Temporary Occupation Permit, the expected date "
               f"of which is <b>{d(TOP_DATE)}</b> (\"Expected TOP Date\"). Legal completion shall take place on or before "
               f"<b>{d(CSC_DATE)}</b>. The Vendor shall make good any defects notified within the <b>defects liability period of "
               "12 months</b> from the date the Purchaser receives the notice of vacant possession."))
    s.append(P("5. STAMP DUTY", "h2"))
    s.append(P("All stamp duties payable on this Agreement, including Buyer's Stamp Duty and Additional Buyer's Stamp Duty, shall be "
               "borne by the Purchaser and paid within 14 days of the date of this Agreement."))
    s.append(P("6. EXECUTION", "h2"))
    s.append(P("<b>IN WITNESS WHEREOF</b> the parties have hereunto set their hands on the date stated below."))
    s.append(KeepTogether([Spacer(1, 2 * mm), sig_block(
        f"SIGNED by the Vendor<br/>{DEVELOPER}", "LIM KAH SOON (fictional)", "Director — in the presence of: CHUA MEI LING, Advocate &amp; Solicitor (fictional)",
        "SIGNED by the Purchaser<br/>&nbsp;", name, f"NRIC No. {nric}")]))
    build(path, s, f"SALE AND PURCHASE AGREEMENT  |  {label}", "Sale and Purchase Agreement - Aurelia Bay Residences #12-05")


# ---------------------------------------------------------------- receipt
def receipt():
    s = []
    s.append(P("OFFICIAL RECEIPT", "h1"))
    s.append(Spacer(1, 4 * mm))
    head = Table([[P("<b>Receipt No.:</b> ABD-OR-2026-11-00873", "cell"), P(f"<b>Date:</b> {d(RECEIPT_DATE)}", "cellr")]],
                 colWidths=(100 * mm, 74 * mm))
    s.append(head)
    s.append(Spacer(1, 4 * mm))
    s.append(kv_table([
        ("Received from", f"{HERO_NAME} (NRIC No. {HERO_NRIC})"),
        ("Project", PROJECT),
        ("Unit", f"{UNIT} ({UNIT_TYPE})"),
        ("Purchase Price", money(PRICE)),
        ("Option / S&amp;P Ref.", "ABR/OTP/2026/0412  |  CP/CONV/2026/7781"),
        ("Being payment for", "Balance of 20% downpayment — 15% of Purchase Price (Item 1A, Schedule of Payments)"),
        ("Payment mode", "Cashier's Order No. 718204 drawn on Lion City Bank (fictional), dated 19 November 2026"),
        ("Amount received", f"<b>{money(DP15)}</b>"),
        ("Amount in words", "Singapore Dollars Two Hundred Seventy-Seven Thousand Five Hundred Only"),
    ]))
    s.append(Spacer(1, 6 * mm))
    s.append(P("PAYMENT SUMMARY", "h2"))
    rows = [[P("Description", "cellb"), P("Amount (S$)", "cellrb")],
            [P(f"Booking fee (5%) received {d(OTP_DATE)}", "cell"), P(f"{BOOKING_FEE:,.2f}", "cellr")],
            [P(f"Balance downpayment (15%) received {d(RECEIPT_DATE)} — this receipt", "cell"), P(f"{DP15:,.2f}", "cellr")],
            [P("<b>Total received to date (20%)</b>", "cell"), P(f"<b>{BOOKING_FEE + DP15:,.2f}</b>", "cellr")],
            [P("Balance of Purchase Price outstanding (80%)", "cell"), P(f"{PRICE - BOOKING_FEE - DP15:,.2f}", "cellr")]]
    t = Table(rows, colWidths=(130 * mm, 44 * mm))
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#9AA5B1")),
                           ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#DCE4EC"))]))
    s.append(t)
    s.append(Spacer(1, 6 * mm))
    s.append(P("This receipt is valid subject to clearance of the cashier's order. This is a computer-generated receipt."))
    s.append(Spacer(1, 14 * mm))
    s.append(P("_" * 38, "cell"))
    s.append(P("<b>NG PEI SHAN (fictional)</b><br/>Finance Department, for and on behalf of " + DEVELOPER, "cell"))
    build(f"{OUT}/04-receipt-15pct-downpayment.pdf", s, "OFFICIAL RECEIPT", "Official Receipt - 15% downpayment - #12-05")


if __name__ == "__main__":
    otp()
    spa(f"{OUT}/03-spa-aurelia-bay-12-05.pdf", HERO_NAME_BAD, HERO_NRIC_BAD, "AS DELIVERED")
    spa(f"{OUT}/03b-spa-aurelia-bay-12-05-corrected.pdf", HERO_NAME, HERO_NRIC, "CORRECTED")
    receipt()
    print("pdfs ok")
