"""PR6 v13: the lyophilisation vial (2R-style, clear glass), its printed wrap label and invisible ink.

Reuses the v12 pack helpers (packs.py) and label canvas (labels.py), so it sits in the same pale set under the
same six light groups. Facts come only from vial_facts.json (dumped from ../js/catalog.js); every compound there is
sample data until the owner supplies the list. Units: cm (geometry), mm (label artwork).
"""
import json
import math
import os

import labels
import packs
from labels import Canvas, INK, ORANGE, MONO, mono_block
from packs import arc, lathe, link, math_, node, principled, simple, srgb, new_mat, obj_sep, shadow_pass, \
    with_print, add_ink, inked, parent_all, map_cylinder, aluminium

HERE = os.path.dirname(os.path.abspath(__file__))
FACTS = json.load(open(os.path.join(HERE, "vial_facts.json")))
P = FACTS["products"]
AREAS = {a["c"]: a["n"] for a in FACTS["areas"]}

R = 0.80          # body radius, cm (16 mm OD)
LAB_Z0, LAB_H = 0.42, 1.78   # label band on the body, cm
VIAL_W, VIAL_H = 44.0, LAB_H * 10.0   # label artwork, mm (wraps ~280 degrees)

# flip-off cap colourways (the brand's one accent is Safety Orange; the rest stay quiet)
CAPS = {"orange": "E98546", "ink": "1F2529", "mist": "CAD5DA", "steel": "718B9A", "chalk": "EDEEEA"}


# ------------------------------------------------------------------ label artwork
def ink_lines(pid, short=False):
    p = P[pid]
    if short:
        return [p["lot"], "HPLC " + p["purity"]]
    return [p["lot"], "HPLC %s · MS confirmed" % p["purity"], "CoA %s" % p["tdate"], "Tested by " + p["tested"]]


def ink_text(pid, short=False):
    return " · ".join(ink_lines(pid, short))


def vial_label(pid, key, short=False):
    """White paper wrap: PR6 wordmark, catalogue number, compound, size, lot, the RUO line, one orange tick."""
    c = Canvas(VIAL_W, VIAL_H, 34)
    c.rect(0, 0, VIAL_W, VIAL_H, (246, 247, 243, 255))
    fill = INK + (255,)
    p = P[pid]
    x0 = 15.0
    c.wordmark(x0, 6.4, 3.5, fill)
    m = c.font(MONO, 0.92)
    s = c.font(MONO, 0.62)
    c.text(x0 + 0.1, 9.4, pid, m, fill, track_mm=0.16)
    c.text(x0 + 0.1, 11.4, p["n"].upper(), m, fill, track_mm=0.16)
    c.text(x0 + 0.1, 13.2, "%s · LYOPHILISED" % p["size"].upper(), s, fill, track_mm=0.12)
    c.text(x0 + 0.1, 14.6, "%s / %s" % (p["c"], AREAS[p["c"]].upper()), s, fill, track_mm=0.12)
    c.text(x0 + 0.1, 16.3, "RESEARCH USE ONLY · NOT FOR HUMAN USE", s, (23, 28, 31, 200), track_mm=0.08)
    # right panel: lot field and a hairline frame, one orange tick
    c.rect(33.2, 2.2, 33.32, 16.6, (23, 28, 31, 140))
    c.text(34.4, 4.4, "LOT", s, fill, track_mm=0.12)
    c.text(34.4, 6.0, p["lot"].replace("LOT ", ""), m, fill, track_mm=0.12)
    c.text(34.4, 8.2, "STORE −20 °C", s, fill, track_mm=0.1)
    c.rect(34.4, 10.0, 37.4, 10.5, ORANGE + (255,))
    c.save(key + "_print.png")
    k = Canvas(VIAL_W, VIAL_H, 34, "L")
    cap = 0.78 if not short else 0.95
    mono_block(k, x0 + 9.6, 3.5, ink_lines(pid, True), cap, cap * 1.75, 255)
    k.save(key + "_ink.png")
    return VIAL_W, VIAL_H


# ------------------------------------------------------------------ materials
def clear_glass(name):
    m, nt, out = new_mat(name)
    g = principled(nt, (0.97, 0.985, 0.99, 1), 0.0, 0.02, Transmission_Weight=1.0, IOR=1.52)
    link(nt, g.outputs[0], out.inputs["Surface"])
    return shadow_pass(m, (0.97, 0.98, 0.99))


def paper_label(name, mapping, print_img):
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    p = principled(nt, srgb("F6F7F3"), 0.0, 0.62, Specular_IOR_Level=0.32, Sheen_Weight=0.15)
    fib = node(nt, "ShaderNodeTexNoise", Scale=420.0, Detail=8.0, Roughness=0.7)
    link(nt, tc.outputs["Object"], fib.inputs["Vector"])
    bpn = node(nt, "ShaderNodeBump", Strength=0.05, Distance=0.002)
    link(nt, fib.outputs["Fac"], bpn.inputs["Height"])
    link(nt, bpn.outputs[0], p.inputs["Normal"])
    vec = mapping(nt)
    it = packs.image(nt, print_img, vec)
    link(nt, it.outputs["Color"], p.inputs["Base Color"])
    # outside the artwork the paper keeps its own white (CLIP extension gives transparent black)
    mix = node(nt, "ShaderNodeMix", _data_type="RGBA")
    mix.inputs[6].default_value = srgb("F6F7F3")
    link(nt, it.outputs["Alpha"], mix.inputs[0])
    link(nt, it.outputs["Color"], mix.inputs[7])
    link(nt, mix.outputs[2], p.inputs["Base Color"])
    link(nt, p.outputs[0], out.inputs["Surface"])
    return m


