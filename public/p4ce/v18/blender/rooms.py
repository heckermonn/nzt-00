"""PR6 / Institute: inside. The rooms of the Digital Institute in the brand kit's own colours (chalk, mist, steel blue,
ink), mineral surfaces, technical glass, cool daylight. One square frame each; the page adds depth haze, parallax and
the authored moves between them.

  PY rooms.py -- --out RAW --frame atrium | compass0..compass6 | formulary | archive_<sym> | invite_<sym>
"""
import math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa
import numpy as np  # noqa
from mathutils import Vector, Euler, Quaternion  # noqa
import common as C  # noqa
from common import box, cyl, sphere, plain, emit, area, point, spot, sun, nodes, CHALK, MIST, STEEL_BLUE, INK, ORANGE, DEEP_BLUE, SKY  # noqa

a = C.args()
if C.done(a.out, a.frame) and not a.force:
    print("SKIP", a.frame); sys.exit(0)
kind = a.frame.split("_")[0].rstrip("0123456789")
sym = a.frame.split("_")[1] if "_" in a.frame else a.sym
DAY = (0.86, 0.93, 1.0)


def water(nm="water"):
    m = plain(nm, (0.015, 0.022, 0.03), 0.015)
    return C.noise_bump(m, scale=1.4, strength=0.012, dist=0.02, detail=2)


def panel_joints(m, sx=6.0, sz=3.0, depth=0.5):
    """Fine dark joints of large stone panels, multiplied into the base colour (world-space, walls facing +-x or +-y)."""
    n, l = nodes(m); b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry"); sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    add = n.new("ShaderNodeMath"); l.new(sep.outputs["X"], add.inputs[0]); l.new(sep.outputs["Y"], add.inputs[1])

    def line(sock, period):
        d = n.new("ShaderNodeMath"); d.operation = "DIVIDE"; d.inputs[1].default_value = period; l.new(sock, d.inputs[0])
        f = n.new("ShaderNodeMath"); f.operation = "FRACT"; l.new(d.outputs[0], f.inputs[0])
        s = n.new("ShaderNodeMath"); s.operation = "SUBTRACT"; s.inputs[1].default_value = 0.5; l.new(f.outputs[0], s.inputs[0])
        ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; l.new(s.outputs[0], ab.inputs[0])
        mr = n.new("ShaderNodeMapRange"); mr.inputs["From Min"].default_value = 0.5 - 0.012 / period; mr.inputs["From Max"].default_value = 0.5
        mr.inputs["To Min"].default_value = 1.0; mr.inputs["To Max"].default_value = depth; l.new(ab.outputs[0], mr.inputs["Value"])
        return mr.outputs[0]
    mn = n.new("ShaderNodeMath"); mn.operation = "MINIMUM"
    l.new(line(add.outputs[0], sx), mn.inputs[0]); l.new(line(sep.outputs["Z"], sz), mn.inputs[1])
    src = b.inputs["Base Color"].links[0].from_socket
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    l.new(src, mul.inputs[6]); l.new(mn.outputs[0], mul.inputs[7]); l.new(mul.outputs[2], b.inputs["Base Color"])
    return m


def lathe(nm, prof, mat, seg=64, loc=(0, 0, 0)):
    """Revolve a profile [(r, z), ...] about Z."""
    V, F = [], []
    for (r, z) in prof:
        for k in range(seg):
            t = 2 * math.pi * k / seg; V.append((r * math.cos(t), r * math.sin(t), z))
    for i in range(len(prof) - 1):
        for k in range(seg):
            k2 = (k + 1) % seg
            F.append((i * seg + k, i * seg + k2, (i + 1) * seg + k2, (i + 1) * seg + k))
    me = bpy.data.meshes.new(nm); me.from_pydata(V, [], F); me.update()
    for p in me.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new(nm, me); bpy.context.scene.collection.objects.link(o); o.location = loc
    if mat:
        me.materials.append(mat)
    return o


marks, rects, extra = {}, {}, {}

