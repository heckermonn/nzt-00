"""Contact sheet of every graded image in assets/img/img.json (d versions), labelled with key,
kind, size and licence.  python3 -I contact_sheet.py OUT.jpg"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
V11 = os.path.dirname(HERE)


def main(out):
    data = json.load(open(os.path.join(V11, "assets", "img", "img.json")))
    T = 420
    cols = 6
    keys = list(data)
    rows = (len(keys) + cols - 1) // cols
    LH = 34
    sheet = Image.new("RGB", (cols * T, rows * (T + LH) + 50), (242, 243, 239))
    dr = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 13)
        fb = ImageFont.truetype("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf", 22)
    except OSError:
        f = fb = ImageFont.load_default()
    tot = 0
    for i, k in enumerate(keys):
        r = data[k]
        im = Image.open(os.path.join(V11, r["d"])).convert("RGB")
        tot += os.path.getsize(os.path.join(V11, r["d"])) + os.path.getsize(os.path.join(V11, r["m"]))
        im.thumbnail((T - 8, T - 8))
        x, y = (i % cols) * T, (i // cols) * (T + LH) + 50
        sheet.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2))
        dr.text((x + 6, y + T + 2), "%s  %s  %dx%d" % (k, r["kind"], r["w"], r["h"]), fill=(23, 28, 31), font=f)
        dr.text((x + 6, y + T + 17), r["licence"][:52], fill=(74, 89, 97), font=f)
    dr.text((12, 12), "PR6 v11 imagery  ·  %d images  ·  d+m %.2f MB" % (len(keys), tot / 1e6), fill=(23, 28, 31), font=fb)
    tmp = out + ".part.jpg"
    sheet.save(tmp, quality=84)
    os.replace(tmp, out)
    print(out, sheet.size, "%.2f MB" % (tot / 1e6))


if __name__ == "__main__":
    main(sys.argv[1])
