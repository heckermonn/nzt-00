"""Composed shots: brand sculptures and the 08 RENEW group.

Each build(name, res) creates geometry, lights and camera and returns an info dict
for render.py (kind 'scene' renders transparent + a fog composite).
"""
import math

import bpy
import numpy as np

import common as C


def _stage(scale, center_z, key=1.0, rim=1.0, fill=1.0, back=0.0, catcher=0.5, hdri=0.35, hdri_rot=0.0, flags=True):
    C.setup_world(hdri_strength=hdri, rot_deg=hdri_rot, transmission_color=C.lin((0x9A, 0xA4, 0xAD)))
    C.studio_rig(scale=scale, key=key, rim=rim, center=(0, 0, center_z), back=back, fill=fill, flags=flags)
    if catcher:
        C.shadow_catcher(catcher)


def capsule_mesh(name, L=0.105, rc=0.0215, seam=0.0005):
    """Two-piece capsule along Z (centred); the cap half is a touch wider and overlaps the body."""
    body = C.lathe(name + "_body", _hemi_profile(-L / 2, 0.012, rc, down=True), segs=128)
    cap = C.lathe(name + "_cap", _hemi_profile(L / 2, -0.010, rc + seam, down=False), segs=128)
    return body, cap


def _hemi_profile(z_end, z_open, r, down):
    """Closed profile: pole at z_end, rounded end, cylinder to z_open, closed flat at z_open."""
    s = -1 if down else 1  # direction from open end toward the pole
    zc = z_end - s * r     # centre of the hemisphere
    pts = [(0.0, z_open)]
    pts.append((r - 0.0008, z_open))
    pts.append((r, z_open + s * 0.0005))
    n = 24
    for i in range(n + 1):
        a = (math.pi / 2) * i / n
        pts.append((r * math.cos(a), zc + s * r * math.sin(a)))
    pts[-1] = (0.0, z_end)
    out = C.resample([(p[0], p[1], 0) for p in pts], 0.0015)
    return out


def sculpt_capsule(res):
    Rp, Hp = 0.125, 0.060
    Rr, D = 0.068, 0.014
    pts = [(0.0, 0.0), (Rp - 0.01, 0.0), (Rp, 0.0), (Rp, Hp), (Rr, Hp), (Rr, Hp - D), (0.0, Hp - D)]
    rad = [0, 0, 0.003, 0.009, 0.005, 0.007, 0]
    plinth = C.lathe("plinth", C.resample(C.fillet(pts, rad, n=18), 0.003), segs=256)
    C.assign(plinth, C.mat_clay("plinth_clay", base=(0.36, 0.375, 0.39, 1), rough=0.9, sss=0.04))
    body, cap = capsule_mesh("capsule", L=0.100, rc=0.0205)
    clay = C.mat_clay("capsule_clay", base=(0.58, 0.57, 0.55, 1), rough=0.62, sss=0.3)
    C.assign(body, clay)
    C.assign(cap, clay)
    par = C.empty("capsule")
    C.parent([body, cap], par)
    rc = 0.0205 + 0.0005
    par.location = (0.002, 0.004, Hp - D + rc)
    par.rotation_euler = (0, math.radians(90), math.radians(-24))
    C.setup_world(hdri_strength=0.22, transmission_color=C.lin((0x9A, 0xA4, 0xAD)))
    t = (0, 0, Hp)
    C.area("key", (-0.60, 0.38, 0.42), t, 0.35, 0.6, energy=6.5, spread=60)
    C.area("fill", (0.7, -0.6, 0.35), t, 0.9, 0.9, energy=1.6, spread=120, shadow=False)
    C.area("rim", (0.45, 0.55, 0.25), t, 0.2, 0.5, energy=2.2, spread=60, shadow=False)
    C.shadow_catcher(1.2)
    w, h = res
    elev = math.radians(38)
    tz = Hp * 0.5
    d = 0.98 if h >= w else 0.80
    C.camera((0, -d * math.cos(elev), tz + d * math.sin(elev)), (0, 0.0, tz), lens=85.0, fstop=4.0,
             focus=d - 0.005)
    return dict(exposure=-0.2)


def ring_mesh(name, R=0.085, w=0.016, t=0.0105, r=0.0035):
    """Halo: a flat band ring with softly rounded corners, around Z."""
    pts = [(R - w / 2, -t / 2), (R + w / 2, -t / 2), (R + w / 2, t / 2), (R - w / 2, t / 2), (R - w / 2, -t / 2)]
    # rounded rectangle cross-section as closed loop; lathe needs open profile from axis, so build manually
    prof = C.fillet([(R, -t / 2)] + pts[1:4] + [(R - w / 2, -t / 2), (R, -t / 2)], [0, r, r, r, r, r, 0], n=10)
    me_ob = C.lathe(name, C.resample(prof, 0.0008), segs=360, smooth_angle=40)
    # merge duplicated seam vertex of the closed section
    import bmesh
    bm = bmesh.new()
    bm.from_mesh(me_ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me_ob.data)
    bm.free()
    me_ob.data.set_sharp_from_angle(angle=math.radians(40))
    return me_ob