def cake_material(name):
    """Lyophilised cake: matte, porous, faintly warm white, light scattering a little into it."""
    m, nt, out = new_mat(name)
    tc, sep = obj_sep(nt)
    p = principled(nt, srgb("F4F2EC"), 0.0, 0.95, Specular_IOR_Level=0.15)
    n1 = node(nt, "ShaderNodeTexNoise", Scale=60.0, Detail=10.0, Roughness=0.75)
    link(nt, tc.outputs["Object"], n1.inputs["Vector"])
    bpn = node(nt, "ShaderNodeBump", Strength=0.6, Distance=0.02)
    link(nt, n1.outputs["Fac"], bpn.inputs["Height"])
    link(nt, bpn.outputs[0], p.inputs["Normal"])
    link(nt, p.outputs[0], out.inputs["Surface"])
    return m


# ------------------------------------------------------------------ the vial
def build_vial(pid, key, cap="orange", short=False):
    W, H = vial_label(pid, key, short=short)
    t = 0.10
    gm = clear_glass(key + "_glass")
    # body, shoulder, neck and lip (outer), then back down the inside
    out = [(0, 0.02), (R - 0.12, 0.02)] + arc(R - 0.12, 0.14, 0.12, -90, 0, 6)[1:] + [(R, 2.62)] + \
        arc(R - 0.30, 2.62, 0.30, 0, 72, 8)[1:] + [(0.52, 3.02), (0.52, 3.12), (0.64, 3.16)] + \
        arc(0.58, 3.30, 0.08, -60, 90, 6)[1:] + [(0.42, 3.38)]
    inn = [(0.42, 3.38), (0.42, 3.05), (0.43, 2.98)] + arc(R - 0.30, 2.62, 0.30 - t, 72, 0, 8)[1:] + \
        [(R - t, 0.24)] + arc(R - t - 0.10, 0.24, 0.10, 0, -90, 5)[1:] + [(0, 0.12)]
    glass = lathe(key + "_vglass", out + inn, [gm], segs=192)
    # label band: a thin shell just proud of the glass, ~280 degrees, seam at the back
    mp = map_cylinder(R + 0.004, W, H, LAB_Z0)
    lm = paper_label(key + "_label", mp, key + "_print.png")
    add_ink(lm, mp, key + "_ink.png", strength=2.2)
    band = lathe(key + "_band", [(R + 0.004, LAB_Z0), (R + 0.004, LAB_Z0 + LAB_H)], [lm], segs=256)
    # trim the band to its printed arc: delete faces outside the artwork's angular span
    import bmesh
    import bpy
    me = band.data
    bm = bmesh.new()
    bm.from_mesh(me)
    uvl = bm.loops.layers.uv["UVMap"]
    circ = 2 * math.pi * (R + 0.004) * 10.0
    half = (W / circ) / 2.0 + 0.002
    kill = []
    for f in bm.faces:
        us = [lp[uvl].uv[0] for lp in f.loops]
        uc = sum(us) / len(us)
        if abs(uc - 0.75) > half:
            kill.append(f)
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(me)
    bm.free()
    inked(band)
    # lyophilised cake, a little domed and pulled from the wall
    cake = lathe(key + "_cake", [(0, 0.13), (R - t - 0.05, 0.13), (R - t - 0.03, 0.62)] + arc(0, 0.50, R - t - 0.03, 8, 90, 10)[1:],
                 [cake_material(key + "_cake")], segs=128)
    # grey butyl stopper (only its flange shows under the crimp edge) + aluminium crimp + flip-off cap
    rub, _, _ = simple(key + "_stopper", srgb("5C6266"), 0.0, 0.55, Specular_IOR_Level=0.3)
    stopper = lathe(key + "_stopper", [(0, 3.18), (0.40, 3.18), (0.40, 3.38), (0.63, 3.40), (0.63, 3.50), (0, 3.50)], [rub], segs=96)
    al = aluminium(key + "_crimp", "turned", base=(0.80, 0.82, 0.84, 1), rough=0.30, aniso=0.6, groove=0.12)
    crimp = lathe(key + "_crimp", [(0.50, 3.06), (0.68, 3.08)] + arc(0.66, 3.50, 0.04, -10, 90, 4)[1:] +
                  [(0.30, 3.54), (0.30, 3.52), (0.62, 3.50), (0.64, 3.10), (0.50, 3.10)], [al], segs=160)
    cc = CAPS[cap]
    cm, _, _ = simple(key + "_cap", srgb(cc), 0.0, 0.34, Specular_IOR_Level=0.45, Coat_Weight=0.2)
    flip = lathe(key + "_cap", [(0, 3.53), (0.58, 3.53)] + arc(0.56, 3.70, 0.03, -60, 90, 4)[1:] + [(0.42, 3.73), (0, 3.73)],
                 [cm], segs=128)
    return parent_all(key, [glass, band, cake, stopper, crimp, flip])
