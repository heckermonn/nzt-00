"""PR6 / Institute: shared Blender helpers (scene setup, materials, reliefs from the insignia drawings, render + meta).

Every scene script renders one square frame to RAW/<frame>/: beauty.exr, pass_<group>.exr for each live light group,
depth.exr, and meta.json (screen positions of the things the page needs to find). post.py packs them for the page.
"""
import json, math, os, shutil, sys, time
import bpy, bmesh  # noqa
import numpy as np
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
INSIGNIA = json.load(open(os.path.join(HERE, "insignia.json")))
SYMS = ["ouroboros", "djed", "scarab", "shen"]


def lin(hexs):
    c = [int(hexs[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


CHALK, MIST, STEEL_BLUE, INK, ORANGE = lin("F2F3EF"), lin("CAD5DA"), lin("718B9A"), lin("171C1F"), lin("E98546")
DEEP_BLUE, SKY = lin("3F668F"), lin("A5C7DB")


def setup(res, samples, groups=(), volumes=False, bounces=8):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"; cy = sc.cycles
    cy.device = "CPU"; cy.samples = samples
    cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.012; cy.adaptive_min_samples = 16
    cy.use_denoising = False
    cy.max_bounces = bounces; cy.diffuse_bounces = 4; cy.glossy_bounces = 4; cy.transmission_bounces = 8
    cy.volume_bounces = 1 if volumes else 0; cy.volume_step_rate = 4.0; cy.volume_max_steps = 192
    cy.caustics_reflective = False; cy.caustics_refractive = False; cy.blur_glossy = 1.0
    cy.sample_clamp_indirect = 6.0; cy.use_light_tree = True
    sc.render.threads_mode = "FIXED"; sc.render.threads = 4
    sc.render.compositor_device = "CPU"
    sc.view_settings.view_transform = "Standard"
    sc.render.resolution_x = sc.render.resolution_y = res
    vl = sc.view_layers[0]
    vl.cycles.denoising_store_passes = True
    vl.use_pass_z = True
    for g in groups:
        vl.lightgroups.add(name=g)
    w = bpy.data.worlds.new("w"); sc.world = w; w.use_nodes = True
    return sc


def world(sc, rgb, strength):
    bg = sc.world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*rgb, 1); bg.inputs["Strength"].default_value = strength


def nodes(m):
    m.use_nodes = True
    return m.node_tree.nodes, m.node_tree.links


def plain(name, rgb, rough=0.7, metal=0.0, coat=0.0, spec=0.5):
    m = bpy.data.materials.new(name); n, _ = nodes(m)
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal; b.inputs["Coat Weight"].default_value = coat
    b.inputs["Specular IOR Level"].default_value = spec
    return m


def emit(name, rgb, strength):
    m = bpy.data.materials.new(name); n, l = nodes(m)
    n.remove(n["Principled BSDF"])
    e = n.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*rgb, 1); e.inputs["Strength"].default_value = strength
    l.new(e.outputs[0], n["Material Output"].inputs["Surface"])
    return m


def glass(name, rgb=(0.93, 0.96, 0.97), rough=0.0, ior=1.45):
    m = plain(name, rgb, rough); b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Transmission Weight"].default_value = 1.0; b.inputs["IOR"].default_value = ior
    return m


def noise_bump(m, scale=40, strength=0.2, dist=0.01, detail=6):
    n, l = nodes(m); b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry"); nz = n.new("ShaderNodeTexNoise")
    nz.inputs["Scale"].default_value = scale; nz.inputs["Detail"].default_value = detail
    l.new(geo.outputs["Position"], nz.inputs["Vector"])
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = strength; bp.inputs["Distance"].default_value = dist
    l.new(nz.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs[0], b.inputs["Normal"])
    return m


def mineral(name, base=CHALK, vary=0.06, band=(1.0, 1.0, 9.0), rough=(0.38, 0.6), bump=0.08, scale=0.35):
    """Honed pale stone: faint sedimentary banding (travertine-like), small pits, a soft sheen."""
    m = bpy.data.materials.new(name); n, l = nodes(m); b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = band
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    n1 = n.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = scale; n1.inputs["Detail"].default_value = 7
    n1.inputs["Roughness"].default_value = 0.6; n1.inputs["Distortion"].default_value = 0.6
    l.new(mp.outputs[0], n1.inputs["Vector"])
    r1 = n.new("ShaderNodeValToRGB"); r1.color_ramp.elements[0].position = 0.3; r1.color_ramp.elements[1].position = 0.72
    d = 1 - vary
    r1.color_ramp.elements[0].color = (base[0] * d, base[1] * d, base[2] * d, 1)
    r1.color_ramp.elements[1].color = (*base, 1)
    l.new(n1.outputs["Fac"], r1.inputs["Fac"]); l.new(r1.outputs[0], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough[0]; rr.inputs["To Max"].default_value = rough[1]
    l.new(n1.outputs["Fac"], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    n2 = n.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 22; n2.inputs["Detail"].default_value = 5
    l.new(geo.outputs["Position"], n2.inputs["Vector"])
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = bump; bp.inputs["Distance"].default_value = 0.02
    l.new(n2.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs[0], b.inputs["Normal"])
    return m


def box(name, loc, size, mat, bevel=0.0, rot=(0, 0, 0), seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot); o = bpy.context.object
    o.name = name; o.scale = size; bpy.ops.object.transform_apply(scale=True)
    if bevel:
        md = o.modifiers.new("b", "BEVEL"); md.width = bevel; md.segments = seg
    if mat:
        o.data.materials.append(mat)
    return o


def cyl(name, a, b, r, mat, verts=24, smooth=True):
    a, b = Vector(a), Vector(b); d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.name = name
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler()
    if smooth:
        bpy.ops.object.shade_smooth()
    if mat:
        o.data.materials.append(mat)
    return o


def sphere(name, loc, r, mat, seg=32):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=loc, segments=seg, ring_count=seg // 2)
    o = bpy.context.object; o.name = name; bpy.ops.object.shade_smooth()
    if mat:
        o.data.materials.append(mat)
    return o


def _aim(o, loc, tgt):
    o.location = loc
    o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


def area(name, group, loc, tgt, size, power, rgb, shape="RECTANGLE", sy=None, spread=180, cam=False):
    sc = bpy.context.scene
    ld = bpy.data.lights.new(name, "AREA"); ld.shape = shape; ld.size = size; ld.energy = power; ld.color = rgb
    if sy:
        ld.size_y = sy
    ld.spread = math.radians(spread)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); _aim(o, loc, tgt)
    if group:
        o.lightgroup = group
    o.visible_camera = cam
    return o


def point(name, group, loc, power, rgb, radius=0.1):
    sc = bpy.context.scene
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = power; ld.color = rgb; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); o.location = loc
    if group:
        o.lightgroup = group
    return o


def spot(name, group, loc, tgt, power, rgb, angle=70, blend=0.6, radius=0.05):
    sc = bpy.context.scene
    ld = bpy.data.lights.new(name, "SPOT"); ld.energy = power; ld.color = rgb; ld.spot_size = math.radians(angle)
    ld.spot_blend = blend; ld.shadow_soft_size = radius
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o); _aim(o, loc, tgt)
    if group:
        o.lightgroup = group
    return o


