"""PR6 v6: turn raw Cycles PNGs into web assets + manifest.json.

  python finalize.py --raw /tmp/pr6raw [--q 85] [--tq 80]

- {pack}_hero.webp   transparent (shadow in alpha), 1600x2000
- {pack}_mist.webp   the hero composited over a Mist #CAD5DA -> Chalk #F2F3EF studio sweep
- turntable/{pack}_NN.webp  24 transparent frames, 800x1000
Writes ../assets/renders/manifest.json.
"""
import argparse
import datetime
import hashlib
import json
import math
import os
import random

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "renders"))
PACKS = ["tin", "pouch", "box", "dropper", "jar"]
MIST = (0xCA, 0xD5, 0xDA)
CHALK = (0xF2, 0xF3, 0xEF)
MATERIAL = {
    "tin": "Brushed aluminium round tin (70 mm x 80 mm), spun satin lid, Ink print, Safety Orange tick",
    "pouch": "Brushed silver foil stand-up pouch, heat-sealed top with tear notch and zip, white printed label panel",
    "box": "White matte carton with debossed panel and orange pull tab, two foil sachets leaning on the front",
    "dropper": "Frosted steel-blue glass 30 ml dropper bottle, black ribbed collar and bulb, white print",
    "jar": "Thick frosted glass cream jar, brushed aluminium spun lid, Ink print",
}
FORMATS = {"Capsules": "tin", "Tablets": "tin", "Softgels": "tin", "Powder": "pouch",
           "Sachets": "box", "Serum": "dropper", "Cream": "jar"}


def load(p):
    im = Image.open(p)
    if im.mode not in ("RGBA",):
        im = im.convert("RGBA")
    return im


EDGE0, EDGE1 = 0.065, 0.20  # shadow alpha is 0 within 6.5% of every edge, full from 20% in


def edge_mask(w, h):
    """Feathered rounded-rect: 0 at EDGE0 inside each edge, 1 from EDGE1 inwards."""
    def ramp(n):
        t = np.minimum(np.arange(n) + 0.5, n - np.arange(n) - 0.5) / n
        s = np.clip((t - EDGE0) / (EDGE1 - EDGE0), 0, 1)
        return s * s * (3 - 2 * s)
    return np.outer(ramp(h), ramp(w))


def clean_alpha(im, mask_path):
    """Keep the object's own alpha; fade the shadow-catcher alpha out towards the edges
    and drop faint (<6/255) shadow alpha, so no faint rectangle shows on the page."""
    a = np.asarray(im, dtype=np.float32).copy()
    alpha = a[..., 3]
    if os.path.exists(mask_path):
        obj = np.asarray(Image.open(mask_path).convert("RGBA"), dtype=np.float32)[..., 3] / 255.0
        # grow the object mask by 1 px so anti-aliased rims stay intact
        g = obj.copy()
        g[1:, :] = np.maximum(g[1:, :], obj[:-1, :])
        g[:-1, :] = np.maximum(g[:-1, :], obj[1:, :])
        g[:, 1:] = np.maximum(g[:, 1:], obj[:, :-1])
        g[:, :-1] = np.maximum(g[:, :-1], obj[:, 1:])
        obj = g
    else:
        obj = (alpha > 250).astype(np.float32)
    shadow = alpha * (1 - obj)
    shadow = np.where(shadow < 6, 0, shadow) * edge_mask(alpha.shape[1], alpha.shape[0])
    a[..., 3] = np.clip(alpha * obj + shadow, 0, 255)
    a[..., 3] = np.where(a[..., 3] < 1, 0, a[..., 3])
    return Image.fromarray(np.round(a).astype(np.uint8), "RGBA")


def sweep(w, h, seed=6):
    """Soft studio sweep: Mist at the top easing to Chalk on the floor, with a faint
    glow behind the object and a whisper of grain to stop webp banding."""
    bg = Image.new("RGB", (w, h))
    px = bg.load()
    rnd = random.Random(seed)
    cx, cy = w * 0.5, h * 0.46
    for y in range(h):
        t = y / (h - 1)
        # smoothstep from 0.15 to 0.85 of height
        s = min(1.0, max(0.0, (t - 0.12) / 0.73))
        s = s * s * (3 - 2 * s)
        base = [MIST[i] + (CHALK[i] - MIST[i]) * s for i in range(3)]
        for x in range(w):
            d = math.hypot((x - cx) / (w * 0.75), (y - cy) / (h * 0.6))
            g = max(0.0, 1 - d) ** 2 * 0.35
            n = rnd.random() - 0.5
            px[x, y] = tuple(int(round(base[i] + (CHALK[i] - base[i]) * g + n)) for i in range(3))
    return bg


