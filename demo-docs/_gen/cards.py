"""Generate stylised SPECIMEN identity cards (fictional, not a copy of any real design)."""
import math
import random

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from common import (OUT, HERO_NAME, HERO_NRIC, SARAH_NAME, SARAH_NRIC)

F = "/System/Library/Fonts/Supplemental/"
def font(name, size):
    return ImageFont.truetype(F + name, size)

W, H = 1712, 1080  # ID-1 aspect ratio ~1.586


def guilloche(draw, w, h, c1, c2):
    for k in range(0, 60):
        pts = []
        for x in range(0, w + 8, 8):
            y = h * 0.15 + k * 14 + 22 * math.sin(x / 70.0 + k * 0.35) + 9 * math.sin(x / 23.0 + k)
            pts.append((x, y))
        draw.line(pts, fill=c1 if k % 2 else c2, width=1)


def silhouette(img, box):
    x0, y0, x1, y1 = box
    ph = Image.new("RGB", (x1 - x0, y1 - y0), (214, 216, 220))
    dd = ImageDraw.Draw(ph)
    pw, phh = ph.size
    cx = pw // 2
    dd.ellipse([cx - 95, 90, cx + 95, 300], fill=(150, 154, 160))
    dd.ellipse([cx - 190, 300, cx + 190, phh + 220], fill=(150, 154, 160))
    dd.rectangle([0, 0, pw - 1, phh - 1], outline=(120, 120, 125), width=3)
    img.paste(ph, (x0, y0))


def watermark(img, text="SPECIMEN — DEMO ONLY"):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    wm = Image.new("RGBA", (int(img.width * 1.4), 220), (0, 0, 0, 0))
    dw = ImageDraw.Draw(wm)
    f = font("Arial Black.ttf", 112)
    tw = dw.textlength(text, font=f)
    dw.text(((wm.width - tw) / 2, 20), text, font=f, fill=(200, 20, 30, 90))
    wm = wm.rotate(math.degrees(math.atan2(img.height, img.width)), expand=True, resample=Image.BICUBIC)
    layer.paste(wm, ((img.width - wm.width) // 2, (img.height - wm.height) // 2), wm)
    return Image.alpha_composite(img.convert("RGBA"), layer)


def card(path, name, idno, sex, dob, race, cob, tint):
    img = Image.new("RGB", (W, H), tint[0])
    dr = ImageDraw.Draw(img)
    guilloche(dr, W, H, tint[1], tint[2])
    # header band
    dr.rectangle([0, 0, W, 150], fill=tint[3])
    dr.text((60, 28), "IDENTITY CARD", font=font("Arial Bold.ttf", 66), fill="white")
    dr.text((62, 104), "FICTIONAL SPECIMEN FOR SOFTWARE DEMONSTRATION — NOT AN OFFICIAL DOCUMENT",
            font=font("Arial.ttf", 26), fill=(235, 240, 245))
    # ID number top right
    lab = font("Arial.ttf", 30)
    val = font("Arial Bold.ttf", 52)
    dr.text((1040, 185), "IDENTITY CARD NO.", font=lab, fill=(60, 60, 70))
    dr.text((1040, 222), idno, font=val, fill=(10, 10, 20))
    # photo
    silhouette(img, (70, 200, 520, 780))
    dr = ImageDraw.Draw(img)
    # fields
    x = 600
    y = 320
    rows = [("Name", name), ("Race", race), ("Date of birth", dob), ("Sex", sex), ("Country/Place of birth", cob)]
    for i, (k, v) in enumerate(rows):
        if k == "Sex":
            continue
        dr.text((x, y), k, font=lab, fill=(60, 60, 70))
        dr.text((x, y + 36), v, font=val, fill=(10, 10, 20))
        if k == "Date of birth":
            dr.text((x + 560, y), "Sex", font=lab, fill=(60, 60, 70))
            dr.text((x + 560, y + 36), sex, font=val, fill=(10, 10, 20))
        y += 120
    # footer
    dr.rectangle([0, H - 110, W, H], fill=tint[3])
    dr.text((60, H - 82), "Demo data only • Closing Copilot hackathon • Not valid for identification",
            font=font("Arial.ttf", 32), fill="white")
    out = watermark(img).convert("RGB")
    # rounded corners on white
    mask = Image.new("L", out.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, W - 1, H - 1], radius=60, fill=255)
    bg = Image.new("RGB", out.size, "white")
    bg.paste(out, (0, 0), mask)
    bg.save(path, dpi=(300, 300))
    return bg, mask


def phone_photo(cardimg, mask, path):
    random.seed(7)
    BW, BH = 2400, 1800
    # desk: warm wood-ish gradient with grain
    desk = Image.new("RGB", (BW, BH))
    dd = ImageDraw.Draw(desk)
    for yy in range(BH):
        g = 0.5 + 0.5 * math.sin(yy / 37.0) * 0.25 + 0.15 * math.sin(yy / 9.0)
        base = (int(150 + 30 * g), int(110 + 22 * g), int(72 + 15 * g))
        dd.line([(0, yy), (BW, yy)], fill=base)
    desk = desk.filter(ImageFilter.GaussianBlur(1.2))
    # card + shadow, rotated ~4 deg
    c = cardimg.convert("RGBA")
    c.putalpha(mask)
    scale = 0.95
    c = c.resize((int(W * scale), int(H * scale)), Image.LANCZOS)
    rot = c.rotate(4, expand=True, resample=Image.BICUBIC)
    shadow = Image.new("RGBA", rot.size, (0, 0, 0, 0))
    sa = rot.split()[3].point(lambda a: int(a * 0.45))
    shadow.putalpha(sa)
    shadow = shadow.filter(ImageFilter.GaussianBlur(18))
    px, py = (BW - rot.width) // 2, (BH - rot.height) // 2
    desk.paste(shadow, (px + 25, py + 30), shadow)
    desk.paste(rot, (px, py), rot)
    # lighting vignette
    vig = Image.new("L", (BW, BH), 0)
    ImageDraw.Draw(vig).ellipse([-400, -300, BW + 400, BH + 300], fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(250))
    dark = Image.new("RGB", (BW, BH), (40, 30, 20))
    desk = Image.composite(desk, dark, vig)
    # mild blur + sensor noise
    desk = desk.filter(ImageFilter.GaussianBlur(1.1))
    noise = Image.effect_noise((BW, BH), 18).convert("RGB")
    desk = Image.blend(desk, noise, 0.06)
    desk.save(path, quality=84)


if __name__ == "__main__":
    tint_a = [(236, 242, 246), (205, 222, 232), (222, 214, 232), (32, 78, 120)]
    tint_b = [(246, 238, 240), (232, 210, 216), (214, 222, 236), (130, 40, 70)]
    img, mask = card(f"{OUT}/01-nric-tan-wei-ming.png", HERO_NAME, HERO_NRIC, "M", "14-03-1988", "CHINESE", "SINGAPORE", tint_a)
    phone_photo(img, mask, f"{OUT}/01b-nric-tan-wei-ming-photo.jpg")
    card(f"{OUT}/05-nric-sarah-ong.png", SARAH_NAME, SARAH_NRIC, "F", "02-07-1992", "CHINESE", "MALAYSIA", tint_b)
    print("cards ok", HERO_NRIC, SARAH_NRIC)
