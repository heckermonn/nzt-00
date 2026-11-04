"""PR6 / Form: the line-up. Each compound's own labelled vial standing on a shadow-catcher floor, transparent film,
same camera and light for all 27 so they can stand in one row on the page (after the TikTok line-up clip).
  /tmp/claude-0/bpyenv/bin/python lineup.py -- --out DIR [--res 700] [--samples 64] [--only PR6-C-0101,...]
Skips files that already exist (resumable). Cap colour per Series; orange stays off the caps (accent only).
"""
import argparse, json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
V16 = os.path.normpath(os.path.join(HERE, "../../v16/blender"))
sys.path.insert(0, V16); os.chdir(V16)
import bpy  # noqa
from mathutils import Vector  # noqa
import render_light as RL  # noqa
import vials  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--res", type=int, default=700)
ap.add_argument("--samples", type=int, default=64); ap.add_argument("--only", default="")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
os.makedirs(a.out, exist_ok=True)
CAP = {"01": "chalk", "02": "steel", "03": "ink", "04": "steel", "05": "mist", "06": "ink", "07": "steel", "08": "chalk", "09": "mist"}
pids = a.only.split(",") if a.only else list(vials.P)
for pid in pids:
    out = os.path.join(a.out, pid + ".png")
    if os.path.exists(out): print("SKIP", pid, flush=True); continue
    sc = RL.reset(a.samples); sc.render.film_transparent = True; sc.cycles.use_denoising = True
    vl = sc.view_layers[0]
    for g in list(vl.lightgroups): vl.lightgroups.remove(g)
    root = vials.build_vial(pid, "Q", cap=CAP[vials.P[pid]["c"]])
    RL.centre_on_axis(root); root.rotation_euler = (0, 0, math.radians(-5))
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); bpy.context.object.is_shadow_catcher = True
    def light(loc, size, power, col):
        bpy.ops.object.light_add(type="AREA", location=loc); l = bpy.context.object
        l.data.shape = "DISK"; l.data.size = size; l.data.energy = power; l.data.color = col
        l.rotation_euler = (Vector((0, 0, 1.8)) - l.location).to_track_quat("-Z", "Y").to_euler()
    light((-7, -8, 7), 7, 1500, (1, .99, .97)); light((8, -3, 5), 9, 500, (.82, .9, 1)); light((1, 9, 6), 7, 900, (.9, .95, 1))
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.66, 0.72, 0.77, 1)
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
    bpy.ops.object.camera_add(location=(0, -16, 3.2)); c = bpy.context.object
    c.rotation_euler = (Vector((0, 0, 1.95)) - c.location).to_track_quat("-Z", "Y").to_euler()
    c.data.lens = 85; sc.camera = c
    sc.render.resolution_x = int(a.res * .56); sc.render.resolution_y = a.res
    try: sc.view_settings.view_transform = "Khronos PBR Neutral"
    except TypeError: sc.view_settings.view_transform = "AgX"
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"; sc.render.filepath = out
    bpy.ops.render.render(write_still=True); print("DONE", pid, flush=True)
