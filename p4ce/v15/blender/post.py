"""PR6 v12 light passes -> web assets + manifest + contact sheet.

Reads <raw>/<shot>/pass_<group>.exr (linear, denoised), checks additivity against the beauty,
and writes into public/p4ce/v12/assets/light/<shot>/:
  <group>-d.webp, <group>-m.webp   8-bit, sRGB-encoded (linear / scale), one per light group
  poster-d/m.webp                  default mix, tonemapped (same maths the shader uses)
  poster-ink-d/m.webp              the same with the ink up and the keys down (no-WebGL fallback)
  mask-d/m.png                     object index: hero 255 = pack; lineup value = 25 * pack index
then (re)writes manifest.json. Every file is written as *.part and renamed.

  python post.py --raw RAW [--shots tin_hero,...] [--status final] [--sheet PATH]
"""
import argparse
import json
import os
import sys
import time

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets", "light"))
GROUPS = ["key_l", "key_r", "top", "rim", "amb", "ink"]

# default mix (the poster); the site starts from these
DEFAULT_W = {"key_l": 1.0, "key_r": 0.12, "top": 0.18, "rim": 0.25, "amb": 0.5, "ink": 0.0}
INK_W = {"key_l": 0.35, "key_r": 0.06, "top": 0.12, "rim": 0.3, "amb": 0.22, "ink": 1.0}
EXPOSURE = 1.0
SIZES = {"d": 1600, "m": 1024}
LINEUP_SIZES = {"d": 2400, "m": 1366}

TONEMAP_GLSL = (
    "vec3 pbrNeutral(vec3 c){const float s=0.76;const float dsat=0.15;"
    "float x=min(c.r,min(c.g,c.b));float off=x<0.08?x-6.25*x*x:0.04;c-=off;"
    "float p=max(c.r,max(c.g,c.b));if(p<s)return c;const float d=1.0-s;"
    "float np=1.0-d*d/(p+d-s);c*=np/p;float g=1.0-1.0/(dsat*(p-np)+1.0);"
    "return mix(c,vec3(np),g);}"
)


def pbr_neutral(c):
    c = np.maximum(c, 0.0).astype(np.float32)
    x = c.min(-1, keepdims=True)
    off = np.where(x < 0.08, x - 6.25 * x * x, 0.04)
    c = c - off
    p = c.max(-1, keepdims=True)
    s, dsat = 0.76, 0.15
    d = 1.0 - s
    pc = np.maximum(p, s)  # compressed branch only applies above s
    np_ = 1.0 - d * d / (pc + d - s)
    comp = c * (np_ / np.maximum(p, 1e-6))
    g = 1.0 - 1.0 / (dsat * (p - np_) + 1.0)
    comp = comp * (1 - g) + np_ * g
    return np.where(p < s, c, comp)


def to_srgb(lin):
    lin = np.clip(lin, 0.0, 1.0)
    return np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


def from_srgb(v):
    return np.where(v <= 0.04045, v / 12.92, np.power((v + 0.055) / 1.055, 2.4))


_bpy = None


def load_exr(path):
    global _bpy
    if _bpy is None:
        import bpy
        _bpy = bpy
    im = _bpy.data.images.load(path)
    w, h = im.size
    ch = im.channels
    a = np.empty(w * h * ch, np.float32)
    im.pixels.foreach_get(a)
    _bpy.data.images.remove(im)
    a = a.reshape(h, w, ch)[::-1]
    return a[..., :3] if ch >= 3 else a[..., :1]


def resize_lin(a, size):
    """Resize a float HxWx3 image in linear light (Lanczos per channel)."""
    if (a.shape[1], a.shape[0]) == size:
        return a
    chans = [np.asarray(Image.fromarray(a[..., i]).resize(size, Image.LANCZOS)) for i in range(a.shape[2])]
    return np.maximum(np.stack(chans, -1), 0)


