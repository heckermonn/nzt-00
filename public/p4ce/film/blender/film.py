"""PR6 / Film: the main page as one continuous path-traced shot (Overdrive A, lu 5 Nov).
One set, one light, one camera. Scroll scrubs the frames on the page.
  0.00  PR6        pressed against a frosted pane beaded with drops (the cells, now on glass); the vial a shape behind
  0.20  Statement  the camera slides past the pane's edge; focus pulls to the vial on its glass block, turning
  0.42  Catalogue  it cranes up and over a field of sealed vials lying in rows, and tracks along them
  0.72  This lot   it swings back down to the block: a drop lands, a ripple runs through the water
  0.92  Enter      it pulls back wide; everything settles soft
  /tmp/claude-0/bpyenv/bin/python film.py -- --out DIR --cut land|port [--n 120] [--scale 1] [--samples 32] [--step 1] [--only 0,10]
Writes DIR/f_###.png (resumable). Camera and all motion are computed per frame (Catmull-Rom over keys), not keyframed.
"""
import argparse, math, os, random, sys
HERE = os.path.dirname(os.path.abspath(__file__))
V16 = os.path.normpath(os.path.join(HERE, "../../v16/blender"))
sys.path.insert(0, V16); os.chdir(V16)
import bpy  # noqa
from mathutils import Vector  # noqa
import render_light as RL  # noqa
import vials  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--cut", default="land")
ap.add_argument("--n", type=int, default=120); ap.add_argument("--scale", type=float, default=1.0)
ap.add_argument("--samples", type=int, default=32); ap.add_argument("--step", type=int, default=1)
ap.add_argument("--only", default=""); ap.add_argument("--exposure", type=float, default=-2.0)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
PORT = a.cut == "port"
sc = RL.reset(a.samples)
sc.cycles.use_denoising = True; sc.cycles.denoiser = "OPENIMAGEDENOISE"; sc.cycles.adaptive_min_samples = 12
random.seed(6)


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
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0)); bpy.context.object.data.materials.append(mat("floor", MIST, 0.55))
bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 34, 0), rotation=(math.radians(90), 0, 0)); bpy.context.object.data.materials.append(mat("wall", MIST, 0.95))
wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
bg = wd.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.6, 0.66, 0.7, 1); bg.inputs["Strength"].default_value = 0.8

# ---- the hero: vial on a clear glass block with a film of water; matte sphere beside
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.7)); blk = bpy.context.object
blk.scale = (5.2, 5.2, 3.4); blk.data.materials.append(glass("block", 0.04))
bpy.ops.object.modifier_add(type="BEVEL"); blk.modifiers[-1].width = 0.12; blk.modifiers[-1].segments = 5
hero = vials.build_vial(None, "H", cap="steel"); RL.centre_on_axis(hero); hero.location = (0, 0, 3.4)
bpy.ops.mesh.primitive_uv_sphere_add(radius=2.1, location=(4.6, 2.6, 2.1), segments=96, ring_count=48); s = bpy.context.object
bpy.ops.object.shade_smooth(); s.data.materials.append(mat("sphere", (.80, .83, .85), 0.75))

HIT = (1.7, -1.5)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 3.425)); film = bpy.context.object; film.scale = (4.96, 4.96, 1)
wm = glass("water", 0.015, 1.333); nt = wm.node_tree; nn, ln = nt.nodes, nt.links
tc = nn.new("ShaderNodeTexCoord")
off = nn.new("ShaderNodeVectorMath"); off.operation = "SUBTRACT"; off.inputs[1].default_value = (HIT[0] / 4.96, HIT[1] / 4.96, 0)
ln.new(tc.outputs["Object"], off.inputs[0])
sm = nn.new("ShaderNodeVectorMath"); sm.operation = "MULTIPLY"; sm.inputs[1].default_value = (4.96, 4.96, 0); ln.new(off.outputs[0], sm.inputs[0])
rad = nn.new("ShaderNodeVectorMath"); rad.operation = "LENGTH"; ln.new(sm.outputs[0], rad.inputs[0])
FRONT = nn.new("ShaderNodeValue"); AMP = nn.new("ShaderNodeValue")


