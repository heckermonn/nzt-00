"""Post: fog backdrop composite, WebP export, manifest."""
import hashlib
import json
import os
import time

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
RENDERS = os.path.normpath(os.path.join(HERE, "..", "assets", "renders"))

FOG = np.array([0xC9, 0xD0, 0xD6], float)
SLATE = np.array([0x6E, 0x7A, 0x84], float)


def fog_backdrop(w, h, horizon=0.62, glow=(0.5, 0.42), seed=7):
    """Misty studio sweep: fog glow behind the object, falling to slate at the floor and corners."""
    y = np.linspace(0, 1, h)[:, None]
    x = np.linspace(0, 1, w)[None, :]
    # vertical: soft fog wall that deepens toward the floor front
    v = np.clip((y - horizon) / (1 - horizon), 0, 1) ** 1.4 * 0.55
    v += np.clip((horizon - y) / horizon, 0, 1) ** 2.0 * 0.18
    # radial glow (light falling on the wall behind)
    ar = w / h
    dx = (x - glow[0]) * ar
    dy = y - glow[1]
    r = np.sqrt(dx * dx + dy * dy)
    g = np.exp(-(r / 0.55) ** 2)
    t = np.clip(v + (1 - g) * 0.42, 0, 1)
    t = t[..., None]
    col = FOG * (1 - t) + SLATE * t
    # light film grain/dither so the web gradient never bands
    rng = np.random.default_rng(seed)
    col += rng.normal(0, 0.9, col.shape)
    return np.clip(col, 0, 255)


def composite_fog(png_rgba, out, **kw):
    im = Image.open(png_rgba).convert("RGBA")
    w, h = im.size
    bg = Image.fromarray(fog_backdrop(w, h, **kw).astype(np.uint8), "RGB").convert("RGBA")
    bg.alpha_composite(im)
    bg = bg.convert("RGB")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if out.endswith(".webp"):
        bg.save(out, "WEBP", quality=90, method=6)
    else:
        bg.save(out)
    return out


def to_webp(png, out, quality=90, alpha_quality=90, size=None):
    im = Image.open(png)
    if size:
        im = im.resize(size, Image.LANCZOS)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, "WEBP", quality=quality, alpha_quality=alpha_quality, method=6)
    return out


def frames_to_webp(src_dir, dst_dir, quality=82, alpha_quality=80):
    os.makedirs(dst_dir, exist_ok=True)
    total = 0
    files = sorted(f for f in os.listdir(src_dir) if f.endswith(".png"))
    for f in files:
        o = os.path.join(dst_dir, f.replace(".png", ".webp"))
        Image.open(os.path.join(src_dir, f)).save(o, "WEBP", quality=quality, alpha_quality=alpha_quality, method=6)
        total += os.path.getsize(o)
    return len(files), total


PRODUCT_META = {
    "08-1": ("Vitamin C Serum", "30 ml", "dropper"),
    "08-2": ("Niacinamide Serum", "30 ml", "dropper"),
    "08-3": ("Ceramide Cream", "50 ml", "jar"),
    "08-4": ("Zinc Bisglycinate", "90 capsules", "bottle"),
    "08-5": ("Biotin", "120 tablets", "bottle"),
    "08-6": ("Hyaluronic Acid", "60 capsules", "bottle"),
    "08-group": ("08 RENEW collection", "", "group"),
    "sculpt-capsule": ("Capsule in recess", "", "sculpture"),
    "sculpt-halo": ("Halo ring", "", "sculpture"),
    "sculpt-halo-motion": ("Halo ring, in motion", "", "sculpture"),
    "sculpt-emboss": ("Embossed clay tile", "", "sculpture"),

}


VIEWS = ("lying", "top", "macro-cap", "macro-label", "stack")


def _version_tag(path):
    """Short content hash of a still, or of every frame of a turntable folder."""
    h = hashlib.sha1()
    files = [path] if os.path.isfile(path) else [os.path.join(path, f) for f in sorted(os.listdir(path))]
    for f in files:
        with open(f, "rb") as fh:
            h.update(fh.read())
    return h.hexdigest()[:8]


