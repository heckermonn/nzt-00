"""PR6 / Institute: the Formulary, built once for both the baked world (world.py) and the still pictures (rooms.py).

Nine lit cases in a quiet stone wall. Each case holds one series: its three sealed vials stand on a round stand that
turns, so the record being read is the one at the front. The vials are display objects, about twenty times life size.
The page draws the vials itself (real geometry, js/vials.js); here they only stand in the light so that the baked
walls and stands carry their shadows, and so that the still pictures and the product pictures show them.
"""
import math, os
import bpy
import common as C
import mats as M
from common import plain, emit, nodes, CHALK, MIST, STEEL_BLUE, INK

DAY = (0.86, 0.93, 1.0)
NW, NH, GX, GZ, Z0, DEPTH = 1.8, 2.3, 2.5, 2.95, 2.0, 1.3
YW, HX, HD = 0.0, 9.0, 18.0
S = 20.5                                   # vial scale: a 49 mm vial stands 1.0 m tall
PAD_R, PAD_H, RING, PAD_Y = 0.58, 0.10, 0.305, 0.665   # the stand: radius, height, the circle the vials stand on, its depth in the case
PAD_SPAN = 2 * PAD_R * 1.06                # the square of the pads' light map that one stand's top fills
LABEL_ARC = 0.6                            # the label wraps this much of the way round
SIDE_W, BACK_W = 30.0, 0.85                # how bright the side lines and the back of a case are
# the vial, life size in metres: (radius, height) profiles turned about the axis
BODY = [(0.0, 0.0), (0.0105, 0.0), (0.0115, 0.0012), (0.0115, 0.030), (0.0108, 0.0335), (0.0072, 0.037), (0.0066, 0.0395), (0.0066, 0.0425), (0.0085, 0.0432), (0.0085, 0.0462), (0.0, 0.0462)]
CAKE = [(0.0, 0.0018), (0.0098, 0.0018), (0.0100, 0.0030), (0.0100, 0.0100), (0.0094, 0.0110), (0.0, 0.0104)]
PLUG = [(0.0, 0.0345), (0.0058, 0.0345), (0.0058, 0.0452), (0.0, 0.0452)]
CRIMP = [(0.0087, 0.0412), (0.0093, 0.0418), (0.0093, 0.0463), (0.0091, 0.0470), (0.0, 0.0470)]
CAP = [(0.0, 0.0471), (0.0081, 0.0471), (0.0081, 0.0486), (0.0078, 0.0492), (0.0, 0.0492)]
LABEL = (0.01158, 0.0122, 0.0274)          # radius, bottom, top
CAPS = [CHALK, STEEL_BLUE, INK, STEEL_BLUE, MIST, INK, STEEL_BLUE, CHALK, MIST]   # one cap colour per series
VH = CAP[-1][1] * S


def niche(i):
    """Centre of case i (0 to 8) on the wall: x, z."""
    r, c = divmod(i, 3); return (c - 1) * GX, Z0 + (2 - r) * GZ


def stand(i):
    """Centre of the top of case i's stand."""
    x, z = niche(i); return (x, YW + PAD_Y, z - NH / 2 + PAD_H)


def place(i, k, turn=0.0):
    """Where vial k (0, 1, 2) of case i stands and which way its label faces, the stand turned by `turn` radians.
    Vial 0 is at the front (towards the room, -y) when the stand is at rest."""
    x, y, z = stand(i); a = -math.pi / 2 + k * 2 * math.pi / 3 + turn
    return (x + RING * math.cos(a), y + RING * math.sin(a), z), a + math.pi / 2


def glass(name):
    """Clear glass that lets light through to what stands behind it (no caustics are traced, so shadow rays pass)."""
    m = C.glass(name, (0.95, 0.975, 0.985), 0.0, 1.47); n, l = nodes(m)
    b = n["Principled BSDF"]; out = n["Material Output"]
    lp = n.new("ShaderNodeLightPath"); tr = n.new("ShaderNodeBsdfTransparent"); tr.inputs[0].default_value = (0.9, 0.93, 0.94, 1)
    mix = n.new("ShaderNodeMixShader")
    l.new(lp.outputs["Is Shadow Ray"], mix.inputs[0]); l.new(b.outputs[0], mix.inputs[1]); l.new(tr.outputs[0], mix.inputs[2])
    l.new(mix.outputs[0], out.inputs["Surface"])
    for k in ("use_transparent_shadow",):
        if hasattr(m, k):
            setattr(m, k, True)
    return m


