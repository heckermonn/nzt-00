"""PR6 v6 pack renders (Blender Cycles, CPU).

Builds five pack types procedurally (tin, pouch, box + sachets, dropper, jar),
lights them in a soft cool studio and renders:
  hero   1600x2000 RGBA, transparent film + shadow catcher
  turn   24 frames 800x1000 RGBA, same camera, object rotated 15 deg/frame
The mist variant is composited from the hero in finalize.py (exact brand colours).

Run with Blender-as-a-module (bpy 5.2) + Pillow in the same venv:
  python build_packs.py --packs tin,pouch,box,dropper,jar --modes hero,turn \
      --raw /tmp/pr6raw [--samples 160] [--tt-samples 40] [--scale 1.0]
Units: 1 BU = 1 cm.
"""
import argparse
import json
import math
import os
import sys
import time

import bpy  # noqa: I001  (bpy must load before bmesh)
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector, noise

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import labels  # noqa: E402

TEX = os.path.join(HERE, "tex")


def srgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, a)


INK = srgb("171C1F")
CHALK = srgb("F2F3EF")
ORANGE = srgb("E98546")
STEEL = srgb("718B9A")
MIST = srgb("CAD5DA")


# ============================================================ scene
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.01
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.015
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    try:
        cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
        cy.denoising_prefilter = "ACCURATE"
    except Exception:
        pass
    cy.max_bounces = 14
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 6
    cy.transmission_bounces = 12
    cy.transparent_max_bounces = 8
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 1.0
    cy.sample_clamp_indirect = 6.0
    try:
        cy.use_light_tree = True
    except Exception:
        pass
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.render.film_transparent = True
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "16"
    sc.view_settings.view_transform = "AgX"
    for look in ("AgX - Base Contrast", "Base Contrast", "None"):
        try:
            sc.view_settings.look = look
            break
        except Exception:
            continue
    sc.view_settings.exposure = 0.0
    return sc


# ============================================================ node helpers
def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    return m, nt, out


def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        if k.startswith("_"):
            setattr(n, k[1:], v)
        else:
            n.inputs[k].default_value = v
    return n


def link(nt, a, b):
    nt.links.new(a, b)


def math_(nt, op, *args):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    for i, v in enumerate(args):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            link(nt, v, n.inputs[i])
    return n.outputs[0]


def principled(nt, base, metal=0.0, rough=0.4, **extra):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p.inputs["Base Color"].default_value = base
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    for k, v in extra.items():
        p.inputs[k.replace("_", " ")].default_value = v
    return p


def obj_coords(nt):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    link(nt, tc.outputs["Object"], sep.inputs[0])
    return tc, sep


