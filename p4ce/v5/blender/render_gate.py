"""Render the P4CE v5 gate set and publish it to ../assets/gate/.

  PY=/tmp/claude-0/bpyenv/bin/python
  $PY render_gate.py render land closed                 # one still -> scratch PNG
  $PY render_gate.py render land open --frames 0:28     # sequence (resumes; existing PNGs are skipped)
  $PY render_gate.py render port all                    # closed + slot + every open frame
  $PY render_gate.py publish                            # PNG -> WebP q82, measure slot + light, manifest.json
  $PY render_gate.py preview land --out DIR            # post-processed contact sheet of a scratch folder
  $PY render_gate.py solve-light EEEBE5                 # print the linear RGB AgX shows as that hex

Options: --samples N (stills, default 40), --seq-samples N (open frames, default 16), --scale P (fixed res %, look-dev), --n N (frame count, default 28),
         --out DIR (scratch root, default /tmp/claude-0/p4ce-gate), --force (re-render existing PNGs).
"""
import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

ASSETS = os.path.normpath(os.path.join(HERE, "..", "assets", "gate"))
SCRATCH = "/tmp/claude-0/p4ce-gate"
NFRAMES = 28


def setup(orient, samples, scale):
    import bpy
    import build_gate as G
    import common as C
    C.reset()
    w, h = G.RIGS[orient]["res"]
    sc = C.setup_render(w, h, samples=samples, transparent=False, threads=4, look=G.LOOK,
                        exposure=G.EXPOSURE, adaptive=0.03)
    cy = sc.cycles
    cy.seed = 7                     # fixed seed, not animated: noise is identical frame to frame
    cy.use_animated_seed = False
    cy.max_bounces = 8
    cy.diffuse_bounces = 2
    cy.glossy_bounces = 3
    cy.transmission_bounces = 2
    cy.transparent_max_bounces = 4
    cy.volume_bounces = 0
    cy.sample_clamp_indirect = 6.0
    cy.blur_glossy = 1.0
    cy.film_transparent_glass = False
    try:
        cy.volume_step_rate = 1.0
        cy.volume_max_steps = 256
    except Exception:
        pass
    sc.render.resolution_percentage = scale
    sc.render.image_settings.color_depth = "16"
    sc.render.film_transparent = False
    # persistent data left a black frame once the camera crossed into the light volume; resync each frame
    sc.render.use_persistent_data = False
    return G.build(orient)


def frame_scale(k, n):
    """Render resolution per open frame. The door swing (camera still) is full res; the dolly frames are
    motion-blurred, and the tail is near-uniform light, so they render smaller and publish upsamples them."""
    u = k / (n - 1)
    if u < 0.27:
        return 100
    if u < 0.72:
        return 70
    return 50


def render_one(h, path):
    import common as C
    t = time.time()
    C.render_to(path)
    dt = time.time() - t
    print(f"RENDERED {path} {dt:.1f}s", flush=True)
    return dt


def cmd_render(a):
    import build_gate as G
    h = setup(a.orient, a.samples, a.scale)
    root = os.path.join(a.out, a.orient)
    jobs = []
    if a.what in ("closed", "all"):
        jobs.append(("closed", 0, os.path.join(root, "closed.png")))
    if a.what in ("slot", "all"):
        jobs.append(("slot", 0, os.path.join(root, "slot.png")))
    if a.what in ("open", "all"):
        f0, f1 = 0, a.n
        if a.frames:
            parts = a.frames.split(":")
            f0, f1 = int(parts[0]), int(parts[1]) if len(parts) > 1 else int(parts[0]) + 1
        step = a.step or 1
        for k in range(f0, f1, step):
            if k == 0 and not a.scale_fixed:
                continue  # f_000 is closed.png (same pose, same settings); publish copies it
            jobs.append(("open", k, os.path.join(root, "open", f"f_{k:03d}.png")))
    times = {}
    sc = h["scene"]
    for state, k, path in jobs:
        if os.path.exists(path) and not a.force:
            print("skip", path)
            continue
        if a.scale_fixed:
            sc.render.resolution_percentage = a.scale
            sc.cycles.samples = a.samples
        elif state == "open":
            sc.render.resolution_percentage = frame_scale(k, a.n)
            sc.cycles.samples = a.seq_samples
        else:
            sc.render.resolution_percentage = 100
            sc.cycles.samples = a.samples
        info = G.pose(h, state, k, a.n)
        print(state, k, info, flush=True)
        times[os.path.relpath(path, root)] = round(render_one(h, path), 1)
    log = os.path.join(root, "times.json")
    old = json.load(open(log)) if os.path.exists(log) else {}
    old.update(times)
    os.makedirs(root, exist_ok=True)
    json.dump(old, open(log, "w"), indent=1)


