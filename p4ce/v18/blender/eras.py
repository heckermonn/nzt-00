"""PR6 / Institute: the nine era emblems of the passage, drawn here once in the manner of the lineage insignias
(solid, geometric, made to be cut into a stele) and used for the stele reliefs and the page's SVG.

  /tmp/claude-0/bpyenv/bin/python eras.py   -> eras.json (polygons, 100-unit box, y down) + ../js/eras.js
"""
import json, math, os
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union
from shapely import affinity

HERE = os.path.dirname(os.path.abspath(__file__))


def stroke(pts, w, cap=1, join=1):
    return LineString(pts).buffer(w / 2, cap_style=cap, join_style=join, resolution=12)


def bez(a, b, c, d, n=24):
    return [tuple(((1 - t) ** 3) * a[k] + 3 * ((1 - t) ** 2) * t * b[k] + 3 * (1 - t) * t * t * c[k] + (t ** 3) * d[k] for k in (0, 1)) for t in (i / n for i in range(n))]


def blob(segs):
    pts = []
    for s in segs:
        pts += bez(*s)
    return Polygon(pts).buffer(0)


def ell(cx, cy, rx, ry, rot=0.0):
    e = affinity.scale(Point(cx, cy).buffer(1, resolution=32), rx, ry)
    return affinity.rotate(e, rot, origin=(cx, cy)) if rot else e


def tools():
    """A hand axe: struck stone, flake scars running in from the edge."""
    body = unary_union([Point(50, 64).buffer(25, resolution=40), Point(50, 8).buffer(1.5)]).convex_hull
    scars = [stroke(p, 2.0) for p in ([(50, 24), (43, 46), (51, 62), (46, 82)], [(43, 46), (31, 60)], [(51, 62), (65, 52)], [(65, 52), (70, 70)], [(50, 24), (58, 38)])]
    return body.difference(unary_union(scars))


def fire():
    outer = blob([((50, 93), (24, 93), (15, 66), (34, 46)), ((34, 46), (44, 35), (46, 22), (42, 7)),
                  ((42, 7), (66, 19), (85, 44), (81, 66)), ((81, 66), (79, 82), (66, 93), (50, 93))])
    inner = blob([((51, 85), (39, 85), (35, 71), (45, 61)), ((45, 61), (51, 55), (53, 49), (51, 41)),
                  ((51, 41), (63, 51), (69, 63), (67, 73)), ((67, 73), (65, 81), (59, 85), (51, 85))])
    return outer.difference(inner)


def agriculture():
    """An ear of grain."""
    parts = [stroke([(50, 97), (50, 26)], 3.4), ell(50, 14, 5.8, 11)]
    for y in (78, 65.5, 53, 40.5, 28):
        for s in (-1, 1):
            parts.append(ell(50 + s * 11.5, y, 5.8, 10.4, s * 30))
    parts.append(stroke([(50, 92), (36, 84), (27, 88)], 3.0)); parts.append(stroke([(50, 92), (64, 84), (73, 88)], 3.0))
    return unary_union(parts)


def mathematics():
    """The squares on the sides of a right triangle."""
    ox, oy = -6, 2
    C_, B_, A_ = (40 + ox, 60 + oy), (72 + ox, 60 + oy), (40 + ox, 36 + oy)
    tri = Polygon([C_, B_, A_])
    ring = lambda pts: Polygon(pts).exterior.buffer(1.5, join_style=2)
    sq1 = ring([A_, C_, (C_[0] - 24, C_[1]), (A_[0] - 24, A_[1])])
    sq2 = ring([C_, B_, (B_[0], B_[1] + 32), (C_[0], C_[1] + 32)])
    sq3 = ring([A_, B_, (B_[0] + 24, B_[1] - 32), (A_[0] + 24, A_[1] - 32)])
    return unary_union([tri, sq1, sq2, sq3])


def medicine():
    """A mortar and pestle: a remedy made the same way twice."""
    bowl = Point(47, 48).buffer(30, resolution=48).intersection(box(0, 50, 100, 100))
    rim = box(13, 43.5, 81, 50.5).buffer(1.0, resolution=6)
    foot = unary_union([box(38, 77, 56, 85), box(29, 84.5, 65, 91).buffer(1.0, resolution=6)])
    pestle = unary_union([stroke([(57, 39.5), (79, 13)], 7.2), Point(80.5, 11).buffer(6.0, resolution=20)])
    return unary_union([bowl, rim, foot, pestle])


