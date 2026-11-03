"""PR6 v12 pack models (Blender 5.2, Cycles). Rebuilt from ../../v11/blender/build_packs.py.

What changed from v11 (critique fix 7):
  * tin: kit-slide-11 proportions (100 x 72 mm), turned body, rolled lid skirt, a real stamped
    PR6 on the spun lid (displaced geometry on an all-quad disc, not a bump map);
  * print is part of each surface's shader, mapped by the mesh UVs and riding on the same
    micro-relief as the substrate (ink on brushed metal keeps the brushing), never a sticker;
  * pouch: printed film over the whole front (no white panel), heat-seal crimp, tear notch;
  * box: debossed sachet outline, orange pull tab, sachets lying on the floor as in slide 11;
  * the invisible ink is an emission term in each pack's printed material, and that printed object
    (which has no other emission) is put in the `ink` light group, so the ink is exactly zero in
    every other light group's pass while the printed surface still takes all the lights.
Units: 1 BU = 1 cm.
"""
import math
import os

import bpy  # noqa: I001
import bmesh
import numpy as np
from mathutils import Vector, noise

import vlabels as labels

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = labels.TEX


def srgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (a,)


INK = srgb("171C1F")
CHALK = srgb("F2F3EF")
ORANGE = srgb("E98546")
STEEL = srgb("718B9A")
MIST = srgb("CAD5DA")
INK_GLOW = (0.50, 0.72, 1.0)  # cold steel-blue fluorescence (linear)


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


def obj_sep(nt):
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    link(nt, tc.outputs["Object"], sep.inputs[0])
    return tc, sep


def image(nt, name, vec, colorspace="sRGB", ext="CLIP"):
    img = bpy.data.images.load(os.path.join(TEX, name), check_existing=True)
    img.colorspace_settings.name = colorspace
    it = nt.nodes.new("ShaderNodeTexImage")
    it.image = img
    it.extension = ext
    it.interpolation = "Cubic"
    link(nt, vec, it.inputs[0])
    return it


def simple(name, base, metal=0.0, rough=0.4, **extra):
    m, nt, out = new_mat(name)
    p = principled(nt, base, metal, rough, **extra)
    link(nt, p.outputs[0], out.inputs["Surface"])
    return m, nt, p


# ------------------------------------------------------------ print mappings
# A mapping is a function (nt) -> vector socket in label-image space (0..1).
def map_cylinder(r_cm, w_mm, h_mm, z0_cm, u_center=0.75):
    """Lathe UV (u = angle / 2pi, v = z in cm) -> label image. u_center 0.75 = facing -Y."""
    circ = 2 * math.pi * r_cm * 10.0

    def f(nt):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        sp = nt.nodes.new("ShaderNodeSeparateXYZ")
        link(nt, uv.outputs[0], sp.inputs[0])
        u = math_(nt, "MULTIPLY_ADD", math_(nt, "SUBTRACT", sp.outputs[0], u_center), circ / w_mm, 0.5)
        v = math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", sp.outputs[1], z0_cm), 10.0 / h_mm)
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, u, cmb.inputs[0])
        link(nt, v, cmb.inputs[1])
        return cmb.outputs[0]
    return f


def map_uv_rect(x0, x1, z0, z1):
    """Planar UV (u = x cm, v = z cm) -> label image covering [x0,x1] x [z0,z1]."""
    def f(nt):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        sp = nt.nodes.new("ShaderNodeSeparateXYZ")
        link(nt, uv.outputs[0], sp.inputs[0])
        u = math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", sp.outputs[0], x0), 1.0 / (x1 - x0))
        v = math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", sp.outputs[1], z0), 1.0 / (z1 - z0))
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, u, cmb.inputs[0])
        link(nt, v, cmb.inputs[1])
        return cmb.outputs[0]
    return f


def map_uv_unit():
    def f(nt):
        uv = nt.nodes.new("ShaderNodeUVMap")
        uv.uv_map = "UVMap"
        return uv.outputs[0]
    return f


def map_obj_xz(x0, x1, z0, z1, front_y=None):
    """Object-space planar mapping (for the box front)."""
    def f(nt):
        tc, sep = obj_sep(nt)
        u = math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", sep.outputs[0], x0), 1.0 / (x1 - x0))
        v = math_(nt, "MULTIPLY", math_(nt, "SUBTRACT", sep.outputs[2], z0), 1.0 / (z1 - z0))
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, u, cmb.inputs[0])
        link(nt, v, cmb.inputs[1])
        return cmb.outputs[0]
    return f


