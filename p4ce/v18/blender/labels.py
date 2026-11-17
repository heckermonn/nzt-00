"""PR6 / Institute: the printed label of every record in the sample catalogue (blender/catalog.json, written from
js/catalog.js). One label wraps three fifths of the way round a vial, so only its middle is read from the front:
the record sits there, the series to its left, the handling line to its right.

  python labels.py OUT_DIR [ATLAS.webp]     OUT_DIR/<id>.png for Cycles; the atlas (3 across, 9 down) for the page
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1280, 448                       # 2.86 : 1, the label's own proportion on the vial
PAPER, INK, DIM, RULE, ORANGE = (238, 240, 236), (23, 28, 31), (92, 106, 114), (150, 162, 168), (233, 133, 70)
FD = "/usr/share/fonts/truetype/"
F = lambda name, px: ImageFont.truetype(FD + name, px)
SANS, BOLD, MONO = "freefont/FreeSans.ttf", "freefont/FreeSansBold.ttf", "dejavu/DejaVuSansMono.ttf"
RUO = ["RESEARCH USE ONLY.", "NOT FOR HUMAN OR", "VETERINARY USE."]


def spaced(d, xy, text, font, fill, track=0.0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill); x += d.textlength(ch, font=font) + track
    return x


def label(r):
    im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
    x0, x1 = int(W * 0.30), int(W * 0.70)                      # what faces the reader
    # ---- left: the series
    d.text((int(W * 0.045), 40), r["c"], font=F(SANS, 150), fill=INK)
    spaced(d, (int(W * 0.05), 214), "SERIES", F(MONO, 22), DIM, 5)
    words, line, y = r["field"].upper().split(), "", 252
    for w in words + [None]:
        if w is None or d.textlength((line + " " + w).strip(), font=F(MONO, 22)) > W * 0.2:
            spaced(d, (int(W * 0.05), y), line, F(MONO, 22), INK, 1.5); y += 32; line = w or ""
        else:
            line = (line + " " + w).strip()
    d.line([(x0 - 34, 44), (x0 - 34, H - 44)], fill=RULE, width=2)
    # ---- middle: the record
    d.text((x0, 30), "PR6", font=F(BOLD, 118), fill=INK)
    sx = x0 + d.textlength("PR6", font=F(BOLD, 118)) + 22
    d.line([(sx + 4, 132), (sx + 40, 60)], fill=ORANGE, width=9)   # the kit's one orange stroke
    spaced(d, (x0 + 2, 176), r["id"], F(MONO, 34), INK, 3)
    d.line([(x0, 232), (x1, 232)], fill=INK, width=3)
    spaced(d, (x0 + 2, 250), r["name"].upper(), F(BOLD, 40), INK, 2)
    spaced(d, (x0 + 2, 312), (r["cls"] + " · " + r["form"]).upper(), F(MONO, 20), DIM, 1.2)
    spaced(d, (x0 + 2, 346), (r["size"] + " · " + r["lot"]).upper(), F(MONO, 20), DIM, 1.2)
    # a measured edge: ticks every 2 mm of the real label
    for k in range(0, 41):
        x = x0 + (x1 - x0) * k / 40; d.line([(x, H - 40), (x, H - (28 if k % 5 else 18))], fill=RULE, width=2)
    # ---- right: handling
    d.line([(x1 + 34, 44), (x1 + 34, H - 44)], fill=RULE, width=2)
    y = 56
    for t in RUO:
        spaced(d, (x1 + 62, y), t, F(MONO, 22), INK, 1.5); y += 32
    y += 20
    for t in ("SEALED, CRIMPED", "3 ML GLASS VIAL"):
        spaced(d, (x1 + 62, y), t, F(MONO, 22), DIM, 1.5); y += 32
    spaced(d, (x1 + 62, H - 84), "SAMPLE RECORD", F(MONO, 22), DIM, 5)
    return im


if __name__ == "__main__":
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    recs = json.load(open(os.path.join(HERE, "catalog.json")))
    ims = {}
    for r in recs:
        ims[r["id"]] = label(r); ims[r["id"]].save(os.path.join(out, r["id"] + ".png"))
    if len(sys.argv) > 2:
        cw, ch = 640, 224
        atlas = Image.new("RGB", (cw * 3, ch * 9), PAPER)
        for r in recs:
            atlas.paste(ims[r["id"]].resize((cw, ch), Image.LANCZOS), ((r["i"] - 1) * cw, (int(r["c"]) - 1) * ch))
        atlas.save(sys.argv[2], "WEBP", quality=88, method=6)
        print("atlas", atlas.size, os.path.getsize(sys.argv[2]) // 1024, "KB")
