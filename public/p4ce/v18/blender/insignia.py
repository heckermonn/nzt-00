"""PR6 / Institute: the four lineage insignias, drawn here once and used everywhere (page SVG, door reliefs, wax
seals, archive stele). Original geometric drawings informed by the historical forms; not copies of any artefact.

  /tmp/claude-0/bpyenv/bin/python insignia.py   -> insignia.json (polygons, 100-unit box, y down) + ../js/insignia.js
"""
import json, math, os
from shapely.geometry import Polygon, Point, LineString, box
from shapely.ops import unary_union
from shapely import affinity

HERE = os.path.dirname(os.path.abspath(__file__))


def ring_taper(cx, cy, R, a0, a1, w0, w1, n=160):
    """A band along a circle from angle a0 to a1 (degrees, screen coords) whose half-width eases from w0 to w1."""
    out, inn = [], []
    for i in range(n + 1):
        t = i / n; a = math.radians(a0 + (a1 - a0) * t)
        w = w0 + (w1 - w0) * (t ** 1.25)
        out.append((cx + (R + w) * math.cos(a), cy + (R + w) * math.sin(a)))
        inn.append((cx + (R - w) * math.cos(a), cy + (R - w) * math.sin(a)))
    return Polygon(out + inn[::-1])


def stroke(pts, w, cap=1, join=1):
    return LineString(pts).buffer(w / 2, cap_style=cap, join_style=join, resolution=12)


def ouroboros():
    cx, cy, R = 50, 51, 29
    a_head = -78                      # head sits just right of the top
    body = ring_taper(cx, cy, R, a_head, a_head + 318, 6.6, 1.3)
    # head: a blunt wedge lying on the circle, facing back along it to take the tail
    h = Polygon([(-10.5, 0), (-6.5, -6.2), (2.5, -7.4), (9.5, -4.6), (9.5, 4.6), (2.5, 7.4), (-6.5, 6.2)]).buffer(1.6, resolution=10)
    mouth = Polygon([(-13, 0), (-4.5, -2.4), (-4.5, 2.4)])
    eye = Point(1.5, -3.3).buffer(1.5, resolution=12)
    h = h.difference(mouth).difference(eye)
    a = math.radians(a_head - 5)
    hx, hy = cx + R * math.cos(a), cy + R * math.sin(a)
    h = affinity.rotate(h, math.degrees(a) + 90, origin=(0, 0)); h = affinity.translate(h, hx, hy)
    return unary_union([body, h])


def djed():
    parts = [Polygon([(34, 91), (66, 91), (60, 84), (40, 84)]).buffer(0.6, resolution=6)]
    parts.append(box(43, 46, 57, 85))                                  # shaft
    for y in (52, 58):                                                 # bindings under the capital
        parts.append(box(40.5, y, 59.5, y + 2.6))
    y = 12.5
    for wdt in (40, 46, 46, 40):                                       # four plates
        parts.append(box(50 - wdt / 2, y, 50 + wdt / 2, y + 5.4).buffer(0.9, resolution=6))
        y += 8.6
    parts.append(box(44.5, 11, 55.5, 47))                              # neck through the plates
    parts.append(box(46, 5.5, 54, 12).buffer(1.2, resolution=6))       # cap
    return unary_union(parts)


def scarab():
    sun = Point(50, 14.5).buffer(7.2, resolution=24)
    head = Point(50, 36.5).buffer(5.6, resolution=18).intersection(box(40, 29, 60, 37.6))
    head = unary_union([head, box(45.2, 36, 54.8, 38.6)])
    pron = affinity.scale(Point(50, 44.5).buffer(1, resolution=28), 14.5, 6.2)
    ely = affinity.scale(Point(50, 66).buffer(1, resolution=40), 15.6, 21.5)
    ely = ely.difference(box(49.1, 40, 50.9, 92)).difference(box(30, 40, 70, 52.2))
    legs = []
    for s in (-1, 1):
        f = lambda x: 50 + s * (x - 50)
        legs.append(stroke([(f(40), 43), (f(29), 35), (f(27.5), 23), (f(35), 11.5)], 2.9))       # fore legs lift the disc
        legs.append(stroke([(f(36.5), 58), (f(24), 56), (f(17), 64)], 2.9))
        legs.append(stroke([(f(37.5), 74), (f(26), 80), (f(23.5), 91)], 2.9))
    return unary_union([sun, head, pron, ely] + legs)


