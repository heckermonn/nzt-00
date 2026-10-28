"""Shared P4CE studio: geometry helpers, materials, lighting rig, cyc, render setup.

All units are metres at real product scale (a 30 ml dropper is ~11 cm tall).
"""
import math
import os

import bmesh
import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, "tex")
HDRI = os.path.join(HERE, "hdri", "studio_small_09_2k.hdr")
RENDERS = os.path.normpath(os.path.join(HERE, "..", "assets", "renders"))

FOG = (0xC9, 0xD0, 0xD6)
SLATE = (0x6E, 0x7A, 0x84)


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin(rgb, a=1.0):
    return tuple(srgb_to_lin(v) for v in rgb) + (a,)


# --------------------------------------------------------------------------
# scene
# --------------------------------------------------------------------------

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    return sc


def setup_render(w, h, samples=128, transparent=True, threads=4, look="AgX - Medium High Contrast",
                 exposure=0.0, adaptive=0.012):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = adaptive
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    cy.denoising_prefilter = "ACCURATE"
    try:
        cy.denoising_quality = "HIGH"
    except Exception:
        pass
    cy.max_bounces = 24
    cy.diffuse_bounces = 4
    cy.glossy_bounces = 8
    cy.transmission_bounces = 24
    cy.transparent_max_bounces = 16
    cy.volume_bounces = 0
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.5
    cy.sample_clamp_indirect = 8.0
    cy.film_transparent_glass = True
    cy.film_transparent_roughness = 0.05  # frosted glass stays opaque (keeps its frost)
    cy.tile_size = 1024
    sc.render.film_transparent = transparent
    sc.render.resolution_x = w
    sc.render.resolution_y = h
    sc.render.resolution_percentage = 100
    sc.render.threads_mode = "FIXED"
    sc.render.threads = threads
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA" if transparent else "RGB"
    sc.render.image_settings.color_depth = "8"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = look
    sc.view_settings.exposure = exposure
    sc.render.filter_size = 1.2
    return sc


# --------------------------------------------------------------------------
# profiles and lathe
# --------------------------------------------------------------------------

def fillet(points, radii, n=10):
    """Round the interior corners of a 2D polyline.

    points: [(r, z), ...]; radii: same length (ends ignored). Returns list of
    (r, z, src) where src is the index of the source corner (for materials).
    """
    out = []
    P = [np.array(p, float) for p in points]
    for i, p in enumerate(P):
        rad = radii[i] if 0 < i < len(P) - 1 else 0.0
        if rad <= 0:
            out.append((p[0], p[1], i))
            continue
        a, c = P[i - 1], P[i + 1]
        u = (a - p) / np.linalg.norm(a - p)
        v = (c - p) / np.linalg.norm(c - p)
        cosang = np.clip(np.dot(u, v), -1, 1)
        ang = math.acos(cosang)
        if ang > math.pi - 1e-4 or ang < 1e-4:
            out.append((p[0], p[1], i))
            continue
        d = rad / math.tan(ang / 2)
        d = min(d, 0.49 * np.linalg.norm(a - p), 0.49 * np.linalg.norm(c - p))
        rad_eff = d * math.tan(ang / 2)
        t1 = p + u * d
        t2 = p + v * d
        bis = (u + v) / np.linalg.norm(u + v)
        ctr = p + bis * (rad_eff / math.sin(ang / 2))
        a1 = math.atan2(*(t1 - ctr)[::-1])
        a2 = math.atan2(*(t2 - ctr)[::-1])
        da = a2 - a1
        while da > math.pi:
            da -= 2 * math.pi
        while da < -math.pi:
            da += 2 * math.pi
        for k in range(n + 1):
            t = a1 + da * k / n
            q = ctr + rad_eff * np.array([math.cos(t), math.sin(t)])
            out.append((q[0], q[1], i))
    return out


def resample(prof, max_step):
    """Insert points so no segment is longer than max_step (keeps src tags)."""
    res = [prof[0]]
    for a, b in zip(prof[:-1], prof[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        k = max(1, int(math.ceil(L / max_step)))
        for j in range(1, k + 1):
            t = j / k
            res.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, b[2] if j == k else a[2] if t < 1 else b[2]))
    return res