def sculpt_halo(res, motion=False):
    ring = ring_mesh("halo")
    steel = C.mat_brushed_steel("halo_steel", base=(0.80, 0.80, 0.79, 1), rough=0.14, aniso=0.7)
    C.assign(ring, steel)
    par = C.empty("halo_root")
    ring.parent = par
    ring.rotation_euler = (math.radians(90), 0, 0)  # stand the ring up, axis toward camera
    zc = 0.085 + 0.0105 / 2 + 0.018
    par.location = (0, 0, zc)
    par.rotation_euler = (math.radians(-6), 0, math.radians(32))
    _stage(scale=1.6, center_z=zc, key=1.0, rim=1.2, fill=0.5, back=0.0, catcher=0.8)
    w, h = res
    elev = math.radians(6)
    d = 0.82 if h >= w else 0.70
    C.camera((0, -d * math.cos(elev), zc + d * math.sin(elev)), (0, 0, zc - 0.012), lens=85.0, fstop=8.0)
    after = None
    if motion:
        sc = bpy.context.scene
        sc.frame_start, sc.frame_end = 1, 3
        par.rotation_euler = (math.radians(-6), 0, math.radians(10))
        par.keyframe_insert("rotation_euler", frame=1)
        par.rotation_euler = (math.radians(-6), 0, math.radians(10 + 26))
        par.keyframe_insert("rotation_euler", frame=2)
        par.rotation_euler = (math.radians(-6), 0, math.radians(10 + 52))
        par.keyframe_insert("rotation_euler", frame=3)
        for fc in _fcurves(par):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
        sc.frame_set(2)

        def after():
            r = bpy.context.scene.render
            r.use_motion_blur = True
            r.motion_blur_shutter = 0.85
            for obj, attr, val in ((r, "motion_blur_position", "CENTER"),
                                   (bpy.context.scene.cycles, "rolling_shutter_type", "NONE")):
                try:
                    setattr(obj, attr, val)
                except (AttributeError, TypeError):
                    pass
    return dict(exposure=-0.3, after_setup=after)


def _fcurves(ob):
    ad = ob.animation_data
    act = ad.action
    try:
        return list(act.fcurves)
    except AttributeError:  # layered actions (Blender 4.4+)
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    out.extend(cb.fcurves)
        return out


GROUP = [
    # module, variant, x, y, yaw(deg)
    ("build_bottle", "08-5", -0.118, 0.075, 8.0),
    ("build_bottle", "08-4", -0.178, -0.012, -14.0),
    ("build_dropper", "08-1", -0.052, 0.012, 6.0),
    ("build_jar", "08-3", 0.022, -0.050, -10.0),
    ("build_dropper", "08-2", 0.092, 0.030, -6.0),
    ("build_bottle", "08-6", 0.168, -0.004, 16.0),
]


def group(res):
    import importlib
    for modname, var, x, y, yaw in GROUP:
        mod = importlib.import_module(modname)
        root, info = mod.build(var)
        root.location = (x, y, 0)
        root.rotation_euler = (0, 0, math.radians(yaw))
    _stage(scale=2.4, center_z=0.06, key=1.0, rim=0.7, fill=0.7, back=1.6, catcher=1.2)
    # widen the glass backlight for the whole row
    bl = bpy.data.objects.get("backlight")
    if bl:
        bl.scale = (6.0, 1.0, 1.0)
    w, h = res
    elev = math.radians(10)
    d = 1.42
    tz = 0.062
    C.camera((0, -d * math.cos(elev), tz + d * math.sin(elev)), (0, 0.0, tz), lens=100.0, fstop=11.0,
             focus=d - 0.02)
    return dict(exposure=-0.35)