# =============================================================================================== ATRIUM
if kind == "atrium":
    sc = C.setup(a.res, a.samples)
    C.world(sc, DAY, 1.0)
    STONE = panel_joints(C.mineral("stone", CHALK, 0.07, (0.5, 0.5, 6.0), (0.42, 0.62), 0.05), 7.0, 3.5, 0.72)
    FLOOR = C.mineral("floor", (CHALK[0] * 0.9, CHALK[1] * 0.91, CHALK[2] * 0.93), 0.07, (1.2, 1.2, 1.0), (0.10, 0.26), 0.015)
    FAR, HH, PX = 74.0, 48.0, 23.0
    # floor: honed stone, with one long still pool down the middle
    floor = box("floor", (0, 30, -0.3), (150, 120, 0.6), FLOOR)
    pc = box("pool_cut", (0, 38, -0.1), (6.4, 52, 0.5), None)
    md = floor.modifiers.new("cut", "BOOLEAN"); md.object = pc; md.operation = "DIFFERENCE"; md.solver = "EXACT"; pc.hide_render = True
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 38, -0.07)); w = bpy.context.object
    w.scale = (6.4, 52, 1); bpy.ops.object.transform_apply(scale=True); w.data.materials.append(water())
    # the far wall: one slab, three openings (a tall slot, a great circle, a square)
    wall = box("far", (0, FAR + 2, HH / 2), (150, 4, HH), STONE)
    cut = []
    c = cyl("cut_circle", (0, FAR - 1, 18.0), (0, FAR + 5, 18.0), 11.0, None, 128, smooth=False); cut.append(c)
    cut.append(box("cut_slot", (-21.5, FAR + 2, 17.0), (5.0, 8, 34.0), None))
    cut.append(box("cut_square", (21.5, FAR + 2, 7.0), (12.0, 8, 12.0), None))
    for o in cut:
        md = wall.modifiers.new("cut", "BOOLEAN"); md.object = o; md.operation = "DIFFERENCE"; md.solver = "EXACT"
        o.hide_render = True; o.display_type = "WIRE"
    # daylight behind the openings
    box("light_far", (0, FAR + 9, HH / 2), (150, 0.2, HH), emit("glow", DAY, 2.4))
    area("day_circle", "", (0, FAR + 3.5, 18.0), (0, 0, 6), 22, 5000, DAY, shape="DISK")
    area("day_slot", "", (-21.5, FAR + 3.5, 17), (-10, 0, 4), 5, 2600, DAY, sy=34)
    area("day_square", "", (21.5, FAR + 3.5, 7.0), (10, 0, 2), 12, 2400, DAY, sy=12)
    # steps up to the circle, and doors a person could use (for scale)
    for k in range(10):
        box("stair", (0, FAR - 7.0 + k * 0.7, 0.35 + k * 0.7), (10.0, 0.72, 0.7), FLOOR)
    for x in (-36.0, -11.0, 11.0, 36.0):
        box("door", (x, FAR - 0.02, 1.25), (1.15, 0.1, 2.5), plain("doorm", (INK[0] * 4, INK[1] * 4, INK[2] * 4), 0.5))
    # piers, and the bright void beyond them
    for s in (-1, 1):
        for k in range(6):
            box("pier", (s * PX, 4 + k * 14.0, HH / 2), (3.2, 3.2, HH), STONE)
        v = box("void", (s * 70, 40, HH / 2), (0.2, 150, HH * 1.4), emit("void", DAY, 1.7)); v.visible_shadow = False
    # roof: a slab with one long slot of sky; open beyond the left piers so the sun rakes across the floor
    box("roof_r", (37.5, 40, HH + 1), (68, 130, 2), STONE)
    box("roof_l", (-16.5, 40, HH + 1), (26, 130, 2), STONE)
    box("back", (0, -24, HH / 2), (150, 2, HH), STONE)
    sun("sun", "", (0.80, 0.22, -0.62), 4.6, (1.0, 0.98, 0.95), 1.0)
    area("sky_slot", "", (0, 36, HH + 6), (0, 36, 0), 7, 16000, DAY, sy=100)
    area("fill", "", (0, -18, 14), (0, 30, 8), 30, 1800, DAY, sy=20)
    BENCH = C.mineral("bench", CHALK, 0.05, (1, 1, 1), (0.3, 0.45), 0.03)
    for s in (-1, 1):
        box("bench", (s * 8.5, 9.5, 0.24), (3.6, 0.7, 0.48), BENCH, 0.01)
    cam = C.camera((0, -4.0, 1.7), (0, FAR, 13.0), lens=21)
    marks = dict(compass=(0, FAR, 18.0), formulary=(-21.5, FAR, 17.0), archive=(21.5, FAR, 7.0),
                 compass_base=(0, FAR, 7.0), formulary_base=(-21.5, FAR, 0.0), archive_base=(21.5, FAR, 1.0),
                 horizon=(0, FAR, 0.0), inscription=(0, 6.0, 0.0))
    extra = dict(expo=0.40, fog=[0.72, 0.80, 0.86], fog_d=0.25)