# ------------------------------------------------------------ micro relief
def grooves(nt, sep, mode, freq=1100.0):
    """Brushing as a height signal. spun: concentric rings (varies with radius);
    turned: circumferential rings on a cylinder (varies with z); linear: along x."""
    if mode == "spun":
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, sep.outputs[0], cmb.inputs[0])
        link(nt, sep.outputs[1], cmb.inputs[1])
        ln = node(nt, "ShaderNodeVectorMath", _operation="LENGTH")
        link(nt, cmb.outputs[0], ln.inputs[0])
        w = ln.outputs["Value"]
    elif mode == "turned":
        w = sep.outputs[2]
    else:
        w = sep.outputs[1]
    n1 = node(nt, "ShaderNodeTexNoise", _noise_dimensions="1D", Scale=freq, Detail=8.0, Roughness=0.7)
    link(nt, w, n1.inputs["W"])
    n2 = node(nt, "ShaderNodeTexNoise", _noise_dimensions="1D", Scale=freq * 0.06, Detail=3.0)
    link(nt, w, n2.inputs["W"])
    # sparse deeper scratches that break the regularity
    n3 = node(nt, "ShaderNodeTexNoise", _noise_dimensions="1D", Scale=freq * 0.31, Detail=1.0)
    link(nt, w, n3.inputs["W"])
    scr = math_(nt, "POWER", math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", n3.outputs["Fac"], 0.5)), 3.0)
    h = math_(nt, "ADD", math_(nt, "MULTIPLY_ADD", n1.outputs["Fac"], 0.7, math_(nt, "MULTIPLY", n2.outputs["Fac"], 0.3)),
              math_(nt, "MULTIPLY", scr, -2.0))
    return h, n2.outputs["Fac"]


def smudge(nt, tc, scale=2.5):
    """Low-frequency handling variation for roughness (fingerprints are not a thing here)."""
    n = node(nt, "ShaderNodeTexNoise", Scale=scale, Detail=4.0, Roughness=0.55)
    link(nt, tc.outputs["Object"], n.inputs["Vector"])
    return n.outputs["Fac"]


def with_print(nt, base_shader, normal, mapping, print_img, rough=0.38, spec=0.5, metal_under=False):
    """Mix a print layer over base_shader. The print takes the substrate's normal (ink follows
    the brushing) plus a whisker of film thickness at its edges."""
    vec = mapping(nt)
    it = image(nt, print_img, vec)
    alpha = it.outputs["Alpha"]
    pr = principled(nt, INK, 0.0, rough, Specular_IOR_Level=spec)
    link(nt, it.outputs["Color"], pr.inputs["Base Color"])
    bp = node(nt, "ShaderNodeBump", Strength=0.25, Distance=0.0008)
    link(nt, alpha, bp.inputs["Height"])
    if normal is not None:
        link(nt, normal, bp.inputs["Normal"])
    link(nt, bp.outputs[0], pr.inputs["Normal"])
    mix = node(nt, "ShaderNodeMixShader")
    link(nt, alpha, mix.inputs[0])
    link(nt, base_shader, mix.inputs[1])
    link(nt, pr.outputs[0], mix.inputs[2])
    return mix.outputs[0]


def aluminium(name, mode, base=(0.86, 0.87, 0.88, 1), rough=0.24, aniso=0.75, groove=0.22,
              mapping=None, print_img=None, tangent_axis="Z"):
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    p = principled(nt, base, 1.0, rough, Anisotropic=aniso)
    h, streak = grooves(nt, sep, mode)
    sm = smudge(nt, tc)
    r = math_(nt, "ADD", math_(nt, "MULTIPLY_ADD", streak, 0.08, rough - 0.04), math_(nt, "MULTIPLY", sm, 0.05))
    link(nt, r, p.inputs["Roughness"])
    t = node(nt, "ShaderNodeTangent", _direction_type="RADIAL", _axis=tangent_axis)
    link(nt, t.outputs[0], p.inputs["Tangent"])
    # turned body: grooves run around the axis -> tangent is circumferential (rotation 0)
    # spun lid: grooves are concentric -> same circumferential tangent
    bpn = node(nt, "ShaderNodeBump", Strength=groove, Distance=0.0015)
    link(nt, h, bpn.inputs["Height"])
    link(nt, bpn.outputs[0], p.inputs["Normal"])
    shader = p.outputs[0]
    if print_img:
        shader = with_print(nt, shader, bpn.outputs[0], mapping, print_img, rough=0.36, spec=0.5)
    link(nt, shader, out.inputs["Surface"])
    return m


def add_ink(mat, mapping, ink_img, strength=2.4, color=INK_GLOW):
    """Add the invisible ink to a printed material as an emission term. The object carrying it is
    put in the `ink` light group (it has no other emission), so the ink is exactly zero in every
    other group's pass and the printed surface underneath still reacts to all lights."""
    nt = mat.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    vec = mapping(nt)
    it = image(nt, ink_img, vec, colorspace="Non-Color")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    gr = node(nt, "ShaderNodeTexNoise", Scale=900.0, Detail=2.0)  # ink take-up on the substrate
    link(nt, tc.outputs["Object"], gr.inputs["Vector"])
    dens = math_(nt, "MULTIPLY_ADD", gr.outputs["Fac"], 0.35, 0.82)
    em = node(nt, "ShaderNodeEmission")
    em.inputs["Color"].default_value = color + (1,)
    link(nt, math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", it.outputs["Color"], dens), strength), em.inputs["Strength"])
    ad = node(nt, "ShaderNodeAddShader")
    link(nt, src, ad.inputs[0])
    link(nt, em.outputs[0], ad.inputs[1])
    link(nt, ad.outputs[0], out.inputs["Surface"])
    mat.cycles.emission_sampling = "NONE"  # glow is seen, not sampled as a light
    return mat


def inked(obj):
    obj.lightgroup = "ink"
    return obj


# ============================================================ geometry helpers
def link_obj(o):
    bpy.context.scene.collection.objects.link(o)
    return o


def arc(cx, cz, r, a0, a1, n=8):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
             cz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def lathe(name, prof, mats, slot_fn=None, segs=256, smooth=True):
    """Revolve profile [(r,z)] around Z. UV: u = angle/2pi, v = z (cm)."""
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
    return link_obj(bpy.data.objects.new(name, me))


def grid_solid(name, nu, nv, pos_front, pos_back, uv_fn, mats, cap_bottom=None):
    """Closed thin shell from two grids (front/back) joined at the rim (v11)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    F = [[bm.verts.new(pos_front(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]
    B = [[bm.verts.new(pos_back(i, j)) for j in range(nv + 1)] for i in range(nu + 1)]

    def quad(vs, uvs, slot=0):
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
                 (uv_fn(i, j), uv_fn(i + 1, j), uv_fn(i + 1, j + 1), uv_fn(i, j + 1)))
            quad((B[i][j], B[i][j + 1], B[i + 1][j + 1], B[i + 1][j]),
                 (uv_fn(i, j), uv_fn(i, j + 1), uv_fn(i + 1, j + 1), uv_fn(i + 1, j)))
    rim = [(i, 0) for i in range(nu)] + [(nu, j) for j in range(nv)] + \
          [(i, nv) for i in range(nu, 0, -1)] + [(0, j) for j in range(nv, 0, -1)]
    for k in range(len(rim)):
        a, b = rim[k], rim[(k + 1) % len(rim)]
        if cap_bottom and a[1] == 0 and b[1] == 0:
            continue
        quad((F[a[0]][a[1]], B[a[0]][a[1]], B[b[0]][b[1]], F[b[0]][b[1]]), ((-99, -99),) * 4)
    if cap_bottom:
        ring = [F[i][0] for i in range(nu + 1)] + [B[i][0] for i in range(nu, -1, -1)]
        c = Vector((0, 0, 0))
        for v in ring:
            c += v.co
        cv = bm.verts.new(c / len(ring))
        for k in range(len(ring)):
            a, b = ring[k], ring[(k + 1) % len(ring)]
            if a is b:
                continue
            try:
                f = bm.faces.new((cv, b, a))
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


def emboss_disc(name, r, z, n, height_img, depth, mats):
    """All-quad disc (square grid squashed into a circle), displaced by a height map in mm.
    The map covers labels.LID_D mm centred on the axis; letters face -Y (towards the front)."""
    from PIL import Image
    hm = np.asarray(Image.open(os.path.join(TEX, height_img)).convert("L"), dtype=np.float32) / 255.0
    H, W = hm.shape
    size_cm = labels.LID_D / 10.0
    a = np.linspace(-1, 1, n + 1)
    A, B = np.meshgrid(a, a, indexing="ij")
    X = A * np.sqrt(np.maximum(0, 1 - B * B / 2)) * r
    Y = B * np.sqrt(np.maximum(0, 1 - A * A / 2)) * r
    # image: column = +x, row 0 = far edge (+y), so the text reads from the front (-y)
    px = (X / size_cm + 0.5) * (W - 1)
    py = (0.5 - Y / size_cm) * (H - 1)
    x0 = np.clip(np.floor(px).astype(int), 0, W - 2)
    y0 = np.clip(np.floor(py).astype(int), 0, H - 2)
    fx, fy = np.clip(px - x0, 0, 1), np.clip(py - y0, 0, 1)
    v = (hm[y0, x0] * (1 - fx) * (1 - fy) + hm[y0, x0 + 1] * fx * (1 - fy) +
         hm[y0 + 1, x0] * (1 - fx) * fy + hm[y0 + 1, x0 + 1] * fx * fy)
    inside = (np.abs(X) < size_cm / 2) & (np.abs(Y) < size_cm / 2)
    Z = z + np.where(inside, v, 0.0) * depth
    verts = np.stack([X, Y, Z], -1).reshape(-1, 3)
    idx = np.arange((n + 1) * (n + 1)).reshape(n + 1, n + 1)
    quads = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.astype(np.float32).ravel())
    me.loops.add(quads.size)
    me.loops.foreach_set("vertex_index", quads.astype(np.int32).ravel())
    me.polygons.add(len(quads))
    me.polygons.foreach_set("loop_start", (np.arange(len(quads)) * 4).astype(np.int32))
    me.update(calc_edges=True)
    me.validate()
    me.shade_smooth()
    uvl = me.uv_layers.new(name="UVMap")
    uvs = np.stack([X / (2 * r) + 0.5, Y / (2 * r) + 0.5], -1).reshape(-1, 2)[quads.ravel()]
    uvl.data.foreach_set("uv", uvs.astype(np.float32).ravel())
    for mt in mats:
        me.materials.append(mt)
    return link_obj(bpy.data.objects.new(name, me))


# ============================================================ colourways
TIN_FINISH = {
    "natural": dict(base=(0.86, 0.87, 0.88, 1), rough=0.22, print="ink"),
    "mist": dict(base=srgb("9FB0BA"), rough=0.26, print="ink"),        # pale anodised
    "steel": dict(base=srgb("5E7888"), rough=0.27, print="chalk"),     # steel-blue anodised
    "ink": dict(base=(0.030, 0.034, 0.038, 1), rough=0.30, print="chalk"),  # near-black anodised
}
POUCH_FINISH = {
    "foil": dict(base=(0.88, 0.89, 0.90, 1), metal=1.0, rough=0.34, print="ink"),
    "chalk": dict(base=srgb("ECEDE8"), metal=0.0, rough=0.55, print="ink"),
    "mist": dict(base=srgb("B9C6CD"), metal=0.0, rough=0.5, print="ink"),
}


# ============================================================ packs
def build_tin(pid, key, finish="natural", emboss_n=760, short=False):
    """Kit slide 11 tin: 100 mm across, 72 mm tall, lid about a third of the height."""
    R = 5.0
    fin = TIN_FINISH[finish]
    fg = labels.CHALK if fin["print"] == "chalk" else labels.INK
    W, H = labels.tin(pid, key, fg=fg, short=short)
    mp = map_cylinder(R, W, H, 0.0)
    body_m = aluminium(key + "_body", "turned", base=fin["base"], rough=fin["rough"], aniso=0.7,
                       mapping=mp, print_img=key + "_print.png")
    lid_side_m = aluminium(key + "_lidside", "turned", base=fin["base"], rough=fin["rough"], aniso=0.7)
    lid_top_m = aluminium(key + "_lidtop", "spun", base=fin["base"], rough=fin["rough"] + 0.15, aniso=0.6, groove=0.16)
    inner_m, _, _ = simple(key + "_inner", (0.45, 0.46, 0.47, 1), 1.0, 0.35)
    body_prof = [(0, 0.04), (4.80, 0.04)] + arc(4.80, 0.24, 0.20, -90, 0, 8)[1:] + \
        [(R, 4.96), (4.95, 5.02), (4.93, 5.06), (4.93, 6.95), (4.80, 6.95), (0, 6.95)]
    body = lathe(key + "_tinbody", body_prof, [body_m, inner_m],
                 slot_fn=lambda i, a, b: 1 if (a[1] > 5.0 and b[1] > 5.0) else 0)
    # lid: rolled bottom edge, straight skirt, generous rounded shoulder, flat spun top
    Rl, zt = 5.07, 7.20
    lid_prof = [(4.96, 5.30), (4.96, 5.04)] + arc(5.015, 5.04, 0.055, 180, 360, 8)[1:] + \
        [(Rl, 5.05), (Rl, zt - 0.22)] + arc(Rl - 0.22, zt - 0.22, 0.22, 0, 90, 14)[1:] + [(4.70, zt - 0.0004)]
    lid = lathe(key + "_lid", lid_prof, [lid_side_m, lid_top_m],
                slot_fn=lambda i, a, b: 1 if (a[1] > zt - 0.05 and b[1] > zt - 0.05) else 0)
    lid_in = lathe(key + "_lidin", [(0, 5.30), (4.96, 5.30)], [inner_m])
    top = emboss_disc(key + "_lidtop", Rl - 0.215, zt, emboss_n, "lid_emboss.png", 0.05, [lid_top_m])
    add_ink(body_m, mp, key + "_ink.png")
    inked(body)
    return parent_all(key, [body, lid, lid_in, top])


def pouch_material(name, fin, mapping, print_img, seal_fn, crinkle):
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    p = principled(nt, fin["base"], fin["metal"], fin["rough"], Anisotropic=0.35 if fin["metal"] else 0.0)
    vor = node(nt, "ShaderNodeTexVoronoi", Scale=2.4, _feature="F2")
    link(nt, tc.outputs["Object"], vor.inputs["Vector"])
    nz = node(nt, "ShaderNodeTexNoise", Scale=1.6, Detail=5.0, Roughness=0.6)
    link(nt, tc.outputs["Object"], nz.inputs["Vector"])
    fine = node(nt, "ShaderNodeTexNoise", Scale=40.0, Detail=4.0)
    link(nt, tc.outputs["Object"], fine.inputs["Vector"])
    h = math_(nt, "MULTIPLY_ADD", vor.outputs["Distance"], 0.6 * crinkle, math_(nt, "MULTIPLY", nz.outputs["Fac"], 0.4 * crinkle))
    h = math_(nt, "ADD", h, math_(nt, "MULTIPLY", fine.outputs["Fac"], 0.02))
    if seal_fn:
        h = math_(nt, "ADD", h, seal_fn(nt, sep))
    sm = smudge(nt, tc, 1.5)
    link(nt, math_(nt, "MULTIPLY_ADD", sm, 0.08, fin["rough"] - 0.03), p.inputs["Roughness"])
    bpn = node(nt, "ShaderNodeBump", Strength=0.3, Distance=0.02)
    link(nt, h, bpn.inputs["Height"])
    link(nt, bpn.outputs[0], p.inputs["Normal"])
    shader = with_print(nt, p.outputs[0], bpn.outputs[0], mapping, print_img, rough=0.42, spec=0.5)
    link(nt, shader, out.inputs["Surface"])
    return m


def build_pouch(pid, key, finish="foil", short=False):
    Wp, Hp = 13.0, 19.0
    seal_w, top_seal = 0.55, 2.7
    D, e = 1.9, 0.025
    nu, nv = 120, 180
    zs = Hp - top_seal
    notch_z, notch_d, notch_h = Hp - 1.35, 0.42, 0.26
    fin = POUCH_FINISH[finish]
    W, H = labels.pouch(pid, key, fg=labels.INK, short=short)

    def bulge(x, z):
        u = abs(x) / (Wp / 2 - seal_w)
        if u >= 1 or z >= zs:
            return 0.0
        s = z / zs
        f = (1 - s ** 1.7) ** 0.75 * (1.0 - 0.12 * math.exp(-(s / 0.08) ** 2))
        g = (1 - u ** 2.6) ** 0.62
        return D * f * g

    def wrinkle(x, z):
        b = bulge(x, z)
        w = 0.10 * noise.noise(Vector((x * 0.9, z * 0.18, 3.1)))
        w += 0.03 * noise.noise(Vector((x * 2.7, z * 1.1, 7.7)))
        w += 0.010 * noise.noise(Vector((x * 7.0, z * 5.0, 1.3)))
        fold = 0.6 + 0.4 * min(1.0, (1 - b / D) * 1.3)
        rn = 1.0 - abs(noise.noise(Vector((x * 0.55, z * 0.28, 11.0))))
        rn2 = 1.0 - abs(noise.noise(Vector((x * 1.4, z * 0.6, 4.0))))
        lowside = 0.5 + 0.5 * max(math.exp(-z / 3.0), (abs(x) / (Wp / 2)) ** 3)
        w += (0.06 * rn ** 6 + 0.02 * rn2 ** 5) * lowside
        return w * fold * (1.0 if z < zs else 0.25)

    def pos(i, j, side):
        x = -Wp / 2 + Wp * i / nu
        z = Hp * j / nv
        lim = Wp / 2 - notch_d * max(0.0, 1 - abs(z - notch_z) / notch_h)
        x = math.copysign(min(abs(x), lim), x)
        y = e + bulge(x, z) + wrinkle(x, z) * (0.3 + 0.7 * min(1, bulge(x, z) / 0.4 + 0.2))
        y = max(y, e)
        return Vector((x, -y if side > 0 else y, z))

    def seal(nt, sep):
        x, z = sep.outputs[0], sep.outputs[2]
        top = math_(nt, "GREATER_THAN", z, Hp - 1.05)
        ridge_v = math_(nt, "SINE", math_(nt, "MULTIPLY", x, 2 * math.pi / 0.11))
        side = math_(nt, "GREATER_THAN", math_(nt, "ABSOLUTE", x), Wp / 2 - seal_w)
        ridge_h = math_(nt, "SINE", math_(nt, "MULTIPLY", z, 2 * math.pi / 0.11))
        zip_ = math_(nt, "MULTIPLY", math_(nt, "GREATER_THAN", z, Hp - 2.25), math_(nt, "LESS_THAN", z, Hp - 2.0))
        hv = math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", top, ridge_v), 0.6)
        hh = math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", side, ridge_h), 0.5)
        return math_(nt, "ADD", math_(nt, "ADD", hv, hh), math_(nt, "MULTIPLY", zip_, 1.5))

    # front-only mapping: print where the UV is on the front grid (back grid shares UVs, so mask by y)
    base_map = map_uv_rect(-Wp / 2, Wp / 2, 0.0, Hp)

    def front_map(nt):
        vec = base_map(nt)
        tc, sep = obj_sep(nt)
        back = math_(nt, "GREATER_THAN", sep.outputs[1], 0.0)
        off = node(nt, "ShaderNodeVectorMath", _operation="ADD")
        link(nt, vec, off.inputs[0])
        cmb = node(nt, "ShaderNodeCombineXYZ")
        link(nt, math_(nt, "MULTIPLY", back, 5.0), cmb.inputs[0])
        link(nt, cmb.outputs[0], off.inputs[1])
        return off.outputs[0]

    mat = pouch_material(key + "_film", fin, front_map, key + "_print.png", seal, 0.2 if finish == "foil" else 0.16)
    o = grid_solid(key + "_pouch", nu, nv, lambda i, j: pos(i, j, 1), lambda i, j: pos(i, j, -1),
                   lambda i, j: (-Wp / 2 + Wp * i / nu, Hp * j / nv), [mat], cap_bottom=True)
    add_ink(mat, front_map, key + "_ink.png")
    inked(o)
    return parent_all(key, [o])


def paper_material(name, mapping=None, print_img=None, deboss_img=None, top_crease=None):
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    pn = node(nt, "ShaderNodeTexNoise", Scale=70.0, Detail=10.0, Roughness=0.72)
    link(nt, tc.outputs["Object"], pn.inputs["Vector"])
    fib = node(nt, "ShaderNodeTexNoise", Scale=9.0, Detail=6.0)
    link(nt, tc.outputs["Object"], fib.inputs["Vector"])
    h = math_(nt, "MULTIPLY_ADD", pn.outputs["Fac"], 0.10, math_(nt, "MULTIPLY", fib.outputs["Fac"], 0.03))
    if deboss_img:
        dv = image(nt, deboss_img, mapping(nt), colorspace="Non-Color", ext="EXTEND")
        h = math_(nt, "ADD", h, dv.outputs["Color"])
    if top_crease:
        h = math_(nt, "ADD", h, top_crease(nt, sep))
    bpn = node(nt, "ShaderNodeBump", Strength=0.55, Distance=0.035)
    link(nt, h, bpn.inputs["Height"])
    paper = principled(nt, srgb("E4E5E1"), 0.0, 0.66, Sheen_Weight=0.2, Specular_IOR_Level=0.32)
    link(nt, bpn.outputs[0], paper.inputs["Normal"])
    shader = paper.outputs[0]
    if print_img:
        shader = with_print(nt, shader, bpn.outputs[0], mapping, print_img, rough=0.5, spec=0.4)
    link(nt, shader, out.inputs["Surface"])
    return m


def build_sachet(name, mat):
    Ws, Hs = labels.SACHET_W / 10.0, labels.SACHET_H / 10.0
    nu, nv = 72, 92
    b, P, e = 0.6, 0.14, 0.012

    def puff(i, j):
        x = -Ws / 2 + Ws * i / nu
        y = -Hs / 2 + Hs * j / nv
        ux = max(0.0, 1 - (abs(x) / (Ws / 2 - b)) ** 4) if abs(x) < Ws / 2 - b else 0.0
        uy = max(0.0, 1 - (abs(y) / (Hs / 2 - b)) ** 4) if abs(y) < Hs / 2 - b else 0.0
        p = P * (ux * uy) ** 0.6
        w = 0.018 * noise.noise(Vector((x * 0.7, y * 0.5, 5.0))) * (ux * uy) ** 0.5
        return x, y, e + p + w

    def front(i, j):
        x, y, z = puff(i, j)
        return Vector((x, y, max(z, e)))

    def back(i, j):
        x, y, z = puff(i, j)
        return Vector((x, y, -max(e, e + (z - e) * 0.6)))

    return grid_solid(name, nu, nv, front, back, lambda i, j: (i / nu, j / nv), [mat])


def sachet_material(key):
    m, nt, out = new_mat(key + "_sachetfoil")
    tc, sep = obj_sep(nt)
    p = principled(nt, (0.88, 0.89, 0.90, 1), 1.0, 0.33, Anisotropic=0.3)
    vec = map_uv_unit()(nt)
    cr = image(nt, key + "_sachet_crimp.png", vec, colorspace="Non-Color", ext="EXTEND")
    nz = node(nt, "ShaderNodeTexNoise", Scale=3.0, Detail=5.0)
    link(nt, tc.outputs["Object"], nz.inputs["Vector"])
    h = math_(nt, "ADD", math_(nt, "MULTIPLY", cr.outputs["Color"], 0.8), math_(nt, "MULTIPLY", nz.outputs["Fac"], 0.06))
    bpn = node(nt, "ShaderNodeBump", Strength=0.3, Distance=0.01)
    link(nt, h, bpn.inputs["Height"])
    link(nt, bpn.outputs[0], p.inputs["Normal"])

    def front_map(nt2):
        v = map_uv_unit()(nt2)
        tc2, sep2 = obj_sep(nt2)
        back = math_(nt2, "LESS_THAN", sep2.outputs[2], 0.0)
        off = node(nt2, "ShaderNodeVectorMath", _operation="ADD")
        link(nt2, v, off.inputs[0])
        cmb = node(nt2, "ShaderNodeCombineXYZ")
        link(nt2, math_(nt2, "MULTIPLY", back, 5.0), cmb.inputs[0])
        link(nt2, cmb.outputs[0], off.inputs[1])
        return off.outputs[0]
    shader = with_print(nt, p.outputs[0], bpn.outputs[0], front_map, key + "_sachet_print.png", rough=0.4)
    link(nt, shader, out.inputs["Surface"])
    return m


def build_box(pid, key, sachets=True, short=False):
    w, d, h = 7.0, 7.0, 11.5
    W, H = labels.box(pid, key, short=short)
    labels.sachet(pid, key + "_sachet")
    mp = map_obj_xz(-w / 2, w / 2, 0.0, h)
    front = paper_material(key + "_front", mp, key + "_print.png", key + "_deboss.png")

    def crease(nt, sep):
        y = sep.outputs[1]
        ztop = math_(nt, "GREATER_THAN", sep.outputs[2], h - 0.01)
        c = math_(nt, "LESS_THAN", math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", y, d / 2 - 0.35)), 0.03)
        s = math_(nt, "LESS_THAN", math_(nt, "ABSOLUTE", math_(nt, "SUBTRACT", y, -d / 2 + 0.06)), 0.025)
        return math_(nt, "MULTIPLY", math_(nt, "MULTIPLY", ztop, math_(nt, "MAXIMUM", c, s)), -0.4)
    paper = paper_material(key + "_paper", top_crease=crease)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x *= w
        v.co.y *= d
        v.co.z = (v.co.z + 0.5) * h
    for f in bm.faces:
        f.material_index = 0 if f.normal.y < -0.9 else 1
    me = bpy.data.meshes.new(key + "_box")
    bm.to_mesh(me)
    bm.free()
    me.materials.append(front)
    me.materials.append(paper)
    box = link_obj(bpy.data.objects.new(key + "_box", me))
    bv = box.modifiers.new("bevel", "BEVEL")
    bv.width = 0.06
    bv.segments = 4
    bv.limit_method = "ANGLE"
    box.modifiers.new("wn", "WEIGHTED_NORMAL")
    for f in me.polygons:
        f.use_smooth = True
    tab_m, _, _ = simple(key + "_tab", ORANGE, 0.0, 0.55, Sheen_Weight=0.4)
    tw, tt = 0.9, 0.025
    path = [(-d / 2 + 1.0, h + tt)] + [(-d / 2 + 0.06 - (0.06 + tt) * math.sin(a), h - 0.06 + (0.06 + tt) * math.cos(a))
                                       for a in [k / 8 * math.pi / 2 for k in range(9)]] + [(-d / 2 - tt, h - 1.1)]
    bm = bmesh.new()
    rows = [[bm.verts.new((x, py, pz)) for x in (-tw / 2, tw / 2)] for (py, pz) in path]
    for a, b in zip(rows, rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me2 = bpy.data.meshes.new(key + "_tab")
    bm.to_mesh(me2)
    bm.free()
    me2.materials.append(tab_m)
    tab = link_obj(bpy.data.objects.new(key + "_tab", me2))
    tab.location.x = 1.7
    sol = tab.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = tt
    sol.offset = -1
    add_ink(front, mp, key + "_ink.png")
    inked(box)
    objs = [box, tab]
    if sachets:
        sm = sachet_material(key)
        s0 = build_sachet(key + "_sachet0", sm)
        s0.scale = (0.82, 0.82, 0.82)
        s0.rotation_euler = (0, 0, math.radians(-14))
        s0.location = (-3.6, -8.6, 0.10)
        s1 = build_sachet(key + "_sachet1", sm)
        s1.scale = (0.82, 0.82, 0.82)
        s1.rotation_euler = (math.radians(-2.0), math.radians(1.5), math.radians(9))
        s1.location = (-0.6, -9.6, 0.25)
        objs += [s0, s1]
    return parent_all(key, objs)


def shadow_pass(m, tint, amount=0.97):
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


def glass_printed(name, tint, rough, mapping, print_img):
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    g = principled(nt, tint, 0.0, rough, Transmission_Weight=1.0, IOR=1.5)
    fr = node(nt, "ShaderNodeTexNoise", Scale=180.0, Detail=6.0)  # acid-etched frost
    link(nt, tc.outputs["Object"], fr.inputs["Vector"])
    bpn = node(nt, "ShaderNodeBump", Strength=0.08, Distance=0.01)
    link(nt, fr.outputs["Fac"], bpn.inputs["Height"])
    link(nt, bpn.outputs[0], g.inputs["Normal"])
    shader = with_print(nt, g.outputs[0], bpn.outputs[0], mapping, print_img, rough=0.5, spec=0.4)
    link(nt, shader, out.inputs["Surface"])
    return shadow_pass(m, tint)


def opal_printed(name, mapping, print_img):
    """Opal (white) glass: milky, satin, a little light through the walls."""
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    g = principled(nt, srgb("ECEDE9"), 0.0, 0.32, Subsurface_Weight=0.5, Subsurface_Scale=0.15,
                   Coat_Weight=0.6, Coat_Roughness=0.12)
    fr = node(nt, "ShaderNodeTexNoise", Scale=160.0, Detail=6.0)
    link(nt, tc.outputs["Object"], fr.inputs["Vector"])
    bpn = node(nt, "ShaderNodeBump", Strength=0.04, Distance=0.01)
    link(nt, fr.outputs["Fac"], bpn.inputs["Height"])
    link(nt, bpn.outputs[0], g.inputs["Normal"])
    shader = with_print(nt, g.outputs[0], bpn.outputs[0], mapping, print_img, rough=0.42, spec=0.45)
    link(nt, shader, out.inputs["Surface"])
    return m


def build_dropper(pid, key, short=False):
    R, t = 1.6, 0.17
    W, H = labels.dropper(pid, key, short=short)
    tint = (0.56, 0.68, 0.78, 1)
    mp = map_cylinder(R, W, H, 1.0)
    outer_m = glass_printed(key + "_glass", tint, 0.42, mp, key + "_print.png")
    inner_m = inner_glass(key + "_glassin", tint)
    out = [(0, 0.06), (1.35, 0.06)] + arc(1.35, 0.30, 0.25, -90, 0, 6)[1:] + [(R, 0.30), (R, 5.9)] + \
        arc(0.9, 5.9, 0.7, 0, 90, 12)[1:-1] + [(0.62, 6.62), (0.62, 7.45), (0.55, 7.5)]
    inn = [(0.55 - t * 0.6, 7.5), (0.62 - t, 7.2), (0.62 - t, 6.7)] + arc(0.9, 5.9, 0.7 - t, 85, 0, 12)[1:] + \
        [(R - t, 0.65)] + arc(R - t - 0.2, 0.65, 0.2, 0, -90, 5)[1:] + [(0, 0.45)]
    n_out = len(out)
    glass = lathe(key + "_dglass", out + inn, [outer_m, inner_m], slot_fn=lambda i, a, b: 0 if i < n_out - 1 else 1, segs=192)
    liq_m, _, _ = simple(key + "_serum", (0.95, 0.93, 0.86, 1), 0.0, 0.05, Transmission_Weight=1.0, IOR=1.36)
    liq = lathe(key + "_serum", [(0, 0.47), (R - t - 0.21, 0.47)] + arc(R - t - 0.21, 0.66, 0.19, -90, 0, 5)[1:] +
                [(R - t - 0.01, 4.6), (0, 4.6)], [shadow_pass(liq_m, (0.95, 0.95, 0.95))], segs=128)
    cm, cnt, cout = new_mat(key + "_collar")
    tc, sep = obj_sep(cnt)
    at = math_(cnt, "ARCTAN2", sep.outputs[1], sep.outputs[0])
    rib = math_(cnt, "SINE", math_(cnt, "MULTIPLY", at, 96.0))
    band = math_(cnt, "MULTIPLY", math_(cnt, "GREATER_THAN", sep.outputs[2], 7.35), math_(cnt, "LESS_THAN", sep.outputs[2], 8.45))
    bpn = node(cnt, "ShaderNodeBump", Strength=0.35, Distance=0.01)
    link(cnt, math_(cnt, "MULTIPLY", rib, band), bpn.inputs["Height"])
    cp = principled(cnt, (0.018, 0.019, 0.02, 1), 0.0, 0.36, Specular_IOR_Level=0.5)
    link(cnt, bpn.outputs[0], cp.inputs["Normal"])
    link(cnt, cp.outputs[0], cout.inputs["Surface"])
    collar = lathe(key + "_collar", [(0.56, 7.22), (0.98, 7.22)] + arc(0.98, 7.28, 0.06, -90, 0, 3)[1:] + [(1.04, 8.48)] +
                   arc(0.98, 8.48, 0.06, 0, 90, 3)[1:] + [(0.66, 8.54), (0.66, 8.60), (0.52, 8.60), (0.52, 7.22)], [cm], segs=128)
    rub, _, _ = simple(key + "_bulb", (0.012, 0.012, 0.013, 1), 0.0, 0.55, Sheen_Weight=0.25, Specular_IOR_Level=0.35)
    bulb = lathe(key + "_bulb", [(0, 8.58), (0.80, 8.58)] + arc(0.80, 8.66, 0.08, -90, 0, 3)[1:] + [(0.88, 8.80), (0.74, 8.92),
                 (0.72, 9.4), (0.74, 10.2)] + arc(0.0, 10.2, 0.74, 0, 90, 14)[1:], [rub], segs=128)
    pip_m, _, _ = simple(key + "_pip", (0.95, 0.96, 0.97, 1), 0.0, 0.03, Transmission_Weight=1.0, IOR=1.47)
    pip = lathe(key + "_pip", [(0, 1.2), (0.12, 1.2), (0.32, 1.9), (0.32, 7.3), (0, 7.3)],
                [shadow_pass(pip_m, (0.97, 0.97, 0.97))], segs=48)
    add_ink(outer_m, mp, key + "_ink.png")
    inked(glass)
    return parent_all(key, [glass, liq, collar, bulb, pip])


def build_jar(pid, key, short=False):
    R = 3.3
    W, H = labels.jar(pid, key, short=short)
    tint = (0.96, 0.97, 0.975, 1)
    mp = map_cylinder(R, W, H, 0.6)
    outer_m = opal_printed(key + "_glass", mp, key + "_print.png")
    inner_m, _, _ = simple(key + "_glassin", srgb("E9EAE6"), 0.0, 0.4)
    out = [(0, 0.05), (2.9, 0.05)] + arc(2.9, 0.45, 0.4, -90, 0, 8)[1:] + [(R, 3.95)] + arc(3.0, 3.95, 0.3, 0, 90, 6)[1:] + \
        [(2.95, 4.25), (2.95, 4.85)] + arc(2.82, 4.85, 0.13, 0, 90, 4)[1:]
    inn = [(2.62, 4.98)] + arc(2.62, 4.85, 0.13, 90, 180, 4)[1:] + [(2.49, 1.25)] + arc(2.19, 1.25, 0.3, 0, -90, 5)[1:] + [(0, 0.95)]
    n_out = len(out)
    glass = lathe(key + "_jglass", out + inn, [outer_m, inner_m], slot_fn=lambda i, a, b: 0 if i < n_out - 1 else 1)
    cream_m, _, _ = simple(key + "_cream", (0.98, 0.98, 0.965, 1), 0.0, 0.35, Subsurface_Weight=0.25, Subsurface_Scale=0.1)
    cream = lathe(key + "_cream", [(0, 0.96), (2.18, 0.96)] + arc(2.19, 1.26, 0.29, -90, 0, 5)[1:] + [(2.48, 3.9),
                  (1.5, 4.02), (0.4, 4.1), (0, 4.12)], [cream_m])
    lid_side = aluminium(key + "_lidside", "turned", rough=0.24, aniso=0.7)
    lid_top = aluminium(key + "_lidtop", "spun", rough=0.27, aniso=0.85, groove=0.16)
    lid = lathe(key + "_jlid", [(3.0, 5.4), (3.0, 4.32)] + arc(3.08, 4.32, 0.08, 180, 270, 3)[1:] + arc(3.08, 4.36, 0.04, -90, 0, 3)[1:] +
                [(3.37, 4.36)] + arc(3.27, 4.4, 0.1, -60, 0, 3)[1:] + [(3.37, 5.90)] + arc(3.25, 5.9, 0.12, 0, 90, 8)[1:] +
                [(1.5, 6.015), (0, 6.02)], [lid_side, lid_top], slot_fn=lambda i, a, b: 1 if (a[1] > 5.98 and b[1] > 5.98) else 0)
    inner, _, _ = simple(key + "_lidinner", (0.2, 0.2, 0.2, 1), 0.0, 0.5)
    lid_in = lathe(key + "_jlidin", [(0, 5.4), (3.0, 5.4)], [inner])
    add_ink(outer_m, mp, key + "_ink.png")
    inked(glass)
    return parent_all(key, [glass, cream, lid, lid_in])


BUILD = {"tin": build_tin, "pouch": build_pouch, "box": build_box, "dropper": build_dropper, "jar": build_jar}
