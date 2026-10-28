"""Render P4CE 08 RENEW assets.

Usage (from this folder):
  /tmp/claude-0/bpyenv/bin/python render.py <product> <variant> <kind> [options]

  product : dropper | jar | bottle | capsule | halo | group
  variant : 08-1 .. 08-6 (products) or a sculpture id
  kind    : hero (transparent PNG + *_fog.png composite) | cyc (real cyc geometry) | turntable (transparent frames)
options:
  --samples N   --res WxH   --out PATH   --frames N   --scratch DIR   --quick
"""
import argparse
import importlib
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402

import common as C  # noqa: E402

PRODUCTS = {
    "dropper": "build_dropper",
    "jar": "build_jar",
    "bottle": "build_bottle",
}


def frame_camera(height, width, res, elev_deg=7.0, lens=100.0, fill=0.70, fstop=8.0, target_z=None,
                 focus_offset=0.0, yaw_deg=0.0):
    w, h = res
    sensor = 36.0
    # sensor maps to the larger dimension
    fov_h = 2 * math.atan(sensor / 2 / lens) if h >= w else 2 * math.atan(sensor * h / w / 2 / lens)
    fov_w = 2 * math.atan(sensor / 2 / lens) if w >= h else 2 * math.atan(sensor * w / h / 2 / lens)
    need_h = height / fill
    need_w = width / fill
    d = max(need_h / 2 / math.tan(fov_h / 2), need_w / 2 / math.tan(fov_w / 2))
    tz = target_z if target_z is not None else height * 0.5
    e = math.radians(elev_deg)
    y = math.radians(yaw_deg)
    loc = (d * math.cos(e) * math.sin(y), -d * math.cos(e) * math.cos(y), tz + d * math.sin(e))
    cam = C.camera(loc, (0, 0, tz), lens=lens, fstop=fstop, focus=d - focus_offset)
    return cam, d


def stage(kind, scale=1.0, center_z=0.05, fog_grad=(0.0, 0.45), hdri=0.30, hdri_rot=0.0, warm=False,
          key=1.0, rim=1.0, back=0.0, back_w=0.05, back_h=0.10, trans_col=(0x9A, 0xA4, 0xAD), fill=1.0, top=1.0):
    C.setup_world(hdri_strength=hdri, rot_deg=hdri_rot, transmission_color=C.lin(trans_col))
    C.studio_rig(scale=scale, key=key, rim=rim, center=(0, 0, center_z), warm=warm, back=back, back_w=back_w,
                 back_h=back_h, fill=fill, top=top)
    if kind == "lying":
        return None  # no floor: the site lays these on its ritual cards
    if kind == "cyc":
        ob, m = C.cyc(w=6 * scale, depth=3 * scale, height=3 * scale, radius=0.35 * scale, y_wall=0.55 * scale)
        nt = m.node_tree
        mr = [n for n in nt.nodes if n.type == "MAP_RANGE"][0]
        mr.inputs["From Min"].default_value = fog_grad[0]
        mr.inputs["From Max"].default_value = fog_grad[1]
        return ob
    return C.shadow_catcher((1.4 if kind == "top" else 0.42) * scale)  # top: edge must leave the frame


