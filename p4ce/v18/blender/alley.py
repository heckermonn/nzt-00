"""PR6 / Institute: the alley. The dead end of a wet service alley at night: two heavy steel doors, each carrying one
cast insignia and a sliding viewing slit. Cool light only (the kit's steel blues), one small orange pilot lamp.

  PY alley.py -- --out RAW --frame wide|closeL|closeR [--sym ouroboros] [--crop med|slit] [--res 1400] [--samples 96]
  frames:  wide    the stable view of both doors (slits shut)
           closeL  at the left door, slit open (the page slides a shut-slit tile over it)   closeR likewise
  --crop med   renders only the medallion rectangle(s) with --sym on both doors -> RAW/<frame>_med_<sym>/
  --crop slit  renders only the slit rectangle with the shutter closed            -> RAW/<frame>_slit/
Live light groups (the page weights them): lampL, lampR, tube, holo.
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa
from mathutils import Vector  # noqa
import common as C  # noqa
from common import box, cyl, sphere, plain, emit, area, point, spot, nodes  # noqa

a = C.args()
name = a.frame + ("_med_" + a.sym if a.crop == "med" else "_slit" if a.crop == "slit" else "")
if C.done(a.out, name) and not a.force:
    print("SKIP", name); sys.exit(0)
random.seed(6)
EXTRAS = ["lampL", "lampR", "tube", "holo"]
sc = C.setup(a.res, a.samples, EXTRAS, volumes=True)
C.world(sc, (0.012, 0.016, 0.026), 0.4)

W, H = 2.35, 11.0            # half width, wall height
DOOR_Y = 6.6                 # face of the end wall
DX = 1.08                    # door centres at x = -DX, +DX
DW, DH = 1.36, 2.92          # door leaf
MED_Z, MED_R = 2.24, 0.33
SLIT_Z, SLIT_W, SLIT_H = 1.60, 0.44, 0.11
close = a.frame.startswith("close")
side = -1 if a.frame.endswith("L") else 1
slit_open = close and a.crop != "slit"


# ------------------------------------------------------------------ materials
def concrete(nm, tint=(1, 1, 1)):
    """Board-formed concrete, stained in long vertical runs, darker and glossier where it is wet near the ground."""
    m = bpy.data.materials.new(nm); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    n1 = n.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 1.6; n1.inputs["Detail"].default_value = 9; n1.inputs["Roughness"].default_value = 0.62
    l.new(geo.outputs["Position"], n1.inputs["Vector"])
    r1 = n.new("ShaderNodeValToRGB"); r1.color_ramp.elements[0].position = 0.3; r1.color_ramp.elements[1].position = 0.75
    r1.color_ramp.elements[0].color = (0.05 * tint[0], 0.052 * tint[1], 0.056 * tint[2], 1)
    r1.color_ramp.elements[1].color = (0.19 * tint[0], 0.195 * tint[1], 0.20 * tint[2], 1)
    l.new(n1.outputs["Fac"], r1.inputs["Fac"])
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (5.0, 5.0, 0.22)
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    n2 = n.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 3.0; n2.inputs["Detail"].default_value = 4
    l.new(mp.outputs[0], n2.inputs["Vector"])
    r2 = n.new("ShaderNodeValToRGB"); r2.color_ramp.elements[0].position = 0.35; r2.color_ramp.elements[1].position = 0.62
    r2.color_ramp.elements[0].color = (0.42, 0.42, 0.43, 1); r2.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(n2.outputs["Fac"], r2.inputs["Fac"])
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    l.new(r1.outputs[0], mul.inputs[6]); l.new(r2.outputs[0], mul.inputs[7])
    br = n.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 0.42; br.inputs["Mortar Size"].default_value = 0.006
    br.offset = 0.5; br.inputs["Color1"].default_value = (1, 1, 1, 1); br.inputs["Color2"].default_value = (0.92, 0.92, 0.92, 1)
    br.inputs["Mortar"].default_value = (0.35, 0.35, 0.35, 1)
    swz = n.new("ShaderNodeMapping"); swz.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
    l.new(geo.outputs["Position"], swz.inputs["Vector"]); l.new(swz.outputs[0], br.inputs["Vector"])
    mul2 = n.new("ShaderNodeMix"); mul2.data_type = "RGBA"; mul2.blend_type = "MULTIPLY"; mul2.inputs["Factor"].default_value = 1.0
    l.new(mul.outputs[2], mul2.inputs[6]); l.new(br.outputs["Color"], mul2.inputs[7])
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    wet = n.new("ShaderNodeMapRange"); wet.inputs["From Min"].default_value = 1.3; wet.inputs["From Max"].default_value = 0.05
    l.new(sep.outputs["Z"], wet.inputs["Value"])
    dark = n.new("ShaderNodeMix"); dark.data_type = "RGBA"; dark.blend_type = "MULTIPLY"
    dark.inputs[7].default_value = (0.45, 0.45, 0.47, 1)
    l.new(wet.outputs[0], dark.inputs["Factor"]); l.new(mul2.outputs[2], dark.inputs[6])
    l.new(dark.outputs[2], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.86; rr.inputs["To Max"].default_value = 0.3
    l.new(wet.outputs[0], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.02
    n3 = n.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 38; n3.inputs["Detail"].default_value = 6
    l.new(geo.outputs["Position"], n3.inputs["Vector"]); l.new(n3.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs[0], b.inputs["Normal"])
    return m


def asphalt():
    """Wet tarmac: a dull sheen, with standing water in broad shallow puddles that mirror the lamps."""
    m = bpy.data.materials.new("asphalt"); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    pn = n.new("ShaderNodeTexNoise"); pn.inputs["Scale"].default_value = 0.5; pn.inputs["Detail"].default_value = 5; pn.inputs["Roughness"].default_value = 0.55
    l.new(geo.outputs["Position"], pn.inputs["Vector"])
    pr = n.new("ShaderNodeMapRange"); pr.inputs["From Min"].default_value = 0.44; pr.inputs["From Max"].default_value = 0.52
    l.new(pn.outputs["Fac"], pr.inputs["Value"])
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; l.new(sep.outputs["X"], ab.inputs[0])
    gu = n.new("ShaderNodeMapRange"); gu.inputs["From Min"].default_value = 0.5; gu.inputs["From Max"].default_value = 0.2
    l.new(ab.outputs[0], gu.inputs["Value"])
    mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; l.new(pr.outputs[0], mx.inputs[0]); l.new(gu.outputs[0], mx.inputs[1])
    fine = n.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 60; fine.inputs["Detail"].default_value = 8
    l.new(geo.outputs["Position"], fine.inputs["Vector"])
    cr = n.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0.012, 0.012, 0.014, 1); cr.color_ramp.elements[1].color = (0.066, 0.068, 0.072, 1)
    l.new(fine.outputs["Fac"], cr.inputs["Fac"])
    wetc = n.new("ShaderNodeMix"); wetc.data_type = "RGBA"; wetc.inputs[7].default_value = (0.006, 0.006, 0.008, 1)
    l.new(mx.outputs[0], wetc.inputs["Factor"]); l.new(cr.outputs[0], wetc.inputs[6]); l.new(wetc.outputs[2], b.inputs["Base Color"])
    ro = n.new("ShaderNodeMapRange"); ro.inputs["To Min"].default_value = 0.4; ro.inputs["To Max"].default_value = 0.03
    l.new(mx.outputs[0], ro.inputs["Value"]); l.new(ro.outputs[0], b.inputs["Roughness"])
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; l.new(mx.outputs[0], inv.inputs[1])
    bs = n.new("ShaderNodeMath"); bs.operation = "MULTIPLY"; bs.inputs[1].default_value = 0.5; l.new(inv.outputs[0], bs.inputs[0])
    bump = n.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.01
    l.new(bs.outputs[0], bump.inputs["Strength"]); l.new(fine.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    return m


def worn_steel(nm, rgb, rough=0.45):
    """Oxidised plate: metal whose roughness and tone wander, with faint vertical run-off."""
    m = bpy.data.materials.new(nm); n, l = nodes(m); b = n["Principled BSDF"]
    b.inputs["Metallic"].default_value = 1.0
    geo = n.new("ShaderNodeNewGeometry")
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (7.0, 7.0, 0.8)
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.2; nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.65
    l.new(mp.outputs[0], nz.inputs["Vector"])
    cr = n.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.32; cr.color_ramp.elements[1].position = 0.74
    cr.color_ramp.elements[0].color = (rgb[0] * 0.42, rgb[1] * 0.42, rgb[2] * 0.44, 1); cr.color_ramp.elements[1].color = (*rgb, 1)
    l.new(nz.outputs["Fac"], cr.inputs["Fac"]); l.new(cr.outputs[0], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough + 0.28; rr.inputs["To Max"].default_value = rough - 0.12
    l.new(nz.outputs["Fac"], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    n3 = n.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 55; n3.inputs["Detail"].default_value = 5
    l.new(geo.outputs["Position"], n3.inputs["Vector"])
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12; bp.inputs["Distance"].default_value = 0.004
    l.new(n3.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs[0], b.inputs["Normal"])
    return m


CON = concrete("concrete"); CON2 = concrete("concrete_r", (0.95, 0.98, 1.04))
STEEL = worn_steel("steel", (0.30, 0.32, 0.34), 0.42)
LEAF = worn_steel("leaf", (0.17, 0.185, 0.20), 0.5)
MEDAL = worn_steel("medal", (0.46, 0.48, 0.50), 0.36)
RUST = plain("rust", (0.10, 0.075, 0.06), 0.85, 0.2)
BLACK = plain("black", (0.02, 0.02, 0.022), 0.6)
PIPE = plain("pipe", (0.20, 0.21, 0.22), 0.5, 0.8)
CARD = plain("card", (0.055, 0.05, 0.045), 0.7)
WOOD = plain("wood", (0.13, 0.11, 0.09), 0.85)

# ------------------------------------------------------------------ the alley
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -4, 0)); g = bpy.context.object
g.scale = (2 * W + 4, 30, 1); bpy.ops.object.transform_apply(scale=True); g.data.materials.append(asphalt())
box("wall_r", (W + 0.3, -4, H / 2), (0.6, 22, H), CON2)
box("wall_l", (-W - 0.3, -4, H / 2), (0.6, 22, H), CON)
for y in (-9.5, -5.5, -1.5, 2.5):
    for s in (-1, 1):
        box("pil", (s * (W - 0.07), y, H / 2), (0.16, 0.6, H), CON if s < 0 else CON2)
# the end wall, built around the two door openings
OW, OH, T = DW + 0.26, DH + 0.2, 0.7          # opening
xs = [-W - 0.6, -DX - OW / 2, -DX + OW / 2, DX - OW / 2, DX + OW / 2, W + 0.6]
for i in (0, 2, 4):
    box("end%d" % i, ((xs[i] + xs[i + 1]) / 2, DOOR_Y + T / 2, H / 2), (xs[i + 1] - xs[i], T, H), CON2)
for s in (-1, 1):
    box("over", (s * DX, DOOR_Y + T / 2, (OH + H) / 2), (OW, T, H - OH), CON2)
# a concrete canopy over both doors, and a steel channel carrying the lamps
box("canopy", (0, DOOR_Y - 0.42, 3.86), (2 * DX + OW + 0.9, 0.9, 0.2), CON)
box("channel", (0, DOOR_Y - 0.1, 3.56), (2 * DX + OW + 0.4, 0.12, 0.1), STEEL)
box("step", (0, DOOR_Y - 0.28, 0.05), (2 * DX + OW + 0.5, 0.6, 0.1), CON)


def door(s):
    x = s * DX
    y0 = DOOR_Y + 0.2                      # face of the leaf
    # steel liner of the opening
    for sx in (-1, 1):
        box("jamb", (x + sx * (OW / 2 - 0.06), DOOR_Y + 0.14, OH / 2), (0.12, 0.3, OH), STEEL)
    box("head", (x, DOOR_Y + 0.14, OH - 0.06), (OW, 0.3, 0.12), STEEL)
    # the leaf, in four pieces around the slit
    sz0, sz1 = SLIT_Z - SLIT_H / 2, SLIT_Z + SLIT_H / 2
    box("leaf_lo", (x, y0 + 0.04, sz0 / 2 + 0.05), (DW, 0.08, sz0 - 0.1), LEAF)
    box("leaf_hi", (x, y0 + 0.04, (sz1 + DH + 0.1) / 2), (DW, 0.08, DH + 0.1 - sz1), LEAF)
    for sx in (-1, 1):
        wdt = (DW - SLIT_W) / 2
        box("leaf_s", (x + sx * (SLIT_W / 2 + wdt / 2), y0 + 0.04, SLIT_Z), (wdt, 0.08, SLIT_H), LEAF)
    # plate bands and rivets
    for z in (0.38, 1.18, 2.76):
        box("band", (x, y0 - 0.008, z), (DW, 0.02, 0.085), STEEL)
        for k in range(9):
            sphere("riv", (x - DW / 2 + 0.09 + k * (DW - 0.18) / 8, y0 - 0.02, z), 0.014, STEEL, 12)
    for sx in (-1, 1):
        for k in range(14):
            sphere("riv", (x + sx * (DW / 2 - 0.045), y0 - 0.004, 0.2 + k * 0.2), 0.012, STEEL, 12)
    # slit surround (proud of the leaf)
    fw, fh, fd = SLIT_W + 0.12, SLIT_H + 0.1, 0.035
    box("sl_t", (x, y0 - fd / 2, SLIT_Z + SLIT_H / 2 + 0.025), (fw, fd, 0.05), STEEL, 0.004)
    box("sl_b", (x, y0 - fd / 2, SLIT_Z - SLIT_H / 2 - 0.025), (fw, fd, 0.05), STEEL, 0.004)
    for sx in (-1, 1):
        box("sl_s", (x + sx * (SLIT_W / 2 + 0.03), y0 - fd / 2, SLIT_Z), (0.06, fd, SLIT_H), STEEL, 0.004)
        sphere("riv", (x + sx * (SLIT_W / 2 + 0.03), y0 - fd - 0.002, SLIT_Z), 0.011, STEEL, 12)
    # the shutter rides behind the leaf; open = slid to the hinge side, leaving a dark pocket
    if not (slit_open and s == side):
        box("shutter", (x, y0 + 0.1, SLIT_Z), (SLIT_W + 0.1, 0.012, SLIT_H + 0.08), plain("shut", (0.10, 0.11, 0.12), 0.38, 1.0))
        box("sh_rib", (x, y0 + 0.092, SLIT_Z), (SLIT_W + 0.1, 0.006, 0.012), STEEL)
    else:
        for (dx, dz, sx_, sz_) in ((0, 0.17, 0.9, 0.02), (0, -0.17, 0.9, 0.02), (-0.44, 0, 0.02, 0.36), (0.44, 0, 0.02, 0.36)):
            box("pocket", (x + dx, y0 + 0.5, SLIT_Z + dz), (sx_, 0.8, sz_), BLACK)
        box("pocket_b", (x, y0 + 0.9, SLIT_Z), (0.9, 0.02, 0.36), BLACK)
        # the Keeper's light, spilling out through the slit
        area("holo_a", "holo", (x, y0 + 0.16, SLIT_Z), (x, y0 - 2, SLIT_Z - 0.1), SLIT_W * 0.9, 16, (0.42, 0.70, 1.0), sy=SLIT_H * 0.8, spread=150)
    # medallion
    m = C.medallion("medal", a.sym, MED_R, 0.03, MEDAL)
    m.location = (x, y0 - 0.012, MED_Z)
    cyl("medal_back", (x, y0 - 0.012, MED_Z), (x, y0 + 0.005, MED_Z), MED_R + 0.012, STEEL, 64)
    # threshold plate and a kick plate
    box("kick", (x, y0 - 0.006, 0.17), (DW - 0.1, 0.012, 0.2), STEEL)
    # caged lamp above
    g = "lampL" if s < 0 else "lampR"
    bulb = cyl("bulb", (x - 0.11, DOOR_Y - 0.12, 3.44), (x + 0.11, DOOR_Y - 0.12, 3.44), 0.028, emit("bulb" + g, (0.80, 0.90, 1.0), 60)); bulb.lightgroup = g
    box("lamp_hood", (x, DOOR_Y - 0.12, 3.495), (0.4, 0.2, 0.04), STEEL)
    for k in range(5):
        cyl("cage", (x - 0.16 + k * 0.08, DOOR_Y - 0.2, 3.48), (x - 0.16 + k * 0.08, DOOR_Y - 0.2, 3.39), 0.004, STEEL, 8)
    spot("spot" + g, g, (x, DOOR_Y - 0.2, 3.40), (x, DOOR_Y - 0.55, 0), 1000, (0.80, 0.90, 1.0), angle=118, blend=0.9, radius=0.12)


door(-1); door(1)

# conduit, junction box and the one orange pilot lamp, on the pier between the doors
cyl("conduit", (0, DOOR_Y - 0.03, 0.1), (0, DOOR_Y - 0.03, 3.5), 0.022, PIPE, 12)
box("jbox", (0, DOOR_Y - 0.05, 1.42), (0.16, 0.08, 0.22), STEEL, 0.006)
pl = sphere("pilot", (0, DOOR_Y - 0.1, 1.47), 0.011, emit("pilot", (1.0, 0.36, 0.07), 60), 12)
point("pilot_l", "", (0, DOOR_Y - 0.14, 1.47), 0.5, (1.0, 0.4, 0.1), 0.02)

# pipes, the broken vent, the failing tube
cyl("pipe_l", (-W + 0.18, -14, 3.5), (-W + 0.18, DOOR_Y, 3.5), 0.11, PIPE)
cyl("pipe_l2", (-W + 0.15, -14, 3.86), (-W + 0.15, DOOR_Y, 3.86), 0.06, RUST)
cyl("pipe_r", (W - 0.2, -14, 4.3), (W - 0.2, DOOR_Y, 4.3), 0.08, PIPE)
cyl("down_r", (W - 0.2, 4.9, 0), (W - 0.2, 4.9, 9.5), 0.07, PIPE)
cyl("down_l", (-W + 0.18, 5.6, 0), (-W + 0.18, 5.6, 3.5), 0.09, PIPE)
cyl("vent_l", (-W + 0.2, 1.4, 3.5), (-W + 0.62, 1.4, 2.3), 0.1, RUST)
for y in (-6, -2, 2, 5.2):
    cyl("brk", (-W + 0.02, y, 3.5), (-W + 0.22, y, 3.5), 0.025, STEEL)
box("fl_housing", (W - 0.08, 2.2, 2.95), (0.1, 1.3, 0.12), plain("hous", (0.4, 0.42, 0.44), 0.5))
tube = cyl("fl_tube", (W - 0.14, 1.6, 2.9), (W - 0.14, 2.8, 2.9), 0.022, emit("tube", (0.70, 0.92, 1.0), 26)); tube.lightgroup = "tube"
area("fl", "tube", (W - 0.18, 2.2, 2.85), (0, 2.6, 0.4), 1.2, 150, (0.70, 0.92, 1.0), sy=0.06)

# things left in the alley
for (x, y, z) in ((W - 0.36, 0.5, 5.6), (-W + 0.36, 3.6, 5.2), (W - 0.36, 5.4, 6.6)):
    box("ac", (x, y, z), (0.7, 0.9, 0.7), plain("ac", (0.22, 0.23, 0.24), 0.6, 0.3), 0.02)
box("dumpster", (W - 0.78, -0.4, 0.62), (1.1, 2.0, 1.24), plain("dump", (0.05, 0.07, 0.08), 0.5, 0.4), 0.03)
box("lid", (W - 0.88, -0.4, 1.29), (1.25, 2.05, 0.08), BLACK, 0.01, (0, math.radians(-7), 0))
for i, (x, y, z, r) in enumerate(((-W + 0.5, 3.3, 0.21, 12), (-W + 0.55, 3.95, 0.18, -8), (-W + 0.48, 3.6, 0.55, 30))):
    box("card%d" % i, (x, y, z), (0.6, 0.5, 0.42), CARD, 0.01, (0, 0, math.radians(r)))
for k in range(3):
    box("pal", (-W + 0.66, -0.3, 0.08 + k * 0.15), (1.0, 1.2, 0.1), WOOD, 0, (0, 0, math.radians(4 * k)))
bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.11, location=(W - 0.55, 5.6, 0.11)); bpy.context.object.data.materials.append(BLACK)
box("bridge", (0, -3.0, 8.6), (2 * W, 1.2, 0.35), CON)


def cable(y, z, sag, r=0.012):
    cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = r; cu.bevel_resolution = 2
    sp = cu.splines.new("POLY"); pts = 24; sp.points.add(pts - 1)
    for i in range(pts):
        t = i / (pts - 1); x = -W + 2 * W * t
        sp.points[i].co = (x, y + 0.3 * math.sin(t * 3), z - sag * 4 * t * (1 - t), 1)
    o = bpy.data.objects.new("cable", cu); sc.collection.objects.link(o); o.data.materials.append(BLACK)


for (y, z, s) in ((0.8, 6.6, 0.7), (2.6, 7.4, 1.0), (4.2, 5.9, 0.4), (5.6, 7.9, 0.9), (-2.0, 7.0, 0.8)):
    cable(y, z, s)

# ------------------------------------------------------------------ base light: sky, the street behind, the steam lamp
area("sky", "", (0, -1, 12.5), (0, -1, 0), 3.0, 120, (0.30, 0.46, 0.74), sy=22)
area("street", "", (0, -13, 4.5), (0, 4, 2), 4.0, 50, (0.42, 0.56, 0.78), sy=3)
area("wall_wash", "", (0, 3.4, 9.5), (0, DOOR_Y, 5.5), 3.2, 36, (0.34, 0.50, 0.74), sy=1.2)
point("steam_lamp", "", (-W + 0.6, 1.9, 2.6), 46, (0.72, 0.86, 1.0), 0.4)


def volume(nm, loc, size, density, noise_scale, steam=False):
    o = box(nm, loc, size, bpy.data.materials.new(nm + "_m"))
    m = o.data.materials[0]; n, l = nodes(m)
    n.remove(n["Principled BSDF"])
    pv = n.new("ShaderNodeVolumePrincipled"); pv.inputs["Color"].default_value = (1, 1, 1, 1)
    pv.inputs["Anisotropy"].default_value = 0.35
    geo = n.new("ShaderNodeNewGeometry")
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = noise_scale; nz.inputs["Detail"].default_value = 4
    l.new(geo.outputs["Position"], nz.inputs["Vector"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["From Min"].default_value = 0.35; rr.inputs["From Max"].default_value = 0.75
    rr.inputs["To Max"].default_value = density
    l.new(nz.outputs["Fac"], rr.inputs["Value"])
    if steam:
        tc = n.new("ShaderNodeTexCoord"); grad = n.new("ShaderNodeTexGradient"); grad.gradient_type = "SPHERICAL"
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


volume("air", (0, -3, H / 2), (2 * W + 1.0, 19, H), 0.011, 0.25)
volume("steam", (-W + 0.9, 1.9, 2.6), (1.5, 1.8, 3.4), 1.3, 1.8, True)

# ------------------------------------------------------------------ camera, marks, render
if close:
    x = side * DX
    cam = C.camera((x, DOOR_Y - 1.3, 1.74), (x, DOOR_Y + 0.2, 1.92), lens=27)
else:
    cam = C.camera((0, 1.0, 1.55), (0, DOOR_Y, 2.2), lens=25)

y0 = DOOR_Y + 0.2
marks, rects = {}, {}
for s, k in ((-1, "L"), (1, "R")):
    x = s * DX
    marks["door" + k] = (x, y0, DH / 2); marks["lamp" + k] = (x, DOOR_Y - 0.12, 3.44)
    marks["slit" + k] = (x, y0, SLIT_Z); marks["med" + k] = (x, y0, MED_Z)
    rects["door" + k] = ((x - DW / 2, y0, DH), (x + DW / 2, y0, 0))
    rects["med" + k] = ((x - MED_R - 0.05, y0 - 0.03, MED_Z + MED_R + 0.05), (x + MED_R + 0.05, y0 - 0.03, MED_Z - MED_R - 0.05))
    rects["slit" + k] = ((x - SLIT_W / 2 - 0.085, y0 - 0.035, SLIT_Z + SLIT_H / 2 + 0.075), (x + SLIT_W / 2 + 0.085, y0 - 0.035, SLIT_Z - SLIT_H / 2 - 0.075))
    rects["open" + k] = ((x - SLIT_W / 2, y0, SLIT_Z + SLIT_H / 2), (x + SLIT_W / 2, y0, SLIT_Z - SLIT_H / 2))
marks["pilot"] = (0, DOOR_Y - 0.1, 1.47); marks["tube"] = (W - 0.14, 2.2, 2.9); marks["steam"] = (-W + 1.0, 1.6, 2.4)

border = None
if a.crop:
    from bpy_extras.object_utils import world_to_camera_view as w2c
    bpy.context.view_layer.update()   # the camera's matrix is stale until the scene is evaluated

    def uv(p):
        v = w2c(sc, cam, Vector(p)); return v.x, 1 - v.y
    if a.crop == "med":
        ks = ["L", "R"] if not close else ["L" if side < 0 else "R"]
    else:
        ks = ["L" if side < 0 else "R"]
    key = "med" if a.crop == "med" else "slit"
    pts = [uv(p) for k in ks for p in rects[key + k]]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0_, y1_ = min(p[1] for p in pts), max(p[1] for p in pts)
    q = 1.0 / a.res
    border = (math.floor(x0 / q) * q, math.floor(y0_ / q) * q, math.ceil(x1 / q) * q, math.ceil(y1_ / q) * q)

if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, name + ".blend"))
C.render(sc, cam, a.out, name, extras=EXTRAS, marks=marks, rects=rects, border=border,
         extra_meta=dict(sym=a.sym, slit_open=bool(slit_open), side=("L" if side < 0 else "R") if close else ""))
