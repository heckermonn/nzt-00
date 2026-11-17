"""PR6 v12 label artwork (PIL): printed artwork, invisible-ink artwork and the lid emboss.

Everything is drawn in millimetres at PX px/mm and wrapped onto the pack by its UVs in
packs.py (print and ink share one mapping, so the ink sits exactly on the printed surface).
Text facts come only from catalog_facts.json (dumped from ../../v11/js/catalog.js).

Outputs (into tex/, git-ignorable, regenerated every run):
  <key>_print.png  RGBA print (ink colour + alpha coverage)
  <key>_ink.png    L    invisible-ink coverage (1 = ink)
  lid_emboss.png   L    height map for the embossed PR6 on the tin lid (0 field .. 1 top)
"""
import json
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
FONTS = "/usr/share/fonts/truetype"
WM = "freefont/FreeSansBold.ttf"
SANS = "freefont/FreeSans.ttf"
MONO = "dejavu/DejaVuSansMono.ttf"

INK = (23, 28, 31)
CHALK = (242, 243, 239)
ORANGE = (233, 133, 70)

FACTS = json.load(open(os.path.join(HERE, "catalog_facts.json")))
PRODUCTS = FACTS["products"]
COLLECTIONS = {c["c"]: c for c in FACTS["collections"]}


# ------------------------------------------------------------------ catalogue text
def per_serving(p):
    s = p["serving"]
    if p.get("conc"):
        return "of formula"
    if s.startswith("1 "):
        return "per " + s[2:]
    if p["g"] == "Powder":
        return "per %s serving" % s
    return "per " + s


def ink_lines(pid, short=False):
    """The pack's real ingredients and amounts per serving, straight from the catalogue."""
    p = PRODUCTS[pid]
    if p.get("conc"):
        rows = ["%s %s" % (n, v) for n, v in p["conc"]]
        if short:
            rows = rows[:2]
        return rows + ["%s · %s" % (per_serving(p), p["q"])]
    acts = p["act"][:2] if short else p["act"]
    rows = []
    for a in acts:
        nm = a["name"] + (" (%s)" % a["form"] if a["form"] and not short else "")
        rows.append("%s %s" % (nm, a["amt"]))
    return rows + ["%s · %s" % (per_serving(p), p["q"])]


def ink_text(pid, short=False):
    return " · ".join(ink_lines(pid, short))


# ------------------------------------------------------------------ drawing helpers
class Canvas:
    def __init__(self, w_mm, h_mm, px, mode="RGBA"):
        self.px = px
        self.w, self.h = w_mm, h_mm
        bg = (0, 0, 0, 0) if mode == "RGBA" else 0
        self.im = Image.new(mode, (int(round(w_mm * px)), int(round(h_mm * px))), bg)
        self.d = ImageDraw.Draw(self.im)

    def font(self, name, cap_mm):
        path = os.path.join(FONTS, name)
        probe = ImageFont.truetype(path, 1000)
        b = probe.getbbox("H")
        ratio = (b[3] - b[1]) / 1000.0
        return ImageFont.truetype(path, max(4, int(round(cap_mm * self.px / ratio))))

    def text(self, x_mm, base_mm, s, f, fill, track_mm=0.0):
        """Left/baseline text with tracking; returns the width in mm."""
        x, y = x_mm * self.px, base_mm * self.px
        if not track_mm:
            self.d.text((x, y), s, font=f, fill=fill, anchor="ls")
            return self.d.textlength(s, font=f) / self.px
        x0 = x
        for ch in s:
            self.d.text((x, y), ch, font=f, fill=fill, anchor="ls")
            x += self.d.textlength(ch, font=f) + track_mm * self.px
        return (x - x0 - track_mm * self.px) / self.px

    def width(self, s, f, track_mm=0.0):
        return (self.d.textlength(s, font=f) + track_mm * self.px * max(0, len(s) - 1)) / self.px

    def wordmark(self, x_mm, base_mm, cap_mm, fill):
        f = self.font(WM, cap_mm)
        return self.text(x_mm, base_mm, "PR6", f, fill, track_mm=-cap_mm * 0.035)

    def rect(self, x0, y0, x1, y1, fill):
        p = self.px
        self.d.rectangle([x0 * p, y0 * p, x1 * p, y1 * p], fill=fill)

    def ticks(self, x_mm, top_mm, n, dash_mm, gap_mm, w_mm, fill, accent):
        y = top_mm
        for i in range(n):
            self.rect(x_mm, y, x_mm + w_mm, y + dash_mm, accent if i == n - 1 else fill)
            y += dash_mm + gap_mm

    def save(self, name):
        os.makedirs(TEX, exist_ok=True)
        self.im.save(os.path.join(TEX, name), optimize=False, compress_level=3)


def mono_block(c, x_mm, top_base_mm, lines, cap_mm, pitch_mm, fill, track=0.06):
    f = c.font(MONO, cap_mm)
    for i, s in enumerate(lines):
        c.text(x_mm, top_base_mm + i * pitch_mm, s, f, fill, track_mm=cap_mm * track)


