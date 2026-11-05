"""PR6 / Form: FIG. 04 as a skincare-style product loop (lu, 5 Nov: "more movement, like a product ad").
The b-roll set (vial on a glass block, matte sphere, frosted sheet) with a thin film of water on the block.
One loop, seamless: a drop falls and lands beside the vial, a ripple ring travels out through the film,
a strip light sweeps across the glass, the vial turns a little and the camera breathes in and out.
  /tmp/claude-0/bpyenv/bin/python ad04.py -- --out DIR [--scale 1] [--samples 40] [--frames 0-167] [--still N]
Writes DIR/f_####.png (resumable: existing frames are skipped). Encode with ad04_encode.sh.
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
ap.add_argument("--samples", type=int, default=40); ap.add_argument("--frames", default="0-167")
ap.add_argument("--still", type=int, default=-1); ap.add_argument("--exposure", type=float, default=-2.0); ap.add_argument("--step", type=int, default=1)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
N = 168          # 7 s at 24 fps
T_HIT = 20       # frame the drop lands
sc = RL.reset(a.samples)
sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"; sc.cycles.adaptive_min_samples = 12
sc.render.fps = 24; sc.frame_start = 0; sc.frame_end = N - 1


def mat(name, rgb, rough=0.8, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m


def glass(name, rough, ior=1.47):
    m = mat(name, (.95, .97, .98), rough); b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = ior; return m


MIST = (0.62, 0.68, 0.72)
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); bpy.context.object.data.materials.append(mat("floor", MIST, 0.6))
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 30, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(mat("wall", MIST, 0.95))
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
bg = wd.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.6, 0.66, 0.7, 1); bg.inputs["Strength"].default_value = 0.8
# glass block and vial
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.7)); blk = bpy.context.object
blk.scale = (5.2, 5.2, 3.4); blk.data.materials.append(glass("block", 0.04))
bpy.ops.object.modifier_add(type="BEVEL"); blk.modifiers[-1].width = 0.12; blk.modifiers[-1].segments = 5
vial = vials.build_vial(None, "B", cap="steel"); RL.centre_on_axis(vial); vial.location = (0, 0, 3.4)
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.1, location=(4.6, 2.6, 2.1), segments=96, ring_count=48); s = bpy.context.object
bpy.ops.object.shade_smooth(); s.data.materials.append(mat("sphere", (.80, .83, .85), 0.75))
bpy.ops.mesh.primitive_cube_add(size=1, location=(-3.0, 6.0, 9)); p = bpy.context.object
p.scale = (9.0, 0.14, 18); p.rotation_euler = (0, 0, math.radians(8)); p.data.materials.append(glass("frost", 0.38))

# ---- the water film: a thin sheet on the block top, its surface carries one travelling ripple ring
HIT = (1.7, -1.5)   # where the drop lands, front-right of the vial
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 3.425)); film = bpy.context.object
film.scale = (4.96, 4.96, 1)
wm = glass("water", 0.015, 1.333); nt = wm.node_tree; nn, ln = nt.nodes, nt.links
bsdf = nn["Principled BSDF"]
tc = nn.new("ShaderNodeTexCoord")
off = nn.new("ShaderNodeVectorMath"); off.operation = "SUBTRACT"; off.inputs[1].default_value = (HIT[0] / 4.96, HIT[1] / 4.96, 0)
ln.new(tc.outputs["Object"], off.inputs[0])
sc_ = nn.new("ShaderNodeVectorMath"); sc_.operation = "MULTIPLY"; sc_.inputs[1].default_value = (4.96, 4.96, 0)
ln.new(off.outputs[0], sc_.inputs[0])
rad = nn.new("ShaderNodeVectorMath"); rad.operation = "LENGTH"; ln.new(sc_.outputs[0], rad.inputs[0])
front = nn.new("ShaderNodeValue"); front.name = "front"        # ring radius, cm (keyframed)
amp = nn.new("ShaderNodeValue"); amp.name = "amp"              # ring height (keyframed, fades out)


def M(op, x, y=None):
    m = nn.new("ShaderNodeMath"); m.operation = op
    for i, v in enumerate((x, y)):
        if v is None: continue
        if isinstance(v, (int, float)): m.inputs[i].default_value = v
        else: ln.new(v, m.inputs[i])
    return m.outputs[0]


d = M("SUBTRACT", rad.outputs["Value"], front.outputs[0])            # distance from the ring front
env = M("EXPONENT", M("MULTIPLY", M("POWER", d, 2.0), -4.0))           # a narrow packet around the front
wave = M("SINE", M("MULTIPLY", d, 9.0))                               # two or three crests in the packet
h = M("MULTIPLY", M("MULTIPLY", env, wave), amp.outputs[0])
bump = nn.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.14; bump.inputs["Strength"].default_value = 1.0
ln.new(h, bump.inputs["Height"]); ln.new(bump.outputs[0], bsdf.inputs["Normal"])
film.data.materials.append(wm)
# keyframes: the ring is born at the hit and runs out to the block edge; it dies before the loop wraps
def keyval(node, frames_vals):
    for f, v in frames_vals:
        node.outputs[0].default_value = v; node.outputs[0].keyframe_insert("default_value", frame=f)
keyval(front, [(0, 0.0), (T_HIT, 0.0), (N - 1, 7.0)])
keyval(amp, [(0, 0.0), (T_HIT - 1, 0.0), (T_HIT, 1.0), (T_HIT + 50, 0.55), (N - 30, 0.0), (N - 1, 0.0)])
for fc in nt.animation_data.action.fcurves if nt.animation_data and nt.animation_data.action and hasattr(nt.animation_data.action, "fcurves") else []:
    for k in fc.keyframe_points: k.interpolation = "LINEAR"

# ---- the drop: falls into frame from above and lands at HIT
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(HIT[0], HIT[1], 14), segments=48, ring_count=24); drop = bpy.context.object
bpy.ops.object.shade_smooth(); drop.scale = (1, 1, 1.25); drop.data.materials.append(glass("drop", 0.0, 1.333))
for f, z, sv in [(0, 14.0, 1), (T_HIT - 1, 3.6, 1), (T_HIT, 3.45, 0.0), (N - 1, 3.45, 0.0)]:
    drop.location.z = z; drop.keyframe_insert("location", index=2, frame=f)
    drop.scale = (sv, sv, sv * 1.25); drop.keyframe_insert("scale", frame=f)


def light(name, loc, size, power, tgt=(0, 0, 6), shape="DISK", size_y=None):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = shape; ld.size = size; ld.energy = power
    if size_y: ld.size_y = size_y
    o = bpy.data.objects.new(name, ld); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); o.visible_camera = False; return o


light("kl", (-16, -8, 12), 16, 8000)
light("kr", (15, -6, 9), 16, 5200)
light("tp", (0, -2, 24), 20, 6000, (0, 0, 4))
light("rm", (6, 22, 12), 30, 6000, (0, 0, 6))
# the sweep: a tall thin strip passing in front, left to right, once per loop (off frame at both ends)
sw = light("sweep", (-30, -12, 8), 1.4, 9000, (0, 0, 5), "RECTANGLE", 26)
for f, x in [(0, -30), (int(N * .30), -30), (int(N * .78), 30), (N - 1, 30)]:
    sw.location.x = x
    sw.rotation_euler = (Vector((0, 0, 5)) - Vector((x, -12, 8))).to_track_quat("-Z", "Y").to_euler()
    sw.keyframe_insert("location", index=0, frame=f); sw.keyframe_insert("rotation_euler", frame=f)

# ---- the vial turns a little and back; the camera breathes in and out (both return to their start)
for f in range(0, N, 6):
    t = f / N
    vial.rotation_euler = (0, 0, math.radians(-16 + 22 * math.sin(2 * math.pi * t)))
    vial.keyframe_insert("rotation_euler", index=2, frame=f)
vial.rotation_euler = (0, 0, math.radians(-16)); vial.keyframe_insert("rotation_euler", index=2, frame=N)
bpy.ops.object.camera_add(location=(0.9, -17, 8.0)); c = bpy.context.object
c.data.lens = 70; c.data.dof.use_dof = True; c.data.dof.aperture_fstop = 2.0
for f in range(0, N + 1, 6):
    t = f / N; k = 0.5 - 0.5 * math.cos(2 * math.pi * t)          # 0 -> 1 -> 0
    loc = Vector((0.9 + 1.4 * math.sin(2 * math.pi * t), -17 + 2.6 * k, 8.0 - 0.9 * k))
    tgt = Vector((0.6, 0, 5.2 - 0.2 * k))
    c.location = loc; c.rotation_euler = (tgt - loc).to_track_quat("-Z", "Y").to_euler()
    c.data.dof.focus_distance = (tgt - loc).length + 0.4
    c.keyframe_insert("location", frame=f); c.keyframe_insert("rotation_euler", frame=f)
    c.data.dof.keyframe_insert("focus_distance", frame=f)
sc.camera = c
sc.render.resolution_x = int(1080 * a.scale); sc.render.resolution_y = int(1350 * a.scale)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_depth = "8"
sc.view_settings.exposure = a.exposure
os.makedirs(a.out, exist_ok=True)
frames = [a.still] if a.still >= 0 else range(int(a.frames.split("-")[0]), int(a.frames.split("-")[1]) + 1, a.step)
for f in frames:
    path = os.path.join(a.out, "f_%04d.png" % f)
    if os.path.exists(path): continue
    sc.frame_set(f); sc.render.filepath = path
    bpy.ops.render.render(write_still=True); print("DONE", f, flush=True)
