"""P4CE v5 gate: the street side of an unmarked steel door, at night.

Everything is built from Python (no .blend files). Units are metres; Z is up.
The door's front face sits near y=0 and the street runs toward +y. Beyond the door (y<0) there is a
short vestibule that dissolves into a warm emissive haze: the light the web Atlas resolves out of.

  build(orient)            -> dict of handles (scene, camera, door pivot, slot plate, ...)
  pose(h, state, k, n)     -> pose the scene for 'closed', 'slot' or frame k of n of 'open'

Reuses the v4 studio helpers (render setup, node helpers, camera, lights) from ../../v4/blender/common.py.
"""
import math
import os
import sys
import urllib.request

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..", "v4", "blender")))
import common as C  # noqa: E402  (v4 studio helpers)
from common import L, N, new_mat, principled  # noqa: E402

PH = os.path.join(HERE, "polyhaven")
FONTS = os.path.normpath(os.path.join(HERE, "..", "..", "v4", "blender", "fonts"))
TEXDIR = os.path.join(HERE, "tex")

# ---------------------------------------------------------------------------
# look constants
# ---------------------------------------------------------------------------
EXPOSURE = 0.0
LOOK = "AgX - Medium High Contrast"
# Linear Rec.709 radiance that AgX (Medium High Contrast, exposure 0) displays as sRGB #EEEBE5,
# found by solving through Blender's own view transform (see render_gate.py --solve-light).
LIGHT_LIN = (2.918, 2.600, 2.016)
LIGHT_HEX_TARGET = "#EEEBE5"

# geometry (metres)
NICHE_W, NICHE_H, NICHE_D = 1.60, 2.90, 0.50      # recess in the facade
WALL_BACK = -0.25                                 # back face of the wall the door sits in
STEP_H = 0.08                                     # threshold slab
OPEN_W, OPEN_TOP = 1.04, 2.42                     # structural opening (lined in steel)
DOOR_W, DOOR_T = 0.994, 0.060
DOOR_Y0, DOOR_Y1 = -0.065, -0.005                 # back / front faces of the leaf
DOOR_Z0, DOOR_Z1 = STEP_H + 0.008, 2.397          # 8 mm gap under the door: the warm leak
SLOT_W, SLOT_H, SLOT_Z = 0.36, 0.075, 1.60        # letterbox, centred at eye height
PLATE_SLIDE = 0.40                                # plate retracts into a pocket in the leaf
DOOR_OPEN_DEG = 96.0

POLYHAVEN = {
    "concrete_wall_008": ["diff", "rough", "disp"],
    "brushed_concrete": ["diff", "rough", "disp"],
}
HDRI_NAME = "modern_buildings_night_2k.hdr"


def fetch_polyhaven():
    """Download the CC0 Poly Haven maps on first use (2k JPG + 2k HDR)."""
    os.makedirs(PH, exist_ok=True)
    base = "https://dl.polyhaven.org/file/ph-assets"
    jobs = [(f"{base}/HDRIs/hdr/2k/{HDRI_NAME}", os.path.join(PH, HDRI_NAME))]
    for t, maps in POLYHAVEN.items():
        for m in maps:
            fn = f"{t}_{m}_2k.jpg"
            jobs.append((f"{base}/Textures/jpg/2k/{t}/{fn}", os.path.join(PH, fn)))
    for url, dst in jobs:
        if not os.path.exists(dst):
            print("fetch", url)
            urllib.request.urlretrieve(url, dst)


def engrave_texture():
    """The only mark on the street: a small engraved '4' (the v2 door's number). Height mask, white = cut."""
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
    os.makedirs(TEXDIR, exist_ok=True)
    out = os.path.join(TEXDIR, "plate_4.png")
    if os.path.exists(out):
        return out
    S = 1024
    im = Image.new("L", (S, S), 0)
    d = ImageDraw.Draw(im)
    f = ImageFont.truetype(os.path.join(FONTS, "Geist-Light.ttf"), int(S * 0.50))
    bb = d.textbbox((0, 0), "4", font=f)
    d.text(((S - (bb[2] - bb[0])) / 2 - bb[0], (S - (bb[3] - bb[1])) / 2 - bb[1] - S * 0.02), "4", fill=255, font=f)
    # tiny hairline under the numeral, like a machinist's mark
    d.rectangle([S * 0.40, S * 0.80, S * 0.60, S * 0.80 + 5], fill=255)
    im = im.filter(ImageFilter.GaussianBlur(2.2))  # engraving walls are not razor sharp
    im.save(out)
    return out


# ---------------------------------------------------------------------------
# geometry helpers
# ---------------------------------------------------------------------------

def box(name, x0, x1, y0, y1, z0, z1, mat=None, coll=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    (coll or bpy.context.scene.collection).objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def cutter(name, *args, mat=None):
    ob = box(name, *args, mat=mat)
    ob.hide_render = True
    ob.hide_viewport = True
    return ob


def boolean(ob, cut, transfer=False):
    m = ob.modifiers.new("bool_" + cut.name, "BOOLEAN")
    m.operation = "DIFFERENCE"
    m.solver = "EXACT"
    m.object = cut
    if transfer:
        m.material_mode = "TRANSFER"
    return m


def bevel(ob, width, segs=2, angle=40):
    m = ob.modifiers.new("bevel", "BEVEL")
    m.width = width
    m.segments = segs
    m.limit_method = "ANGLE"
    m.angle_limit = math.radians(angle)
    m.harden_normals = True
    for p in ob.data.polygons:
        p.use_smooth = True
    return m


def cylinder(name, r, z0, z1, loc, mat, segs=64):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=z1 - z0)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, (z0 + z1) / 2))
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    me.materials.append(mat)
    return ob


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------

def _img(nt, path, loc, colorspace="Non-Color", proj="BOX", blend=0.15):
    tx = N(nt, "ShaderNodeTexImage", loc)
    tx.image = bpy.data.images.load(path, check_existing=True)
    tx.image.colorspace_settings.name = colorspace
    tx.projection = proj
    tx.projection_blend = blend
    tx.interpolation = "Linear"
    return tx


