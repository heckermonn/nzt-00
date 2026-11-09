"""Pack rendered light-group passes for the page.

Each light group is nearly one colour (one lamp colour on grey concrete), so a pass is stored as its luminance plus a
per-pass tint, three passes to one RGB webp. The page decodes v^2.8 / scale, multiplies by the tint, weights and sums.

  /tmp/claude-0/bpyenv/bin/python post.py RAW ../assets/alley alley    (frames f*, d*)
  /tmp/claude-0/bpyenv/bin/python post.py RAW ../assets/inside corridor (frames c*)
Writes <frame>_<k>.webp and manifest.json; skips frames not rendered yet (re-run when more land).
"""
import json, os, sys
import numpy as np
import bpy
from PIL import Image

raw, out, kind = sys.argv[1], sys.argv[2], sys.argv[3]
PACK = {
    "alley": [["amb", "crimson", "wash"], ["steam", "fluor", "haze"], ["sign", "holo", "door"], ["inside"]],
    "corridor": [["amb", "bank1", "bank2"], ["bank3", "bank4", "end"]],
}[kind]
prefix = ("f", "d") if kind == "alley" else ("c",)
GAMMA = 2.8
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)
os.makedirs(out, exist_ok=True)


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


man_p = os.path.join(out, "manifest.json")
man = json.load(open(man_p)) if os.path.exists(man_p) else {"pack": PACK, "frames": {}}
man["pack"] = PACK; man["gamma"] = GAMMA
for fr in sorted(os.listdir(raw)):
    d = os.path.join(raw, fr)
    if not fr.startswith(prefix) or fr.endswith(".part") or not os.path.exists(os.path.join(d, "meta.json")):
        continue
    meta = json.load(open(os.path.join(d, "meta.json")))
    if fr in man["frames"] and man["frames"][fr].get("render_s") == meta.get("render_s") and \
            os.path.exists(os.path.join(out, "%s_0.webp" % fr)):
        continue
    info = dict(meta); info["passes"] = {}
    for k, trio in enumerate(PACK):
        chans = []
        for g in trio:
            rgb = load(os.path.join(d, "pass_%s.exr" % g))
            L = rgb @ LUMA
            tot = L.sum()
            tint = (rgb.reshape(-1, 3).sum(0) / tot).tolist() if tot > 1e-6 else [1, 1, 1]
            hi = float(np.percentile(L, 99.97)) if tot > 1e-6 else 1.0
            scale = 1.0 / max(hi, 1e-4)
            chans.append(np.power(np.clip(L * scale, 0, 1), 1 / GAMMA))
            info["passes"][g] = dict(img=k, ch=len(chans) - 1, scale=round(scale, 6), tint=[round(x, 4) for x in tint])
        while len(chans) < 3:
            chans.append(np.zeros_like(chans[0]))
        im = Image.fromarray((np.stack(chans, -1) * 255 + 0.5).astype(np.uint8))
        im.save(os.path.join(out, "%s_%d.webp" % (fr, k)), "WEBP", quality=86, method=6)
    man["frames"][fr] = info
    print("packed", fr, flush=True)
json.dump(man, open(man_p, "w"), separators=(",", ":"))
