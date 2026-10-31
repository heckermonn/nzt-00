"""PR6 v11 label artwork (v6 copy; FreeSans Bold + DejaVu Sans Mono per DESIGN.md) (PIL). Writes RGBA decals + bump maps into ./tex/.

Each decal is drawn at PX px/mm; the Blender script maps it onto a patch of the
same physical size (see DECALS at the bottom, which build_packs.py imports).
Run: python labels.py  (needs Pillow)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
FONTS = "/usr/share/fonts/truetype"
PX = 40  # px per mm

INK = (23, 28, 31)
CHALK = (242, 243, 239)
ORANGE = (233, 133, 70)
WHITE = (247, 248, 246)


def font(name, cap_mm):
    """Return a font whose cap height is cap_mm."""
    path = os.path.join(FONTS, name)
    probe = ImageFont.truetype(path, 1000)
    b = probe.getbbox("H")
    cap_ratio = (b[3] - b[1]) / 1000.0
    return ImageFont.truetype(path, max(4, int(round(cap_mm * PX / cap_ratio))))


WM = "freefont/FreeSansBold.ttf"
MONO = "dejavu/DejaVuSansMono.ttf"


def text(d, xy_mm, s, f, fill, track_mm=0.0, anchor="ls"):
    """Draw text with tracking. xy is the left baseline in mm."""
    x, y = xy_mm[0] * PX, xy_mm[1] * PX
    if track_mm == 0:
        d.text((x, y), s, font=f, fill=fill, anchor=anchor)
        return d.textlength(s, font=f) / PX
    x0 = x
    for ch in s:
        d.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += d.textlength(ch, font=f) + track_mm * PX
    return (x - x0 - track_mm * PX) / PX


def wordmark(d, x_mm, base_mm, cap_mm, fill):
    """Heavy grotesk PR6 with tight tracking (kit: -2..-3%)."""
    f = font(WM, cap_mm)
    return text(d, (x_mm, base_mm), "PR6", f, fill, track_mm=-cap_mm * 0.035)


def ticks(d, x_mm, top_mm, n, dash_mm, gap_mm, w_mm, fill, accent=ORANGE):
    """Vertical tick scale: n dashes, the last one Safety Orange."""
    y = top_mm
    for i in range(n):
        c = accent if i == n - 1 else fill
        d.rectangle([x_mm * PX, y * PX, (x_mm + w_mm) * PX, (y + dash_mm) * PX], fill=c)
        y += dash_mm + gap_mm


def canvas(w_mm, h_mm, bg=(0, 0, 0, 0)):
    im = Image.new("RGBA", (int(w_mm * PX), int(h_mm * PX)), bg)
    return im, ImageDraw.Draw(im)


def save(im, name):
    os.makedirs(TEX, exist_ok=True)
    im.save(os.path.join(TEX, name))


# ---------------------------------------------------------------- tin (kit p11)
def tin():
    W, H = 64.0, 46.0
    im, d = canvas(W, H)
    ink = INK + (255,)
    x0 = 9.0
    wordmark(d, x0, 24.0, 10.5, ink)
    m = font(MONO, 1.25)
    text(d, (x0 + 0.4, 29.6), "CAPSULES · TABLETS · SOFTGELS", m, ink, track_mm=0.32)
    text(d, (x0 + 0.4, 32.4), "THE PRACTICE OF PROGRESS", m, ink, track_mm=0.32)
    ticks(d, 55.0, 6.0, 6, 2.6, 1.9, 0.42, ink, ORANGE + (255,))
    save(im, "tin_label.png")
    return W, H


# ---------------------------------------------------------------- pouch
def pouch():
    W, H = 92.0, 78.0
    im, d = canvas(W, H)
    # white printed panel, square corners with a hairline inset frame
    d.rectangle([0, 0, W * PX - 1, H * PX - 1], fill=WHITE + (255,))
    ink = INK + (255,)
    wordmark(d, 8.0, 30.0, 16.0, ink)
    m = font(MONO, 1.7)
    text(d, (8.6, 39.0), "THE PRACTICE OF PROGRESS", m, ink, track_mm=0.42)
    d.rectangle([8.0 * PX, 62.0 * PX, (W - 8.0) * PX, 62.0 * PX + 0.25 * PX], fill=ink)
    text(d, (8.6, 69.0), "POWDER", m, ink, track_mm=0.42)
    ticks(d, W - 10.0, 10.0, 6, 3.4, 2.4, 0.55, ink, ORANGE + (255,))
    save(im, "pouch_label.png")
    return W, H


# ---------------------------------------------------------------- box front
def box():
    W, H = 66.0, 108.0
    im, d = canvas(W, H)
    ink = INK + (255,)
    wordmark(d, 7.0, 22.0, 9.0, ink)
    m = font(MONO, 1.25)
    text(d, (7.4, 28.6), "THE PRACTICE", m, ink, track_mm=0.34)
    text(d, (7.4, 31.4), "OF PROGRESS.", m, ink, track_mm=0.34)
    text(d, (7.4, H - 8.0), "SACHETS", m, ink, track_mm=0.34)
    ticks(d, W - 9.0, H - 34.0, 6, 2.2, 1.7, 0.4, ink, ORANGE + (255,))
    save(im, "box_label.png")
    # deboss panel height map (kit p11: debossed bottle outline). 0.5 = surface
    hm = Image.new("L", im.size, 255)
    hd = ImageDraw.Draw(hm)
    r = 3.0 * PX
    hd.rounded_rectangle([30 * PX, 44 * PX, 56 * PX, 92 * PX], radius=r, fill=0)
    hd.rounded_rectangle([36 * PX, 36 * PX, 50 * PX, 46 * PX], radius=1.5 * PX, fill=0)
    hm = hm.filter(ImageFilter.GaussianBlur(0.35 * PX))
    hm.save(os.path.join(TEX, "box_bump.png"))
    return W, H


# ---------------------------------------------------------------- sachet
def sachet():
    W, H = 72.0, 92.0
    im, d = canvas(W, H)
    ink = INK + (255,)
    wordmark(d, 10.0, 30.0, 9.5, ink)
    m = font(MONO, 1.2)
    text(d, (10.4, 36.0), "SACHETS", m, ink, track_mm=0.3)
    text(d, (10.4, 38.8), "THE PRACTICE OF PROGRESS", m, ink, track_mm=0.3)
    ticks(d, W - 14.0, 44.0, 6, 2.4, 1.8, 0.42, ink, ORANGE + (255,))
    save(im, "sachet_label.png")
    # crimp serrations on the 6 mm sealed border (height map)
    hm = Image.new("L", im.size, 128)
    hd = ImageDraw.Draw(hm)
    b = 6.0
    pitch = 0.8
    for i in range(int(W / pitch) + 1):  # top + bottom bands: vertical ridges
        x = i * pitch * PX
        hd.line([(x, 0), (x, b * PX)], fill=230, width=int(0.3 * PX))
        hd.line([(x, (H - b) * PX), (x, H * PX)], fill=230, width=int(0.3 * PX))
    for j in range(int(H / pitch) + 1):  # side bands: horizontal ridges
        y = j * pitch * PX
        hd.line([(0, y), (b * PX, y)], fill=230, width=int(0.3 * PX))
        hd.line([((W - b) * PX, y), (W * PX, y)], fill=230, width=int(0.3 * PX))
    hm = hm.filter(ImageFilter.GaussianBlur(0.12 * PX))
    hm.save(os.path.join(TEX, "sachet_bump.png"))
    return W, H


# ---------------------------------------------------------------- dropper
def dropper():
    W, H = 40.0, 40.0
    im, d = canvas(W, H)
    wh = CHALK + (255,)
    wordmark(d, 6.0, 17.0, 8.0, wh)
    m = font(MONO, 1.05)
    text(d, (6.3, 22.4), "SERUM / 30 ML", m, wh, track_mm=0.26)
    text(d, (6.3, 25.0), "THE PRACTICE OF PROGRESS", m, wh, track_mm=0.26)
    cx, cy, r = 33.0, 10.6, 0.85
    d.ellipse([(cx - r) * PX, (cy - r) * PX, (cx + r) * PX, (cy + r) * PX], fill=ORANGE + (255,))
    save(im, "dropper_label.png")
    return W, H


# ---------------------------------------------------------------- jar
def jar():
    W, H = 56.0, 30.0
    im, d = canvas(W, H)
    ink = INK + (255,)
    wordmark(d, 8.0, 15.0, 8.5, ink)
    m = font(MONO, 1.1)
    text(d, (8.3, 20.0), "CREAM", m, ink, track_mm=0.28)
    text(d, (8.3, 22.6), "THE PRACTICE OF PROGRESS", m, ink, track_mm=0.28)
    ticks(d, 48.0, 4.5, 6, 2.0, 1.5, 0.36, ink, ORANGE + (255,))
    save(im, "jar_label.png")
    return W, H


# ---------------------------------------------------------------- tin lid emboss (v11)
def lid_emboss():
    """Height map for an embossed PR6 on the spun-aluminium lid top (70 x 70 mm, centred)."""
    W = 70.0
    hm = Image.new("L", (int(W * PX), int(W * PX)), 0)
    d = ImageDraw.Draw(hm)
    f = font(WM, 11.0)
    tw = d.textlength("PR6", font=f) / PX
    text(d, (W / 2 - tw / 2 * 0.97, W / 2 + 5.5), "PR6", f, 255, track_mm=-11.0 * 0.035)
    hm = hm.filter(ImageFilter.GaussianBlur(0.22 * PX))
    hm.save(os.path.join(TEX, "lid_emboss.png"))
    return W, W


def build():
    return {"tin": tin(), "pouch": pouch(), "box": box(), "sachet": sachet(),
            "dropper": dropper(), "jar": jar(), "lid": lid_emboss()}


if __name__ == "__main__":
    print(build())
