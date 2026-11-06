"""PR6 v12 "Raking Light" renders: one pale set, six Cycles light groups, one render per shot.

Every light and the world sits in exactly one light group, and the invisible ink is an emissive
shell in the `ink` group, so  sum(Combined_<group>) == Combined  (checked in post.py).

Each shot writes, into <out>/<shot>/ (via <shot>.part/ then an atomic rename, so a killed run
just redoes that shot):
  pass_<group>.exr        denoised light-group pass (OIDN, albedo + normal), linear float
  raw_<group>.exr         the same pass before denoising
  beauty.exr / raw_beauty.exr
  index.exr               object index (1..n = pack, 0 = set) for masks
  meta.json               camera, pack boxes in image space, timings

  python render_light.py --shot tin_hero --out RAW [--scale 0.5] [--samples 256]
"""
import argparse
import json
import math
import os
import shutil
import sys
import time

import bpy  # noqa: I001
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import labels  # noqa: E402
import packs  # noqa: E402

GROUPS = ["key_l", "key_r", "top", "rim", "amb", "ink"]

# ------------------------------------------------------------------ shots
# product ids are catalogue ids; finish = colourway
HEROES = {
    "tin_hero": dict(pack="tin", pid="03-2", finish="natural", yaw=-8, elev=27.0),
    "pouch_hero": dict(pack="pouch", pid="03-1", finish="foil", yaw=-16, elev=11.0),
    "box_hero": dict(pack="box", pid="04-1", yaw=-26, elev=17.0),
    "dropper_hero": dict(pack="dropper", pid="08-1", yaw=-10, elev=11.0),
    "jar_hero": dict(pack="jar", pid="08-3", yaw=-12, elev=24.0),
}
# the nine collections' lead packs (catalogue order), each with its own print and colourway
LINEUP = [
    dict(pid="01-1", pack="tin", finish="natural"),
    dict(pid="02-1", pack="pouch", finish="chalk"),
    dict(pid="03-1", pack="pouch", finish="foil"),
    dict(pid="04-1", pack="box"),
    dict(pid="05-1", pack="tin", finish="mist"),
    dict(pid="06-1", pack="tin", finish="steel"),
    dict(pid="07-1", pack="pouch", finish="mist"),
    dict(pid="08-1", pack="dropper"),
    dict(pid="09-1", pack="tin", finish="ink"),
]