def to_webp(png, out, quality=90, alpha_quality=90):
    from PIL import Image
    im = Image.open(png)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im.save(out, "WEBP", quality=quality, alpha_quality=alpha_quality, method=6)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("product")
    ap.add_argument("variant")
    ap.add_argument("kind")
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--res", default="1600x2000")
    ap.add_argument("--out", default=None)
    ap.add_argument("--frames", type=int, default=48)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--end", type=int, default=None)
    ap.add_argument("--scratch", default="/tmp/claude-0/p4ce-render")
    ap.add_argument("--elev", type=float, default=None)
    ap.add_argument("--fstop", type=float, default=None)
    ap.add_argument("--save-blend", action="store_true")
    ap.add_argument("--crop", default=None, help="x0,y0,x1,y1 border in 0..1 (y from bottom)")
    a = ap.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:])
    w, h = map(int, a.res.split("x"))
    transparent = a.kind != "cyc"

    C.reset()
    if a.product == "scene":
        import scenes
        info = scenes.build(a.variant, (w, h))
        root = info.get("root")
        C.setup_render(w, h, samples=a.samples, transparent=transparent, exposure=info.get("exposure", -0.35))
        if info.get("after_setup"):
            info["after_setup"]()
    else:
        mod = importlib.import_module(PRODUCTS[a.product])
        lying = a.kind == "lying"
        root, info = mod.build(a.variant, lying=True) if lying else mod.build(a.variant)
        H = info["height"]
        Rr = info["radius"]
        scale = max(H, Rr * 2) / 0.12
        st = dict(info.get("stage", {}))
        if lying:
            # cap to the right, label to camera; resting on its side at z = 0
            root.rotation_euler = (0, math.radians(90), 0)
            root.location = (-H / 2, 0, Rr)
            bpy.context.view_layer.update()
            if info.get("settle"):
                info["settle"](root.matrix_world)
            stage("lying", scale=scale, center_z=Rr, **st)
        else:
            if a.kind == "top":
                st.update(info.get("top_stage", {}))
            stage(a.kind, scale=scale * 1.0, center_z=info["center_z"], fog_grad=(0.0, 0.45 * scale), **st)
            if a.kind == "top":
                # dark card where a flat top reflects: the lid reads as metal, not a white disc
                s_ = scale
                cz = info["center_z"]
                tf = C.card("topflag", (0, 0.20 * s_, cz + 0.30 * s_), (0, 0, cz), 0.22 * s_, 0.16 * s_,
                            color=(0.02, 0.022, 0.025, 1))
                tf.visible_shadow = False  # reflection only: no shadow edge on the catcher
                tf.visible_diffuse = False
        C.setup_render(w, h, samples=a.samples, transparent=transparent, exposure=info.get("exposure", -0.35))
        fst = a.fstop if a.fstop is not None else info.get("fstop", 8.0)
        if lying:
            cam, d = frame_camera(Rr * 2, H, (w, h), elev_deg=a.elev if a.elev is not None else 5.0,
                                  fill=0.82, fstop=fst, target_z=Rr, focus_offset=Rr * 0.6)
        else:
            elev = a.elev if a.elev is not None else (info.get("top_elev", 48.0) if a.kind == "top"
                                                       else info.get("elev", 7.0))
            fill = info.get("fill", 0.70) * (0.80 if a.kind == "top" else 1.0)
            cam, d = frame_camera(H, Rr * 2.4, (w, h), elev_deg=elev, fill=fill, fstop=fst,
                                  target_z=info.get("target_z", H * 0.48) if a.kind != "top" else H * 0.55,
                                  focus_offset=Rr * 0.6 if a.kind != "top" else 0.0)
    if a.crop:
        x0, y0, x1, y1 = map(float, a.crop.split(","))
        r = bpy.context.scene.render
        r.use_border = True
        r.use_crop_to_border = True
        r.border_min_x, r.border_min_y, r.border_max_x, r.border_max_y = x0, y0, x1, y1
    if a.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join("/tmp/claude-0/p4ce-render", f"{a.product}_{a.variant}_{a.kind}.blend"))

    os.makedirs(a.scratch, exist_ok=True)
    t0 = time.time()
    if a.kind in ("hero", "cyc", "scene", "lying", "top"):
        png = a.out if a.out and a.out.endswith(".png") else os.path.join(a.scratch, f"{a.variant}_{a.kind}.png")
        C.render_to(png)
        print(f"RENDERED {png} in {time.time() - t0:.1f}s")
        if a.kind in ("hero", "scene", "lying", "top"):
            import post
            post.composite_fog(png, png.replace(".png", "_fog.png"), **info.get("fog", {}))
    else:
        n = a.frames
        end = a.end if a.end is not None else n
        outdir = a.out or os.path.join(a.scratch, f"tt_{a.variant}")
        os.makedirs(outdir, exist_ok=True)
        base_rot = info.get("turn_offset", 0.0)
        for f in range(a.start, end):
            root.rotation_euler = (0, 0, math.radians(base_rot) + 2 * math.pi * f / n)
            t1 = time.time()
            C.render_to(os.path.join(outdir, f"f_{f:03d}.png"))
            print(f"FRAME {f} {time.time() - t1:.1f}s", flush=True)
        print(f"TURNTABLE {outdir} {end - a.start} frames in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
