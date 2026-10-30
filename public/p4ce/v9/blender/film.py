"""PR6 v9 "The Film": one continuous path-traced camera move through a misty studio
holding the nine collection stations (Blender 5.2 Cycles, CPU).

The pack models and label decals are v6's (build_packs.py / labels.py, copied here).
Units: 1 BU = 1 cm. The stations sit along one gentle arc; the camera works on the
concave side of it, looking outward at a curved seamless cyclorama.

  python film.py -- --out DIR --res 1280 --samples 96 [--frames 0-163|0,24,40] [--step 1]
  python film.py -- --out DIR --res 1600 --samples 320 --stills     (one frame per station)
  python film.py -- --plan        (print the frame plan as JSON and exit)

Frames are written as DIR/NNN.png (8-bit sRGB, AgX). encode.py turns them into the web tiers.
"""
import argparse
import json
import math
import os
import random
import sys
import time

import bpy  # noqa: I001
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, Matrix, noise

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import labels  # noqa: E402
import build_packs as bp  # noqa: E402

srgb = bp.srgb
CHALK = srgb("F2F3EF")
MIST = srgb("CAD5DA")
STEEL = srgb("718B9A")

# ============================================================ plan
INTRO = 20            # frames before station 01
SEG = 16              # frames between two stations
N_ST = 9
CODES = ["%02d" % (i + 1) for i in range(N_ST)]
STATION_FRAMES = [INTRO + SEG * i for i in range(N_ST)]
COUNT = STATION_FRAMES[-1] + 1

R_ARC = 640.0                        # station arc radius
# irregular spacing (deg) so the rhythm is not metronomic
GAPS = [8.6, 7.9, 9.1, 8.2, 8.8, 7.7, 9.0, 8.3]
TH0 = -sum(GAPS) / 2
THETA = [TH0 + sum(GAPS[:i]) for i in range(N_ST)]
DEPTH = [0, 14, -10, 18, -4, -14, 10, -6, 6]   # radial offsets of the stations
WALL_R = R_ARC + 230.0
LENS = 58.0
SHIFT_Y = -0.11      # subject sits a touch above centre: the lower third stays calm

# ============================================================ scene setup


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.01
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    try:
        cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
        cy.denoising_prefilter = "ACCURATE"
        cy.denoising_quality = "HIGH"
    except Exception:
        pass
    cy.max_bounces = 10
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 4
    cy.transmission_bounces = 8
    cy.transparent_max_bounces = 8
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    cy.sample_clamp_indirect = 5.0
    try:
        cy.use_light_tree = True
    except Exception:
        pass
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.render.film_transparent = False
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.render.dither_intensity = 1.0
    sc.view_settings.view_transform = "AgX"
    for look in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - Base Contrast", "None"):
        try:
            sc.view_settings.look = look
            break
        except Exception:
            continue
    sc.view_settings.exposure = 0.0
    return sc


def u_of(th):
    t = math.radians(th)
    return Vector((math.sin(t), math.cos(t), 0.0))


def right_of(th):
    t = math.radians(th)
    return Vector((math.cos(t), -math.sin(t), 0.0))


# ============================================================ materials
def clay(name, base, rough=0.66, sss=0.06, bump=0.05, vary=0.025, sheen=0.12):
    """Matte modelling clay: soft diffuse with a faint, broad sheen, slight subsurface,
    a low-frequency unevenness and fine tooth in the bump, and a per-object value jitter."""
    m, nt, out = bp.new_mat(name)
    p = bp.principled(nt, base, 0.0, rough, Specular_IOR_Level=0.32, Subsurface_Weight=sss,
                      Subsurface_Scale=0.25, Sheen_Weight=sheen, Sheen_Roughness=0.6)
    p.subsurface_method = "BURLEY"
    if not OPTS.get("sss", True):
        p.inputs["Subsurface Weight"].default_value = 0.0
    tc = nt.nodes.new("ShaderNodeTexCoord")
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    # per-object value jitter
    j = bp.math_(nt, "MULTIPLY_ADD", oi.outputs["Random"], 2 * vary, 1 - vary)
    hsv = bp.node(nt, "ShaderNodeHueSaturation")
    hsv.inputs["Color"].default_value = base
    bp.link(nt, j, hsv.inputs["Value"])
    # broad mottling in the colour (hand-made, not factory)
    n0 = bp.node(nt, "ShaderNodeTexNoise", Scale=0.18, Detail=1.0, Roughness=0.5)
    bp.link(nt, tc.outputs["Object"], n0.inputs["Vector"])
    mot = bp.math_(nt, "MULTIPLY_ADD", n0.outputs["Fac"], 0.06, 0.97)
    mul = bp.node(nt, "ShaderNodeMix", _data_type="RGBA", _blend_type="MULTIPLY")
    mul.inputs["Factor"].default_value = 1.0
    bp.link(nt, hsv.outputs[0], mul.inputs["A"])
    cm = bp.node(nt, "ShaderNodeCombineColor")
    bp.link(nt, mot, cm.inputs[0])
    bp.link(nt, mot, cm.inputs[1])
    bp.link(nt, mot, cm.inputs[2])
    bp.link(nt, cm.outputs[0], mul.inputs["B"])
    bp.link(nt, mul.outputs["Result"], p.inputs["Base Color"])
    # surface: soft undulation + fine tooth
    n1 = bp.node(nt, "ShaderNodeTexNoise", Scale=0.9, Detail=2.0, Roughness=0.5)
    bp.link(nt, tc.outputs["Object"], n1.inputs["Vector"])
    n2 = bp.node(nt, "ShaderNodeTexNoise", Scale=14.0, Detail=2.0, Roughness=0.7)
    bp.link(nt, tc.outputs["Object"], n2.inputs["Vector"])
    h = bp.math_(nt, "MULTIPLY_ADD", n1.outputs["Fac"], 1.0, bp.math_(nt, "MULTIPLY", n2.outputs["Fac"], 0.12))
    b = bp.node(nt, "ShaderNodeBump", Strength=bump, Distance=0.05)
    bp.link(nt, h, b.inputs["Height"])
    bp.link(nt, b.outputs[0], p.inputs["Normal"])
    r = bp.math_(nt, "MULTIPLY_ADD", n2.outputs["Fac"], 0.08, rough - 0.04)
    bp.link(nt, r, p.inputs["Roughness"])
    bp.link(nt, p.outputs[0], out.inputs["Surface"])
    return m