def engineering():
    """An arch of cut stones: each one held up by the others."""
    cx, cy, R, r = 50, 60, 37, 22
    ring = Point(cx, cy).buffer(R, resolution=64).difference(Point(cx, cy).buffer(r, resolution=64)).intersection(box(0, 0, 100, cy))
    key = Polygon([(cx - 5.2, cy - r + 0.5), (cx + 5.2, cy - r + 0.5), (cx + 8.2, cy - R - 4.5), (cx - 8.2, cy - R - 4.5)])
    arch = unary_union([ring, key])
    cuts = []
    for k in (1, 2, 3, 4, 5, 6):
        a = math.radians(180 * k / 7.0)
        if k in (3, 4):                              # the keystone's own joints
            s = -1 if k == 3 else 1
            cuts.append(stroke([(cx + s * 5.2, cy - r + 0.5), (cx + s * 8.2, cy - R - 4.5)], 1.5, cap=2))
            continue
        cuts.append(stroke([(cx - (r - 2) * math.cos(a), cy - (r - 2) * math.sin(a)), (cx - (R + 2) * math.cos(a), cy - (R + 2) * math.sin(a))], 1.5, cap=2))
    arch = arch.difference(unary_union(cuts))
    piers = unary_union([box(cx - R, cy + 1.5, cx - r, 88), box(cx + r, cy + 1.5, cx + R, 88)])
    ground = box(7, 89.5, 93, 93.5)
    return unary_union([arch, piers, ground])


def flight():
    """A monoplane seen from above."""
    body = unary_union([stroke([(50, 16), (50, 60)], 8.4), Polygon([(45.8, 58), (54.2, 58), (51.6, 88), (48.4, 88)]).buffer(0.8, resolution=6)])
    wing = Polygon([(4, 46.5), (45, 35), (55, 35), (96, 46.5), (96, 53), (55, 50.5), (45, 50.5), (4, 53)]).buffer(1.2, resolution=8)
    tail = Polygon([(33, 81), (47.5, 75.5), (52.5, 75.5), (67, 81), (67, 85.5), (33, 85.5)]).buffer(1.0, resolution=8)
    prop = box(40, 9.4, 60, 12.2).buffer(0.7, resolution=6)
    return unary_union([body, wing, tail, prop])


def computation():
    """A punched card: thought, set down for a machine to hold."""
    card = Polygon([(23, 21), (88, 21), (88, 79), (12, 79), (12, 32)])
    edge = card.exterior.buffer(1.6, join_style=2)
    holes = []
    rows = [3, 0, 4, 1, 5, 2, 0, 3, 1, 4]
    second = {1: 5, 3: 1, 4: 2, 6: 4, 8: 5}
    for k, r in enumerate(rows):
        x = 24.0 + 6.1 * k
        for rr in [r] + ([second[k]] if k in second else []):
            y = 32.0 + 7.6 * rr
            holes.append(box(x - 1.75, y - 2.6, x + 1.75, y + 2.6))
    return unary_union([edge] + holes)


def space():
    """A boot print in dust that no wind will move."""
    sole = unary_union([ell(50, 33, 17.5, 24.5), ell(50, 77, 14.2, 15.5)]).convex_hull
    inner = sole.buffer(-3.6)
    bars = []
    y = 13.5
    while y < 92:
        bars.append(box(0, y, 100, y + 4.1)); y += 7.25
    tread = unary_union(bars).intersection(inner)
    edge = sole.difference(sole.buffer(-1.7))
    return affinity.rotate(unary_union([tread, edge]), 9, origin=(50, 52))


def fit(g, pad=5.0):
    """Centre the drawing in the 100 box and let it fill it to the same margin as the others."""
    x0, y0, x1, y1 = g.bounds
    s = (100 - 2 * pad) / max(x1 - x0, y1 - y0)
    g = affinity.scale(g, s, s, origin=((x0 + x1) / 2, (y0 + y1) / 2))
    return affinity.translate(g, 50 - (x0 + x1) / 2, 50 - (y0 + y1) / 2)


def rings(g):
    polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
    polys.sort(key=lambda q: -q.area)                # rings first: what lies inside a ring is drawn after its hole
    out = []
    for p in polys:
        p = p.simplify(0.04)
        out.append(dict(ext=[[round(x, 2), round(y, 2)] for x, y in p.exterior.coords[:-1]],
                        holes=[[[round(x, 2), round(y, 2)] for x, y in h.coords[:-1]] for h in p.interiors]))
    return out


def path(polys):
    d = []
    for p in polys:
        for r in [p["ext"]] + p["holes"]:
            d.append("M" + "L".join("%g %g" % (x, y) for x, y in r) + "Z")
    return "".join(d)


ORDER = ["tools", "fire", "agriculture", "mathematics", "medicine", "engineering", "flight", "computation", "space"]
shapes = dict(tools=tools(), fire=fire(), agriculture=agriculture(), mathematics=mathematics(), medicine=medicine(),
              engineering=engineering(), flight=flight(), computation=computation(), space=space())
data = {k: rings(fit(shapes[k])) for k in ORDER}
if __name__ == "__main__":
    json.dump(data, open(os.path.join(HERE, "eras.json"), "w"), separators=(",", ":"))
    js = ["// PR6 / Institute: the nine era emblems of the passage. Generated by blender/eras.py; do not edit by hand.",
          "export const ERA = {"]
    for k in ORDER:
        js.append("  %s: %s," % (k, json.dumps(path(data[k]))))
    js.append("};")
    js.append("export const eraGlyph = (id, cls = '') => `<svg class=\"glyph ${cls}\" viewBox=\"0 0 100 100\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" d=\"${ERA[id]}\"/></svg>`;")
    open(os.path.join(HERE, "..", "js", "eras.js"), "w").write("\n".join(js) + "\n")
    print("eras:", {k: len(v) for k, v in data.items()})
