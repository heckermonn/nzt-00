"""PR6 / Alley: the street outside. A narrow wet service alley at night, deep crimson light, ending in one lit door.

Every light (and every emissive mesh) sits in exactly one Cycles light group, so the page can bring the scene up
fragment by fragment, one footstep at a time, and flicker the lamp, the sign and the hologram's spill live.

  /tmp/claude-0/bpyenv/bin/python alley.py -- --out RAW --frame f00 [--res 1600] [--samples 128]
  frames: f00..f15 = the walk (camera y from 0 to 22.2), d00..d07 = at the door while it slides open
Writes RAW/<frame>/pass_<group>.exr (denoised, linear) + meta.json (screen positions of the hologram, terminal, door).
"""
import argparse, json, math, os, random, shutil, sys, time
import bpy, bmesh  # noqa
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

GROUPS = ["amb", "crimson", "wash", "steam", "fluor", "haze", "sign", "holo", "door", "inside"]
WALK = 16
Y0, Y1 = 0.0, 21.7          # camera travel
DOOR_Y = 25.0               # end wall face
EYE = 1.62
HOLO = Vector((0.15, 17.0, 6.1))
TERM = Vector((0.95, DOOR_Y - 0.06, 1.38))

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True); ap.add_argument("--frame", required=True)
ap.add_argument("--res", type=int, default=1600); ap.add_argument("--samples", type=int, default=128)
ap.add_argument("--blend", action="store_true"); ap.add_argument("--force", action="store_true")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
final = os.path.join(a.out, a.frame)
if os.path.exists(os.path.join(final, "meta.json")) and not a.force:
    print("SKIP", a.frame); sys.exit(0)
random.seed(6)

# ------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
cy = sc.cycles
cy.device = "CPU"; cy.samples = a.samples
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.01; cy.adaptive_min_samples = 24
cy.use_denoising = False
cy.max_bounces = 8; cy.diffuse_bounces = 3; cy.glossy_bounces = 4; cy.transmission_bounces = 4
cy.volume_bounces = 1; cy.volume_step_rate = 4.0; cy.volume_max_steps = 256
cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0
cy.sample_clamp_indirect = 6.0; cy.use_light_tree = True
sc.render.threads_mode = "FIXED"; sc.render.threads = 4
sc.render.compositor_device = "CPU"
sc.view_settings.view_transform = "Standard"
sc.render.resolution_x = sc.render.resolution_y = a.res
vl = sc.view_layers[0]
vl.cycles.denoising_store_passes = True
for g in GROUPS:
    vl.lightgroups.add(name=g)

world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
bg.inputs["Color"].default_value = (0.010, 0.012, 0.022, 1); bg.inputs["Strength"].default_value = 0.6
world.lightgroup = "amb"


def nodes(m):
    m.use_nodes = True
    return m.node_tree.nodes, m.node_tree.links


def plain(name, rgb, rough=0.7, metal=0.0):
    m = bpy.data.materials.new(name); n, _ = nodes(m)
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    return m


def emit(name, rgb, strength):
    m = bpy.data.materials.new(name); n, l = nodes(m)
    for x in list(n):
        if x.type == "BSDF_PRINCIPLED":
            n.remove(x)
    e = n.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*rgb, 1); e.inputs["Strength"].default_value = strength
    l.new(e.outputs[0], n["Material Output"].inputs["Surface"])
    return m