def lathe(name, prof, segs=192, mat_of=None, rmod=None, label_uv=None, label_back=None, smooth_angle=35.0,
          collection=None):
    """Revolve a profile [(r, z, tag), ...] around Z.

    mat_of(tag_a, tag_b, i) -> material slot index per profile segment.
    rmod(theta, z, r) -> new radius (for knurls).
    label_uv: dict(r=..., z0=..., w=..., h=...) adds a 'label' UV map whose
      unit square is a w x h (metres) patch centred on the front (-Y) at z0.
    Front of the object faces -Y (camera side). theta=0 at +Y (back).
    """
    pts = [(p[0], p[1]) for p in prof]
    tags = [p[2] if len(p) > 2 else 0 for p in prof]
    n = len(pts)
    bm = bmesh.new()
    uv_main = bm.loops.layers.uv.new("UVMap")
    uv_lab = bm.loops.layers.uv.new("label") if label_uv else None
    uv_back = bm.loops.layers.uv.new("label_back") if label_back else None
    ring = []  # per profile pt: list of verts (len 1 if pole)
    thetas = [2 * math.pi * j / segs for j in range(segs)]
    for i, (r, z) in enumerate(pts):
        if r < 1e-7:
            ring.append([bm.verts.new((0.0, 0.0, z))])
        else:
            vs = []
            for th in thetas:
                rr = rmod(th, z, r) if rmod else r
                vs.append(bm.verts.new((rr * math.sin(th), rr * math.cos(th), z)))
            ring.append(vs)
    # arc-length v coordinate
    vcoord = [0.0]
    for i in range(1, n):
        vcoord.append(vcoord[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))

    for i in range(n - 1):
        A, B = ring[i], ring[i + 1]
        mi = mat_of(tags[i], tags[i + 1], i) if mat_of else 0
        for j in range(segs):
            j2 = (j + 1) % segs
            th1, th2 = thetas[j], (thetas[j] + 2 * math.pi / segs)
            if len(A) == 1 and len(B) == 1:
                continue
            if len(A) == 1:
                vs = [A[0], B[j2], B[j]]
                ths = [(th1 + th2) / 2, th2, th1]
                zs = [pts[i][1], pts[i + 1][1], pts[i + 1][1]]
                vv = [vcoord[i], vcoord[i + 1], vcoord[i + 1]]
            elif len(B) == 1:
                vs = [A[j], A[j2], B[0]]
                ths = [th1, th2, (th1 + th2) / 2]
                zs = [pts[i][1], pts[i][1], pts[i + 1][1]]
                vv = [vcoord[i], vcoord[i], vcoord[i + 1]]
            else:
                vs = [A[j], A[j2], B[j2], B[j]]
                ths = [th1, th2, th2, th1]
                zs = [pts[i][1], pts[i][1], pts[i + 1][1], pts[i + 1][1]]
                vv = [vcoord[i], vcoord[i], vcoord[i + 1], vcoord[i + 1]]
            try:
                f = bm.faces.new(vs)
            except ValueError:
                continue
            f.material_index = mi
            f.smooth = True
            for loop, th, z, v in zip(f.loops, ths, zs, vv):
                loop[uv_main].uv = (th / (2 * math.pi), v)
                if uv_lab:
                    # label u: arc length to camera-right from the front centre
                    s = (math.pi - th) * label_uv["r"]  # th<pi is camera-right
                    loop[uv_lab].uv = (0.5 + s / label_uv["w"], (z - label_uv["z0"]) / label_uv["h"] + 0.5)
                if uv_back:
                    thc = (th1 + th2) / 2  # branch per face so no face straddles the wrap
                    tb = th if thc <= math.pi else th - 2 * math.pi
                    sb = -tb * label_back["r"]
                    loop[uv_back].uv = (0.5 + sb / label_back["w"], (z - label_back["z0"]) / label_back["h"] + 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.set_sharp_from_angle(angle=math.radians(smooth_angle))
    ob = bpy.data.objects.new(name, me)
    (collection or bpy.context.scene.collection).objects.link(ob)
    return ob


def assign(ob, *mats):
    ob.data.materials.clear()
    for m in mats:
        ob.data.materials.append(m)


# --------------------------------------------------------------------------
# node helpers
# --------------------------------------------------------------------------

def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    out.location = (600, 0)
    return m, nt, out


def N(nt, kind, loc=(0, 0), **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in inputs.items():
        if k.startswith("_"):
            setattr(n, k[1:], v)
        else:
            n.inputs[k].default_value = v
    return n


def L(nt, a, b, ao=0, bi=0):
    nt.links.new(a.outputs[ao] if not isinstance(ao, str) else a.outputs[ao],
                 b.inputs[bi] if not isinstance(bi, str) else b.inputs[bi])


def principled(nt, loc=(0, 0), **kw):
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    p.location = loc
    names = {
        "base": "Base Color", "metal": "Metallic", "rough": "Roughness", "ior": "IOR",
        "trans": "Transmission Weight", "aniso": "Anisotropic", "aniso_rot": "Anisotropic Rotation",
        "spec": "Specular IOR Level", "coat": "Coat Weight", "coat_rough": "Coat Roughness",
        "sheen": "Sheen Weight", "sheen_rough": "Sheen Roughness", "sheen_tint": "Sheen Tint",
        "sss": "Subsurface Weight", "sss_radius": "Subsurface Radius", "sss_scale": "Subsurface Scale",
        "spec_tint": "Specular Tint",
    }
    for k, v in kw.items():
        p.inputs[names[k]].default_value = v
    return p


def cyl_coords(nt, loc=(-1400, 0)):
    """Object-space cylindrical coords: returns node outputting (r, z, theta)."""
    tc = N(nt, "ShaderNodeTexCoord", loc)
    sep = N(nt, "ShaderNodeSeparateXYZ", (loc[0] + 180, loc[1]))
    L(nt, tc, sep, "Object", 0)
    r2 = N(nt, "ShaderNodeVectorMath", (loc[0] + 360, loc[1] + 80), _operation="LENGTH")
    comb_xy = N(nt, "ShaderNodeCombineXYZ", (loc[0] + 360, loc[1] + 200))
    L(nt, sep, comb_xy, "X", "X")
    L(nt, sep, comb_xy, "Y", "Y")
    L(nt, comb_xy, r2, 0, 0)
    th = N(nt, "ShaderNodeMath", (loc[0] + 360, loc[1] - 80), _operation="ARCTAN2")
    L(nt, sep, th, "Y", 0)
    L(nt, sep, th, "X", 1)
    comb = N(nt, "ShaderNodeCombineXYZ", (loc[0] + 540, loc[1]))
    L(nt, r2, comb, "Value", "X")
    L(nt, sep, comb, "Z", "Y")
    L(nt, th, comb, 0, "Z")
    return comb


def brushed_roughness(nt, base_rough, amp, loc=(-800, 300), radial=True, scale_line=900.0, scale_th=0.6):
    """Roughness with lathe-turned streaks: lines run around the axis."""
    cc = cyl_coords(nt, (loc[0] - 700, loc[1]))
    mp = N(nt, "ShaderNodeMapping", (loc[0] - 150, loc[1]))
    mp.inputs["Scale"].default_value = (scale_line, scale_line, scale_th)
    L(nt, cc, mp, 0, 0)
    nz = N(nt, "ShaderNodeTexNoise", (loc[0], loc[1]), _noise_dimensions="3D")
    nz.inputs["Scale"].default_value = 1.0
    nz.inputs["Detail"].default_value = 8.0
    nz.inputs["Roughness"].default_value = 0.65
    L(nt, mp, nz, 0, "Vector")
    mr = N(nt, "ShaderNodeMapRange", (loc[0] + 200, loc[1]))
    mr.inputs["From Min"].default_value = 0.3
    mr.inputs["From Max"].default_value = 0.7
    mr.inputs["To Min"].default_value = base_rough - amp
    mr.inputs["To Max"].default_value = base_rough + amp
    L(nt, nz, mr, "Fac", "Value")
    return mr, nz


def micro_bump(nt, strength=0.05, scale=3000.0, loc=(-500, -500), detail=4.0):
    tc = N(nt, "ShaderNodeTexCoord", (loc[0] - 400, loc[1]))
    nz = N(nt, "ShaderNodeTexNoise", (loc[0] - 200, loc[1]))
    nz.inputs["Scale"].default_value = scale
    nz.inputs["Detail"].default_value = detail
    L(nt, tc, nz, "Object", "Vector")
    bp = N(nt, "ShaderNodeBump", loc)
    bp.inputs["Strength"].default_value = strength
    bp.inputs["Distance"].default_value = 0.0002
    L(nt, nz, bp, "Fac", "Height")
    return bp


def tangent_z(nt, loc=(-300, -700)):
    t = N(nt, "ShaderNodeTangent", loc, _direction_type="RADIAL", _axis="Z")
    return t


def shadow_transparent(nt, surf_node, out, tint=(0.82, 0.85, 0.87, 1), loc=(300, 0)):
    """Let shadow rays pass (tinted) so glass casts soft light shadows without caustics."""
    lp = N(nt, "ShaderNodeLightPath", (loc[0] - 200, loc[1] + 250))
    tr = N(nt, "ShaderNodeBsdfTransparent", (loc[0] - 200, loc[1] - 150))
    tr.inputs["Color"].default_value = tint
    mx = N(nt, "ShaderNodeMixShader", loc)
    L(nt, lp, mx, "Is Shadow Ray", 0)
    L(nt, surf_node, mx, 0, 1)
    L(nt, tr, mx, 0, 2)
    L(nt, mx, out, 0, "Surface")
    return mx


def img_node(nt, path, loc, uv="label", colorspace="Non-Color", extension="CLIP", interp="Cubic"):
    im = bpy.data.images.load(path, check_existing=True)
    im.colorspace_settings.name = colorspace
    tx = N(nt, "ShaderNodeTexImage", loc)
    tx.image = im
    tx.extension = extension
    tx.interpolation = interp
    uvn = N(nt, "ShaderNodeUVMap", (loc[0] - 200, loc[1]))
    uvn.uv_map = uv
    L(nt, uvn, tx, 0, 0)
    return tx


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------

def add_absorption(nt, out, absorb):
    """Coloured glass body: absorption-only volume, so thick sections read deeper."""
    if not absorb:
        return
    col, dens = absorb
    va = N(nt, "ShaderNodeVolumeAbsorption", (300, -500))
    va.inputs["Color"].default_value = col
    va.inputs["Density"].default_value = dens
    L(nt, va, out, 0, "Volume")


def mat_frost_glass(name="frost_glass", rough=0.26, tint=(0.96, 0.975, 0.985, 1), label=None, ink=(0.03, 0.035, 0.04, 1),
                    ink_mode="print", back_label=None, absorb=None, shadow_tint=(0.55, 0.58, 0.6, 1)):
    """Acid-etched glass outer surface. Optional printed label (image alpha = ink).

    ink_mode 'print': opaque satin ink. 'clear': the label is left un-etched (clear window).
    """
    m, nt, out = new_mat(name)
    g = principled(nt, (-200, 0), base=tint, rough=rough, ior=1.47, trans=1.0, spec=1.0)
    # roughness variation (etch is never uniform)
    tc = N(nt, "ShaderNodeTexCoord", (-1400, 300))
    nz = N(nt, "ShaderNodeTexNoise", (-1200, 300))
    nz.inputs["Scale"].default_value = 60.0
    nz.inputs["Detail"].default_value = 3.0
    L(nt, tc, nz, "Object", "Vector")
    mr = N(nt, "ShaderNodeMapRange", (-1000, 300))
    mr.inputs["To Min"].default_value = rough - 0.03
    mr.inputs["To Max"].default_value = rough + 0.04
    L(nt, nz, mr, "Fac", "Value")
    L(nt, mr, g, "Result", "Roughness")
    bp = micro_bump(nt, strength=0.04, scale=9000.0, loc=(-500, -500), detail=2.0)
    L(nt, bp, g, 0, "Normal")
    surf = g
    if label:
        tx = img_node(nt, label, (-900, -200))
        alpha = tx.outputs["Alpha"]
        if back_label:
            tb = img_node(nt, back_label, (-900, -450), uv="label_back")
            mxa = N(nt, "ShaderNodeMath", (-650, -300), _operation="MAXIMUM")
            L(nt, tx, mxa, "Alpha", 0)
            L(nt, tb, mxa, "Alpha", 1)
            alpha = mxa.outputs[0]
        if ink_mode == "print":
            inkn = principled(nt, (-200, -500), base=ink, rough=0.38, spec=0.5)
            L(nt, bp, inkn, 0, "Normal")
        else:  # clear window in the frost
            inkn = principled(nt, (-200, -500), base=tint, rough=0.03, ior=1.47, trans=1.0)
        # seen from inside the glass the ink would show as a dark ghost; keep it glass there
        geo = N(nt, "ShaderNodeNewGeometry", (-650, -650))
        fr = N(nt, "ShaderNodeMath", (-450, -600), _operation="SUBTRACT", _use_clamp=True)
        nt.links.new(alpha, fr.inputs[0])
        L(nt, geo, fr, "Backfacing", 1)
        mx = N(nt, "ShaderNodeMixShader", (150, -100))
        L(nt, fr, mx, 0, 0)
        L(nt, g, mx, 0, 1)
        L(nt, inkn, mx, 0, 2)
        surf = mx
    shadow_transparent(nt, surf, out, tint=shadow_tint, loc=(400, 0))
    add_absorption(nt, out, absorb)
    return m


def mat_clear_glass(name="clear_glass", tint=(0.97, 0.985, 0.99, 1), rough=0.0, absorb=None,
                    shadow_tint=(0.82, 0.85, 0.87, 1)):
    m, nt, out = new_mat(name)
    g = principled(nt, (-200, 0), base=tint, rough=rough, ior=1.47, trans=1.0)
    shadow_transparent(nt, g, out, tint=shadow_tint, loc=(300, 0))
    add_absorption(nt, out, absorb)
    return m


def mat_liquid(name="liquid", tint=(0.985, 0.99, 1.0, 1)):
    m, nt, out = new_mat(name)
    g = principled(nt, (-200, 0), base=tint, rough=0.0, ior=1.36, trans=1.0)
    shadow_transparent(nt, g, out, tint=(0.9, 0.92, 0.93, 1), loc=(300, 0))
    return m


def mat_beadblast_alu(name="alu_beadblast", base=(0.80, 0.81, 0.82, 1), rough=0.21):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, metal=1.0, rough=rough, aniso=0.0)
    tc = N(nt, "ShaderNodeTexCoord", (-900, 300))
    nz = N(nt, "ShaderNodeTexNoise", (-700, 300))
    nz.inputs["Scale"].default_value = 140.0
    L(nt, tc, nz, "Object", "Vector")
    mr = N(nt, "ShaderNodeMapRange", (-500, 300))
    mr.inputs["To Min"].default_value = rough - 0.03
    mr.inputs["To Max"].default_value = rough + 0.04
    L(nt, nz, mr, "Fac", "Value")
    L(nt, mr, p, "Result", "Roughness")
    bp = micro_bump(nt, strength=0.08, scale=12000.0, detail=1.0)
    L(nt, bp, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_brushed_steel(name="steel_brushed", base=(0.78, 0.78, 0.77, 1), rough=0.20, aniso=0.75, height_img=None,
                      deboss_strength=1.0):
    m, nt, out = new_mat(name)
    p = principled(nt, (200, 0), base=base, metal=1.0, rough=rough, aniso=aniso)
    mr, nz = brushed_roughness(nt, rough, 0.035, loc=(-700, 300), scale_line=26000.0, scale_th=0.4)
    L(nt, mr, p, "Result", "Roughness")
    t = tangent_z(nt, (-300, -700))
    L(nt, t, p, 0, "Tangent")
    # brushing grooves as fine bump from the same streak noise
    bp = N(nt, "ShaderNodeBump", (-100, -400))
    bp.inputs["Strength"].default_value = 0.012
    bp.inputs["Distance"].default_value = 0.00001
    L(nt, nz, bp, "Fac", "Height")
    nrm = bp
    if height_img:
        tx = img_node(nt, height_img, (-900, -900), uv="label", extension="EXTEND", interp="Cubic")
        inv = N(nt, "ShaderNodeMath", (-600, -900), _operation="MULTIPLY")
        inv.inputs[1].default_value = -1.0
        L(nt, tx, inv, "Color", 0)
        bp2 = N(nt, "ShaderNodeBump", (100, -600))
        bp2.inputs["Strength"].default_value = deboss_strength
        bp2.inputs["Distance"].default_value = 0.00035
        L(nt, inv, bp2, 0, "Height")
        L(nt, bp, bp2, 0, "Normal")
        # debossed floor is bead-blasted: rougher, no anisotropy
        mx_r = N(nt, "ShaderNodeMix", (0, 200), _data_type="FLOAT")
        L(nt, tx, mx_r, "Color", "Factor")
        L(nt, mr, mx_r, "Result", 2)
        mx_r.inputs[3].default_value = 0.42
        L(nt, mx_r, p, 0, "Roughness")
        mx_a = N(nt, "ShaderNodeMix", (0, 400), _data_type="FLOAT")
        L(nt, tx, mx_a, "Color", "Factor")
        mx_a.inputs[2].default_value = aniso
        mx_a.inputs[3].default_value = 0.0
        L(nt, mx_a, p, 0, "Anisotropic")
        nrm = bp2
    L(nt, nrm, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_anodised(name="anodised", base=(0.40, 0.41, 0.42, 1), rough=0.36, label=None, back_label=None,
                 ink=(0.02, 0.021, 0.023, 1)):
    """Bead-blasted anodised aluminium canister (pin #28) with pad-printed ink."""
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, metal=1.0, rough=rough)
    tc = N(nt, "ShaderNodeTexCoord", (-900, 300))
    nz = N(nt, "ShaderNodeTexNoise", (-700, 300))
    nz.inputs["Scale"].default_value = 160.0
    L(nt, tc, nz, "Object", "Vector")
    mr = N(nt, "ShaderNodeMapRange", (-500, 300))
    mr.inputs["To Min"].default_value = rough - 0.03
    mr.inputs["To Max"].default_value = rough + 0.03
    L(nt, nz, mr, "Fac", "Value")
    L(nt, mr, p, "Result", "Roughness")
    bp = micro_bump(nt, strength=0.10, scale=14000.0, detail=1.0)
    L(nt, bp, p, 0, "Normal")
    surf = p
    if label:
        surf = _ink_mix(nt, p, bp, label, back_label, ink, ink_rough=0.80)
    L(nt, surf, out, 0, "Surface")
    return m


def _ink_mix(nt, base_shader, bump, label, back_label, ink, ink_rough=0.4, ink_metal=0.0):
    tx = img_node(nt, label, (-900, -200))
    alpha = tx.outputs["Alpha"]
    if back_label:
        tb = img_node(nt, back_label, (-900, -450), uv="label_back")
        mxa = N(nt, "ShaderNodeMath", (-650, -300), _operation="MAXIMUM")
        L(nt, tx, mxa, "Alpha", 0)
        L(nt, tb, mxa, "Alpha", 1)
        alpha = mxa.outputs[0]
    inkn = principled(nt, (0, -500), base=ink, rough=ink_rough, spec=0.35 if ink_rough > 0.6 else 0.5, metal=ink_metal)
    if bump is not None:
        L(nt, bump, inkn, 0, "Normal")
    mx = N(nt, "ShaderNodeMixShader", (300, -100))
    nt.links.new(alpha, mx.inputs[0])
    L(nt, base_shader, mx, 0, 1)
    L(nt, inkn, mx, 0, 2)
    return mx


def mat_label_film(name="label_film", base=(0.50, 0.505, 0.51, 1), label=None, back_label=None,
                   ink=(0.015, 0.016, 0.018, 1)):
    """Matte silver label film (pin #13): metallic, fine grain, satin; black print."""
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, metal=1.0, rough=0.34, spec=0.5)
    bp = micro_bump(nt, strength=0.06, scale=20000.0, detail=2.0)
    L(nt, bp, p, 0, "Normal")
    surf = _ink_mix(nt, p, bp, label, back_label, ink, ink_rough=0.5) if label else p
    L(nt, surf, out, 0, "Surface")
    return m


def mat_soft_touch(name="soft_touch", base=(0.80, 0.77, 0.72, 1), rough=0.62):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, rough=rough, spec=0.32, sheen=0.25, sheen_rough=0.45,
                   sheen_tint=(1, 1, 1, 1), coat=0.0)
    bp = micro_bump(nt, strength=0.06, scale=5000.0, detail=2.0)
    L(nt, bp, p, 0, "Normal")
    tc = N(nt, "ShaderNodeTexCoord", (-900, 300))
    nz = N(nt, "ShaderNodeTexNoise", (-700, 300))
    nz.inputs["Scale"].default_value = 90.0
    L(nt, tc, nz, "Object", "Vector")
    mr = N(nt, "ShaderNodeMapRange", (-500, 300))
    mr.inputs["To Min"].default_value = rough - 0.05
    mr.inputs["To Max"].default_value = rough + 0.05
    L(nt, nz, mr, "Fac", "Value")
    L(nt, mr, p, "Result", "Roughness")
    L(nt, p, out, 0, "Surface")
    return m