def sun(name, group, direction, strength, rgb, angle=2.0):
    sc = bpy.context.scene
    ld = bpy.data.lights.new(name, "SUN"); ld.energy = strength; ld.color = rgb; ld.angle = math.radians(angle)
    o = bpy.data.objects.new(name, ld); sc.collection.objects.link(o)
    o.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()
    if group:
        o.lightgroup = group
    return o


def camera(loc, tgt, lens=24, shift_y=0.0):
    sc = bpy.context.scene
    bpy.ops.object.camera_add(location=loc); cam = bpy.context.object
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens; cam.data.sensor_width = 36; cam.data.sensor_fit = "HORIZONTAL"; cam.data.clip_end = 2000
    cam.data.shift_y = shift_y
    sc.camera = cam
    return cam


# ------------------------------------------------------------------ reliefs from the insignia drawings
def symbol_mask(sym, px=512, fit=0.72, blur=2.0):
    """The drawing as a soft-edged mask, centred, filling `fit` of the square. y runs down the image."""
    im = Image.new("L", (px * 2, px * 2), 0); dr = ImageDraw.Draw(im)
    s = px * 2 * fit / 100.0; o = px * 2 * (1 - fit) / 2
    for p in INSIGNIA[sym]:
        dr.polygon([(o + x * s, o + y * s) for x, y in p["ext"]], fill=255)
        for h in p["holes"]:
            dr.polygon([(o + x * s, o + y * s) for x, y in h], fill=0)
    im = im.resize((px, px), Image.LANCZOS)
    if blur:
        im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im, np.float32) / 255.0


def height_mesh(name, H, sx, sz, depth, mat, keep=None):
    """A grid in the XZ plane (facing -Y) displaced towards the viewer by the height image H (rows run down)."""
    ny, nx = H.shape
    xs = np.linspace(-sx / 2, sx / 2, nx); zs = np.linspace(sz / 2, -sz / 2, ny)
    X, Z = np.meshgrid(xs, zs)
    V = np.stack([X, -H * depth, Z], -1).reshape(-1, 3)
    idx = np.arange(ny * nx).reshape(ny, nx)
    F = np.stack([idx[:-1, :-1], idx[1:, :-1], idx[1:, 1:], idx[:-1, 1:]], -1).reshape(-1, 4)
    if keep is not None:
        k = keep.reshape(-1)
        F = F[k[F].all(1)]
    me = bpy.data.meshes.new(name); me.from_pydata(V.tolist(), [], F.tolist()); me.update()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if mat:
        me.materials.append(mat)
    return o