# ------------------------------------------------------------------ scene
def reset(samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 0.01
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.006
    cy.adaptive_min_samples = 32
    cy.use_denoising = False  # denoised per pass in the compositor instead
    cy.max_bounces = 12
    cy.diffuse_bounces = 3
    cy.glossy_bounces = 5
    cy.transmission_bounces = 10
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.blur_glossy = 0.5
    cy.sample_clamp_direct = 0.0
    cy.sample_clamp_indirect = 0.0
    cy.use_light_tree = True
    sc.render.threads_mode = "FIXED"
    sc.render.threads = 4
    sc.render.film_transparent = False
    sc.render.compositor_device = "CPU"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    vl = sc.view_layers[0]
    vl.cycles.denoising_store_passes = True
    vl.use_pass_object_index = True
    for g in GROUPS:
        vl.lightgroups.add(name=g)
    return sc


def cyclorama(k):
    """Stone-grey floor sweeping up into a pale Mist wall. Built in metres of the pack's scale k."""
    R = 30 * k
    yb = 16 * k
    prof = [(-500 * k, 0.0), (yb, 0.0)]
    for i in range(1, 25):
        a = math.radians(90 * i / 24)
        prof.append((yb + R * math.sin(a), R - R * math.cos(a)))
    prof.append((yb + R, 400 * k))
    bm = bmesh.new()
    X = 500 * k
    rows = [(bm.verts.new((-X, y, z)), bm.verts.new((X, y, z))) for (y, z) in prof]
    for a, b in zip(rows[:-1], rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me = bpy.data.meshes.new("cyc")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = packs.link_obj(bpy.data.objects.new("cyc", me))
    m, nt, out = packs.new_mat("cyc")
    tc, sep = packs.obj_sep(nt)
    # floor -> wall colour along the curve
    t = packs.math_(nt, "MULTIPLY", sep.outputs[2], 1.0 / (R * 0.8))
    t = packs.math_(nt, "MINIMUM", packs.math_(nt, "MAXIMUM", t, 0.0), 1.0)
    floor_c = packs.srgb("B3B4AF")   # stone grey
    wall_c = packs.srgb("D3DCE0")    # between Mist and Chalk
    mix = packs.node(nt, "ShaderNodeMix", _data_type="RGBA")
    mix.inputs[6].default_value = floor_c
    mix.inputs[7].default_value = wall_c
    packs.link(nt, t, mix.inputs[0])
    # stone: faint mottling + fine grit in the floor only
    mot = packs.node(nt, "ShaderNodeTexNoise", Scale=0.35 / k, Detail=6.0, Roughness=0.6)
    packs.link(nt, tc.outputs["Object"], mot.inputs["Vector"])
    grit = packs.node(nt, "ShaderNodeTexNoise", Scale=9.0 / k, Detail=8.0, Roughness=0.75)
    packs.link(nt, tc.outputs["Object"], grit.inputs["Vector"])
    shade = packs.math_(nt, "MULTIPLY_ADD", mot.outputs["Fac"], 0.10, 0.95)
    hsv = packs.node(nt, "ShaderNodeHueSaturation")
    packs.link(nt, mix.outputs[2], hsv.inputs["Color"])
    packs.link(nt, packs.math_(nt, "MULTIPLY_ADD", packs.math_(nt, "SUBTRACT", 1.0, t), packs.math_(nt, "SUBTRACT", shade, 1.0), 1.0), hsv.inputs["Value"])
    p = packs.principled(nt, floor_c, 0.0, 0.82, Specular_IOR_Level=0.35)
    packs.link(nt, hsv.outputs[0], p.inputs["Base Color"])
    bpn = packs.node(nt, "ShaderNodeBump", Strength=0.12, Distance=0.02)
    packs.link(nt, packs.math_(nt, "MULTIPLY", grit.outputs["Fac"], packs.math_(nt, "SUBTRACT", 1.0, t)), bpn.inputs["Height"])
    packs.link(nt, bpn.outputs[0], p.inputs["Normal"])
    packs.link(nt, p.outputs[0], out.inputs["Surface"])
    me.materials.append(m)
    o.pass_index = 0
    return o


def flags(k, cam_dir_xy):
    """Two black cards just out of frame, for the dark bands that make metal read as metal."""
    m, _, _ = packs.simple("flag", (0.008, 0.008, 0.009, 1), 0.0, 0.9)
    out = []
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_plane_add(size=1)
        o = bpy.context.active_object
        o.name = "flag%d" % sx
        o.scale = (22 * k, 40 * k, 1)
        o.location = (sx * 26 * k, -30 * k, 18 * k)
        o.rotation_euler = (math.radians(90), 0, math.radians(sx * -38))
        o.data.materials.append(m)
        o.visible_camera = False
        o.visible_shadow = False
        out.append(o)
    return out


def area(name, group, loc, size, size_y, power, color, target, spread=180.0, shadow=True):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = "RECTANGLE"
    ld.size = size
    ld.size_y = size_y
    ld.energy = power
    ld.color = color
    ld.spread = math.radians(spread)
    ld.use_shadow = shadow
    o = packs.link_obj(bpy.data.objects.new(name, ld))
    o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    o.visible_camera = False
    o.lightgroup = group
    return o


def rig(k, ztop, zc):
    """The six groups. k = pack scale (size / 10 cm); ztop = pack top; zc = its centre height."""
    D = 70 * k
    def pol(theta, d, z):
        t = math.radians(theta)
        return (-math.sin(t) * d, -math.cos(t) * d, z)
    tgt = (0, 0, zc)
    el = math.tan(math.radians(7.0))
    E = 0.4  # calibrated on the spike so exposure 1.0 is a normal exposure
    # low raking keys: just above the top, from the side and a touch behind
    area("key_l", "key_l", pol(98, D, ztop + D * el), 9 * k, 9 * k, E * 9.5 * D * D,
         (1.0, 0.91, 0.80), (0, 0, ztop * 0.85), spread=60)
    area("key_r", "key_r", pol(-98, D, ztop + D * el), 9 * k, 9 * k, E * 9.5 * D * D * 0.9,
         (0.86, 0.93, 1.0), (0, 0, ztop * 0.85), spread=60)
    # soft overhead
    area("top", "top", (0, 12 * k, ztop + 50 * k), 110 * k, 110 * k, E * 9.5 * (50 * k) ** 2 * 2.8,
         (0.97, 0.98, 1.0), (0, 12 * k, 0), spread=180)
    # back rim: a horizontal strip behind and above, aimed back at the pack
    area("rim", "rim", (0, 30 * k, ztop + 9 * k), 34 * k, 5 * k, E * 9.5 * (32 * k) ** 2 * 0.25,
         (0.90, 0.95, 1.0), tgt, spread=70)
    # world: low misty ambient
    w = bpy.data.worlds.new("amb")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes["Background"]
    bg.inputs["Color"].default_value = (0.66, 0.72, 0.78, 1)
    bg.inputs["Strength"].default_value = E * 1.6
    w.lightgroup = "amb"


# ------------------------------------------------------------------ build
def place_pack(spec, key, short=False, emboss_n=760, sachets=True):
    kw = {}
    if spec["pack"] == "box":
        kw["sachets"] = sachets
    if spec["pack"] in ("tin", "pouch"):
        kw["finish"] = spec.get("finish", "natural" if spec["pack"] == "tin" else "foil")
    if spec["pack"] == "tin":
        kw["emboss_n"] = emboss_n
    return packs.BUILD[spec["pack"]](spec["pid"], key, short=short, **kw)


def mesh_children(root):
    return [o for o in root.children_recursive if o.type == "MESH" and not o.get("is_ink")]


def world_verts(objs, step=1):
    dg = bpy.context.evaluated_depsgraph_get()
    vs = []
    for o in objs:
        oe = o.evaluated_get(dg)
        mw = oe.matrix_world
        me = oe.data
        n = len(me.vertices)
        st = max(1, step if n > 20000 else 1)
        vs += [mw @ me.vertices[i].co for i in range(0, n, st)]
    return vs


def centre_on_axis(root):
    bpy.context.view_layer.update()
    vs = world_verts(mesh_children(root), 7)
    cx = (min(v.x for v in vs) + max(v.x for v in vs)) / 2
    cy = (min(v.y for v in vs) + max(v.y for v in vs)) / 2
    for o in root.children:
        o.location.x -= cx
        o.location.y -= cy


def new_cam(res, lens, fstop=None):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.resolution_percentage = 100
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "HORIZONTAL" if res[0] >= res[1] else "VERTICAL"
    cd.sensor_width = cd.sensor_height = 36.0
    cam = packs.link_obj(bpy.data.objects.new("cam", cd))
    sc.camera = cam
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
    return cam


def fit(cam, pts, tgt, elev, fill_w, fill_h, drop=0.0, az=0.0):
    sc = bpy.context.scene
    cd = cam.data
    el, a = math.radians(elev), math.radians(az)
    dirv = Vector((math.sin(a) * math.cos(el), -math.cos(a) * math.cos(el), math.sin(el)))
    dist = 100.0
    for _ in range(12):
        cd.shift_x = cd.shift_y = 0
        cam.location = tgt + dirv * dist
        cam.rotation_euler = (-dirv).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(sc, cam, p) for p in pts]
        xs, ys = [u.x for u in uv], [u.y for u in uv]
        dist *= max((max(xs) - min(xs)) / fill_w, (max(ys) - min(ys)) / fill_h)
    cam.location = tgt + dirv * dist
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(sc, cam, p) for p in pts]
    xs, ys = [u.x for u in uv], [u.y for u in uv]
    res = (sc.render.resolution_x, sc.render.resolution_y)
    aspect = res[0] / res[1]
    cd.shift_x = ((max(xs) + min(xs)) / 2 - 0.5) * (aspect if aspect < 1 else 1)
    cd.shift_y = ((max(ys) + min(ys)) / 2 - 0.5) * (1 if aspect < 1 else 1 / aspect) + drop
    if cd.dof.use_dof:
        cd.dof.focus_distance = (cam.location - tgt).length
    return dist


