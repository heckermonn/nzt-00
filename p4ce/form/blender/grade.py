"""Cool editorial grade + fine grain for the plates (kit crops and Cycles renders). python3 grade.py SRC OUT WIDTH [crop l t r b as fractions]"""
import sys
import numpy as np
from PIL import Image
src, out, w = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src).convert('RGB')
if len(sys.argv) > 4:
    l, t, r, b = map(float, sys.argv[4:8]); W, H = im.size
    im = im.crop((int(l * W), int(t * H), int(r * W), int(b * H)))
if im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
a = np.asarray(im).astype(np.float32) / 255
lum = a @ np.array([.299, .587, .114])
a = a * 0.55 + lum[..., None] * 0.45                      # pull saturation down
a = a * np.array([0.96, 1.0, 1.04])                        # cool
a = 0.04 + a * 0.93                                       # lift blacks a touch (print, not screen)
g = np.random.default_rng(1).normal(0, 0.022, a.shape[:2])[..., None]
a = np.clip(a + g, 0, 1)
Image.fromarray((a * 255).astype(np.uint8)).save(out, quality=82)
