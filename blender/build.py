# NZT-00 lab set. Units: 1 = 1 cm. Run: blender --background --factory-startup --python build.py
import bpy, bmesh, math, os, random
from mathutils import Vector
OUT = os.path.expanduser("~/Projects/nzt-00/blender")
os.makedirs(OUT + "/glb", exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.unit_settings.scale_length = 0.01

MATS = {}
def mat(name, base, metal=0., rough=.4, trans=0., ior=1.5, alpha=1.):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get("Principled BSDF")
    p.inputs["Base Color"].default_value = (*base, 1)
    p.inputs["Metallic"].default_value = metal
    p.inputs["Roughness"].default_value = rough
    p.inputs["IOR"].default_value = ior
    for k in ("Transmission Weight", "Transmission"):
        if k in p.inputs: p.inputs[k].default_value = trans; break
    MATS[name] = m; return m

GLASS = mat("glass", (.95, .97, .98), rough=.03, trans=1., ior=1.47)
LIQ = mat("liquid", (.82, .84, .85), rough=.1, trans=.85, ior=1.34)
ALU = mat("alu", (.86, .87, .88), metal=1., rough=.28)
ALU_D = mat("alu_dark", (.32, .33, .34), metal=1., rough=.35)
BLACK = mat("plastic_black", (.03, .03, .03), rough=.45)
RUBBER = mat("rubber", (.05, .05, .05), rough=.85)
FOIL = mat("foil", (.82, .83, .84), metal=1., rough=.18)
WHITE = mat("plastic_white", (.88, .9, .9), rough=.35)
SIGNAL = mat("signal", (1., .24, .03), rough=.4)

def obj_from_bm(name, bm, m, smooth=True):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    me.materials.append(m)
    if smooth:
        for f in me.polygons: f.use_smooth = True
    return o

def lathe(name, prof, m, segs=96):
    """prof: [(r, z)] bottom to top; r == 0 collapses to a pole."""
    bm = bmesh.new(); rings = []
    for r, z in prof:
        if r < 1e-6: rings.append([bm.verts.new((0, 0, z))])
        else: rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in [i / segs * math.tau for i in range(segs)]])
    for a, b in zip(rings, rings[1:]):
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1:
            for i in range(segs): bm.faces.new((a[0], b[i], b[(i + 1) % segs]))
        elif len(b) == 1:
            for i in range(segs): bm.faces.new((a[(i + 1) % segs], a[i], b[0]))
        else:
            for i in range(segs): bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    bm.normal_update()
    o = obj_from_bm(name, bm, m)
    return o

def autosmooth(o, deg=40):
    try:
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.shade_auto_smooth(angle=math.radians(deg))
    except Exception: pass

def arc(cx, cz, r, a0, a1, n=8):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]

def group(name, parts, x=0):
    e = bpy.data.objects.new(name, None); bpy.context.collection.objects.link(e)
    for p in parts: p.parent = e
    e.location.x = x; return e

# ---------- vial: 2R injection vial, crimp cap, flip-off top ----------
def vial():
    g = [(0, 0), (.66, 0)] + arc(.66, .1, .1, -90, 0, 6)[1:] + [(.76, 2.55)] + arc(.56, 2.55, .2, 0, 90, 8)[1:] + [(.5, 2.78), (.5, 2.86), (.6, 2.9), (.6, 3.12), (.5, 3.16), (.46, 3.16), (.46, 2.92), (.44, 2.8)] + arc(.54, 2.55, .2, 90, 0, 8)[1:] + [(.72, .14)] + arc(.62, .14, .1, 0, -90, 6)[1:] + [(0, .04)]
    glass = lathe("vial_glass", g, GLASS)
    liq = lathe("vial_liquid", [(0, .05), (.7, .05), (.715, .1), (.715, 1.62), (.69, 1.66), (.4, 1.62), (0, 1.615)], LIQ)
    cap = lathe("vial_cap", [(.47, 2.84), (.64, 2.84), (.65, 2.86), (.65, 3.2), (.63, 3.22), (.36, 3.22), (.36, 3.24), (.28, 3.24)], ALU)
    top = lathe("vial_flip", [(0, 3.22), (.56, 3.22), (.58, 3.25), (.58, 3.36), (.55, 3.39), (0, 3.39)], BLACK)
    return [glass, liq, cap, top]

