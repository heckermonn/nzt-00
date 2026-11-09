"""Quick look: beauty + every light pass of one rendered frame as a contact sheet.
  /tmp/claude-0/bpyenv/bin/python peek.py RAW/f00 out.jpg [exposure]"""
import os, sys
import numpy as np
import bpy
from PIL import Image

d, out = sys.argv[1], sys.argv[2]
ex = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(h, w, -1)[::-1, :, :3]


def tm(x):
    x = x * ex; x = x / (1 + x * 0.6)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(np.maximum(x, 0), 1 / 2.4) - 0.055)


names = ["beauty"] + sorted(f[5:-4] for f in os.listdir(d) if f.startswith("pass_"))
tiles = []
for nm in names:
    p = os.path.join(d, ("beauty" if nm == "beauty" else "pass_" + nm) + ".exr")
    im = Image.fromarray((np.clip(tm(load(p)), 0, 1) * 255).astype(np.uint8)).resize((360, 360))
    tiles.append((nm, im))
cols = 4; rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * 364, rows * 380), (30, 30, 30))
from PIL import ImageDraw
dr = ImageDraw.Draw(sheet)
for i, (nm, im) in enumerate(tiles):
    x, y = (i % cols) * 364, (i // cols) * 380
    sheet.paste(im, (x, y + 18)); dr.text((x + 4, y + 3), nm, fill=(220, 220, 220))
sheet.save(out, quality=88)
