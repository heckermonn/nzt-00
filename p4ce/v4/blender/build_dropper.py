"""08-1 / 08-2: 30 ml heavy-bottomed tinted satin-glass dropper (v2, after pins #1 and #13).

3 mm walls and a 7.5 mm refracting base. The outer surface has a light satin etch and the inner surface is
polished. The glass is coloured through an absorption volume, so thick sections read deeper: olive-amber
for 08-1 and sage for 08-2. A clear liquid with a meniscus holds the glass pipette. The collar is
bead-blasted aluminium with a straight knurl, and the bulb is black soft-touch. Pale print runs along the
bottle's axis.
"""
import math
import os

import bpy

import common as C

VARIANTS = {
    "08-1": dict(bulb="bone", ink=(0.022, 0.025, 0.028, 1)),
    "08-2": dict(bulb="graphite", ink=(0.022, 0.025, 0.028, 1)),
}

R = 0.0165        # outer radius (33 mm)
RI = 0.0135       # inner radius (3 mm wall)
BASE = 0.0075     # heavy base
H_SH = 0.057      # start of shoulder
NECK_R = 0.0088
NECK_RI = 0.0062
TOP = 0.0800
FILL = 0.0535     # liquid level
HEIGHT = 0.1195   # overall


def glass_profile():
    outer = [
        (0.0, 0.0007), (R - 0.0040, 0.0007), (R - 0.0028, 0.0), (R, 0.0), (R, H_SH),
        (NECK_R, H_SH + 0.0125), (NECK_R, TOP), (NECK_RI, TOP),
    ]
    orad = [0, 0.0006, 0.0005, 0.0026, 0.0075, 0.0022, 0.0006, 0.0004]
    inner = [
        (NECK_RI, H_SH + 0.0110), (RI, H_SH - 0.0008), (RI, BASE), (0.0, BASE - 0.0006),
    ]
    irad = [0.0022, 0.0060, 0.0030, 0]
    pts = outer + inner
    rad = orad + irad
    prof = C.fillet(pts, rad, n=14)
    prof = C.resample(prof, 0.0012)
    n_outer = len(outer)  # tags < n_outer-1 are outer frosted, >= are inner clear
    return prof, n_outer


def liquid_profile():
    o = 0.00012  # overlap into glass so the interface is liquid/glass
    m = 0.0009   # meniscus height
    pts = [(0.0, BASE - 0.0006 - o), (RI + o, BASE - o), (RI + o, FILL + m)]
    rad = [0, 0.0030, 0]
    prof = C.fillet(pts, rad, n=14)
    # meniscus: exponential rise toward the wall
    import numpy as np
    for t in np.linspace(0, 1, 18)[1:]:
        r = RI + o - t * 0.004
        z = FILL + m * math.exp(-(t * 0.004) / 0.0009)
        prof.append((r, z, 9))
    prof.append((0.0, FILL, 9))
    return C.resample(prof, 0.0015)


def pipette_profile():
    ro, ri = 0.0034, 0.0022
    tip = 0.0145
    pts = [
        (0.0, tip + 0.0002), (0.0011, tip), (0.0013, tip + 0.0015), (ro, tip + 0.012), (ro, 0.0905),
        (ri, 0.0905), (ri, tip + 0.0125), (0.0006, tip + 0.0018), (0.0, tip + 0.0018),
    ]
    rad = [0, 0.0003, 0.0004, 0.004, 0.0003, 0.0003, 0.004, 0.0003, 0]
    return C.resample(C.fillet(pts, rad, n=8), 0.002)