# ---------- ampoule: one-point-cut glass ampoule ----------
def ampoule():
    out = [(0, 0)] + arc(.38, .22, .22, -90, 0, 6)[1:] + [(.6, .22), (.6, 3.0)] + arc(.3, 3.0, .3, 0, 50, 6)[1:] + [(.22, 3.55), (.2, 3.68), (.23, 3.8), (.36, 4.05), (.38, 4.3), (.3, 4.6), (.15, 5.0), (.1, 5.6)] + arc(0, 5.6, .1, 0, 90, 4)[1:]
    glass = lathe("ampoule_glass", out, GLASS)
    liq = lathe("ampoule_liquid", [(0, .04)] + [(.36, .04), (.56, .2)] + [(.565, 2.4), (.5, 2.45), (0, 2.42)], LIQ)
    ring = lathe("ampoule_ring", [(.205, 3.6), (.215, 3.6), (.215, 3.7), (.205, 3.7)], SIGNAL, 64)
    return [glass, liq, ring]

# ---------- dropper bottle: glass bottle, ribbed collar, rubber bulb, pipette ----------
def dropper():
    body = [(0, 0), (1.05, 0)] + arc(1.05, .14, .14, -90, 0, 5)[1:] + [(1.19, 3.1)] + arc(.79, 3.1, .4, 0, 90, 8)[1:] + [(.62, 3.55), (.62, 3.95), (.52, 3.95), (.52, 3.6)] + arc(.79, 3.08, .32, 90, 0, 8)[1:] + [(1.12, .2), (0, .14)]
    glass = lathe("dropper_glass", body, GLASS)
    liq = lathe("dropper_liquid", [(0, .16), (1.1, .16), (1.11, 2.1), (1.06, 2.14), (0, 2.12)], LIQ)
    # ribbed collar: radius modulated by angle via a ring of ridges
    segs, bm = 120, bmesh.new(); prof = [(.68, 3.55), (.7, 3.57), (.7, 4.45), (.66, 4.5), (.3, 4.5)]
    rings = []
    for r, z in prof:
        ring = []
        for i in range(segs):
            a = i / segs * math.tau
            rr = r + (.025 * (1 if (i // 2) % 2 else 0) if .6 < r and 3.6 < z < 4.4 else 0)
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(segs): bm.faces.new((a[i], a[(i + 1) % segs], b[(i + 1) % segs], b[i]))
    collar = obj_from_bm("dropper_collar", bm, BLACK, smooth=False)
    bulb = lathe("dropper_bulb", [(.3, 4.5), (.34, 4.6), (.34, 4.75)] + arc(.0, 5.25, .5, -45, 0, 4)[1:] + [(.5, 5.6)] + arc(0, 5.6, .5, 0, 90, 10)[1:], RUBBER)
    pip = lathe("dropper_pipette", [(0, .6), (.05, .6), (.09, .9), (.13, 1.4), (.13, 3.6), (0, 3.6)], GLASS, 48)
    for o in (collar, bulb): autosmooth(o)
    return [glass, liq, collar, bulb, pip]

# ---------- aluminium tin with deboss lid and type ----------
def tin():
    W, D, H, LID = 5.6, 2.4, 8.4, 2.0
    parts = []
    for nm, z0, z1, m in (("tin_body", 0, H - LID - .03, ALU), ("tin_lid", H - LID, H, ALU)):
        bpy.ops.mesh.primitive_cube_add(size=1)
        o = bpy.context.active_object; o.name = nm
        o.scale = (W, D, z1 - z0); o.location = (0, 0, (z0 + z1) / 2)
        bpy.ops.object.transform_apply(scale=True, location=True)
        bv = o.modifiers.new("bv", "BEVEL"); bv.width = .32; bv.segments = 8; bv.limit_method = "NONE"
        bpy.ops.object.modifier_apply(modifier="bv")
        o.data.materials.append(m); autosmooth(o, 35); parts.append(o)
    # inner sleeve visible in the seam
    bpy.ops.mesh.primitive_cube_add(size=1); s = bpy.context.active_object; s.name = "tin_sleeve"
    s.scale = (W - .16, D - .16, .5); s.location = (0, 0, H - LID - .1); bpy.ops.object.transform_apply(scale=True, location=True)
    s.data.materials.append(ALU_D); parts.append(s)
    def txt(nm, body, size, z, ext=.03, font_mat=ALU, x=0):
        bpy.ops.object.text_add(); t = bpy.context.active_object; t.name = nm
        t.data.body = body; t.data.size = size; t.data.extrude = ext; t.data.align_x = "CENTER"; t.data.align_y = "CENTER"
        t.data.space_character = 1.15
        bpy.ops.object.convert(target="MESH"); t = bpy.context.active_object
        t.rotation_euler = (math.pi / 2, 0, 0); t.location = (x, -D / 2 - ext + .005, z)
        bpy.ops.object.transform_apply(rotation=True, location=True)
        t.data.materials.clear(); t.data.materials.append(font_mat); parts.append(t); return t
    txt("tin_type", "NZT-00", .82, 3.6, .035)
    txt("tin_sub", "COGNITIVE FORMULARY  /  60 CAPSULES  /  SIZE 00", .17, 2.75, .012, ALU_D)
    txt("tin_lot", "LOT 26-10-A", .15, .55, .012, ALU_D)
    # measurement ticks along the side
    for i in range(24):
        bpy.ops.mesh.primitive_cube_add(size=1); k = bpy.context.active_object; k.name = f"tick{i}"
        L = .35 if i % 4 == 0 else .18
        k.scale = (L, .02, .025); k.location = (-W / 2 + .45 + L / 2, -D / 2 - .005, 1.0 + i * .2)
        bpy.ops.object.transform_apply(scale=True, location=True); k.data.materials.append(ALU_D); parts.append(k)
    ticks = [p for p in parts if p.name.startswith("tick")]
    bpy.ops.object.select_all(action="DESELECT")
    for k in ticks: k.select_set(True)
    bpy.context.view_layer.objects.active = ticks[0]; bpy.ops.object.join(); ticks[0].name = "tin_ticks"
    return [o for o in bpy.data.objects if o.name.startswith("tin_")]

# ---------- vacuum foil pouch: pillowed, crimped seals, tear notch ----------
def pouch():
    W, H, SEAL, NX, NY = 9.0, 13.0, .7, 90, 130
    bm = bmesh.new(); grid = {}
    rnd = random.Random(4)
    wr = [(rnd.uniform(.6, 2.2), rnd.uniform(0, 6.28), rnd.uniform(.5, 1.6), rnd.uniform(-1, 1)) for _ in range(9)]
    def ss(e0, e1, x):
        t = max(0, min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
    for side in (1, -1):
        for j in range(NY + 1):
            for i in range(NX + 1):
                x, y = (i / NX - .5) * W, j / NY * H
                dx = min(x + W / 2, W / 2 - x); dy = min(y, H - y)
                inflate = ss(SEAL, SEAL + 2.2, dx) * ss(SEAL, SEAL + 2.6, dy)
                z = .85 * inflate ** .8
                # vacuum wrinkles where the film pulls over the contents
                wv = sum(a * .02 * math.sin(f * (x * math.cos(t) + y * math.sin(t)) + p) for f, p, a, t in wr)
                z += wv * inflate * (1 - inflate) * 4
                if dx < SEAL or dy < SEAL:  # crimp
                    z = .01 + .012 * (1 + math.sin(y * 28 if dx < SEAL else x * 28))
                    if dy < SEAL and dx >= SEAL: z = .01 + .012 * (1 + math.sin(x * 28))
                if i in (0, NX) or j in (0, NY): z = 0
                grid[(side, i, j)] = bm.verts.new((x, -z * side, y))
        for j in range(NY):
            for i in range(NX):
                q = (grid[(side, i, j)], grid[(side, i + 1, j)], grid[(side, i + 1, j + 1)], grid[(side, i, j + 1)])
                bm.faces.new(q if side == 1 else q[::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = obj_from_bm("pouch_foil", bm, FOIL)
    bpy.context.view_layer.objects.active = o
    # tear notch + hang hole cut with booleans
    cuts = []
    bpy.ops.mesh.primitive_cylinder_add(radius=.22, depth=4, location=(0, 0, H - .38), rotation=(math.pi / 2, 0, 0)); cuts.append(bpy.context.active_object)
    bpy.ops.mesh.primitive_cone_add(radius1=.18, depth=.5, vertices=3, location=(W / 2, 0, H - 2.0), rotation=(math.pi / 2, 0, math.pi / 2)); cuts.append(bpy.context.active_object)
    for c in cuts:
        b = o.modifiers.new("b", "BOOLEAN"); b.object = c; b.operation = "DIFFERENCE"; b.solver = "EXACT"
        bpy.ops.object.modifier_apply(modifier="b"); bpy.data.objects.remove(c)
    # printed label: a thin matte black band and type sitting on the front face
    parts = [o]
    bpy.ops.object.text_add(); t = bpy.context.active_object; t.name = "pouch_type"
    t.data.body = "NZT-00"; t.data.size = 1.2; t.data.extrude = .004; t.data.align_x = "CENTER"; t.data.align_y = "CENTER"
    bpy.ops.object.convert(target="MESH"); t = bpy.context.active_object
    t.rotation_euler = (math.pi / 2, 0, 0); t.location = (0, -.88, H * .62); bpy.ops.object.transform_apply(rotation=True, location=True)
    t.data.materials.clear(); t.data.materials.append(BLACK); parts.append(t)
    bpy.ops.object.text_add(); t = bpy.context.active_object; t.name = "pouch_sub"
    t.data.body = "VACUUM SEALED  /  30 DOSES  /  KEEP < 25C"; t.data.size = .22; t.data.extrude = .003; t.data.align_x = "CENTER"
    bpy.ops.object.convert(target="MESH"); t = bpy.context.active_object
    t.rotation_euler = (math.pi / 2, 0, 0); t.location = (0, -.86, H * .52); bpy.ops.object.transform_apply(rotation=True, location=True)
    t.data.materials.clear(); t.data.materials.append(BLACK); parts.append(t)
    return parts

# ---------- 30-well indexing tray ----------
def tray():
    R, T, N = 7.0, .9, 30
    bpy.ops.mesh.primitive_cylinder_add(radius=R, depth=T, vertices=180, location=(0, 0, T / 2)); o = bpy.context.active_object; o.name = "tray_disc"
    bv = o.modifiers.new("bv", "BEVEL"); bv.width = .12; bv.segments = 4; bpy.ops.object.modifier_apply(modifier="bv")
    cut = []
    for i in range(N):
        a = i / N * math.tau
        bpy.ops.mesh.primitive_cylinder_add(radius=.5, depth=1.2, vertices=40, location=(5.6 * math.cos(a), 5.6 * math.sin(a), T)); cut.append(bpy.context.active_object)
    bpy.ops.mesh.primitive_cylinder_add(radius=1.6, depth=3, vertices=96, location=(0, 0, 0)); cut.append(bpy.context.active_object)
    bpy.ops.object.select_all(action="DESELECT")
    for c in cut: c.select_set(True)
    bpy.context.view_layer.objects.active = cut[0]; bpy.ops.object.join(); cutter = bpy.context.active_object
    b = o.modifiers.new("b", "BOOLEAN"); b.object = cutter; b.operation = "DIFFERENCE"; b.solver = "EXACT"
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="b"); bpy.data.objects.remove(cutter)
    o.data.materials.append(WHITE); autosmooth(o, 30)
    # well index numbers in dot-matrix-ish small type around the rim
    parts = [o]
    for i in range(0, N, 5):
        a = i / N * math.tau
        bpy.ops.object.text_add(); t = bpy.context.active_object; t.data.body = f"{i + 1:02d}"; t.data.size = .38; t.data.extrude = .01
        t.data.align_x = "CENTER"; t.data.align_y = "CENTER"
        bpy.ops.object.convert(target="MESH"); t = bpy.context.active_object
        t.location = (6.55 * math.cos(a), 6.55 * math.sin(a), T + .005); t.rotation_euler = (0, 0, a - math.pi / 2)
        bpy.ops.object.transform_apply(rotation=True, location=True); t.data.materials.clear(); t.data.materials.append(BLACK); parts.append(t)
    nums = parts[1:]
    bpy.ops.object.select_all(action="DESELECT")
    for t in nums: t.select_set(True)
    bpy.context.view_layer.objects.active = nums[0]; bpy.ops.object.join(); nums[0].name = "tray_numbers"
    return [o, nums[0]]

SETS = {"vial": vial, "ampoule": ampoule, "dropper": dropper, "tin": tin, "pouch": pouch, "tray": tray}
groups, x = {}, 0
LAYOUT = {"tray": (-14, 0), "tin": (-5, 0), "pouch": (3.5, 0), "dropper": (10.5, 0), "vial": (14, 0), "ampoule": (16.6, 0)}
for k, fn in SETS.items():
    parts = fn()
    parts = [p for p in parts if p.type == "MESH"]
    groups[k] = parts
    bpy.ops.object.select_all(action="DESELECT")
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.export_scene.gltf(filepath=f"{OUT}/glb/{k}.glb", export_format="GLB", use_selection=True, export_apply=True, export_yup=True)
    for p in parts: p.location.x += LAYOUT[k][0]

# ---------- preview render: studio lineup ----------
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, 0)); fl = bpy.context.active_object
fl.data.materials.append(mat("floor", (.8, .81, .82), rough=.6))
bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 40, 0), rotation=(math.pi / 2, 0, 0)); bpy.context.active_object.data.materials.append(MATS["floor"])
for loc, e, s in (((-20, -25, 40), 4000, 30), ((30, -10, 25), 1500, 20), ((0, 30, 30), 2500, 30)):
    bpy.ops.object.light_add(type="AREA", location=loc); L = bpy.context.active_object; L.data.energy = e; L.data.size = s
    L.rotation_euler = (Vector((2, 2, 4)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (.85, .86, .87, 1); w.node_tree.nodes["Background"].inputs[1].default_value = .6; sc.world = w
bpy.ops.object.camera_add(location=(2, -62, 14)); cam = bpy.context.active_object; sc.camera = cam
cam.data.lens = 70
cam.rotation_euler = (Vector((1.5, 0, 4.5)) - cam.location).to_track_quat("-Z", "Y").to_euler()
groups["tray"][0].rotation_euler = (math.radians(70), 0, 0); groups["tray"][1].rotation_euler = (math.radians(70), 0, 0)
for p in groups["tray"]: p.location.z += 7.0; p.location.y += 4
sc.render.engine = "CYCLES"; sc.cycles.samples = 96; sc.cycles.device = "CPU"
try:
    sc.cycles.use_denoising = True
except Exception: pass
sc.render.resolution_x, sc.render.resolution_y = 1600, 760
sc.view_settings.view_transform = "AgX"
sc.render.filepath = f"{OUT}/preview.png"
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/nzt-00-lab-set.blend")
print("NZT_DONE", {k: len(v) for k, v in groups.items()})