# =============================================================================================== COMPASS
elif kind == "compass":
    step = int(a.frame[len("compass"):]); t = step / 6.0
    sc = C.setup(a.res, a.samples, bounces=12)
    C.world(sc, DAY, 0.3)
    R, HH = 11.0, 17.0
    WALL = C.mineral("wall", CHALK, 0.05, (0.6, 0.6, 5.0), (0.5, 0.7), 0.04)
    FLOOR = C.mineral("floor", (MIST[0] * 0.8, MIST[1] * 0.82, MIST[2] * 0.85), 0.08, (1, 1, 1), (0.08, 0.22), 0.015)
    # drum wall as a ring of flat panels, leaving one tall slot of daylight straight ahead
    N = 72
    for k in range(N):
        ang = 2 * math.pi * (k + 0.5) / N
        if abs(((ang - math.pi / 2 + math.pi) % (2 * math.pi)) - math.pi) < 0.062:
            continue
        box("wall", (R * math.cos(ang), R * math.sin(ang), HH / 2 + 0.5), (0.4, 2 * math.pi * R / N + 0.02, HH - 0.2), WALL, rot=(0, 0, ang))
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=R + 3, fill_type="NGON", location=(0, 0, 0)); bpy.context.object.data.materials.append(FLOOR)
    # ceiling with an oculus
    bpy.ops.mesh.primitive_circle_add(vertices=96, radius=R + 3, fill_type="NGON", location=(0, 0, HH + 0.5)); ceil = bpy.context.object
    ceil.data.materials.append(WALL)
    oc = cyl("oc", (0, 0, HH - 1), (0, 0, HH + 2), 3.4, None, 64, smooth=False)
    ceil.modifiers.new("s", "SOLIDIFY").thickness = 0.6
    md = ceil.modifiers.new("cut", "BOOLEAN"); md.object = oc; md.operation = "DIFFERENCE"; oc.hide_render = True
    area("oculus", "", (0, 0, HH + 1.2), (0, 0, 0), 6.8, 2600, DAY, shape="DISK")
    box("slot_glow", (0, R + 1.2, HH / 2), (3.0, 0.1, HH), emit("slotg", DAY, 3.2))
    area("slot", "", (0, R + 0.6, HH / 2), (0, 0, 2), 1.3, 1500, DAY, sy=HH - 1)
    area("fill", "", (0, -R + 1.5, 6), (0, 0, 2), 8, 260, DAY, sy=6)
    # light washing up the drum from a recess at its foot
    for k in range(24):
        ang = 2 * math.pi * k / 24
        area("foot%d" % k, "", ((R - 0.5) * math.cos(ang), (R - 0.5) * math.sin(ang), 0.12), ((R - 0.25) * math.cos(ang), (R - 0.25) * math.sin(ang), 6), 2.6, 26, DAY, sy=0.1)
    # plinth
    PL = plain("plinth", (STEEL_BLUE[0] * 0.5, STEEL_BLUE[1] * 0.5, STEEL_BLUE[2] * 0.52), 0.32, 1.0)
    cyl("plinth", (0, 0, 0), (0, 0, 0.3), 2.9, PL, 128)
    cyl("plinth2", (0, 0, 0.3), (0, 0, 0.36), 2.75, plain("pl2", CHALK, 0.4), 128)
    # the structure: thirty glass blades. Scattered at t=0, a true dial at t=1.
    GL = C.glass("blade", (0.80, 0.90, 0.96), 0.06, 1.5)
    rnd = random.Random(11); NB = 30
    for i in range(NB):
        ang = 2 * math.pi * i / NB
        h1 = 1.5 + 1.25 * (0.5 + 0.5 * math.cos(ang * 2 + 0.6)) + (0.9 if i % 5 == 0 else 0)
        p1 = Vector((1.75 * math.cos(ang), 1.75 * math.sin(ang), 0.36 + h1 / 2 + 0.02))
        q1 = Euler((0, 0, ang)).to_quaternion()
        rr, ra = 0.5 + 2.0 * rnd.random(), rnd.random() * 2 * math.pi
        p0 = Vector((rr * math.cos(ra), rr * math.sin(ra), 0.9 + 2.8 * rnd.random()))
        q0 = Euler((rnd.uniform(-0.9, 0.9), rnd.uniform(-0.9, 0.9), rnd.uniform(0, 6.28))).to_quaternion()
        # blades settle one after another: each has its own window inside 0..1
        ti = min(1.0, max(0.0, (t * 1.45 - (i * 7 % NB) / NB * 0.45)))
        e = ti * ti * (3 - 2 * ti)
        p = p0.lerp(p1, e); q = q0.slerp(q1, e)
        o = box("blade", p, (0.62, 0.035, h1), GL, 0.004)
        o.rotation_mode = "QUATERNION"; o.rotation_quaternion = q
    cam = C.camera((0, -8.3, 1.75), (0, 0, 2.45), lens=23)
    marks = dict(centre=(0, 0, 2.0), plinth=(0, -2.9, 0.3), top=(0, 0, 4.4))
    extra = dict(expo=0.42, step=step, fog=[0.80, 0.86, 0.90], fog_d=0.0)