def decal(nt, img_name, vec, su, lu, sv, lv):
    """Image decal (CLIP) placed by patch = vec*S + L. Returns (color, alpha)."""
    img = bpy.data.images.load(os.path.join(TEX, img_name), check_existing=True)
    mp = node(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (su, sv, 1)
    mp.inputs["Location"].default_value = (lu, lv, 0)
    link(nt, vec, mp.inputs["Vector"])
    it = nt.nodes.new("ShaderNodeTexImage")
    it.image = img
    it.extension = "CLIP"
    it.interpolation = "Cubic"
    link(nt, mp.outputs[0], it.inputs[0])
    return it.outputs["Color"], it.outputs["Alpha"]


def height_tex(nt, img_name, vec, su, lu, sv, lv):
    img = bpy.data.images.load(os.path.join(TEX, img_name), check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    mp = node(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (su, sv, 1)
    mp.inputs["Location"].default_value = (lu, lv, 0)
    link(nt, vec, mp.inputs["Vector"])
    it = nt.nodes.new("ShaderNodeTexImage")
    it.image = img
    it.extension = "EXTEND"
    link(nt, mp.outputs[0], it.inputs[0])
    return it.outputs["Color"]


def brushed_height(nt, sep, mode, freq=900.0):
    """Fine brushing grooves as a height signal.
    spun: concentric (varies with radius); turned: horizontal rings (varies with z);
    vertical: vertical lines on a cylinder / linear along y on flats (varies in xy)."""
    tc = nt.nodes.new("ShaderNodeTexCoord")
    if mode == "spun":
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, sep.outputs[0], cmb.inputs[0])
        link(nt, sep.outputs[1], cmb.inputs[1])
        ln = node(nt, "ShaderNodeVectorMath", _operation="LENGTH")
        link(nt, cmb.outputs[0], ln.inputs[0])
        w = ln.outputs["Value"]
        n1 = node(nt, "ShaderNodeTexNoise", _noise_dimensions="1D", Scale=freq, Detail=6.0, Roughness=0.65)
        link(nt, w, n1.inputs["W"])
        n2 = node(nt, "ShaderNodeTexNoise", _noise_dimensions="1D", Scale=freq * 0.07, Detail=2.0)
        link(nt, w, n2.inputs["W"])
    else:
        mp = node(nt, "ShaderNodeMapping")
        mp.inputs["Scale"].default_value = (1.0, 1.0, 0.004) if mode == "vertical" else (0.004, 0.004, 1.0)
        link(nt, tc.outputs["Object"], mp.inputs[0])
        n1 = node(nt, "ShaderNodeTexNoise", Scale=freq, Detail=6.0, Roughness=0.65)
        link(nt, mp.outputs[0], n1.inputs["Vector"])
        n2 = node(nt, "ShaderNodeTexNoise", Scale=freq * 0.07, Detail=2.0)
        link(nt, mp.outputs[0], n2.inputs["Vector"])
    h = math_(nt, "MULTIPLY_ADD", n1.outputs["Fac"], 0.75, math_(nt, "MULTIPLY", n2.outputs["Fac"], 0.25))
    return h, n2.outputs["Fac"]


def aluminium(name, mode, deco=None, base=(0.80, 0.81, 0.82, 1), rough=0.26, aniso=0.8,
              bump=0.25, tangent="radial", rot=None):
    """Brushed aluminium. deco: callable(nt, sep) -> (color, alpha) for print."""
    m, nt, out = new_mat(name)
    tc, sep = obj_coords(nt)
    p = principled(nt, base, 1.0, rough, Anisotropic=aniso)
    h, streak = brushed_height(nt, sep, mode)
    # faint long streaks in roughness so the brushing is not uniform
    r = math_(nt, "MULTIPLY_ADD", streak, 0.10, rough - 0.05)
    link(nt, r, p.inputs["Roughness"])
    if tangent == "radial":
        t = node(nt, "ShaderNodeTangent", _direction_type="RADIAL", _axis="Z")
        link(nt, t.outputs[0], p.inputs["Tangent"])
    bp = node(nt, "ShaderNodeBump", Strength=bump, Distance=0.002)
    link(nt, h, bp.inputs["Height"])
    link(nt, bp.outputs[0], p.inputs["Normal"])
    if mode == "spun":
        p.inputs["Anisotropic Rotation"].default_value = 0.25 if tangent == "radial" else 0.0
    if rot is not None:
        p.inputs["Anisotropic Rotation"].default_value = rot
    shader = p.outputs[0]
    if deco:
        col, alpha = deco(nt, sep)
        ink = principled(nt, INK, 0.0, 0.42, Specular_IOR_Level=0.45)
        link(nt, col, ink.inputs["Base Color"])
        # print sits slightly proud of the metal
        bp2 = node(nt, "ShaderNodeBump", Strength=0.35, Distance=0.004)
        link(nt, alpha, bp2.inputs["Height"])
        link(nt, bp.outputs[0], bp2.inputs["Normal"])
        link(nt, bp2.outputs[0], ink.inputs["Normal"])
        link(nt, bp2.outputs[0], p.inputs["Normal"])
        mix = node(nt, "ShaderNodeMixShader")
        link(nt, alpha, mix.inputs[0])
        link(nt, p.outputs[0], mix.inputs[1])
        link(nt, ink.outputs[0], mix.inputs[2])
        shader = mix.outputs[0]
    link(nt, shader, out.inputs["Surface"])
    return m


def simple(name, base, metal=0.0, rough=0.4, **extra):
    m, nt, out = new_mat(name)
    p = principled(nt, base, metal, rough, **extra)
    link(nt, p.outputs[0], out.inputs["Surface"])
    return m, nt, p


# ============================================================ geometry helpers
def link_obj(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def arc(cx, cz, r, a0, a1, n=8):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def lathe(name, prof, mats, slot_fn=None, segs=160, smooth=True):
    """Revolve profile [(r,z)] around Z. UV: u = angle/2pi, v = z (cm).
    slot_fn(i, (r0,z0), (r1,z1)) -> material index for segment i."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    rings = []
    for r, z in prof:
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))])
        else:
            rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z))
                          for a in (i / segs * math.tau for i in range(segs))])
    for si, (a, b) in enumerate(zip(rings, rings[1:])):
        mi = slot_fn(si, prof[si], prof[si + 1]) if slot_fn else 0
        za, zb = prof[si][1], prof[si + 1][1]
        if len(a) == 1 and len(b) == 1:
            continue
        for i in range(segs):
            j = (i + 1) % segs
            u0, u1 = i / segs, (i + 1) / segs
            if len(a) == 1:
                vs, uvs = (a[0], b[j], b[i]), ((u0, za), (u1, zb), (u0, zb))
            elif len(b) == 1:
                vs, uvs = (a[i], a[j], b[0]), ((u0, za), (u1, za), (u0, zb))
            else:
                vs, uvs = (a[i], a[j], b[j], b[i]), ((u0, za), (u1, za), (u1, zb), (u0, zb))
            try:
                f = bm.faces.new(vs)
            except ValueError:
                continue
            f.material_index = mi
            f.smooth = smooth
            for lp, uv in zip(f.loops, uvs):
                lp[uvl].uv = uv
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mt in mats:
        me.materials.append(mt)
    o = link_obj(bpy.data.objects.new(name, me))
    return o


def recalc_outside(o):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def grid_solid(name, nu, nv, pos_front, pos_back, uv_fn, mats, front_slot=0, back_slot=0, edge_slot=0,
               cap_bottom=None):
    """Closed thin shell from two grids (front/back) of size (nu+1)x(nv+1) sharing a
    rim joined by a strip. pos_*(i,j) -> Vector. cap_bottom: if True, bottom rim (j=0)
    is fan-filled instead of stripped."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    F = [[bm.verts.new(pos_front(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]
    B = [[bm.verts.new(pos_back(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]

    def quad(vs, uvs, slot):
        try:
            f = bm.faces.new(vs)
        except ValueError:
            return
        f.material_index = slot
        f.smooth = True
        for lp, uv in zip(f.loops, uvs):
            lp[uvl].uv = uv

    for i in range(nu):
        for j in range(nv):
            quad((F[i][j], F[i + 1][j], F[i + 1][j + 1], F[i][j + 1]),
                 (uv_fn(i, j), uv_fn(i + 1, j), uv_fn(i + 1, j + 1), uv_fn(i, j + 1)), front_slot)
            quad((B[i][j], B[i][j + 1], B[i + 1][j + 1], B[i + 1][j]),
                 (uv_fn(i, j), uv_fn(i, j + 1), uv_fn(i + 1, j + 1), uv_fn(i + 1, j)), back_slot)
    rim = []  # loop around the boundary as (i,j) pairs
    rim += [(i, 0) for i in range(nu)]
    rim += [(nu, j) for j in range(nv)]
    rim += [(i, nv) for i in range(nu, 0, -1)]
    rim += [(0, j) for j in range(nv, 0, -1)]
    for k in range(len(rim)):
        a, b = rim[k], rim[(k + 1) % len(rim)]
        if cap_bottom and a[1] == 0 and b[1] == 0:
            continue
        quad((F[a[0]][a[1]], B[a[0]][a[1]], B[b[0]][b[1]], F[b[0]][b[1]]),
             ((0, 0), (0, 0), (0, 0), (0, 0)), edge_slot)
    if cap_bottom:
        ring = [F[i][0] for i in range(nu + 1)] + [B[i][0] for i in range(nu, -1, -1)]
        c = Vector((0, 0, 0))
        for v in ring:
            c += v.co
        c /= len(ring)
        cv = bm.verts.new(c)
        for k in range(len(ring)):
            a, b = ring[k], ring[(k + 1) % len(ring)]
            if a is b:
                continue
            try:
                f = bm.faces.new((cv, b, a))
                f.material_index = edge_slot
                f.smooth = True
            except ValueError:
                pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.normal_update()
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for mt in mats:
        me.materials.append(mt)
    return link_obj(bpy.data.objects.new(name, me))


def parent_all(name, objs):
    e = link_obj(bpy.data.objects.new(name, None))
    for o in objs:
        o.parent = e
    return e


def cyl_decal(img, W_mm, H_mm, r_cm, z0_cm, u_center=0.75):
    """deco callable: map a W x H mm decal onto a cylinder of radius r, bottom at z0."""
    su = 2 * math.pi * r_cm * 10.0 / W_mm
    sv = 10.0 / H_mm

    def deco(nt, sep):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        return decal(nt, img, uv.outputs[0], su, -u_center * su + 0.5, sv, -z0_cm * sv)
    return deco


# ============================================================ packs
SZ = None  # decal sizes from labels.build()


def build_tin():
    R = 3.5
    W, H = SZ["tin"]
    body_mat = aluminium("tin_body", "vertical", deco=cyl_decal("tin_label.png", W, H, R, 0.55),
                         rough=0.26, aniso=0.6, bump=0.18, rot=0.0)
    lid_side = aluminium("tin_lid_side", "vertical", rough=0.25, aniso=0.6, bump=0.18, rot=0.0)
    lid_top = aluminium("tin_lid_top", "spun", rough=0.22, aniso=0.85, bump=0.12)
    inner, _, _ = simple("tin_inner", (0.5, 0.51, 0.52, 1), 1.0, 0.35)
    body = lathe("tin_body", [(0, 0.06), (3.30, 0.06), (3.38, 0.0)] + arc(3.40, 0.10, 0.10, -90, 0, 6)[1:] +
                 [(3.5, 5.80)] + arc(3.42, 5.80, 0.08, 0, 70, 4)[1:] + [(3.40, 5.95), (3.40, 6.6), (3.30, 6.6), (3.30, 0.3), (0, 0.3)],
                 [body_mat, inner], slot_fn=lambda i, a, b: 1 if (a[0] < 3.39 and b[0] < 3.39 and a[1] > 0.2) else 0)
    lid_prof = [(3.42, 6.70), (3.42, 5.98)] + arc(3.49, 5.98, 0.07, 180, 270, 4)[1:] + arc(3.49, 6.01, 0.075, -90, 0, 4)[1:] + \
        [(3.565, 7.84)] + arc(3.445, 7.84, 0.12, 0, 90, 8)[1:] + [(2.0, 7.965), (0, 7.97)]
    lid = lathe("tin_lid", lid_prof, [lid_side, lid_top],
                slot_fn=lambda i, a, b: 1 if (a[1] > 7.9 and b[1] > 7.9) else 0)
    lid_in = lathe("tin_lid_in", [(0, 7.80), (3.42, 7.80), (3.42, 6.70)], [inner])
    return parent_all("tin", [body, lid, lid_in])


def foil_material(name, deco=None, deco_mask_y=False, deco_mask_z=False, seal=None, rough=0.20, crinkle=0.5, label_soft=True):
    """Brushed silver foil with crinkle bump; deco gives (color, alpha) for a printed panel.
    seal(nt, sep) -> height signal for heat-seal ridges."""
    m, nt, out = new_mat(name)
    tc, sep = obj_coords(nt)
    p = principled(nt, (0.90, 0.91, 0.92, 1), 1.0, rough, Anisotropic=0.55)
    t = node(nt, "ShaderNodeTangent", _direction_type="RADIAL", _axis="Y")
    link(nt, t.outputs[0], p.inputs["Tangent"])
    # brushed lines (horizontal) + crinkle cells
    h_b, streak = brushed_height(nt, sep, "turned", freq=700.0)
    vor = node(nt, "ShaderNodeTexVoronoi", Scale=2.2, _feature="F2", _distance="EUCLIDEAN")
    link(nt, tc.outputs["Object"], vor.inputs["Vector"])
    nz = node(nt, "ShaderNodeTexNoise", Scale=1.4, Detail=4.0, Roughness=0.6)
    link(nt, tc.outputs["Object"], nz.inputs["Vector"])
    crk = math_(nt, "MULTIPLY_ADD", vor.outputs["Distance"], 0.6, math_(nt, "MULTIPLY", nz.outputs["Fac"], 0.4))
    h = math_(nt, "MULTIPLY_ADD", crk, crinkle, math_(nt, "MULTIPLY", h_b, 0.05))
    if seal:
        h = math_(nt, "ADD", h, seal(nt, sep))
    r = math_(nt, "MULTIPLY_ADD", streak, 0.10, rough - 0.04)
    link(nt, r, p.inputs["Roughness"])
    bp = node(nt, "ShaderNodeBump", Strength=0.35, Distance=0.02)
    link(nt, h, bp.inputs["Height"])
    link(nt, bp.outputs[0], p.inputs["Normal"])
    shader = p.outputs[0]
    if deco:
        col, alpha = deco(nt, sep)
        if deco_mask_y:
            front = math_(nt, "LESS_THAN", sep.outputs[1], 0.0)
            alpha = math_(nt, "MULTIPLY", alpha, front)
        if deco_mask_z:
            alpha = math_(nt, "MULTIPLY", alpha, math_(nt, "GREATER_THAN", sep.outputs[2], 0.0))
        prn = principled(nt, CHALK, 0.0, 0.45, Specular_IOR_Level=0.5)
        link(nt, col, prn.inputs["Base Color"])
        bp2 = node(nt, "ShaderNodeBump", Strength=0.12 if label_soft else 0.3, Distance=0.02)
        link(nt, h, bp2.inputs["Height"])
        link(nt, bp2.outputs[0], prn.inputs["Normal"])
        mix = node(nt, "ShaderNodeMixShader")
        link(nt, alpha, mix.inputs[0])
        link(nt, p.outputs[0], mix.inputs[1])
        link(nt, prn.outputs[0], mix.inputs[2])
        shader = mix.outputs[0]
    link(nt, shader, out.inputs["Surface"])
    return m


def build_pouch():
    Wp, Hp = 13.0, 19.0
    seal_w, top_seal = 0.55, 2.7
    D, e = 2.0, 0.025
    nu, nv = 110, 170
    zs = Hp - top_seal
    notch_z, notch_d, notch_h = Hp - 1.35, 0.42, 0.26

    def bulge(x, z):
        u = abs(x) / (Wp / 2 - seal_w)
        if u >= 1 or z >= zs:
            return 0.0
        s = z / zs
        f = (1 - s ** 1.7) ** 0.75 * (1.0 - 0.12 * math.exp(-((s - 0.0) / 0.08) ** 2))
        g = (1 - u ** 2.6) ** 0.62
        # top transition softens into the seal
        return D * f * g

    def wrinkle(x, z):
        b = bulge(x, z)
        w = 0.0
        # long vertical-ish creases + small crinkles, stronger where the foil folds
        w += 0.11 * noise.noise(Vector((x * 0.9, z * 0.18, 3.1)))
        w += 0.035 * noise.noise(Vector((x * 2.7, z * 1.1, 7.7)))
        w += 0.012 * noise.noise(Vector((x * 7.0, z * 5.0, 1.3)))
        fold = 0.6 + 0.4 * min(1.0, (1 - b / D) * 1.3)
        # ridged creases (sharp folds), strongest low down by the gusset and at the sides
        rn = 1.0 - abs(noise.noise(Vector((x * 0.55, z * 0.28, 11.0))))
        rn2 = 1.0 - abs(noise.noise(Vector((x * 1.4, z * 0.6, 4.0))))
        lowside = 0.5 + 0.5 * max(math.exp(-z / 3.0), (abs(x) / (Wp / 2)) ** 3)
        w += (0.07 * rn ** 6 + 0.025 * rn2 ** 5) * lowside
        return w * fold * (1.0 if z < zs else 0.25)

    def pos(i, j, side):
        x = -Wp / 2 + Wp * i / nu
        z = Hp * j / nv
        lim = Wp / 2 - notch_d * max(0.0, 1 - abs(z - notch_z) / notch_h)
        x = math.copysign(min(abs(x), lim), x)
        y = e + bulge(x, z) + wrinkle(x, z) * (0.3 + 0.7 * min(1, bulge(x, z) / 0.4 + 0.2))
        y = max(y, e)
        if side < 0:
            y = y
        return Vector((x, -y if side > 0 else y, z))

    W, H = SZ["pouch"]
    lz0 = 6.0  # label bottom (cm)

    def deco(nt, sep):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        su, sv = 10.0 / W, 10.0 / H
        return decal(nt, "pouch_label.png", uv.outputs[0], su, 0.5, sv, -lz0 * sv)

    def seal(nt, sep):
        # top heat seal band: vertical serration ridges; side seals: horizontal ridges; zip ridge.
        x, z = sep.outputs[0], sep.outputs[2]
        top = math_(nt, "GREATER_THAN", z, Hp - 1.05)
        ridge_v = math_(nt, "SINE", math_(nt, "MULTIPLY", x, 2 * math.pi / 0.11))
        side = math_(nt, "GREATER_THAN", math_(nt, "ABSOLUTE", x), Wp / 2 - seal_w)
        ridge_h = math_(nt, "SINE", math_(nt, "MULTIPLY", z, 2 * math.pi / 0.11))
        zip_ = math_(nt, "MULTIPLY", math_(nt, "GREATER_THAN", z, Hp - 2.25),
                     math_(nt, "LESS_THAN", z, Hp - 2.0))
        hv = math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", top, ridge_v), 0.6)
        hh = math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", side, ridge_h), 0.5)
        return math_(nt, "ADD", math_(nt, "ADD", hv, hh), math_(nt, "MULTIPLY", zip_, 1.5))

    foil = foil_material("pouch_foil", deco=deco, deco_mask_y=True, seal=seal, rough=0.13, crinkle=0.35)
    o = grid_solid("pouch", nu, nv, lambda i, j: pos(i, j, 1), lambda i, j: pos(i, j, -1),
                   lambda i, j: (-Wp / 2 + Wp * i / nu, Hp * j / nv), [foil], cap_bottom=True)
    return parent_all("pouch_root", [o])


def build_box():
    w, d, h = 7.0, 7.0, 11.5
    W, H = SZ["box"]
    # paper: front panel material with print + deboss
    m, nt, out = new_mat("box_front")
    tc, sep = obj_coords(nt)
    uvv = node(nt, "ShaderNodeCombineXYZ")
    link(nt, sep.outputs[0], uvv.inputs[0])
    link(nt, sep.outputs[2], uvv.inputs[1])
    su, sv = 10.0 / W, 10.0 / H
    lu = w / 2 * su - 0.5 + 0.5  # x=-w/2 -> 0
    lu = (w / 2) * su * 1.0 - (w * su - 1) / 2  # centre the patch on the face
    lu = 0.5
    col, alpha = decal(nt, "box_label.png", uvv.outputs[0], su, lu, sv, 0.0)
    hm = height_tex(nt, "box_bump.png", uvv.outputs[0], su, lu, sv, 0.0)
    paper_n = node(nt, "ShaderNodeTexNoise", Scale=60.0, Detail=8.0, Roughness=0.7)
    link(nt, tc.outputs["Object"], paper_n.inputs["Vector"])
    hsum = math_(nt, "ADD", math_(nt, "MULTIPLY", hm, 1.0), math_(nt, "MULTIPLY", paper_n.outputs["Fac"], 0.08))
    bp = node(nt, "ShaderNodeBump", Strength=0.6, Distance=0.03)
    link(nt, hsum, bp.inputs["Height"])
    paper = principled(nt, (0.86, 0.865, 0.85, 1), 0.0, 0.62, Sheen_Weight=0.15, Specular_IOR_Level=0.35)
    link(nt, bp.outputs[0], paper.inputs["Normal"])
    ink = principled(nt, INK, 0.0, 0.5)
    link(nt, col, ink.inputs["Base Color"])
    link(nt, bp.outputs[0], ink.inputs["Normal"])
    mix = node(nt, "ShaderNodeMixShader")
    link(nt, alpha, mix.inputs[0])
    link(nt, paper.outputs[0], mix.inputs[1])
    link(nt, ink.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs["Surface"])
    front_mat = m
    # plain paper for other faces, with tuck-flap crease on top
    m2, nt2, out2 = new_mat("box_paper")
    tc2, sep2 = obj_coords(nt2)
    pn = node(nt2, "ShaderNodeTexNoise", Scale=60.0, Detail=8.0, Roughness=0.7)
    link(nt2, tc2.outputs["Object"], pn.inputs["Vector"])
    y = sep2.outputs[1]
    ztop = math_(nt2, "GREATER_THAN", sep2.outputs[2], h - 0.01)
    crease = math_(nt2, "MULTIPLY", ztop, math_(nt2, "GREATER_THAN", math_(nt2, "ABSOLUTE", math_(nt2, "SUBTRACT", y, d / 2 - 0.35)), 0.03))
    seam = math_(nt2, "MULTIPLY", ztop, math_(nt2, "GREATER_THAN", math_(nt2, "ABSOLUTE", math_(nt2, "SUBTRACT", y, -d / 2 + 0.06)), 0.025))
    hh = math_(nt2, "ADD", math_(nt2, "MULTIPLY", math_(nt2, "MULTIPLY", crease, seam), 0.25),
               math_(nt2, "MULTIPLY", pn.outputs["Fac"], 0.08))
    bp2 = node(nt2, "ShaderNodeBump", Strength=0.6, Distance=0.03)
    link(nt2, hh, bp2.inputs["Height"])
    paper2 = principled(nt2, (0.86, 0.865, 0.85, 1), 0.0, 0.62, Sheen_Weight=0.15, Specular_IOR_Level=0.35)
    link(nt2, bp2.outputs[0], paper2.inputs["Normal"])
    link(nt2, paper2.outputs[0], out2.inputs["Surface"])

    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z = (v.co.z + 0.5) * h
    for f in bm.faces:
        f.material_index = 0 if f.normal.y < -0.9 else 1
    me = bpy.data.meshes.new("box")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(front_mat)
    me.materials.append(m2)
    box = link_obj(bpy.data.objects.new("box", me))
    bv = box.modifiers.new("bevel", "BEVEL")
    bv.width = 0.05
    bv.segments = 3
    bv.limit_method = "ANGLE"
    bv.harden_normals = False
    box.modifiers.new("wn", "WEIGHTED_NORMAL")
    for f in me.polygons:
        f.use_smooth = True

    # orange pull tab: strip over the top-front edge
    tab_m, _, _ = simple("tab", ORANGE, 0.0, 0.55, Sheen_Weight=0.4)
    tw, tt = 0.9, 0.025
    path = [(-d / 2 + 1.0, h + tt)] + [(-d / 2 + 0.06 - 0.06 * math.sin(a) - tt * math.sin(a) + 0.0, h - 0.06 + (0.06 + tt) * math.cos(a))
                                       for a in [k / 8 * math.pi / 2 for k in range(9)]] + [(-d / 2 - tt, h - 1.1)]
    bm = bmesh.new()
    rows = []
    for (py, pz) in path:
        rows.append([bm.verts.new((x, py, pz)) for x in (-tw / 2, tw / 2)])
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me2 = bpy.data.meshes.new("tab")
    bm.to_mesh(me2)
    bm.free()
    me2.materials.append(tab_m)
    tab = link_obj(bpy.data.objects.new("tab", me2))
    tab.location.x = 1.7
    sol = tab.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = tt
    sol.offset = -1
    for f in me2.polygons:
        f.use_smooth = True

    # sachets leaning on the front face
    sach = []
    SS = 0.85  # sachet scale relative to the 72 x 92 mm artwork
    for k, (theta, xoff, dz) in enumerate([(28.0, -2.7, 0.0), (36.0, -4.0, 0.0)]):
        s = build_sachet("sachet%d" % k)
        th = math.radians(theta)
        Hs = SZ["sachet"][1] / 10.0 * SS
        s.scale = (SS, SS, SS)
        s.rotation_euler = (math.pi / 2 - th, 0, 0)
        sach.append((s, th, xoff, Hs))
    # place: rear sachet top edge touches box face; front rests on rear one
    s0, th0, x0, Hs = sach[0]
    s0.location = (x0, -d / 2 - Hs / 2 * math.sin(th0) - 0.03, Hs / 2 * math.cos(th0) + 0.03)
    s1, th1, x1, _ = sach[1]
    z_top1 = Hs * math.cos(th1)
    d_rear_at = (Hs * math.cos(th0) - z_top1) * math.tan(th0)
    s1.location = (x1, -d / 2 - d_rear_at - 0.06 - Hs / 2 * math.sin(th1) - 0.03, Hs / 2 * math.cos(th1) + 0.03)
    return parent_all("box_root", [box, tab, s0, s1])


def build_sachet(name):
    Ws, Hs = SZ["sachet"][0] / 10.0, SZ["sachet"][1] / 10.0
    nu, nv = 72, 92
    b = 0.6
    P, e = 0.15, 0.012

    def puff(i, j):
        x = -Ws / 2 + Ws * i / nu
        y = -Hs / 2 + Hs * j / nv
        ux = max(0.0, 1 - (abs(x) / (Ws / 2 - b)) ** 4) if abs(x) < Ws / 2 - b else 0.0
        uy = max(0.0, 1 - (abs(y) / (Hs / 2 - b)) ** 4) if abs(y) < Hs / 2 - b else 0.0
        p = P * (ux * uy) ** 0.6
        w = 0.02 * noise.noise(Vector((x * 0.7, y * 0.5, 5.0))) * (ux * uy) ** 0.5
        return x, y, e + p + w

    def front(i, j):
        x, y, z = puff(i, j)
        return Vector((x, y, max(z, e)))

    def back(i, j):
        x, y, z = puff(i, j)
        return Vector((x, y, -max(e, e + (z - e) * 0.85)))

    W, H = SZ["sachet"]

    def deco(nt, sep):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        return decal(nt, "sachet_label.png", uv.outputs[0], 1.0, 0.0, 1.0, 0.0)

    def seal(nt, sep):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        hm = height_tex(nt, "sachet_bump.png", uv.outputs[0], 1.0, 0.0, 1.0, 0.0)
        return math_(nt, "MULTIPLY", hm, 0.9)

    if "sachet_foil" in bpy.data.materials:
        foil = bpy.data.materials["sachet_foil"]
    else:
        foil = foil_material("sachet_foil", deco=deco, deco_mask_z=True, seal=seal, rough=0.16, crinkle=0.05, label_soft=False)
        # print colour comes from the decal texture (ink + Safety Orange tick)
    o = grid_solid(name, nu, nv, front, back, lambda i, j: (i / nu, j / nv), [foil])
    return o


def shadow_pass(m, tint, amount=0.97):
    """Let shadow rays through glass (tinted) so contents and floor get direct light
    (refractive caustics are off). Classic product-viz cheat; glass still refracts for camera."""
    nt = m.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = node(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = tuple(c * amount for c in tint[:3]) + (1,)
    mix = node(nt, "ShaderNodeMixShader")
    link(nt, lp.outputs["Is Shadow Ray"], mix.inputs[0])
    link(nt, src, mix.inputs[1])
    link(nt, tr.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs["Surface"])
    return m


def inner_glass(name, tint):
    """Inner wall of a thick frosted vessel: a tinted see-through surface (no second refraction),
    which avoids the dark total-internal-reflection band a thick double-refracting wall gives."""
    m, nt, out = new_mat(name)
    tr = node(nt, "ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = tuple(min(1.0, c * 1.02) for c in tint[:3]) + (1,)
    gl = principled(nt, tint, 0.0, 0.05, Transmission_Weight=1.0, IOR=1.5)
    mix = node(nt, "ShaderNodeMixShader")
    mix.inputs[0].default_value = 0.15
    link(nt, tr.outputs[0], mix.inputs[1])
    link(nt, gl.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs["Surface"])
    return shadow_pass(m, tint)


def frosted_glass(name, tint, rough, ior=1.5):
    m, nt, p = simple(name, tint, 0.0, rough, Transmission_Weight=1.0, IOR=ior)
    return shadow_pass(m, tint)


def glass_with_print(name, tint, rough, img, W, H, r, z0, ink_col, u_center=0.75):
    m, nt, out = new_mat(name)
    g = principled(nt, tint, 0.0, rough, Transmission_Weight=1.0, IOR=1.5)
    uv = nt.nodes.new("ShaderNodeUVMap")
    uv.uv_map = "UVMap"
    su = 2 * math.pi * r * 10.0 / W
    sv = 10.0 / H
    col, alpha = decal(nt, img, uv.outputs[0], su, -u_center * su + 0.5, sv, -z0 * sv)
    prn = principled(nt, ink_col, 0.0, 0.5, Specular_IOR_Level=0.4)
    link(nt, col, prn.inputs["Base Color"])
    mix = node(nt, "ShaderNodeMixShader")
    link(nt, alpha, mix.inputs[0])
    link(nt, g.outputs[0], mix.inputs[1])
    link(nt, prn.outputs[0], mix.inputs[2])
    link(nt, mix.outputs[0], out.inputs["Surface"])
    return shadow_pass(m, tint)


def build_dropper():
    R, t = 1.6, 0.17
    W, H = SZ["dropper"]
    tint = (0.56, 0.68, 0.78, 1)
    outer_m = glass_with_print("drop_glass_out", tint, 0.42, "dropper_label.png", W, H, R, 1.05, CHALK)
    inner_m = inner_glass("drop_glass_in", tint)
    out = [(0, 0.06), (1.35, 0.06)] + arc(1.35, 0.30, 0.25, -90, 0, 6)[1:] + [(R, 0.30), (R, 5.9)] + \
        arc(0.9, 5.9, 0.7, 0, 90, 12)[1:-1] + [(0.62, 6.62), (0.62, 7.45), (0.55, 7.5)]
    inn = [(0.55 - t * 0.6, 7.5), (0.62 - t, 7.2), (0.62 - t, 6.7)] + arc(0.9, 5.9, 0.7 - t, 85, 0, 12)[1:] + \
        [(R - t, 0.65)] + arc(R - t - 0.2, 0.65, 0.2, 0, -90, 5)[1:] + [(0, 0.45)]
    prof = out + inn
    n_out = len(out)
    glass = lathe("drop_glass", prof, [outer_m, inner_m], slot_fn=lambda i, a, b: 0 if i < n_out - 1 else 1)
    liq_m, _, _ = simple("serum", (0.92, 0.93, 0.9, 1), 0.0, 0.05, Transmission_Weight=1.0, IOR=1.36)
    liq = lathe("serum", [(0, 0.47), (R - t - 0.2 - 0.01, 0.47)] + arc(R - t - 0.21, 0.66, 0.19, -90, 0, 5)[1:] +
                [(R - t - 0.01, 4.6), (0, 4.6)], [shadow_pass(liq_m, (0.95, 0.95, 0.95))])
    black, _, _ = simple("collar", (0.018, 0.019, 0.02, 1), 0.0, 0.38, Specular_IOR_Level=0.5)
    # ribbed collar via bump
    cm, cnt, cout = new_mat("collar_rib")
    tc, sep = obj_coords(cnt)
    at = math_(cnt, "ARCTAN2", sep.outputs[1], sep.outputs[0])
    rib = math_(cnt, "SINE", math_(cnt, "MULTIPLY", at, 96.0))
    band = math_(cnt, "MULTIPLY", math_(cnt, "GREATER_THAN", sep.outputs[2], 7.35), math_(cnt, "LESS_THAN", sep.outputs[2], 8.45))
    bpn = node(cnt, "ShaderNodeBump", Strength=0.35, Distance=0.01)
    link(cnt, math_(cnt, "MULTIPLY", rib, band), bpn.inputs["Height"])
    cp = principled(cnt, (0.018, 0.019, 0.02, 1), 0.0, 0.36, Specular_IOR_Level=0.5)
    link(cnt, bpn.outputs[0], cp.inputs["Normal"])
    link(cnt, cp.outputs[0], cout.inputs["Surface"])
    collar = lathe("collar", [(0.56, 7.22), (0.98, 7.22)] + arc(0.98, 7.28, 0.06, -90, 0, 3)[1:] + [(1.04, 8.48)] +
                   arc(0.98, 8.48, 0.06, 0, 90, 3)[1:] + [(0.66, 8.54), (0.66, 8.60), (0.52, 8.60), (0.52, 7.22)], [cm])
    rub, _, _ = simple("bulb", (0.012, 0.012, 0.013, 1), 0.0, 0.55, Sheen_Weight=0.25, Specular_IOR_Level=0.35)
    bulb = lathe("bulb", [(0, 8.58), (0.80, 8.58)] + arc(0.80, 8.66, 0.08, -90, 0, 3)[1:] + [(0.88, 8.80), (0.74, 8.92),
                 (0.72, 9.4), (0.74, 10.2)] + arc(0.0, 10.2, 0.74, 0, 90, 14)[1:], [rub])
    pip_m, _, _ = simple("pipette", (0.95, 0.96, 0.97, 1), 0.0, 0.03, Transmission_Weight=1.0, IOR=1.47)
    pip = lathe("pipette", [(0, 1.2), (0.12, 1.2), (0.32, 1.9), (0.32, 7.3), (0, 7.3)], [shadow_pass(pip_m, (0.97, 0.97, 0.97))], segs=48)
    return parent_all("dropper_root", [glass, liq, collar, bulb, pip])


def build_jar():
    R = 3.3
    W, H = SZ["jar"]
    tint = (0.96, 0.97, 0.975, 1)
    outer_m = glass_with_print("jar_glass_out", tint, 0.26, "jar_label.png", W, H, R, 0.85, INK)
    inner_m = inner_glass("jar_glass_in", tint)
    out = [(0, 0.05), (2.9, 0.05)] + arc(2.9, 0.45, 0.4, -90, 0, 8)[1:] + [(R, 3.95)] + arc(3.0, 3.95, 0.3, 0, 90, 6)[1:] + \
        [(2.95, 4.25), (2.95, 4.85)] + arc(2.82, 4.85, 0.13, 0, 90, 4)[1:]
    inn = [(2.62, 4.98)] + arc(2.62, 4.85, 0.13, 90, 180, 4)[1:] + [(2.49, 1.25)] + arc(2.19, 1.25, 0.3, 0, -90, 5)[1:] + [(0, 0.95)]
    prof = out + inn
    n_out = len(out)
    glass = lathe("jar_glass", prof, [outer_m, inner_m], slot_fn=lambda i, a, b: 0 if i < n_out - 1 else 1)
    cream_m, _, _ = simple("cream", (0.98, 0.98, 0.965, 1), 0.0, 0.35, Subsurface_Weight=0.25, Subsurface_Scale=0.1)
    cream = lathe("cream", [(0, 0.96), (2.18, 0.96)] + arc(2.19, 1.26, 0.29, -90, 0, 5)[1:] + [(2.48, 3.9),
                  (1.5, 4.02), (0.4, 4.1), (0, 4.12)], [cream_m])
    lid_side = aluminium("jar_lid_side", "vertical", rough=0.25, aniso=0.6, bump=0.18, rot=0.0)
    lid_top = aluminium("jar_lid_top", "spun", rough=0.22, aniso=0.85, bump=0.12)
    lid = lathe("jar_lid", [(3.0, 5.4), (3.0, 4.32)] + arc(3.08, 4.32, 0.08, 180, 270, 3)[1:] + arc(3.08, 4.36, 0.04, -90, 0, 3)[1:] +
                [(3.37, 4.36)] + arc(3.27, 4.4, 0.1, -60, 0, 3)[1:] + [(3.37, 5.90)] + arc(3.25, 5.9, 0.12, 0, 90, 8)[1:] +
                [(1.5, 6.015), (0, 6.02)], [lid_side, lid_top], slot_fn=lambda i, a, b: 1 if (a[1] > 5.98 and b[1] > 5.98) else 0)
    inner, _, _ = simple("lid_inner", (0.2, 0.2, 0.2, 1), 0.0, 0.5)
    lid_in = lathe("jar_lid_in", [(0, 5.4), (3.0, 5.4)], [inner])
    return parent_all("jar_root", [glass, cream, lid, lid_in])


BUILDERS = {"tin": build_tin, "pouch": build_pouch, "box": build_box, "dropper": build_dropper, "jar": build_jar}
# hero yaw (deg, + = CCW from above) per pack
YAW = {"tin": -14, "pouch": -22, "box": -30, "dropper": -12, "jar": -12}


# ============================================================ studio
def area(name, loc, size, size_y, power, color=(1, 1, 1), target=(0, 0, 4), spread=None, shadow=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size = size
    ld.size_y = size_y
    ld.energy = power
    ld.color = color
    if spread is not None:
        ld.spread = math.radians(spread)
    ld.use_shadow = shadow
    o = link_obj(bpy.data.objects.new(name, ld))
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = False
    return o


def studio(hz, receivers=None):
    """Soft cool studio scaled to the object's height hz (cm).
    Camera looks along +Y from -Y. Big diffused key front-left, cool fill front-right,
    two tall strip boxes at the sides for vertical bands on metal/glass, a low back
    scrim that the flat lids reflect, and an overhead scrim."""
    k = hz / 9.0
    tgt = (0, 0, hz * 0.5)
    area("key", (-40 * k, -34 * k, 34 * k), 30 * k, 45 * k, 1600 * k * k, (0.98, 0.99, 1.0), tgt, 60)
    area("fill", (46 * k, -30 * k, 12 * k), 60 * k, 60 * k, 150 * k * k, (0.80, 0.88, 1.0), tgt, 80, shadow=False)
    area("stripL", (-30 * k, -10 * k, 14 * k), 7 * k, 60 * k, 900 * k * k, (0.95, 0.97, 1.0), (0, 0, hz * 0.45), 40, shadow=False)
    area("stripR", (31 * k, 8 * k, 14 * k), 7 * k, 60 * k, 750 * k * k, (0.88, 0.94, 1.0), (0, 0, hz * 0.45), 40, shadow=False)
    area("back", (0, 46 * k, 16 * k), 70 * k, 30 * k, 900 * k * k, (0.92, 0.96, 1.0), (0, 0, hz), 70, shadow=False)
    area("top", (0, -6 * k, 58 * k), 50 * k, 40 * k, 700 * k * k, (0.95, 0.97, 1.0), tgt, 70)
    # shadowless shaping lights light only the product (light linking), so they do not
    # wash out the contact shadow on the shadow catcher
    if receivers is not None:
        for n in ("fill", "stripL", "stripR", "back"):
            bpy.data.objects[n].light_linking.receiver_collection = receivers
    # world: dim misty gradient, darker towards the floor, for contrast in reflections
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
    ramp.color_ramp.elements[0].position = 0.30
    ramp.color_ramp.elements[0].color = (0.10, 0.115, 0.13, 1)
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[1].color = (0.62, 0.68, 0.74, 1)
    mp = nt.nodes.new("ShaderNodeMapRange")
    mp.inputs["From Min"].default_value = -1
    mp.inputs["From Max"].default_value = 1
    nt.links.new(sep.outputs[2], mp.inputs["Value"])
    nt.links.new(mp.outputs[0], ramp.inputs[0])
    nt.links.new(ramp.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = 0.45
    nt.links.new(bg.outputs[0], out.inputs["Surface"])


def shadow_catcher():
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0))
    p = bpy.context.active_object
    p.name = "catcher"
    p.is_shadow_catcher = True
    m, _, _ = simple("floor", (0.80, 0.81, 0.79, 1), 0.0, 0.6)
    p.data.materials.append(m)
    return p


def bbox_world(root):
    pts = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in root.children_recursive:
        if o.type != "MESH":
            continue
        oe = o.evaluated_get(dg)
        for c in oe.bound_box:
            pts.append(oe.matrix_world @ Vector(c))
    return pts


def envelope_points(root, bands=24, segs=48):
    dg = bpy.context.evaluated_depsgraph_get()
    vs = []
    for o in root.children_recursive:
        if o.type != "MESH":
            continue
        oe = o.evaluated_get(dg)
        mw = oe.matrix_world
        vs += [mw @ v.co for v in oe.data.vertices]
    z0, z1 = min(v.z for v in vs), max(v.z for v in vs)
    rmax = [0.0] * bands
    for v in vs:
        b = min(bands - 1, int((v.z - z0) / (z1 - z0 + 1e-9) * bands))
        rmax[b] = max(rmax[b], math.hypot(v.x, v.y))
    pts = []
    for b in range(bands):
        if rmax[b] <= 0:
            continue
        for zz in (z0 + (z1 - z0) * b / bands, z0 + (z1 - z0) * (b + 1) / bands):
            for i in range(segs):
                a = i / segs * math.tau
                pts.append(Vector((rmax[b] * math.cos(a), rmax[b] * math.sin(a), zz)))
    return pts


def frame_camera(root, res, yaw, elev=13.0, lens=95.0, fill_h=0.66, fill_w=0.70, union=True):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "VERTICAL"
    cd.sensor_height = 24.0 * 1.25
    cam = link_obj(bpy.data.objects.new("cam", cd))
    sc.camera = cam
    # rotation-invariant envelope: per height band, the max radius of any vertex from the
    # turntable axis, swept as circles. Hero and turntable use the very same camera.
    root.rotation_euler.z = math.radians(yaw)
    bpy.context.view_layer.update()
    pts = envelope_points(root)
    zmax = max(p.z for p in pts)
    tgt = Vector((0, 0, zmax * 0.48))
    el = math.radians(elev)
    dirv = Vector((0, -math.cos(el), math.sin(el)))
    dist = zmax * 4.5
    for _ in range(8):
        cam.location = tgt + dirv * dist
        cam.rotation_euler = (-dirv).to_track_quat("-Z", "Y").to_euler()
        cd.shift_x = cd.shift_y = 0
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(sc, cam, p) for p in pts]
        xs, ys = [u.x for u in uv], [u.y for u in uv]
        sw, sh = max(xs) - min(xs), max(ys) - min(ys)
        ratio = max(sh / fill_h, sw / fill_w)
        dist *= ratio
    cam.location = tgt + dirv * dist
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(sc, cam, p) for p in pts]
    ys = [u.y for u in uv]
    xs = [u.x for u in uv]
    # centre: object slightly below middle leaves headroom like a product shot
    cy = (max(ys) + min(ys)) / 2
    cx = (max(xs) + min(xs)) / 2
    aspect = res[0] / res[1]
    cd.shift_y = cy - 0.5
    cd.shift_x = (cx - 0.5) * aspect
    return cam, zmax


def setup_scene(pack):
    reset()
    root = BUILDERS[pack]()
    # put the turntable axis at the centre of the footprint (matters for box + sachets)
    bpy.context.view_layer.update()
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
    root.rotation_euler.z = math.radians(YAW[pack])
    bpy.context.view_layer.update()
    pts = bbox_world(root)
    hz = max(p.z for p in pts)
    coll = bpy.data.collections.new("product")
    for o in root.children_recursive:
        if o.type == "MESH":
            coll.objects.link(o)
    studio(hz, coll)
    shadow_catcher()
    return root


def render_to(path, mask=True):
    """Render, then (cheaply) an object-only coverage mask next to it as *_mask.png:
    catcher hidden, no bounces, 4 samples. finalize.py uses it to keep the object's alpha
    intact while fading/cleaning the shadow-catcher alpha."""
    sc = bpy.context.scene
    sc.render.filepath = path
    t = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t
    if mask:
        cy = sc.cycles
        keep = (cy.samples, cy.use_denoising, cy.max_bounces, cy.use_adaptive_sampling)
        cat = bpy.data.objects["catcher"]
        cat.hide_render = True
        cy.samples, cy.use_denoising, cy.max_bounces, cy.use_adaptive_sampling = 6, False, 0, False
        sc.render.filepath = path[:-4] + "_mask.png"
        bpy.ops.render.render(write_still=True)
        cy.samples, cy.use_denoising, cy.max_bounces, cy.use_adaptive_sampling = keep
        cat.hide_render = False
    return dt


def main():
    global SZ
    ap = argparse.ArgumentParser()
    ap.add_argument("--packs", default="tin,pouch,box,dropper,jar")
    ap.add_argument("--modes", default="hero,turn")
    ap.add_argument("--raw", default="/tmp/pr6raw")
    ap.add_argument("--samples", type=int, default=160)
    ap.add_argument("--tt-samples", type=int, default=40)
    ap.add_argument("--scale", type=float, default=1.0, help="resolution scale for tests")
    ap.add_argument("--frames", default="", help="turntable frame subset, e.g. 0,6,12")
    ap.add_argument("--blend", action="store_true", help="also save the .blend")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    SZ = labels.build()
    os.makedirs(a.raw, exist_ok=True)
    log_path = os.path.join(a.raw, "times.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else {}
    for pack in a.packs.split(","):
        root = setup_scene(pack)
        sc = bpy.context.scene
        if a.blend:
            bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.raw, pack + ".blend"))
        if "hero" in a.modes:
            res = (int(1600 * a.scale), int(2000 * a.scale))
            frame_camera(root, res, YAW[pack])
            sc.cycles.samples = a.samples
            dt = render_to(os.path.join(a.raw, "%s_hero.png" % pack))
            log["%s_hero" % pack] = round(dt, 1)
            print("RENDERED %s hero %.1fs" % (pack, dt), flush=True)
            json.dump(log, open(log_path, "w"), indent=1)
        if "turn" in a.modes:
            if sc.camera:
                bpy.data.objects.remove(sc.camera)
            res = (int(800 * a.scale), int(1000 * a.scale))
            frame_camera(root, res, YAW[pack])
            sc.cycles.samples = a.tt_samples
            os.makedirs(os.path.join(a.raw, "turntable"), exist_ok=True)
            frames = [int(f) for f in a.frames.split(",")] if a.frames else range(24)
            t0 = time.time()
            for f in frames:
                root.rotation_euler.z = math.radians(YAW[pack] + f * 15)
                render_to(os.path.join(a.raw, "turntable", "%s_%02d.png" % (pack, f)))
            dt = time.time() - t0
            log["%s_turntable" % pack] = round(dt, 1)
            print("RENDERED %s turntable %.1fs" % (pack, dt), flush=True)
            json.dump(log, open(log_path, "w"), indent=1)


if __name__ == "__main__":
    main()