def pack_label_lines(pid):
    p = PRODUCTS[pid]
    col = COLLECTIONS[p["c"]]
    return "%s / %s" % (p["c"], col["n"].upper()), p["n"].upper(), p["q"].upper()


# ------------------------------------------------------------------ tin: print on the turned body
# canvas = the front arc of the body, TIN_W mm of circumference x TIN_H mm (top = just under the lid)
TIN_W, TIN_H = 150.0, 49.0


def tin(pid, key, fg=INK, short=False):
    c = Canvas(TIN_W, TIN_H, 30)
    fill = fg + (255,)
    a, b, q = pack_label_lines(pid)
    x0 = 46.0
    c.wordmark(x0, 30.0, 11.0, fill)
    m = c.font(MONO, 1.35)
    c.text(x0 + 0.3, 35.6, a, m, fill, track_mm=0.34)
    c.text(x0 + 0.3, 38.6, "%s · %s" % (b, q), m, fill, track_mm=0.34)
    c.ticks(104.0, 9.0, 6, 2.5, 1.9, 0.42, fill, ORANGE + (255,))
    c.save(key + "_print.png")
    # invisible ink: a mono block above the wordmark, aligned to its left edge
    k = Canvas(TIN_W, TIN_H, 30, "L")
    lines = ink_lines(pid, short)
    cap = 2.15 if not short else 2.6
    mono_block(k, x0 + 0.3, 7.4, lines, cap, cap * 1.62, 255)
    k.save(key + "_ink.png")
    return TIN_W, TIN_H


# ------------------------------------------------------------------ pouch: printed film (whole front)
POUCH_W, POUCH_H = 130.0, 190.0


def pouch(pid, key, fg=INK, short=False):
    c = Canvas(POUCH_W, POUCH_H, 22)
    fill = fg + (255,)
    a, b, q = pack_label_lines(pid)
    x0 = 15.0
    c.wordmark(x0, 76.0, 17.0, fill)
    m = c.font(MONO, 1.9)
    c.text(x0 + 0.5, 85.0, a, m, fill, track_mm=0.45)
    c.text(x0 + 0.5, 89.4, b, m, fill, track_mm=0.45)
    c.rect(x0, 150.0, POUCH_W - x0, 150.28, fill)
    c.text(x0 + 0.5, 157.5, "%s · %s" % (PRODUCTS[pid]["g"].upper(), q), m, fill, track_mm=0.45)
    c.ticks(POUCH_W - 17.0, 44.0, 6, 3.4, 2.4, 0.55, fill, ORANGE + (255,))
    c.save(key + "_print.png")
    k = Canvas(POUCH_W, POUCH_H, 22, "L")
    lines = ink_lines(pid, short)
    cap = 2.4 if not short else 3.2
    mono_block(k, x0 + 0.5, 110.0, lines, cap, cap * 1.62, 255)
    k.save(key + "_ink.png")
    return POUCH_W, POUCH_H


# ------------------------------------------------------------------ box front + sachet
BOX_W, BOX_H = 70.0, 115.0


def box(pid, key, short=False):
    from PIL import ImageFilter as IF
    c = Canvas(BOX_W, BOX_H, 26)
    fill = INK + (255,)
    a, b, q = pack_label_lines(pid)
    c.wordmark(8.0, 22.0, 9.0, fill)
    m = c.font(MONO, 1.25)
    c.text(8.4, 28.6, "THE PRACTICE", m, fill, track_mm=0.34)
    c.text(8.4, 31.4, "OF PROGRESS.", m, fill, track_mm=0.34)
    c.text(8.4, BOX_H - 11.0, a, m, fill, track_mm=0.34)
    c.text(8.4, BOX_H - 8.2, "%s · %s" % (b, q), m, fill, track_mm=0.34)
    c.ticks(BOX_W - 10.0, BOX_H - 40.0, 6, 2.2, 1.7, 0.4, fill, ORANGE + (255,))
    c.save(key + "_print.png")
    k = Canvas(BOX_W, BOX_H, 26, "L")
    lines = ink_lines(pid, short)
    cap = 1.45 if not short else 2.0
    mono_block(k, 8.4, 40.0, lines, cap, cap * 1.65, 255)
    k.save(key + "_ink.png")
    # deboss: the sachet outline (kit slide 11), 0 = pressed in, 1 = surface
    hm = Image.new("L", c.im.size, 255)
    hd = ImageDraw.Draw(hm)
    P = c.px
    hd.rounded_rectangle([32 * P, 50 * P, 60 * P, 98 * P], radius=3.0 * P, fill=0)
    hd.rounded_rectangle([39 * P, 41 * P, 53 * P, 52 * P], radius=1.5 * P, fill=0)
    hm = hm.filter(IF.GaussianBlur(0.4 * P))
    hm.save(os.path.join(TEX, key + "_deboss.png"))
    return BOX_W, BOX_H


SACHET_W, SACHET_H = 72.0, 92.0


