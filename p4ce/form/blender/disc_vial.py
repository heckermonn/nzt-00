"""PR6 / Form: the slide-4 still. A sealed vial lying in the panel's pressed disc, seen from straight above, with a
small matte sphere, like the capsule and tablet on kit slide 4. Transparent film with a shadow-catcher floor, so the
page draws the slab and the disc in CSS and the render drops in with its own contact shadow.

  /tmp/claude-0/bpyenv/bin/python disc_vial.py -- --pid none --out OUT.png [--res 1100] [--samples 96]
Reuses the v16 vial builder (../../v16/blender). pid none = the house vial with a blank label.
"""
import argparse, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
V16 = os.path.normpath(os.path.join(HERE, "../../v16/blender"))
sys.path.insert(0, V16)
os.chdir(V16)
import bpy  # noqa
from mathutils import Vector  # noqa
import render_light as RL  # noqa
import vials  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--pid", default="none")
ap.add_argument("--cap", default="steel")
ap.add_argument("--out", required=True)
ap.add_argument("--res", type=int, default=1100)
ap.add_argument("--samples", type=int, default=96)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
pid = None if a.pid == "none" else a.pid

sc = RL.reset(a.samples)
sc.render.film_transparent = True
sc.cycles.use_denoising = True
vl = sc.view_layers[0]
for g in list(vl.lightgroups):
    vl.lightgroups.remove(g)

root = vials.build_vial(pid, "D", cap=a.cap)
RL.centre_on_axis(root)
# lie it down: axis along +Y, then turn on the plate like slide 4's capsule
root.rotation_euler = (math.radians(-90), 0, math.radians(-28))
bpy.context.view_layer.update()
vs = RL.world_verts(RL.mesh_children(root), 3)
zmin = min(v.z for v in vs)
cx = (max(v.x for v in vs) + min(v.x for v in vs)) / 2
cy = (max(v.y for v in vs) + min(v.y for v in vs)) / 2
root.location = (-cx + 0.35, -cy + 0.25, -zmin)
# a matte sphere, chalk, like the tablet beside the capsule
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, segments=96, ring_count=48, location=(-1.55, -1.25, 0.62))
sph = bpy.context.object
bpy.ops.object.shade_smooth()
m = bpy.data.materials.new("chalk")
m.use_nodes = True
bs = m.node_tree.nodes["Principled BSDF"]
bs.inputs["Base Color"].default_value = (0.80, 0.83, 0.85, 1)
bs.inputs["Roughness"].default_value = 0.62
sph.data.materials.append(m)
# floor = shadow catcher
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
fl = bpy.context.object
fl.is_shadow_catcher = True
# light: soft key from top-left (slide 4), cool fill from the world
bpy.ops.object.light_add(type="AREA", location=(-9, 9, 14))
k = bpy.context.object
k.data.shape = "DISK"; k.data.size = 9; k.data.energy = 6800
k.data.color = (1.0, 0.99, 0.97)
k.rotation_euler = (Vector((0, 0, 0)) - k.location).to_track_quat("-Z", "Y").to_euler()
w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs["Color"].default_value = (0.62, 0.68, 0.74, 1)
w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.55
# camera straight down, orthographic
bpy.ops.object.camera_add(location=(0, 0, 30), rotation=(0, 0, 0))
cam = bpy.context.object
cam.data.type = "ORTHO"; cam.data.ortho_scale = 8.6
sc.camera = cam
sc.render.resolution_x = sc.render.resolution_y = a.res
try:
    sc.view_settings.view_transform = "Khronos PBR Neutral"
except TypeError:
    sc.view_settings.view_transform = "AgX"
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
sc.render.filepath = a.out
bpy.ops.render.render(write_still=True)
print("DONE", a.out, flush=True)
