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

HEROES = {
    "vial_hero": dict(pid="PR6-C-0103", cap="orange", yaw=-14, elev=14.0),
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
    return dict(product=s["pid"], pack="vial", w=res[0], h=res[1], ink_text=vials.ink_text(s["pid"]), packs=boxes)


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


RL.build_hero = build_hero
RL.build_lineup = build_lineup

if __name__ == "__main__":
    RL.main()