def paper(name, image=None):
    m = plain(name, (0.86, 0.87, 0.85), 0.55)
    if image:
        n, l = nodes(m); t = n.new("ShaderNodeTexImage"); t.image = bpy.data.images.load(image); t.extension = "EXTEND"
        l.new(t.outputs["Color"], n["Principled BSDF"].inputs["Base Color"])
    return m


def label_mesh(name, mat):
    """The label: part of a cylinder, its middle facing -y, with u running left to right as it is read."""
    r, z0, z1 = LABEL[0] * S, LABEL[1] * S, LABEL[2] * S; seg = 56; V, F, UV = [], [], []
    for j in range(seg + 1):
        u = j / seg; a = -math.pi / 2 + (u - 0.5) * 2 * math.pi * LABEL_ARC
        V += [(r * math.cos(a), r * math.sin(a), z0), (r * math.cos(a), r * math.sin(a), z1)]
    for j in range(seg):
        F.append((2 * j, 2 * j + 2, 2 * j + 3, 2 * j + 1)); UV.append([(j / seg, 0), ((j + 1) / seg, 0), ((j + 1) / seg, 1), (j / seg, 1)])
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for p, c in zip(me.polygons, UV):
        p.use_smooth = True
        for li, co in zip(p.loop_indices, c):
            uv.data[li].uv = co
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o


def vial(name, loc, face, mats, cap, label):
    """One sealed vial standing at loc, its label facing the angle `face` (0 = towards -y). Returns its parts."""
    sc = lambda prof: [(r * S, z * S) for r, z in prof]
    parts = []
    g = M.lathe(name + "_glass", sc(BODY), mats["glass"], 72, loc); sol = g.modifiers.new("s", "SOLIDIFY"); sol.thickness = 0.0011 * S; sol.offset = -1
    parts.append(g)
    parts.append(M.lathe(name + "_cake", sc(CAKE), mats["cake"], 48, loc))
    parts.append(M.lathe(name + "_plug", sc(PLUG), mats["plug"], 32, loc))
    parts.append(M.lathe(name + "_crimp", sc(CRIMP), mats["alu"], 64, loc))
    parts.append(M.lathe(name + "_cap", sc(CAP), cap, 64, loc))
    lb = label_mesh(name + "_label", label); lb.location = loc; lb.rotation_euler = (0, 0, face); parts.append(lb)
    return parts