# ---------------------------------------------------------------------------
# publish
# ---------------------------------------------------------------------------

def _box1d(a, r, axis):
    import numpy as np
    if r < 1:
        return a
    pad = [(0, 0)] * a.ndim
    pad[axis] = (r + 1, r)
    c = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def _blur(a, sigma):
    """Gaussian-ish blur (3 box passes) at reduced resolution, for the wide glow."""
    import numpy as np
    from PIL import Image
    H, W = a.shape[:2]
    f = max(1, int(sigma // 6))
    small = np.stack([np.asarray(Image.fromarray(a[..., i]).resize((W // f, H // f), Image.BILINEAR))
                      for i in range(a.shape[2])], -1)
    r = max(1, int(round(sigma / f * 0.8)))
    for _ in range(3):
        small = _box1d(_box1d(small, r, 0), r, 1)
    return np.stack([np.asarray(Image.fromarray(small[..., i]).resize((W, H), Image.BILINEAR))
                     for i in range(a.shape[2])], -1)


def post(src, dolly=0.0, mist=0.55, thresh=0.30, vignette=0.30):
    """Photographic finish, energy-neutral on flat fields:
    - diffusion (a Pro-Mist): light above `thresh` (linear) is redistributed into a wide halo
      (out = lin + mist * (blur(hl) - hl)), so bright light blooms over dark edges while blacks stay black
      and a uniform frame is left exactly as rendered;
    - lens vignette that fades out as the camera enters the light (the last frame stays uniform)."""
    import numpy as np
    from PIL import Image
    im = Image.open(src)
    a = np.asarray(im).astype(np.float32)
    a = a / (65535.0 if a.max() > 255.5 else 255.0)
    a = a[..., :3]
    lin = np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4).astype(np.float32)
    H, W = lin.shape[:2]
    hl = np.maximum(lin - thresh, 0.0)
    g = 0.6 * _blur(hl, 0.008 * max(W, H)) + 0.4 * _blur(hl, 0.04 * max(W, H))
    lin = np.maximum(lin + mist * (g - hl), 0.0)
    t = min(1.0, max(0.0, (dolly - 0.30) / 0.30))
    v = vignette * (1.0 - t * t * (3 - 2 * t))  # gone before the camera reaches the doorway
    if v > 0:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        r2 = ((xx - W / 2) / (W / 2)) ** 2 * 0.55 + ((yy - H / 2) / (H / 2)) ** 2 * 0.45
        lin *= (1.0 - v * np.clip(r2, 0, 1.6) ** 1.25)[..., None]
    out = np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(np.clip(lin, 0, None), 1 / 2.4) - 0.055)
    return Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")


def _to_webp(src, dst, q=82, dolly=0.0, size=None):
    from PIL import Image
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = post(src, dolly)
    if size and im.size != tuple(size):
        im = im.resize(tuple(size), Image.LANCZOS)
    im.save(dst, "WEBP", quality=q, method=6)


def _slot_rect(closed_png, slot_png):
    """Measure the slot opening from the renders: where closed and slot differ (the plate leaves, the hood
    shows), then the tight bbox of the dark region inside it."""
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(closed_png).convert("RGB")).astype(np.float32)
    b = np.asarray(Image.open(slot_png).convert("RGB")).astype(np.float32)
    H, W, _ = a.shape
    diff = np.abs(a - b).max(axis=2)
    mask = diff > 18
    # keep the largest connected blob (the opening); a cheap flood via bbox of dense rows/cols
    rows = np.where(mask.sum(axis=1) > max(3, 0.25 * mask.sum(axis=1).max()))[0]
    cols = np.where(mask.sum(axis=0) > max(2, 0.25 * mask.sum(axis=0).max()))[0]
    y0, y1, x0, x1 = rows.min(), rows.max() + 1, cols.min(), cols.max() + 1
    # the plate sits 4 mm inside the opening; grow to the full dark opening (the shadow gap is dark in both)
    lum = b.mean(axis=2)
    inner = np.median(lum[y0:y1, x0:x1])
    dark = lum < inner + 0.5 * (np.median(lum[max(0, y0 - 12):y0 - 6, x0:x1]) - inner)  # halfway to the bezel
    pad = 6
    sub = dark[y0 - pad:y1 + pad, x0 - pad:x1 + pad]
    rr = np.where(sub.mean(axis=1) > 0.6)[0]
    cc = np.where(sub.mean(axis=0) > 0.6)[0]
    if len(rr) and len(cc):
        y0, y1 = y0 - pad + rr.min(), y0 - pad + rr.max() + 1
        x0, x1 = x0 - pad + cc.min(), x0 - pad + cc.max() + 1
    return dict(x=round(x0 / W, 4), y=round(y0 / H, 4), w=round((x1 - x0) / W, 4), h=round((y1 - y0) / H, 4),
                px=[int(x0), int(y0), int(x1 - x0), int(y1 - y0)])


def _light_stats(last_webp):
    import numpy as np
    from PIL import Image
    a = np.asarray(Image.open(last_webp).convert("RGB")).astype(np.float32)
    med = np.median(a.reshape(-1, 3), axis=0)
    d = np.abs(a - med).max(axis=2)
    frac = float((d <= 6).mean())
    hexv = "#%02X%02X%02X" % tuple(int(round(v)) for v in med)
    return hexv, frac, [int(round(v)) for v in med]


def cmd_publish(a):
    import glob
    import build_gate as G
    man = dict(
        version=1,
        generator="p4ce/v5/blender/render_gate.py (Blender 5.2 Cycles, CPU, OIDN, AgX Medium High Contrast)",
        frameCount=None,
        fps_hint=24,
        orientations={},
        lightHex=None,
        notes=[],
    )
    total = 0
    light = {}
    for orient in ("land", "port"):
        root = os.path.join(a.out, orient)
        if not os.path.exists(os.path.join(root, "closed.png")):
            continue
        W, H = G.RIGS[orient]["res"]
        files = {}
        for nm in ("closed", "slot"):
            _to_webp(os.path.join(root, nm + ".png"), os.path.join(ASSETS, orient, nm + ".webp"), a.q, size=(W, H))
            files[nm] = f"{orient}/{nm}.webp"
        f0 = os.path.join(root, "open", "f_000.png")
        if not os.path.exists(f0):
            import shutil
            shutil.copyfile(os.path.join(root, "closed.png"), f0)
        frames = sorted(glob.glob(os.path.join(root, "open", "f_*.png")))
        out_frames = []
        n = len(frames)
        for i, f in enumerate(frames):
            nm = os.path.basename(f)[:-4]
            k = int(nm.split("_")[1])
            _to_webp(f, os.path.join(ASSETS, orient, "open", nm + ".webp"), a.q,
                     dolly=G.open_curve(k / (n - 1), G.RIGS[orient]["start"][1])[1], size=(W, H))
            out_frames.append(f"{orient}/open/{nm}.webp")
        files["open"] = out_frames
        rect = _slot_rect(os.path.join(root, "closed.png"), os.path.join(root, "slot.png"))
        hexv, frac, rgb = _light_stats(os.path.join(ASSETS, out_frames[-1]))
        light[orient] = (hexv, frac, rgb)
        man["orientations"][orient] = dict(
            size=[W, H], files=files, slot={k: rect[k] for k in ("x", "y", "w", "h")}, slotPx=rect["px"],
            lastFrame=dict(lightHex=hexv, uniformFraction=round(frac, 3)),
        )
        man["frameCount"] = len(out_frames)
    if os.path.exists(os.path.join(ASSETS, "eyes.webp")):
        from PIL import Image
        im = Image.open(os.path.join(ASSETS, "eyes.webp"))
        man["eyes"] = dict(file="eyes.webp", size=list(im.size),
                           fit="cover the slot rect; the photo is dark-edged so its border falls into the slot's shadow")
    # one lightHex for the site: the land median (both orientations land on the same colour)
    if light:
        man["lightHex"] = light.get("land", list(light.values())[0])[0]
    man["notes"] = [
        "slot is normalised 0-1 image coords (x, y from top-left, w, h) of the dark letterbox opening, measured "
        "from the renders: where closed and slot differ (the plate leaves), grown to the full dark opening. "
        "slotPx is the same in pixels. Place eyes.webp to cover it.",
        "open/f_000 is identical in framing and pose to closed.webp; the leaf swings inward (hinge left), "
        "then the camera dollies through the doorway into the light.",
        "lightHex is the median colour of the last frame; uniformFraction is the share of its pixels within "
        "6/255 of that colour. Light target was " + G.LIGHT_HEX_TARGET + " (Atlas sky).",
        "No signage: the only mark is a small engraved '4' plate above the door (the v2 door's number).",
        "Sequence timing: f_001-f_003 barely move (a heavy leaf starting), the leaf is fully open by about f_015, "
        "the camera crosses the doorway at about f_016 and the frames are near-uniform light from about f_021. "
        "Suggested playback about 24 fps (1.2 s).",
        "Frames after f_007 were rendered at 70% (dolly, motion-blurred) and 50% (uniform tail), then upsampled.",
        "Fixed render seed: no frame-to-frame shimmer. Encoded WebP q" + str(a.q) + " (q82 smeared the brushed "
        "steel grain in the dark frames; q" + str(a.q) + " keeps it and the set stays small).",
    ]
    os.makedirs(ASSETS, exist_ok=True)
    json.dump(man, open(os.path.join(ASSETS, "manifest.json"), "w"), indent=2)
    for dp, _, fs in os.walk(ASSETS):
        for f in fs:
            total += os.path.getsize(os.path.join(dp, f))
    print(json.dumps(man, indent=2))
    print(f"TOTAL {total / 1e6:.2f} MB")


def cmd_preview(a):
    """Post-process scratch PNGs exactly as publish does and tile them into one contact sheet."""
    import glob
    import build_gate as G
    from PIL import Image
    root = os.path.join(a.out, a.orient)
    fs = [os.path.join(root, f) for f in ("closed.png", "slot.png") if os.path.exists(os.path.join(root, f))]
    fr = sorted(glob.glob(os.path.join(root, "open", "f_*.png")))
    st = G.RIGS[a.orient]["start"][1]
    ims = [post(f) for f in fs] + [post(f, G.open_curve(int(os.path.basename(f)[2:5]) / (a.n - 1), st)[1]) for f in fr]
    w, h = ims[0].size
    ims = [im.resize((w, h)) for im in ims]
    cols = a.cols
    S = Image.new("RGB", (w * cols, h * ((len(ims) + cols - 1) // cols)))
    for i, im in enumerate(ims):
        S.paste(im, ((i % cols) * w, (i // cols) * h))
    S.save(os.path.join(root, "sheet.jpg"), quality=88)
    print(os.path.join(root, "sheet.jpg"))


def cmd_solve(a):
    import numpy as np
    import bpy
    from PIL import Image
    import build_gate as G
    t = np.array([int(a.hex[i:i + 2], 16) for i in (0, 2, 4)], float)
    sc = bpy.context.scene
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = G.LOOK
    sc.view_settings.exposure = G.EXPOSURE
    sc.render.image_settings.file_format = "PNG"
    img = bpy.data.images.new("p", 1, 1, float_buffer=True)
    tmp = os.path.join(a.out, "_solve.png")
    os.makedirs(a.out, exist_ok=True)

    def ev(rgb):
        img.pixels.foreach_set(np.array(list(rgb) + [1.0], np.float32))
        img.save_render(tmp, scene=sc)
        return np.asarray(Image.open(tmp).convert("RGB")).reshape(-1, 3)[0].astype(float)
    x = np.array([2.6, 2.6, 2.6])
    for _ in range(60):
        err = t - ev(x)
        if np.abs(err).max() < 0.6:
            break
        x = x * 2 ** (err / 30.0)
    print("LIGHT_LIN", [round(v, 3) for v in x], "->", ev(x))


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("render")
    r.add_argument("orient", choices=["land", "port"])
    r.add_argument("what", choices=["closed", "slot", "open", "all"])
    r.add_argument("--frames", default=None)
    r.add_argument("--step", type=int, default=None)
    r.add_argument("--n", type=int, default=NFRAMES)
    r.add_argument("--samples", type=int, default=40, help="stills (closed, slot)")
    r.add_argument("--seq-samples", type=int, default=16, help="open frames")
    r.add_argument("--scale", type=int, default=None, help="fixed resolution %% for everything (look-dev)")
    r.add_argument("--out", default=SCRATCH)
    r.add_argument("--force", action="store_true")
    p = sub.add_parser("publish")
    p.add_argument("--out", default=SCRATCH)
    p.add_argument("--q", type=int, default=90)  # q82 smeared the brushed grain in the dark frames
    v = sub.add_parser("preview")
    v.add_argument("orient", choices=["land", "port"])
    v.add_argument("--out", default=SCRATCH)
    v.add_argument("--n", type=int, default=NFRAMES)
    v.add_argument("--cols", type=int, default=3)
    s = sub.add_parser("solve-light")
    s.add_argument("hex", default="EEEBE5")
    s.add_argument("--out", default=SCRATCH)
    a = ap.parse_args(argv)
    if a.cmd == "render":
        a.scale_fixed = a.scale is not None
        a.scale = a.scale or 100
    {"render": cmd_render, "publish": cmd_publish, "preview": cmd_preview, "solve-light": cmd_solve}[a.cmd](a)


if __name__ == "__main__":
    main()