def collar_profile():
    z0, z1 = TOP - 0.0098, 0.0905
    Rc = 0.01055
    pts = [
        (NECK_R + 0.0002, z0), (Rc - 0.0004, z0), (Rc, z0 + 0.0005), (Rc, z0 + 0.0021), (Rc - 0.00025, z0 + 0.0024),
        (Rc - 0.00025, z0 + 0.0028), (Rc, z0 + 0.0031), (Rc, z1 - 0.0031), (Rc - 0.00025, z1 - 0.0028),
        (Rc - 0.00025, z1 - 0.0024), (Rc, z1 - 0.0021), (Rc, z1 - 0.0006), (Rc - 0.0006, z1), (0.0071, z1),
        (0.0068, z1 - 0.0010), (0.0068, z0 + 0.0015), (NECK_R + 0.0002, z0 + 0.0015),
    ]
    rad = [0, 0.0003, 0.0002, 0.0001, 0.00008, 0.00008, 0.0001, 0.0001, 0.00008, 0.00008, 0.0001, 0.0002,
           0.0004, 0.0003, 0.0002, 0.0002, 0]
    prof = C.fillet(pts, rad, n=5)
    knurl = (z0 + 0.0033, z1 - 0.0033)
    return C.resample(prof, 0.0003), knurl, Rc


def bulb_profile():
    zb = 0.0903
    zw = zb + 0.0056
    pts = [(0.0, zb), (0.0074, zb), (0.0089, zb + 0.0004), (0.0089, zb + 0.0030), (0.0072, zw)]
    rad = [0, 0.0004, 0.0003, 0.0010, 0]
    prof = C.fillet(pts, rad, n=10)
    rb = 0.0081
    zc = HEIGHT - 0.0068
    n1 = 28
    for i in range(1, n1 + 1):
        t = i / n1
        z = zw + (zc - zw) * t
        s_ = t * t * (3 - 2 * t)
        r = 0.0072 + (rb - 0.0072) * min(1.0, s_ * 1.6)
        prof.append((r, z, 5))
    p_ = 2.4
    n2 = 30
    for i in range(1, n2 + 1):
        a = (math.pi / 2) * i / n2
        r = rb * math.cos(a) ** (2 / p_)
        z = zc + (HEIGHT - zc) * math.sin(a) ** (2 / p_)
        prof.append((r if i < n2 else 0.0, z, 6))
    return prof


COLOURWAYS = {
    "olive": dict(tint=(0.56, 0.53, 0.34, 1), absorb=((0.58, 0.50, 0.25, 1), 270.0), ink=(0.90, 0.89, 0.84, 1),
                  shadow=(0.50, 0.46, 0.30, 1)),
    "sage": dict(tint=(0.46, 0.57, 0.51, 1), absorb=((0.40, 0.58, 0.48, 1), 250.0), ink=(0.90, 0.92, 0.88, 1),
                 shadow=(0.40, 0.50, 0.44, 1)),
    "smoke": dict(tint=(0.42, 0.44, 0.46, 1), absorb=((0.28, 0.30, 0.32, 1), 300.0), ink=(0.90, 0.89, 0.86, 1),
                  shadow=(0.22, 0.23, 0.24, 1)),
    "flint": dict(tint=(0.95, 0.97, 0.98, 1), absorb=((0.86, 0.92, 0.92, 1), 15.0), ink=(0.02, 0.022, 0.025, 1),
                  shadow=(0.55, 0.58, 0.6, 1)),
}
DEFAULT_COLOUR = {"08-1": "olive", "08-2": "sage"}


def liquid_cavity_profile():
    """The whole cavity up into the shoulder, slightly oversized so it overlaps the glass."""
    o = 0.00012
    pts = [(0.0, BASE - 0.0006 - o), (RI + o, BASE - o), (RI + o, H_SH - 0.0008), (NECK_RI + o, H_SH + 0.0110),
           (NECK_RI + o, TOP - 0.004), (0.0, TOP - 0.004)]
    rad = [0, 0.0030, 0.0060, 0.0022, 0, 0]
    return C.resample(C.fillet(pts, rad, n=14), 0.0012)