def concrete(name, tint=(1, 1, 1)):
    """Board-formed concrete, stained in long vertical runs, darker and glossier where it is wet near the ground."""
    m = bpy.data.materials.new(name); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    tex = n.new("ShaderNodeTexCoord")
    # mottling
    n1 = n.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 1.6; n1.inputs["Detail"].default_value = 9; n1.inputs["Roughness"].default_value = 0.62
    l.new(geo.outputs["Position"], n1.inputs["Vector"])
    r1 = n.new("ShaderNodeValToRGB"); r1.color_ramp.elements[0].position = 0.3; r1.color_ramp.elements[1].position = 0.75
    r1.color_ramp.elements[0].color = (0.055 * tint[0], 0.055 * tint[1], 0.055 * tint[2], 1)
    r1.color_ramp.elements[1].color = (0.20 * tint[0], 0.195 * tint[1], 0.19 * tint[2], 1)
    l.new(n1.outputs["Fac"], r1.inputs["Fac"])
    # vertical streaks (rain run-off): noise stretched along Z
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (5.0, 5.0, 0.22)
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    n2 = n.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 3.0; n2.inputs["Detail"].default_value = 4
    l.new(mp.outputs[0], n2.inputs["Vector"])
    r2 = n.new("ShaderNodeValToRGB"); r2.color_ramp.elements[0].position = 0.35; r2.color_ramp.elements[1].position = 0.62
    r2.color_ramp.elements[0].color = (0.45, 0.43, 0.42, 1); r2.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(n2.outputs["Fac"], r2.inputs["Fac"])
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    l.new(r1.outputs[0], mul.inputs[6]); l.new(r2.outputs[0], mul.inputs[7])
    # board-form seams
    br = n.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 0.42; br.inputs["Mortar Size"].default_value = 0.006
    br.offset = 0.5; br.inputs["Color1"].default_value = (1, 1, 1, 1); br.inputs["Color2"].default_value = (0.92, 0.92, 0.92, 1)
    br.inputs["Mortar"].default_value = (0.35, 0.35, 0.35, 1)
    swz = n.new("ShaderNodeMapping"); swz.inputs["Rotation"].default_value = (math.radians(90), 0, math.radians(90))
    l.new(geo.outputs["Position"], swz.inputs["Vector"]); l.new(swz.outputs[0], br.inputs["Vector"])
    mul2 = n.new("ShaderNodeMix"); mul2.data_type = "RGBA"; mul2.blend_type = "MULTIPLY"; mul2.inputs["Factor"].default_value = 1.0
    l.new(mul.outputs[2], mul2.inputs[6]); l.new(br.outputs["Color"], mul2.inputs[7])
    # wet band near the ground
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    wet = n.new("ShaderNodeMapRange"); wet.inputs["From Min"].default_value = 1.1; wet.inputs["From Max"].default_value = 0.05
    l.new(sep.outputs["Z"], wet.inputs["Value"])
    dark = n.new("ShaderNodeMix"); dark.data_type = "RGBA"; dark.blend_type = "MULTIPLY"
    dark.inputs[7].default_value = (0.45, 0.45, 0.47, 1)
    l.new(wet.outputs[0], dark.inputs["Factor"]); l.new(mul2.outputs[2], dark.inputs[6])
    l.new(dark.outputs[2], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.88; rr.inputs["To Max"].default_value = 0.32
    l.new(wet.outputs[0], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.02
    n3 = n.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 38; n3.inputs["Detail"].default_value = 6
    l.new(geo.outputs["Position"], n3.inputs["Vector"]); l.new(n3.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs[0], b.inputs["Normal"])
    return m


def asphalt():
    """Wet tarmac: mostly a dull sheen, with standing water in broad shallow puddles that mirror the light."""
    m = bpy.data.materials.new("asphalt"); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    pn = n.new("ShaderNodeTexNoise"); pn.inputs["Scale"].default_value = 0.42; pn.inputs["Detail"].default_value = 5; pn.inputs["Roughness"].default_value = 0.55
    l.new(geo.outputs["Position"], pn.inputs["Vector"])
    pr = n.new("ShaderNodeMapRange"); pr.inputs["From Min"].default_value = 0.47; pr.inputs["From Max"].default_value = 0.53
    l.new(pn.outputs["Fac"], pr.inputs["Value"])
    # gutter: the middle line sits lower and holds water all the way down
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; l.new(sep.outputs["X"], ab.inputs[0])
    gu = n.new("ShaderNodeMapRange"); gu.inputs["From Min"].default_value = 0.42; gu.inputs["From Max"].default_value = 0.18
    l.new(ab.outputs[0], gu.inputs["Value"])
    mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; l.new(pr.outputs[0], mx.inputs[0]); l.new(gu.outputs[0], mx.inputs[1])
    fine = n.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 60; fine.inputs["Detail"].default_value = 8
    l.new(geo.outputs["Position"], fine.inputs["Vector"])
    cr = n.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0.012, 0.012, 0.013, 1); cr.color_ramp.elements[1].color = (0.07, 0.068, 0.066, 1)
    l.new(fine.outputs["Fac"], cr.inputs["Fac"])
    wetc = n.new("ShaderNodeMix"); wetc.data_type = "RGBA"; wetc.inputs[7].default_value = (0.006, 0.006, 0.007, 1)
    l.new(mx.outputs[0], wetc.inputs["Factor"]); l.new(cr.outputs[0], wetc.inputs[6]); l.new(wetc.outputs[2], b.inputs["Base Color"])
    ro = n.new("ShaderNodeMapRange"); ro.inputs["To Min"].default_value = 0.42; ro.inputs["To Max"].default_value = 0.025
    l.new(mx.outputs[0], ro.inputs["Value"]); l.new(ro.outputs[0], b.inputs["Roughness"])
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; l.new(mx.outputs[0], inv.inputs[1])
    bs = n.new("ShaderNodeMath"); bs.operation = "MULTIPLY"; bs.inputs[1].default_value = 0.5; l.new(inv.outputs[0], bs.inputs[0])
    bump = n.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.01
    l.new(bs.outputs[0], bump.inputs["Strength"]); l.new(fine.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    b.inputs["Specular IOR Level"].default_value = 0.5
    return m


def box(name, loc, size, mat, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object
    o.name = name; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = 2
    o.data.materials.append(mat); return o


def cyl(name, a, b, r, mat, verts=20):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.name = name
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); bpy.ops.object.shade_smooth()
    o.data.materials.append(mat); return o


def area(name, group, loc, tgt, size, power, rgb, shape="RECTANGLE", sy=None, spread=180):
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = shape; ld.size = size; ld.energy = power; ld.color = rgb
    if sy:
        ld.size_y = sy
    ld.spread = math.radians(spread)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); o.lightgroup = group
    o.visible_camera = False; return o


def point(name, group, loc, power, rgb, radius=0.1):
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = power; ld.color = rgb; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc; o.lightgroup = group; return o


def spot(name, group, loc, tgt, power, rgb, angle=70, blend=0.6, radius=0.05):
    ld = bpy.data.lights.new(name, "SPOT"); ld.energy = power; ld.color = rgb; ld.spot_size = math.radians(angle)
    ld.spot_blend = blend; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler(); o.lightgroup = group; return o


W = 1.75       # half width of the alley
H = 11.0
CON = concrete("concrete"); CON2 = concrete("concrete_r", (0.96, 0.98, 1.03))
STEEL = plain("steel", (0.30, 0.31, 0.32), 0.42, 1.0)
RUST = plain("rust", (0.16, 0.085, 0.05), 0.85, 0.2)
BLACK = plain("black", (0.02, 0.02, 0.02), 0.6)
PIPE = plain("pipe", (0.22, 0.22, 0.21), 0.5, 0.8)
CARD = plain("card", (0.20, 0.14, 0.09), 0.9)
WOOD = plain("wood", (0.17, 0.12, 0.08), 0.85)
PLAS = plain("plastic", (0.05, 0.06, 0.07), 0.35)
FIG = plain("figure", (0.008, 0.008, 0.009), 0.8)

# ground
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 12, 0)); g = bpy.context.object
g.scale = (2 * W + 6, 40, 1); bpy.ops.object.transform_apply(scale=True); g.data.materials.append(asphalt())
# walls: left one opens at y 17.2..19.6 onto a cross street full of haze
box("wall_r", (W + 0.3, 11, H / 2), (0.6, 34, H), CON2)
box("wall_l_a", (-W - 0.3, 6.6, H / 2), (0.6, 21.2, H), CON)
box("wall_l_b", (-W - 0.3, 22.6, H / 2), (0.6, 6.0, H), CON)
box("lintel", (-W - 0.3, 18.4, H - 2.2), (0.6, 2.4, 4.4), CON)
box("end", (0, DOOR_Y + 0.3, H / 2), (2 * W + 1.2, 0.6, H), CON2)
box("back_x", (-W - 4.6, 18.4, H / 2), (0.6, 12, H), CON)         # far wall of the cross street
# pilasters + the wall's tie-rod holes
for y in (2.5, 6.5, 10.5, 14.5, 22.5):
    for s in (-1, 1):
        if s < 0 and 16.6 < y < 20.2:
            continue
        box("pil", (s * (W - 0.06), y, H / 2), (0.14, 0.55, H), CON if s < 0 else CON2)
