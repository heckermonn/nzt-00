"""Tone-map a rendered frame to a PNG to look at (same ACES curve the page uses).
  PY peek.py RAW/<frame> out.png [exposure] [weights e.g. lampL=1,tube=0.4]"""
import os, sys
import numpy as np, bpy
from PIL import Image


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


d, out = sys.argv[1], sys.argv[2]; expo = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0
x = load(os.path.join(d, "beauty.exr"))
if len(sys.argv) > 4:
    for kv in sys.argv[4].split(","):
        k, v = kv.split("="); x = x + (float(v) - 1) * load(os.path.join(d, "pass_%s.exr" % k))
    x = np.maximum(x, 0)
x = x * expo
x = np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1) ** (1 / 2.2)
Image.fromarray((x * 255 + 0.5).astype(np.uint8)).save(out)