def M(op, x, y=None):
    m = nn.new("ShaderNodeMath"); m.operation = op
    for i, v in enumerate((x, y)):
        if v is None: continue
        if isinstance(v, (int, float)): m.inputs[i].default_value = v
        else: ln.new(v, m.inputs[i])
    return m.outputs[0]


d = M("SUBTRACT", rad.outputs["Value"], FRONT.outputs[0])
h = M("MULTIPLY", M("MULTIPLY", M("EXPONENT", M("MULTIPLY", M("POWER", d, 2.0), -4.0)), M("SINE", M("MULTIPLY", d, 9.0))), AMP.outputs[0])
bump = nn.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.14
ln.new(h, bump.inputs["Height"]); ln.new(bump.outputs[0], nn["Principled BSDF"].inputs["Normal"])
film.data.materials.append(wm)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.16, location=(HIT[0], HIT[1], 40), segments=48, ring_count=24); drop = bpy.context.object
bpy.ops.object.shade_smooth(); drop.scale = (1, 1, 1.25); drop.data.materials.append(glass("drop", 0.0, 1.333))

# ---- the frosted pane, beaded with drops like the cells of the cover
PANE_Y = -7.0
bpy.ops.mesh.primitive_cube_add(size=1, location=(-11.5, PANE_Y, 9)); pane = bpy.context.object
pane.scale = (19.0, 0.16, 18); pane.data.materials.append(glass("frost", 0.24))
bpy.ops.object.modifier_add(type="BEVEL"); pane.modifiers[-1].width = 0.06; pane.modifiers[-1].segments = 3
dm = glass("bead", 0.0, 1.333)
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=32, ring_count=16); proto = bpy.context.object; bpy.ops.object.shade_smooth()
proto.data.materials.append(dm); proto.hide_render = True; proto.hide_viewport = True
for i in range(900):
    u = random.random(); r = .03 + .09 * u * u if random.random() < .82 else random.uniform(.16, .42)
    x = random.uniform(-20.5, -2.3); z = random.uniform(1.0, 16.5)
    o = bpy.data.objects.new("bead%d" % i, proto.data); bpy.context.collection.objects.link(o)
    o.location = (x, PANE_Y - 0.08 - r * .25, z); o.scale = (r, r * .45, r * 1.08)

# ---- the field: sealed vials lying in rows on the floor, out to the right
def dup(root, loc, rot):
    objs = {}
    def walk(o, parent):
        c = o.copy(); bpy.context.collection.objects.link(c); objs[o.name] = c
        if parent: c.parent = parent
        for ch in o.children: walk(ch, c)
        return c
    r = walk(root, None); r.location = loc; r.rotation_euler = rot; return r
src = vials.build_vial(None, "L", cap="mist"); RL.centre_on_axis(src); src.location = (0, 0, -50)
FIELD = (16.0, 2.0)
for row in range(4):
    for k in range(4):
        x = FIELD[0] - 6 + k * 4.2 + (row % 2) * 2.1; y = FIELD[1] - 5 + row * 3.6
        cap = ["mist", "steel", "chalk", "ink"][(row + k) % 4]
        dup(src, (x, y, 0.80), (math.radians(-90), 0, math.radians(146 + random.uniform(-3, 3))))

# ---- light: the b-roll key/fill/top/rim, one strip that sweeps during the reveal
def light(name, loc, size, power, tgt=(0, 0, 6), shape="DISK", size_y=None):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = shape; ld.size = size; ld.energy = power
    if size_y: ld.size_y = size_y
    o = bpy.data.objects.new(name, ld); bpy.context.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); o.visible_camera = False; return o
light("kl", (-16, -8, 12), 16, 8000); light("kr", (15, -6, 9), 16, 5200)
light("tp", (6, -2, 30), 34, 12000, (8, 0, 0)); light("rm", (6, 26, 14), 34, 7000, (4, 0, 4))
sweep = light("sweep", (-30, -12, 8), 1.4, 9000, (0, 0, 5), "RECTANGLE", 26)

bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam
cam.data.dof.use_dof = True
if PORT: sc.render.resolution_x, sc.render.resolution_y = int(720 * a.scale), int(1280 * a.scale)
else: sc.render.resolution_x, sc.render.resolution_y = int(1280 * a.scale), int(720 * a.scale)
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_depth = "8"
sc.view_settings.exposure = a.exposure