# =============================================================================================== FORMULARY
elif kind == "formulary":
    # frames: formulary (the wall), formulary_n<case> (one case), formulary_r<id> (one record: its vial at the front),
    #         formulary_env (what a vial sees, as a panorama for the page's glass), formulary_p<id> (a product picture)
    import formulary as FM
    sc = C.setup(a.res, a.samples, bounces=12)

    class K:
        box = staticmethod(box); add = staticmethod(lambda o: o); into = staticmethod(lambda *p, **k: None); flag = staticmethod(lambda *p, **k: None)
        glow = staticmethod(lambda o, *p, **k: o); r2 = staticmethod(lambda x: x)

        @staticmethod
        def cut(o, cutter):
            md = o.modifiers.new("cut", "BOOLEAN"); md.object = cutter; md.operation = "DIFFERENCE"; md.solver = "EXACT"; cutter.hide_render = True

        @staticmethod
        def quad(name, pts, mat):
            me = bpy.data.meshes.new(name); me.from_pydata([tuple(q) for q in pts], [], [tuple(range(len(pts)))]); me.update()
            o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o); me.materials.append(mat); return o

    view = sym if "_" in a.frame else ""
    case = int(view[1:3]) - 1 if view[:1] in "rp" and view else int(view[1:]) - 1 if view[:1] == "n" else 4
    which = int(view[3:5]) - 1 if view[:1] in "rp" and view else 0
    turn = {case: -which * 2 * math.pi / 3} if which else None
    anch, vials, extra0 = FM.build(K, labels=os.environ.get("PR6_LABELS"), turn=turn, wall_half=20 if not view else None)
    x, z = FM.niche(case); px, py, pz = FM.stand(case)
    if view == "env":
        for o in vials:
            o.hide_render = True
        cam = C.camera((px, py - FM.RING, pz + 0.5), (px, py - FM.RING - 1, pz + 0.5), lens=20)
        cam.data.type = "PANO"; cam.data.panorama_type = "EQUIRECTANGULAR"
        sc.render.resolution_x, sc.render.resolution_y = a.res, a.res // 2
    elif view[:1] == "n":
        cam = C.camera((x * 0.55, -6.4, z * 0.8 + 0.9), (x, 0.4, z - 0.1), lens=38)
    elif view[:1] == "r":
        cam = C.camera((x + 0.25, -3.3, pz + 0.75), (x, py - FM.RING, pz + 0.47), lens=50)
    elif view[:1] == "p":
        # a product picture: the record's vial alone, tall frame
        keep = "v%d_%d_" % (case + 1, which + 1)
        for o in vials:
            o.hide_render = not o.name.startswith(keep)
        cam = C.camera((x + 0.12, -2.6, pz + 0.62), (x, py - FM.RING, pz + 0.50), lens=78)
        sc.render.resolution_x, sc.render.resolution_y = int(a.res * 0.6), a.res
        cam.data.sensor_fit = "VERTICAL"; cam.data.sensor_height = 36
    else:
        cam = C.camera((0, -13.6, 4.6), (0, FM.YW, 4.72), lens=49)
        for i in range(9):
            nx, nz = FM.niche(i)
            marks["n%d" % (i + 1)] = (nx, FM.YW, nz)
            rects["n%d" % (i + 1)] = ((nx - FM.NW / 2, FM.YW, nz + FM.NH / 2), (nx + FM.NW / 2, FM.YW, nz - FM.NH / 2))
    extra = dict(expo=extra0["expo"], fog=[0.84, 0.89, 0.92], fog_d=0.0)