# overhead walkway slab far up (frames the sky)
box("bridge", (0, 9.0, 8.4), (2 * W, 1.2, 0.35), CON)
cyl("rail", (-W, 8.5, 9.3), (W, 8.5, 9.3), 0.03, STEEL)

# pipes
cyl("pipe_l", (-W + 0.16, -3, 3.3), (-W + 0.16, 16.8, 3.3), 0.11, PIPE)
cyl("pipe_l2", (-W + 0.14, -3, 3.65), (-W + 0.14, 16.8, 3.65), 0.06, RUST)
cyl("pipe_r", (W - 0.18, -3, 2.55), (W - 0.18, 24.8, 2.55), 0.08, PIPE)
cyl("down_r", (W - 0.18, 9.6, 0), (W - 0.18, 9.6, 8.5), 0.07, PIPE)
cyl("down_l", (-W + 0.16, 3.8, 0), (-W + 0.16, 3.8, 3.3), 0.09, PIPE)
cyl("vent_l", (-W + 0.18, 7.0, 3.3), (-W + 0.55, 7.0, 2.1), 0.1, RUST)  # the broken branch the steam comes from
for y in (0.5, 4.5, 8.5, 12.5, 16.0):
    cyl("brk", (-W + 0.02, y, 3.3), (-W + 0.2, y, 3.3), 0.025, STEEL)