# ---- the shot. keys: t, camera, target, lens (landscape), f-stop. Portrait pulls back and narrows the lens.
K = [
    (0.00, (-6.4, -10.6, 6.6), (-5.6, -7.1, 6.4), 60, 1.4),
    (0.10, (-4.6, -11.6, 6.2), (-3.4, -7.1, 6.0), 60, 1.6),
    (0.22, (1.8, -14.0, 6.4), (0.2, 0.0, 5.2), 62, 2.2),
    (0.34, (3.8, -12.6, 6.3), (0.2, 0.0, 5.5), 60, 2.0),
    (0.46, (8.5, -9.0, 15.0), (12.5, 0.5, 1.5), 50, 2.8),
    (0.56, (14.0, -3.2, 21.0), (15.0, 1.0, 0.6), 45, 3.2),
    (0.66, (19.5, 0.5, 18.0), (19.0, 2.5, 0.6), 50, 2.6),
    (0.76, (7.0, -13.0, 9.5), (0.4, 0.0, 4.4), 58, 2.4),
    (0.86, (3.2, -14.2, 7.0), (0.7, -0.6, 5.2), 52, 2.2),
    (1.00, (3.0, -24.0, 9.5), (0.4, 0.0, 4.2), 50, 3.0),
]


def cr(p0, p1, p2, p3, u):
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)


def sample(t):
    i = max(0, min(len(K) - 2, max(j for j in range(len(K)) if K[j][0] <= t)))
    k0, k1 = K[i], K[i + 1]; u = (t - k0[0]) / (k1[0] - k0[0])
    u = u * u * (3 - 2 * u) * .35 + u * .65          # a little ease at each key, never a stop
    km, kp = K[max(0, i - 1)], K[min(len(K) - 1, i + 2)]
    out = []
    for f in (1, 2):
        out.append(Vector([cr(km[f][c], k0[f][c], k1[f][c], kp[f][c], u) for c in range(3)]))
    lens = k0[3] + (k1[3] - k0[3]) * u; fs = k0[4] + (k1[4] - k0[4]) * u
    return out[0], out[1], lens, fs


def smooth(x): x = max(0, min(1, x)); return x * x * (3 - 2 * x)


def pose(t):
    loc, tgt, lens, fs = sample(t)
    if PORT:  # portrait: back off along the view line and widen, so the subject keeps its place in a tall frame
        loc = tgt + (loc - tgt) * 1.32; lens *= 0.82
    cam.location = loc; cam.rotation_euler = (tgt - loc).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens; cam.data.dof.aperture_fstop = fs; cam.data.dof.focus_distance = (tgt - loc).length
    hero.rotation_euler = (0, 0, math.radians(-30 + 150 * t))
    # sweep crosses during the reveal (0.16-0.40) and again on the block (0.82-0.98)
    sx = -30 + 60 * smooth((t - .16) / .24) if t < .6 else -30 + 60 * smooth((t - .82) / .16)
    sweep.location = (sx, -12, 8); sweep.rotation_euler = (Vector((0, 0, 5)) - sweep.location).to_track_quat("-Z", "Y").to_euler()
    # the drop: falls 0.775-0.80, the ring runs out to the edge by 0.97
    th = .80
    if t < .775: drop.location.z = 40; drop.scale = (1, 1, 1.25)
    elif t < th: z = 14 - (14 - 3.5) * ((t - .775) / (th - .775)) ** 2; drop.location.z = z; drop.scale = (1, 1, 1.25)
    else: drop.scale = (0, 0, 0)
    FRONT.outputs[0].default_value = 0 if t < th else 7.0 * ((t - th) / .2)
    AMP.outputs[0].default_value = 0 if t < th else max(0.0, 1 - (t - th) / .2) ** 1.2


os.makedirs(a.out, exist_ok=True)
frames = [int(x) for x in a.only.split(",")] if a.only else range(0, a.n, a.step)
for f in frames:
    path = os.path.join(a.out, "f_%03d.png" % f)
    if os.path.exists(path): continue
    pose(f / (a.n - 1)); sc.render.filepath = path
    bpy.ops.render.render(write_still=True); print("DONE", f, flush=True)