def level_liquid(ob, world_matrix, level_world_z):
    """Cut a closed liquid mesh with a world-horizontal plane and cap it (for tilted bottles)."""
    import bmesh
    from mathutils import Vector
    inv = world_matrix.inverted()
    co = inv @ Vector((0, 0, level_world_z))
    up = (inv.to_3x3() @ Vector((0, 0, 1))).normalized()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=up,
                                 clear_outer=True)
    edges = [e for e in res["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
    bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()


def build(variant="08-1", label=True, liquid=True, lying=False):
    colour = None
    if variant.count("-") == 2:  # e.g. 08-1-smoke
        variant, colour = variant.rsplit("-", 1)
    colour = colour or DEFAULT_COLOUR[variant]
    cw = COLOURWAYS[colour]
    root = C.empty("dropper_" + variant)
    lab = os.path.join(C.TEX, f"v2_{variant}_front.png") if label else None
    back = os.path.join(C.TEX, f"v2_{variant}_back.png") if label else None
    frost = C.mat_frost_glass("satin_" + variant, rough=0.10, label=lab, back_label=back, ink=cw["ink"],
                              tint=cw["tint"], absorb=cw["absorb"], shadow_tint=cw["shadow"])
    clear = C.mat_clear_glass("glass_inner_" + variant, tint=(1, 1, 1, 1), absorb=cw["absorb"],
                              shadow_tint=cw["shadow"])
    gp, n_outer = glass_profile()
    glass = C.lathe("glass", gp, segs=256,
                    mat_of=lambda a, b, i: 0 if b < n_outer - 1 or (a < n_outer - 1) else 1,
                    label_uv=dict(r=R, z0=0.0310, w=0.030, h=0.044),
                    label_back=dict(r=R, z0=0.0310, w=0.018, h=0.035))
    C.assign(glass, frost, clear)
    parts = [glass]
    if liquid:
        if lying:
            liq = C.lathe("liquid", liquid_cavity_profile(), segs=192)
        else:
            liq = C.lathe("liquid", liquid_profile(), segs=192)
        C.assign(liq, C.mat_liquid())
        parts.append(liq)
        pl = C.lathe("pipette_liquid", C.resample(C.fillet([(0, 0.0170), (0.00225, 0.0285), (0.00225, 0.0560),
                                                             (0, 0.0560)], [0, 0.003, 0.0003, 0], 6), 0.002), segs=48)
        C.assign(pl, C.mat_liquid("liquid_pip"))
        parts.append(pl)
    pip = C.lathe("pipette", pipette_profile(), segs=96)
    C.assign(pip, C.mat_clear_glass("pipette_glass"))
    parts.append(pip)

    cp, (k0, k1), Rc = collar_profile()
    NR = 120
    depth = 0.00022

    def knurl(th, z, r):
        if r < Rc - 0.00005 or z < k0 or z > k1:
            return r
        e = min(1.0, (z - k0) / 0.0004, (k1 - z) / 0.0004)
        g = ((1 + math.cos(NR * th)) / 2) ** 2
        return r - depth * g * e
    collar = C.lathe("collar", cp, segs=NR * 8, rmod=knurl, smooth_angle=60)
    C.assign(collar, C.mat_beadblast_alu())
    bulb = C.lathe("bulb", bulb_profile(), segs=160)
    C.assign(bulb, C.mat_soft_touch("bulb_black", base=(0.014, 0.014, 0.015, 1), rough=0.50))
    parts += [collar, bulb]
    C.parent(parts, root)
    info = dict(height=HEIGHT, radius=R, center_z=HEIGHT / 2, label_z=0.031, elev=9.0, fill=0.74,
                stage=dict(back=1.4))
    if lying and liquid:
        def settle(world_matrix_of_root):
            # liquid lies along the lower side: level 2/3 up the cavity diameter
            bpy.context.view_layer.update()
            import mathutils
            liq.data.update()
            mw = liq.matrix_world.copy()
            zs = [(mw @ v.co).z for v in liq.data.vertices]
            lo, hi = min(zs), max(zs)
            level_liquid(liq, mw, lo + (hi - lo) * 0.62)
            pl_mw = pl.matrix_world.copy()
            zs = [(pl_mw @ v.co).z for v in pl.data.vertices]
            level_liquid(pl, pl_mw, min(zs) + (max(zs) - min(zs)) * 0.55)
        info["settle"] = settle
    return root, info