def gauss(a, r):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))
    return np.asarray(im, np.float32) / 255.0


def medallion(name, sym, radius, depth, mat, px=360):
    """A cast disc: raised rim, flat field, the insignia standing proud of it."""
    yy, xx = np.mgrid[0:px, 0:px]; c = (px - 1) / 2
    r = np.hypot(xx - c, yy - c) / c
    rim = np.clip(1 - np.abs(r - 0.92) / 0.06, 0, 1) ** 0.6
    sm = symbol_mask(sym, px, fit=0.70, blur=px / 300)
    H = np.maximum(rim * 0.9, sm) * (r < 0.985)
    H = gauss(H, px / 420) + 0.25 * (r < 0.985)
    return height_mesh(name, H, radius * 2, radius * 2, depth, mat, keep=(r < 1.0))


# ------------------------------------------------------------------ render
def render(sc, cam, out, frame, extras=(), marks=None, rects=None, border=None, extra_meta=None):
    """Render to out/frame/. `border` = (x0, y0, x1, y1) in screen fractions, y down: render only that rectangle."""
    final = os.path.join(out, frame); part = final + ".part"
    shutil.rmtree(part, ignore_errors=True); os.makedirs(part)
    vl = sc.view_layers[0]
    if border:
        x0, y0, x1, y1 = border
        sc.render.use_border = True; sc.render.use_crop_to_border = True
        sc.render.border_min_x = x0; sc.render.border_max_x = x1
        sc.render.border_min_y = 1 - y1; sc.render.border_max_y = 1 - y0
    ng = bpy.data.node_groups.new("comp", "CompositorNodeTree"); sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers"); fo = ng.nodes.new("CompositorNodeOutputFile")
    fo.directory = part + os.sep; fo.file_name = ""; fo.format.media_type = "IMAGE"; fo.format.file_format = "OPEN_EXR"
    fo.format.color_depth = "16"; fo.format.exr_codec = "ZIP"; fo.format.color_mode = "RGB"

    def denoise(sock):
        dn = ng.nodes.new("CompositorNodeDenoise")
        ng.links.new(sock, dn.inputs["Image"]); ng.links.new(rl.outputs["Denoising Albedo"], dn.inputs["Albedo"])
        ng.links.new(rl.outputs["Denoising Normal"], dn.inputs["Normal"])
        for k, v in (("Prefilter", "Accurate"), ("HDR", True)):
            try:
                dn.inputs[k].default_value = v
            except Exception:
                pass
        return dn.outputs[0]
    it = fo.file_output_items.new("RGBA", "beauty"); ng.links.new(denoise(rl.outputs["Image"]), fo.inputs[it.name])
    for g in extras:
        it = fo.file_output_items.new("RGBA", "pass_" + g); ng.links.new(denoise(rl.outputs["Combined_" + g]), fo.inputs[it.name])
    if not border:
        it = fo.file_output_items.new("RGBA", "depth"); ng.links.new(rl.outputs["Depth"], fo.inputs[it.name])
    t0 = time.time()
    sc.render.filepath = os.path.join(part, "_r")
    bpy.ops.render.render(write_still=False)
    dt = time.time() - t0

    def scr(p):
        v = world_to_camera_view(sc, cam, Vector(p)); return [round(v.x, 5), round(1 - v.y, 5), round(v.z, 3)]
    meta = dict(frame=frame, res=sc.render.resolution_x, samples=sc.cycles.samples, render_s=round(dt, 1), extras=list(extras),
                marks={k: scr(v) for k, v in (marks or {}).items()},
                rects={k: [scr(a)[:2], scr(b)[:2]] for k, (a, b) in (rects or {}).items()})
    if border:
        meta["border"] = list(border)
    meta.update(extra_meta or {})
    json.dump(meta, open(os.path.join(part, "meta.json"), "w"))
    shutil.rmtree(final, ignore_errors=True); os.replace(part, final)
    print("RENDERED", frame, "%.1fs" % dt, flush=True)
    return meta


def args(defaults=None):
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True); ap.add_argument("--frame", required=True)
    ap.add_argument("--res", type=int, default=1400); ap.add_argument("--samples", type=int, default=96)
    ap.add_argument("--sym", default="ouroboros"); ap.add_argument("--crop", default="")
    ap.add_argument("--force", action="store_true"); ap.add_argument("--blend", action="store_true")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    return a


def done(out, name):
    return os.path.exists(os.path.join(out, name, "meta.json"))