def build(K, labels=None, turn=None, wall_half=None):
    """K gives the builder's own way of making things: box, cut, glow, into, flag, quad, add, r2.
    labels: folder of <id>.png label pictures (None: plain paper). turn: {case: radians} for stands not at rest.
    Returns (anchors, vial objects, opts)."""
    sc = bpy.context.scene
    C.world(sc, DAY, 0.12)
    # a wall of mid stone: the cases are the light in this room
    WALLC = tuple(0.55 * (0.6 * STEEL_BLUE[k] + 0.4 * MIST[k]) for k in range(3))
    WALL = C.mineral("wall", WALLC, 0.05, (0.7, 0.7, 5.0), (0.5, 0.7), 0.04)
    LINE = C.mineral("lining", CHALK, 0.03, (1, 1, 1), (0.45, 0.6), 0.015)
    FLOOR = C.mineral("floor", tuple(0.42 * (STEEL_BLUE[k] + MIST[k]) for k in range(3)), 0.06, (1, 1, 1), (0.05, 0.16), 0.012)
    PAD = C.mineral("pad", CHALK, 0.03, (1, 1, 1), (0.35, 0.5), 0.012)
    RIM = plain("rim", (INK[0] * 1.6, INK[1] * 1.6, INK[2] * 1.6), 0.45)        # dark satin, not metal: its light can be baked
    mats = dict(glass=glass("vial"), alu=plain("alu", (0.78, 0.80, 0.82), 0.28, 1.0), cake=plain("cake", (0.93, 0.94, 0.93), 0.9),
                plug=plain("plug", (0.33, 0.35, 0.37), 0.75))
    caps = [plain("cap%d" % i, CAPS[i], 0.42) for i in range(9)]
    half = wall_half or (HX + 0.6)
    K.into("wall", "split", K.r2(1024), K.r2(256))
    wall = K.box("wall", (0, YW + 1.0, 6.0), (2 * half, 2.0, 12.0), WALL)
    anch, vials = {}, []
    T = 0.03                                                   # lining thickness
    for i in range(9):
        x, z = niche(i)
        K.cut(wall, C.box("cut", (x, YW + DEPTH / 2 - 0.05, z), (NW, DEPTH + 0.1, NH), None))
        K.into("lining", "split", K.r2(2048), K.r2(128))
        K.box("line_b", (x, YW + DEPTH - T / 2, z), (NW, T, NH), LINE)
        for s in (-1, 1):
            K.box("line_s", (x + s * (NW / 2 - T / 2), YW + DEPTH / 2, z), (T, DEPTH, NH), LINE)
            K.box("line_t", (x, YW + DEPTH / 2, z + s * (NH / 2 - T / 2)), (NW - 2 * T, DEPTH, T), LINE)
        # two lines of light up the sides of each case, near the front (they draw long highlights down the glass),
        # and a low even glow from the back
        for s_ in (-1, 1):
            K.glow(C.box("side%d" % (i + 1), (x + s_ * (NW / 2 - T - 0.011), YW + 0.10, z), (0.02, 0.07, NH * 0.8), emit("side%d" % i, DAY, SIDE_W)), DAY, SIDE_W)
        K.glow(C.box("back%d" % (i + 1), (x, YW + DEPTH - T - 0.012, z + 0.1), (NW - 2 * T - 0.3, 0.02, NH - 2 * T - 0.5), emit("back%d" % i, DAY, BACK_W)), DAY, BACK_W)
        # the stand: a dark metal drum with a stone top
        px, py, pz = stand(i)
        K.into("fit", "split", K.r2(256), K.r2(64))
        K.add(C.cyl("drum", (px, py, pz - PAD_H), (px, py, pz - 0.004), PAD_R, RIM, 72))
        K.into("pads", "split", K.r2(768), K.r2(64)); K.flag("pads", pads=True)
        K.add(pad_top("pad%d" % (i + 1), i, PAD))
        for k in range(3):
            loc, face = place(i, k, (turn or {}).get(i, 0.0))
            rid = "PR6-C-%02d%02d" % (i + 1, k + 1)
            lab = paper("label_" + rid, os.path.join(labels, rid + ".png") if labels else None)
            vials += vial("v%d_%d" % (i + 1, k + 1), loc, face, mats, caps[i], lab)
        anch["n%d" % (i + 1)] = dict(rect=[[x - NW / 2, YW, z + NH / 2], [x + NW / 2, YW, z - NH / 2]], vial=[px, py, pz], p=[x, YW, z])
    K.into("floor", "split", K.r2(1024), K.r2(256)); K.flag("floor", reflect=0.6)
    K.quad("floor", [(-half, -HD - 2, 0), (half, -HD - 2, 0), (half, YW, 0), (-half, YW, 0)], FLOOR)
    K.into("shell", "split", K.r2(512), K.r2(128))
    K.box("ceil", (0, -HD / 2, 12.1), (2 * half, HD, 0.2), WALL)
    for s in (-1, 1):
        K.box("return", (s * (half - 0.3), -HD / 2, 6), (0.6, HD, 12), WALL)
    C.area("wash", "", (0, -3.0, 11.6), (0, YW, 5.0), 16, 260, DAY, sy=0.8)
    C.area("fill", "", (0, -12, 5), (0, 0, 5), 14, 120, DAY, sy=8)
    anch.update(cam=dict(p=[0, -13.6, 4.6], t=[0, YW, 4.72]),
                dims=dict(NW=NW, NH=NH, HX=HX, HD=HD, vial_h=VH, vial_s=S, pad_r=PAD_R, pad_h=PAD_H, pad_y=PAD_Y, pad_span=PAD_SPAN, ring=RING, GX=GX, GZ=GZ, Z0=Z0,
                          label_arc=LABEL_ARC, body=BODY, cake=CAKE, plug=PLUG, crimp=CRIMP, cap=CAP, label=list(LABEL),
                          caps=[[round(v, 4) for v in c] for c in CAPS]))
    return anch, vials, dict(expo=0.6)


def pad_top(name, i, mat):
    """The top of one stand: a disc whose UVs are its own square of a three by three sheet, straight from position,
    so the page can turn the vials' shadows with the stand."""
    px, py, pz = stand(i); r, c = divmod(i, 3); seg = 72
    V = [(px, py, pz)] + [(px + PAD_R * math.cos(2 * math.pi * k / seg), py + PAD_R * math.sin(2 * math.pi * k / seg), pz) for k in range(seg)]
    F = [(0, 1 + k, 1 + (k + 1) % seg) for k in range(seg)]
    me = bpy.data.meshes.new(name); me.from_pydata(V, [], F); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for l in me.loops:
        p = me.vertices[l.vertex_index].co
        uv.data[l.index].uv = ((c + 0.5 + (p.x - px) / PAD_SPAN) / 3, (2 - r + 0.5 + (p.y - py) / PAD_SPAN) / 3)
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o