def mat_porcelain(name="porcelain", base=(0.86, 0.865, 0.86, 1), rough=0.42, label=None, ink=(0.035, 0.04, 0.045, 1),
                  back_label=None, sss=0.12, spec=0.45):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, rough=rough, spec=spec, sss=sss, sss_radius=(1.0, 0.9, 0.8),
                   sss_scale=0.0015, coat=0.0)
    tc = N(nt, "ShaderNodeTexCoord", (-1200, 400))
    nz = N(nt, "ShaderNodeTexNoise", (-1000, 400))
    nz.inputs["Scale"].default_value = 70.0
    nz.inputs["Detail"].default_value = 4.0
    L(nt, tc, nz, "Object", "Vector")
    mr = N(nt, "ShaderNodeMapRange", (-800, 400))
    mr.inputs["To Min"].default_value = rough - 0.06
    mr.inputs["To Max"].default_value = rough + 0.06
    L(nt, nz, mr, "Fac", "Value")
    L(nt, mr, p, "Result", "Roughness")
    bp = micro_bump(nt, strength=0.035, scale=4000.0, detail=3.0)
    L(nt, bp, p, 0, "Normal")
    surf = p
    if label:
        tx = img_node(nt, label, (-900, -200))
        alpha = tx.outputs["Alpha"]
        if back_label:
            tb = img_node(nt, back_label, (-900, -450), uv="label_back")
            mxa = N(nt, "ShaderNodeMath", (-650, -300), _operation="MAXIMUM")
            L(nt, tx, mxa, "Alpha", 0)
            L(nt, tb, mxa, "Alpha", 1)
            alpha = mxa.outputs[0]
        inkn = principled(nt, (0, -500), base=ink, rough=0.33, spec=0.5)
        L(nt, bp, inkn, 0, "Normal")
        mx = N(nt, "ShaderNodeMixShader", (300, -100))
        nt.links.new(alpha, mx.inputs[0])
        L(nt, p, mx, 0, 1)
        L(nt, inkn, mx, 0, 2)
        surf = mx
    L(nt, surf, out, 0, "Surface")
    return m


