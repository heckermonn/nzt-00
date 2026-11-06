"""PR6 / Form: the b-roll set, after Abel's loops (light passing over a bottle on a glass block).
A sealed vial stands on a clear glass block beside a matte sphere, a frosted sheet behind. Each light sits in its own
Cycles light group, so the page can relight the still in WebGL: colours drift through the light over time.
  /tmp/claude-0/bpyenv/bin/python broll.py -- --out DIR [--scale 1] [--samples 160]
Writes DIR/pass_<group>.exr (denoised) for key_l key_r top rim amb; post: broll_post.py.
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
ap.add_argument("--out", required=True); ap.add_argument("--scale", type=float, default=1.0)
ap.add_argument("--samples", type=int, default=160)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
sc = RL.reset(a.samples)

def mat(name, rgb, rough=0.8, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m
def glass(name, rough):
    m = mat(name, (.95, .97, .98), rough); b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = 1.47; return m
MIST = (0.62, 0.68, 0.72)
# room: floor + wall, pale so coloured light reads on them
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); bpy.context.object.data.materials.append(mat("floor", MIST, 0.6))
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 30, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(mat("wall", MIST, 0.95))
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
bg = wd.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.6, 0.66, 0.7, 1); bg.inputs["Strength"].default_value = 0.8
wd.lightgroup = "amb"
# the glass block (plinth) and the vial on it
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.7)); blk = bpy.context.object
blk.scale = (5.2, 5.2, 3.4); blk.data.materials.append(glass("block", 0.04))
bpy.ops.object.modifier_add(type="BEVEL"); blk.modifiers[-1].width = 0.12; blk.modifiers[-1].segments = 5
r = vials.build_vial(None, "B", cap="steel"); RL.centre_on_axis(r); r.location = (0, 0, 3.4); r.rotation_euler = (0, 0, math.radians(-16))
# a matte sphere, a little behind and right; a frosted sheet standing behind the vial
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.1, location=(4.6, 2.6, 2.1), segments=96, ring_count=48); s = bpy.context.object
bpy.ops.object.shade_smooth(); s.data.materials.append(mat("sphere", (.80, .83, .85), 0.75))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.0, 6.0, 9)); p = bpy.context.object
p.scale = (9.0, 0.14, 18); p.rotation_euler = (0, 0, math.radians(8)); p.data.materials.append(glass("frost", 0.38))
def light(name, group, loc, size, power, tgt=(0, 0, 6)):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = "DISK"; ld.size = size; ld.energy = power
    o = bpy.data.objects.new(name, ld); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); o.lightgroup = group; o.visible_camera = False; return o
light("kl", "key_l", (-16, -8, 12), 16, 9000)        # raking from the left
light("kr", "key_r", (15, -6, 9), 16, 7000)          # raking from the right
light("tp", "top", (0, -2, 24), 20, 7000, (0, 0, 4)) # a soft top
light("rm", "rim", (6, 22, 12), 30, 6000, (0, 0, 6)) # behind: lights the frost and the wall, rims the glass
bpy.ops.object.camera_add(location=(0.9, -17, 8.0)); c = bpy.context.object
c.rotation_euler = (Vector((0.6, 0, 5.4)) - c.location).to_track_quat("-Z", "Y").to_euler()
c.data.lens = 70; c.data.dof.use_dof = True; c.data.dof.aperture_fstop = 2.2; c.data.dof.focus_distance = 17.2
sc.camera = c; sc.render.resolution_x = int(1200 * a.scale); sc.render.resolution_y = int(1500 * a.scale)
os.makedirs(a.out, exist_ok=True)
RL.compositor(a.out)
sc.render.filepath = os.path.join(a.out, "_render")
bpy.ops.render.render(write_still=False); print("DONE broll", flush=True)
