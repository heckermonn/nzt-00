"""PR6 / Institute: pack rendered frames for the page.

  PY post.py RAW_DIR ../assets/scenes     (run again whenever more frames land; finished ones are skipped)

For every frame RAW/<frame>/ (not a crop) this writes
  <frame>_c.webp   the steady light: beauty minus the live light groups, linear * scale, gamma 2.2
  <frame>_x.webp   up to three live light groups as luminance (R, G, B), each with its own scale and tint
  <frame>_z.webp   inverse depth (near / z), for haze and parallax
  <frame>.jpg      a tone-mapped still (the no-WebGL / still-mode picture)
and for every crop RAW/<frame>_med_<sym>/ or RAW/<frame>_slit/ small feathered tiles the page pastes over the frame:
  <frame>_t_<name>_c.webp (RGBA) and <frame>_t_<name>_x.webp, encoded with the frame's own scales,
  and <frame>_t_<name>.webp, the same tile tone-mapped for the still picture.
manifest.json lists it all, with the screen marks and rectangles each scene script recorded.
"""
import json, os, sys
import numpy as np
import bpy
from PIL import Image

raw_root, out = sys.argv[1], sys.argv[2]
GC, GX = 2.2, 2.8
LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)
os.makedirs(out, exist_ok=True)


def load(p):
    im = bpy.data.images.load(p); w, h = im.size; a = np.empty(w * h * im.channels, np.float32)
    im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return np.maximum(a.reshape(h, w, -1)[::-1, :, :3], 0)