def bbox_image(cam, objs):
    sc = bpy.context.scene
    uv = [world_to_camera_view(sc, cam, p) for p in world_verts(objs, 5)]
    xs, ys = [u.x for u in uv], [1 - u.y for u in uv]
    return [round(min(xs), 4), round(min(ys), 4), round(max(xs), 4), round(max(ys), 4)]


def build_hero(name, scale):
    s = HEROES[name]
    root = place_pack(s, s["pack"])
    centre_on_axis(root)
    root.rotation_euler.z = math.radians(s["yaw"])
    for o in mesh_children(root):
        o.pass_index = 1
    bpy.context.view_layer.update()
    vs = world_verts(mesh_children(root), 3)
    ztop = max(v.z for v in vs)
    span = max(ztop, max(v.x for v in vs) - min(v.x for v in vs))
    k = span / 10.0
    cyclorama(k)
    flags(k, None)
    rig(k, ztop, ztop * 0.5)
    res = (int(1280 * scale), int(1600 * scale))
    cam = new_cam(res, 90, fstop=11)
    tgt = Vector((0, 0, ztop * 0.5))
    fit(cam, vs, tgt, s["elev"], 0.70, 0.74, drop=0.035)
    boxes = [dict(id=s["pid"], pack=s["pack"], box=bbox_image(cam, mesh_children(root)))]
    return dict(product=s["pid"], pack=s["pack"], finish=s.get("finish"), w=res[0], h=res[1],
                ink_text=labels.ink_text(s["pid"]), packs=boxes)


