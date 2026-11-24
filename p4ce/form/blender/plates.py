"""PR6 / Form: editorial plates. Cool, misty, shallow-focus Cycles stills of the sealed vial, in the register of the
kit (slides 1, 4, 8, 10) and the pins (blur as concealment, one object in air). Graded and grained in post (grade.py).
  /tmp/claude-0/bpyenv/bin/python plates.py -- --shot macro|frost|rows|lying --out DIR [--scale 1] [--samples 96]
"""
import argparse, math, os, sys, random
HERE = os.path.dirname(os.path.abspath(__file__))
V16 = os.path.normpath(os.path.join(HERE, "../../v16/blender"))
sys.path.insert(0, V16); os.chdir(V16)
import bpy  # noqa
from mathutils import Vector  # noqa
import render_light as RL  # noqa
import vials  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--shot", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--scale", type=float, default=1.0); ap.add_argument("--samples", type=int, default=96)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
sc = RL.reset(a.samples); sc.cycles.use_denoising = True
vl = sc.view_layers[0]
for g in list(vl.lightgroups): vl.lightgroups.remove(g)

def mat(name, rgb, rough=0.8, **kw):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    for k, v in kw.items(): b.inputs[k].default_value = v
    return m
MIST = (0.50, 0.58, 0.64)
def set_room():
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); f = bpy.context.object
    f.data.materials.append(mat("floor", MIST, 0.55))
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 60, 0), rotation=(math.radians(90), 0, 0)); w = bpy.context.object
    w.data.materials.append(mat("wall", MIST, 0.9))
    wd = bpy.data.worlds.new("w"); sc.world = wd; wd.use_nodes = True
    bg = wd.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.55, 0.63, 0.70, 1); bg.inputs["Strength"].default_value = 0.6
def light(loc, size, power, col=(1, 1, 1), tgt=(0, 0, 2)):
    bpy.ops.object.light_add(type="AREA", location=loc); l = bpy.context.object
    l.data.shape = "DISK"; l.data.size = size; l.data.energy = power; l.data.color = col
    l.rotation_euler = (Vector(tgt) - l.location).to_track_quat("-Z", "Y").to_euler(); return l
def vial(key, loc, yaw=0, cap="steel", lie=False):
    r = vials.build_vial(None, key, cap=cap); RL.centre_on_axis(r)
    r.rotation_euler = (math.radians(-90) if lie else 0, 0, math.radians(yaw)); r.location = loc; return r
def cam(loc, tgt, lens, fstop, focus, res):
    bpy.ops.object.camera_add(location=loc); c = bpy.context.object
    c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    c.data.lens = lens; c.data.dof.use_dof = True; c.data.dof.aperture_fstop = fstop; c.data.dof.focus_distance = focus
    sc.camera = c; sc.render.resolution_x = int(res[0] * a.scale); sc.render.resolution_y = int(res[1] * a.scale); return c

set_room()
s = a.shot
if s == "macro":          # the crimp and shoulder, very close, almost all soft
    vial("M", (0, 0, 0), yaw=-20)
    light((-14, -6, 9), 10, 2600, (1, .98, .95)); light((10, 8, 6), 14, 500, (.8, .88, 1))
    cam((-1.9, -7.4, 3.4), (0, 0, 2.7), 100, 1.4, 7.5, (1600, 2000))
elif s == "frost":        # vial behind a frosted sheet; the left edge of the sheet leaves a sharp strip
    vial("F", (0.2, 0, 0), yaw=-14)
    g = bpy.data.materials.new("frost"); g.use_nodes = True
    b = g.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (.93, .96, .98, 1)
    b.inputs["Roughness"].default_value = 0.32; b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = 1.45
    bpy.ops.mesh.primitive_cube_add(size=1, location=(4.6, -2.2, 6)); p = bpy.context.object
    p.scale = (8.6, 0.12, 14); p.data.materials.append(g)
    bpy.ops.object.modifier_add(type="BEVEL"); p.modifiers[-1].width = 0.06; p.modifiers[-1].segments = 4
    light((-12, -10, 12), 12, 3200, (1, .98, .95)); light((12, 6, 8), 16, 700, (.8, .88, 1))
    cam((0.8, -16, 2.6), (0.8, 0, 2.0), 85, 4.0, 16, (2400, 1350))
elif s == "rows":         # many sealed vials receding, one in focus
    rnd = random.Random(4); k = 0
    for row in range(5):
        for col in range(-3, 4):
            if rnd.random() < 0.12: continue
            vial("R%d" % k, (col * 2.3 + (row % 2) * 1.15, row * 2.4, 0), yaw=rnd.uniform(-30, 30),
                 cap=["steel", "mist", "chalk", "ink", "steel"][rnd.randrange(5)]); k += 1
    light((-16, -8, 14), 14, 4200, (1, .98, .95)); light((14, 10, 9), 18, 900, (.8, .88, 1))
    cam((-1.0, -9.5, 2.2), (0.6, 2.4, 2.6), 70, 1.2, 9.8, (2400, 1350))
elif s == "lying":        # top-down, a loose grid of vials lying on the slab, slide 4 light
    rnd = random.Random(9)
    for i in range(3):
        for j in range(4):
            vial("L%d%d" % (i, j), (j * 4.2 - 6.3 + rnd.uniform(-.2, .2), i * 3.2 - 3.2, 0.8), yaw=-28 + rnd.uniform(-3, 3), lie=True)
    light((-12, 12, 16), 12, 7000, (1, .99, .97), (0, 0, 0))
    c = cam((0, 0, 40), (0, 0, 0), 120, 22, 40, (2400, 1500))
for o in bpy.data.objects:  # vials lying need floor at their side: lift by radius
    pass
sc.view_settings.view_transform = "AgX"; sc.view_settings.look = "AgX - Medium High Contrast" if False else "None"
sc.render.image_settings.file_format = "PNG"; sc.render.filepath = os.path.join(a.out, s + ".png")
bpy.ops.render.render(write_still=True); print("DONE", s, flush=True)
