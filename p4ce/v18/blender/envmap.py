"""PR6 / Institute: pack the Formulary's panorama (rooms.py frame formulary_env) for the page's vials.

  PY envmap.py RAW/formulary_env ../assets/world

  formulary_env.webp    what a vial sees from its stand (equirect, sqrt(linear / 40)): reflections and refraction
  formulary_envd.webp   the same, gathered over the hemisphere around each direction (sqrt(linear / 8)): the light
                        that falls on paper, powder and the cap
"""
import os, sys
import numpy as np, bpy
from PIL import Image


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


def dirs(w, h):
    u = (np.arange(w) + 0.5) / w; v = 1 - (np.arange(h) + 0.5) / h            # v up
    az = (u - 0.5) * 2 * np.pi; el = (v - 0.5) * np.pi
    A, E = np.meshgrid(az, el)
    return np.stack([np.cos(E) * np.sin(A), np.sin(E), np.cos(E) * np.cos(A)], -1), np.cos(E)


x = load(os.path.join(sys.argv[1], "beauty.exr")); out = sys.argv[2]
h, w = x.shape[:2]
Image.fromarray((np.sqrt(np.clip(x / 40, 0, 1)) * 255 + 0.5).astype(np.uint8)).save(os.path.join(out, "formulary_env.webp"), quality=94, method=6)
# irradiance: sum of radiance * cos over the hemisphere, / pi
sw, sh = 128, 64
xs = x.reshape(sh, h // sh, sw, w // sw, 3).mean((1, 3))
D, cosE = dirs(sw, sh); dom = (cosE * (2 * np.pi / sw) * (np.pi / sh))[..., None]
L = (xs * dom).reshape(-1, 3); Dv = D.reshape(-1, 3)
ow, oh = 64, 32
N, _ = dirs(ow, oh)
I = (np.maximum(N.reshape(-1, 3) @ Dv.T, 0) @ L / np.pi).reshape(oh, ow, 3)
print("irradiance max", I.max(), "mean", I.mean())
Image.fromarray((np.sqrt(np.clip(I / 8, 0, 1)) * 255 + 0.5).astype(np.uint8)).save(os.path.join(out, "formulary_envd.webp"), lossless=True)
