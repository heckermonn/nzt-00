"""PR6 / Institute: the invitation card for the real-time world. The card of rooms.py (ink stock, orange edge, blind
deboss, deep-blue wax seal with the lineage insignia), seen square-on with no ground, as a cut-out the page maps onto
a thin slab it can hold in front of the camera.

  PY card.py -- --out OUT [--res 900] [--samples 128]
"""
import argparse, math, os, random, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa
import numpy as np  # noqa
import common as C  # noqa
from common import box, plain, area, INK, ORANGE, DEEP_BLUE  # noqa
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument("--out", required=True); ap.add_argument("--res", type=int, default=900); ap.add_argument("--samples", type=int, default=128)
a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
os.makedirs(a.out, exist_ok=True)
CW, CH, CT = 0.105, 0.148, 0.0012

for sym in C.SYMS:
    sc = C.setup(a.res, a.samples)
    C.world(sc, (0.5, 0.62, 0.8), 0.05)
    sc.render.film_transparent = True; sc.cycles.use_denoising = True
    sc.render.resolution_x = int(a.res * CW / CH); sc.render.resolution_y = a.res
    STOCK = plain("stock", (INK[0] * 0.9, INK[1] * 0.9, INK[2] * 0.95), 0.72)
    b = STOCK.node_tree.nodes["Principled BSDF"]; b.inputs["Sheen Weight"].default_value = 0.6; b.inputs["Sheen Roughness"].default_value = 0.45
    C.noise_bump(STOCK, 2600, 0.05, 0.00002, 2)
    card = box("card", (0, 0, CT / 2), (CW, CH, CT), None)
    card.data.materials.append(STOCK); card.data.materials.append(plain("edge", ORANGE, 0.55))
    for p in card.data.polygons:
        p.material_index = 0 if abs(p.normal.z) > 0.5 else 1
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
    px = 420; yy, xx = np.mgrid[0:px, 0:px]; cc = (px - 1) / 2
    th = np.arctan2(yy - cc, xx - cc); rr = np.hypot(xx - cc, yy - cc) / cc
    rs = random.Random(sum(map(ord, sym)))
    wob = sum(rs.uniform(0.012, 0.04) * np.sin(th * k + rs.uniform(0, 6.28)) for k in (2, 3, 5, 7))
    R_out = 0.84 + wob
    dome = np.clip((R_out - rr) / 0.16, 0, 1) ** 0.55
    field = np.clip((0.62 - rr) / 0.05, 0, 1)
    smk = C.symbol_mask(sym, px, fit=0.54, blur=px / 300)
    ring = np.clip(1 - np.abs(rr - 0.585) / 0.022, 0, 1)
    Hs = dome * (1.0 - 0.42 * field) + field * (0.36 * smk + 0.16 * ring)
    Hs = C.gauss(Hs / 1.2, px / 300) * 1.2
    WAX = plain("wax", (DEEP_BLUE[0] * 0.55, DEEP_BLUE[1] * 0.6, DEEP_BLUE[2] * 0.7), 0.3, 0.0, 0.3)
    wb = WAX.node_tree.nodes["Principled BSDF"]; wb.inputs["Subsurface Weight"].default_value = 0.25; wb.inputs["Subsurface Radius"].default_value = (0.002, 0.002, 0.003)
    SR = 0.021
    seal = C.height_mesh("seal", Hs, SR * 2, SR * 2, 0.0034, WAX, keep=(rr < R_out + 0.01))
    seal.rotation_euler = (math.radians(-90), 0, math.radians(-8)); seal.location = (0.0, -0.022, CT)
    area("key", "", (-0.22, 0.20, 0.26), (0, -0.01, 0), 0.22, 1.5, (0.86, 0.93, 1.0), sy=0.12)
    area("rim", "", (0.16, -0.30, 0.06), (0, -0.04, 0), 0.05, 0.4, (0.70, 0.84, 1.0), sy=0.3)
    area("top", "", (0, 0, 0.5), (0, 0, 0), 0.5, 0.32, (0.8, 0.9, 1.0), sy=0.5)
    bpy.ops.object.camera_add(location=(0, 0, 1.0)); cam = bpy.context.object
    cam.data.type = "ORTHO"; cam.data.ortho_scale = CH * 1.0; cam.data.sensor_fit = "VERTICAL"; sc.camera = cam
    sc.view_settings.view_transform = "Standard"; sc.view_settings.exposure = 1.9
    sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
    tmp = os.path.join(a.out, "_card_%s.png" % sym); sc.render.filepath = tmp
    bpy.ops.render.render(write_still=True)
    # grade: the paper down to ink, the wax kept (it is the only saturated thing on the card)
    im = np.asarray(Image.open(tmp).convert("RGB")).astype(np.float32) / 255
    hh, ww = im.shape[:2]; yy, xx = np.mgrid[0:hh, 0:ww]
    inner = np.clip((0.72 * SR / CH * hh - np.hypot(xx - ww / 2, yy - (hh / 2 + 0.022 / CH * hh))) / 3 + 0.5, 0, 1)
    sat = np.maximum(np.clip(((im.max(-1) - im.min(-1)) - 0.16) / 0.14, 0, 1), inner)[..., None]
    im = im * (0.40 + 0.52 * sat)
    Image.fromarray((np.clip(im, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(a.out, "card_%s.webp" % sym), "WEBP", quality=90, method=6); os.remove(tmp)
    print("CARD", sym, flush=True)