def frosted(name, rough=0.3):
    m, nt, out = bp.new_mat(name)
    p = bp.principled(nt, (0.93, 0.955, 0.97, 1), 0.0, rough, Transmission_Weight=1.0, IOR=1.5)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    n = bp.node(nt, "ShaderNodeTexNoise", Scale=0.35, Detail=3.0)
    bp.link(nt, tc.outputs["Object"], n.inputs["Vector"])
    bp.link(nt, bp.math_(nt, "MULTIPLY_ADD", n.outputs["Fac"], 0.04, rough - 0.02), p.inputs["Roughness"])
    bp.link(nt, p.outputs[0], out.inputs["Surface"])
    return bp.shadow_pass(m, (0.90, 0.93, 0.95), 0.9)


def cyc_material():
    """Painted cyclorama: Chalk on the floor, cooling to Mist and Steel up the wall
    (by height), with faint large-scale paint mottling."""
    m, nt, out = bp.new_mat("cyc")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    bp.link(nt, tc.outputs["Object"], sep.inputs[0])
    mr = bp.node(nt, "ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 10.0
    mr.inputs["From Max"].default_value = 420.0
    bp.link(nt, sep.outputs[2], mr.inputs["Value"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    el = ramp.color_ramp.elements
    el[0].position, el[0].color = 0.0, (MIST[0] * 0.70, MIST[1] * 0.74, MIST[2] * 0.78, 1)
    el[1].position, el[1].color = 1.0, (STEEL[0] * 0.78, STEEL[1] * 0.92, STEEL[2] * 1.04, 1)
    e = el.new(0.35)
    e.color = (MIST[0] * 0.66, MIST[1] * 0.72, MIST[2] * 0.79, 1)
    ramp.color_ramp.interpolation = "EASE"
    bp.link(nt, mr.outputs[0], ramp.inputs[0])
    n0 = bp.node(nt, "ShaderNodeTexNoise", Scale=0.004, Detail=2.0, Roughness=0.55)
    bp.link(nt, tc.outputs["Object"], n0.inputs["Vector"])
    mot = bp.math_(nt, "MULTIPLY_ADD", n0.outputs["Fac"], 0.07, 0.965)
    cm = bp.node(nt, "ShaderNodeCombineColor")
    for i in range(3):
        bp.link(nt, mot, cm.inputs[i])
    mul = bp.node(nt, "ShaderNodeMix", _data_type="RGBA", _blend_type="MULTIPLY")
    mul.inputs["Factor"].default_value = 1.0
    bp.link(nt, ramp.outputs[0], mul.inputs["A"])
    bp.link(nt, cm.outputs[0], mul.inputs["B"])
    p = bp.principled(nt, CHALK, 0.0, 0.85, Specular_IOR_Level=0.2)
    bp.link(nt, mul.outputs["Result"], p.inputs["Base Color"])
    bp.link(nt, p.outputs[0], out.inputs["Surface"])
    return m


# ============================================================ geometry
def link_obj(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o)
    return o


def lathe(name, prof, mats, slot_fn=None, segs=128):
    o = bp.lathe(name, prof, mats, slot_fn=slot_fn, segs=segs)
    return o


def rarc(cx, cz, r, a0, a1, n=8):
    return bp.arc(cx, cz, r, a0, a1, n)


def plinth_round(name, R, h, mats, disc=None, edge=0.9, foot=0.0):
    """Low clay plinth with a debossed disc: rounded top edge, a 3 mm recess whose floor
    takes material slot 1."""
    e = min(edge, h * 0.4)
    prof = [(0, 0.0), (R - 0.3, 0.0)] + rarc(R - 0.3, 0.3, 0.3, -90, 0, 3)[1:]
    if foot:
        prof += [(R, foot), (R - 0.25, foot + 0.12), (R - 0.25, foot + 0.3)]
        R2 = R - 0.25
    else:
        R2 = R
    prof += [(R2, h - e)] + rarc(R2 - e, h - e, e, 0, 90, 8)[1:]
    if disc:
        rd, dep = disc, 0.32
        prof += [(rd + 0.12, h)] + rarc(rd + 0.12, h - 0.12, 0.12, 90, 180, 3)[1:] + [(rd, h - dep + 0.08)] + \
            rarc(rd - 0.08, h - dep + 0.08, 0.08, 0, -90, 3)[1:] + [(0, h - dep)]
        n_top = len(prof)
        o = lathe(name, prof, mats, slot_fn=lambda i, a, b: 1 if (a[1] < h - 0.2 and b[1] < h - 0.2 and a[0] < rd + 0.01 and b[0] < rd + 0.01 and i > 4) else 0)
    else:
        prof += [(0, h)]
        o = lathe(name, prof, mats[:1])
    return o


def rounded_slab(name, w, d, h, mats, bevel=1.1, disc=None, disc_xy=(0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z = (v.co.z + 0.5) * h
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mt in mats:
        me.materials.append(mt)
    o = link_obj(bpy.data.objects.new(name, me))
    if disc:
        cut = lathe(name + "_cut", [(0, h - 0.32), (disc, h - 0.32), (disc, h + 2), (0, h + 2)], [mats[1]], segs=128)
        cut.parent = o
        cut.location = (disc_xy[0], disc_xy[1], 0)
        cut.hide_render = True
        cut.display_type = "WIRE"
        bo = o.modifiers.new("disc", "BOOLEAN")
        bo.operation = "DIFFERENCE"
        bo.solver = "EXACT"
        bo.object = cut
        try:
            bo.material_mode = "TRANSFER"
        except Exception:
            pass
    bv = o.modifiers.new("bevel", "BEVEL")
    bv.width = bevel
    bv.segments = 6
    bv.limit_method = "ANGLE"
    bv.angle_limit = math.radians(50)
    bv.profile = 0.6
    o.modifiers.new("wn", "WEIGHTED_NORMAL")
    for f in me.polygons:
        f.use_smooth = True
    return o


def glass_pane(name, w, h, t, mat):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= t
        v.co.z = (v.co.z + 0.5) * h
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat)
    o = link_obj(bpy.data.objects.new(name, me))
    bv = o.modifiers.new("bevel", "BEVEL")
    bv.width = t * 0.48
    bv.segments = 8
    bv.limit_method = "NONE"
    for f in me.polygons:
        f.use_smooth = True
    return o


def capsule(name, L, r, mat):
    """Capsule lying along X, resting on z=0 (local)."""
    half = L / 2 - r
    prof = rarc(0, -half, r, -90, 0, 12) + rarc(0, half, r, 0, 90, 12)[0:]
    prof = [(max(0.0, x), z) for x, z in prof]
    o = lathe(name, prof, [mat], segs=64)
    o.rotation_euler = (0, math.pi / 2, 0)
    return o


def sphere(name, r, mat):
    prof = rarc(0, 0, r, -90, 90, 32)
    prof = [(max(0.0, x), z) for x, z in prof]
    return lathe(name, prof, [mat], segs=72)


def tablet(name, r, t, mat):
    e = t * 0.42
    prof = [(0, 0), (r - e, 0)] + rarc(r - e, e, e, -90, 0, 6)[1:] + [(r, t - e)] + rarc(r - e, t - e, e, 0, 90, 6)[1:] + [(0, t * 1.04)]
    return lathe(name, prof, [mat], segs=64)


def softgel(name, L, r, mat):
    prof = [(r * math.sin(a), -L / 2 * math.cos(a)) for a in [k / 24 * math.pi for k in range(25)]]
    prof = [(max(0.0, x), z) for x, z in prof]
    o = lathe(name, prof, [mat], segs=64)
    o.rotation_euler = (0, math.pi / 2, 0)
    return o


def put(o, parent, loc, rz=0.0, extra_rot=None):
    o.parent = parent
    o.location = loc
    rx, ry, _ = o.rotation_euler
    o.rotation_euler = (rx, ry, math.radians(rz))
    if extra_rot:
        o.rotation_euler = extra_rot
    return o


# ============================================================ packs (built once, instanced)
PACK_SRC = {}


def pack_source(kind):
    if kind not in PACK_SRC:
        root = bp.BUILDERS[kind]()
        bpy.context.view_layer.update()
        # centre the footprint on the origin (box + sachets is off-centre)
        dg = bpy.context.evaluated_depsgraph_get()
        xs, ys = [], []
        for o in root.children_recursive:
            if o.type == "MESH":
                oe = o.evaluated_get(dg)
                for v in oe.data.vertices:
                    w = oe.matrix_world @ v.co
                    xs.append(w.x)
                    ys.append(w.y)
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        for o in root.children:
            o.location.x -= cx
            o.location.y -= cy
        root.location = (0, 0, -1000)  # park the source out of shot
        for o in root.children_recursive:
            o.hide_render = True
        PACK_SRC[kind] = root
    return PACK_SRC[kind]


def pack(kind, parent, loc, yaw):
    src = pack_source(kind)
    r = link_obj(bpy.data.objects.new(src.name + "_i", None))
    for c in src.children:
        c2 = c.copy()  # linked duplicate: shares mesh data
        link_obj(c2)
        c2.hide_render = False
        c2.parent = r
    r.parent = parent
    r.location = loc
    r.rotation_euler = (0, 0, math.radians(yaw))
    return r


# ============================================================ stations
def build_stations(M):
    """Each station is authored by hand: plinth form, pack, props, optional frosted pane.
    Local frame: origin on the floor at the station centre, -Y towards the camera."""
    roots = []
    rnd = random.Random(6)

    def root_at(i):
        th = THETA[i]
        r = R_ARC + DEPTH[i]
        e = link_obj(bpy.data.objects.new("st%s" % CODES[i], None))
        e.location = u_of(th) * r
        e.rotation_euler = (0, 0, -math.radians(th))
        roots.append(e)
        return e

    pill = M["pill"]
    # ---- 01 Foundation: tin on a low round plinth, the slide-4 capsule and sphere
    s = root_at(0)
    p = put(plinth_round("p01", 17.0, 5.5, [M["clay_chalk"], M["disc"]], disc=11.5), s, (0, 0, 0))
    put(pack("tin", s, (0, 0, 0), 0), s, (-2.4, 1.2, 5.5 - 0.32), -16)
    put(capsule("c01a", 9.5, 1.85, pill), s, (6.6, -6.4, 5.5 - 0.32 + 1.85), 34)
    put(sphere("s01a", 2.3, pill), s, (-9.0, -9.6, 5.5 + 2.3))

    # ---- 02 Form: pouch on a rounded slab, frosted pane behind-left, small sphere cluster
    s = root_at(1)
    put(rounded_slab("p02", 38.0, 27.0, 4.2, [M["clay_mist"], M["disc"]], disc=10.5, disc_xy=(3.0, 1.0)), s, (0, 0, 0))
    put(pack("pouch", s, (0, 0, 0), 0), s, (3.0, 1.5, 4.2 - 0.32), -20)
    pane = glass_pane("g02", 34.0, 44.0, 2.4, M["glass"])
    put(pane, s, (-9.0, 22.0, 0.0), 8)
    for k, (x, y, r) in enumerate([(-12.5, -6.0, 1.9), (-9.4, -8.6, 1.35), (-14.8, -9.4, 1.0)]):
        put(sphere("s02%d" % k, r, pill), s, (x, y, 4.2 + r))

    # ---- 03 Force: low wide disc plus a tall clay column; pouch low, capsule balanced up high
    s = root_at(2)
    put(plinth_round("p03", 16.0, 3.6, [M["clay_chalk"], M["disc"]], disc=10.0), s, (-5.0, 0, 0))
    put(plinth_round("p03b", 6.8, 21.0, [M["clay_steel"]], edge=0.7), s, (19.0, 8.0, 0))
    put(pack("pouch", s, (0, 0, 0), 0), s, (-5.6, 0.8, 3.6 - 0.32), -12)
    put(capsule("c03a", 7.5, 1.45, pill), s, (19.0, 7.6, 21.0 + 1.45), -58)
    put(sphere("s03a", 1.6, pill), s, (6.0, -17.0, 1.6))

    # ---- 04 Endure: carton with sachets on a long low slab, loose sachet and tablets
    s = root_at(3)
    put(rounded_slab("p04", 44.0, 24.0, 3.2, [M["clay_chalk"], M["disc"]], disc=12.5, disc_xy=(-4.0, 1.5)), s, (0, 0, 0))
    put(pack("box", s, (0, 0, 0), 0), s, (-4.0, 2.4, 3.2 - 0.32), -26)
    for k, (x, y, rz) in enumerate([(11.5, -3.0, 0), (14.6, -6.6, 0), (12.3, -9.2, 0)]):
        put(tablet("t04%d" % k, 0.95, 0.55, pill), s, (x, y, 3.2), rz)
    put(sphere("s04a", 2.0, pill), s, (14.5, 5.0, 3.2 + 2.0))

    # ---- 05 Restore: tin and jar staggered on a taller round plinth, pane behind-right
    s = root_at(4)
    put(plinth_round("p05", 16.5, 9.5, [M["clay_mist"], M["disc"]], disc=12.0, foot=1.2), s, (0, 0, 0))
    put(pack("tin", s, (0, 0, 0), 0), s, (-3.6, 3.4, 9.5 - 0.32), -8)
    put(pack("jar", s, (0, 0, 0), 0), s, (4.8, -3.4, 9.5 - 0.32), -24)
    pane = glass_pane("g05", 30.0, 52.0, 2.2, M["glass"])
    put(pane, s, (11.0, 24.0, 0.0), -11)
    put(capsule("c05a", 6.0, 1.15, pill), s, (-15.0, -16.0, 1.15), 74)

    # ---- 06 Focus: open tin, lid set down beside it, real-scale capsules on the disc
    s = root_at(5)
    put(plinth_round("p06", 15.0, 4.6, [M["clay_chalk"], M["disc"]], disc=11.0), s, (0, 0, 0))
    t = pack("tin", s, (0, 0, 0), 0)
    put(t, s, (-3.0, 2.6, 4.6 - 0.32), -20)
    for c in t.children:
        if c.name.startswith("tin_lid"):
            # lid off, resting top-up on the disc to the right
            c.location = (c.location.x + 9.6, c.location.y - 3.4, c.location.z - 5.98)
    for k, (x, y, rz) in enumerate([(-2.0, -6.8, 18), (0.6, -7.9, -40), (-4.6, -6.0, 71), (-1.2, -9.4, 102)]):
        put(capsule("c06%d" % k, 2.2, 0.38, pill), s, (x, y, 4.6 - 0.32 + 0.38), rz)

    # ---- 07 Still: pouch leaning on a soft clay block, wide low base, one sphere
    s = root_at(6)
    put(rounded_slab("p07", 40.0, 30.0, 2.6, [M["clay_mist"], M["disc"]], disc=9.5, disc_xy=(9.0, -3.0)), s, (0, 0, 0))
    blk = rounded_slab("p07b", 22.0, 9.0, 17.0, [M["clay_steel"]], bevel=1.6)
    put(blk, s, (-5.0, 9.0, 2.6), 0)
    pch = pack("pouch", s, (0, 0, 0), 0)
    pch.parent = s
    pch.location = (-5.0, 0.8, 2.6 + 0.3)
    pch.rotation_euler = (math.radians(-11), 0, math.radians(-6))
    put(sphere("s07a", 3.0, pill), s, (9.0, -3.0, 2.6 - 0.32 + 3.0))

    # ---- 08 Renew: dropper on the disc, jar on a lower step, pane behind
    s = root_at(7)
    put(plinth_round("p08", 13.5, 7.5, [M["clay_chalk"], M["disc"]], disc=9.0), s, (-4.0, 0, 0))
    put(plinth_round("p08b", 11.0, 3.2, [M["clay_mist"]]), s, (12.5, -5.0, 0))
    put(pack("dropper", s, (0, 0, 0), 0), s, (-4.0, 0.6, 7.5 - 0.32), -14)
    put(pack("jar", s, (0, 0, 0), 0), s, (12.8, -5.4, 3.2), -30)
    pane = glass_pane("g08", 40.0, 38.0, 2.6, M["glass"])
    put(pane, s, (-2.0, 20.0, 0.0), 4)
    put(softgel("sg08", 2.6, 0.9, pill), s, (-16.0, -12.0, 0.9), 22)

    # ---- 09 Vital: tin on a taller drum, softgels at its foot
    s = root_at(8)
    put(plinth_round("p09", 14.0, 13.5, [M["clay_chalk"], M["disc"]], disc=10.0, edge=1.2), s, (0, 0, 0))
    put(pack("tin", s, (0, 0, 0), 0), s, (1.4, 1.0, 13.5 - 0.32), -10)
    for k, (x, y, rz) in enumerate([(-15.0, -7.0, 30), (-11.6, -10.4, -12), (-18.6, -10.8, 64)]):
        put(softgel("sg09%d" % k, 2.8, 0.95, pill), s, (x, y, 0.95), rz)
    put(sphere("s09a", 2.6, pill), s, (16.0, -11.0, 2.6))

    # ---- between stations: a few quiet objects set back, so the travel is not empty
    def loose(th, dr, obj, z):
        obj.location = u_of(th) * (R_ARC + dr) + Vector((0, 0, z))
        return obj
    loose((THETA[2] + THETA[3]) / 2 + 0.6, 46, sphere("x1", 3.4, pill), 3.4)
    loose((THETA[4] + THETA[5]) / 2 - 0.4, 34, plinth_round("x2", 9.0, 2.2, [M["clay_mist"]]), 0)
    loose((THETA[4] + THETA[5]) / 2 - 0.4, 34, sphere("x2s", 1.6, pill), 2.2 + 1.6)
    loose((THETA[0] + THETA[1]) / 2, -18, capsule("x4", 5.0, 0.95, pill), 0.95).rotation_euler.z = math.radians(-30)
    return roots


# ============================================================ set + light
def build_cyc(M):
    """Seamless cyclorama swept along the arc: floor, a broad cove, a tall wall."""
    cove = 160.0
    prof = [(5.0, 0.0), (WALL_R - cove, 0.0)] + \
        [(WALL_R - cove + cove * math.sin(a), cove - cove * math.cos(a)) for a in [k / 24 * math.pi / 2 for k in range(1, 25)]] + \
        [(WALL_R, 900.0)]
    a0, a1 = THETA[0] - 75, THETA[-1] + 75
    na = 220
    bm = bmesh.new()
    rows = []
    for i in range(na + 1):
        th = a0 + (a1 - a0) * i / na
        u = u_of(th)
        rows.append([bm.verts.new((u.x * r, u.y * r, z)) for r, z in prof])
    for a, b in zip(rows, rows[1:]):
        for j in range(len(prof) - 1):
            f = bm.faces.new((a[j], b[j], b[j + 1], a[j + 1]))
            f.smooth = True
    bm.normal_update()
    me = bpy.data.meshes.new("cyc")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(M["cyc"])
    o = link_obj(bpy.data.objects.new("cyc", me))
    return o


def lights():
    A = bp.area
    span = THETA[-1] - THETA[0]
    # overhead softboxes, a little behind the stations and not aligned with them
    for k in range(6):
        th = THETA[0] - 7 + (span + 14) * (k + 0.5) / 6
        loc = u_of(th) * (R_ARC + 45) + Vector((0, 0, 300))
        tgt = u_of(th) * (R_ARC - 20)
        A("top%d" % k, tuple(loc), 230, 200, 70000, (1.0, 0.995, 0.99), tuple(tgt), 85)
    # per-set key, as a gaffer would relight each still life: a soft box high on the
    # left, so shadows fall to the right as in the kit.
    # Angles and heights differ a little from set to set.
    rnd = random.Random(11)
    for i in range(N_ST):
        th = THETA[i]
        c = u_of(th) * (R_ARC + DEPTH[i])
        R, U = right_of(th), u_of(th)
        kx, ky, kz = -118 + rnd.uniform(-14, 14), -52 + rnd.uniform(-12, 12), 128 + rnd.uniform(-15, 15)
        loc = c + R * kx + U * ky + Vector((0, 0, kz))
        A("key%d" % i, tuple(loc), 75, 95, 92000 * KEY_K, (1.0, 0.985, 0.965), tuple(c + Vector((0, 0, 6))), 55)
    # broad ceiling panels over the camera side of the floor (the foreground is not a dark pit)
    for k in range(5):
        th = THETA[0] - 10 + (span + 20) * (k + 0.5) / 5
        loc = u_of(th) * (R_ARC - 270) + Vector((0, 0, 330))
        tgt = u_of(th) * (R_ARC - 250)
        A("ceil%d" % k, tuple(loc), 320, 300, CEIL_P, (1.0, 0.99, 0.98), tuple(tgt), 90)
    # wall wash: one-sided panels facing the cyc wall, so the cove has no dark band
    for k in range(6):
        th = THETA[0] - 12 + (span + 24) * (k + 0.5) / 6
        loc = u_of(th) * (R_ARC + 50) + Vector((0, 0, 240))
        tgt = u_of(th) * WALL_R + Vector((0, 0, 170))
        A("wash%d" % k, tuple(loc), 320, 160, WASH_P, (0.93, 0.96, 1.0), tuple(tgt), 85, shadow=False)
    # cool low fill from camera-right, shadowless
    for k, off in enumerate([0.1, 0.55, 0.95]):
        th = THETA[0] + span * off + 16
        loc = u_of(th) * (R_ARC - 260) + Vector((0, 0, 60))
        tgt = u_of(th - 12) * (R_ARC) + Vector((0, 0, 10))
        A("fill%d" % k, tuple(loc), 260, 160, 9000, (0.86, 0.92, 1.0), tuple(tgt), 80, shadow=False)
    # world: misty, brighter overhead (fills the glossy reflections with soft light)
    w = bpy.data.worlds.new("mist")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = tuple(c * 0.35 for c in STEEL[:3]) + (1,)
    ramp.color_ramp.elements[1].position = 0.9
    ramp.color_ramp.elements[1].color = tuple(MIST[:3]) + (1,)
    mp = nt.nodes.new("ShaderNodeMapRange")
    mp.inputs["From Min"].default_value = -1
    mp.inputs["From Max"].default_value = 1
    nt.links.new(sep.outputs[2], mp.inputs["Value"])
    nt.links.new(mp.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.12
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    # depth haze on camera rays only: absorption + matching emission (an exact fog blend),
    # homogeneous, so it costs almost nothing and does not muddy the lighting
    lp = nt.nodes.new("ShaderNodeLightPath")
    sigma = 0.00055
    dens = bp.math_(nt, "MULTIPLY", lp.outputs["Is Camera Ray"], sigma)
    ab = nt.nodes.new("ShaderNodeVolumeAbsorption")
    ab.inputs["Color"].default_value = (1, 1, 1, 1)
    nt.links.new(dens, ab.inputs["Density"])
    em = nt.nodes.new("ShaderNodeEmission")
    fog = tuple(0.75 * a + 0.25 * b for a, b in zip(MIST[:3], STEEL[:3])) + (1,)
    em.inputs["Color"].default_value = fog
    nt.links.new(bp.math_(nt, "MULTIPLY", dens, FOG_L), em.inputs["Strength"])
    add = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(ab.outputs[0], add.inputs[0])
    nt.links.new(em.outputs[0], add.inputs[1])
    if OPTS.get("vol", False):
        nt.links.new(add.outputs[0], out.inputs["Volume"])


FOG_L = 1.0
KEY_K = 1.0
WASH_P = 45000
CEIL_P = 250000
OPTS = {}
FOG_SIGMA = 0.00042


def comp_fog(sc):
    """Depth haze in the compositor (scene-linear, before the view transform):
    out = mix(image, fog, 1 - exp(-sigma * depth)). Exact, free, and stable frame to frame."""
    vl = sc.view_layers[0]
    vl.use_pass_mist = True
    ms = sc.world.mist_settings
    ms.start, ms.depth, ms.falloff = 0.0, 5000.0, "LINEAR"
    ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    go = ng.nodes.new("NodeGroupOutput")
    m1 = ng.nodes.new("ShaderNodeMath")
    m1.operation = "MULTIPLY"
    m1.inputs[1].default_value = -FOG_SIGMA * 5000.0
    ng.links.new(rl.outputs["Mist"], m1.inputs[0])
    m2 = ng.nodes.new("ShaderNodeMath")
    m2.operation = "EXPONENT"
    ng.links.new(m1.outputs[0], m2.inputs[0])
    m3 = ng.nodes.new("ShaderNodeMath")
    m3.operation = "SUBTRACT"
    m3.inputs[0].default_value = 1.0
    ng.links.new(m2.outputs[0], m3.inputs[1])
    mix = ng.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    ng.links.new(m3.outputs[0], mix.inputs["Factor"])
    ng.links.new(rl.outputs["Image"], mix.inputs["A"])
    fog = tuple(FOG_L * (0.72 * a + 0.28 * b) for a, b in zip(MIST[:3], STEEL[:3])) + (1,)
    mix.inputs["B"].default_value = fog
    ng.links.new(mix.outputs["Result"], go.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
    sc.render.compositor_device = "CPU"
    sc.render.compositor_precision = "FULL"


# ============================================================ camera
def station_target(i):
    return u_of(THETA[i]) * (R_ARC + DEPTH[i])


def station_extent(root):
    dg = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in root.children_recursive:
        if o.type != "MESH" or o.hide_render or o.name.startswith("g0"):
            continue
        oe = o.evaluated_get(dg)
        mw = oe.matrix_world
        pts += [mw @ Vector(c) for c in oe.bound_box]
    return pts


def look(cam, loc, tgt, roll=0.0):
    cam.location = loc
    d = (Vector(tgt) - Vector(loc))
    q = d.to_track_quat("-Z", "Y")
    if roll:
        q = q @ Matrix.Rotation(math.radians(roll), 4, "Z").to_quaternion()
    cam.rotation_euler = q.to_euler()


DIST = [104, 120, 121, 114, 114, 100, 119, 116, 110]   # rest distances (cm), set by eye
ELEV = [13.5, 14.5, 12.5, 15.0, 13.5, 16.0, 13.0, 14.0, 12.5]


def fit_station(sc, cam, root, i):
    """Same framing logic at every stop: camera on the station's radial line at a set
    elevation and distance, aimed at the middle of the still life's height (panes excluded)."""
    pts = station_extent(root)
    zmax = max(p.z for p in pts)
    cz = zmax * 0.46
    return {"th": THETA[i], "r": R_ARC + DEPTH[i], "z": cz, "dist": DIST[i], "elev": ELEV[i]}


def smooth(t):
    return t * t * (3 - 2 * t)


def smoother(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def pose_from(p):
    """Camera location + target from arc-space pose."""
    tgt = u_of(p["th"]) * p["r"] + Vector((0, 0, p["z"]))
    el = math.radians(p["elev"])
    dirv = -u_of(p["th"] + p.get("yaw", 0.0)) * math.cos(el) + Vector((0, 0, math.sin(el)))
    return tgt + dirv * p["dist"], tgt


def lerp(a, b, t):
    return a + (b - a) * t


def drift(f, amp=0.12):
    """Very slow organic drift (degrees) so the camera does not feel computed."""
    return (amp * noise.noise(Vector((f * 0.045, 1.7, 0.3))),
            amp * noise.noise(Vector((f * 0.041, 4.2, 2.1))),
            0.6 * amp * noise.noise(Vector((f * 0.037, 7.9, 5.5))))


def camera_at(f, poses):
    """Returns (loc, tgt, lens, fstop, roll)."""
    if f >= STATION_FRAMES[0]:
        k = min((f - INTRO) // SEG, N_ST - 2)
        t = (f - STATION_FRAMES[k]) / SEG
        a, b = poses[k], poses[k + 1]
        # partial ease: settles into each station, without big jumps mid-move
        u = 0.45 * t + 0.55 * smoother(t)
        bump = math.sin(math.pi * u)
        p = {
            "th": lerp(a["th"], b["th"], u),
            "r": lerp(a["r"], b["r"], u),
            "z": lerp(a["z"], b["z"], u) + 3.0 * bump,
            "dist": lerp(a["dist"], b["dist"], u) * (1 + 0.62 * bump ** 1.3),
            "elev": lerp(a["elev"], b["elev"], u) + 4.5 * bump,
            "yaw": 0.0,
        }
        loc, tgt = pose_from(p)
        fstop = lerp(5.6, 8.0, bump)
        lens = LENS
        roll = 0.0
        if t == 0:
            d = (0.0, 0.0, 0.0)
        else:
            d = drift(f)
            w = math.sin(math.pi * t)
            d = tuple(x * w for x in d)
        return loc, tgt, lens, fstop, d
    # ---- intro: high and wide over the arc, descending and swinging round onto 01
    t = f / INTRO
    u = smoother(t) * 0.8 + t * 0.2
    s1 = poses[0]
    loc1, tgt1 = pose_from(s1)
    th_mid = (THETA[0] * 0.4 + THETA[1] * 0.6)
    el0 = math.radians(36)
    tgt0 = u_of(th_mid) * R_ARC + Vector((0, 0, 4))
    loc0 = tgt0 + (-u_of(th_mid + 4) * math.cos(el0) + Vector((0, 0, math.sin(el0)))) * 360
    ctrl = u_of(THETA[0] - 3) * (R_ARC - 200) + Vector((0, 0, 95))
    loc = (1 - u) ** 2 * loc0 + 2 * (1 - u) * u * ctrl + u * u * loc1
    tc = smooth(min(1.0, t * 1.15))
    tgt = tgt0.lerp(tgt1, tc)
    lens = lerp(50.0, LENS, smooth(t))
    fstop = lerp(11.0, 5.6, smooth(t))
    d = tuple(x * (1 - t) for x in drift(f, 0.08))
    return loc, tgt, lens, fstop, d


# ============================================================ main
def build(args):
    global FOG_L
    sc = reset()
    bp.SZ = labels.build()
    M = {
        "clay_chalk": clay("clay_chalk", (0.80, 0.815, 0.80, 1)),
        "clay_mist": clay("clay_mist", tuple(c * 0.98 for c in MIST[:3]) + (1,)),
        "clay_steel": clay("clay_steel", (0.42, 0.50, 0.56, 1), rough=0.7),
        "disc": clay("disc", (0.47, 0.54, 0.585, 1), rough=0.72, bump=0.03),
        "pill": clay("pill", (0.84, 0.85, 0.85, 1), rough=0.55, sss=0.12, bump=0.025, vary=0.015, sheen=0.2),
        "glass": frosted("pane", 0.26),
        "cyc": cyc_material(),
    }
    FOG_L = args.fog_l
    roots = build_stations(M)
    build_cyc(M)
    lights()
    cd = bpy.data.cameras.new("cam")
    cd.lens = LENS
    cd.sensor_fit = "HORIZONTAL"
    cd.sensor_width = 36.0
    cd.clip_start = 2.0
    cd.clip_end = 6000.0
    cd.shift_y = SHIFT_Y
    cd.dof.use_dof = True
    cd.dof.aperture_blades = 7
    cd.dof.aperture_rotation = math.radians(12)
    cam = link_obj(bpy.data.objects.new("cam", cd))
    sc.camera = cam
    sc.render.resolution_x = sc.render.resolution_y = args.res
    sc.render.resolution_percentage = 100
    bpy.context.view_layer.update()
    poses = [fit_station(sc, cam, roots[i], i) for i in range(N_ST)]
    comp_fog(sc)
    return sc, cam, poses


def set_frame(sc, cam, poses, f):
    loc, tgt, lens, fstop, d = camera_at(f, poses)
    look(cam, loc, tgt)
    e = cam.rotation_euler
    cam.rotation_euler = (e.x + math.radians(d[0]), e.y + math.radians(d[2]), e.z + math.radians(d[1]))
    cam.data.lens = lens
    cam.data.dof.aperture_fstop = fstop
    cam.data.dof.focus_distance = (Vector(tgt) - Vector(loc)).length


def parse_frames(s):
    if not s:
        return list(range(COUNT))
    out = []
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-")
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/film")
    ap.add_argument("--res", type=int, default=320)
    ap.add_argument("--samples", type=int, default=8)
    ap.add_argument("--frames", default="")
    ap.add_argument("--step", type=int, default=1)
    ap.add_argument("--stills", action="store_true")
    ap.add_argument("--plan", action="store_true")
    ap.add_argument("--threshold", type=float, default=0.02)
    ap.add_argument("--fog-l", type=float, default=0.6)
    ap.add_argument("--exposure", type=float, default=-0.45)
    ap.add_argument("--skip-existing", action="store_true")
    ap.add_argument("--novol", action="store_true")
    ap.add_argument("--nosss", action="store_true")
    ap.add_argument("--bounces", default="6,2,2,4")
    ap.add_argument("--hide", default="", help="comma list of object-name prefixes to hide (profiling)")
    ap.add_argument("--dn", default="HIGH,ACCURATE", help="OIDN quality,prefilter")
    ap.add_argument("--nobump", action="store_true")
    ap.add_argument("--wash", type=float, default=45000)
    ap.add_argument("--ceil", type=float, default=250000)
    ap.add_argument("--blend", default="")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    if a.plan:
        print(json.dumps({"count": COUNT, "intro": [0, STATION_FRAMES[0]],
                          "stations": [{"code": c, "frame": f} for c, f in zip(CODES, STATION_FRAMES)]}))
        return
    os.makedirs(a.out, exist_ok=True)
    global WASH_P, CEIL_P
    WASH_P, CEIL_P = a.wash, a.ceil
    OPTS["vol"] = not a.novol
    OPTS["sss"] = not a.nosss
    sc, cam, poses = build(a)
    q, pf = a.dn.split(",")
    sc.cycles.denoising_quality = q
    sc.cycles.denoising_prefilter = pf
    if a.hide:
        for o in bpy.data.objects:
            if any(o.name.startswith(h) for h in a.hide.split(",")):
                o.hide_render = True
    if a.nobump:
        for m in bpy.data.materials:
            if m.node_tree:
                for n in list(m.node_tree.nodes):
                    if n.type == "BUMP":
                        m.node_tree.nodes.remove(n)
    if a.bounces:
        b = [int(x) for x in a.bounces.split(",")]
        cy = sc.cycles
        cy.max_bounces, cy.diffuse_bounces, cy.glossy_bounces, cy.transmission_bounces = b
    sc.view_settings.exposure = a.exposure
    sc.cycles.samples = a.samples
    sc.cycles.adaptive_threshold = a.threshold
    if a.samples <= 16:
        sc.cycles.use_adaptive_sampling = False
    if a.blend:
        bpy.ops.wm.save_as_mainfile(filepath=a.blend)
    frames = STATION_FRAMES if a.stills else parse_frames(a.frames)[::a.step]
    log = os.path.join(a.out, "times.jsonl")
    for f in frames:
        name = ("%s.png" % CODES[STATION_FRAMES.index(f)]) if a.stills else ("%03d.png" % f)
        path = os.path.join(a.out, name)
        if a.skip_existing and os.path.exists(path):
            continue
        set_frame(sc, cam, poses, f)
        sc.frame_current = f
        sc.render.filepath = path
        t = time.time()
        bpy.ops.render.render(write_still=True)
        dt = time.time() - t
        with open(log, "a") as fh:
            fh.write(json.dumps({"frame": f, "file": name, "sec": round(dt, 1), "res": a.res, "spp": a.samples}) + "\n")
        print("FRAME %s %.1fs" % (name, dt), flush=True)


if __name__ == "__main__":
    main()
