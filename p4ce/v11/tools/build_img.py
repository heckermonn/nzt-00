"""PR6 v11 image build: crop -> (effects) -> grade.py -> d/m webp + lqip -> assets/img/img.json.

  python3 -I build_img.py [key ...]      (no keys = every entry in sources.json)

sources.json maps key -> {
  src: path to the source (Commons download, kit crop or Blender PNG),
  meta: optional Commons metadata JSON written by commons.py (fills credit/licence/source),
  crop: optional [x0, y0, x1, y1] as fractions of the source,
  aspect: optional w/h; the crop is trimmed (centred on crop) to it,
  preset: grade preset (photo, macro, xray, render, kit, night),
  fx: optional list: "motion" (horizontal motion blur), "mist" (lift + haze), "flip",
  kind, alt, credit, licence, source (for kit and renders) }
Downloads are untrusted: run with python3 -I; this script lives outside the download dir.
"""
import base64
import io
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import grade  # noqa: E402

V11 = os.path.dirname(HERE)
OUT = os.path.join(V11, "assets", "img")
SRC = os.path.join(HERE, "sources.json")
D_LONG, M_LONG = 1800, 900
D_Q, M_Q = 78, 74


def crop(im, spec):
    W, H = im.size
    if spec.get("crop"):
        x0, y0, x1, y1 = spec["crop"]
        im = im.crop((int(x0 * W), int(y0 * H), int(x1 * W), int(y1 * H)))
    if spec.get("aspect"):
        a = spec["aspect"]
        w, h = im.size
        if w / h > a:
            nw = int(h * a)
            im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = int(w / a)
            im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    return im


def motion(im, frac=0.035, angle=0.0):
    """Directional motion blur (length = frac of width), plus a soft bloom of the highlights."""
    import cv2
    a = np.asarray(im, np.float32)
    n = max(3, int(im.size[0] * frac)) | 1
    k = np.zeros((n, n), np.float32)
    k[n // 2, :] = 1.0
    if angle:
        M = cv2.getRotationMatrix2D((n / 2 - 0.5, n / 2 - 0.5), angle, 1.0)
        k = cv2.warpAffine(k, M, (n, n))
    k /= k.sum()
    b = cv2.filter2D(a, -1, k, borderType=cv2.BORDER_REFLECT)
    glow = cv2.GaussianBlur(b, (0, 0), im.size[0] / 120)
    b = b * 0.85 + glow * 0.15
    return Image.fromarray(np.clip(b, 0, 255).astype(np.uint8))


def mist(im, amount=0.18):
    """Atmospheric haze towards Mist, stronger in the shadows."""
    a = np.asarray(im, np.float32) / 255.0
    L = a.mean(axis=2, keepdims=True)
    t = amount * (1 - L * 0.6)
    a = a * (1 - t) + grade.MIST * t
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def glass(im, edge=0.5, side="left"):
    """A frosted pane over part of the frame (kit slide 10): heavy blur, a lift towards Mist,
    a fine frost texture and a lit edge. The rest stays sharp."""
    import cv2
    a = np.asarray(im, np.float32)
    h, w = a.shape[:2]
    b = cv2.GaussianBlur(a, (0, 0), w / 45)
    b = b * 0.78 + (grade.MIST * 255) * 0.22
    rng = np.random.default_rng(7)
    fr = cv2.GaussianBlur(rng.normal(0, 1, (h, w)).astype(np.float32), (0, 0), 1.2)
    b = b + fr[..., None] * 5.0
    sheen = np.linspace(1.04, 0.97, h, dtype=np.float32)[:, None, None]
    b = b * sheen
    x = np.arange(w, dtype=np.float32)
    ex = edge * w
    t = np.clip((ex - x) / 3.0 + 0.5, 0, 1) if side == "left" else np.clip((x - ex) / 3.0 + 0.5, 0, 1)
    t = t[None, :, None]
    out = a * (1 - t) + b * t
    # lit edge + a faint shadow just outside the pane
    line = np.exp(-((x - ex) / 1.4) ** 2)[None, :, None]
    shadow = np.exp(-((x - (ex + (4 if side == "left" else -4))) / 5.0) ** 2)[None, :, None]
    out = out + line * 46.0 - shadow * 10.0
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def fit(im, long_edge):
    w, h = im.size
    s = long_edge / max(w, h)
    return im.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)


