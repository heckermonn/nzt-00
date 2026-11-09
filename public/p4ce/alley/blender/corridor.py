"""PR6 / Alley: inside. A long, dry, bright locker-room corridor in the brand kit's colours (chalk, mist, steel blue),
lit by frosted ceiling strips, ending in a frosted glass wall with a dark sphere behind it (the kit's frosted cube).
The ceiling strips sit in four light groups by distance, so the page can switch the corridor on bank by bank.

  /tmp/claude-0/bpyenv/bin/python corridor.py -- --out RAW --frame c00 [--res 1100] [--samples 96]
  frames c00..c13: the walk (camera y from 0 to 23)
"""
import argparse, json, math, os, shutil, sys, time
import bpy  # noqa
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

GROUPS = ["amb", "bank1", "bank2", "bank3", "bank4", "end"]
WALK = 14
Y0, Y1 = 0.0, 23.0
END_Y = 30.0
EYE = 1.62
W = 1.6      # half width (locker faces)
H = 3.3
LOCKER = Vector((W - 0.01, 27.25, 1.5))   # locker 0047, right side near the end

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--frame", required=True)
ap.add_argument("--res", type=int, default=1100); ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--force", action="store_true")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
final = os.path.join(a.out, a.frame)
if os.path.exists(os.path.join(final, "meta.json")) and not a.force:
    print("SKIP", a.frame); sys.exit(0)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; cy = sc.cycles
cy.device = "CPU"; cy.samples = a.samples
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.01; cy.adaptive_min_samples = 24
cy.use_denoising = False; cy.max_bounces = 8; cy.diffuse_bounces = 4; cy.glossy_bounces = 3; cy.transmission_bounces = 6
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0; cy.sample_clamp_indirect = 8.0
sc.render.threads_mode = "FIXED"; sc.render.threads = 4; sc.render.compositor_device = "CPU"
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x = sc.render.resolution_y = a.res
vl = sc.view_layers[0]; vl.cycles.denoising_store_passes = True
for g in GROUPS:
    vl.lightgroups.add(name=g)
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.5, 0.56, 0.6, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.05
world.lightgroup = "amb"


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


CHALK, MIST, STEEL_BLUE, INK, ORANGE = lin("F2F3EF"), lin("CAD5DA"), lin("718B9A"), lin("171C1F"), lin("E98546")


def mat(name, rgb, rough=0.5, metal=0.0, coat=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Coat Weight"].default_value = coat
    return m


def emit(name, rgb, s):
    m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links
    n.remove(n["Principled BSDF"]); e = n.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*rgb, 1); e.inputs["Strength"].default_value = s
    l.new(e.outputs[0], n["Material Output"].inputs["Surface"]); return m


def glass(name, rough):
    m = mat(name, (0.93, 0.96, 0.97), rough); b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = 1.45; return m


def box(name, loc, size, m, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc); o = bpy.context.object
    o.name = name; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 3
    o.data.materials.append(m); return o


def area(name, group, loc, size, sy, power, rgb=(0.92, 0.97, 1.0)):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = "RECTANGLE"; ld.size = size; ld.size_y = sy; ld.energy = power; ld.color = rgb
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc; o.lightgroup = group; return o


FLOOR = mat("floor", (MIST[0] * 0.78, MIST[1] * 0.8, MIST[2] * 0.82), 0.16, coat=0.3)
WALL = mat("wall", CHALK, 0.85)
LOCK = mat("locker", MIST, 0.42, 0.0, 0.15)
PLINTH = mat("plinth", STEEL_BLUE, 0.5)
DARK = mat("slot", INK, 0.7)
PLATE = mat("plate", CHALK, 0.4)
INKM = mat("ink", INK, 0.5)
STEEL = mat("steel", (0.62, 0.64, 0.65), 0.28, 1.0)
BENCH = mat("bench", (CHALK[0] * 0.9, CHALK[1] * 0.9, CHALK[2] * 0.9), 0.55)
ORG = mat("orange", ORANGE, 0.5)

# shell
L = END_Y + 4
box("floor", (0, L / 2 - 3, -0.05), (2 * W + 2, L + 2, 0.1), FLOOR)
box("ceil", (0, L / 2 - 3, H + 0.05), (2 * W + 2, L + 2, 0.1), WALL)
for s in (-1, 1):
    box("wall", (s * (W + 0.62), L / 2 - 3, H / 2), (0.1, L + 2, H), WALL)
box("back", (0, -3.4, H / 2), (2 * W + 2, 0.1, H), WALL)
box("drain", (0, L / 2 - 3, 0.002), (0.12, L, 0.004), STEEL)

# lockers: 0.5 m modules, both sides, numbered so the right side counts up to 0047 near the end
num_r = 47 - int((27.25 - 1.0) / 0.5)
for s in (-1, 1):
    y = -2.75
    k = 0
    while y < END_Y - 0.6:
        x = s * (W + 0.3)
        box("lk", (x, y, 1.12), (0.58, 0.48, 1.92), LOCK, 0.008)
        box("plinth", (s * (W + 0.3), y, 0.08), (0.6, 0.5, 0.16), PLINTH)
        for j in range(3):
            box("vent", (s * (W + 0.005), y, 1.86 - j * 0.035), (0.01, 0.26, 0.012), DARK)
        box("pull", (s * (W + 0.01), y + 0.16, 1.12), (0.02, 0.02, 0.14), STEEL)
        box("plate", (s * (W + 0.008), y, 1.58), (0.006, 0.17, 0.07), PLATE)
        if s > 0:
            n = num_r + k
        else:
            n = 101 + k
        cu = bpy.data.curves.new("t", "FONT"); cu.body = "%04d" % n; cu.size = 0.042; cu.align_x = "CENTER"; cu.align_y = "CENTER"
        t = bpy.data.objects.new("num", cu); sc.collection.objects.link(t)
        t.location = (s * (W + 0.0125), y, 1.58); t.rotation_euler = (math.radians(90), 0, math.radians(-90 * s))
        t.data.materials.append(INKM)
        if s > 0 and n == 47:
            box("tab", (W + 0.012, y - 0.105, 1.58), (0.006, 0.014, 0.07), ORG)
        y += 0.5; k += 1
    box("top", (s * (W + 0.3), (END_Y - 3.4) / 2, 2.1), (0.6, END_Y + 2.4, 0.04), LOCK)