def shen():
    ring = Point(50, 42).buffer(29, resolution=48).difference(Point(50, 42).buffer(20.5, resolution=48))
    bar = box(13, 78, 87, 85.5).buffer(0.8, resolution=6)
    knot = box(43.5, 69, 56.5, 79)
    ties = unary_union([box(40.5, 72.2, 59.5, 74.6)])
    return unary_union([ring, bar, knot, ties])


def emblem():
    """The institutional mark: a ring opened by one upright aperture, the threshold."""
    ring = Point(50, 50).buffer(34, resolution=64).difference(Point(50, 50).buffer(27, resolution=64))
    ring = ring.difference(box(46.2, 0, 53.8, 30))
    door = box(46.2, 34, 53.8, 66)
    return unary_union([ring, door])


def rings(g):
    polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
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


META = {
    "ouroboros": ("Ouroboros", "Continuity through transformation.", "What devours its end to begin again?",
                  "A serpent taking its own tail: an ancient image of cyclic continuity and renewal, found in Egyptian funerary texts and later in alchemical drawing."),
    "djed": ("Djed", "Foundations and endurance.", "What remains standing when the world is remade?",
             "The Egyptian pillar sign associated with stability and with the enduring Osirian tradition."),
    "scarab": ("Scarab", "Regeneration and decisive beginnings.", "What brings the morning into being?",
               "The Egyptian scarab, associated with Khepri, the rising sun and the idea of coming into being."),
    "shen": ("Shen Ring", "Preserving what matters across time.", "What encircles and protects without end?",
             "The Egyptian ring sign associated with encircling, protection, continuity and eternity."),
}
shapes = {"ouroboros": ouroboros(), "djed": djed(), "scarab": scarab(), "shen": shen(), "emblem": emblem()}
data = {k: rings(g) for k, g in shapes.items()}
json.dump(data, open(os.path.join(HERE, "insignia.json"), "w"), separators=(",", ":"))
js = ["// PR6 / Institute: lineage insignias. Generated by blender/insignia.py; do not edit by hand.",
      "export const INSIGNIA = {"]
for k, (name, mean, clue, hist) in META.items():
    js.append("  %s: {id: %s, name: %s, meaning: %s, clue: %s, history: %s, d: %s}," % (
        k, json.dumps(k), json.dumps(name), json.dumps(mean), json.dumps(clue), json.dumps(hist), json.dumps(path(data[k]))))
js.append("};")
js.append("export const EMBLEM = %s;" % json.dumps(path(data["emblem"])))
js.append("export const ORDER = ['ouroboros', 'djed', 'scarab', 'shen'];")
js.append("export const glyph = (id, cls = '') => `<svg class=\"glyph ${cls}\" viewBox=\"0 0 100 100\" aria-hidden=\"true\" focusable=\"false\"><path fill-rule=\"evenodd\" d=\"${id === 'emblem' ? EMBLEM : INSIGNIA[id].d}\"/></svg>`;")
open(os.path.join(HERE, "..", "js", "insignia.js"), "w").write("\n".join(js) + "\n")
# a contact sheet to look at
svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 110" width="1080" height="220"><rect width="540" height="110" fill="#F2F3EF"/>']
for i, k in enumerate(shapes):
    svg.append('<g transform="translate(%d 5)"><path fill="#171C1F" fill-rule="evenodd" d="%s"/></g>' % (5 + i * 107, path(data[k])))
svg.append("</svg>")
open("/tmp/claude-0/insignia-sheet.svg", "w").write("".join(svg))
print({k: len(path(v)) for k, v in data.items()})
