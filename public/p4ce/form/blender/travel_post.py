"""Crop the travelling-vial frames to one shared box (union of alpha) and write WebP with alpha for the page.
  /tmp/claude-0/bpyenv/bin/python travel_post.py RAWDIR OUTDIR [height] [n]
Missing frames (render still running) are filled with the nearest rendered one. Prints the vial's aspect."""
import os, sys, glob
import numpy as np
from PIL import Image
raw, out = sys.argv[1], sys.argv[2]; H = int(sys.argv[3]) if len(sys.argv) > 3 else 640; N = int(sys.argv[4]) if len(sys.argv) > 4 else 48
have = {int(os.path.basename(p)[2:4]): p for p in glob.glob(os.path.join(raw, "t_*.png"))}
x0 = y0 = 10 ** 9; x1 = y1 = 0
for p in have.values():
    a = np.asarray(Image.open(p))[..., 3]; ys, xs = np.where(a > 8)
    x0, x1, y0, y1 = min(x0, xs.min()), max(x1, xs.max()), min(y0, ys.min()), max(y1, ys.max())
x0 -= 3; y0 -= 3; x1 += 4; y1 += 4
os.makedirs(out, exist_ok=True)
for i in range(N):
    k = min(have, key=lambda j: min(abs(j - i), N - abs(j - i)))
    im = Image.open(have[k]).crop((x0, y0, x1, y1))
    im = im.resize((round(H * im.width / im.height), H), Image.LANCZOS)
    im.save(os.path.join(out, "t_%02d.webp" % i), "WEBP", quality=82, method=6)
print("box", x0, y0, x1, y1, "aspect %.4f" % ((x1 - x0) / (y1 - y0)), "real", len(have))
