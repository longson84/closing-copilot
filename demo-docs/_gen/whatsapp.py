"""Generate FAKE mobile-chat screenshots for the Closing Copilot demo.

Generic chat-app look only (no logos / trademarked icons). EVERYTHING IS FICTIONAL.
Phone owner (outgoing, right) = Rachel Lim, Harbour Realty. "Today" = Sun 18 Oct 2026.

Run:  uv run --with pillow python demo-docs/_gen/whatsapp.py
"""

import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "whatsapp")

W, H = 1170, 2532
FONT = "/System/Library/Fonts/Supplemental/Arial.ttf"
FONT_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

# colours
BG = (239, 231, 222)
HEADER_BG = (246, 246, 246)
OUT_BUBBLE = (217, 253, 211)
IN_BUBBLE = (255, 255, 255)
TEXT = (17, 27, 33)
META = (102, 119, 129)
TICK = (83, 189, 235)
CHIP_BG = (255, 255, 255)
GREEN = (0, 150, 110)
DIVIDER = (218, 218, 218)

STATUS_H = 141
HEADER_H = 190
INPUT_H = 205
TOP = STATUS_H + HEADER_H
BOTTOM = H - INPUT_H

MSG_SIZE = 41
LINE_H = 51
META_SIZE = 30
PAD_X, PAD_Y = 28, 14
MAX_BUBBLE_W = int(W * 0.82)
SIDE = 36


def font(size, bold=False):
    return ImageFont.truetype(FONT_B if bold else FONT, size)


F_MSG = font(MSG_SIZE)
F_META = font(META_SIZE)


def wrap(text, f, maxw):
    lines = []
    for para in text.split("\n"):
        words, cur = para.split(" "), ""
        for w in words:
            t = (cur + " " + w).strip()
            if f.getlength(t) <= maxw:
                cur = t
            else:
                if cur:
                    lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def draw_ticks(d, x, y):
    """Two simple check-mark glyphs (read receipt), top-left at (x, y)."""
    for dx in (0, 14):
        d.line([(x + dx, y + 12), (x + dx + 7, y + 20), (x + dx + 22, y + 2)], fill=TICK, width=4, joint="curve")


