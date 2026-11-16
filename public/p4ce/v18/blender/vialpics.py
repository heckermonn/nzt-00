"""PR6 / Institute: the product picture of each record (rooms.py frames formulary_p<series><n>), tone-mapped with the
page's film curve at the Formulary's exposure and written as assets/vials/<record id>.webp.

  PY vialpics.py RAW_DIR ../assets/vials
"""
import json, os, sys
import numpy as np, bpy
from PIL import Image


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


raw, out = sys.argv[1], sys.argv[2]; n = 0
for fr in sorted(os.listdir(raw)):
    d = os.path.join(raw, fr)
    if not fr.startswith("formulary_p") or not os.path.exists(os.path.join(d, "meta.json")):
        continue
    x = load(os.path.join(d, "beauty.exr")) * json.load(open(os.path.join(d, "meta.json"))).get("expo", 0.6)
    x = np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1) ** (1 / 2.2)
    Image.fromarray((x * 255 + 0.5).astype(np.uint8)).save(os.path.join(out, "PR6-C-%s.webp" % fr[-4:]), quality=88, method=6); n += 1
print("pictures", n)