MATERIAL = {
    "08-1": "Amber-olive tinted glass, 3 mm wall, 7.5 mm heavy base, glass pipette in the serum, "
            "micro-knurled bead-blasted aluminium collar, black soft-touch bulb, white print",
    "08-2": "Sage tinted glass, 3 mm wall, 7.5 mm heavy base, glass pipette in the serum, "
            "micro-knurled bead-blasted aluminium collar, black soft-touch bulb, white print",
    "08-3": "Heavy satin-frosted glass jar, 6 mm wall, 10 mm base, brushed-steel lid with debossed wordmark",
    "08-4": "Bead-blasted anodised aluminium canister, black pad print, low brushed-steel cap",
    "08-5": "Soft-touch slate body, pale print, low brushed-steel cap",
    "08-6": "Smoked glass bottle, matte silver wrap label, low brushed-steel cap",
    "08-group": "Olive, sage and smoke tinted glass droppers (stack); the six packs (row)",
}
COLOUR_MATERIAL = {
    "smoke": "Smoke tinted glass, 3 mm wall, 7.5 mm heavy base, glass pipette in the serum, "
             "micro-knurled bead-blasted aluminium collar, black soft-touch bulb, white print",
}


def write_manifest():
    """Scan assets/renders and describe every asset for the web builder."""
    assets = []
    for root, dirs, files in os.walk(RENDERS):
        dirs.sort()
        rel_root = os.path.relpath(root, RENDERS)
        webps = sorted(f for f in files if f.endswith(".webp"))
        if rel_root.startswith("turntable") and rel_root != "turntable":
            if not webps:
                continue
            pid = os.path.basename(root)
            first = Image.open(os.path.join(root, webps[0]))
            assets.append(dict(
                type="turntable", product=pid, path=rel_root.replace(os.sep, "/") + "/",
                pattern="f_{000}.webp", frames=len(webps), width=first.size[0], height=first.size[1],
                degrees=360, background="transparent",
                bytes=sum(os.path.getsize(os.path.join(root, f)) for f in webps),
            ))
            continue
        for f in webps:
            p = os.path.join(root, f)
            im = Image.open(p)
            stem = f[:-5]
            parts = stem.split("_")
            pid = parts[0]
            variant = "_".join(parts[1:]) or "hero"
            colour = view = None
            if variant in VIEWS:  # 08-1_lying
                view = variant
            elif "-" in variant and variant.split("-")[-1] in ("hero", "fog"):
                pre = variant.rsplit("-", 1)[0]
                if pre in VIEWS:  # 08-3_top-hero, 08-1_macro-label-fog
                    view = pre
                else:  # 08-1_sage-hero
                    colour = pre
            assets.append(dict(
                type="still", product=pid, variant=variant,
                path=os.path.relpath(p, RENDERS).replace(os.sep, "/"),
                width=im.size[0], height=im.size[1], frames=1,
                background="transparent" if im.mode == "RGBA" else "fog",
                bytes=os.path.getsize(p),
            ))
            if colour:
                assets[-1]["colourway"] = colour
            assets[-1]["view"] = view or "upright"
    for a in assets:
        a["v"] = _version_tag(os.path.join(RENDERS, a["path"]))
        a["url"] = a["path"] + ("?v=" + a["v"] if a["type"] == "still" else "")
        mat = COLOUR_MATERIAL.get(a.get("colourway")) or MATERIAL.get(a["product"])
        if mat:
            a["material"] = mat
        m = PRODUCT_META.get(a["product"])
        if m:
            a["name"], a["quantity"], a["form"] = m
    assets.sort(key=lambda a: (a["product"], a["type"], a.get("variant", "")))
    man = dict(
        collection="08 RENEW", brand="P4CE", art_version=2, generated=time.strftime("%Y-%m-%dT%H:%M:%S"),
        base="assets/renders/", palette=dict(fog="#c9d0d6", slate="#6e7a84"),
        notes="Transparent stills and turntables carry a soft contact shadow in alpha (shadow catcher). "
              "Turntable frames rotate the product 360 deg counter-clockwise seen from above (the front label moves to the right first); frame 0 shows the label front-on. "
              "Each asset has a short content hash in 'v'; append ?v=<v> to the path (stills: 'url') so caches refresh. "
              "view: upright | stack (08-group diagonal stack, the Renew opener) | lying (on its side, cap to the right, transparent, no floor) | top (three-quarter "
              "top-down) | macro-cap | macro-label (detail crops).",
        assets=assets,
    )
    with open(os.path.join(RENDERS, "manifest.json"), "w") as fh:
        json.dump(man, fh, indent=2)
    return man


if __name__ == "__main__":
    m = write_manifest()
    print(len(m["assets"]), "assets")