def sculpt_emboss(res):
    """Clay tile with an embossed capsule and raised type (after pin #71)."""
    import os
    W, H, T = 0.120, 0.160, 0.014
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, T / 2))
    slab = bpy.context.active_object
    slab.name = "tile"
    slab.scale = (W, H, T)
    bpy.ops.object.transform_apply(scale=True)
    bv = slab.modifiers.new("bevel", "BEVEL")
    bv.width = 0.010
    bv.segments = 12
    bv.limit_method = "NONE"
    bv2 = None
    for p in slab.data.polygons:
        p.use_smooth = True
    # relief: displaced grid laid on the flat top, inset from the rounded edges
    rw, rh = 0.104, 0.144
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=520, y_subdivisions=720, size=1.0, location=(0, 0, T + 0.00002))
    relief = bpy.context.active_object
    relief.name = "relief"
    relief.scale = (rw, rh, 1)
    bpy.ops.object.transform_apply(scale=True)
    tex = bpy.data.textures.new("emboss", "IMAGE")
    tex.image = bpy.data.images.load(os.path.join(C.TEX, "emboss_tile.png"))
    tex.image.colorspace_settings.name = "Non-Color"
    tex.extension = "EXTEND"
    dm = relief.modifiers.new("emboss", "DISPLACE")
    dm.texture = tex
    dm.texture_coords = "UV"
    dm.strength = 0.0042
    dm.mid_level = 0.0
    for p in relief.data.polygons:
        p.use_smooth = True
    m, nt, out = C.new_mat("tile_clay")
    pr = C.principled(nt, (300, 0), base=(0.42, 0.42, 0.415, 1), rough=0.92, spec=0.25, sss=0.05,
                      sss_radius=(1, 0.9, 0.8), sss_scale=0.002)
    tc = C.N(nt, "ShaderNodeTexCoord", (-900, -200))
    nz = C.N(nt, "ShaderNodeTexNoise", (-700, -200))
    nz.inputs["Scale"].default_value = 2600.0
    nz.inputs["Detail"].default_value = 3.0
    C.L(nt, tc, nz, "Object", "Vector")
    vz = C.N(nt, "ShaderNodeTexVoronoi", (-700, -450))
    vz.inputs["Scale"].default_value = 900.0
    C.L(nt, tc, vz, "Object", "Vector")
    ad = C.N(nt, "ShaderNodeMath", (-450, -300), _operation="ADD")
    C.L(nt, nz, ad, "Fac", 0)
    C.L(nt, vz, ad, "Distance", 1)
    bp = C.N(nt, "ShaderNodeBump", (0, -300))
    bp.inputs["Strength"].default_value = 0.35
    bp.inputs["Distance"].default_value = 0.00012
    C.L(nt, ad, bp, 0, "Height")
    C.L(nt, bp, pr, 0, "Normal")
    C.L(nt, pr, out, 0, "Surface")
    slab.data.materials.append(m)
    relief.data.materials.append(m)
    par = C.empty("tile_root")
    C.parent([slab, relief], par)
    par.rotation_euler = (0, 0, math.radians(-8))
    C.setup_world(hdri_strength=0.18, transmission_color=C.lin((0x9A, 0xA4, 0xAD)))
    t = (0, 0, T)
    C.area("key", (-0.55, 0.32, 0.22), t, 0.22, 0.5, energy=3.6, spread=60)   # raking, top-left
    C.area("fill", (0.6, -0.5, 0.6), t, 0.9, 0.9, energy=0.6, spread=120, shadow=False)
    C.area("top", (0.1, 0.1, 0.9), t, 0.6, 0.6, energy=0.8, spread=100)
    C.shadow_catcher(0.8)
    elev = math.radians(66)
    d = 0.56 if res[1] >= res[0] else 0.50
    C.camera((0, -d * math.cos(elev), T + d * math.sin(elev)), (0, 0.004, T), lens=85.0, fstop=8.0)
    return dict(exposure=-0.2)


STACK = ["08-2-smoke", "08-1", "08-2", "08-1-smoke", "08-1", "08-2", "08-2-smoke"]


def stack(res):
    """Droppers floating in a diagonal stack (after pins #13, #38)."""
    import build_dropper as BD
    n = len(STACK)
    settles = []
    for i, var in enumerate(STACK):
        root, info = BD.build(var, lying=True)
        k = i - (n - 1) / 2
        root.location = (-0.016 * k + (0.005 if i % 2 else -0.005) - 0.052, 0.006 * (i % 2), 0.0352 * k + 0.16)
        # lie the bottle down (bulb to camera-right), label toward camera; small yaw/roll variety
        root.rotation_euler = (math.radians(-10 + 6 * (i % 2)), math.radians(90), math.radians(-30 + 2.5 * k))
        root.rotation_mode = "XYZ"
        settles.append(info.get("settle"))
    bpy.context.view_layer.update()
    for fn in settles:  # liquid finds its level in each tilted bottle
        if fn:
            fn(None)
    C.setup_world(hdri_strength=0.35, transmission_color=C.lin((0x9A, 0xA4, 0xAD)))
    C.studio_rig(scale=1.7, key=1.0, rim=0.9, center=(0, 0, 0.16), back=0.0, fill=0.8, flags=True)
    bl = C.card("backlight", (0, 0.40, 0.16), (0, -1.0, 0.16), 0.30, 0.34, color=(1, 1, 1, 1), emission=1.6,
                soft=True)
    bl.visible_diffuse = False
    bl.visible_glossy = False
    elev = math.radians(-4)
    d = 0.46 if res[1] >= res[0] else 0.42
    cam = C.camera((0.03, -d * math.cos(elev), 0.16 + d * math.sin(elev)), (0.012, 0, 0.16), lens=85.0, fstop=5.6,
                   focus=d - 0.012)
    cam.rotation_euler[1] += math.radians(-6)  # slight dutch tilt
    return dict(exposure=-0.45)


def build(name, res):
    if name == "sculpt-emboss":
        return sculpt_emboss(res)
    if name == "08-stack":
        return stack(res)
    if name == "sculpt-capsule":
        return sculpt_capsule(res)
    if name == "sculpt-halo":
        return sculpt_halo(res)
    if name == "sculpt-halo-motion":
        return sculpt_halo(res, motion=True)
    if name == "08-group":
        return group(res)
    raise SystemExit("unknown scene " + name)