# unmarked steel doors
def steel_door(x_sign, y, w=1.0, h=2.2):
    x = x_sign * (W - 0.02)
    box("frame", (x, y, h / 2 + 0.04), (0.08, w + 0.16, h + 0.16), STEEL)
    box("leaf", (x - x_sign * 0.03, y, h / 2 + 0.04), (0.06, w, h), plain("leaf", (0.12, 0.125, 0.13), 0.55, 0.9), 0.01)
    box("bar", (x - x_sign * 0.08, y + w * 0.35, 1.05), (0.04, 0.05, 0.3), STEEL)
steel_door(1, 5.2); steel_door(-1, 13.0, 1.2, 2.4); steel_door(1, 19.4, 0.9, 2.1)

# AC units, boxes, a dumpster, pallets, a tyre
for (x, y, z) in ((W - 0.35, 3.0, 4.6), (W - 0.35, 13.8, 5.4), (-W + 0.35, 10.2, 5.0), (-W + 0.35, 23.4, 4.2)):
    box("ac", (x, y, z), (0.7, 0.9, 0.7), plain("ac", (0.26, 0.27, 0.27), 0.6, 0.3), 0.02)
box("dumpster", (W - 0.75, 9.6, 0.62), (1.1, 2.0, 1.24), plain("dump", (0.06, 0.09, 0.08), 0.55, 0.4), 0.03)
box("lid", (W - 0.85, 9.6, 1.29), (1.25, 2.05, 0.08), BLACK, 0.01, (0, math.radians(-7), 0))
for i, (x, y, z, r) in enumerate(((-W + 0.45, 2.0, 0.22, 12), (-W + 0.5, 2.6, 0.18, -8), (-W + 0.4, 2.3, 0.55, 30),
                                   (W - 0.5, 15.4, 0.25, 5), (-W + 0.55, 11.2, 0.2, 40), (W - 0.45, 21.5, 0.3, -15))):
    box("card%d" % i, (x, y, z), (0.6, 0.5, 0.42), CARD, 0.01, (0, 0, math.radians(r)))
for k in range(3):
    box("pal", (-W + 0.62, 15.6, 0.08 + k * 0.15), (1.0, 1.2, 0.1), WOOD, 0, (0, 0, math.radians(4 * k)))