def status_bar(d, time_str):
    d.rectangle([0, 0, W, STATUS_H], fill=HEADER_BG)
    d.text((96, 52), time_str, font=font(48, True), fill=TEXT)
    # tiny unobtrusive demo marker
    d.text((W // 2, 74), "DEMO", font=font(22), fill=(170, 170, 170), anchor="mm")
    # signal bars
    bx = 880
    for i in range(4):
        h = 12 + i * 8
        d.rounded_rectangle([bx + i * 18, 88 - h, bx + i * 18 + 11, 88], 3, fill=TEXT)
    # battery
    d.rounded_rectangle([980, 58, 1062, 92], 9, outline=(140, 140, 140), width=3)
    d.rounded_rectangle([986, 64, 1044, 86], 5, fill=TEXT)
    d.rounded_rectangle([1066, 68, 1072, 82], 2, fill=(140, 140, 140))


def header(d, name, phone, initials, avatar_rgb):
    y0 = STATUS_H
    d.rectangle([0, y0, W, y0 + HEADER_H], fill=HEADER_BG)
    d.line([(0, y0 + HEADER_H - 1), (W, y0 + HEADER_H - 1)], fill=DIVIDER, width=2)
    cy = y0 + HEADER_H // 2
    # back chevron
    d.line([(64, cy - 26), (40, cy), (64, cy + 26)], fill=GREEN, width=7, joint="curve")
    # avatar circle with initials
    r = 56
    ax = 100 + r
    d.ellipse([ax - r, cy - r, ax + r, cy + r], fill=avatar_rgb)
    d.text((ax, cy), initials, font=font(44, True), fill=(255, 255, 255), anchor="mm")
    tx = ax + r + 30
    d.text((tx, cy - 54), name, font=font(48, True), fill=TEXT)
    d.text((tx, cy + 10), phone, font=font(36), fill=META)
    # vertical "more" dots
    for i in range(3):
        d.ellipse([W - 62, cy - 30 + i * 26, W - 50, cy - 18 + i * 26], fill=GREEN)


def input_bar(d):
    y0 = BOTTOM
    d.rectangle([0, y0, W, H], fill=HEADER_BG)
    d.line([(0, y0), (W, y0)], fill=DIVIDER, width=2)
    # plus
    d.line([(50, y0 + 75), (94, y0 + 75)], fill=GREEN, width=6)
    d.line([(72, y0 + 53), (72, y0 + 97)], fill=GREEN, width=6)
    d.rounded_rectangle([130, y0 + 28, W - 170, y0 + 122], 47, fill=(255, 255, 255), outline=DIVIDER, width=2)
    d.text((170, y0 + 75), "Message", font=font(40), fill=(150, 150, 150), anchor="lm")
    # send circle with a simple triangle arrow
    cx, cy, r = W - 85, y0 + 75, 47
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GREEN)
    d.polygon([(cx - 16, cy - 20), (cx + 22, cy), (cx - 16, cy + 20), (cx - 8, cy)], fill=(255, 255, 255))
    # home indicator
    d.rounded_rectangle([W // 2 - 200, H - 38, W // 2 + 200, H - 26], 6, fill=TEXT)


def chip(label):
    return ("chip", label)


def measure_bubble(text, outgoing):
    inner = MAX_BUBBLE_W - 2 * PAD_X
    lines = wrap(text, F_MSG, inner)
    meta_w = F_META.getlength("00:00") + (52 if outgoing else 0) + 24
    widest = max(F_MSG.getlength(l) for l in lines)
    last_w = F_MSG.getlength(lines[-1])
    if last_w + meta_w <= inner:
        content_w = max(widest, last_w + meta_w)
        h = len(lines) * LINE_H
    else:
        content_w = max(widest, meta_w)
        h = len(lines) * LINE_H + 40
    return lines, int(content_w + 2 * PAD_X), int(h + 2 * PAD_Y)


def render(filename, contact, items, status_time):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    # layout pass
    blocks, y, prev = [], TOP + 22, None
    for it in items:
        if it[0] == "chip":
            y += 16 if prev else 0
            blocks.append(("chip", it[1], y))
            y += 66 + 22
            prev = None
            continue
        who, time_str, text = it
        out = who == "R"
        y += (8 if prev == who else 22) if prev else 0
        lines, bw, bh = measure_bubble(text, out)
        blocks.append(("msg", (out, time_str, lines, bw, bh, prev != who), y))
        y += bh
        prev = who
    overflow = y + 24 - BOTTOM
    if overflow > 0:
        raise SystemExit(f"{filename}: content overflows by {overflow}px - shorten messages")

    for kind, data, by in blocks:
        if kind == "chip":
            tw = F_META.getlength(data)
            x0 = (W - tw) // 2 - 30
            d.rounded_rectangle([x0, by, x0 + tw + 60, by + 66], 18, fill=CHIP_BG)
            d.text((W // 2, by + 33), data, font=font(32, True), fill=META, anchor="mm")
            continue
        out, time_str, lines, bw, bh, first = data
        x0 = W - SIDE - bw if out else SIDE
        fill = OUT_BUBBLE if out else IN_BUBBLE
        d.rounded_rectangle([x0, by, x0 + bw, by + bh], 26, fill=fill)
        if first:  # tail
            if out:
                d.polygon([(x0 + bw - 30, by), (x0 + bw + 22, by), (x0 + bw, by + 30)], fill=fill)
            else:
                d.polygon([(x0 + 30, by), (x0 - 22, by), (x0, by + 30)], fill=fill)
        for i, line in enumerate(lines):
            d.text((x0 + PAD_X, by + PAD_Y + i * LINE_H + 4), line, font=F_MSG, fill=TEXT)
        mx = x0 + bw - PAD_X - (52 if out else 0)
        my = by + bh - PAD_Y - 32
        d.text((mx, my), time_str, font=F_META, fill=META, anchor="ra")
        if out:
            draw_ticks(d, mx + 12, my + 4)

    status_bar(d, status_time)
    header(d, *contact)
    input_bar(d)
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, filename)
    img.save(path, optimize=True)
    print("wrote", path, f"(free space {-overflow}px)")


# ---------------------------------------------------------------- chats
KELVIN = ("Kelvin Tay", "+65 9123 4471", "KT", (91, 141, 199))
PRIYA = ("Priya Nair", "+65 8264 1907", "PN", (196, 110, 140))  # phone matches seed.json
WONG = ("Mr Wong Chee Keong", "+65 9781 2203", "WC", (110, 160, 110))

kelvin_1 = [
    chip("Yesterday"),
    ("K", "20:12", "Hi Rachel, this is Kelvin Tay. Got your number from Priya Nair, she said you helped her buy her condo. Hope you don't mind me texting on a Saturday night"),
    ("R", "20:15", "Hi Kelvin! Not at all, thanks for reaching out. Priya is a great client. How can I help?"),
    ("K", "20:18", "My wife and I are looking to buy our first private property. Both of us are Singapore Citizens. Now staying in a 5-room HDB in Tampines."),
    ("K", "20:19", "We completed our 5-year MOP last year (2025). Our combined income is still within the EC income ceiling, so EC is also an option for us."),
    ("R", "20:22", "Great, that opens up quite a few options. May I know your family size and how many bedrooms you need?"),
    ("K", "20:24", "We have 2 kids, 6 and 3 years old. Looking for a 4-bedroom so each kid gets own room plus a study."),
    ("K", "20:25", "Budget around S$1.6M to S$1.8M."),
    ("R", "20:27", "Noted. Any preferred area?"),
    ("K", "20:30", "Prefer east side, Tampines or Pasir Ris. Kids' school and my parents are nearby. Open to EC also."),
    ("K", "20:31", "No rush lah, we plan to move within 2 to 3 years."),
]

kelvin_2 = [
    chip("Yesterday"),
    ("R", "20:34", "Ok sure. Let me put together some options and update you tomorrow. Have a good night!"),
    chip("Today"),
    ("K", "10:05", "Morning Rachel! My wife was asking about Rivelle Tampines and Coastal Cabana. Any 4-bedroom units left?"),
    ("R", "10:12", "Morning Kelvin! Rivelle Tampines is already fully sold out, sorry. But Coastal Cabana EC in Pasir Ris still has 4-bedroom units within your budget."),
    ("R", "10:13", "Would you and your wife like to view the show flat? I can arrange a viewing."),
    ("K", "10:20", "Yes can! We're free next Saturday 24 Oct, afternoon. My wife really wants to see the show flat."),
    ("R", "10:22", "Ok, let's do Sat 24 Oct, 2pm at the Coastal Cabana show flat. I'll confirm the slot with the developer."),
    ("K", "10:25", "Thanks! Can you also send us the 4-bedroom floor plans by Tuesday? Want to study first before the viewing."),
    ("R", "10:27", "Sure, I'll send the floor plans by Tue 20 Oct. I'll also check your HDB MOP status and EC eligibility to make sure everything is in order."),
    ("K", "10:28", "Great, thank you Rachel!"),
]

priya = [
    chip("Today"),
    ("P", "09:02", "Hi Rachel, good morning! Update on my Aurelia Bay unit #15-11."),
    ("P", "09:03", "My lawyer will pay the stamp duty on Wed 21 Oct via CPF. Before the 23 Oct deadline right?"),
    ("R", "09:10", "Morning Priya! Yes, 21 Oct is fine, deadline is 23 Oct. Pls send me the payment confirmation after."),
    ("P", "09:12", "Ok. Another question: can I still change my home loan bank before the 15% downpayment? Got a better rate."),
    ("R", "09:16", "Should be possible if you accept the new bank's Letter of Offer before the 15% downpayment is due. Let me confirm the date."),
    ("R", "09:17", "Do inform your lawyer early, they need time to redo the mortgage docs."),
    ("P", "09:18", "Noted, thanks! Oh ya, my brother Arjun is also looking to buy."),
    ("P", "09:19", "He wants a 2-bedroom investment unit in the city fringe (RCR), around S$1.3M. Can you contact him? +65 9655 3082"),
    ("R", "09:22", "Sure, happy to help! I'll call Arjun on Monday."),
    ("R", "09:23", "And I'll send you a reminder on Tuesday for the stamp duty payment on Wed."),
    ("P", "09:24", "You're the best, thank you Rachel!"),
    ("R", "09:25", "Welcome! Have a nice Sunday :)"),
]

wong = [
    chip("Today"),
    ("W", "14:30", "Hello, is this Rachel from Harbour Realty? I'm Wong Chee Keong, got your number from an investor group."),
    ("R", "14:34", "Hi Mr Wong, yes this is Rachel. How can I help you?"),
    ("W", "14:36", "I'm looking for an investment property for rental. Want good rental yield, must be near MRT."),
    ("W", "14:37", "1 or 2 bedroom is fine. Budget up to S$1.5M."),
    ("R", "14:40", "Noted. May I check your residency status, and do you currently own any property?"),
    ("W", "14:42", "I'm Singapore PR. Already own 1 condo, staying there with my family."),
    ("W", "14:43", "Main worry is the ABSD. How much must I pay?"),
    ("R", "14:46", "ABSD will be significant as a PR buying a 2nd property, I'll calculate exactly for you."),
    ("W", "14:48", "Ok. Looking at Lentor or Jurong Lake District. Heard Lucerne Grand is near MRT."),
    ("R", "14:51", "Both have good rental demand. Can we arrange a call to go through the numbers?"),
    ("W", "14:55", "Wednesday evening ok? After 7pm."),
    ("R", "14:56", "Ok, I'll call you Wed 21 Oct, 7.30pm. Will send the ABSD calculation before that."),
    ("W", "14:57", "Good, thanks."),
]

GOH = ("Goh Boon Kiat", "+65 8352 9146", "GB", (200, 140, 70))  # phone matches seed.json

goh_1 = [
    chip("Today"),
    ("G", "19:02", "Hi Rachel, Boon Kiat here. Hope you're well! Need your help on our Kingsmere Park unit #03-07."),
    ("R", "19:05", "Hi Mr Goh! Of course, what's up?"),
    ("G", "19:08", "We're moving to my wife's parents' place nearby for a while, so we want to rent out our unit from Jan 2027."),
    ("G", "19:09", "Can you help us find a tenant? Thinking of asking around S$6,800 per month, available from 1 Jan 2027."),
    ("R", "19:12", "Sure! S$6,800/month is reasonable for Kingsmere Park. I'll list the unit this week."),
    ("G", "19:14", "Thanks. Unit is quite bare now, need light furnishing: curtains, fridge, washer, beds. Budget around S$15k. You know any vendor?"),
    ("R", "19:16", "Yes, I have a few reliable vendors. I'll send you their contacts on Tuesday."),
    ("G", "19:18", "Also, how do I declare the rental income for tax ah? First time doing this."),
    ("R", "19:21", "You declare it in your income tax return. Since the rent starts in 2027, it goes into YA2028. I'll send you a checklist."),
]

goh_2 = [
    chip("Today"),
    ("G", "19:24", "Great. Sorry ah, very busy month for us."),
    ("G", "19:25", "Michelle's birthday is next month, 12 Nov, want to surprise her. Then our wedding anniversary on 3 Dec."),
    ("G", "19:26", "And Ethan starts Primary 1 at Kingsmere Primary in Jan 2027. He only turns 7 on 3 March but already so excited."),
    ("R", "19:29", "Wah, busy but happy! How's Michelle doing at Harbourline Bank? And Chloe must be 4 already?"),
    ("G", "19:31", "Yes Chloe is 4 now, very cheeky. Michelle still at Harbourline Bank. I'm now Engineering Director at Meridian Microsystems, more meetings than engineering haha"),
    ("R", "19:33", "Congrats! Btw your defects liability period ends 19 Nov, let me know if anything needs fixing before the tenant moves in."),
    ("G", "19:35", "Good reminder. Thanks a lot Rachel, really appreciate it!"),
    ("R", "19:36", "Anytime! I'll list the unit this week and send you the vendor contacts on Tue 20 Oct."),
]


# ---------------------------------------------------------------- generic professional profile page
P_BG = (238, 236, 232)
P_ACCENT = (122, 62, 140)   # plum - deliberately not any real network's brand colour
P_CARD = (255, 255, 255)


def render_profile(filename):
    img = Image.new("RGB", (W, H), P_BG)
    d = ImageDraw.Draw(img)
    status_bar(d, "20:05")
    # app bar
    y = STATUS_H
    d.rectangle([0, y, W, y + 130], fill=(255, 255, 255))
    d.text((40, y + 65), "ProNet profile — DEMO", font=font(46, True), fill=P_ACCENT, anchor="lm")
    d.line([(0, y + 129), (W, y + 129)], fill=DIVIDER, width=2)
    # url bar
    y += 130
    d.rectangle([0, y, W, y + 90], fill=(246, 246, 246))
    d.rounded_rectangle([40, y + 14, W - 40, y + 76], 31, fill=(255, 255, 255), outline=DIVIDER, width=2)
    d.text((W // 2, y + 45), "pronet.example/in/gohboonkiat", font=font(32), fill=META, anchor="mm")
    y += 90

    X0, X1 = 0, W
    PX = 48
    # top card: banner + avatar + name
    banner_h = 120
    d.rectangle([X0, y, X1, y + banner_h], fill=(196, 176, 206))
    r = 120
    ax, ay = PX + r, y + banner_h + 10
    card_top = y + banner_h
    # card body measured later; draw white panel big enough
    d.rectangle([X0, card_top, X1, card_top + 640], fill=P_CARD)
    d.ellipse([ax - r - 8, ay - r - 8, ax + r + 8, ay + r + 8], fill=(255, 255, 255))
    d.ellipse([ax - r, ay - r, ax + r, ay + r], fill=(200, 140, 70))
    d.text((ax, ay), "GB", font=font(90, True), fill=(255, 255, 255), anchor="mm")
    ty = ay + r + 30
    d.text((PX, ty), "Goh Boon Kiat", font=font(62, True), fill=TEXT)
    ty += 80
    for line in wrap("Engineering Director at Meridian Microsystems", font(42), W - 2 * PX):
        d.text((PX, ty), line, font=font(42), fill=TEXT)
        ty += 54
    ty += 6
    d.text((PX, ty), "Singapore", font=font(36), fill=META)
    ty += 50
    d.text((PX, ty), "pronet.example/in/gohboonkiat", font=font(36), fill=P_ACCENT)
    ty += 50
    d.text((PX, ty), "500+ connections", font=font(36, True), fill=P_ACCENT)
    ty += 66
    bw = (W - 2 * PX - 30) // 2
    d.rounded_rectangle([PX, ty, PX + bw, ty + 90], 45, fill=P_ACCENT)
    d.text((PX + bw // 2, ty + 45), "Connect", font=font(40, True), fill=(255, 255, 255), anchor="mm")
    d.rounded_rectangle([PX + bw + 30, ty, W - PX, ty + 90], 45, outline=P_ACCENT, width=4, fill=P_CARD)
    d.text((PX + bw + 30 + bw // 2, ty + 45), "Message", font=font(40, True), fill=P_ACCENT, anchor="mm")
    ty += 90 + 30
    d.rectangle([0, ty, W, H], fill=P_BG)
    y = ty + 20

    def section(title, y, body_fn):
        top = y
        d.rectangle([0, top, W, top + 2000], fill=P_CARD)  # trimmed by next fill
        d.text((PX, top + 30), title, font=font(46, True), fill=TEXT)
        end = body_fn(top + 104)
        if end + 30 < H:
            d.rectangle([0, end + 30, W, H], fill=P_BG)
        return end + 30 + 20

    F_BODY = font(38)
    def about(y):
        txt = ("Engineering leader with 20+ years in semiconductors and embedded systems. "
               "I lead the chip design and validation teams at Meridian Microsystems across Singapore and Penang. "
               "Husband, father of two, weekend cyclist.")
        for line in wrap(txt, F_BODY, W - 2 * PX):
            d.text((PX, y), line, font=F_BODY, fill=TEXT)
            y += 50
        return y

    def entries(items):
        def fn(y):
            for i, (logo, title, org, dates) in enumerate(items):
                d.rounded_rectangle([PX, y, PX + 100, y + 100], 14, fill=(225, 220, 230))
                d.text((PX + 50, y + 50), logo, font=font(40, True), fill=P_ACCENT, anchor="mm")
                tx = PX + 130
                d.text((tx, y), title, font=font(40, True), fill=TEXT)
                d.text((tx, y + 52), org, font=F_BODY, fill=TEXT)
                d.text((tx, y + 100), dates, font=font(34), fill=META)
                y += 162
                if i < len(items) - 1:
                    d.line([(tx, y - 12), (W - PX, y - 12)], fill=DIVIDER, width=2)
            return y - 30
        return fn

    y = section("About", y, about)
    y = section("Experience", y, entries([
        ("MM", "Engineering Director", "Meridian Microsystems", "Jan 2019 – Present · Singapore"),
        ("ND", "Senior Engineering Manager", "Northpoint Devices Pte Ltd", "2010 – 2018 · Singapore"),
        ("LC", "IC Design Engineer", "Lumen Circuits Pte Ltd", "2003 – 2010 · Singapore"),
    ]))
    y = section("Education", y, entries([
        ("NU", "National University of Singapore", "B.Eng. Electrical Engineering", "1999 – 2003"),
    ]))
    # bottom tab bar (generic text labels)
    nav = H - 190
    if y > nav:
        raise SystemExit(f"{filename}: overflows by {y - nav}px")
    d.rectangle([0, nav, W, H], fill=(255, 255, 255))
    d.line([(0, nav), (W, nav)], fill=DIVIDER, width=2)
    labels = ["Home", "Network", "Post", "Alerts", "Jobs"]
    for i, lab in enumerate(labels):
        cx = int(W * (i + 0.5) / len(labels))
        col = P_ACCENT if lab == "Network" else META
        d.rounded_rectangle([cx - 22, nav + 26, cx + 22, nav + 70], 10, outline=col, width=4)
        d.text((cx, nav + 104), lab, font=font(30), fill=col, anchor="mm")
    d.rounded_rectangle([W // 2 - 200, H - 38, W // 2 + 200, H - 26], 6, fill=TEXT)
    path = os.path.join(OUT, filename)
    img.save(path, optimize=True)
    print("wrote", path, f"(free space {nav - y}px)")


if __name__ == "__main__":
    render("chat-new-lead-kelvin-1.png", KELVIN, kelvin_1, "10:29")
    render("chat-new-lead-kelvin-2.png", KELVIN, kelvin_2, "10:30")
    render("chat-existing-priya.png", PRIYA, priya, "09:26")
    render("chat-investor-mr-wong.png", WONG, wong, "14:58")
    render("chat-aftersales-goh-1.png", GOH, goh_1, "19:37")
    render("chat-aftersales-goh-2.png", GOH, goh_2, "19:37")
    render_profile("profile-goh-professional.png")
