"""08-4 / 08-5 / 08-6: capsule and tablet bottles (v2).

- 08-4 Zinc Bisglycinate: a bead-blasted anodised aluminium canister (pin #28) with black pad print.
- 08-5 Biotin: a soft-touch slate body with pale print. This is the language of v1, kept.
- 08-6 Hyaluronic Acid: a smoked-glass bottle with capsules inside and a matte silver wrap label
  (pin #13) in black print.

All three share a low brushed-steel cap: 21 mm tall, no knurl, crisp 0.3 mm bevels and one fine machined groove.
The print uses the v2 label grid and runs along the axis.
"""
import math
import os
import random

import bpy

import common as C

VARIANTS = {
    "08-4": dict(body="anodised"),
    "08-5": dict(body="slate"),
    "08-6": dict(body="smoke"),
}

R = 0.0260
H_SH = 0.0800      # shoulder start
NECK_R = 0.0185
CAP_R = 0.0248
CAP_Z0 = 0.0905
CAP_H = 0.0210
HEIGHT = CAP_Z0 + CAP_H
WALL = 0.0035
BASE = 0.0075


def body_outer():
    pts = [(0.0, 0.0008), (R - 0.0040, 0.0008), (R - 0.0030, 0.0), (R, 0.0), (R, H_SH), (CAP_R - 0.0004, H_SH + 0.0090),
           (NECK_R, H_SH + 0.0105), (NECK_R, CAP_Z0 + 0.006)]
    rad = [0, 0.0006, 0.0005, 0.0030, 0.0070, 0.0016, 0.0008, 0.0005]
    return pts, rad


def body_profile():
    pts, rad = body_outer()
    pts = pts + [(0.0, CAP_Z0 + 0.006)]
    rad = rad + [0]
    return C.resample(C.fillet(pts, rad, n=16), 0.0012)


def glass_profile():
    pts, rad = body_outer()
    ni = NECK_R - 0.0028
    pts = pts + [(ni, CAP_Z0 + 0.006), (ni, H_SH + 0.008), (R - WALL, H_SH - 0.002), (R - WALL, BASE), (0.0, BASE - 0.0006)]
    rad = rad + [0.0004, 0.0015, 0.0060, 0.0035, 0]
    prof = C.fillet(pts, rad, n=14)
    return C.resample(prof, 0.0012), 8


def cap_profile():
    z0, z1 = CAP_Z0, CAP_Z0 + CAP_H
    b = 0.0003  # crisp bevels
    pts = [(0.0, z0 + 0.004), (NECK_R + 0.0003, z0 + 0.004), (NECK_R + 0.0003, z0), (CAP_R - b, z0), (CAP_R, z0 + b),
           (CAP_R, z0 + 0.0032), (CAP_R - 0.00018, z0 + 0.0034), (CAP_R - 0.00018, z0 + 0.0039), (CAP_R, z0 + 0.0041),
           (CAP_R, z1 - 0.0010), (CAP_R - 0.0010, z1), (0.0, z1)]
    rad = [0, 0.0002, 0.0002, 0.0001, 0.0001, 0.00005, 0.00004, 0.00004, 0.00005, 0.00012, 0.00012, 0]
    return C.resample(C.fillet(pts, rad, n=5), 0.0005)