def h8(paths):
    m = hashlib.sha1()
    for p in paths:
        with open(p, "rb") as f:
            m.update(f.read())
    return m.hexdigest()[:8]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default="/tmp/pr6raw")
    ap.add_argument("--q", type=int, default=85)
    ap.add_argument("--tq", type=int, default=80)
    ap.add_argument("--packs", default=",".join(PACKS))
    a = ap.parse_args()
    os.makedirs(os.path.join(OUT, "turntable"), exist_ok=True)
    times = {}
    tp = os.path.join(a.raw, "times.json")
    if os.path.exists(tp):
        times = json.load(open(tp))
    bg_cache = {}
    for pack in a.packs.split(","):
        hp = os.path.join(a.raw, "%s_hero.png" % pack)
        if os.path.exists(hp):
            im = clean_alpha(load(hp), hp[:-4] + "_mask.png")
            im.save(os.path.join(OUT, "%s_hero.webp" % pack), "WEBP", quality=a.q, method=6, exact=False)
            if im.size not in bg_cache:
                bg_cache[im.size] = sweep(*im.size)
            mist = bg_cache[im.size].copy().convert("RGBA")
            mist.alpha_composite(im)
            mist.convert("RGB").save(os.path.join(OUT, "%s_mist.webp" % pack), "WEBP", quality=a.q, method=6)
        for f in range(24):
            fp = os.path.join(a.raw, "turntable", "%s_%02d.png" % (pack, f))
            if os.path.exists(fp):
                clean_alpha(load(fp), fp[:-4] + "_mask.png").save(
                    os.path.join(OUT, "turntable", "%s_%02d.webp" % (pack, f)), "WEBP", quality=a.tq, method=6)

    assets = []
    for pack in PACKS:
        for variant, bgname in (("hero", "transparent"), ("mist", "mist-chalk sweep")):
            rel = "%s_%s.webp" % (pack, variant)
            p = os.path.join(OUT, rel)
            if not os.path.exists(p):
                continue
            w, h = Image.open(p).size
            v = h8([p])
            assets.append({"type": "still", "pack": pack, "variant": variant, "path": rel,
                           "width": w, "height": h, "frames": 1, "background": bgname,
                           "view": "upright three-quarter", "bytes": os.path.getsize(p),
                           "v": v, "url": rel + "?v=" + v, "material": MATERIAL[pack],
                           "render_seconds": times.get("%s_hero" % pack)})
        frames = ["turntable/%s_%02d.webp" % (pack, f) for f in range(24)]
        fps = [os.path.join(OUT, f) for f in frames]
        if all(os.path.exists(f) for f in fps):
            w, h = Image.open(fps[0]).size
            v = h8(fps)
            assets.append({"type": "turntable", "pack": pack, "variant": "turntable",
                           "path": "turntable/", "pattern": pack + "_{NN}.webp", "frames": 24,
                           "degrees": 360, "step_degrees": 15, "width": w, "height": h,
                           "background": "transparent", "bytes": sum(os.path.getsize(f) for f in fps),
                           "v": v, "url": frames[0] + "?v=" + v,
                           "frame_urls": [f + "?v=" + v for f in frames],
                           "material": MATERIAL[pack],
                           "render_seconds": times.get("%s_turntable" % pack)})
    man = {
        "brand": "PR6",
        "generated": datetime.datetime.now().replace(microsecond=0).isoformat(),
        "base": "assets/renders/",
        "renderer": "Blender 5.2 Cycles (CPU), OpenImageDenoise",
        "notes": ("Stills: 'hero' is transparent with a soft contact shadow in alpha (shadow catcher), faded to 0 "
                  "at least 6.5% inside every edge; "
                  "'mist' is the same render over a Mist #CAD5DA -> Chalk #F2F3EF sweep. Turntable frames are "
                  "transparent and use the same camera as the hero (frame 00 = the hero at 800x1000), then the pack turns 15 deg per frame counter-clockwise "
                  "seen from above (the front moves to the right first). Append ?v=<v> (see 'url') so caches refresh. "
                  "Scripts: blender/build_packs.py, blender/labels.py, blender/finalize.py."),
        "palette": {"chalk": "#F2F3EF", "ink": "#171C1F", "mist": "#CAD5DA", "steel_blue": "#718B9A",
                    "safety_orange": "#E98546"},
        "formats": FORMATS,
        "packs": PACKS,
        "assets": assets,
    }
    with open(os.path.join(OUT, "manifest.json"), "w") as f:
        json.dump(man, f, indent=1)
    total = 0
    for root, _, files in os.walk(OUT):
        total += sum(os.path.getsize(os.path.join(root, x)) for x in files)
    print("assets:", len(assets), "total bytes:", total)


if __name__ == "__main__":
    main()
