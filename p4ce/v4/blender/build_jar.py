"""08-3: 50 ml cream jar (v2).

Heavy satin-frosted extra-flint glass with 6 mm walls and a 10 mm base. A faint cool absorption makes the
thick sections read. The cream sits below the shoulder, so the inner wall shows as a band. The lid is a
flush, weighty brushed-steel piece with a 45 degree top chamfer, a debossed letterspaced P4CE and a ring of
etched mono text. The front print is left-aligned graphite (v2 label grid).
"""
import os

import common as C

R = 0.0320
H_BODY = 0.0400
NECK_R = 0.0285
LIP = 0.0515
RI = 0.0260
BASE = 0.0100
LID_Z0 = 0.0406
LID_H = 0.0225
HEIGHT = LID_Z0 + LID_H


def glass_profile():
    outer = [(0.0, 0.0008), (R - 0.0045, 0.0008), (R - 0.0033, 0.0), (R, 0.0), (R, H_BODY), (NECK_R, H_BODY),
             (NECK_R, LIP), (0.0228, LIP)]
    orad = [0, 0.0006, 0.0005, 0.0024, 0.0011, 0.0004, 0.0006, 0.0005]
    inner = [(0.0228, 0.0465), (RI, 0.0425), (RI, BASE), (0.0, BASE - 0.0007)]
    irad = [0.0015, 0.0030, 0.0040, 0]
    prof = C.fillet(outer + inner, orad + irad, n=14)
    return C.resample(prof, 0.0012), len(outer)


def cream_profile():
    o = 0.00012
    top = 0.0310
    pts = [(0.0, BASE - 0.0007 - o), (RI + o, BASE - o), (RI + o, top), (0.0, top + 0.0012)]
    rad = [0, 0.0040, 0.0025, 0]
    return C.resample(C.fillet(pts, rad, n=12), 0.0015)


def lid_profile():
    z0, z1 = LID_Z0, LID_Z0 + LID_H
    ch = 0.0011
    pts = [(0.0, z0 + 0.0030), (NECK_R + 0.0004, z0 + 0.0030), (NECK_R + 0.0004, z0), (R - 0.0004, z0), (R, z0 + 0.0004),
           (R, z1 - ch), (R - ch, z1), (0.0, z1)]
    rad = [0, 0.0003, 0.0002, 0.0002, 0.0002, 0.00025, 0.00025, 0]
    return C.resample(C.fillet(pts, rad, n=6), 0.0010)


def planar_uv(ob, name, size):
    me = ob.data
    uv = me.uv_layers.get(name) or me.uv_layers.new(name=name)
    for loop in me.loops:
        v = me.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (v.x / size + 0.5, v.y / size + 0.5)


def build(variant="08-3", label=True, lying=False):
    root = C.empty("jar_" + variant)
    absorb = ((0.80, 0.88, 0.88, 1), 18.0)
    frost = C.mat_frost_glass(
        "satin_jar", rough=0.075, tint=(0.95, 0.97, 0.975, 1),
        label=os.path.join(C.TEX, "v2_08-3_lying.png" if lying else "v2_08-3_front.png") if label else None,
        back_label=os.path.join(C.TEX, "v2_08-3_back.png") if (label and not lying) else None,
        ink=(0.018, 0.02, 0.022, 1), absorb=absorb)
    clear = C.mat_clear_glass("glass_inner_jar", tint=(1, 1, 1, 1), absorb=absorb)
    gp, n_outer = glass_profile()
    glass = C.lathe("jar_glass", gp, segs=256,
                    mat_of=lambda a, b, i: 0 if (a < n_outer - 1) else 1,
                    label_uv=dict(r=R, z0=0.0205, w=0.058, h=0.030),
                    label_back=dict(r=R, z0=0.0205, w=0.050, h=0.018))
    C.assign(glass, frost, clear)
    cream = C.lathe("cream", cream_profile(), segs=160)
    m, nt, out = C.new_mat("cream")
    p = C.principled(nt, (0, 0), base=(0.70, 0.675, 0.63, 1), rough=0.30, sss=0.6, sss_radius=(1.0, 0.8, 0.6),
                     sss_scale=0.002, spec=0.45)
    C.L(nt, p, out, 0, "Surface")
    C.assign(cream, m)
    lid = C.lathe("lid", lid_profile(), segs=256, smooth_angle=30)
    planar_uv(lid, "label", 0.066)
    C.assign(lid, C.mat_brushed_steel("steel_lid", rough=0.18, aniso=0.5,
                                      height_img=os.path.join(C.TEX, "v2_lid_08-3_height.png"), deboss_strength=1.0))
    C.parent([glass, cream, lid], root)
    return root, dict(height=HEIGHT, radius=R, center_z=HEIGHT * 0.5, elev=14.0, fill=0.66, target_z=HEIGHT * 0.45,
                      stage=dict(back=1.2, back_w=0.14, back_h=0.11), fstop=14.0, top_elev=50.0,
                      top_stage=dict(top=0.12))
