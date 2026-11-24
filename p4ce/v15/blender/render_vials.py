"""PR6 v13 renders: the v12 pale set and six light groups (render_light.py), with lyophilisation vials.

Shots:
  vial_hero    portrait 4:5, one vial (PR6-C-0103), the home hero and the compound-record disc
  pair_hero    portrait 4:5, the 5 mg and 10 mg of one compound side by side (area pages)
  lineup       16:9, nine vials, one per research area, each with its own label

  python render_vials.py --shot vial_hero --out RAW [--scale 0.5] [--samples 256]
"""
import math
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

import render_light as RL  # noqa: E402
import vials  # noqa: E402
import packs  # noqa: E402

HEROES = {
    "vial_hero": dict(pid="PR6-C-0103", cap="orange", yaw=-14, elev=14.0),
    "vial_blank": dict(pid=None, cap="orange", yaw=-14, elev=14.0),
}
LINEUP_CAPS = ["chalk", "steel", "mist", "ink", "orange", "steel", "mist", "chalk", "ink"]


def _finish(roots, ztop_scale=1.0):
    for i, r in enumerate(roots):
        for o in RL.mesh_children(r):
            o.pass_index = i + 1
    bpy.context.view_layer.update()


def build_hero(name, scale):
    if name == "pair_hero":
        return build_pair(scale)
    s = HEROES[name]
    root = vials.build_vial(s["pid"], "H", cap=s["cap"])
    RL.centre_on_axis(root)
    root.rotation_euler.z = math.radians(s["yaw"])
    _finish([root])
    vs = RL.world_verts(RL.mesh_children(root), 3)
    ztop = max(v.z for v in vs)
    k = ztop / 10.0 * 1.15
    RL.cyclorama(k)
    RL.flags(k, None)
    RL.rig(k, ztop, ztop * 0.5)
    res = (int(1280 * scale), int(1600 * scale))
    cam = RL.new_cam(res, 100, fstop=8)
    tgt = Vector((0, 0, ztop * 0.5))
    RL.fit(cam, vs, tgt, s["elev"], 0.62, 0.70, drop=0.03)
    boxes = [dict(id=s["pid"], pack="vial", box=RL.bbox_image(cam, RL.mesh_children(root)))]
    return dict(product=s["pid"], pack="vial", w=res[0], h=res[1], ink_text=vials.ink_text(s["pid"]) if s["pid"] else "", packs=boxes)


def build_pair(scale):
    pids = ["PR6-C-0201", "PR6-C-0202"]
    roots = []
    for i, pid in enumerate(pids):
        r = vials.build_vial(pid, "P%d" % i, cap=["steel", "orange"][i])
        RL.centre_on_axis(r)
        r.location = ((-1.05, 1.05)[i], (0.5, -0.4)[i], 0)
        r.rotation_euler.z = math.radians((-20, -6)[i])
        roots.append(r)
    _finish(roots)
    allm = [o for r in roots for o in RL.mesh_children(r)]
    vs = RL.world_verts(allm, 3)
    ztop = max(v.z for v in vs)
    k = ztop / 10.0 * 1.6
    RL.cyclorama(k)
    RL.flags(k, None)
    RL.rig(k, ztop, ztop * 0.5)
    res = (int(1280 * scale), int(1600 * scale))
    cam = RL.new_cam(res, 100, fstop=9)
    RL.fit(cam, vs, Vector((0, 0, ztop * 0.5)), 12.0, 0.72, 0.62, drop=0.03)
    boxes = [dict(id=p, pack="vial", box=RL.bbox_image(cam, RL.mesh_children(r))) for p, r in zip(pids, roots)]
    return dict(product=pids[1], pack="vial", w=res[0], h=res[1], ink_text=vials.ink_text(pids[1]), packs=boxes)


def build_lineup(name, scale):
    rnd = random.Random(13)
    gap = 0.75
    roots = []
    pids = ["PR6-C-%02d01" % (i + 1) for i in range(9)]
    n = len(pids)
    for i, pid in enumerate(pids):
        r = vials.build_vial(pid, "L%d" % (i + 1), cap=LINEUP_CAPS[i], short=True)
        RL.centre_on_axis(r)
        r.location = ((i - (n - 1) / 2) * (2 * vials.R + gap), rnd.uniform(-0.35, 0.35), 0)
        r.rotation_euler.z = math.radians(rnd.uniform(-22, 10))
        roots.append(r)
    _finish(roots)
    allm = [o for r in roots for o in RL.mesh_children(r)]
    vs = RL.world_verts(allm, 9)
    ztop = max(v.z for v in vs)
    RL.cyclorama(1.4)
    RL.flags(1.6, None)
    RL.rig(1.1, ztop * 0.9, ztop * 0.45)
    res = (int(2400 * scale), int(1350 * scale))
    cam = RL.new_cam(res, 80, fstop=14)
    RL.fit(cam, vs, Vector((0, 0, ztop * 0.45)), 7.0, 0.92, 0.5, drop=0.06)
    boxes = []
    for i, (pid, r) in enumerate(zip(pids, roots)):
        boxes.append(dict(index=i + 1, id=pid, area=pid[6:8], pack="vial", cap=LINEUP_CAPS[i],
                          box=RL.bbox_image(cam, RL.mesh_children(r)), ink_text=vials.ink_text(pid, short=True)))
    return dict(product=None, pack="lineup", w=res[0], h=res[1], ink_text=" / ".join(b["ink_text"] for b in boxes), packs=boxes)


