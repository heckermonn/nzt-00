"""P4CE 08 RENEW label artwork, generated with PIL.

Every texture is an ink-coverage mask: white RGB, alpha = ink. The Blender
shaders tint it (graphite ink, white ink, frost etch or deboss height), so one
mask serves print, etch and deboss.

Run:  /tmp/claude-0/bpyenv/bin/python labels.py      (writes tex/*.png)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")
TEX = os.path.join(HERE, "tex")
PXMM = 40  # pixels per millimetre of real label

PRODUCTS = {
    "08-1": dict(kind="dropper", name=["VITAMIN C", "SERUM"], qty="30 ML", qty2="1.0 FL OZ"),
    "08-2": dict(kind="dropper", name=["NIACINAMIDE", "SERUM"], qty="30 ML", qty2="1.0 FL OZ"),
    "08-3": dict(kind="jar", name=["CERAMIDE", "CREAM"], qty="50 ML", qty2="1.7 FL OZ"),
    "08-4": dict(kind="bottle", name=["ZINC", "BISGLYCINATE"], qty="90 CAPSULES", qty2=""),
    "08-5": dict(kind="bottle", name=["BIOTIN"], qty="120 TABLETS", qty2=""),
    "08-6": dict(kind="bottle", name=["HYALURONIC", "ACID"], qty="60 CAPSULES", qty2=""),
}


def font(name, size_px):
    return ImageFont.truetype(os.path.join(FONTS, name), int(round(size_px)))


def tracked_width(text, f, track):
    w = 0.0
    for i, ch in enumerate(text):
        w += f.getlength(ch)
        if i < len(text) - 1:
            w += track
    return w


def draw_tracked(d, x, y, text, f, track, fill=255):
    """Draw text with letter-spacing; (x, y) is the left of the cap line."""
    for ch in text:
        d.text((x, y), ch, font=f, fill=fill, anchor="ls")
        x += f.getlength(ch) + track
    return x


def draw_centered(d, cx, y, text, f, track, fill=255):
    w = tracked_width(text, f, track)
    draw_tracked(d, cx - w / 2, y, text, f, track, fill)


def wordmark(d, cx, baseline, cap_px, fill=255, knock=0):
    """P(4)CE: the 4 sits knocked out of a small solid disc, as on the site."""
    f = font("ArchivoExpanded-SemiBold.ttf", cap_px / 0.72)
    track = cap_px * 0.30
    disc = cap_px * 1.22
    f4 = font("ArchivoExpanded-SemiBold.ttf", cap_px * 0.86 / 0.72)
    gap = cap_px * 0.20
    wP = f.getlength("P")
    wCE = tracked_width("CE", f, track)
    total = wP + gap + disc + gap + track * 0.4 + wCE
    x = cx - total / 2
    d.text((x, baseline), "P", font=f, fill=fill, anchor="ls")
    x += wP + gap
    cy = baseline - cap_px / 2
    d.ellipse([x, cy - disc / 2, x + disc, cy + disc / 2], fill=fill)
    d.text((x + disc / 2, cy + cap_px * 0.02), "4", font=f4, fill=knock, anchor="mm")
    x += disc + gap + track * 0.4
    draw_tracked(d, x, baseline, "CE", f, track, fill)


def mm(v):
    return v * PXMM


def label_front(code, w_mm, h_mm, scale=1.0, name_mm=2.1, top_pad=0.0):
    """Centred vertical stack: wordmark, collection line, name, quantity."""
    p = PRODUCTS[code]
    W, H = int(mm(w_mm)), int(mm(h_mm))
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    cx = W / 2
    s = scale
    y = mm(top_pad) + mm(4.2 * s)
    wordmark(d, cx, y, mm(3.0 * s))
    # hairline
    y += mm(4.4 * s)
    d.rectangle([cx - mm(3.0 * s), y, cx + mm(3.0 * s), y + max(2, mm(0.10 * s))], fill=255)
    fm = font("GeistMono-Regular.ttf", mm(1.18 * s) / 0.70)
    y += mm(4.6 * s)
    draw_centered(d, cx, y, "08  RENEW", fm, mm(0.42 * s))
    # product name, lower third
    fn = font("Geist-Medium.ttf", mm(name_mm * s) / 0.70)
    ny = H - mm(17.0 * s) - (len(p["name"]) - 1) * mm(name_mm * 1.65 * s) * 0.0
    lines = p["name"]
    lh = mm(name_mm * 1.65 * s)
    ny = H * 0.60 - (len(lines) - 1) * lh / 2
    for ln in lines:
        trk = mm(0.30 * s) if len(ln) < 11 else mm(0.20 * s)
        draw_centered(d, cx, ny, ln, fn, trk)
        ny += lh
    # quantity + code
    yb = H - mm(5.2 * s)
    draw_centered(d, cx, yb - mm(2.6 * s), p["qty"] + ("   " + p["qty2"] if p["qty2"] else ""), fm, mm(0.36 * s))
    draw_centered(d, cx, yb, "N° " + code, fm, mm(0.36 * s))
    return im


def label_back(code, w_mm, h_mm, scale=1.0):
    """Small mono column for the back of turntable views (no claims)."""
    p = PRODUCTS[code]
    W, H = int(mm(w_mm)), int(mm(h_mm))
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    fm = font("GeistMono-Regular.ttf", mm(1.0 * scale) / 0.70)
    lines = [
        "P4CE / THE RESERVE",
        "COLLECTION 08 RENEW",
        " ".join(p["name"]) ,
        p["qty"],
        "",
        "FOR MEMBERS ONLY",
        "BATCH 0047-A  SAMPLE",
    ]
    y = mm(6 * scale)
    for ln in lines:
        draw_centered(d, W / 2, y, ln, fm, mm(0.30 * scale))
        y += mm(2.1 * scale)
    return im


def to_rgba(mask, blur=0.0):
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur))
    white = Image.new("L", mask.size, 255)
    return Image.merge("RGBA", (white, white, white, mask))


def lid_top(diam_mm):
    """Deboss height map for the jar lid: wordmark + ring of tiny mono text."""
    W = int(mm(diam_mm))
    im = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(im)
    c = W / 2
    wordmark(d, c, c + mm(2.3), mm(4.6))
    return im


def wrap_lid_ring(diam_mm):
    """Fine circular tracked text near the lid edge (laser-etched)."""
    import math
    W = int(mm(diam_mm))
    im = Image.new("L", (W, W), 0)
    fm = font("GeistMono-Regular.ttf", mm(1.05) / 0.70)
    text = "THE RESERVE  ·  08 RENEW  ·  CERAMIDE CREAM  ·  50 ML  ·  N° 08-3  ·  "
    R = mm(diam_mm / 2 - 5.2)
    circ = 2 * math.pi * R
    track = mm(0.35)
    total = tracked_width(text, fm, track)
    a = -math.pi / 2 - (total / circ) * math.pi  # centred on top
    for ch in text:
        cw = fm.getlength(ch)
        ang = a + (cw / 2) / R
        tile = Image.new("L", (int(mm(3)), int(mm(3))), 0)
        td = ImageDraw.Draw(tile)
        td.text((tile.width / 2, tile.height / 2), ch, font=fm, fill=255, anchor="mm")
        tile = tile.rotate(-math.degrees(ang) - 90, resample=Image.BICUBIC)
        x = W / 2 + R * math.cos(ang) - tile.width / 2
        y = W / 2 + R * math.sin(ang) - tile.height / 2
        im.paste(255, (int(x), int(y)), tile)
        a += (cw + track) / R
        if a > -math.pi / 2 + 2 * math.pi - 0.02:
            break
    return im


def emboss_tile(w_mm=104.0, h_mm=144.0, px=10):
    """16-bit relief map: domed capsule (with its seam) plus raised type, after pin #71."""
    import numpy as np
    W, H = int(w_mm * px), int(h_mm * px)
    yy, xx = np.mgrid[0:H, 0:W].astype(float) / px  # mm
    cx, cy = w_mm * 0.40, h_mm * 0.50
    L, r = 66.0, 11.0
    y0, y1 = cy - L / 2 + r, cy + L / 2 - r
    py = np.clip(yy, y0, y1)
    d = np.sqrt((xx - cx) ** 2 + (yy - py) ** 2)
    cap = np.sqrt(np.clip(1 - (d / r) ** 2, 0, 1)) ** 0.8
    seam = np.exp(-((yy - (cy - 4.0)) / 0.35) ** 2) * 0.10 * (d < r)
    cap = np.clip(cap - seam, 0, 1)
    # raised type: vertical "RENEW" + "08", wordmark and a mono line
    tmask = Image.new("L", (H, W), 0)  # drawn rotated, then turned upright
    d2 = ImageDraw.Draw(tmask)
    f = font("ArchivoExpanded-SemiBold.ttf", 9.0 * px / 0.72)
    draw_tracked(d2, 22 * px, (w_mm - 10.0) * px, "RENEW", f, 3.2 * px)
    tmask = tmask.rotate(90, expand=True)
    d3 = ImageDraw.Draw(tmask)
    f08 = font("ArchivoExpanded-SemiBold.ttf", 9.0 * px / 0.72)
    d3.text(((w_mm - 19.0) * px, 18.0 * px), "08", font=f08, fill=255, anchor="ls")
    wordmark(d3, (w_mm * 0.40) * px, (h_mm - 12.0) * px, 3.6 * px)
    fm = font("GeistMono-Medium.ttf", 2.2 * px / 0.70)
    draw_centered(d3, (w_mm * 0.40) * px, 14.0 * px, "THE RESERVE", fm, 0.9 * px)
    t = np.asarray(tmask.filter(ImageFilter.GaussianBlur(px * 0.12)), float) / 255.0
    hmap = np.maximum(cap, t * 0.22)
    im = Image.fromarray((hmap * 65535).astype(np.uint16))
    im.save(os.path.join(TEX, "emboss_tile.png"))
    return im


