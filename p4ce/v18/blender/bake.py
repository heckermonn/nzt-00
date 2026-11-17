"""PR6 / Institute: the bake helpers behind the real-time world.

A zone script builds a room with the same materials and lights as the still scenes, sorts its objects into groups, and
calls bake(): each group becomes ONE mesh with one UV layout and its light path-traced into textures, so the page
draws it with no lights at all and it still looks like the Cycles picture from any camera position.

  split     colour (albedo, sharp, one sample) and light (diffuse direct + indirect, denoised) as two textures
  combined  everything in one texture, glossy response included as seen from the scene camera (metal, small parts)
  emit      not baked: a flat light-emitting surface, exported with its colour and strength
"""
import json, math, os, time
import bpy
import numpy as np
from mathutils import Vector
from PIL import Image


def enc(a):
    return (np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8)


def srgb(x):
    x = np.clip(x, 0, 1)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def deselect():
    for o in bpy.context.selected_objects:
        o.select_set(False)


def join(objs, name):
    """Apply modifiers, turn curves into meshes, and join into one object."""
    objs = [o for o in objs if o and o.name in bpy.context.scene.objects]
    deselect()
    for o in objs:
        o.hide_render = False; o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.convert(target="MESH")
    if len(objs) > 1:
        bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; o.data.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o


def unwrap(o, margin=0.004, angle=66):
    deselect(); o.select_set(True); bpy.context.view_layer.objects.active = o
    while o.data.uv_layers:
        o.data.uv_layers.remove(o.data.uv_layers[0])
    o.data.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    # stretch the layout to fill the square (each axis on its own): texels are not wasted on empty margins
    uv = o.data.uv_layers.active.data; n = len(uv)
    if n:
        arr = np.empty(n * 2, np.float32); uv.foreach_get("uv", arr); arr = arr.reshape(-1, 2)
        lo, hi = arr.min(0), arr.max(0); pad = 0.006
        arr = pad + (arr - lo) / np.maximum(hi - lo, 1e-6) * (1 - 2 * pad)
        uv.foreach_set("uv", arr.ravel())


def planar_uv(o, x0, x1, z0, z1):
    """UVs straight from position, for a surface facing -Y (reliefs): u across x, v up z."""
    me = o.data
    while me.uv_layers:
        me.uv_layers.remove(me.uv_layers[0])
    uv = me.uv_layers.new(name="UVMap")
    mw = o.matrix_world
    for l in me.loops:
        p = mw @ me.vertices[l.vertex_index].co
        uv.data[l.index].uv = ((p.x - x0) / (x1 - x0), (p.z - z0) / (z1 - z0))


def _target(o, img):
    for s in o.material_slots:
        m = s.material
        if m is None:
            m = bpy.data.materials.new("_m"); s.material = m
        if not m.use_nodes:
            m.use_nodes = True
        nt = m.node_tree
        nd = nt.nodes.get("_bake") or nt.nodes.new("ShaderNodeTexImage")
        nd.name = "_bake"; nd.image = img
        for n in nt.nodes:
            n.select = False
        nd.select = True; nt.nodes.active = nd
    if not o.material_slots:
        m = bpy.data.materials.new("_m"); m.use_nodes = True; o.data.materials.append(m); _target(o, img)


def _pixels(img):
    w, h = img.size; a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
    return a.reshape(h, w, 4)[::-1, :, :3].copy()


def _denoise(a):
    """OpenImageDenoise through the compositor, on a baked HDR image."""
    sc = bpy.context.scene
    h, w = a.shape[:2]
    src = bpy.data.images.new("_dn", w, h, float_buffer=True, alpha=False)
    rgba = np.ones((h, w, 4), np.float32); rgba[..., :3] = a[::-1]
    src.pixels.foreach_set(rgba.ravel())
    tmp = "/tmp/claude-0/v18/_dn"; os.makedirs(tmp, exist_ok=True)
    old = sc.compositing_node_group
    ng = bpy.data.node_groups.new("dn", "CompositorNodeTree"); sc.compositing_node_group = ng
    im = ng.nodes.new("CompositorNodeImage"); im.image = src
    dn = ng.nodes.new("CompositorNodeDenoise")
    for k, v in (("Prefilter", "None"), ("HDR", True)):
        try:
            dn.inputs[k].default_value = v
        except Exception:
            pass
    fo = ng.nodes.new("CompositorNodeOutputFile"); fo.directory = tmp + os.sep; fo.file_name = ""
    fo.format.media_type = "IMAGE"; fo.format.file_format = "OPEN_EXR"; fo.format.color_depth = "32"; fo.format.color_mode = "RGB"
    it = fo.file_output_items.new("RGBA", "dn")
    ng.links.new(im.outputs[0], dn.inputs["Image"]); ng.links.new(dn.outputs[0], fo.inputs[it.name])
    rx, ry, rp, eng, smp = sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage, sc.render.engine, sc.cycles.samples
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage = w, h, 100
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    # the cheapest possible render: the compositor only needs to run
    hidden = [o for o in sc.objects if not o.hide_render]
    for o in hidden:
        o.hide_render = True
    sc.cycles.samples = 1
    sc.render.filepath = os.path.join(tmp, "_r")
    bpy.ops.render.render(write_still=False)
    for o in hidden:
        o.hide_render = False
    sc.render.resolution_x, sc.render.resolution_y, sc.render.resolution_percentage, sc.cycles.samples = rx, ry, rp, smp
    out = [f for f in os.listdir(tmp) if f.startswith("dn") and f.endswith(".exr")]
    res = a
    if out:
        ld = bpy.data.images.load(os.path.join(tmp, out[0])); res = _pixels(ld); bpy.data.images.remove(ld)
    bpy.data.images.remove(src); bpy.data.node_groups.remove(ng); sc.compositing_node_group = old
    return np.maximum(res, 0)