def mat_clay(name="clay", base=(0.84, 0.83, 0.81, 1), rough=0.78, sss=0.15):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, rough=rough, spec=0.3, sss=sss, sss_radius=(1.0, 0.85, 0.7),
                   sss_scale=0.004)
    bp = micro_bump(nt, strength=0.05, scale=900.0, detail=6.0)
    L(nt, bp, p, 0, "Normal")
    L(nt, p, out, 0, "Surface")
    return m


def mat_diffuse(name, base, rough=0.9):
    m, nt, out = new_mat(name)
    p = principled(nt, (0, 0), base=base, rough=rough, spec=0.2)
    L(nt, p, out, 0, "Surface")
    return m


# --------------------------------------------------------------------------
# world, lights, cyc, camera
# --------------------------------------------------------------------------

def setup_world(hdri_strength=0.55, rot_deg=0.0, transmission_color=None, cam_color=None):
    """HDRI for reflections and fill. Transmission rays that escape see fog (the site background)."""
    w = bpy.data.worlds.new("studio")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = N(nt, "ShaderNodeOutputWorld", (900, 0))
    tc = N(nt, "ShaderNodeTexCoord", (-900, 0))
    mp = N(nt, "ShaderNodeMapping", (-700, 0))
    mp.inputs["Rotation"].default_value = (0, 0, math.radians(rot_deg))
    L(nt, tc, mp, "Generated", 0)
    env = N(nt, "ShaderNodeTexEnvironment", (-500, 0))
    env.image = bpy.data.images.load(HDRI, check_existing=True)
    L(nt, mp, env, 0, 0)
    hsv = N(nt, "ShaderNodeHueSaturation", (-250, 0))
    hsv.inputs["Saturation"].default_value = 0.0
    L(nt, env, hsv, 0, "Color")
    bg = N(nt, "ShaderNodeBackground", (0, 0))
    bg.inputs["Strength"].default_value = hdri_strength
    L(nt, hsv, bg, 0, 0)
    last = bg
    lp = N(nt, "ShaderNodeLightPath", (0, 300))
    if transmission_color is not None:
        bg2 = N(nt, "ShaderNodeBackground", (0, -200))
        bg2.inputs["Color"].default_value = transmission_color
        bg2.inputs["Strength"].default_value = 1.0
        mx = N(nt, "ShaderNodeMixShader", (300, 0))
        L(nt, lp, mx, "Is Transmission Ray", 0)
        L(nt, last, mx, 0, 1)
        L(nt, bg2, mx, 0, 2)
        last = mx
    if cam_color is not None:
        bg3 = N(nt, "ShaderNodeBackground", (300, -300))
        bg3.inputs["Color"].default_value = cam_color
        mx2 = N(nt, "ShaderNodeMixShader", (600, 0))
        L(nt, lp, mx2, "Is Camera Ray", 0)
        L(nt, last, mx2, 0, 1)
        L(nt, bg3, mx2, 0, 2)
        last = mx2
    L(nt, last, out, 0, 0)
    return w