# =============================================================================================== ARCHIVE
elif kind == "archive":
    sc = C.setup(a.res, a.samples)
    C.world(sc, (0.9, 0.95, 1.0), 0.5)
    WALL = C.mineral("wall", ((MIST[0] + CHALK[0]) * 0.42, (MIST[1] + CHALK[1]) * 0.42, (MIST[2] + CHALK[2]) * 0.42), 0.05, (0.7, 0.7, 5.0), (0.55, 0.75), 0.04)
    FLOOR = C.mineral("floor", ((STEEL_BLUE[0] + MIST[0]) * 0.36, (STEEL_BLUE[1] + MIST[1]) * 0.36, (STEEL_BLUE[2] + MIST[2]) * 0.36), 0.08, (1, 1, 1), (0.07, 0.2), 0.012)
    STELE = C.mineral("stele", CHALK, 0.06, (0.8, 0.8, 7.0), (0.5, 0.68), 0.05)
    RW, RD, RH = 14.0, 22.0, 11.0
    box("floor", (0, 2, -0.1), (RW + 4, RD + 8, 0.2), FLOOR)
    box("wall_b", (0, 9.2, RH / 2), (RW + 4, 0.4, RH), WALL)
    for s in (-1, 1):
        box("wall_s", (s * (RW / 2 + 0.2), 2, RH / 2), (0.4, RD + 8, RH), WALL)
    # roof with one slot above and just in front of the stele: raking light down its face
    box("roof_a", (0, -6.6, RH + 0.3), (RW + 4, 15.0, 0.6), WALL)
    box("roof_b", (0, 6.0, RH + 0.3), (RW + 4, 7.0, 0.6), WALL)
    box("roof_l", (-5.6, 1.7, RH + 0.3), (6.8, 1.6, 0.6), WALL)
    box("roof_r", (5.6, 1.7, RH + 0.3), (6.8, 1.6, 0.6), WALL)
    area("slot", "", (0, 1.7, RH + 2.0), (0, 2.25, 3.0), 4.4, 4600, DAY, sy=1.3, spread=70)
    area("fill", "", (0, -9, 4.5), (0, 2, 3), 9, 170, DAY, sy=5)
    # the stele: a standing slab with the lineage insignia cut into it
    SW, SH, ST = 3.4, 5.6, 0.7
    px = 520
    m = C.symbol_mask(sym, px, fit=0.80, blur=px / 260)
    Hh = np.zeros((int(px * SH / SW), px), np.float32)
    y0 = int(Hh.shape[0] * 0.42 - px / 2)
    Hh[y0:y0 + px, :] = -m                       # sunk relief
    face = C.height_mesh("face", Hh, SW, SH, 0.085, STELE)
    face.location = (0, 2.6 - ST / 2, SH / 2 + 0.12)
    box("stele", (0, 2.6 + 0.004, SH / 2 + 0.12), (SW, ST - 0.008, SH), STELE)
    box("base", (0, 2.6, 0.06), (SW + 0.5, ST + 0.5, 0.12), plain("base", (INK[0] * 3, INK[1] * 3, INK[2] * 3), 0.4, 1.0))
    box("bench", (0, -3.4, 0.23), (2.6, 0.62, 0.46), STELE, 0.01)
    cam = C.camera((0, -8.4, 1.7), (0, 2.6, 3.05), lens=27)
    marks = dict(stele=(0, 2.25, SH * 0.60 + 0.12), foot=(0, 2.25, 0.12))
    extra = dict(expo=0.34, sym=sym, fog=[0.80, 0.86, 0.90], fog_d=0.0)