def sachet(pid, key):
    c = Canvas(SACHET_W, SACHET_H, 22)
    fill = INK + (255,)
    a, b, q = pack_label_lines(pid)
    c.wordmark(11.0, 32.0, 9.5, fill)
    m = c.font(MONO, 1.2)
    c.text(11.4, 38.0, a, m, fill, track_mm=0.3)
    c.text(11.4, 40.8, b, m, fill, track_mm=0.3)
    c.ticks(SACHET_W - 15.0, 44.0, 6, 2.4, 1.8, 0.42, fill, ORANGE + (255,))
    c.save(key + "_print.png")
    # crimp serrations on the 6 mm heat-sealed border
    hm = Image.new("L", c.im.size, 128)
    hd = ImageDraw.Draw(hm)
    P, bw, pitch = c.px, 6.0, 0.8
    for i in range(int(SACHET_W / pitch) + 1):
        x = i * pitch * P
        hd.line([(x, 0), (x, bw * P)], fill=235, width=max(1, int(0.3 * P)))
        hd.line([(x, (SACHET_H - bw) * P), (x, SACHET_H * P)], fill=235, width=max(1, int(0.3 * P)))
    for j in range(int(SACHET_H / pitch) + 1):
        y = j * pitch * P
        hd.line([(0, y), (bw * P, y)], fill=235, width=max(1, int(0.3 * P)))
        hd.line([((SACHET_W - bw) * P, y), (SACHET_W * P, y)], fill=235, width=max(1, int(0.3 * P)))
    hm.filter(ImageFilter.GaussianBlur(0.12 * P)).save(os.path.join(TEX, key + "_crimp.png"))
    return SACHET_W, SACHET_H


# ------------------------------------------------------------------ dropper + jar (print on frosted glass)
DROP_W, DROP_H = 60.0, 44.0


def dropper(pid, key, short=False):
    c = Canvas(DROP_W, DROP_H, 30)
    fill = CHALK + (255,)
    a, b, q = pack_label_lines(pid)
    x0 = 17.0
    c.wordmark(x0, 18.0, 7.5, fill)
    m = c.font(MONO, 1.0)
    c.text(x0 + 0.3, 23.0, a, m, fill, track_mm=0.24)
    c.text(x0 + 0.3, 25.5, b, m, fill, track_mm=0.24)
    c.text(x0 + 0.3, 28.0, PRODUCTS[pid]["q"].upper(), m, fill, track_mm=0.24)
    r = 0.8
    c.d.ellipse([(43 - r) * c.px, (10.4 - r) * c.px, (43 + r) * c.px, (10.4 + r) * c.px], fill=ORANGE + (255,))
    c.save(key + "_print.png")
    k = Canvas(DROP_W, DROP_H, 30, "L")
    lines = ink_lines(pid, short)
    cap = 1.05 if not short else 1.5
    mono_block(k, x0 + 0.3, 32.0, lines, cap, cap * 1.6, 255)
    k.save(key + "_ink.png")
    return DROP_W, DROP_H


JAR_W, JAR_H = 110.0, 34.0


def jar(pid, key, short=False):
    c = Canvas(JAR_W, JAR_H, 30)
    fill = INK + (255,)
    a, b, q = pack_label_lines(pid)
    x0 = 33.0
    c.wordmark(x0, 14.0, 8.0, fill)
    m = c.font(MONO, 1.1)
    c.text(x0 + 0.3, 19.0, a, m, fill, track_mm=0.28)
    c.text(x0 + 0.3, 21.8, "%s · %s" % (b, q), m, fill, track_mm=0.28)
    c.ticks(78.0, 4.0, 6, 1.9, 1.4, 0.36, fill, ORANGE + (255,))
    c.save(key + "_print.png")
    k = Canvas(JAR_W, JAR_H, 30, "L")
    lines = ink_lines(pid, short)
    cap = 1.25 if not short else 1.6
    mono_block(k, x0 + 0.3, 25.6, lines, cap, cap * 1.55, 255)
    k.save(key + "_ink.png")
    return JAR_W, JAR_H


# ------------------------------------------------------------------ embossed PR6 on the spun lid
LID_D = 100.0


def lid_emboss(cap_mm=15.5, px=20):
    """Height map for the stamped PR6: flat-topped letters with soft, rounded flanks."""
    c = Canvas(LID_D, LID_D, px, "L")
    f = c.font(WM, cap_mm)
    tr = -cap_mm * 0.035
    w = c.width("PR6", f, tr)
    c.text(LID_D / 2 - w / 2, LID_D / 2 + cap_mm / 2, "PR6", f, 255, track_mm=tr)
    hm = c.im
    # stamped metal: a plateau with a rounded shoulder (two blurs mixed), no hard step
    a = hm.filter(ImageFilter.GaussianBlur(0.20 * px))
    b = hm.filter(ImageFilter.GaussianBlur(0.55 * px))
    hm = Image.blend(a, b, 0.35)
    hm.save(os.path.join(TEX, "lid_emboss.png"))
    return LID_D


if __name__ == "__main__":
    for pid in ("03-2", "03-1", "04-1", "08-1", "08-3"):
        print(pid, "|", ink_text(pid))
    tin("03-2", "test_tin")
    lid_emboss()
