"""PR6 v11 stills (Blender 5.2 Cycles CPU). Reuses build_packs.py (v6 geometry + materials)
and labels.py (now FreeSans Bold + DejaVu Sans Mono).

Shots:
  <pack>_hero    1440x1800 portrait, pack fills ~66% of the frame height, on a Mist sweep
  <pack>_detail  1800x1200 macro with shallow depth of field
  night          1800x1800, the frosted cube (Object 0047) glowing on black

Resumable: finished PNGs are skipped; each render writes <name>.part.png then renames.
  python render_v11.py --shots tin_hero,night --out RAW [--samples 128] [--scale 1]
"""
import argparse
import json
import math
import os
import sys
import time

import bpy  # noqa: I001
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_packs as bp  # noqa: E402
import labels  # noqa: E402

PACKS = ["tin", "pouch", "box", "dropper", "jar"]


# ------------------------------------------------------------------ helpers
def sweep(hz, color=bp.MIST, rough=0.85):
    """Seamless cyc: floor towards camera, curving up behind the pack."""
    k = hz / 9.0
    R = 26 * k
    yb = 14 * k  # where the curve starts
    prof = [(-400 * k, 0.0), (yb, 0.0)]
    for i in range(1, 17):
        a = math.radians(90 * i / 16)
        prof.append((yb + R * math.sin(a), R - R * math.cos(a)))
    prof.append((yb + R, 260 * k))
    bm = bmesh.new()
    X = 400 * k
    rows = []
    for (y, z) in prof:
        rows.append((bm.verts.new((-X, y, z)), bm.verts.new((X, y, z))))
    for a, b in zip(rows[:-1], rows[1:]):
        bm.faces.new((a[0], a[1], b[1], b[0]))
    me = bpy.data.meshes.new("sweep")
    bm.to_mesh(me)
    bm.free()
    for p in me.polygons:
        p.use_smooth = True
    o = bp.link_obj(bpy.data.objects.new("sweep", me))
    m, nt, p = bp.simple("sweep_mat", color, 0.0, rough)
    o.data.materials.append(m)
    coll = bpy.data.collections.new("bgonly")
    coll.objects.link(o)
    L = bp.area("bglight", (0, -20 * k, 70 * k), 120 * k, 60 * k, 16000 * k * k, (0.93, 0.96, 1.0),
                (0, yb + R, 26 * k), 80, shadow=False)
    L.light_linking.receiver_collection = coll
    return o


def lid_emboss():
    """Add an embossed PR6 to the tin's spun lid top (height map from labels.lid_emboss)."""
    m = bpy.data.materials.get("tin_lid_top")
    if not m:
        return
    nt = m.node_tree
    pr = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    prev = pr.inputs["Normal"].links[0].from_socket
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sep.inputs[0])
    cmb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(bp.math_(nt, "MULTIPLY_ADD", sep.outputs[0], 1 / 7.0, 0.5), cmb.inputs[0])
    nt.links.new(bp.math_(nt, "MULTIPLY_ADD", sep.outputs[1], 1 / 7.0, 0.5), cmb.inputs[1])
    img = bpy.data.images.load(os.path.join(bp.TEX, "lid_emboss.png"), check_existing=True)
    img.colorspace_settings.name = "Non-Color"
    it = nt.nodes.new("ShaderNodeTexImage")
    it.image = img
    it.extension = "CLIP"
    it.interpolation = "Cubic"
    nt.links.new(cmb.outputs[0], it.inputs[0])
    bn = nt.nodes.new("ShaderNodeBump")
    bn.inputs["Strength"].default_value = 0.8
    bn.inputs["Distance"].default_value = 0.018
    nt.links.new(it.outputs["Color"], bn.inputs["Height"])
    nt.links.new(prev, bn.inputs["Normal"])
    nt.links.new(bn.outputs[0], pr.inputs["Normal"])
    try:
        pr.inputs["Anisotropic"].default_value = 0.35
    except KeyError:
        pass
    # the raised letters are polished a touch more than the brushed field
    r_in = pr.inputs["Roughness"]
    src = r_in.links[0].from_socket if r_in.links else None
    if src is not None:
        nt.links.new(bp.math_(nt, "MULTIPLY_ADD", it.outputs["Color"], -0.10, src), r_in)


def verts_world(root):
    dg = bpy.context.evaluated_depsgraph_get()
    vs = []
    for o in root.children_recursive:
        if o.type != "MESH":
            continue
        oe = o.evaluated_get(dg)
        mw = oe.matrix_world
        vs += [mw @ v.co for i, v in enumerate(oe.data.vertices) if i % 3 == 0]
    return vs