# =============================================================================================== INVITATION
elif kind == "invite":
    sc = C.setup(a.res, a.samples)
    C.world(sc, (0.5, 0.62, 0.8), 0.05)
    # a dark steel-blue ground
    TAB = C.noise_bump(plain("table", (INK[0] * 1.2, INK[1] * 1.3, INK[2] * 1.5), 0.42), 260, 0.08, 0.0004, 3)
    bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0, 0)); bpy.context.object.data.materials.append(TAB)
    # the card: matte ink stock with a soft sheen, edges painted orange
    CW, CH, CT = 0.105, 0.148, 0.0012
    STOCK = plain("stock", (INK[0] * 0.9, INK[1] * 0.9, INK[2] * 0.95), 0.72)
    STOCK.node_tree.nodes["Principled BSDF"].inputs["Sheen Weight"].default_value = 0.6
    STOCK.node_tree.nodes["Principled BSDF"].inputs["Sheen Roughness"].default_value = 0.45
    C.noise_bump(STOCK, 2600, 0.05, 0.00002, 2)
    card = box("card", (0, 0, CT / 2), (CW, CH, CT), None)
    card.data.materials.append(STOCK); card.data.materials.append(plain("edge", ORANGE, 0.55))
    for p in card.data.polygons:
        p.material_index = 0 if abs(p.normal.z) > 0.5 else 1
    # blind-debossed hairline frame and wordmark
    DEB = plain("deb", (INK[0] * 0.55, INK[1] * 0.55, INK[2] * 0.6), 0.5)
    for (x, y, sx, sy) in ((0, CH / 2 - 0.0085, CW - 0.017, 0.00035), (0, -CH / 2 + 0.0085, CW - 0.017, 0.00035),
                           (CW / 2 - 0.0085, 0, 0.00035, CH - 0.017), (-CW / 2 + 0.0085, 0, 0.00035, CH - 0.017)):
        box("hair", (x, y, CT + 0.00001), (sx, sy, 0.00002), DEB)
    cu = bpy.data.curves.new("t", "FONT"); cu.body = "PR6"; cu.size = 0.0105; cu.align_x = "CENTER"
    try:
        cu.font = bpy.data.fonts.load("/usr/share/fonts/truetype/freefont/FreeSansBold.ttf")
    except Exception:
        pass
    tx = bpy.data.objects.new("word", cu); sc.collection.objects.link(tx); tx.location = (0, CH / 2 - 0.031, CT + 0.00002); tx.data.materials.append(DEB)
    # the wax seal: a pressed blob with the insignia standing in a flat field
    px = 420; yy, xx = np.mgrid[0:px, 0:px]; cc = (px - 1) / 2
    th = np.arctan2(yy - cc, xx - cc); rr = np.hypot(xx - cc, yy - cc) / cc
    rs = random.Random(sum(map(ord, sym)))
    edge = 0.86 + sum(0.035 * math.sin(k * 1.0) * 0 for k in range(1))
    wob = sum(rs.uniform(0.012, 0.04) * np.sin(th * k + rs.uniform(0, 6.28)) for k in (2, 3, 5, 7))
    R_out = 0.84 + wob
    dome = np.clip((R_out - rr) / 0.16, 0, 1) ** 0.55                      # rounded outer lip
    field = np.clip((0.62 - rr) / 0.05, 0, 1)                              # pressed flat centre
    smk = C.symbol_mask(sym, px, fit=0.54, blur=px / 300)
    ring = np.clip(1 - np.abs(rr - 0.585) / 0.022, 0, 1)
    Hs = dome * (1.0 - 0.42 * field) + field * (0.36 * smk + 0.16 * ring)
    Hs = C.gauss(Hs / 1.2, px / 300) * 1.2
    WAX = plain("wax", (DEEP_BLUE[0] * 0.55, DEEP_BLUE[1] * 0.6, DEEP_BLUE[2] * 0.7), 0.3, 0.0, 0.3)
    WAX.node_tree.nodes["Principled BSDF"].inputs["Subsurface Weight"].default_value = 0.25
    WAX.node_tree.nodes["Principled BSDF"].inputs["Subsurface Radius"].default_value = (0.002, 0.002, 0.003)
    SR = 0.021
    seal = C.height_mesh("seal", Hs, SR * 2, SR * 2, 0.0034, WAX, keep=(rr < R_out + 0.01))
    seal.rotation_euler = (math.radians(-90), 0, math.radians(-8)); seal.location = (0.0, -0.022, CT)
    # soft key from upper left, long gentle fill
    area("key", "", (-0.22, 0.20, 0.26), (0, -0.01, 0), 0.22, 1.5, (0.86, 0.93, 1.0), sy=0.12)
    area("rim", "", (0.16, -0.30, 0.06), (0, -0.04, 0), 0.05, 0.4, (0.70, 0.84, 1.0), sy=0.3)
    area("top", "", (0, 0, 0.5), (0, 0, 0), 0.5, 0.32, (0.8, 0.9, 1.0), sy=0.5)
    cam = C.camera((0.0, -0.215, 0.30), (0.0, -0.010, 0.0), lens=62)
    cam.rotation_euler.rotate_axis("Z", math.radians(-4))
    marks = dict(seal=(0.0, -0.022, CT), card=(0, 0, CT))
    extra = dict(expo=1.0, sym=sym)
else:
    raise SystemExit("unknown frame " + a.frame)

if a.blend:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(a.out, a.frame + ".blend"))
C.render(sc, cam, a.out, a.frame, marks=marks, rects=rects, extra_meta=extra)