def build_lineup(name, scale):
    gap = 2.4
    width = {"tin": 10.2, "pouch": 13.0, "box": 7.4, "dropper": 3.4, "jar": 6.8}
    xs, x = [], 0.0
    for spec in LINEUP:
        w = width[spec["pack"]]
        xs.append(x + w / 2)
        x += w + gap
    xs = [v - (x - gap) / 2 for v in xs]
    roots = []
    import random
    rnd = random.Random(6)
    for i, spec in enumerate(LINEUP):
        key = "L%d_%s" % (i + 1, spec["pack"])
        r = place_pack(spec, key, short=True, emboss_n=420, sachets=False)
        centre_on_axis(r)
        r.location = (xs[i], rnd.uniform(-1.4, 1.4), 0)
        r.rotation_euler.z = math.radians(rnd.uniform(-14, 6) - (4 - i) * 1.5)
        for o in mesh_children(r):
            o.pass_index = i + 1
        roots.append(r)
    bpy.context.view_layer.update()
    allm = [o for r in roots for o in mesh_children(r)]
    vs = world_verts(allm, 9)
    ztop = max(v.z for v in vs)
    k = 1.6
    cyclorama(k * 1.4)
    flags(k * 1.6, None)
    rig(3.2, ztop * 0.6, ztop * 0.35)
    res = (int(2400 * scale), int(1350 * scale))
    cam = new_cam(res, 70, fstop=16)
    tgt = Vector((0, 0, ztop * 0.42))
    fit(cam, vs, tgt, 6.0, 0.93, 0.6, drop=0.10)
    boxes = []
    for i, (spec, r) in enumerate(zip(LINEUP, roots)):
        boxes.append(dict(index=i + 1, id=spec["pid"], collection=spec["pid"][:2], pack=spec["pack"],
                          finish=spec.get("finish"), box=bbox_image(cam, mesh_children(r)),
                          ink_text=labels.ink_text(spec["pid"], short=True)))
    return dict(product=None, pack="lineup", w=res[0], h=res[1],
                ink_text=" / ".join(b["ink_text"] for b in boxes), packs=boxes)