box("pal_up", (W - 0.12, 7.0, 0.62), (0.12, 1.2, 1.0), WOOD, 0, (math.radians(-12), 0, 0))
bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.11, location=(-W + 0.5, 19.9, 0.11)); bpy.context.object.data.materials.append(BLACK)
box("crate", (W - 0.5, 1.2, 0.3), (0.6, 0.6, 0.6), plain("crate", (0.12, 0.10, 0.08), 0.8), 0.02)

# cables sagging between the walls
def cable(y, z, sag, r=0.012):
    cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); pts = 24; sp.points.add(pts - 1)
    for i in range(pts):
        t = i / (pts - 1); x = -W + 2 * W * t
        sp.points[i].co = (x, y + 0.3 * math.sin(t * 3), z - sag * 4 * t * (1 - t), 1)
    o = bpy.data.objects.new("cable", cu); sc.collection.objects.link(o); o.data.materials.append(BLACK)
for (y, z, s) in ((1.5, 6.4, 0.6), (4.2, 7.0, 0.9), (6.0, 5.6, 0.35), (11.6, 7.6, 1.1), (12.2, 7.3, 0.7), (15.5, 6.8, 0.8), (20.5, 7.8, 1.0), (21.0, 6.2, 0.4)):
    cable(y, z, s)

# the distant figure in the cross street, back-lit by haze
def figure(x, y):
    parts = []
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.11, location=(x, y, 1.66)); parts.append(bpy.context.object)
    bpy.context.object.scale = (0.9, 1.0, 1.15)
    bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=0.33, radius2=0.2, depth=1.05, location=(x, y, 1.0)); parts.append(bpy.context.object)
    bpy.context.object.scale = (1.0, 0.62, 1.0)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.2, location=(x, y, 1.42)); parts.append(bpy.context.object)
    bpy.context.object.scale = (1.15, 0.7, 0.55)
    for s in (-1, 1):
        parts.append(cyl("leg", (x + s * 0.09, y, 0), (x + s * 0.1, y, 0.55), 0.06, FIG))
        parts.append(cyl("arm", (x + s * 0.24, y, 1.42), (x + s * 0.29, y + 0.03, 0.82), 0.05, FIG))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.14, location=(x, y, 1.52)); parts.append(bpy.context.object)
    for p in parts:
        if not p.data.materials:
            p.data.materials.append(FIG)
        bpy.context.view_layer.objects.active = p; bpy.ops.object.shade_smooth()
figure(-W - 2.2, 18.9)