def put(path, im, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    ext = os.path.splitext(path)[1][1:]
    part = path + ".part"
    im.save(part, format={"webp": "WEBP", "png": "PNG", "jpg": "JPEG"}[ext], **kw)
    os.replace(part, path)


def u8(x):
    return Image.fromarray((np.clip(x, 0, 1) * 255 + 0.5).astype(np.uint8))


def mix(passes, w, exposure=EXPOSURE):
    acc = sum(passes[g] * w.get(g, 0.0) for g in GROUPS)
    return to_srgb(pbr_neutral(acc * exposure))


def additivity(raw, shot):
    d = os.path.join(raw, shot)
    out = {}
    for pre, b in (("pass_", "beauty"), ("raw_", "raw_beauty")):
        s = sum(load_exr(os.path.join(d, "%s%s.exr" % (pre, g))) for g in GROUPS)
        bb = load_exr(os.path.join(d, b + ".exr"))
        mae = float(np.abs(s - bb).mean())
        out["denoised" if pre == "pass_" else "raw"] = {
            "mae": round(mae, 6), "mean_beauty": round(float(bb.mean()), 5),
            "mae_rel": round(mae / max(1e-9, float(bb.mean())), 6),
            "max_abs": round(float(np.abs(s - bb).max()), 4)}
    return out


def process(raw, shot, status, q):
    d = os.path.join(raw, shot)
    meta = json.load(open(os.path.join(d, "meta.json")))
    passes = {g: load_exr(os.path.join(d, "pass_%s.exr" % g)) for g in GROUPS}
    H, W = passes["key_l"].shape[:2]
    lineup = shot == "lineup" or shot.startswith("shelf_")
    sizes = LINEUP_SIZES if lineup else SIZES
    od = os.path.join(ASSETS, shot)
    entry = {"w": W, "h": H, "product": meta.get("product"), "pack": meta.get("pack"),
             "ink_text": meta.get("ink_text"), "status": status, "passes": {}, "sizes": {}}
    if meta.get("finish"):
        entry["finish"] = meta["finish"]
    dims = {}
    for k, L in sizes.items():
        s = min(1.0, L / max(W, H))
        dims[k] = (max(1, round(W * s)), max(1, round(H * s)))
        entry["sizes"][k] = list(dims[k])
    for g in GROUPS:
        a = passes[g]
        lum = a.max(-1)
        sc = float(np.percentile(lum, 99.85))
        sc = max(sc, float(lum.max()) * 0.02, 1e-4)
        sc = float("%.4g" % sc)
        rec = {"scale": sc}
        for k, dm in dims.items():
            fn = "%s-%s.webp" % (g, k)
            put(os.path.join(od, fn), u8(to_srgb(resize_lin(a, dm) / sc)), quality=q, method=6)
            rec[k] = "%s/%s" % (shot, fn)
        entry["passes"][g] = rec
    entry["poster"], entry["poster_ink"] = {}, {}
    for k, dm in dims.items():
        small = {g: resize_lin(passes[g], dm) for g in GROUPS}
        for nm, w in (("poster", DEFAULT_W), ("poster_ink", INK_W)):
            fn = "%s-%s.webp" % (nm.replace("_", "-"), k)
            put(os.path.join(od, fn), u8(mix(small, w)), quality=min(95, q + 4), method=6)
            entry[nm][k] = "%s/%s" % (shot, fn)
    # masks from the object index pass
    idx = load_exr(os.path.join(d, "index.exr"))[..., 0]
    idx = np.rint(idx).astype(np.int32)
    entry["mask"] = {"encoding": "png8, value = 25 * pack index (0 = set)" if lineup else "png8, 255 = pack, 0 = set"}
    for k, dm in dims.items():
        if lineup:
            m = Image.fromarray(np.clip(idx * 25, 0, 255).astype(np.uint8)).resize(dm, Image.NEAREST)
        else:
            m = Image.fromarray(((idx > 0) * 255).astype(np.uint8)).resize(dm, Image.BILINEAR)
        fn = "mask-%s.png" % k
        put(os.path.join(od, fn), m, optimize=True)
        entry["mask"][k] = "%s/%s" % (shot, fn)
    entry["packs"] = meta.get("packs", [])
    if meta.get("set_box"):
        entry["set_box"] = meta["set_box"]
    entry["additivity"] = additivity(raw, shot)
    entry["render_s"] = meta.get("render_s")
    entry["samples"] = meta.get("samples")
    return entry, passes


def write_manifest(entries):
    path = os.path.join(ASSETS, "manifest.json")
    man = json.load(open(path)) if os.path.exists(path) else {}
    shots = man.get("shots", {})
    shots.update(entries)
    order = ["tin_hero", "pouch_hero", "box_hero", "dropper_hero", "jar_hero", "lineup"]
    shots = {k: shots[k] for k in order + sorted(set(shots) - set(order)) if k in shots}
    man = {
        "version": "pr6-v12-light",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "groups": GROUPS,
        "group_roles": {"key_l": "low raking key from the left (warm)", "key_r": "low raking key from the right (cool)",
                        "top": "soft overhead", "rim": "back rim", "amb": "world / fill",
                        "ink": "emission-only invisible ink on the label (zero in every other group)"},
        "encoding": "srgb8",
        "decode": "linear_i = srgbToLinear(texel_i.rgb) * passes[group].scale",
        "mix": "c = exposure * sum_i(w_i * linear_i); out = linearToSrgb(pbrNeutral(c)) (+ dither)",
        "tonemap": "khronos_pbr_neutral",
        "tonemap_glsl": TONEMAP_GLSL,
        "exposure": EXPOSURE,
        "default_weights": DEFAULT_W,
        "ink_weights": INK_W,
        "notes": ["Passes are additive in linear light: linearise each texel, multiply by its pass scale, then add.",
                  "poster / poster_ink are already tonemapped with exactly this mix (default_weights / ink_weights).",
                  "Mask: hero 255 = pack, 0 = set (use it to seat the pack in the debossed disc or to dim the set); "
                  "lineup value = 25 * pack index (1..9, in packs[] order).",
                  "packs[].box = [x0, y0, x1, y1] in 0..1 image space, origin top-left.",
                  "Hero shots: product = the catalogue id the print and ink describe. Other products of the same "
                  "format reuse the image; their facts must come from the catalogue, not from the picture."],
        "shots": shots,
    }
    part = path + ".part"
    json.dump(man, open(part, "w"), indent=1)
    os.replace(part, path)
    return man


# ------------------------------------------------------------------ contact sheet
def sheet(raw, shots, path):
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf", 15)
    rows = []
    for shot in shots:
        d = os.path.join(raw, shot)
        if not os.path.exists(os.path.join(d, "meta.json")):
            continue
        P = {g: load_exr(os.path.join(d, "pass_%s.exr" % g)) for g in GROUPS}
        H, W = P["key_l"].shape[:2]
        th = 340 if H >= W else 190
        tw = round(W * th / H)
        small = {g: resize_lin(P[g], (tw, th)) for g in GROUPS}
        tiles = []
        for g in GROUPS:  # each pass alone at weight 1 (ink at 1)
            tiles.append((g, u8(to_srgb(pbr_neutral(small[g] * EXPOSURE)))))
        tiles.append(("poster", u8(mix(small, DEFAULT_W))))
        tiles.append(("mix: rake R", u8(mix(small, {"key_r": 1.1, "rim": 0.4, "amb": 0.25, "key_l": 0.05}))))
        tiles.append(("mix: top", u8(mix(small, {"top": 1.1, "amb": 0.5, "rim": 0.2}))))
        tiles.append(("mix: ink", u8(mix(small, INK_W))))
        row = Image.new("RGB", (len(tiles) * (tw + 6) + 6, th + 30), (20, 22, 24))
        dr = ImageDraw.Draw(row)
        for i, (nm, im) in enumerate(tiles):
            row.paste(im, (6 + i * (tw + 6), 24))
            dr.text((6 + i * (tw + 6), 4), ("%s  " % shot if i == 0 else "") + nm, font=font, fill=(220, 225, 228))
        rows.append(row)
    if not rows:
        return
    Wm = max(r.width for r in rows)
    out = Image.new("RGB", (Wm, sum(r.height for r in rows)), (20, 22, 24))
    y = 0
    for r in rows:
        out.paste(r, (0, y))
        y += r.height
    os.makedirs(os.path.dirname(path), exist_ok=True)
    put(path, out, quality=88)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", required=True)
    ap.add_argument("--shots", default="tin_hero,pouch_hero,box_hero,dropper_hero,jar_hero,lineup")
    ap.add_argument("--status", default="final")
    ap.add_argument("--q", type=int, default=92)
    ap.add_argument("--sheet", default="")
    ap.add_argument("--no-assets", action="store_true")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    shots = [s for s in a.shots.split(",") if os.path.exists(os.path.join(a.raw, s, "meta.json"))]
    if not a.no_assets:
        entries = {}
        for s in shots:
            e, _ = process(a.raw, s, a.status, a.q)
            entries[s] = e
            print(s, json.dumps(e["additivity"]), flush=True)
        write_manifest(entries)
    if a.sheet:
        sheet(a.raw, shots, a.sheet)


if __name__ == "__main__":
    main()