def area(name, loc, target, size, size_y=None, energy=50.0, color=(1, 1, 1), spread=180.0, camera_visible=False,
         shape="RECTANGLE", shadow=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    ld.size = size
    ld.size_y = size_y if size_y else size
    ld.energy = energy
    ld.color = color
    ld.spread = math.radians(spread)
    ld.use_shadow = shadow
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    aim(ob, target)
    ob.visible_camera = camera_visible
    return ob


def aim(ob, target):
    from mathutils import Vector
    d = Vector(target) - Vector(ob.location)
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def card(name, loc, target, w, h, color=(0.0, 0.0, 0.0, 1), emission=0.0, soft=False):
    """Black flag / white card visible only to reflections & refraction."""
    me = bpy.data.meshes.new(name)
    hw, hh = w / 2, h / 2
    me.from_pydata([(-hw, -hh, 0), (hw, -hh, 0), (hw, hh, 0), (-hw, hh, 0)], [], [(0, 1, 2, 3)])
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    aim(ob, target)
    m, nt, out = new_mat(name + "_m")
    if emission > 0:
        e = N(nt, "ShaderNodeEmission", (0, 0))
        e.inputs["Color"].default_value = color
        e.inputs["Strength"].default_value = emission
        if soft:  # feathered diffuser: bright centre, soft falloff to the edges
            tc = N(nt, "ShaderNodeTexCoord", (-800, 0))
            gr = N(nt, "ShaderNodeTexGradient", (-600, 0), _gradient_type="SPHERICAL")
            L(nt, tc, gr, "Generated", 0) if False else None
            sep = N(nt, "ShaderNodeSeparateXYZ", (-600, 200))
            L(nt, tc, sep, "Generated", 0)
            # 1 - (2x-1)^2 bell across width, softer along height
            fx = N(nt, "ShaderNodeMath", (-400, 250), _operation="MULTIPLY_ADD")
            fx.inputs[1].default_value = 2.0
            fx.inputs[2].default_value = -1.0
            L(nt, sep, fx, "X", 0)
            px = N(nt, "ShaderNodeMath", (-250, 250), _operation="POWER")
            px.inputs[1].default_value = 2.0
            L(nt, fx, px, 0, 0)
            fy = N(nt, "ShaderNodeMath", (-400, 50), _operation="MULTIPLY_ADD")
            fy.inputs[1].default_value = 2.0
            fy.inputs[2].default_value = -1.0
            L(nt, sep, fy, "Y", 0)
            py = N(nt, "ShaderNodeMath", (-250, 50), _operation="POWER")
            py.inputs[1].default_value = 4.0
            L(nt, fy, py, 0, 0)
            ad = N(nt, "ShaderNodeMath", (-100, 150), _operation="ADD")
            L(nt, px, ad, 0, 0)
            L(nt, py, ad, 0, 1)
            inv = N(nt, "ShaderNodeMath", (50, 150), _operation="SUBTRACT", _use_clamp=True)
            inv.inputs[0].default_value = 1.0
            L(nt, ad, inv, 0, 1)
            mul = N(nt, "ShaderNodeMath", (200, 150), _operation="MULTIPLY")
            mul.inputs[1].default_value = emission
            L(nt, inv, mul, 0, 0)
            L(nt, mul, e, 0, "Strength")
        L(nt, e, out, 0, "Surface")
    else:
        p = principled(nt, (0, 0), base=color, rough=1.0, spec=0.0)
        L(nt, p, out, 0, "Surface")
    me.materials.append(m)
    ob.visible_camera = False
    ob.visible_diffuse = emission > 0
    ob.visible_shadow = False
    return ob


def studio_rig(scale=1.0, key=1.0, rim=1.0, flags=True, center=(0, 0, 0.05), warm=False, back=1.0, back_w=0.05,
               back_h=0.10, fill=1.0, top=1.0):
    """Softbox rig: big key camera-left, top scrim, two strip rims, fill card, black flags.

    scale ~ object height in units of 0.1 m.
    """
    s = scale
    cx, cy, cz = center
    t = (cx, cy, cz)
    objs = []
    kc = (1.0, 0.955, 0.90)  # slightly warm key (v2)
    objs.append(area("key", (cx - 0.55 * s, cy - 0.45 * s, cz + 0.42 * s), t, 0.45 * s, 0.70 * s,
                     energy=4.6 * key * s * s, color=kc, spread=75))
    # large top-rear strip: rims along shoulders, cap edges and the glass top contour
    objs.append(area("toprear", (cx, cy + 0.34 * s, cz + 0.46 * s), t, 0.80 * s, 0.07 * s,
                     energy=4.2 * rim * top * s * s, color=(0.97, 0.985, 1.0), spread=60))
    objs.append(area("top", (cx + 0.03 * s, cy + 0.12 * s, cz + 0.65 * s), t, 0.50 * s, 0.40 * s,
                     energy=1.6 * top * key * s * s, spread=100))
    objs.append(area("rimL", (cx - 0.40 * s, cy + 0.30 * s, cz + 0.06 * s), t, 0.05 * s, 0.70 * s,
                     energy=3.4 * rim * s * s, color=(0.96, 0.98, 1.0), spread=50, shadow=False))
    objs.append(area("rimR", (cx + 0.45 * s, cy + 0.40 * s, cz + 0.06 * s), t, 0.04 * s, 0.70 * s,
                     energy=1.6 * rim * s * s, color=(0.96, 0.98, 1.0), spread=40, shadow=False))
    objs.append(area("fill", (cx - 0.20 * s, cy - 0.75 * s, cz + 0.05 * s), t, 0.6 * s, 0.6 * s,
                     energy=0.35 * fill * key * s * s, spread=120, shadow=False))
    if back > 0:
        # diffuser behind the product, seen only through glass (bright-field glass lighting)
        bl = card("backlight", (cx, cy + 0.22 * s, cz), (cx, cy - 1.0, cz), back_w * s, back_h * s,
                  color=(1, 1, 1, 1), emission=back, soft=True)
        bl.visible_diffuse = False
        bl.visible_glossy = False
        objs.append(bl)
    if flags:
        dk = (0.006, 0.007, 0.008, 1)
        # negative fill: a big black card camera-right
        # (reflection-only, so the shadow catcher never reads it as a shadow)
        nf = card("negfill", (cx + 0.24 * s, cy - 0.06 * s, cz), t, 0.30 * s, 1.0 * s, color=dk)
        objs.append(nf)
        objs.append(card("flagL", (cx - 0.24 * s, cy + 0.08 * s, cz), t, 0.10 * s, 0.9 * s, color=dk))
        objs.append(card("flagFL", (cx - 0.17 * s, cy - 0.21 * s, cz + 0.02 * s), t, 0.06 * s, 0.9 * s, color=dk))
    return objs


def cyc(w=6.0, depth=3.0, height=3.0, radius=0.9, y_wall=1.0, top_col=None, bottom_col=None, name="cyc"):
    """Sweep: floor toward camera, curving up into a wall behind. Gradient by height."""
    prof = []
    n = 24
    for i in range(n + 1):
        prof.append((-depth + (depth - 0.001) * i / n, 0.0))
    for i in range(1, n + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / n
        prof.append((y_wall - radius + radius * math.cos(a) * 1.0 + 0.0, radius + radius * math.sin(a)))
    # fix: centre of the bend at (y_wall - radius, radius)
    prof = prof[: n + 1]
    for i in range(1, n + 1):
        a = -math.pi / 2 + (math.pi / 2) * i / n
        prof.append((y_wall - radius + radius * math.cos(a), radius + radius * math.sin(a)))
    for i in range(1, 9):
        prof.append((y_wall, radius + (height - radius) * i / 8))
    xs = np.linspace(-w / 2, w / 2, 9)
    verts, faces = [], []
    for x in xs:
        for (y, z) in prof:
            verts.append((x, y, z))
    P = len(prof)
    for i in range(len(xs) - 1):
        for j in range(P - 1):
            a = i * P + j
            faces.append((a, a + 1, a + P + 1, a + P))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    m, nt, out = new_mat(name + "_m")
    p = principled(nt, (300, 0), rough=0.85, spec=0.15)
    tc = N(nt, "ShaderNodeTexCoord", (-700, 0))
    sep = N(nt, "ShaderNodeSeparateXYZ", (-500, 0))
    L(nt, tc, sep, "Object", 0)
    mr = N(nt, "ShaderNodeMapRange", (-300, 0))
    mr.inputs["From Min"].default_value = 0.0
    mr.inputs["From Max"].default_value = 1.2
    L(nt, sep, mr, "Z", "Value")
    cr = N(nt, "ShaderNodeMix", (0, 0), _data_type="RGBA")
    cr.inputs[6].default_value = bottom_col or lin(FOG)
    cr.inputs[7].default_value = top_col or lin(SLATE)
    L(nt, mr, cr, "Result", "Factor")
    L(nt, cr, p, 2, "Base Color")
    L(nt, p, out, 0, "Surface")
    me.materials.append(m)
    return ob, m


def shadow_catcher(size=4.0, z=0.0):
    me = bpy.data.meshes.new("catcher")
    s = size / 2
    me.from_pydata([(-s, -s, z), (s, -s, z), (s, s, z), (-s, s, z)], [], [(0, 1, 2, 3)])
    ob = bpy.data.objects.new("catcher", me)
    bpy.context.scene.collection.objects.link(ob)
    ob.is_shadow_catcher = True
    m, nt, out = new_mat("catcher_m")
    p = principled(nt, (0, 0), base=lin(FOG), rough=0.9, spec=0.1)
    L(nt, p, out, 0, "Surface")
    me.materials.append(m)
    return ob


def camera(loc, target, lens=100.0, fstop=8.0, focus=None, sensor=36.0, shift_y=0.0):
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_width = sensor
    cd.sensor_fit = "AUTO"
    cd.clip_start = 0.01
    cd.clip_end = 100
    cd.shift_y = shift_y
    ob = bpy.data.objects.new("cam", cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    aim(ob, target)
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        cd.dof.aperture_blades = 9
        cd.dof.aperture_rotation = math.radians(10)
        from mathutils import Vector
        cd.dof.focus_distance = focus if focus else (Vector(target) - Vector(loc)).length
    bpy.context.scene.camera = ob
    return ob


def empty(name, loc=(0, 0, 0)):
    ob = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    return ob


def parent(children, par):
    for c in children:
        c.parent = par


def render_to(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.context.scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