# ------------------------------------------------------------------ lights (one group each)
CRIM = (1.0, 0.06, 0.16); PINK = (1.0, 0.22, 0.42); MAG = (0.95, 0.18, 0.62)
# crimson: a long neon strip high on the left wall past the junction + a red sodium-like lamp on the bridge
neon = cyl("neon", (-W + 0.1, 20.0, 6.6), (-W + 0.1, 24.6, 6.6), 0.035, emit("neon", CRIM, 40)); neon.lightgroup = "crimson"
area("neon_l", "crimson", (-W + 0.25, 22.3, 6.5), (0.5, 21.0, 0.0), 4.6, 2600, CRIM, sy=0.12)
spot("bridge_red", "crimson", (0.0, 9.0, 8.15), (0.2, 11.0, 0.0), 2400, (1.0, 0.1, 0.2), angle=95, blend=0.9, radius=0.3)
area("end_glow", "crimson", (0.0, DOOR_Y - 3.0, 10.8), (0, 14, 0), 3.0, 600, PINK)
# wash: the sky glow of the city spilling down the walls, dusty rose
area("sky", "wash", (0, 10, 12.5), (0, 10, 0), 3.0, 380, (0.8, 0.32, 0.42), sy=30)
area("sky_back", "wash", (0, -4.0, 6), (0, 10, 2), 3.0, 260, (0.55, 0.30, 0.45), sy=4)
# haze: the cross street, a wall of pink fog light behind the figure
hz = box("haze_card", (-W - 4.2, 18.4, H / 2), (0.05, 11, H), emit("hz", PINK, 5.0)); hz.lightgroup = "haze"
area("haze_l", "haze", (-W - 3.6, 18.4, 3.0), (0, 18.4, 0.5), 5.0, 1500, PINK, sy=2.6)
# steam: a lamp behind the broken vent, lighting the plume from inside
point("steam_lamp", "steam", (-W + 0.5, 7.6, 2.5), 420, (1.0, 0.55, 0.62), 0.4)
# fluorescent: a failing tube on the right wall
fx = box("fl_housing", (W - 0.07, 11.6, 3.1), (0.1, 1.3, 0.12), plain("hous", (0.5, 0.5, 0.5), 0.5))
tube = cyl("fl_tube", (W - 0.12, 11.0, 3.06), (W - 0.12, 12.2, 3.06), 0.022, emit("tube", (0.72, 1.0, 0.86), 30)); tube.lightgroup = "fluor"
area("fl", "fluor", (W - 0.16, 11.6, 3.0), (0, 11.6, 0.5), 1.2, 240, (0.72, 1.0, 0.88), sy=0.06)
# sign: an electronic blade sign with half its segments dead
sgn = box("sign_body", (W - 0.45, 15.6, 4.7), (0.6, 0.09, 2.2), BLACK)
SIGN = emit("signled", (1.0, 0.3, 0.12), 9)
for i, txt in enumerate(["A_EA 6", "ACCE__", "-- : --"]):
    cu = bpy.data.curves.new("t", "FONT"); cu.body = txt; cu.size = 0.14; cu.align_x = "CENTER"; cu.extrude = 0.004
    t = bpy.data.objects.new("sign_t", cu); sc.collection.objects.link(t)
    t.location = (W - 0.45, 15.6 - 0.05, 5.35 - i * 0.36); t.rotation_euler = (math.radians(90), 0, 0); t.data.materials.append(SIGN); t.lightgroup = "sign"