def fit_camera(root, res, yaw, elev, lens, fill_h, fill_w, drop=0.03):
    """Frame the actual (rotated) vertices so the pack fills fill_h of the height or fill_w of the width."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    root.rotation_euler.z = math.radians(yaw)
    bpy.context.view_layer.update()
    pts = verts_world(root)
    cam = new_cam(res, lens)
    zmax = max(p.z for p in pts)
    tgt = Vector((0, 0, zmax * 0.5))
    el = math.radians(elev)
    dirv = Vector((0, -math.cos(el), math.sin(el)))
    dist = zmax * 5
    cd = cam.data
    for _ in range(10):
        cd.shift_x = cd.shift_y = 0
        cam.location = tgt + dirv * dist
        cam.rotation_euler = (-dirv).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        uv = [world_to_camera_view(sc, cam, p) for p in pts]
        xs, ys = [u.x for u in uv], [u.y for u in uv]
        dist *= max((max(ys) - min(ys)) / fill_h, (max(xs) - min(xs)) / fill_w)
    cam.location = tgt + dirv * dist
    bpy.context.view_layer.update()
    uv = [world_to_camera_view(sc, cam, p) for p in pts]
    xs, ys = [u.x for u in uv], [u.y for u in uv]
    aspect = res[0] / res[1]
    # shift is in units of the larger frame side
    cd.shift_y = ((max(ys) + min(ys)) / 2 - 0.5) * (1 if aspect < 1 else 1 / aspect) + drop
    cd.shift_x = ((max(xs) + min(xs)) / 2 - 0.5) * (aspect if aspect < 1 else 1)
    return cam


def look(cam, loc, tgt):
    cam.location = Vector(loc)
    cam.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()


def new_cam(res, lens, fstop=None, focus=None):
    sc = bpy.context.scene
    sc.render.resolution_x, sc.render.resolution_y = res
    cd = bpy.data.cameras.new("cam")
    cd.lens = lens
    cd.sensor_fit = "HORIZONTAL" if res[0] >= res[1] else "VERTICAL"
    cd.sensor_width = 36.0
    cd.sensor_height = 36.0
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = focus
    cam = bp.link_obj(bpy.data.objects.new("cam", cd))
    sc.camera = cam
    return cam


def scene_for(pack, background=True):
    root = bp.setup_scene(pack)
    if pack == "tin":
        lid_emboss()
    pts = bp.bbox_world(root)
    hz = max(p.z for p in pts)
    sc = bpy.context.scene
    if background:
        bpy.data.objects.remove(bpy.data.objects["catcher"])
        sweep(hz)
        sc.render.film_transparent = False
        sc.render.image_settings.color_mode = "RGB"
    return root, hz, pts


# ------------------------------------------------------------------ shots
HERO_YAW = {"tin": -18, "pouch": -24, "box": -34, "dropper": -14, "jar": -16}
HERO_FILL = {"tin": (0.64, 0.80), "pouch": (0.68, 0.80), "box": (0.66, 0.88), "dropper": (0.70, 0.80), "jar": (0.56, 0.84)}


def shot_hero(pack, scale):
    root, hz, _ = scene_for(pack)
    fh, fw = HERO_FILL[pack]
    fit_camera(root, (int(1440 * scale), int(1800 * scale)), HERO_YAW[pack], elev=7.0, lens=85.0,
               fill_h=fh, fill_w=fw)
    bpy.context.scene.view_settings.exposure = 0.15


def shot_detail(pack, scale):
    root, hz, pts = scene_for(pack)
    root.rotation_euler.z = math.radians(HERO_YAW[pack])
    bpy.context.view_layer.update()
    res = (int(1800 * scale), int(1200 * scale))
    sc = bpy.context.scene
    sc.view_settings.exposure = 0.1
    if pack == "tin":
        # embossed PR6 on the spun lid, raking light from the left
        root.rotation_euler.z = math.radians(-8)
        tgt = (0.0, 0.3, 7.97)
        loc = (0.4, -8.2, 7.97 + 6.4)
        cam = new_cam(res, 100, 5.6, (Vector(loc) - Vector(tgt)).length)
        look(cam, loc, tgt)
        bp.area("rake", (-30, 4, 9.6), 6, 24, 2200, (0.95, 0.97, 1.0), (0, 0, 7.97), 25, shadow=True)
        # a big soft panel mirrored in the lid: flat tops read light, the letter flanks dark
        bp.area("panel", (0.0, 9.0, 16.0), 26, 10, 260, (0.95, 0.97, 1.0), (0, 0, 7.97), 60, shadow=False)
    elif pack == "pouch":
        # crinkled foil + serrated heat seal and tear notch, top right corner
        tgt = (3.6, -0.15, 16.6)
        loc = (9.0, -15.0, 21.0)
        cam = new_cam(res, 100, 3.2, (Vector(loc) - Vector(tgt)).length)
        look(cam, loc, tgt)
    elif pack == "box":
        # top corner of the box: printed PR6, orange tab, paper grain; sachet edge below
        root.rotation_euler.z = math.radians(-22)
        bpy.context.view_layer.update()
        tgt = (0.2, -3.8, 9.4)
        loc = (-5.5, -17.5, 12.8)
        cam = new_cam(res, 100, 4.5, (Vector(loc) - Vector(tgt)).length)
        look(cam, loc, tgt)
    elif pack == "dropper":
        # glass shoulder, collar and bulb
        tgt = (0.0, 0.0, 6.8)
        loc = (-3.0, -11.0, 8.6)
        cam = new_cam(res, 100, 2.8, (Vector(loc) - Vector(tgt)).length)
        look(cam, loc, tgt)
    elif pack == "jar":
        # spun lid edge meeting the frosted glass
        tgt = (-1.8, -2.6, 4.6)
        loc = (-6.5, -13.0, 7.6)
        cam = new_cam(res, 100, 3.0, (Vector(loc) - Vector(tgt)).length)
        look(cam, loc, tgt)


def shot_night(scale):
    bp.reset()
    sc = bpy.context.scene
    sc.render.film_transparent = False
    sc.render.image_settings.color_mode = "RGB"
    # Object 0047: a frosted cube with a soft core of light, on a black gloss floor
    s = 7.0
    bpy.ops.mesh.primitive_cube_add(size=s, location=(0, 0, s / 2))
    cube = bpy.context.active_object
    cube.rotation_euler.z = math.radians(-28)
    bev = cube.modifiers.new("bev", "BEVEL")
    bev.width = 0.18
    bev.segments = 6
    for p in cube.data.polygons:
        p.use_smooth = True
    m, nt, out = bp.new_mat("frost")
    g = bp.principled(nt, (0.86, 0.90, 0.93, 1), 0.0, 0.32, Transmission_Weight=1.0, IOR=1.46)
    nz = bp.node(nt, "ShaderNodeTexNoise", Scale=9.0, Detail=6.0)
    rr = bp.math_(nt, "MULTIPLY_ADD", nz.outputs["Fac"], 0.12, 0.26)
    bp.link(nt, rr, g.inputs["Roughness"])
    bp.link(nt, g.outputs[0], out.inputs["Surface"])
    cube.data.materials.append(m)
    # dark sphere inside (kit material study) with a glowing core behind it
    bpy.ops.mesh.primitive_uv_sphere_add(radius=2.0, location=(0, 0.35, s / 2), segments=64, ring_count=32)
    sph = bpy.context.active_object
    bpy.ops.object.shade_smooth()
    sm, _, _ = bp.simple("sph", (0.012, 0.014, 0.016, 1), 0.0, 0.25)
    sph.data.materials.append(sm)
    bpy.ops.mesh.primitive_uv_sphere_add(radius=1.1, location=(0.3, 2.3, s / 2 + 0.4), segments=32, ring_count=16)
    core = bpy.context.active_object
    em, ent, eout = bp.new_mat("core")
    e = bp.node(ent, "ShaderNodeEmission", Strength=900.0)
    e.inputs["Color"].default_value = (0.78, 0.88, 1.0, 1)
    bp.link(ent, e.outputs[0], eout.inputs["Surface"])
    core.data.materials.append(em)
    # floor: black, slightly glossy
    bpy.ops.mesh.primitive_plane_add(size=600, location=(0, 0, 0))
    fl = bpy.context.active_object
    fm, _, _ = bp.simple("floor", (0.008, 0.009, 0.010, 1), 0.0, 0.22)
    fl.data.materials.append(fm)
    # one cool rim from behind-right, one faint top
    bp.area("rim", (22, 26, 16), 10, 30, 2600, (0.75, 0.85, 1.0), (0, 0, 3.5), 30, shadow=True)
    bp.area("top", (-6, -4, 40), 16, 16, 500, (0.85, 0.9, 1.0), (0, 0, 3.5), 40)
    w = bpy.data.worlds.new("night")
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    res = (int(1800 * scale), int(1800 * scale))
    tgt = (0, 0, 3.3)
    loc = (0, -42, 9.5)
    cam = new_cam(res, 85, 4.0, (Vector(loc) - Vector(tgt)).length)
    look(cam, loc, tgt)
    sc.view_settings.exposure = 0.0


def render(path, samples):
    sc = bpy.context.scene
    sc.cycles.samples = samples
    part = path[:-4] + ".part.png"
    sc.render.filepath = part
    t = time.time()
    bpy.ops.render.render(write_still=True)
    os.replace(part, path)
    return time.time() - t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--shots", default=",".join([p + "_hero" for p in PACKS] + [p + "_detail" for p in PACKS] + ["night"]))
    ap.add_argument("--out", required=True)
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    bp.SZ = labels.build()
    os.makedirs(a.out, exist_ok=True)
    log_path = os.path.join(a.out, "times.json")
    log = json.load(open(log_path)) if os.path.exists(log_path) else {}
    for shot in a.shots.split(","):
        path = os.path.join(a.out, shot + ".png")
        if os.path.exists(path) and not a.force:
            print("SKIP", shot, flush=True)
            continue
        if shot == "night":
            shot_night(a.scale)
        else:
            pack, kind = shot.split("_")
            (shot_hero if kind == "hero" else shot_detail)(pack, a.scale)
        dt = render(path, a.samples)
        log[shot] = round(dt, 1)
        json.dump(log, open(log_path, "w"), indent=1)
        print("RENDERED %s %.1fs" % (shot, dt), flush=True)


if __name__ == "__main__":
    main()