# ------------------------------------------------------------------ compositor
def compositor(outdir):
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new("comp", "CompositorNodeTree")
    sc.compositing_node_group = ng
    rl = ng.nodes.new("CompositorNodeRLayers")
    fo = ng.nodes.new("CompositorNodeOutputFile")
    fo.directory = outdir + os.sep
    fo.file_name = ""
    fo.format.media_type = "IMAGE"
    fo.format.file_format = "OPEN_EXR"
    fo.format.color_depth = "32"
    fo.format.exr_codec = "ZIP"
    fo.format.color_mode = "RGB"

    def item(nm, sock, kind="RGBA"):
        it = fo.file_output_items.new(kind, nm)
        ng.links.new(sock, fo.inputs[it.name])

    def denoise(sock):
        dn = ng.nodes.new("CompositorNodeDenoise")
        ng.links.new(sock, dn.inputs["Image"])
        ng.links.new(rl.outputs["Denoising Albedo"], dn.inputs["Albedo"])
        ng.links.new(rl.outputs["Denoising Normal"], dn.inputs["Normal"])
        for k, v in (("Prefilter", "Accurate"), ("Quality", "High"), ("HDR", True)):
            try:
                dn.inputs[k].default_value = v
            except Exception as e:  # noqa: BLE001
                print("denoise opt", k, e)
        return dn.outputs[0]

    for g in GROUPS:
        s = rl.outputs["Combined_" + g]
        item("pass_" + g, denoise(s))
        item("raw_" + g, s)
    item("beauty", denoise(rl.outputs["Image"]))
    item("raw_beauty", rl.outputs["Image"])
    item("index", rl.outputs["Object Index"], "FLOAT")


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shot", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--samples", type=int, default=384)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--blend", action="store_true")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    final = os.path.join(a.out, a.shot)
    if os.path.exists(os.path.join(final, "meta.json")) and not a.force:
        print("SKIP", a.shot, flush=True)
        return
    part = final + ".part"
    shutil.rmtree(part, ignore_errors=True)
    os.makedirs(part)
    t0 = time.time()
    reset(a.samples)
    if a.shot == "lineup":
        meta = build_lineup(a.shot, a.scale)
    else:
        meta = build_hero(a.shot, a.scale)
    compositor(part)
    if a.blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, a.shot + ".blend"))
    tb = time.time()
    sc = bpy.context.scene
    sc.render.filepath = os.path.join(part, "_render")
    bpy.ops.render.render(write_still=False)
    meta.update(shot=a.shot, samples=a.samples, scale=a.scale, groups=GROUPS,
                build_s=round(tb - t0, 1), render_s=round(time.time() - tb, 1))
    json.dump(meta, open(os.path.join(part, "meta.json"), "w"), indent=1)
    missing = [g for g in GROUPS if not os.path.exists(os.path.join(part, "pass_%s.exr" % g))]
    if missing:
        raise SystemExit("missing passes %s" % missing)
    shutil.rmtree(final, ignore_errors=True)
    os.replace(part, final)
    print("RENDERED %s %.1fs" % (a.shot, time.time() - tb), flush=True)


if __name__ == "__main__":
    main()