def main():
    os.makedirs(TEX, exist_ok=True)
    for code, p in PRODUCTS.items():
        if p["kind"] == "dropper":
            front = label_front(code, 25.0, 46.0, scale=0.95, name_mm=2.0)
            back = label_back(code, 25.0, 30.0, scale=0.9)
        elif p["kind"] == "jar":
            front = label_front(code, 34.0, 30.0, scale=0.62, name_mm=2.3)
            back = label_back(code, 34.0, 24.0, scale=0.7)
        else:
            front = label_front(code, 34.0, 56.0, scale=1.12, name_mm=2.3)
            back = label_back(code, 32.0, 34.0, scale=1.0)
        to_rgba(front, 0.6).save(os.path.join(TEX, f"label_{code}_front.png"))
        to_rgba(back, 0.6).save(os.path.join(TEX, f"label_{code}_back.png"))
    lid = lid_top(66.0)
    ring = wrap_lid_ring(66.0)
    from PIL import ImageChops
    both = ImageChops.lighter(lid, ring)
    both.filter(ImageFilter.GaussianBlur(mm(0.06))).save(os.path.join(TEX, "lid_08-3_height.png"))
    emboss_tile()
    print("labels written to", TEX)


if __name__ == "__main__":
    main()


# ---------------------------------------------------------------------------
# v2 labels (after pins #1 and #13): left-aligned grid, text running along the
# pack's axis (reads bottom-to-top when upright, left-to-right when the pack
# lies with its cap to the right), large product name, bracketed tags,
# a batch line marked sample, letterspaced P4CE with a mono 4.
# ---------------------------------------------------------------------------

