"""PR6 / Institute: the real-time world. Builds one zone with the still scenes' materials and lights, bakes its light
into textures (bake.py) and writes what the page loads:

  OUT/<zone>.glb            geometry only: one mesh per group, one UV layout each
  OUT/<zone>_<group>_*.webp the baked textures (_c colour, _l light, _l_<lamp> one lamp alone, _b combined)
  OUT/<zone>.json           groups (mode, scales), emitters, and the anchors the page needs (Blender coordinates, z up)

  PY world.py -- --zone alley|passage|atrium|compass|formulary|archive --out OUT [--q 1.0] [--samples 64]
"""
import argparse, json, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa
import numpy as np  # noqa
from PIL import Image  # noqa
from mathutils import Vector, Euler  # noqa
import common as C  # noqa
import mats as M  # noqa
import bake as B  # noqa
from common import plain, emit, area, point, spot, sun, nodes, CHALK, MIST, STEEL_BLUE, INK, ORANGE, DEEP_BLUE, SKY  # noqa

ap = argparse.ArgumentParser()
ap.add_argument("--zone", required=True); ap.add_argument("--out", required=True)
ap.add_argument("--q", type=float, default=1.0); ap.add_argument("--samples", type=int, default=64)
ap.add_argument("--only", default=""); ap.add_argument("--blend", action="store_true")
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
os.makedirs(a.out, exist_ok=True)
DAY = (0.86, 0.93, 1.0)

G = {}            # group name -> objects
MODE = {}         # group name -> (mode, res, cres)
EMIT = []         # (object, rgb, strength, lamp)
LAMPS = {}        # lamp name -> light objects + emitter objects that belong to it
ANCH = {}         # named points / rects for the page
_cur = [None]


def into(g, mode="split", res=1024, cres=None):
    G.setdefault(g, []); _cur[0] = g
    if g not in MODE:
        MODE[g] = (mode, res, cres)


def _add(o):
    G[_cur[0]].append(o); return o


def box(*p, **k): return _add(C.box(*p, **k))
def cyl(*p, **k): return _add(C.cyl(*p, **k))
def sphere(*p, **k): return _add(C.sphere(*p, **k))
def lathe(*p, **k): return _add(M.lathe(*p, **k))


def glow(o, rgb, strength, lamp="", show=True):
    """An emitter: lights the bake, and (show) is exported as a flat bright surface."""
    for g in G.values():
        if o in g:
            g.remove(o)
    EMIT.append((o, rgb, strength, lamp, show))
    if lamp:
        LAMPS.setdefault(lamp, []).append(o)
    return o


def quad(name, pts, mat):
    """One flat face, normal by the right-hand rule: rooms seen only from inside need no backs."""
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in pts], [], [tuple(range(len(pts)))]); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if mat:
        me.materials.append(mat)
    return _add(o)


def cut(o, cutter):
    md = o.modifiers.new("cut", "BOOLEAN"); md.object = cutter; md.operation = "DIFFERENCE"; md.solver = "EXACT"
    cutter.hide_render = True; cutter.display_type = "WIRE"


FLAGS = {}        # group name -> extra facts for the page (joints, reflect, ...)
LAMPGAIN = {}     # combined group -> the lamp that lights it: the page is told how dark the group is without it


def flag(g, **k):
    FLAGS.setdefault(g, {}).update(k)


def lamp(name, *objs):
    LAMPS.setdefault(name, []).extend(objs)


def r2(x):
    return int(round(max(64, x * a.q) / 64) * 64)