# ------------------------------------------------------------------ v15: the shelf
# One research area's compounds standing together, the way a counter is set: the 10 mg vials taller (a larger vial),
# the 5 mg beside them, one on a low chalk plinth, two matte spheres for scale. Weighted to the right of a 2:1 frame
# so the page can set quiet type in the empty sweep at the left.
SHELF_CAPS = {"A": "orange", "B": "steel", "C": "mist"}


def _plinth(name, w, d, h, x, y):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, h / 2))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, d, h)
    bpy.ops.object.transform_apply(scale=True)
    bv = o.modifiers.new("bv", "BEVEL")
    bv.width, bv.segments = 0.08, 6
    m, _, _ = packs.simple(name, packs.srgb("E9EBE6"), 0.0, 0.7, Specular_IOR_Level=0.3)
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o


def _sphere(name, r, x, y, z0=0.0, col="EDEEEA"):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=96, ring_count=48, location=(x, y, z0 + r))
    o = bpy.context.active_object
    o.name = name
    m, _, _ = packs.simple(name, packs.srgb(col), 0.0, 0.62, Specular_IOR_Level=0.3)
    o.data.materials.append(m)
    bpy.ops.object.shade_smooth()
    return o


def build_shelf(name, scale):
    c = name.split("_")[1]
    pids = sorted(k for k, v in vials.P.items() if v["c"] == c)[:3]
    A, B, C = (pids + pids * 3)[:3]
    L = 1.32   # the 10 mg vial, a size up
    PL_H = 0.9
    # (pid, size, scale, x, y, z, yaw, cap)
    plan = [
        (A, "10 mg", L, -3.3, 0.55, PL_H, -16, SHELF_CAPS["A"]),
        (A, "5 mg", 1.0, -1.35, -0.85, 0, -8, SHELF_CAPS["A"]),
        (B, "10 mg", L, 0.5, 0.6, 0, -20, SHELF_CAPS["B"]),
        (B, "5 mg", 1.0, 2.3, -0.8, 0, -4, SHELF_CAPS["B"]),
        (C, "10 mg", L, 4.1, 0.65, 0, -14, SHELF_CAPS["C"]),
        (C, "5 mg", 1.0, 5.95, -0.45, 0, -10, SHELF_CAPS["C"]),
    ]
    roots = []
    for i, (pid, size, k, x, y, z, yaw, cap) in enumerate(plan):
        r = vials.build_vial(pid, "S%d" % i, cap=cap, short=True, size=size)
        RL.centre_on_axis(r)
        r.scale = (k, k, k)
        r.location = (x, y, z)
        r.rotation_euler.z = math.radians(yaw)
        roots.append(r)
    _finish(roots)
    props = [_plinth("plinth", 2.9, 2.6, PL_H, -3.3, 0.55),
             _sphere("sph_l", 0.95, -5.9, -0.1),
             _sphere("sph_s", 0.42, 7.3, -1.0, col="CAD5DA")]
    bpy.context.view_layer.update()
    allm = [o for r in roots for o in RL.mesh_children(r)] + props
    vs = RL.world_verts(allm, 5)
    ztop = max(v.z for v in vs)
    RL.cyclorama(1.2)
    RL.flags(1.4, None)
    RL.rig(0.9, ztop * 0.9, ztop * 0.45)
    res = (int(2000 * scale), int(1000 * scale))
    cam = RL.new_cam(res, 70, fstop=11)
    RL.fit(cam, vs, Vector((0.6, 0, ztop * 0.42)), 8.0, 0.6, 0.58, drop=0.05)
    cam.data.shift_x -= 0.12   # the set sits right of centre; the left of the sweep is left for the type
    bpy.context.view_layer.update()
    boxes = []
    for i, ((pid, size, *_), r) in enumerate(zip(plan, roots)):
        boxes.append(dict(index=i + 1, id=pid, size=size, pack="vial", box=RL.bbox_image(cam, RL.mesh_children(r)),
                          ink_text=vials.ink_text(pid, short=True)))
    return dict(product=A, area=c, pack="shelf", w=res[0], h=res[1], ink_text=vials.ink_text(A, short=True),
                set_box=RL.bbox_image(cam, allm), packs=boxes)


def _route(name, scale):
    if name.startswith("shelf_"):
        return build_shelf(name, scale)
    return build_hero(name, scale)


RL.build_hero = _route
RL.build_lineup = build_lineup

if __name__ == "__main__":
    RL.main()