V2 = {
    "08-1": dict(name=["Vitamin C"], form="SERUM", qty="30 ML", kind="axis"),
    "08-2": dict(name=["Niacinamide"], form="SERUM", qty="30 ML", kind="axis"),
    "08-3": dict(name=["Ceramide", "Cream"], form="CREAM", qty="50 ML", kind="wrap"),
    "08-4": dict(name=["Zinc", "Bisglycinate"], form="CAPSULES", qty="90", kind="axis"),
    "08-5": dict(name=["Biotin"], form="TABLETS", qty="120", kind="axis"),
    "08-6": dict(name=["Hyaluronic", "Acid"], form="CAPSULES", qty="60", kind="axis"),
}


def wordmark2(d, x, baseline, cap_px, fill=255, track_em=0.42):
    """Letterspaced P4CE: P, C, E in Archivo Expanded; the 4 is the coded detail,
    set in Geist Mono (lighter, monospaced) on the same cap line."""
    f = font("ArchivoExpanded-SemiBold.ttf", cap_px / 0.72)
    f4 = font("GeistMono-Regular.ttf", cap_px / 0.70)
    tr = cap_px * track_em
    for ch, ff in (("P", f), ("4", f4), ("C", f), ("E", f)):
        d.text((x, baseline), ch, font=ff, fill=fill, anchor="ls")
        x += ff.getlength(ch) + tr
    return x


