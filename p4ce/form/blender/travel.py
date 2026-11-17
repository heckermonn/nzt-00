"""PR6 / Form: the travelling vial (lu, 5 Nov: "a render of the vial to travel as we scroll").
The house vial (no compound named) on a transparent film, no floor, turned through 360 degrees in N steps so the
page can pick the frame from scroll position. Same three soft lights as the line-up, so it matches those cutouts.
  /tmp/claude-0/bpyenv/bin/python travel.py -- --out DIR [--res 900] [--samples 48] [--n 48]
Writes DIR/t_##.png (resumable). Post: travel_post.py (crop + WebP).
"""
import argparse, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
V16 = os.path.normpath(os.path.join(HERE, "../../v16/blender"))
sys.path.insert(0, V16); os.chdir(V16)
import bpy  # noqa
from mathutils import Vector  # noqa
import render_light as RL  # noqa
import vials  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--res", type=int, default=900)
ap.add_argument("--samples", type=int, default=48); ap.add_argument("--n", type=int, default=48)
ap.add_argument("--only", type=int, default=-1)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
os.makedirs(a.out, exist_ok=True)
sc = RL.reset(a.samples); sc.render.film_transparent = True; sc.cycles.use_denoising = True
sc.cycles.film_transparent_glass = False
vl = sc.view_layers[0]
for g in list(vl.lightgroups): vl.lightgroups.remove(g)
root = vials.build_vial(None, "T", cap="steel"); RL.centre_on_axis(root)


def light(loc, size, power, col):
    bpy.ops.object.light_add(type="AREA", location=loc); l = bpy.context.object
    l.data.shape = "DISK"; l.data.size = size; l.data.energy = power; l.data.color = col
    l.rotation_euler = (Vector((0, 0, 1.8)) - l.location).to_track_quat("-Z", "Y").to_euler()


light((-7, -8, 7), 7, 1500, (1, .99, .97)); light((8, -3, 5), 9, 500, (.82, .9, 1)); light((1, 9, 6), 7, 900, (.9, .95, 1))
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.66, 0.72, 0.77, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
bpy.ops.object.camera_add(location=(0, -16, 4.6)); c = bpy.context.object
c.rotation_euler = (Vector((0, 0, 1.9)) - c.location).to_track_quat("-Z", "Y").to_euler()
c.data.lens = 85; sc.camera = c
sc.render.resolution_x = int(a.res * .56); sc.render.resolution_y = a.res
try: sc.view_settings.view_transform = "Khronos PBR Neutral"
except TypeError: sc.view_settings.view_transform = "AgX"
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
for i in ([a.only] if a.only >= 0 else range(a.n)):
    out = os.path.join(a.out, "t_%02d.png" % i)
    if os.path.exists(out): continue
    root.rotation_euler = (0, 0, math.radians(-5 + 360 * i / a.n))
    sc.render.filepath = out
    bpy.ops.render.render(write_still=True); print("DONE", i, flush=True)
