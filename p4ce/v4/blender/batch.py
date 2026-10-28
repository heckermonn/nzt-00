"""Run render jobs end to end: render -> WebP -> manifest.

  /tmp/claude-0/bpyenv/bin/python batch.py still dropper 08-1 [--samples 96]
  /tmp/claude-0/bpyenv/bin/python batch.py turntable dropper 08-1 [--samples 16 --frames 48]
  /tmp/claude-0/bpyenv/bin/python batch.py scene group 08-group      (scenes.py shots)
  /tmp/claude-0/bpyenv/bin/python batch.py lying dropper 08-1          -> stills/08-1_lying.webp (2000x1000)
  /tmp/claude-0/bpyenv/bin/python batch.py top jar 08-3                 -> stills/08-3_top-hero.webp
  /tmp/claude-0/bpyenv/bin/python batch.py macro dropper 08-1 --kind lying --name macro-cap --res 4000x2000 --crop ...
  /tmp/claude-0/bpyenv/bin/python batch.py manifest

Each render runs in a fresh Python process (clean bpy state).
"""
import argparse
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import post  # noqa: E402

PY = sys.executable
SCRATCH = "/tmp/claude-0/p4ce-render/final"
LOG = os.path.join(SCRATCH, "batch.log")


def log(msg):
    os.makedirs(SCRATCH, exist_ok=True)
    line = time.strftime("%H:%M:%S ") + msg
    print(line, flush=True)
    with open(LOG, "a") as fh:
        fh.write(line + "\n")


def run(args):
    t = time.time()
    r = subprocess.run([PY, os.path.join(HERE, "render.py")] + args, cwd=HERE, capture_output=True, text=True)
    if r.returncode != 0:
        log("FAILED " + " ".join(args) + "\n" + r.stdout[-3000:] + r.stderr[-3000:])
        raise SystemExit(1)
    return time.time() - t


def still(product, variant, samples=96, res="1600x2000"):
    png = os.path.join(SCRATCH, f"{variant}_hero.png")
    dt = run([product, variant, "hero", "--samples", str(samples), "--res", res, "--out", png])
    out = os.path.join(post.RENDERS, "stills")
    stem, tag = variant, ""
    if variant.count("-") == 2:  # colourway: 08-1-sage -> 08-1_sage-hero.webp
        stem, colour = variant.rsplit("-", 1)
        tag = colour + "-"
    post.to_webp(png, os.path.join(out, f"{stem}_{tag}hero.webp"), quality=90, alpha_quality=92)
    post.to_webp(png.replace(".png", "_fog.png"), os.path.join(out, f"{stem}_{tag}fog.webp"), quality=90)
    log(f"still {variant} {res} {samples}spp {dt:.0f}s")
    post.write_manifest()


def view(product, variant, kind, samples=96, res="1600x2000", name=None, crop=None, fstop=None, fog=True, elev=None):
    """Extra views written as stills/{id}_{name}-hero.webp (+ -fog): kind lying | top | hero (+crop for macros)."""
    name = name or kind
    png = os.path.join(SCRATCH, f"{variant}_{name}.png")
    args = [product, variant, kind, "--samples", str(samples), "--res", res, "--out", png]
    if crop:
        args += ["--crop", crop]
    if fstop:
        args += ["--fstop", str(fstop)]
    if elev is not None:
        args += ["--elev", str(elev)]
    dt = run(args)
    out = os.path.join(post.RENDERS, "stills")
    if name == "lying":  # transparent is the deliverable; fog version as a convenience
        post.to_webp(png, os.path.join(out, f"{variant}_lying.webp"), quality=90, alpha_quality=92)
        if fog:
            post.to_webp(png.replace(".png", "_fog.png"), os.path.join(out, f"{variant}_lying-fog.webp"), quality=90)
    else:
        post.to_webp(png, os.path.join(out, f"{variant}_{name}-hero.webp"), quality=90, alpha_quality=92)
        post.to_webp(png.replace(".png", "_fog.png"), os.path.join(out, f"{variant}_{name}-fog.webp"), quality=90)
    log(f"view {variant} {name} {res} crop={crop} {samples}spp {dt:.0f}s")
    post.write_manifest()


def turntable(product, variant, samples=16, frames=48, res="900x1125", budget=4.0e6):
    src = os.path.join(SCRATCH, f"tt_{variant}")
    os.makedirs(src, exist_ok=True)
    have = len([f for f in os.listdir(src) if f.endswith(".png")])
    dt = 0.0
    if have < frames:
        dt = run([product, variant, "turntable", "--samples", str(samples), "--res", res, "--frames", str(frames),
                  "--start", str(have), "--out", src])
    dst = os.path.join(post.RENDERS, "turntable", variant)
    q = 82
    while True:
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        n, size = post.frames_to_webp(src, dst, quality=q, alpha_quality=80)
        if size <= budget or q <= 60:
            break
        q -= 6
    log(f"turntable {variant} {n} frames {res} {samples}spp {dt:.0f}s q{q} {size / 1e6:.2f}MB")
    post.write_manifest()


def scene(name, variant, samples=128, res=None, extra=()):
    png = os.path.join(SCRATCH, f"{variant}.png")
    args = ["scene", variant, "scene", "--samples", str(samples), "--out", png] + list(extra)
    if res:
        args += ["--res", res]
    dt = run(args)
    out = os.path.join(post.RENDERS, "stills")
    for suffix in ("", "_fog"):
        p = png.replace(".png", suffix + ".png")
        if os.path.exists(p):
            tag = "fog" if suffix else ("hero" if "_fog" not in p else "fog")
            stem = "08-group_stack-" if variant == "08-stack" else variant + "_"  # stack ships as a 08-group view
            post.to_webp(p, os.path.join(out, f"{stem}{tag}.webp"), quality=90, alpha_quality=92)
    log(f"scene {variant} {samples}spp {dt:.0f}s")
    post.write_manifest()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("job")
    ap.add_argument("product", nargs="?")
    ap.add_argument("variant", nargs="?")
    ap.add_argument("--samples", type=int, default=None)
    ap.add_argument("--frames", type=int, default=48)
    ap.add_argument("--res", default=None)
    ap.add_argument("--kind", default=None)
    ap.add_argument("--name", default=None)
    ap.add_argument("--crop", default=None)
    ap.add_argument("--fstop", type=float, default=None)
    ap.add_argument("--elev", type=float, default=None)
    a = ap.parse_args()
    if a.job == "still":
        still(a.product, a.variant, samples=a.samples or 96, res=a.res or "1600x2000")
    elif a.job == "turntable":
        turntable(a.product, a.variant, samples=a.samples or 16, frames=a.frames, res=a.res or "900x1125")
    elif a.job == "scene":
        scene(a.product, a.variant, samples=a.samples or 128, res=a.res)
    elif a.job == "lying":
        view(a.product, a.variant, "lying", samples=a.samples or 96, res=a.res or "2000x1000")
    elif a.job == "top":
        view(a.product, a.variant, "top", samples=a.samples or 96, res=a.res or "1600x2000")
    elif a.job == "macro":  # e.g. macro dropper 08-1 --kind lying --name macro-cap --res 4000x2000 --crop ...
        view(a.product, a.variant, a.kind or "hero", samples=a.samples or 96, res=a.res, name=a.name,
             crop=a.crop, fstop=a.fstop, elev=a.elev)
    elif a.job == "manifest":
        post.write_manifest()