def capsules(parent, n=58, seed=4, lying=False):
    """Capsules packed loosely in the bottle (seen through the smoked glass).

    Lying (render.py turns the pack +90 deg about Y, so local +x points down) they settle on the low side.
    """
    rng = random.Random(seed)
    L, rc = 0.0215, 0.0039
    prof = []
    for i in range(13):
        a = (math.pi / 2) * i / 12
        prof.append((rc * math.sin(a), -L / 2 + rc - rc * math.cos(a), 0))
    for i in range(13):
        a = (math.pi / 2) * i / 12
        prof.append((rc * math.cos(a), L / 2 - rc + rc * math.sin(a), 0))
    prof[-1] = (0.0, L / 2, 0)
    proto = C.lathe("capsule_proto", prof, segs=24)
    cap_mesh = proto.data
    bpy.data.objects.remove(proto)
    m, nt, out = C.new_mat("capsule_shell")
    p = C.principled(nt, (0, 0), base=(0.86, 0.86, 0.85, 1), rough=0.35, sss=0.05, sss_scale=0.0005, spec=0.5)
    C.L(nt, p, out, 0, "Surface")
    cap_mesh.materials.append(m)
    placed = []
    rin = R - WALL - rc - 0.0004
    tries = 0
    while len(placed) < n and tries < 20000:
        tries += 1
        z = rng.uniform(BASE + rc + 0.0005, 0.075)
        a = rng.uniform(0, 2 * math.pi)
        r = math.sqrt(rng.uniform(0, 1)) * (rin - L * 0.35)
        x, y = r * math.cos(a), r * math.sin(a)
        if lying and x < -0.001:
            continue
        if any((x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2 < 0.0105 ** 2 for px, py, pz in placed):
            continue
        placed.append((x, y, z))
        ob = bpy.data.objects.new("capsule", cap_mesh)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = (x, y, z)
        if lying:  # long axis roughly level: along local y or z, never pointing down
            ob.rotation_euler[0] = rng.uniform(-0.5, 0.5) + (math.pi / 2 if rng.random() < 0.5 else 0)
        else:
            ob.rotation_euler = (rng.uniform(1.1, 2.0), 0, rng.uniform(0, 2 * math.pi))
        ob.parent = parent


def build(variant="08-4", label=True, lying=False):
    v = VARIANTS[variant]
    root = C.empty("bottle_" + variant)
    lab = os.path.join(C.TEX, f"v2_{variant}_front.png") if label else None
    back = os.path.join(C.TEX, f"v2_{variant}_back.png") if label else None
    luv = dict(r=R, z0=0.0425, w=0.044, h=0.062)
    buv = dict(r=R, z0=0.0425, w=0.026, h=0.050)
    parts = []
    if v["body"] == "anodised":
        body = C.lathe("body", body_profile(), segs=256, label_uv=luv, label_back=buv)
        C.assign(body, C.mat_anodised("anod_" + variant, base=(0.20, 0.205, 0.21, 1), rough=0.32, label=lab,
                                      back_label=back, ink=(0.015, 0.016, 0.018, 1)))
        parts.append(body)
    elif v["body"] == "slate":
        body = C.lathe("body", body_profile(), segs=256, label_uv=luv, label_back=buv)
        C.assign(body, C.mat_porcelain("slate_" + variant, base=(0.024, 0.029, 0.034, 1), rough=0.55, label=lab,
                                       back_label=back, ink=(0.80, 0.79, 0.76, 1), sss=0.0, spec=0.18))
        parts.append(body)
    else:
        absorb = ((0.30, 0.31, 0.33, 1), 650.0)
        smoke = C.mat_frost_glass("smoke_" + variant, rough=0.05, tint=(0.55, 0.57, 0.60, 1), absorb=absorb,
                                  shadow_tint=(0.25, 0.26, 0.27, 1))
        inner = C.mat_clear_glass("smoke_inner", tint=(1, 1, 1, 1), absorb=absorb, shadow_tint=(0.25, 0.26, 0.27, 1))
        gp, n_outer = glass_profile()
        glass = C.lathe("glass", gp, segs=256, mat_of=lambda a, b, i: 0 if a < n_outer - 1 else 1)
        C.assign(glass, smoke, inner)
        parts.append(glass)
        # matte silver wrap label (pin #13), a thin band proud of the glass
        band = C.lathe("label_band", [(R + 0.00015, 0.0425 - 0.025, 0), (R + 0.00015, 0.0425 + 0.025, 0)], segs=256,
                       label_uv=dict(r=R, z0=0.0425, w=0.044, h=0.044),
                       label_back=dict(r=R, z0=0.0425, w=0.026, h=0.036))
        C.assign(band, C.mat_label_film("film_" + variant, label=lab, back_label=back))
        parts.append(band)
        capsules(root, n=46 if lying else 58, lying=lying)
    cap = C.lathe("cap", cap_profile(), segs=256, smooth_angle=50)
    C.assign(cap, C.mat_brushed_steel("steel_cap", base=(0.74, 0.74, 0.73, 1), rough=0.16, aniso=0.45))
    parts.append(cap)
    C.parent(parts, root)
    return root, dict(height=HEIGHT, radius=R, center_z=HEIGHT * 0.5, elev=9.0, fill=0.74,
                      stage=dict(back=1.4 if v["body"] == "smoke" else 0.0, back_w=0.07, back_h=0.09), fstop=9.0)