# =============================================================================================== ALLEY
def alley():
    random.seed(6)
    sc = C.setup(512, a.samples)
    C.world(sc, (0.012, 0.016, 0.026), 0.4)
    W, H = 2.35, 11.0
    DOOR_Y, DX, DW, DH = 6.6, 1.08, 1.36, 2.92
    MED_Z, MED_R = 2.24, 0.33
    SLIT_Z, SLIT_W, SLIT_H = 1.60, 0.44, 0.11
    CON = M.concrete("concrete"); CON2 = M.concrete("concrete_r", (0.95, 0.98, 1.04))
    STEEL = M.worn_steel("steel", (0.30, 0.32, 0.34), 0.42)
    LEAF = M.worn_steel("leaf", (0.17, 0.185, 0.20), 0.5)
    MEDAL = M.worn_steel("medal", (0.46, 0.48, 0.50), 0.36)
    RUST = plain("rust", (0.10, 0.075, 0.06), 0.85, 0.2)
    BLACK = plain("black", (0.02, 0.02, 0.022), 0.6)
    PIPE = plain("pipe", (0.20, 0.21, 0.22), 0.5, 0.8)
    CARD = plain("card", (0.055, 0.05, 0.045), 0.7)
    WOOD = plain("wood", (0.13, 0.11, 0.09), 0.85)

    into("ground", "split", r2(1024), r2(1024))
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, -4, 0)); g = bpy.context.object
    g.scale = (2 * W + 4, 30, 1); bpy.ops.object.transform_apply(scale=True); g.data.materials.append(M.asphalt()); _add(g)

    into("walls", "split", r2(1024), r2(2048))
    box("wall_r", (W + 0.3, -4, H / 2), (0.6, 22, H), CON2)
    box("wall_l", (-W - 0.3, -4, H / 2), (0.6, 22, H), CON)
    for y in (-9.5, -5.5, -1.5, 2.5):
        for s in (-1, 1):
            box("pil", (s * (W - 0.07), y, H / 2), (0.16, 0.6, H), CON if s < 0 else CON2)
    box("bridge", (0, -3.0, 8.6), (2 * W, 1.2, 0.35), CON)

    into("end", "split", r2(2048), r2(2048))
    OW, OH, T = DW + 0.26, DH + 0.2, 0.7
    xs = [-W - 0.6, -DX - OW / 2, -DX + OW / 2, DX - OW / 2, DX + OW / 2, W + 0.6]
    for i in (0, 2, 4):
        box("end%d" % i, ((xs[i] + xs[i + 1]) / 2, DOOR_Y + T / 2, H / 2), (xs[i + 1] - xs[i], T, H), CON2)
    for s in (-1, 1):
        box("over", (s * DX, DOOR_Y + T / 2, (OH + H) / 2), (OW, T, H - OH), CON2)
    box("canopy", (0, DOOR_Y - 0.42, 3.86), (2 * DX + OW + 0.9, 0.9, 0.2), CON)
    box("step", (0, DOOR_Y - 0.28, 0.05), (2 * DX + OW + 0.5, 0.6, 0.1), CON)

    into("metal", "combined", r2(1024))
    box("channel", (0, DOOR_Y - 0.1, 3.56), (2 * DX + OW + 0.4, 0.12, 0.1), STEEL)

    def door(s):
        k = "L" if s < 0 else "R"
        x = s * DX; y0 = DOOR_Y + 0.2
        into("metal")
        for sx in (-1, 1):
            box("jamb", (x + sx * (OW / 2 - 0.06), DOOR_Y + 0.14, OH / 2), (0.12, 0.3, OH), STEEL)
        box("head", (x, DOOR_Y + 0.14, OH - 0.06), (OW, 0.3, 0.12), STEEL)
        box("lamp_hood", (x, DOOR_Y - 0.12, 3.495), (0.4, 0.2, 0.04), STEEL)
        for i in range(5):
            cyl("cage", (x - 0.16 + i * 0.08, DOOR_Y - 0.2, 3.48), (x - 0.16 + i * 0.08, DOOR_Y - 0.2, 3.39), 0.004, STEEL, 8)
        into("door" + k, "combined", r2(1024))
        sz0, sz1 = SLIT_Z - SLIT_H / 2, SLIT_Z + SLIT_H / 2
        box("leaf_lo", (x, y0 + 0.04, sz0 / 2 + 0.05), (DW, 0.08, sz0 - 0.1), LEAF)
        box("leaf_hi", (x, y0 + 0.04, (sz1 + DH + 0.1) / 2), (DW, 0.08, DH + 0.1 - sz1), LEAF)
        for sx in (-1, 1):
            wdt = (DW - SLIT_W) / 2
            box("leaf_s", (x + sx * (SLIT_W / 2 + wdt / 2), y0 + 0.04, SLIT_Z), (wdt, 0.08, SLIT_H), LEAF)
        for z in (0.38, 1.18, 2.76):
            box("band", (x, y0 - 0.008, z), (DW, 0.02, 0.085), STEEL)
            for i in range(9):
                sphere("riv", (x - DW / 2 + 0.09 + i * (DW - 0.18) / 8, y0 - 0.02, z), 0.014, STEEL, 10)
        for sx in (-1, 1):
            for i in range(14):
                sphere("riv", (x + sx * (DW / 2 - 0.045), y0 - 0.004, 0.2 + i * 0.2), 0.012, STEEL, 10)
        fw, fd = SLIT_W + 0.12, 0.035
        box("sl_t", (x, y0 - fd / 2, SLIT_Z + SLIT_H / 2 + 0.025), (fw, fd, 0.05), STEEL, 0.004)
        box("sl_b", (x, y0 - fd / 2, SLIT_Z - SLIT_H / 2 - 0.025), (fw, fd, 0.05), STEEL, 0.004)
        for sx in (-1, 1):
            box("sl_s", (x + sx * (SLIT_W / 2 + 0.03), y0 - fd / 2, SLIT_Z), (0.06, fd, SLIT_H), STEEL, 0.004)
            sphere("riv", (x + sx * (SLIT_W / 2 + 0.03), y0 - fd - 0.002, SLIT_Z), 0.011, STEEL, 10)
        cyl("medal_back", (x, y0 - 0.012, MED_Z), (x, y0 + 0.005, MED_Z), MED_R + 0.012, STEEL, 64)
        box("kick", (x, y0 - 0.006, 0.17), (DW - 0.1, 0.012, 0.2), STEEL)
        into("shut" + k, "combined", r2(128))
        box("shutter", (x, y0 + 0.1, SLIT_Z), (SLIT_W + 0.1, 0.012, SLIT_H + 0.08), plain("shut", (0.10, 0.11, 0.12), 0.38, 1.0))
        box("sh_rib", (x, y0 + 0.092, SLIT_Z), (SLIT_W + 0.1, 0.006, 0.012), STEEL)
        # the four insignia this door may carry: reliefs, baked one at a time, exported as flat sheets
        for sym in C.SYMS:
            into("med%s_%s" % (k, sym), "relief", r2(384))
            m = C.medallion("medal", sym, MED_R, 0.03, MEDAL, px=300); m.location = (x, y0 - 0.012, MED_Z); _add(m)
        # the caged lamp above
        g = "lamp" + k
        b = C.cyl("bulb", (x - 0.11, DOOR_Y - 0.12, 3.44), (x + 0.11, DOOR_Y - 0.12, 3.44), 0.028, emit("bulb" + g, (0.80, 0.90, 1.0), 60), 12)
        b.name = "bulb" + k; into("metal"); _add(b); glow(b, (0.80, 0.90, 1.0), 60, g)
        lamp(g, spot("spot" + g, "", (x, DOOR_Y - 0.2, 3.40), (x, DOOR_Y - 0.55, 0), 1000, (0.80, 0.90, 1.0), angle=118, blend=0.9, radius=0.12))
        ANCH["door" + k] = dict(rect=[[x - DW / 2, y0, DH], [x + DW / 2, y0, 0]], hinge=[x - s * DW / 2, y0 + 0.04, 0])
        ANCH["med" + k] = dict(rect=[[x - MED_R - 0.05, y0 - 0.03, MED_Z + MED_R + 0.05], [x + MED_R + 0.05, y0 - 0.03, MED_Z - MED_R - 0.05]])
        ANCH["slit" + k] = dict(rect=[[x - SLIT_W / 2, y0, SLIT_Z + SLIT_H / 2], [x + SLIT_W / 2, y0, SLIT_Z - SLIT_H / 2]])
        ANCH["lamp" + k] = dict(p=[x, DOOR_Y - 0.12, 3.44])

    door(-1); door(1)

    into("metal")
    cyl("conduit", (0, DOOR_Y - 0.03, 0.1), (0, DOOR_Y - 0.03, 3.5), 0.022, PIPE, 12)
    box("jbox", (0, DOOR_Y - 0.05, 1.42), (0.16, 0.08, 0.22), STEEL, 0.006)
    pl = C.sphere("pilot", (0, DOOR_Y - 0.1, 1.47), 0.011, emit("pilot", (1.0, 0.36, 0.07), 60), 12); _add(pl); glow(pl, (1.0, 0.36, 0.07), 60)
    point("pilot_l", "", (0, DOOR_Y - 0.14, 1.47), 0.5, (1.0, 0.4, 0.1), 0.02)
    into("clutter", "combined", r2(1024))
    cyl("pipe_l", (-W + 0.18, -14, 3.5), (-W + 0.18, DOOR_Y, 3.5), 0.11, PIPE)
    cyl("pipe_l2", (-W + 0.15, -14, 3.86), (-W + 0.15, DOOR_Y, 3.86), 0.06, RUST)
    cyl("pipe_r", (W - 0.2, -14, 4.3), (W - 0.2, DOOR_Y, 4.3), 0.08, PIPE)
    cyl("down_r", (W - 0.2, 4.9, 0), (W - 0.2, 4.9, 9.5), 0.07, PIPE)
    cyl("down_l", (-W + 0.18, 5.6, 0), (-W + 0.18, 5.6, 3.5), 0.09, PIPE)
    cyl("vent_l", (-W + 0.2, 1.4, 3.5), (-W + 0.62, 1.4, 2.3), 0.1, RUST)
    for y in (-6, -2, 2, 5.2):
        cyl("brk", (-W + 0.02, y, 3.5), (-W + 0.22, y, 3.5), 0.025, STEEL)
    box("fl_housing", (W - 0.08, 2.2, 2.95), (0.1, 1.3, 0.12), plain("hous", (0.4, 0.42, 0.44), 0.5))
    tube = C.cyl("fl_tube", (W - 0.14, 1.6, 2.9), (W - 0.14, 2.8, 2.9), 0.022, emit("tube", (0.70, 0.92, 1.0), 26), 12); _add(tube); glow(tube, (0.70, 0.92, 1.0), 26, "tube")
    lamp("tube", area("fl", "", (W - 0.18, 2.2, 2.85), (0, 2.6, 0.4), 1.2, 150, (0.70, 0.92, 1.0), sy=0.06))
    for (x, y, z) in ((W - 0.36, 0.5, 5.6), (-W + 0.36, 3.6, 5.2), (W - 0.36, 5.4, 6.6)):
        box("ac", (x, y, z), (0.7, 0.9, 0.7), plain("ac", (0.22, 0.23, 0.24), 0.6, 0.3), 0.02)
    box("dumpster", (W - 0.78, -0.4, 0.62), (1.1, 2.0, 1.24), plain("dump", (0.05, 0.07, 0.08), 0.5, 0.4), 0.03)
    box("lid", (W - 0.88, -0.4, 1.29), (1.25, 2.05, 0.08), BLACK, 0.01, (0, math.radians(-7), 0))
    for i, (x, y, z, r) in enumerate(((-W + 0.5, 3.3, 0.21, 12), (-W + 0.55, 3.95, 0.18, -8), (-W + 0.48, 3.6, 0.55, 30))):
        box("card%d" % i, (x, y, z), (0.6, 0.5, 0.42), CARD, 0.01, (0, 0, math.radians(r)))
    for i in range(3):
        box("pal", (-W + 0.66, -0.3, 0.08 + i * 0.15), (1.0, 1.2, 0.1), WOOD, 0, (0, 0, math.radians(4 * i)))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.32, minor_radius=0.11, major_segments=32, minor_segments=10, location=(W - 0.55, 5.6, 0.11))
    bpy.context.object.data.materials.append(BLACK); _add(bpy.context.object)
    for (y, z, sg) in ((0.8, 6.6, 0.7), (2.6, 7.4, 1.0), (4.2, 5.9, 0.4), (5.6, 7.9, 0.9), (-2.0, 7.0, 0.8)):
        cu = bpy.data.curves.new("c", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.012; cu.bevel_resolution = 1
        sp = cu.splines.new("POLY"); n = 16; sp.points.add(n - 1)
        for i in range(n):
            t = i / (n - 1); sp.points[i].co = (-W + 2 * W * t, y + 0.3 * math.sin(t * 3), z - sg * 4 * t * (1 - t), 1)
        o = bpy.data.objects.new("cable", cu); sc.collection.objects.link(o); o.data.materials.append(BLACK); _add(o)

    area("sky", "", (0, -1, 12.5), (0, -1, 0), 3.0, 120, (0.30, 0.46, 0.74), sy=22)
    area("street", "", (0, -13, 4.5), (0, 4, 2), 4.0, 50, (0.42, 0.56, 0.78), sy=3)
    area("wall_wash", "", (0, 3.4, 9.5), (0, DOOR_Y, 5.5), 3.2, 36, (0.34, 0.50, 0.74), sy=1.2)
    point("steam_lamp", "", (-W + 0.6, 1.9, 2.6), 46, (0.72, 0.86, 1.0), 0.4)
    C.camera((0, 1.0, 1.55), (0, DOOR_Y, 2.2), lens=25)
    ANCH.update(dims=dict(W=W, H=H, DOOR_Y=DOOR_Y, DX=DX, DW=DW, DH=DH, MED_Z=MED_Z, MED_R=MED_R, SLIT_Z=SLIT_Z, SLIT_W=SLIT_W, SLIT_H=SLIT_H, T=T, OW=OW, OH=OH),
                pilot=dict(p=[0, DOOR_Y - 0.1, 1.47]), tube=dict(p=[W - 0.14, 2.2, 2.9]), steam=dict(p=[-W + 1.0, 1.6, 2.4]))
    flag("ground", reflect=1.0)
    return dict(expo=0.82, split_lamps={"end": ["lampL", "lampR"], "ground": ["lampL", "lampR", "tube"], "walls": ["tube"]})


# =============================================================================================== PASSAGE
PASS = dict(N=9, W0=1.7, W1=13.0, H0=3.2, H1=22.0, L0=5.0, L1=10.0)


def bays():
    out, y = [], 0.0
    for i in range(PASS["N"]):
        s = i / (PASS["N"] - 1)
        w = PASS["W0"] * (PASS["W1"] / PASS["W0"]) ** s; h = PASS["H0"] * (PASS["H1"] / PASS["H0"]) ** s; l = PASS["L0"] * (PASS["L1"] / PASS["L0"]) ** s
        out.append((round(y, 3), round(w, 3), round(h, 3), round(l, 3))); y += l
    return out, round(y, 3)


def passage():
    """Nine bays, each wider, taller, longer and paler than the last: dark concrete at the door, chalk at the Atrium.
    Its only light is the daylight of the Atrium at the far end."""
    sc = C.setup(512, a.samples, bounces=14); sc.cycles.diffuse_bounces = 10
    C.world(sc, DAY, 0.0)
    B_, L = bays()
    dark = (0.060, 0.064, 0.070)
    for i, (y0, w, h, l) in enumerate(B_):
        s = i / (len(B_) - 1); k = s ** 1.25
        base = tuple(dark[c] + (CHALK[c] * 0.96 - dark[c]) * k for c in range(3))
        ST = C.mineral("st%d" % i, base, 0.10 - 0.04 * s, (0.6, 0.6, 5.0), (0.50, 0.70), 0.05)
        FL = C.mineral("fl%d" % i, tuple(v * 0.9 for v in base), 0.08, (1.2, 1.2, 1.0), (0.16, 0.34), 0.02)
        into("p%d" % (i // 3), "split", r2(1024), r2(512)); flag("p%d" % (i // 3), joints=[3.2, 1.6, 0.78])
        y1 = y0 + l; x = w / 2
        quad("wl", [(-x, y0, 0), (-x, y1, 0), (-x, y1, h), (-x, y0, h)], ST)
        quad("wr", [(x, y1, 0), (x, y0, 0), (x, y0, h), (x, y1, h)], ST)
        quad("ce", [(-x, y1, h), (x, y1, h), (x, y0, h), (-x, y0, h)], ST)
        into("pf%d" % (i // 3), "split", r2(512), r2(256)); flag("pf%d" % (i // 3), reflect=0.35)
        quad("fl", [(-x, y0, 0), (x, y0, 0), (x, y1, 0), (-x, y1, 0)], FL)
        if i + 1 < len(B_):
            w2, h2 = B_[i + 1][1], B_[i + 1][2]; x2 = w2 / 2
            into("p%d" % ((i + 1) // 3))
            ST2 = ST
            quad("sl", [(-x2, y1, 0), (-x2, y1, h2), (-x, y1, h2), (-x, y1, 0)], ST2)
            quad("sr", [(x, y1, 0), (x, y1, h2), (x2, y1, h2), (x2, y1, 0)], ST2)
            quad("st", [(-x, y1, h), (-x, y1, h2), (x, y1, h2), (x, y1, h)], ST2)
    # ---- the nine records: one stele in each bay, its era cut into the face in sunk relief (as on the Archive stele).
    # Stone, then metal, then glass; each grows with its bay until the last is the size of the member's own. Each has
    # its own lamp, baked alone so that the page can let the light find a stele as the walker reaches it.
    steles, split = [], {}
    for i, (y0, w, h, l) in enumerate(B_):
        s = i / (len(B_) - 1); u = s ** 1.15
        sw, sh = 0.56 + 2.84 * u, 1.9 + 3.7 * u; st = max(0.16, 0.2 * sw); bh = 0.035 * sw
        sd = 1 if i % 2 == 0 else -1
        sx, sy = sd * (0.31 - 0.09 * s) * w, y0 + 0.6 * l
        if i < 3:
            base = [(0.15, 0.155, 0.165), (0.25, 0.245, 0.24), (0.46, 0.45, 0.43)][i]
            MAT = C.mineral("era%d" % i, base, 0.08, (0.8, 0.8, 6.0), (0.55, 0.78), 0.07)
        elif i < 6:
            rgb, rough = [((0.23, 0.27, 0.31), 0.56), ((0.47, 0.52, 0.56), 0.50), ((0.80, 0.82, 0.83), 0.46)][i - 3]
            MAT = plain("era%d" % i, rgb, rough, 1.0); C.noise_bump(MAT, 260, 0.05, 0.002, 2)
        else:
            MAT = C.glass("era%d" % i, (0.50, 0.64, 0.74), [0.42, 0.34, 0.26][i - 6], 1.45)
        yf = sy - st / 2; z0 = bh; depth = 0.025 * sw; gap = depth + 0.0045 * sw
        px = 300 if i < 3 else 420 if i < 6 else 520
        into("era%d" % i, "relief", r2(512 if i < 3 else 768 if i < 6 else 1024))
        m = C.symbol_mask(C.ERAS[i], px, fit=0.84, blur=px / 260)
        Hh = np.zeros((int(px * sh / sw), px), np.float32)
        r0 = int(Hh.shape[0] * 0.40 - px / 2); Hh[r0:r0 + px, :] = -m
        nm = C.numeral_mask(i + 1, int(px * 0.1), 0.2); r1 = int(Hh.shape[0] * 0.40 + px * 0.56); c1 = (px - nm.shape[1]) // 2
        Hh[r1:r1 + nm.shape[0], c1:c1 + nm.shape[1]] = np.minimum(Hh[r1:r1 + nm.shape[0], c1:c1 + nm.shape[1]], -0.6 * nm)
        face = C.height_mesh("face", Hh, sw, sh, depth, MAT); face.location = (sx, yf, z0 + sh / 2); _add(face)
        into("body%d" % i, "combined", r2(256 if i < 4 else 512))
        box("stele", (sx, yf + (gap + st) / 2, z0 + sh / 2), (sw, st - gap, sh), MAT)
        for q in (-1, 1):
            box("rim", (sx + q * (sw / 2 - 0.006), yf + 0.001 + gap / 2, z0 + sh / 2), (0.012, gap, sh), MAT)
        box("rim", (sx, yf + 0.001 + gap / 2, z0 + sh - 0.006), (sw, gap, 0.012), MAT)
        box("base", (sx, sy, bh / 2), (sw * 1.12, st + sw * 0.12, bh), plain("base%d" % i, (INK[0] * 3, INK[1] * 3, INK[2] * 3), 0.4, 1.0))
        # the lamp: from above and in front, on the side of the walker
        d = 1.45 * sh; tgt = (sx, yf, z0 + sh * 0.58)
        Lt = [0.8, 0.8, 0.55, 1.4, 1.8, 2.2, 2.0, 2.5, 3.0][i]
        rgbl = (1.0, 0.60, 0.34) if i == 1 else DAY                      # Fire is the one warm light in the building
        lp = spot("s%d" % i, "", (sx - sd * 0.22 * sw, yf - 0.95 * sh, z0 + sh * 1.55), tgt, Lt * 52.0 * d * d, rgbl, angle=36, blend=0.55, radius=0.04 * sw)
        lamp("s%d" % i, lp)
        split.setdefault("p%d" % (i // 3), []).append("s%d" % i); split.setdefault("pf%d" % (i // 3), []).append("s%d" % i)
        LAMPGAIN["era%d" % i] = LAMPGAIN["body%d" % i] = "s%d" % i
        steles.append(dict(x=round(sx, 3), y=round(sy, 3), yf=round(yf, 3), z0=round(z0, 3), sw=round(sw, 3), sh=round(sh, 3), st=round(st, 3), side=sd, lamp="s%d" % i))
    # the Atrium beyond the mouth, stood in for by its light: a bright room and a sunlit floor
    e1 = C.box("room", (0, L + 34, 24), (110, 0.2, 48), emit("room", DAY, 1.9)); glow(e1, DAY, 1.9, show=False)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, L + 18, 0.0)); e2 = bpy.context.object
    e2.scale = (70, 32, 1); bpy.ops.object.transform_apply(scale=True); e2.data.materials.append(emit("sunfloor", (1.0, 0.98, 0.95), 1.3)); glow(e2, DAY, 1.3, show=False)
    area("sky", "", (0, L + 16, 46), (0, L - 8, 0), 30, 30000, DAY, sy=30)
    C.camera((0, 0.5, 1.6), (0, L, 6.0), lens=24)
    ANCH.update(bays=[list(b) for b in B_], L=L, steles=steles)
    return dict(expo=1.0, split_lamps=split)


# =============================================================================================== ATRIUM
A_FAR, A_HH, A_PX, A_BACK = 74.0, 48.0, 23.0, -17.0


def atrium():
    sc = C.setup(512, a.samples)
    C.world(sc, DAY, 1.0)
    STONE = C.mineral("stone", CHALK, 0.07, (0.5, 0.5, 6.0), (0.42, 0.62), 0.05)
    FLOOR = C.mineral("floor", (CHALK[0] * 0.9, CHALK[1] * 0.91, CHALK[2] * 0.93), 0.07, (1.2, 1.2, 1.0), (0.10, 0.26), 0.015)
    FAR, HH, PX = A_FAR, A_HH, A_PX
    Y0, Y1 = A_BACK - 1.0, FAR + 4.0                 # the floor runs from the back wall to the far side of the far wall
    into("floor", "split", r2(2048), r2(512)); flag("floor", reflect=0.5)
    floor = box("floor", (0, (Y0 + Y1) / 2, -0.3), (150, Y1 - Y0, 0.6), FLOOR)
    cut(floor, C.box("pool_cut", (0, 38, -0.1), (6.4, 52, 0.5), None))
    into("water", "none")
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 38, -0.07)); w = bpy.context.object
    w.scale = (6.4, 52, 1); bpy.ops.object.transform_apply(scale=True); w.data.materials.append(M.water()); _add(w)
    into("far", "split", r2(2048), r2(256)); flag("far", joints=[7.0, 3.5, 0.72])
    wall = box("far", (0, FAR + 2, HH / 2), (150, 4, HH), STONE)
    cut(wall, C.cyl("cut_circle", (0, FAR - 1, 18.0), (0, FAR + 5, 18.0), 11.0, None, 128, smooth=False))
    cut(wall, C.box("cut_slot", (-21.5, FAR + 2, 17.0), (5.0, 8, 34.0), None))
    cut(wall, C.box("cut_square", (21.5, FAR + 2, 7.0), (12.0, 8, 12.0), None))
    # daylight behind the openings (in the page this is the open sky of the court beyond)
    lf = C.box("light_far", (0, FAR + 9, HH / 2), (150, 0.2, HH), emit("glow", DAY, 2.4)); lf.visible_shadow = False; glow(lf, DAY, 2.4, show=False)
    area("day_circle", "", (0, FAR + 3.5, 18.0), (0, 0, 6), 22, 5000, DAY, shape="DISK")
    area("day_slot", "", (-21.5, FAR + 3.5, 17), (-10, 0, 4), 5, 2600, DAY, sy=34)
    area("day_square", "", (21.5, FAR + 3.5, 7.0), (10, 0, 2), 12, 2400, DAY, sy=12)
    into("fit", "split", r2(1024), r2(256))
    for k in range(10):
        box("stair", (0, FAR - 7.0 + k * 0.7, 0.35 + k * 0.7), (10.0, 0.72, 0.7), FLOOR)
    for x in (-36.0, -11.0, 11.0, 36.0):
        box("door", (x, FAR - 0.02, 1.25), (1.15, 0.1, 2.5), plain("doorm", (INK[0] * 4, INK[1] * 4, INK[2] * 4), 0.5))
    BENCH = C.mineral("bench", CHALK, 0.05, (1, 1, 1), (0.3, 0.45), 0.03)
    for s in (-1, 1):
        box("bench", (s * 8.5, 9.5, 0.24), (3.6, 0.7, 0.48), BENCH, 0.01)
    into("piers", "split", r2(2048), r2(256)); flag("piers", joints=[7.0, 3.5, 0.72])
    for s in (-1, 1):
        for k in range(6):
            box("pier", (s * PX, 4 + k * 14.0, HH / 2), (3.2, 3.2, HH), STONE)
        v = C.box("void", (s * 70, (Y0 + Y1) / 2, HH / 2), (0.2, Y1 - Y0 + 30, HH * 1.4), emit("void", DAY, 1.7)); v.visible_shadow = False; glow(v, DAY, 1.7)
    into("shell", "split", r2(1024), r2(256)); flag("shell", joints=[7.0, 3.5, 0.72])
    box("roof_r", (37.5, (Y0 + Y1) / 2, HH + 1), (68, Y1 - Y0, 2), STONE)
    box("roof_l", (-16.5, (Y0 + Y1) / 2, HH + 1), (26, Y1 - Y0, 2), STONE)
    back = box("back", (0, A_BACK, HH / 2), (150, 2, HH), STONE)
    cut(back, C.box("cut_mouth", (0, A_BACK, PASS["H1"] / 2 - 0.5), (PASS["W1"], 6, PASS["H1"] + 1.0), None))
    # the court beyond the far wall: open sky, the pavilions stand in its haze
    into("court", "split", r2(512), r2(256))
    quad("court", [(-75, FAR + 4, 0), (75, FAR + 4, 0), (75, FAR + 80, 0), (-75, FAR + 80, 0)], FLOOR)
    sun("sun", "", (0.80, 0.22, -0.62), 4.6, (1.0, 0.98, 0.95), 1.0)
    area("sky_slot", "", (0, 36, HH + 6), (0, 36, 0), 7, 16000, DAY, sy=100)
    area("fill", "", (0, -14, 14), (0, 30, 8), 30, 1800, DAY, sy=20)
    C.camera((0, -4.0, 1.7), (0, FAR, 13.0), lens=21)
    ANCH.update(compass=dict(p=[0, FAR, 18.0]), formulary=dict(p=[-21.5, FAR, 17.0]), archive=dict(p=[21.5, FAR, 7.0]),
                compass_base=dict(p=[0, FAR, 7.0]), formulary_base=dict(p=[-21.5, FAR, 0.0]), archive_base=dict(p=[21.5, FAR, 1.0]),
                inscription=dict(p=[0, 6.0, 0.0]), cam=dict(p=[0, -4.0, 1.7], t=[0, FAR, 13.0]),
                dims=dict(FAR=FAR, HH=HH, BACK=A_BACK, MW=PASS["W1"], MH=PASS["H1"], pool=[0, 38, 6.4, 52]))
    return dict(expo=0.40)


# =============================================================================================== COMPASS
def compass():
    sc = C.setup(512, a.samples, bounces=12)
    C.world(sc, DAY, 0.5)
    R, HH, D = 11.0, 17.0, 18.0
    WALL = C.mineral("wall", CHALK, 0.05, (0.6, 0.6, 5.0), (0.5, 0.7), 0.04)
    FLOOR = C.mineral("floor", (MIST[0] * 0.8, MIST[1] * 0.82, MIST[2] * 0.85), 0.08, (1, 1, 1), (0.08, 0.22), 0.015)
    into("wall", "split", r2(1024), r2(256))
    N = 72
    for k in range(N):
        ang = 2 * math.pi * (k + 0.5) / N
        d_slot = abs(((ang - math.pi / 2 + math.pi) % (2 * math.pi)) - math.pi)
        d_door = abs(((ang + math.pi / 2 + math.pi) % (2 * math.pi)) - math.pi)
        if d_slot < 0.062 or d_door < 0.15:
            continue
        box("wall", (R * math.cos(ang), R * math.sin(ang), HH / 2 + 0.5), (0.4, 2 * math.pi * R / N + 0.02, HH - 0.2), WALL, rot=(0, 0, ang))
    into("floor", "split", r2(1024), r2(256)); flag("floor", reflect=0.55)
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=R + 3, fill_type="NGON", location=(0, 0, 0)); bpy.context.object.data.materials.append(FLOOR); _add(bpy.context.object)
    into("ceil", "split", r2(512), r2(128))
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=R + 3, fill_type="NGON", location=(0, 0, HH + 0.5)); ceil = bpy.context.object
    ceil.data.materials.append(WALL); _add(ceil)
    oc = C.cyl("oc", (0, 0, HH - 1), (0, 0, HH + 2), 3.4, None, 64, smooth=False)
    ceil.modifiers.new("s", "SOLIDIFY").thickness = 0.6
    md = ceil.modifiers.new("cut", "BOOLEAN"); md.object = oc; md.operation = "DIFFERENCE"; oc.hide_render = True
    area("oculus", "", (0, 0, HH + 1.2), (0, 0, 0), 6.8, 2600, DAY, shape="DISK")
    sg = C.box("slot_glow", (0, R + 1.2, HH / 2), (3.0, 0.1, HH), emit("slotg", DAY, 3.2)); glow(sg, DAY, 3.2)
    area("slot", "", (0, R + 0.6, HH / 2), (0, 0, 2), 1.3, 1500, DAY, sy=HH - 1)
    area("fill", "", (0, -R + 1.5, 6), (0, 0, 2), 8, 260, DAY, sy=6)
    for k in range(24):
        ang = 2 * math.pi * k / 24
        area("foot%d" % k, "", ((R - 0.5) * math.cos(ang), (R - 0.5) * math.sin(ang), 0.12), ((R - 0.25) * math.cos(ang), (R - 0.25) * math.sin(ang), 6), 2.6, 26, DAY, sy=0.1)
    into("plinth", "combined", r2(512))
    PL = plain("plinth", (STEEL_BLUE[0] * 0.5, STEEL_BLUE[1] * 0.5, STEEL_BLUE[2] * 0.52), 0.32, 1.0)
    cyl("plinth", (0, 0, 0), (0, 0, 0.3), 2.9, PL, 128)
    cyl("plinth2", (0, 0, 0.3), (0, 0, 0.36), 2.75, plain("pl2", CHALK, 0.4), 128)
    # the causeway from the great circle of the Atrium to the door of the drum
    into("cause", "split", r2(256), r2(128))
    box("cause", (0, -(R + 0.2) - D / 2, -0.32), (10.0, D + 0.4, 0.6), FLOOR)
    C.camera((0, -8.3, 1.75), (0, 0, 2.45), lens=23)
    ANCH.update(centre=dict(p=[0, 0, 2.0]), top=dict(p=[0, 0, 4.4]), cam=dict(p=[0, -8.3, 1.75], t=[0, 0, 2.45]),
                dims=dict(R=R, HH=HH, D=D), origin=[0, A_FAR + 4 + D + R + 0.2, 7.0])
    return dict(expo=0.42)


# =============================================================================================== FORMULARY
def formulary():
    """Built in formulary.py (shared with the still pictures). The vials stand in the light while it is baked, so the
    cases carry their shadows; the tops of the stands are baked a second time without them, so the page can turn the
    shadows with a stand."""
    import formulary as FM
    sc = C.setup(512, a.samples, bounces=12)

    class K:
        pass
    K.box, K.add, K.into, K.flag, K.glow, K.r2, K.quad, K.cut = box, _add, into, flag, glow, r2, quad, cut
    anch, vials, opts = FM.build(K)
    C.camera((0, -13.6, 4.6), (0, FM.YW, 4.72), lens=49)
    ANCH.update(anch); ANCH.update(origin=[-20.2, A_FAR + 4 + FM.HD, 0.02])
    opts.update(keep_uv=["pads"], without=dict(pads=vials))
    return opts


# =============================================================================================== ARCHIVE
def archive():
    sc = C.setup(512, a.samples)
    C.world(sc, (0.9, 0.95, 1.0), 0.5)
    WALL = C.mineral("wall", ((MIST[0] + CHALK[0]) * 0.42, (MIST[1] + CHALK[1]) * 0.42, (MIST[2] + CHALK[2]) * 0.42), 0.05, (0.7, 0.7, 5.0), (0.55, 0.75), 0.04)
    FLOOR = C.mineral("floor", ((STEEL_BLUE[0] + MIST[0]) * 0.36, (STEEL_BLUE[1] + MIST[1]) * 0.36, (STEEL_BLUE[2] + MIST[2]) * 0.36), 0.08, (1, 1, 1), (0.07, 0.2), 0.012)
    STELE = C.mineral("stele", CHALK, 0.06, (0.8, 0.8, 7.0), (0.5, 0.68), 0.05)
    RW, RD, RH = 14.0, 22.0, 11.0
    into("floor", "split", r2(1024), r2(256)); flag("floor", reflect=0.55)
    box("floor", (0, 2, -0.5), (RW + 4, RD + 8, 1.0), FLOOR)
    into("shell", "split", r2(1024), r2(256))
    box("wall_b", (0, 9.2, RH / 2), (RW + 4, 0.4, RH), WALL)
    for s in (-1, 1):
        box("wall_s", (s * (RW / 2 + 0.2), 2, RH / 2), (0.4, RD + 8, RH), WALL)
    box("roof_a", (0, -6.05, RH + 0.3), (RW + 4, 13.9, 0.6), WALL)      # its front is flush with the floor and the walls: the room stands against the far wall
    box("roof_b", (0, 6.0, RH + 0.3), (RW + 4, 7.0, 0.6), WALL)
    box("roof_l", (-5.6, 1.7, RH + 0.3), (6.8, 1.6, 0.6), WALL)
    box("roof_r", (5.6, 1.7, RH + 0.3), (6.8, 1.6, 0.6), WALL)
    area("slot", "", (0, 1.7, RH + 2.0), (0, 2.25, 3.0), 4.4, 4600, DAY, sy=1.3, spread=70)
    area("fill", "", (0, -9, 4.5), (0, 2, 3), 9, 170, DAY, sy=5)
    SW, SH, ST = 3.4, 5.6, 0.7
    px = 520
    for sym in C.SYMS:
        into("face_%s" % sym, "relief", r2(1024))
        m = C.symbol_mask(sym, px, fit=0.80, blur=px / 260)
        Hh = np.zeros((int(px * SH / SW), px), np.float32)
        y0 = int(Hh.shape[0] * 0.42 - px / 2)
        Hh[y0:y0 + px, :] = -m                       # sunk relief
        nm = C.numeral_mask(10, int(px * 0.1), 0.2); r1 = int(Hh.shape[0] * 0.42 + px * 0.56); c1 = (px - nm.shape[1]) // 2
        Hh[r1:r1 + nm.shape[0], c1:c1 + nm.shape[1]] = -0.6 * nm         # the tenth record, after the nine in the passage
        face = C.height_mesh("face", Hh, SW, SH, 0.085, STELE)
        face.location = (0, 2.6 - ST / 2, SH / 2 + 0.12); _add(face)
    into("fit", "split", r2(512), r2(128))
    # the body stands behind the deepest cut of the face (y 2.335), with a thin rim closing the gap at the edges
    box("stele", (0, 2.6 + 0.05, SH / 2 + 0.12), (SW, ST - 0.1, SH), STELE)
    for s in (-1, 1):
        box("stele_rim", (s * (SW / 2 - 0.006), 2.301, SH / 2 + 0.12), (0.012, 0.098, SH), STELE)
    box("stele_rim", (0, 2.301, SH + 0.12 - 0.006), (SW, 0.098, 0.012), STELE)
    box("bench", (0, -3.4, 0.23), (2.6, 0.62, 0.46), STELE, 0.01)
    into("base", "combined", r2(256))
    box("base", (0, 2.6, 0.06), (SW + 0.5, ST + 0.5, 0.12), plain("base", (INK[0] * 3, INK[1] * 3, INK[2] * 3), 0.4, 1.0))
    C.camera((0, -8.4, 1.7), (0, 2.6, 3.05), lens=27)
    ANCH.update(stele=dict(p=[0, 2.25, SH * 0.60 + 0.12], rect=[[-SW / 2, 2.25, SH + 0.12], [SW / 2, 2.25, 0.12]]), cam=dict(p=[0, -8.4, 1.7], t=[0, 2.6, 3.05]),
                dims=dict(RW=RW, RD=RD, RH=RH), origin=[20.5, A_FAR + 4 + 13.0, 1.45])
    return dict(expo=0.34)


ZONES = dict(alley=alley, passage=passage, atrium=atrium, compass=compass, formulary=formulary, archive=archive)
opts = ZONES[a.zone]() or {}
sc = bpy.context.scene
bpy.context.view_layer.update()

# ------------------------------------------------------------------ join, unwrap
joined = {}
for g, objs in G.items():
    mode = MODE[g][0]
    if not objs:
        continue
    if mode == "relief":
        o = objs[0]
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        B.planar_uv(o, min(p.x for p in bb), max(p.x for p in bb), min(p.z for p in bb), max(p.z for p in bb))
        o.name = g; joined[g] = o
    elif mode == "none":
        joined[g] = B.join(objs, g)
    else:
        o = B.join(objs, g)
        if g not in opts.get("keep_uv", ()):      # a group may bring its own layout (the Formulary's stands)
            B.unwrap(o)
        joined[g] = o
emitters = list(EMIT)

# reliefs that share a place are baked one at a time: hide the others
slots = {}
for g in joined:
    if MODE[g][0] == "relief":
        slots.setdefault(g.split("_")[0], []).append(g)
for names in slots.values():
    for n in names[1:]:
        joined[n].hide_render = True

if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, a.zone + ".blend"))

# ------------------------------------------------------------------ bake
man = dict(zone=a.zone, groups={}, emit=[], anchors=ANCH, opts={k: v for k, v in opts.items() if k not in ("split_lamps", "keep_uv", "without")})
mp = os.path.join(a.out, a.zone + ".json")
prev = json.load(open(mp)) if os.path.exists(mp) else None
only = set(a.only.split(",")) if a.only else None


def lights_only(name):
    """Leave only one lamp's lights and emitters on (name=None: everything except the named lamps)."""
    named = set(o for objs in LAMPS.values() for o in objs)
    mine = set(LAMPS.get(name, [])) if name else None
    state = []
    for o in sc.objects:
        is_light = o.type == "LIGHT" or any(o is e[0] for e in EMIT)
        if not is_light:
            continue
        on = (o in mine) if name else (o not in named)
        state.append((o, o.hide_render)); o.hide_render = not on
    w = sc.world.node_tree.nodes["Background"].inputs["Strength"]; ws = w.default_value
    if name:
        w.default_value = 0.0
    return state, ws


def restore(st):
    state, ws = st
    for o, h in state:
        o.hide_render = h
    sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = ws


for g, o in joined.items():
    mode, res, cres = MODE[g]
    name = "%s_%s" % (a.zone, g)
    if only and g not in only:
        if prev and g in prev["groups"]:
            man["groups"][g] = prev["groups"][g]
        continue
    if mode == "none":
        info = dict(mode="none")
    elif mode == "relief":
        for n in slots[g.split("_")[0]]:
            joined[n].hide_render = n != g
        info = B.bake(o, name, a.out, "combined", res, samples=a.samples)
        info["mode"] = "combined"; info["relief"] = True
    elif mode == "split" and g in opts.get("split_lamps", {}):
        st = lights_only(None)
        info = B.bake(o, name, a.out, "split", res, cres, a.samples)
        restore(st); info["lamps"] = {}
        for ln in opts["split_lamps"][g]:
            st = lights_only(ln)
            li = B.bake(o, name + "_" + ln, a.out, "light", max(64, res // 2), samples=a.samples)
            restore(st); info["lamps"][ln] = li["scale"]
    else:
        info = B.bake(o, name, a.out, mode, res, cres, a.samples)
    if g in opts.get("without", {}):
        # the same surface again without some objects (their shadows are then the difference between the two)
        hid = [(x, x.hide_render) for x in opts["without"][g]]
        for x, _ in hid:
            x.hide_render = True
        info["nov"] = B.bake(o, name + "_nov", a.out, "light", res, samples=a.samples)["scale"]
        for x, h in hid:
            x.hide_render = h
    if g in LAMPGAIN:
        # the same surface without its lamp, small: how much of its light is not the lamp's
        st = lights_only(None)
        if mode == "relief":
            for n in slots[g.split("_")[0]]:
                joined[n].hide_render = n != g
        lo = B.bake(o, name + "_lo", a.out, "combined", 64, samples=max(8, a.samples // 3), denoise=False)
        restore(st)
        def _mean(nm, sc_):
            im = np.asarray(Image.open(os.path.join(a.out, nm + "_b.webp")).convert("RGB"), np.float32) / 255.0
            return float((np.where(im <= 0.04045, im / 12.92, ((im + 0.055) / 1.055) ** 2.4)).mean() * sc_)
        info["lamp"] = LAMPGAIN[g]; info["floor"] = round(min(1.0, _mean(name + "_lo", lo["scale"]) / max(1e-6, _mean(name, info["scale"]))), 4)
        os.remove(os.path.join(a.out, name + "_lo_b.webp"))
    info.update(FLAGS.get(g, {}))
    man["groups"][g] = info
    json.dump(man, open(mp, "w"), separators=(",", ":"))

# ------------------------------------------------------------------ export
ex = []
for g, o in joined.items():
    if MODE[g][0] == "relief":
        f = B.flat_copy(o, g, front=a.zone != "alley"); f["group"] = g; ex.append(f)
    else:
        o["group"] = g; ex.append(o)
for i, (o, rgb, st, lmp, show) in enumerate(emitters):
    if not show:
        continue
    o.hide_render = False
    o.name = "emit_%d_%s" % (i, o.name)
    man["emit"].append(dict(name=o.name, rgb=[round(v, 4) for v in rgb], strength=st, lamp=lmp))
    ex.append(o)
B.export(ex, os.path.join(a.out, a.zone + ".glb"))
json.dump(man, open(mp, "w"), separators=(",", ":"))
print("ZONE DONE", a.zone, flush=True)