for i in range(9):
    if i in (2, 5, 6):
        continue
    seg = box("seg", (W - 0.45 - 0.2 + (i % 3) * 0.2, 15.6 - 0.05, 4.25 - (i // 3) * 0.16), (0.15, 0.01, 0.06), SIGN); seg.lightgroup = "sign"
area("sign_l", "sign", (W - 0.45, 15.2, 4.7), (-0.2, 13.0, 0.5), 0.6, 160, (1.0, 0.3, 0.12), sy=2.0)
# hologram spill: the face's light falling on the alley (the face itself is drawn live in the page)
area("holo_l", "holo", HOLO + Vector((0, 0, 0.2)), (0, 15.5, 0), 2.4, 1500, MAG, shape="DISK")
area("holo_c", "holo", HOLO + Vector((0, -0.4, -0.3)), (0, 8.0, 0), 1.6, 380, (0.35, 0.65, 1.0), shape="DISK")
for _n in ("holo_l", "holo_c"):
    bpy.data.objects[_n].visible_glossy = False   # no disc in the puddles; the face is drawn live
# the door: one cold-white lamp, a recessed frame, a sliding steel leaf, the terminal
DOORW, DOORH = 1.12, 2.36
box("d_frame_l", (-DOORW / 2 - 0.07, DOOR_Y - 0.02, DOORH / 2), (0.14, 0.12, DOORH + 0.14), STEEL)
box("d_frame_r", (DOORW / 2 + 0.07, DOOR_Y - 0.02, DOORH / 2), (0.14, 0.12, DOORH + 0.14), STEEL)
box("d_head", (0, DOOR_Y - 0.02, DOORH + 0.07), (DOORW + 0.28, 0.12, 0.14), STEEL)
door_open = 0.0
if a.frame.startswith("d"):
    k = int(a.frame[1:]) / 7.0
    door_open = k * k * (3 - 2 * k)
# a hole in the end wall behind the door, and a white room behind it
hole = box("cut", (0, DOOR_Y + 0.3, DOORH / 2), (DOORW, 1.0, DOORH), BLACK)
hole.display_type = "WIRE"; hole.hide_render = True
endw = bpy.data.objects["end"]; md = endw.modifiers.new("hole", "BOOLEAN"); md.object = hole; md.operation = "DIFFERENCE"
WHITE = plain("inside", (0.86, 0.89, 0.9), 0.6)
box("in_floor", (0, DOOR_Y + 3.0, -0.01), (3.0, 5.0, 0.02), WHITE)
box("in_back", (0, DOOR_Y + 5.4, 1.5), (3.0, 0.1, 3.0), WHITE)
box("in_l", (-1.0, DOOR_Y + 3.0, 1.5), (0.1, 5.0, 3.0), WHITE)
box("in_r", (1.0, DOOR_Y + 3.0, 1.5), (0.1, 5.0, 3.0), WHITE)
box("in_ceil", (0, DOOR_Y + 3.0, 2.8), (3.0, 5.0, 0.1), WHITE)
area("inside_l", "inside", (0, DOOR_Y + 2.6, 2.7), (0, DOOR_Y + 2.6, 0), 1.6, 2400, (0.9, 0.96, 1.0), sy=4.0)
leaf = box("d_leaf", (door_open * (DOORW + 0.05), DOOR_Y - 0.1, DOORH / 2), (DOORW, 0.07, DOORH),
           plain("leafd", (0.30, 0.31, 0.32), 0.3, 1.0), 0.004)
box("d_seam", (door_open * (DOORW + 0.05), DOOR_Y - 0.14, DOORH * 0.5), (0.004, 0.01, DOORH * 0.98), BLACK)
lamp = cyl("d_lamp", (-0.18, DOOR_Y - 0.12, DOORH + 0.34), (0.18, DOOR_Y - 0.12, DOORH + 0.34), 0.03, emit("lamp", (0.86, 0.93, 1.0), 80))
lamp.lightgroup = "door"
box("d_hood", (0, DOOR_Y - 0.12, DOORH + 0.4), (0.5, 0.18, 0.05), STEEL)
spot("d_spot", "door", (0, DOOR_Y - 0.3, DOORH + 0.3), (0, DOOR_Y - 1.6, 0), 1600, (0.86, 0.93, 1.0), angle=110, blend=0.85, radius=0.15)
box("term_body", (TERM.x, DOOR_Y - 0.06, TERM.z), (0.2, 0.08, 0.3), STEEL, 0.01)
scr = box("term_scr", (TERM.x, DOOR_Y - 0.105, TERM.z + 0.03), (0.15, 0.005, 0.11), emit("scr", (0.55, 0.9, 1.0), 3.5)); scr.lightgroup = "door"
point("term_glow", "door", (TERM.x, DOOR_Y - 0.25, TERM.z), 2.5, (0.55, 0.9, 1.0), 0.05)

# ------------------------------------------------------------------ volumes: alley air and the steam plume
def volume(name, loc, size, density, noise_scale, group):
    o = box(name, loc, size, bpy.data.materials.new(name + "_m"))
    m = o.data.materials[0]; n, l = nodes(m)
    for x in list(n):
        if x.type == "BSDF_PRINCIPLED":
            n.remove(x)
    pv = n.new("ShaderNodeVolumePrincipled"); pv.inputs["Color"].default_value = (1, 1, 1, 1)
    pv.inputs["Anisotropy"].default_value = 0.35
    geo = n.new("ShaderNodeNewGeometry")
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = noise_scale; nz.inputs["Detail"].default_value = 4
    l.new(geo.outputs["Position"], nz.inputs["Vector"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["From Min"].default_value = 0.35; rr.inputs["From Max"].default_value = 0.75
    rr.inputs["To Max"].default_value = density
    l.new(nz.outputs["Fac"], rr.inputs["Value"])
    if group == "steam":  # fade out towards the top and the edges of the plume
        tc = n.new("ShaderNodeTexCoord"); grad = n.new("ShaderNodeTexGradient"); grad.gradient_type = "SPHERICAL"
        mp = n.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (0.5, 0.5, 0.42); mp.inputs["Scale"].default_value = (2.0, 2.0, 1.6)
        sub = n.new("ShaderNodeVectorMath"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (0.5, 0.5, 0.42)
        l.new(tc.outputs["Generated"], sub.inputs[0])
        sc2 = n.new("ShaderNodeVectorMath"); sc2.operation = "MULTIPLY"; sc2.inputs[1].default_value = (2.0, 2.0, 1.4)
        l.new(sub.outputs[0], sc2.inputs[0]); l.new(sc2.outputs[0], grad.inputs["Vector"])
        mm = n.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; l.new(rr.outputs[0], mm.inputs[0]); l.new(grad.outputs["Fac"], mm.inputs[1])
        l.new(mm.outputs[0], pv.inputs["Density"])
    else:
        l.new(rr.outputs[0], pv.inputs["Density"])
    l.new(pv.outputs[0], n["Material Output"].inputs["Volume"])
    return o
volume("air", (-1.5, 12, H / 2), (2 * W + 6.8, 32, H), 0.022, 0.25, "air")
volume("steam", (-W + 0.9, 7.2, 2.4), (1.6, 2.0, 3.6), 3.0, 1.8, "steam")

# ------------------------------------------------------------------ camera
if a.frame.startswith("f"):
    i = int(a.frame[1:]); t = i / (WALK - 1)
    cam_y = Y0 + (Y1 - Y0) * t
else:
    cam_y = Y1
cam_x = 0.12 * math.sin(cam_y * 0.6)   # a slight weave, as a person walks
bpy.ops.object.camera_add(location=(cam_x, cam_y, EYE)); cam = bpy.context.object
look = Vector((0.0, cam_y + 12.0, EYE + 0.9 + 0.05 * (cam_y / Y1)))
cam.rotation_euler = (look - cam.location).to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 18; cam.data.sensor_width = 36; cam.data.sensor_fit = "HORIZONTAL"
sc.camera = cam
cam.data.clip_end = 200

# ------------------------------------------------------------------ compositor: denoise each light group
part = final + ".part"; shutil.rmtree(part, ignore_errors=True); os.makedirs(part)
ng = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ng
rl = ng.nodes.new("CompositorNodeRLayers"); fo = ng.nodes.new("CompositorNodeOutputFile")
fo.directory = part + os.sep; fo.file_name = ""; fo.format.media_type = "IMAGE"; fo.format.file_format = "OPEN_EXR"
fo.format.color_depth = "16"; fo.format.exr_codec = "ZIP"; fo.format.color_mode = "RGB"
def denoise(sock):
    dn = ng.nodes.new("CompositorNodeDenoise")
    ng.links.new(sock, dn.inputs["Image"]); ng.links.new(rl.outputs["Denoising Albedo"], dn.inputs["Albedo"])
    ng.links.new(rl.outputs["Denoising Normal"], dn.inputs["Normal"])
    for k, v in (("Prefilter", "Accurate"), ("HDR", True)):
        try:
            dn.inputs[k].default_value = v
        except Exception:
            pass
    return dn.outputs[0]
for gname in GROUPS:
    it = fo.file_output_items.new("RGBA", "pass_" + gname); ng.links.new(denoise(rl.outputs["Combined_" + gname]), fo.inputs[it.name])
it = fo.file_output_items.new("RGBA", "beauty"); ng.links.new(denoise(rl.outputs["Image"]), fo.inputs[it.name])

if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, a.frame + ".blend"))
t0 = time.time()
sc.render.filepath = os.path.join(part, "_r")
bpy.ops.render.render(write_still=False)
dt = time.time() - t0

def scr(p):
    v = world_to_camera_view(sc, cam, Vector(p)); return [round(v.x, 5), round(1 - v.y, 5), round(v.z, 3)]
d0, d1 = Vector((-DOORW / 2, DOOR_Y - 0.1, 0)), Vector((DOORW / 2, DOOR_Y - 0.1, DOORH))
meta = dict(frame=a.frame, cam=[cam_x, cam_y, EYE], res=a.res, samples=a.samples, render_s=round(dt, 1), groups=GROUPS,
            holo=scr(HOLO), term=scr(TERM), door=[scr(d0), scr(d1)], sign=scr((W - 0.45, 15.6, 4.7)), door_open=door_open)
json.dump(meta, open(os.path.join(part, "meta.json"), "w"))
shutil.rmtree(final, ignore_errors=True); os.replace(part, final)
print("RENDERED", a.frame, "%.1fs" % dt, flush=True)