def aces(x):
    return np.clip((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0, 1)


def enc(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def pick3(meta):
    """At most three light groups stay live. A close frame has four: the far door's lamp goes into the steady light."""
    ex = list(meta.get("extras", []))
    if len(ex) > 3:
        far = {"L": "lampR", "R": "lampL"}.get(meta.get("side"), "holo")   # the wide frame has no Keeper light
        ex = [g for g in ex if g != far]
    return ex[:3]


man_p = os.path.join(out, "manifest.json")
man = json.load(open(man_p)) if os.path.exists(man_p) else {"frames": {}}
man["gc"] = GC; man["gx"] = GX
dirs = {}
for sub in sorted(os.listdir(raw_root)):
    d = os.path.join(raw_root, sub)
    if os.path.isdir(d):
        for fr in sorted(os.listdir(d)):
            if os.path.exists(os.path.join(d, fr, "meta.json")):
                dirs[fr] = os.path.join(d, fr)

frames = [f for f in dirs if "_med_" not in f and not f.endswith("_slit")]
for fr in frames:
    d = dirs[fr]; meta = json.load(open(os.path.join(d, "meta.json")))
    prev = man["frames"].get(fr)
    if prev and prev.get("render_s") == meta["render_s"] and os.path.exists(os.path.join(out, fr + "_c.webp")):
        info = prev
    else:
        beauty = load(os.path.join(d, "beauty.exr")); ex = pick3(meta)
        passes = [load(os.path.join(d, "pass_%s.exr" % g)) for g in ex]
        base = np.maximum(beauty - sum(passes), 0) if passes else beauty
        hi = float(np.percentile(base.max(-1), 99.6)); sc = 1.0 / max(hi, 1e-4)
        Image.fromarray(enc(np.power(np.clip(base * sc, 0, 1), 1 / GC))).save(os.path.join(out, fr + "_c.webp"), "WEBP", quality=90, method=6)
        info = dict(res=meta["res"], render_s=meta["render_s"], c=dict(scale=round(sc, 6)), marks=meta["marks"], rects=meta["rects"],
                    expo=meta.get("expo", 1.0), fog=meta.get("fog"), fog_d=meta.get("fog_d", 0), x=None, tiles={})
        for k in ("sym", "step", "side"):
            if k in meta:
                info[k] = meta[k]
        if passes:
            chans, xs = [], {}
            for i, (g, rgb) in enumerate(zip(ex, passes)):
                L = rgb @ LUMA; tot = L.sum()
                tint = (rgb.reshape(-1, 3).sum(0) / tot).tolist() if tot > 1e-6 else [1, 1, 1]
                hi = float(np.percentile(L, 99.95)) if tot > 1e-6 else 1.0
                s = 1.0 / max(hi, 1e-4)
                chans.append(np.power(np.clip(L * s, 0, 1), 1 / GX))
                xs[g] = dict(ch=i, scale=round(s, 6), tint=[round(v, 4) for v in tint])
            while len(chans) < 3:
                chans.append(np.zeros_like(chans[0]))
            Image.fromarray(enc(np.stack(chans, -1))).save(os.path.join(out, fr + "_x.webp"), "WEBP", quality=88, method=6)
            info["x"] = xs
        dp = os.path.join(d, "depth.exr")
        if os.path.exists(dp):
            z = load(dp)[..., 0]; z = np.where(z > 1e9, np.nan, z)
            near = float(np.nanpercentile(z, 1.5)); z = np.nan_to_num(z, nan=1e9)
            inv = np.clip(near / np.maximum(z, 1e-6), 0, 1)
            Image.fromarray(enc(inv)).resize((meta["res"] // 2, meta["res"] // 2), Image.BILINEAR).save(os.path.join(out, fr + "_z.webp"), "WEBP", quality=82, method=6)
            info["z"] = dict(near=round(near, 4))
        still = np.power(aces(beauty * info["expo"]), 1 / 2.2)
        Image.fromarray(enc(still)).resize((1000, 1000), Image.LANCZOS).save(os.path.join(out, fr + ".jpg"), quality=84)
        info["_fresh"] = True
        print("packed", fr, flush=True)
    # tiles
    res = info["res"]; done_t = set(info.get("tiles", {}))
    for t in [k for k in dirs if k.startswith(fr + "_med_") or k == fr + "_slit"]:
        tm = json.load(open(os.path.join(dirs[t], "meta.json")))
        key = t[len(fr) + 1:]
        if not info.get("_fresh") and info.get("tile_v", {}).get(key) == 2 and info.get("tile_s", {}).get(key) == tm["render_s"]:
            continue
        b = tm["border"]; x0, y0 = int(round(b[0] * res)), int(round(b[1] * res))
        beauty = load(os.path.join(dirs[t], "beauty.exr")); h, w = beauty.shape[:2]
        ex = pick3(meta)
        passes = [load(os.path.join(dirs[t], "pass_%s.exr" % g)) for g in ex]
        base = np.maximum(beauty - sum(passes), 0) if passes else beauty
        c8 = enc(np.power(np.clip(base * info["c"]["scale"], 0, 1), 1 / GC))
        s8 = enc(np.power(aces(beauty * info["expo"]), 1 / 2.2))      # the same tile for the still picture
        x8 = None
        if passes and info["x"]:
            x8 = enc(np.stack([np.power(np.clip((rgb @ LUMA) * info["x"][g]["scale"], 0, 1), 1 / GX) for g, rgb in zip(ex, passes)], -1))
        # sub-rectangles to cut out of the crop
        if key.startswith("med_"):
            symn = key[4:]
            ks = [k for k in ("L", "R") if ("med" + k) in tm["rects"]]
            if info.get("side"):
                ks = [info["side"]]
            subs = [("med%s_%s" % (k, symn), tm["rects"]["med" + k]) for k in ks]
        else:
            subs = [("slit", tm["rects"]["slit" + info["side"]])]
        for name, (p0, p1) in subs:
            rx0 = max(0, int(np.floor(min(p0[0], p1[0]) * res)) - x0); rx1 = min(w, int(np.ceil(max(p0[0], p1[0]) * res)) - x0)
            ry0 = max(0, int(np.floor(min(p0[1], p1[1]) * res)) - y0); ry1 = min(h, int(np.ceil(max(p0[1], p1[1]) * res)) - y0)
            tw, th = rx1 - rx0, ry1 - ry0
            f = 5
            ax = np.minimum(np.arange(tw) + 1, np.arange(tw)[::-1] + 1) / f; ay = np.minimum(np.arange(th) + 1, np.arange(th)[::-1] + 1) / f
            alpha = enc(np.clip(np.minimum.outer(ay, ax), 0, 1))
            Image.fromarray(np.dstack([c8[ry0:ry1, rx0:rx1], alpha])).save(os.path.join(out, "%s_t_%s_c.webp" % (fr, name)), "WEBP", quality=92, method=6)
            if x8 is not None:
                Image.fromarray(np.dstack([x8[ry0:ry1, rx0:rx1], alpha])).save(os.path.join(out, "%s_t_%s_x.webp" % (fr, name)), "WEBP", quality=92, method=6)
            Image.fromarray(np.dstack([s8[ry0:ry1, rx0:rx1], alpha])).save(os.path.join(out, "%s_t_%s.webp" % (fr, name)), "WEBP", quality=88, method=6)
            info["tiles"][name] = dict(x=x0 + rx0, y=y0 + ry0, w=tw, h=th, hasx=x8 is not None)
        info.setdefault("tile_s", {})[key] = tm["render_s"]; info.setdefault("tile_v", {})[key] = 2
        print("tile", t, flush=True)
    info.pop("_fresh", None)
    man["frames"][fr] = info
json.dump(man, open(man_p, "w"), separators=(",", ":"))
print("frames:", " ".join(sorted(man["frames"])))