def _obj_mapping(nt, scale, loc=(-1400, 0), rot=(0, 0, 0), offset=(0, 0, 0)):
    tc = N(nt, "ShaderNodeTexCoord", (loc[0] - 200, loc[1]))
    mp = N(nt, "ShaderNodeMapping", loc)
    mp.inputs["Scale"].default_value = scale
    mp.inputs["Rotation"].default_value = rot
    mp.inputs["Location"].default_value = offset
    L(nt, tc, mp, "Object", 0)
    return mp, tc


def mat_concrete():
    """Cast concrete (Poly Haven concrete_wall_008), box-projected in world metres, cooled and desaturated."""
    m, nt, out = new_mat("concrete")
    s = 1.0 / 2.6
    mp, _ = _obj_mapping(nt, (s, s, s), offset=(0.31, 0.0, 0.17))
    diff = _img(nt, os.path.join(PH, "concrete_wall_008_diff_2k.jpg"), (-1000, 300), "sRGB")
    rough = _img(nt, os.path.join(PH, "concrete_wall_008_rough_2k.jpg"), (-1000, 0))
    disp = _img(nt, os.path.join(PH, "concrete_wall_008_disp_2k.jpg"), (-1000, -300))
    for t in (diff, rough, disp):
        L(nt, mp, t, 0, 0)
    hsv = N(nt, "ShaderNodeHueSaturation", (-700, 300))
    hsv.inputs["Saturation"].default_value = 0.35
    hsv.inputs["Value"].default_value = 0.78
    L(nt, diff, hsv, 0, "Color")
    tint = N(nt, "ShaderNodeMix", (-500, 300), _data_type="RGBA", _blend_type="MULTIPLY")
    tint.inputs["Factor"].default_value = 1.0
    tint.inputs[7].default_value = (0.93, 0.95, 0.98, 1)
    L(nt, hsv, tint, 0, 6)
    p = principled(nt, (0, 0), rough=0.8, spec=0.35)
    L(nt, tint, p, 2, "Base Color")
    rr = N(nt, "ShaderNodeMapRange", (-700, 0))
    rr.inputs["To Min"].default_value = 0.62
    rr.inputs["To Max"].default_value = 0.95
    L(nt, rough, rr, 0, "Value")
    L(nt, rr, p, 0, "Roughness")
    bp = N(nt, "ShaderNodeBump", (-300, -300))
    bp.inputs["Strength"].default_value = 0.55
    bp.inputs["Distance"].default_value = 0.004
    L(nt, disp, bp, 0, "Height")
    L(nt, bp, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_wet_ground():
    """Wet pavement: Poly Haven brushed_concrete, darkened by water, with a clear-coat water film that pools."""
    m, nt, out = new_mat("wet_ground")
    s = 1.0 / 2.2
    mp, tc = _obj_mapping(nt, (s, s, s), offset=(0.13, 0.4, 0))
    diff = _img(nt, os.path.join(PH, "brushed_concrete_diff_2k.jpg"), (-1000, 300), "sRGB", proj="FLAT")
    rough = _img(nt, os.path.join(PH, "brushed_concrete_rough_2k.jpg"), (-1000, 0), proj="FLAT")
    disp = _img(nt, os.path.join(PH, "brushed_concrete_disp_2k.jpg"), (-1000, -300), proj="FLAT")
    for t in (diff, rough, disp):
        L(nt, mp, t, 0, 0)
    hsv = N(nt, "ShaderNodeHueSaturation", (-700, 300))
    hsv.inputs["Saturation"].default_value = 0.30
    hsv.inputs["Value"].default_value = 0.38   # water darkens porous stone
    L(nt, diff, hsv, 0, "Color")
    # puddle mask: low-frequency noise in world XY, plus the texture's own low spots
    nz = N(nt, "ShaderNodeTexNoise", (-1000, -700))
    nz.inputs["Scale"].default_value = 1.1
    nz.inputs["Detail"].default_value = 3.0
    nz.inputs["Roughness"].default_value = 0.55
    L(nt, tc, nz, "Object", "Vector")
    mix_h = N(nt, "ShaderNodeMath", (-800, -600), _operation="SUBTRACT")
    L(nt, nz, mix_h, "Fac", 0)
    L(nt, disp, mix_h, 0, 1)
    sc = N(nt, "ShaderNodeMath", (-650, -600), _operation="MULTIPLY")
    sc.inputs[1].default_value = 0.25
    L(nt, disp, sc, 0, 0)
    mh = N(nt, "ShaderNodeMath", (-500, -650), _operation="SUBTRACT")
    L(nt, nz, mh, "Fac", 0)
    L(nt, sc, mh, 0, 1)
    pn = N(nt, "ShaderNodeMapRange", (-350, -650), _interpolation_type="SMOOTHSTEP")
    pn.inputs["From Min"].default_value = 0.37
    pn.inputs["From Max"].default_value = 0.41
    L(nt, mh, pn, 0, "Value")
    # art-directed: a shallow sheet of water in front of the step, where the doorway's reflection lands
    sep = N(nt, "ShaderNodeSeparateXYZ", (-1000, -950))
    L(nt, tc, sep, "Object", 0)
    cmb = N(nt, "ShaderNodeCombineXYZ", (-850, -950))
    mx = N(nt, "ShaderNodeMath", (-900, -900), _operation="MULTIPLY")
    mx.inputs[1].default_value = 1 / 1.25
    L(nt, sep, mx, "X", 0)
    my = N(nt, "ShaderNodeMath", (-900, -1000), _operation="MULTIPLY_ADD")
    my.inputs[1].default_value = 1 / 0.75
    my.inputs[2].default_value = -1.35 / 0.75
    L(nt, sep, my, "Y", 0)
    L(nt, mx, cmb, 0, "X")
    L(nt, my, cmb, 0, "Y")
    ln = N(nt, "ShaderNodeVectorMath", (-700, -950), _operation="LENGTH")
    L(nt, cmb, ln, 0, 0)
    ad2 = N(nt, "ShaderNodeMath", (-450, -1000), _operation="ADD")  # wobble the edge with the noise
    L(nt, ln, ad2, "Value", 0)
    L(nt, nz, ad2, "Fac", 1)
    blob = N(nt, "ShaderNodeMapRange", (-350, -950), _interpolation_type="SMOOTHSTEP")
    blob.inputs["From Min"].default_value = 1.75
    blob.inputs["From Max"].default_value = 1.45
    L(nt, ad2, blob, 0, "Value")
    pud = N(nt, "ShaderNodeMath", (-250, -700), _operation="MAXIMUM")
    L(nt, pn, pud, 0, 0)
    L(nt, blob, pud, 0, 1)
    # darker still where water stands
    dk = N(nt, "ShaderNodeMix", (-300, 300), _data_type="RGBA", _blend_type="MULTIPLY")
    L(nt, pud, dk, 0, "Factor")
    L(nt, hsv, dk, 0, 6)
    dk.inputs[7].default_value = (0.55, 0.56, 0.58, 1)
    p = principled(nt, (100, 0), spec=0.5)
    L(nt, dk, p, 2, "Base Color")
    rr = N(nt, "ShaderNodeMapRange", (-600, 0))
    rr.inputs["To Min"].default_value = 0.35
    rr.inputs["To Max"].default_value = 0.75
    L(nt, rough, rr, 0, "Value")
    L(nt, rr, p, 0, "Roughness")
    # water film
    cw = N(nt, "ShaderNodeMapRange", (-150, -450))
    cw.inputs["To Min"].default_value = 0.5
    cw.inputs["To Max"].default_value = 1.0
    L(nt, pud, cw, 0, "Value")
    L(nt, cw, p, 0, "Coat Weight")
    cr = N(nt, "ShaderNodeMapRange", (-150, -650))
    cr.inputs["To Min"].default_value = 0.13
    cr.inputs["To Max"].default_value = 0.006
    L(nt, pud, cr, 0, "Value")
    L(nt, cr, p, 0, "Coat Roughness")
    p.inputs["Coat IOR"].default_value = 1.33
    # texture relief, flattened under standing water
    bs = N(nt, "ShaderNodeMapRange", (-150, -850))
    bs.inputs["To Min"].default_value = 0.6
    bs.inputs["To Max"].default_value = 0.04
    L(nt, pud, bs, 0, "Value")
    bp = N(nt, "ShaderNodeBump", (-100, -1050))
    bp.inputs["Distance"].default_value = 0.003
    L(nt, bs, bp, 0, "Strength")
    L(nt, disp, bp, 0, "Height")
    L(nt, bp, p, 0, "Normal")
    # a very faint ripple in the coat so reflections are not mirror-perfect
    rn = N(nt, "ShaderNodeTexNoise", (-500, -1300))
    rn.inputs["Scale"].default_value = 9.0
    rn.inputs["Detail"].default_value = 2.0
    L(nt, tc, rn, "Object", "Vector")
    bp2 = N(nt, "ShaderNodeBump", (-100, -1300))
    bp2.inputs["Strength"].default_value = 0.035
    bp2.inputs["Distance"].default_value = 0.01
    L(nt, rn, bp2, "Fac", "Height")
    L(nt, bp2, p, 0, "Coat Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_stone_step():
    """Honed dark basalt threshold, wet."""
    m, nt, out = new_mat("stone_step")
    mp, tc = _obj_mapping(nt, (1, 1, 1))
    nz = N(nt, "ShaderNodeTexNoise", (-1000, 200))
    nz.inputs["Scale"].default_value = 22.0
    nz.inputs["Detail"].default_value = 4.0
    nz.inputs["Roughness"].default_value = 0.6
    L(nt, mp, nz, 0, "Vector")
    cr = N(nt, "ShaderNodeMapRange", (-700, 200))
    cr.inputs["To Min"].default_value = 0.022
    cr.inputs["To Max"].default_value = 0.05
    L(nt, nz, cr, "Fac", "Value")
    p = principled(nt, (0, 0), rough=0.42, spec=0.5, coat=0.8, coat_rough=0.05)
    L(nt, cr, p, 0, "Base Color")
    bp = N(nt, "ShaderNodeBump", (-300, -300))
    bp.inputs["Strength"].default_value = 0.08
    bp.inputs["Distance"].default_value = 0.001
    L(nt, nz, bp, "Fac", "Height")
    L(nt, bp, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def _tangent(nt, axis, loc):
    """A fixed object-space brushing direction, carried into world space (survives the door swing)."""
    v = N(nt, "ShaderNodeCombineXYZ", (loc[0] - 200, loc[1]))
    v.inputs[0].default_value, v.inputs[1].default_value, v.inputs[2].default_value = axis
    vt = N(nt, "ShaderNodeVectorTransform", loc, _vector_type="VECTOR", _convert_from="OBJECT", _convert_to="WORLD")
    L(nt, v, vt, 0, 0)
    return vt


def _streaks(nt, tc, along, loc, fine=2600.0, coarse=1.0):
    """Brushing streaks: noise stretched along an axis (object space)."""
    sx, sy, sz = (fine, fine, fine)
    if along == "X":
        sx = coarse
    elif along == "Z":
        sz = coarse
    mp = N(nt, "ShaderNodeMapping", (loc[0] - 200, loc[1]))
    mp.inputs["Scale"].default_value = (sx, sy, sz)
    L(nt, tc, mp, "Object", 0)
    nz = N(nt, "ShaderNodeTexNoise", loc)
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 2.0
    nz.inputs["Roughness"].default_value = 0.7
    L(nt, mp, nz, 0, "Vector")
    return nz


def mat_blackened_steel(name="blackened_steel", along="Z", base=(0.085, 0.086, 0.09, 1)):
    """Hot-blackened, waxed steel: dark metallic, vertical hand-brushed grain, waxy mottling, faint wear."""
    m, nt, out = new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord", (-1600, 0))
    st = _streaks(nt, tc, along, (-1100, 400), fine=1800.0)
    st2 = _streaks(nt, tc, along, (-1100, 150), fine=240.0, coarse=0.8)
    mot = N(nt, "ShaderNodeTexNoise", (-1100, -150))
    mot.inputs["Scale"].default_value = 2.2
    mot.inputs["Detail"].default_value = 3.0
    mot.inputs["Roughness"].default_value = 0.62
    L(nt, tc, mot, "Object", "Vector")
    # roughness = base + fine streaks + wax mottling
    r1 = N(nt, "ShaderNodeMapRange", (-800, 400))
    r1.inputs["To Min"].default_value = -0.05
    r1.inputs["To Max"].default_value = 0.05
    L(nt, st, r1, "Fac", "Value")
    r2 = N(nt, "ShaderNodeMapRange", (-800, 150))
    r2.inputs["From Min"].default_value = 0.3
    r2.inputs["From Max"].default_value = 0.7
    r2.inputs["To Min"].default_value = -0.04
    r2.inputs["To Max"].default_value = 0.04
    L(nt, st2, r2, "Fac", "Value")
    r3 = N(nt, "ShaderNodeMapRange", (-800, -150))
    r3.inputs["From Min"].default_value = 0.35
    r3.inputs["From Max"].default_value = 0.65
    r3.inputs["To Min"].default_value = 0.24
    r3.inputs["To Max"].default_value = 0.40
    L(nt, mot, r3, "Fac", "Value")
    a1 = N(nt, "ShaderNodeMath", (-600, 300), _operation="ADD")
    L(nt, r1, a1, 0, 0)
    L(nt, r2, a1, 0, 1)
    a2 = N(nt, "ShaderNodeMath", (-450, 200), _operation="ADD")
    L(nt, a1, a2, 0, 0)
    L(nt, r3, a2, 0, 1)
    # colour: slight variation in the oxide, a touch lighter where waxed thin
    cm = N(nt, "ShaderNodeMix", (-600, -400), _data_type="RGBA")
    L(nt, mot, cm, "Fac", "Factor")
    cm.inputs[6].default_value = tuple(c * 0.82 for c in base[:3]) + (1,)
    cm.inputs[7].default_value = tuple(c * 1.25 for c in base[:3]) + (1,)
    p = principled(nt, (0, 0), metal=1.0, aniso=0.55)
    L(nt, cm, p, 2, "Base Color")
    L(nt, a2, p, 0, "Roughness")
    L(nt, _tangent(nt, (0, 0, 1) if along == "Z" else (1, 0, 0), (-300, -700)), p, 0, "Tangent")
    bp = N(nt, "ShaderNodeBump", (-200, -500))
    bp.inputs["Strength"].default_value = 0.02
    bp.inputs["Distance"].default_value = 0.00002
    L(nt, st, bp, "Fac", "Height")
    bp2 = N(nt, "ShaderNodeBump", (-50, -500))
    bp2.inputs["Strength"].default_value = 0.015
    bp2.inputs["Distance"].default_value = 0.0003
    L(nt, mot, bp2, "Fac", "Height")
    L(nt, bp, bp2, 0, "Normal")
    L(nt, bp2, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_brushed_stainless(name="stainless", along="X", rough=0.2, engrave=None, base=(0.60, 0.605, 0.61, 1)):
    """Satin #4 brushed stainless. Optional engraving mask (Generated XZ coords): bead-blasted floor, cut walls."""
    m, nt, out = new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord", (-1600, 0))
    st = _streaks(nt, tc, along, (-1100, 300), fine=5200.0)
    st2 = _streaks(nt, tc, along, (-1100, 50), fine=420.0, coarse=0.6)
    r1 = N(nt, "ShaderNodeMapRange", (-800, 300))
    r1.inputs["To Min"].default_value = rough - 0.05
    r1.inputs["To Max"].default_value = rough + 0.05
    L(nt, st, r1, "Fac", "Value")
    r2 = N(nt, "ShaderNodeMapRange", (-800, 50))
    r2.inputs["From Min"].default_value = 0.3
    r2.inputs["From Max"].default_value = 0.7
    r2.inputs["To Min"].default_value = -0.03
    r2.inputs["To Max"].default_value = 0.03
    L(nt, st2, r2, "Fac", "Value")
    ar = N(nt, "ShaderNodeMath", (-600, 200), _operation="ADD")
    L(nt, r1, ar, 0, 0)
    L(nt, r2, ar, 0, 1)
    p = principled(nt, (100, 0), base=base, metal=1.0, aniso=0.8)
    L(nt, _tangent(nt, (1, 0, 0) if along == "X" else (0, 0, 1), (-300, -700)), p, 0, "Tangent")
    bp = N(nt, "ShaderNodeBump", (-200, -400))
    bp.inputs["Strength"].default_value = 0.03
    bp.inputs["Distance"].default_value = 0.00001
    L(nt, st, bp, "Fac", "Height")
    rough_out, nrm = ar, bp
    if engrave:
        sep = N(nt, "ShaderNodeSeparateXYZ", (-1400, -900))
        L(nt, tc, sep, "Generated", 0)
        uv = N(nt, "ShaderNodeCombineXYZ", (-1250, -900))
        L(nt, sep, uv, "X", "X")
        L(nt, sep, uv, "Z", "Y")
        tx = N(nt, "ShaderNodeTexImage", (-1050, -900))
        tx.image = bpy.data.images.load(engrave, check_existing=True)
        tx.image.colorspace_settings.name = "Non-Color"
        tx.extension = "CLIP"
        tx.interpolation = "Cubic"
        L(nt, uv, tx, 0, 0)
        inv = N(nt, "ShaderNodeMath", (-800, -900), _operation="MULTIPLY")
        inv.inputs[1].default_value = -1.0
        L(nt, tx, inv, "Color", 0)
        bp2 = N(nt, "ShaderNodeBump", (-100, -700))
        bp2.inputs["Strength"].default_value = 1.0
        bp2.inputs["Distance"].default_value = 0.0006
        L(nt, inv, bp2, 0, "Height")
        L(nt, bp, bp2, 0, "Normal")
        nrm = bp2
        mr = N(nt, "ShaderNodeMix", (-300, 200), _data_type="FLOAT")
        L(nt, tx, mr, "Color", "Factor")
        L(nt, ar, mr, 0, 2)
        mr.inputs[3].default_value = 0.5
        rough_out = mr
        ma = N(nt, "ShaderNodeMix", (-300, 400), _data_type="FLOAT")
        L(nt, tx, ma, "Color", "Factor")
        ma.inputs[2].default_value = 0.8
        ma.inputs[3].default_value = 0.0
        L(nt, ma, p, 0, "Anisotropic")
        mc = N(nt, "ShaderNodeMix", (-300, 600), _data_type="RGBA")
        L(nt, tx, mc, "Color", "Factor")
        mc.inputs[6].default_value = (0.60, 0.605, 0.61, 1)
        mc.inputs[7].default_value = (0.30, 0.30, 0.30, 1)
        L(nt, mc, p, 2, "Base Color")
    L(nt, rough_out, p, 0, "Roughness")
    L(nt, nrm, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_plain(name, base, rough, metal=0.0, emit=None, emit_strength=0.0):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, rough=rough, metal=metal)
    if emit:
        p.inputs["Emission Color"].default_value = emit
        p.inputs["Emission Strength"].default_value = emit_strength
    L(nt, p, out, 0, "Surface")
    return m


def mat_vestibule_stone(name, base, rough, joint=0.9, coat=0.0):
    """Warm grey honed stone in large panels: vertical joints every `joint` m along the corridor (world y),
    so the walls carry a perspective rhythm into the light."""
    m, nt, out = new_mat(name)
    tc = N(nt, "ShaderNodeTexCoord", (-1400, 0))
    sep = N(nt, "ShaderNodeSeparateXYZ", (-1200, 0))
    L(nt, tc, sep, "Object", 0)
    dv = N(nt, "ShaderNodeMath", (-1000, 0), _operation="DIVIDE")
    dv.inputs[1].default_value = joint
    L(nt, sep, dv, "Y", 0)
    fr = N(nt, "ShaderNodeMath", (-850, 0), _operation="PINGPONG")  # 0..0.5 distance to nearest joint
    fr.inputs[1].default_value = 0.5
    L(nt, dv, fr, 0, 0)
    jm = N(nt, "ShaderNodeMapRange", (-700, 0))
    jm.inputs["From Min"].default_value = 0.004 / joint
    jm.inputs["From Max"].default_value = 0.007 / joint
    jm.inputs["To Min"].default_value = 1.0
    jm.inputs["To Max"].default_value = 0.0
    L(nt, fr, jm, 0, "Value")
    nz = N(nt, "ShaderNodeTexNoise", (-1000, -300))
    nz.inputs["Scale"].default_value = 4.0
    nz.inputs["Detail"].default_value = 3.0
    L(nt, tc, nz, "Object", "Vector")
    cm = N(nt, "ShaderNodeMix", (-500, 200), _data_type="RGBA")
    L(nt, nz, cm, "Fac", "Factor")
    cm.inputs[6].default_value = tuple(c * 0.92 for c in base[:3]) + (1,)
    cm.inputs[7].default_value = tuple(c * 1.06 for c in base[:3]) + (1,)
    jc = N(nt, "ShaderNodeMix", (-300, 200), _data_type="RGBA")
    L(nt, jm, jc, 0, "Factor")
    L(nt, cm, jc, 2, 6)
    jc.inputs[7].default_value = tuple(c * 0.25 for c in base[:3]) + (1,)
    p = principled(nt, (0, 0), rough=rough, spec=0.5, coat=coat, coat_rough=0.03)
    L(nt, jc, p, 2, "Base Color")
    L(nt, p, out, 0, "Surface")
    return m


# The light beyond: an absorbing + emitting medium in homogeneous slabs (integrated analytically, so it is
# cheap and noise-free). Deep in, radiance saturates to exactly LIGHT_LIN (emission / absorption), so the last
# frames converge on one flat, known colour. Density rises with depth so the first metres keep some air.
FOG_SLABS = [(-0.25, -1.8, 0.02), (-1.8, -2.8, 0.12), (-2.8, -3.6, 0.40), (-3.6, -4.3, 1.2), (-4.3, -4.9, 2.4),
             (-4.9, -16.0, 3.5)]


def mat_light_fog(exposure, density):
    m, nt, out = new_mat(f"light_fog_{density}")
    k = 2.0 ** (-exposure)
    ab = N(nt, "ShaderNodeVolumeAbsorption", (-300, 200))
    ab.inputs["Color"].default_value = (0, 0, 0, 1)
    ab.inputs["Density"].default_value = density
    em = N(nt, "ShaderNodeEmission", (-300, -100))
    em.inputs["Color"].default_value = (LIGHT_LIN[0] * k, LIGHT_LIN[1] * k, LIGHT_LIN[2] * k, 1)
    em.inputs["Strength"].default_value = density
    add = N(nt, "ShaderNodeAddShader", (0, 0))
    L(nt, ab, add, 0, 0)
    L(nt, em, add, 0, 1)
    L(nt, add, out, 0, "Volume")
    return m


def mat_haze(density=0.03):
    m, nt, out = new_mat("street_haze")
    sc = N(nt, "ShaderNodeVolumeScatter", (0, 0))
    sc.inputs["Color"].default_value = (0.9, 0.92, 0.95, 1)
    sc.inputs["Density"].default_value = density
    sc.inputs["Anisotropy"].default_value = 0.25
    L(nt, sc, out, 0, "Volume")
    return m


# ---------------------------------------------------------------------------
# world, cameras
# ---------------------------------------------------------------------------

def setup_world(strength=0.05, glossy=0.5):
    w = bpy.data.worlds.new("night")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = N(nt, "ShaderNodeOutputWorld", (600, 0))
    tc = N(nt, "ShaderNodeTexCoord", (-900, 0))
    mp = N(nt, "ShaderNodeMapping", (-700, 0))
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(200))
    L(nt, tc, mp, "Generated", 0)
    env = N(nt, "ShaderNodeTexEnvironment", (-500, 0))
    env.image = bpy.data.images.load(os.path.join(PH, HDRI_NAME), check_existing=True)
    L(nt, mp, env, 0, 0)
    hsv = N(nt, "ShaderNodeHueSaturation", (-250, 0))
    hsv.inputs["Saturation"].default_value = 0.35
    L(nt, env, hsv, 0, "Color")
    cool = N(nt, "ShaderNodeMix", (-50, 0), _data_type="RGBA", _blend_type="MULTIPLY")
    cool.inputs["Factor"].default_value = 1.0
    cool.inputs[7].default_value = (0.80, 0.88, 1.0, 1)
    L(nt, hsv, cool, 0, 6)
    bg = N(nt, "ShaderNodeBackground", (200, 0))
    bg.inputs["Strength"].default_value = strength
    L(nt, cool, bg, 2, 0)
    bg2 = N(nt, "ShaderNodeBackground", (200, -200))
    bg2.inputs["Strength"].default_value = glossy
    L(nt, cool, bg2, 2, 0)
    lp = N(nt, "ShaderNodeLightPath", (200, 300))
    mx = N(nt, "ShaderNodeMixShader", (400, 0))
    L(nt, lp, mx, "Is Glossy Ray", 0)
    L(nt, bg, mx, 0, 1)
    L(nt, bg2, mx, 0, 2)
    L(nt, mx, out, 0, 0)
    return w


# Camera rigs. Level cameras with lens shift keep verticals straight (architectural photography).
RIGS = {
    "land": dict(res=(1600, 1067), lens=30.0, start=(0.0, 5.0, 1.26), shift=-0.02, sensor_fit="HORIZONTAL"),
    "port": dict(res=(900, 1600), lens=28.0, start=(0.0, 3.5, 1.30), shift=-0.035, sensor_fit="VERTICAL"),
}
CAM_END = (0.0, -4.9, 1.55)   # inside the light


def make_camera(orient):
    r = RIGS[orient]
    cd = bpy.data.cameras.new("cam")
    cd.lens = r["lens"]
    cd.sensor_width = 36.0
    cd.sensor_height = 36.0
    cd.sensor_fit = r["sensor_fit"]
    cd.clip_start = 0.02
    cd.clip_end = 60
    cd.shift_y = r["shift"]
    cd.dof.use_dof = True
    cd.dof.aperture_fstop = 4.0
    cd.dof.aperture_blades = 7
    cd.dof.focus_distance = r["start"][1] - DOOR_Y1
    ob = bpy.data.objects.new("cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = r["start"]
    ob.rotation_euler = Euler((math.radians(90), 0, math.radians(180)), "XYZ")  # level, looking toward -y
    bpy.context.scene.camera = ob
    return ob


# ---------------------------------------------------------------------------
# the scene
# ---------------------------------------------------------------------------

def build(orient="land"):
    fetch_polyhaven()
    engraving = engrave_texture()
    sc = bpy.context.scene

    m_conc = mat_concrete()
    m_ground = mat_wet_ground()
    m_step = mat_stone_step()
    m_door = mat_brushed_stainless("door_steel", along="X", rough=0.2, base=(0.36, 0.365, 0.37, 1))
    m_frame = mat_blackened_steel("frame_steel", along="Z", base=(0.07, 0.071, 0.075, 1))
    m_ss = mat_brushed_stainless("stainless_x", along="X", rough=0.19)
    m_ss_plate = mat_brushed_stainless("stainless_plate", along="X", rough=0.17)
    m_num = mat_brushed_stainless("stainless_number", along="X", rough=0.21, engrave=engraving)
    m_dark = mat_plain("hood_black", (0.012, 0.012, 0.013, 1), 0.65)
    m_lampbody = mat_plain("lamp_body", (0.02, 0.02, 0.022, 1), 0.35, metal=1.0)
    m_lens = mat_plain("lamp_lens", (0.9, 0.95, 1.0, 1), 0.3, emit=(0.80, 0.90, 1.0, 1), emit_strength=60.0)
    m_floor_in = mat_vestibule_stone("vest_floor", (0.20, 0.19, 0.175, 1), 0.2, joint=1.2, coat=0.85)
    m_plaster = mat_vestibule_stone("vest_wall", (0.34, 0.325, 0.30, 1), 0.32)

    # --- street and facade -------------------------------------------------
    box("ground", -9, 9, NICHE_D - 0.001, 16, -0.2, 0.0, m_ground)
    box("niche_floor", -NICHE_W / 2 - 0.05, NICHE_W / 2 + 0.05, WALL_BACK - 0.02, NICHE_D - 0.001, -0.2, 0.0, m_ground)
    step = box("threshold", -NICHE_W / 2, NICHE_W / 2, WALL_BACK - 0.02, NICHE_D + 0.10, -0.1, STEP_H, m_step)
    bevel(step, 0.004, 3)

    facade = box("facade", -9, 9, WALL_BACK, NICHE_D, -0.2, 7.0, m_conc)
    boolean(facade, cutter("cut_niche", -NICHE_W / 2, NICHE_W / 2, -0.001, NICHE_D + 1, -0.5, NICHE_H))
    boolean(facade, cutter("cut_open", -OPEN_W / 2, OPEN_W / 2, WALL_BACK - 1, 0.2, -0.5, OPEN_TOP))
    bevel(facade, 0.006, 2)

    # steel liner in the structural opening, with a stop behind the leaf on the jambs and head
    lw = 0.023
    frame = box("frame", -OPEN_W / 2, OPEN_W / 2, WALL_BACK, 0.004, STEP_H, OPEN_TOP, m_frame)
    boolean(frame, cutter("cut_frame_in", -OPEN_W / 2 + lw, OPEN_W / 2 - lw, WALL_BACK - 1, 1, -1, OPEN_TOP - lw))
    bevel(frame, 0.0015, 2)
    for nm, x0, x1, z0, z1 in [("stop_l", -OPEN_W / 2, -DOOR_W / 2 + 0.014, STEP_H, OPEN_TOP),
                               ("stop_r", DOOR_W / 2 - 0.014, OPEN_W / 2, STEP_H, OPEN_TOP),
                               ("stop_t", -OPEN_W / 2, OPEN_W / 2, DOOR_Z1 - 0.014, OPEN_TOP)]:
        box(nm, x0, x1, DOOR_Y0 - 0.022, DOOR_Y0 - 0.0015, z0, z1, m_frame)

    # --- the door leaf (pivot on the hinge line, back-left corner) --------------
    hinge = C.empty("hinge", (-DOOR_W / 2, DOOR_Y0, 0.0))
    door = box("door", -DOOR_W / 2, DOOR_W / 2, DOOR_Y0, DOOR_Y1, DOOR_Z0, DOOR_Z1, m_door)
    door.data.materials.append(m_frame)  # slot liner (transferred from the cutter): dark, so the gap reads
    cut_slot = cutter("cut_slot", -SLOT_W / 2, SLOT_W / 2, DOOR_Y0 - 0.05, DOOR_Y1 + 0.05,
                      SLOT_Z - SLOT_H / 2, SLOT_Z + SLOT_H / 2, mat=m_frame)
    boolean(door, cut_slot, transfer=True)
    bevel(door, 0.0018, 3)
    # slot bezel: a machined blackened-steel frame, 6 mm proud, with a 2.5 mm chamfer that catches the lamp
    bz = box("slot_bezel", -SLOT_W / 2 - 0.05, SLOT_W / 2 + 0.05, DOOR_Y1 - 0.0005, DOOR_Y1 + 0.006,
             SLOT_Z - SLOT_H / 2 - 0.038, SLOT_Z + SLOT_H / 2 + 0.038, m_frame)
    boolean(bz, cutter("cut_bezel", -SLOT_W / 2, SLOT_W / 2, -1, 1, SLOT_Z - SLOT_H / 2, SLOT_Z + SLOT_H / 2))
    bevel(bz, 0.0025, 3)
    # sliding plate: brushed stainless set 5 mm into the opening with a 4 mm shadow gap all round;
    # it retracts sideways into a pocket in the leaf
    g = 0.004
    plate = box("slot_plate", -SLOT_W / 2 + g, SLOT_W / 2 - g, DOOR_Y1 - 0.011, DOOR_Y1 - 0.005,
                SLOT_Z - SLOT_H / 2 + g, SLOT_Z + SLOT_H / 2 - g, m_ss_plate)
    bevel(plate, 0.001, 2)
    # hood on the inside face: what you see through the open slot is dark, not the light
    hood = box("slot_hood", -SLOT_W / 2 - 0.03, SLOT_W / 2 + 0.03, DOOR_Y0 - 0.16, DOOR_Y0 - 0.0005,
               SLOT_Z - SLOT_H / 2 - 0.03, SLOT_Z + SLOT_H / 2 + 0.03, m_dark)
    for ob in (door, bz, plate, hood, cut_slot):
        ob.parent = hinge
        ob.matrix_parent_inverse = hinge.matrix_world.inverted()
    # parent inverse must be computed with an up-to-date hinge matrix
    bpy.context.view_layer.update()
    for ob in (door, bz, plate, hood, cut_slot):
        ob.matrix_parent_inverse = hinge.matrix_world.inverted()

    # --- number plate: brushed stainless, engraved '4', on the niche back wall right of the door ----
    num = box("number_plate", -0.045, 0.045, 0.0, 0.004, 2.615, 2.705, m_num)
    bevel(num, 0.0006, 2)

    # --- the lamp: one cool downlight in the niche soffit ------------------------
    lamp_y = 0.24
    cylinder("lamp_trim", 0.045, NICHE_H - 0.012, NICHE_H + 0.01, (0, lamp_y, 0), m_lampbody)
    cylinder("lamp_lens", 0.030, NICHE_H - 0.014, NICHE_H - 0.011, (0, lamp_y, 0), m_lens)
    ld = bpy.data.lights.new("lamp", "SPOT")
    ld.energy = 260.0
    ld.color = (0.78, 0.88, 1.0)
    ld.spot_size = math.radians(118)
    ld.spot_blend = 1.0
    ld.shadow_soft_size = 0.028
    lamp = bpy.data.objects.new("lamp", ld)
    sc.collection.objects.link(lamp)
    lamp.location = (0, lamp_y, NICHE_H - 0.02)
    lamp.rotation_euler = (math.radians(-4), 0, 0)  # a hair toward the door

    # --- beyond the door ------------------------------------------------------
    IW = 0.95   # a narrow passage: its walls stay in frame as the camera goes through
    box("in_floor", -IW, IW, -16, WALL_BACK + 0.001, -0.1, STEP_H, m_floor_in)
    box("in_wall_l", -IW - 0.1, -IW, -16, WALL_BACK, STEP_H, 2.75, m_plaster)
    box("in_wall_r", IW, IW + 0.1, -16, WALL_BACK, STEP_H, 2.75, m_plaster)
    box("in_ceiling", -IW - 0.1, IW + 0.1, -16, WALL_BACK, 2.75, 2.85, m_plaster)
    fog = []
    for i, (y1, y0, d) in enumerate(FOG_SLABS):
        y1 = min(y1, WALL_BACK - 0.003)
        fog.append(box(f"light_fog_{i}", -IW + 0.001, IW - 0.001, y0, y1 - 0.0005, STEP_H + 0.001, 2.749,
                       mat_light_fog(EXPOSURE, d)))
    # interior key: a big soft warm panel in the ceiling (lights floor, walls, the leaf's inner face)
    kc = tuple(c / max(LIGHT_LIN) for c in LIGHT_LIN)
    C.area("in_key", (0, -2.4, 2.72), (0, -2.4, 0), 1.2, 3.2, energy=10.0, color=kc)
    # portal: the light of the room as it leaves through the doorway (camera- and glossy-invisible; the
    # glossy view of the room is the fog itself)
    portal = C.area("portal", (0.03, WALL_BACK + 0.04, (STEP_H + OPEN_TOP) / 2), (0.03, 5.0, (STEP_H + OPEN_TOP) / 2),
                    OPEN_W - 0.10, OPEN_TOP - STEP_H - 0.03, energy=60.0, color=kc)
    portal.visible_glossy = False

    # street haze
    haze = box("haze", -9, 9, WALL_BACK + 0.01, 15.5, 0.001, 6.5, mat_haze(0.022))

    setup_world(0.09, 0.45)
    cam = make_camera(orient)

    return dict(scene=sc, cam=cam, hinge=hinge, plate=plate, lamp=lamp, portal=portal, orient=orient,
                plate_x0=plate.location.x, fog=fog, haze=haze)


# ---------------------------------------------------------------------------
# poses
# ---------------------------------------------------------------------------

def smoothstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def smootherstep(e0, e1, x):
    t = min(1.0, max(0.0, (x - e0) / (e1 - e0)))
    return t * t * t * (t * (6 * t - 15) + 10)


def _pchip(xs, ys, x):
    """Monotone cubic (Fritsch-Carlson) through keyframes: no overshoot, so the dolly never backs up."""
    n = len(xs)
    if x <= xs[0]:
        return ys[0]
    if x >= xs[-1]:
        return ys[-1]
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else 2 / (1 / d[i - 1] + 1 / d[i]) for i in range(1, n - 1)] + [d[-1]]
    m[0] = m[-1] = 0.0
    i = max(j for j in range(n - 1) if xs[j] <= x)
    hh = xs[i + 1] - xs[i]
    t = (x - xs[i]) / hh
    h00, h10, h01, h11 = 2 * t**3 - 3 * t**2 + 1, t**3 - 2 * t**2 + t, -2 * t**3 + 3 * t**2, t**3 - t**2
    return h00 * ys[i] + h10 * hh * m[i] + h01 * ys[i + 1] + h11 * hh * m[i + 1]


# dolly keys in world y (street -> light), so both cameras cross the doorway (y = 0) at the same moment (u = 0.6)
DOLLY_U = [0.0, 0.12, 0.40, 0.60, 0.80, 1.0]


def dolly_y(start_y, u):
    ys = [start_y, start_y - 0.05, (start_y + 0.05) / 2 + 0.1, 0.05, -2.92, CAM_END[1]]
    return _pchip(DOLLY_U, ys, u)


def open_curve(u, start_y=5.0):
    """u in [0,1] over the sequence -> (door angle 0..1, dolly 0..1 along start -> CAM_END). The heavy leaf
    starts at once; the camera follows as it swings past ~30 degrees, carries through the doorway at u = 0.6
    and settles inside the light."""
    door = smootherstep(0.0, 0.56, u)
    dolly = (start_y - dolly_y(start_y, u)) / (start_y - CAM_END[1])
    return door, dolly


def _apply(h, door_a, dolly):
    r = RIGS[h["orient"]]
    cam, cd = h["cam"], h["cam"].data
    h["hinge"].rotation_euler = (0, 0, -math.radians(DOOR_OPEN_DEG) * door_a)
    cam.location = Vector(r["start"]).lerp(Vector(CAM_END), dolly)
    cd.shift_y = r["shift"] * (1 - smoothstep(0.0, 0.45, dolly))
    fd = max(0.4, cam.location.y - DOOR_Y1)
    cd.dof.focus_distance = fd if dolly < 0.45 else fd + (dolly - 0.45) * 14


def keyframe_open(h, n):
    """Keyframe door + camera for frames 1..n (scene frame = k + 1) so Cycles can motion-blur the move."""
    sc = h["scene"]
    for k in range(-1, n + 1):
        door_a, dolly = open_curve(min(1.0, max(0.0, k / (n - 1))), RIGS[h["orient"]]["start"][1])
        _apply(h, door_a, dolly)
        f = k + 1
        h["hinge"].keyframe_insert("rotation_euler", frame=f)
        h["cam"].keyframe_insert("location", frame=f)
        h["cam"].data.keyframe_insert("shift_y", frame=f)
        h["cam"].data.dof.keyframe_insert("focus_distance", frame=f)
    for ob in (h["hinge"], h["cam"], h["cam"].data):
        ad = ob.animation_data
        if ad and ad.action:
            try:
                for fc in ad.action.fcurves:
                    for kp in fc.keyframe_points:
                        kp.interpolation = "LINEAR"
            except AttributeError:  # Blender 5 layered actions
                for layer in ad.action.layers:
                    for strip in layer.strips:
                        for cb in strip.channelbags:
                            for fc in cb.fcurves:
                                for kp in fc.keyframe_points:
                                    kp.interpolation = "LINEAR"
    sc.render.use_motion_blur = True
    sc.render.motion_blur_shutter = 0.3
    h["keyed"] = n


def pose(h, state="closed", k=0, n=28):
    sc = h["scene"]
    door_a, dolly = 0.0, 0.0
    h["plate"].location.x = h["plate_x0"]
    if state == "slot":
        h["plate"].location.x = h["plate_x0"] - PLATE_SLIDE
    if state == "open":
        if h.get("keyed") != n:
            keyframe_open(h, n)
        door_a, dolly = open_curve(k / (n - 1), RIGS[h["orient"]]["start"][1])
        sc.frame_set(k + 1)
        # f_000 must match closed.webp exactly: no blur on the first frame (nothing has moved yet)
        sc.render.use_motion_blur = k > 0
    else:
        sc.render.use_motion_blur = False
        if h.get("keyed"):
            sc.frame_set(0 + 1)  # frame 1 == open k=0 == closed pose
        _apply(h, 0.0, 0.0)
    return dict(door=door_a, dolly=dolly)