def lqip(im):
    t = im.copy()
    t.thumbnail((24, 24))
    t = t.filter(ImageFilter.GaussianBlur(1.2))
    buf = io.BytesIO()
    t.save(buf, "WEBP", quality=40)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()


def credit_from_meta(spec):
    m = json.load(open(spec["meta"]))
    artist = m.get("artist") or "Unknown"
    return {
        "credit": "%s, via Wikimedia Commons" % artist,
        "licence": m["licence"],
        "source": m["page"],
    }


def build(key, spec, seed):
    im = Image.open(spec["src"]).convert("RGB")
    im = crop(im, spec)
    if "flip" in spec.get("fx", []):
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    for bx in spec.get("soften", []):  # blur a third-party mark (e.g. a brand label) in the crop
        W, H = im.size
        box = (int(bx[0] * W), int(bx[1] * H), int(bx[2] * W), int(bx[3] * H))
        from PIL import ImageDraw
        mask = Image.new("L", im.size, 0)
        ImageDraw.Draw(mask).ellipse(box, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(W / 60))
        soft = im.filter(ImageFilter.GaussianBlur(W / 220))
        im = Image.composite(soft, im, mask)
    if max(im.size) > 2400:  # work at a sane size; grain is added after scaling to d
        im = fit(im, 2400)
    if "mist" in spec.get("fx", []):
        im = mist(im, spec.get("mist", 0.18))
    if "motion" in spec.get("fx", []):
        im = motion(im, spec.get("motion", 0.035), spec.get("motion_angle", 0.0))
    if "glass" in spec.get("fx", []):
        im = glass(im, spec.get("glass_edge", 0.5), spec.get("glass_side", "left"))
    d = fit(im, D_LONG) if max(im.size) != D_LONG else im
    d = grade.grade(d, spec.get("preset", "photo"), seed=seed, **spec.get("grade", {}))
    m = fit(d, M_LONG)
    os.makedirs(OUT, exist_ok=True)
    d.save(os.path.join(OUT, key + "-d.webp"), "WEBP", quality=D_Q, method=6)
    m.save(os.path.join(OUT, key + "-m.webp"), "WEBP", quality=M_Q, method=6)
    rec = {
        "d": "assets/img/%s-d.webp" % key,
        "m": "assets/img/%s-m.webp" % key,
        "w": d.size[0], "h": d.size[1],
        "alt": spec["alt"],
        "kind": spec["kind"],
    }
    if spec.get("meta"):
        rec.update(credit_from_meta(spec))
    else:
        rec.update({"credit": spec["credit"], "licence": spec["licence"], "source": spec["source"]})
    rec["lqip"] = lqip(d)
    return rec


def main():
    specs = json.load(open(SRC))
    keys = sys.argv[1:] or list(specs)
    path = os.path.join(OUT, "img.json")
    data = json.load(open(path)) if os.path.exists(path) else {}
    for i, k in enumerate(specs):
        if k not in keys:
            continue
        if not os.path.exists(specs[k]["src"]):
            print("missing source", k, specs[k]["src"])
            continue
        data[k] = build(k, specs[k], seed=i + 1)
        print("built", k, data[k]["w"], data[k]["h"])
    # keep the file in sources.json order, drop keys that no longer exist
    data = {k: data[k] for k in specs if k in data}
    tmp = path + ".part"
    json.dump(data, open(tmp, "w"), indent=1, ensure_ascii=False)
    os.replace(tmp, path)
    tot = sum(os.path.getsize(os.path.join(V11, data[k][v])) for k in data for v in ("d", "m"))
    print("img.json: %d keys, d+m %.2f MB" % (len(data), tot / 1e6))


if __name__ == "__main__":
    main()
