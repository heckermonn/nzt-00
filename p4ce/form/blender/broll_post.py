"""Encode the b-roll light-group passes for the page: one shared exposure (from the beauty), sRGB 8-bit WebP per pass,
plus a still mix (the fallback image). The page decodes each pass back to linear, tints it and sums (js/broll.js).
  /tmp/claude-0/bpyenv/bin/python broll_post.py RAWDIR OUTDIR [width]"""
import sys, os, json
import numpy as np, bpy
from PIL import Image
raw, out = sys.argv[1], sys.argv[2]; W = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
G = ["key_l", "key_r", "top", "rim", "amb"]
def load(p):
    im = bpy.data.images.load(p); w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]; bpy.data.images.remove(im); return a
P = {g: load(os.path.join(raw, "pass_%s.exr" % g)) for g in G}
beauty = sum(P.values())
lum = beauty @ np.array([.2126, .7152, .0722], np.float32)
exp = 0.30 / np.percentile(lum, 50)  # mid-grey room; highlights may clip per pass
def enc(x):
    x = np.clip(x * exp, 0, 1); x = np.where(x <= .0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - .055)
    return Image.fromarray((x * 255 + .5).astype(np.uint8))
os.makedirs(out, exist_ok=True)
for g in G:
    im = enc(P[g]); im = im.resize((W, round(W * im.height / im.width)), Image.LANCZOS); im.save(os.path.join(out, g + ".webp"), quality=86)
# fallback still: a cool mix like the page's first state
mix = P["key_l"] * np.array([.86, .93, 1.05]) + P["key_r"] * np.array([.55, .62, .72]) + P["top"] * .6 + P["rim"] * np.array([.62, .78, .95]) + P["amb"]
im = enc(mix).resize((W, round(W * beauty.shape[0] / beauty.shape[1])), Image.LANCZOS); im.save(os.path.join(out, "still.webp"), quality=86)
json.dump({"groups": G, "w": W, "h": round(W * beauty.shape[0] / beauty.shape[1])}, open(os.path.join(out, "manifest.json"), "w"))
print("POST ok exp", exp)