def fit_size(text, fontname, cap_mm, max_w_px, capratio=0.70, track=0.0):
    size = mm(cap_mm) / capratio
    while True:
        f = font(fontname, size)
        if tracked_width(text, f, track * size) <= max_w_px or size < 8:
            return f, size * capratio
        size *= 0.96


def label_v2(code, along_mm, across_mm, name_cap=6.0, margin=3.2, rotate=True):
    """Landscape layout (along x across), returned rotated so text runs up the pack."""
    p = V2[code]
    W, H = int(mm(along_mm)), int(mm(across_mm))
    m = mm(margin)
    fb = font("GeistMono-Medium.ttf", mm(1.4) / 0.70)
    fbt = font("GeistMono-Regular.ttf", mm(1.25) / 0.70)
    tags = ["[%s]" % p["form"], "[%s]" % p["qty"]]
    bt = "LOT 0047-A · SAMPLE"
    tags_w = sum(tracked_width(t, fb, mm(0.18)) for t in tags) + mm(1.6) * len(tags)
    bt_w = tracked_width(bt, fbt, mm(0.18))
    batch_inline = m + tags_w + mm(2) + bt_w < W - m
    bottom_top = H - m - mm(1.6) - (0 if batch_inline else mm(3.0))  # top of the bottom block
    lines = p["name"]
    cap = name_cap if len(lines) == 1 else name_cap * 0.82
    while True:
        capu = min(fit_size(ln, "Geist-Light.ttf", cap, W - 2 * m, track=-0.01)[1] for ln in lines)
        y_name0 = m + mm(2.3) + mm(2.0) + mm(2.2)
        y_desc = y_name0 + capu + (len(lines) - 1) * capu * 1.30 + mm(3.4)
        if y_desc + mm(1.0) < bottom_top or cap < 2.5:
            break
        cap *= 0.94
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    y = m + mm(2.3)
    wordmark2(d, m, y, mm(2.3))
    fm = font("GeistMono-Regular.ttf", mm(1.55) / 0.70)
    code_txt = code.replace("-", " — ")
    tw = tracked_width(code_txt, fm, mm(0.25))
    draw_tracked(d, W - m - tw, y, code_txt, fm, mm(0.25))
    y += mm(2.0)
    d.rectangle([m, y, W - m, y + max(2, mm(0.09))], fill=255)
    fN = font("Geist-Light.ttf", capu / 0.70)
    y = y_name0 + capu
    for ln in lines:
        draw_tracked(d, m - capu * 0.04, y, ln, fN, -capu * 0.012)
        y += capu * 1.30
    fs = font("Geist-Regular.ttf", mm(1.5) / 0.70)
    draw_tracked(d, m, y_desc, "Collection 08 \u2014 Renew", fs, mm(0.05))
    yb = H - m
    x = m
    for t in tags:
        x = draw_tracked(d, x, yb, t, fb, mm(0.18)) + mm(1.6)
    if batch_inline:
        draw_tracked(d, W - m - bt_w, yb, bt, fbt, mm(0.18))
    else:
        draw_tracked(d, m, yb - mm(3.0), bt, fbt, mm(0.18))
    if rotate:
        im = im.rotate(90, expand=True)
    return im