def _dilate(a, mask, it=6):
    """Spread baked texels outward over the unbaked margin so seams never show a dark line."""
    a = a.copy(); m = mask.copy()
    for _ in range(it):
        acc = np.zeros_like(a); cnt = np.zeros(m.shape, np.float32)
        for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            sm = np.roll(np.roll(m, dy, 0), dx, 1); sa = np.roll(np.roll(a, dy, 0), dx, 1)
            acc += sa * sm[..., None]; cnt += sm
        fill = (~m) & (cnt > 0)
        a[fill] = acc[fill] / cnt[fill][..., None]; m = m | fill
    return a


def bake(o, name, out, mode="split", res=1024, cres=None, samples=64, denoise=True, quality=86):
    """Bake one joined, unwrapped object. Returns the manifest entry for it."""
    sc = bpy.context.scene; bk = sc.render.bake
    deselect(); o.select_set(True); bpy.context.view_layer.objects.active = o
    bk.target = "IMAGE_TEXTURES"; bk.use_clear = True; bk.margin = 0; bk.use_selected_to_active = False
    info = dict(mode=mode); t0 = time.time()

    def run(kind, flt, r, smp):
        img = bpy.data.images.new("_b_" + name, r, r, float_buffer=True, alpha=True)
        img.generated_color = (0, 0, 0, 0)
        _target(o, img)
        sc.cycles.samples = smp
        if flt is None:
            bk.view_from = "ACTIVE_CAMERA" if sc.camera else "ABOVE_SURFACE"
            bpy.ops.object.bake(type=kind)
        else:
            bpy.ops.object.bake(type=kind, pass_filter=flt)
        w, h = img.size; a = np.empty(w * h * 4, np.float32); img.pixels.foreach_get(a)
        a = a.reshape(h, w, 4)[::-1].copy(); bpy.data.images.remove(img)
        return a[..., :3], a[..., 3] > 0.5

    if mode in ("split", "light"):
        cr = cres or res
        if mode == "split":
            col, cm = run("DIFFUSE", {"COLOR"}, cr, 1)
            Image.fromarray(enc(srgb(_dilate(col, cm)))).save(os.path.join(out, name + "_c.webp"), "WEBP", quality=quality, method=6)
        lit, lm = run("DIFFUSE", {"DIRECT", "INDIRECT"}, res, samples)
        lit = _dilate(lit, lm, 3)
        if denoise:
            lit = _denoise(lit)
        lit = _dilate(lit, lm, 8)
        sc_ = float(np.percentile(lit[lm].max(-1), 99.8)) if lm.any() else 1.0
        sc_ = max(sc_, 1e-4)
        Image.fromarray(enc(srgb(lit / sc_))).save(os.path.join(out, name + "_l.webp"), "WEBP", quality=quality + 4, method=6)
        info.update(scale=round(sc_, 5), res=res, cres=cr)
    else:
        b, m = run("COMBINED", None, res, samples)
        b = _dilate(b, m, 3)
        if denoise:
            b = _denoise(b)
        b = _dilate(b, m, 8)
        sc_ = float(np.percentile(b[m].max(-1), 99.7)) if m.any() else 1.0
        sc_ = max(sc_, 1e-4)
        Image.fromarray(enc(srgb(b / sc_))).save(os.path.join(out, name + "_b.webp"), "WEBP", quality=quality + 4, method=6)
        info.update(scale=round(sc_, 5), res=res)
    info["s"] = round(time.time() - t0, 1)
    print("BAKED", name, mode, res, "%.0fs" % info["s"], flush=True)
    return info


def flat_copy(o, name, front=False):
    """After a planar-UV relief is baked, the page only needs a flat sheet with the same UVs."""
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    x0, x1 = min(p.x for p in bb), max(p.x for p in bb); z0, z1 = min(p.z for p in bb), max(p.z for p in bb)
    y = min(p.y for p in bb) if front else sum(p.y for p in bb) / 8
    me = bpy.data.meshes.new(name)
    me.from_pydata([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], [], [(0, 1, 2, 3)]); me.update()
    uv = me.uv_layers.new(name="UVMap")
    for l, c in zip(me.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        uv.data[l.index].uv = c
    f = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(f)
    return f


def export(objs, path):
    deselect()
    for o in objs:
        o.hide_render = False; o.hide_viewport = False; o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_materials="NONE", export_apply=True,
                              export_yup=True, export_texcoords=True, export_normals=True, export_extras=True, export_cameras=False, export_lights=False)
    print("EXPORTED", path, os.path.getsize(path) // 1024, "KB", flush=True)
