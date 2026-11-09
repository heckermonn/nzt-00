"""Still for browsers without WebGL: one frame mixed with the page's weights, same tone curve.
  /tmp/claude-0/bpyenv/bin/python poster.py RAW/f05 ../assets/alley/poster.jpg alley
  /tmp/claude-0/bpyenv/bin/python poster.py RAW/c00 ../assets/inside/poster.jpg inside"""
import sys
import numpy as np
import bpy
from PIL import Image

d, out, kind = sys.argv[1:4]
W = {"alley": dict(amb=0.9, crimson=1.0, wash=1.0, steam=0.6, fluor=1.0, haze=1.3, sign=0.8, door=2.2),
     "inside": dict(amb=1, bank1=1, bank2=1, bank3=1, bank4=1, end=1)}[kind]
EXPO = {"alley": 1.0, "inside": 0.6}[kind]


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


acc = sum(load("%s/pass_%s.exr" % (d, g)) * w for g, w in W.items()) * EXPO
x = np.clip((acc * (2.51 * acc + 0.03)) / (acc * (2.43 * acc + 0.59) + 0.14), 0, 1) ** (1 / 2.2)
Image.fromarray((x * 255).astype(np.uint8)).save(out, quality=84, optimize=True, progressive=True)
