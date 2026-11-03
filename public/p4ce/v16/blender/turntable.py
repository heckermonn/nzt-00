"""PR6 v16: turntables. The hero vial (vial_hero, PR6-C-0103) and the house vial (vial_blank) turned through 360
degrees in the same pale set, one beauty frame per step, lit with the site's default mix baked into the lamps.
The page turns them under a finger or the pointer (js/turn.js): a change you can see on a phone, unlike the light.

  python turntable.py --shot vial_blank --out DIR [--frames 32] [--scale .625] [--samples 64]   (resumable)
"""
import argparse
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
import render_light as RL  # noqa: E402
import render_vials as RV  # noqa: E402

W = {"key_l": 1.0, "key_r": 0.12, "top": 0.18, "rim": 0.25}

ap = argparse.ArgumentParser()
ap.add_argument("--shot", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--frames", type=int, default=32)
ap.add_argument("--scale", type=float, default=0.625)
ap.add_argument("--samples", type=int, default=64)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
out = os.path.join(a.out, a.shot)
os.makedirs(out, exist_ok=True)
RL.reset(a.samples)
RV.build_hero(a.shot, a.scale)
sc = bpy.context.scene
sc.cycles.use_denoising = True
sc.cycles.adaptive_min_samples = 16
for o in bpy.data.objects:
    if o.type == "LIGHT" and o.name in W:
        o.data.energy *= W[o.name]
w = sc.world
if w and w.node_tree:
    bg = w.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Strength"].default_value *= 0.5
try:
    sc.view_settings.view_transform = "Khronos PBR Neutral"
except TypeError:
    sc.view_settings.view_transform = "AgX"
sc.view_settings.look = "None"
sc.render.image_settings.file_format = "PNG"
root = bpy.data.objects["H"]
z0 = root.rotation_euler.z
for i in range(a.frames):
    fn = os.path.join(out, "%03d.png" % i)
    if os.path.exists(fn):
        continue
    root.rotation_euler.z = z0 + 2 * math.pi * i / a.frames
    sc.render.filepath = fn + ".part.png"
    bpy.ops.render.render(write_still=True)
    os.replace(fn + ".part.png", fn)
    print("frame", i, flush=True)
print("DONE", a.shot, flush=True)