# benches along the lockers, with gaps
for s in (-1, 1):
    for (y0, y1) in ((1.0, 6.0), (9.0, 14.0), (17.0, 22.0)):
        box("bench", (s * (W - 0.24), (y0 + y1) / 2, 0.44), (0.36, y1 - y0, 0.05), BENCH, 0.01)
        for yy in (y0 + 0.3, y1 - 0.3):
            box("leg", (s * (W - 0.24), yy, 0.21), (0.3, 0.04, 0.42), STEEL)

# ceiling strips: frosted panels in two lines, banked by distance
STRIP = emit("strip", (0.93, 0.97, 1.0), 3.0)
banks = [(-3.0, 6.0), (6.0, 14.0), (14.0, 22.0), (22.0, END_Y)]
for bi, (b0, b1) in enumerate(banks):
    g = "bank%d" % (bi + 1)
    y = b0 + 0.75
    while y < b1 - 0.2:
        for xx in (-0.55, 0.55):
            o = box("strip", (xx, y, H - 0.01), (0.22, 1.25, 0.02), STRIP); o.lightgroup = g
            area("al", g, (xx, y, H - 0.04), 0.22, 1.25, 16)
        y += 1.5

# the end: a frosted glass wall, lit from behind, with a dark sphere standing behind it
box("glass", (0, END_Y, H / 2), (2 * W + 1.2, 0.06, H), glass("frost", 0.42))
box("behind_floor", (0, END_Y + 3, -0.05), (2 * W + 2, 6, 0.1), WALL)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.62, location=(0.2, END_Y + 1.1, 0.62), segments=64, ring_count=32)
sph = bpy.context.object; bpy.ops.object.shade_smooth(); sph.data.materials.append(mat("sphere", INK, 0.6))
bk = box("backlight", (0, END_Y + 4.0, H / 2), (2 * W + 2, 0.05, H), emit("bl", (0.9, 0.95, 1.0), 4.0)); bk.lightgroup = "end"
ld = bpy.data.lights.new("endl", "AREA"); ld.size = 3; ld.size_y = 3; ld.energy = 400; ld.color = (0.9, 0.95, 1.0)
o = bpy.data.objects.new("endl", ld); sc.collection.objects.link(o); o.location = (0, END_Y + 3.6, 1.8)
o.rotation_euler = (math.radians(90), 0, math.radians(180)); o.lightgroup = "end"

# camera
i = int(a.frame[1:]); t = i / (WALK - 1)
cam_y = Y0 + (Y1 - Y0) * t
bpy.ops.object.camera_add(location=(0, cam_y, EYE)); cam = bpy.context.object
look = Vector((0, cam_y + 12, EYE + 0.15))
cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 18; cam.data.sensor_width = 36; sc.camera = cam

part = final + ".part"; shutil.rmtree(part, ignore_errors=True); os.makedirs(part)
ng = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ng
rl = ng.nodes.new("CompositorNodeRLayers"); fo = ng.nodes.new("CompositorNodeOutputFile")
fo.directory = part + os.sep; fo.file_name = ""; fo.format.media_type = "IMAGE"; fo.format.file_format = "OPEN_EXR"
fo.format.color_depth = "16"; fo.format.exr_codec = "ZIP"; fo.format.color_mode = "RGB"
def denoise(sock):
    dn = ng.nodes.new("CompositorNodeDenoise")
    ng.links.new(sock, dn.inputs["Image"]); ng.links.new(rl.outputs["Denoising Albedo"], dn.inputs["Albedo"])
    ng.links.new(rl.outputs["Denoising Normal"], dn.inputs["Normal"])
    try:
        dn.inputs["HDR"].default_value = True
    except Exception:
        pass
    return dn.outputs[0]
for gname in GROUPS:
    it = fo.file_output_items.new("RGBA", "pass_" + gname); ng.links.new(denoise(rl.outputs["Combined_" + gname]), fo.inputs[it.name])
it = fo.file_output_items.new("RGBA", "beauty"); ng.links.new(denoise(rl.outputs["Image"]), fo.inputs[it.name])
t0 = time.time(); sc.render.filepath = os.path.join(part, "_r"); bpy.ops.render.render(write_still=False); dt = time.time() - t0
def scr(p):
    v = world_to_camera_view(sc, cam, Vector(p)); return [round(v.x, 5), round(1 - v.y, 5), round(v.z, 3)]
json.dump(dict(frame=a.frame, cam=[0, cam_y, EYE], res=a.res, render_s=round(dt, 1), groups=GROUPS,
               locker=scr(LOCKER), sphere=scr((0.2, END_Y + 1.1, 0.9))), open(os.path.join(part, "meta.json"), "w"))
shutil.rmtree(final, ignore_errors=True); os.replace(part, final)
print("RENDERED", a.frame, "%.1fs" % dt, flush=True)