def label_v2_back(code, along_mm, across_mm, rotate=True):
    p = V2[code]
    W, H = int(mm(along_mm)), int(mm(across_mm))
    im = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(im)
    m = mm(3.0)
    fm = font("GeistMono-Regular.ttf", mm(1.3) / 0.70)
    rows = ["P4CE / THE RESERVE", "08 RENEW / " + " ".join(p["name"]).upper(), "FOR MEMBERS ONLY",
            "LOT 0047-A  SAMPLE", "EXP --/----  SAMPLE"]
    y = m + mm(1.3)
    for r in rows:
        draw_tracked(d, m, y, r, fm, mm(0.22))
        y += mm(2.6)
    if rotate:
        im = im.rotate(90, expand=True)
    return im


def main_v2():
    os.makedirs(TEX, exist_ok=True)
    specs = {
        # code: (front along, across, name cap, back along, back across)
        "08-1": (44.0, 30.0, 6.4),
        "08-2": (44.0, 30.0, 6.4),
        "08-4": (62.0, 44.0, 8.0),
        "08-5": (62.0, 44.0, 9.0),
        "08-6": (44.0, 44.0, 7.0),
    }
    for code, (al, ac, cap) in specs.items():
        to_rgba(label_v2(code, al, ac, name_cap=cap), 0.5).save(os.path.join(TEX, f"v2_{code}_front.png"))
        to_rgba(label_v2_back(code, al * 0.8, ac * 0.6), 0.5).save(os.path.join(TEX, f"v2_{code}_back.png"))
    # jar: wide and short, so its text runs around the circumference
    to_rgba(label_v2("08-3", 58.0, 30.0, name_cap=5.2, rotate=False), 0.5).save(os.path.join(TEX, "v2_08-3_front.png"))
    to_rgba(label_v2_back("08-3", 50.0, 18.0, rotate=False), 0.5).save(os.path.join(TEX, "v2_08-3_back.png"))
    # jar lying on its side: same panel, text turned to run along the axis so it reads level
    to_rgba(label_v2("08-3", 30.0, 58.0, name_cap=4.4, margin=2.6), 0.5).save(os.path.join(TEX, "v2_08-3_lying.png"))
    # lid: letterspaced wordmark deboss, no disc
    W = int(mm(66.0))
    im = Image.new("L", (W, W), 0)
    d = ImageDraw.Draw(im)
    cap = mm(4.2)
    f = font("ArchivoExpanded-SemiBold.ttf", cap / 0.72)
    f4 = font("GeistMono-Regular.ttf", cap / 0.70)
    tr = cap * 0.42
    tw = sum(ff.getlength(ch) for ch, ff in (("P", f), ("4", f4), ("C", f), ("E", f))) + 3 * tr
    wordmark2(d, W / 2 - tw / 2, W / 2 + cap / 2, cap)
    from PIL import ImageChops
    ring = wrap_lid_ring(66.0)
    ImageChops.lighter(im, ring).filter(ImageFilter.GaussianBlur(mm(0.06))).save(os.path.join(TEX, "v2_lid_08-3_height.png"))
    print("v2 labels written")


if __name__ == "__main__":
    main_v2()
