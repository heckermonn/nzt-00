"""PR6 / Institute: materials and small builders shared by the still scenes and the real-time world (world.py)."""
import math
import bpy  # noqa
import common as C  # noqa
from common import nodes, plain  # noqa

def concrete(nm, tint=(1, 1, 1)):
    """Board-formed concrete, stained in long vertical runs, darker and glossier where it is wet near the ground."""
    m = bpy.data.materials.new(nm); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    n1 = n.new("ShaderNodeTexNoise"); n1.inputs["Scale"].default_value = 1.6; n1.inputs["Detail"].default_value = 9; n1.inputs["Roughness"].default_value = 0.62
    l.new(geo.outputs["Position"], n1.inputs["Vector"])
    r1 = n.new("ShaderNodeValToRGB"); r1.color_ramp.elements[0].position = 0.3; r1.color_ramp.elements[1].position = 0.75
    r1.color_ramp.elements[0].color = (0.05 * tint[0], 0.052 * tint[1], 0.056 * tint[2], 1)
    r1.color_ramp.elements[1].color = (0.19 * tint[0], 0.195 * tint[1], 0.20 * tint[2], 1)
    l.new(n1.outputs["Fac"], r1.inputs["Fac"])
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (5.0, 5.0, 0.22)
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    n2 = n.new("ShaderNodeTexNoise"); n2.inputs["Scale"].default_value = 3.0; n2.inputs["Detail"].default_value = 4
    l.new(mp.outputs[0], n2.inputs["Vector"])
    r2 = n.new("ShaderNodeValToRGB"); r2.color_ramp.elements[0].position = 0.35; r2.color_ramp.elements[1].position = 0.62
    r2.color_ramp.elements[0].color = (0.42, 0.42, 0.43, 1); r2.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(n2.outputs["Fac"], r2.inputs["Fac"])
    mul = n.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
    l.new(r1.outputs[0], mul.inputs[6]); l.new(r2.outputs[0], mul.inputs[7])
    br = n.new("ShaderNodeTexBrick"); br.inputs["Scale"].default_value = 0.42; br.inputs["Mortar Size"].default_value = 0.006
    br.offset = 0.5; br.inputs["Color1"].default_value = (1, 1, 1, 1); br.inputs["Color2"].default_value = (0.92, 0.92, 0.92, 1)
    br.inputs["Mortar"].default_value = (0.35, 0.35, 0.35, 1)
    swz = n.new("ShaderNodeMapping"); swz.inputs["Rotation"].default_value = (math.radians(90), 0, 0)
    l.new(geo.outputs["Position"], swz.inputs["Vector"]); l.new(swz.outputs[0], br.inputs["Vector"])
    mul2 = n.new("ShaderNodeMix"); mul2.data_type = "RGBA"; mul2.blend_type = "MULTIPLY"; mul2.inputs["Factor"].default_value = 1.0
    l.new(mul.outputs[2], mul2.inputs[6]); l.new(br.outputs["Color"], mul2.inputs[7])
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    wet = n.new("ShaderNodeMapRange"); wet.inputs["From Min"].default_value = 1.3; wet.inputs["From Max"].default_value = 0.05
    l.new(sep.outputs["Z"], wet.inputs["Value"])
    dark = n.new("ShaderNodeMix"); dark.data_type = "RGBA"; dark.blend_type = "MULTIPLY"
    dark.inputs[7].default_value = (0.45, 0.45, 0.47, 1)
    l.new(wet.outputs[0], dark.inputs["Factor"]); l.new(mul2.outputs[2], dark.inputs[6])
    l.new(dark.outputs[2], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.86; rr.inputs["To Max"].default_value = 0.3
    l.new(wet.outputs[0], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    bump = n.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.35; bump.inputs["Distance"].default_value = 0.02
    n3 = n.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 38; n3.inputs["Detail"].default_value = 6
    l.new(geo.outputs["Position"], n3.inputs["Vector"]); l.new(n3.outputs["Fac"], bump.inputs["Height"])
    l.new(bump.outputs[0], b.inputs["Normal"])
    return m


def asphalt():
    """Wet tarmac: a dull sheen, with standing water in broad shallow puddles that mirror the lamps."""
    m = bpy.data.materials.new("asphalt"); n, l = nodes(m)
    b = n["Principled BSDF"]
    geo = n.new("ShaderNodeNewGeometry")
    pn = n.new("ShaderNodeTexNoise"); pn.inputs["Scale"].default_value = 0.5; pn.inputs["Detail"].default_value = 5; pn.inputs["Roughness"].default_value = 0.55
    l.new(geo.outputs["Position"], pn.inputs["Vector"])
    pr = n.new("ShaderNodeMapRange"); pr.inputs["From Min"].default_value = 0.44; pr.inputs["From Max"].default_value = 0.52
    l.new(pn.outputs["Fac"], pr.inputs["Value"])
    sep = n.new("ShaderNodeSeparateXYZ"); l.new(geo.outputs["Position"], sep.inputs[0])
    ab = n.new("ShaderNodeMath"); ab.operation = "ABSOLUTE"; l.new(sep.outputs["X"], ab.inputs[0])
    gu = n.new("ShaderNodeMapRange"); gu.inputs["From Min"].default_value = 0.5; gu.inputs["From Max"].default_value = 0.2
    l.new(ab.outputs[0], gu.inputs["Value"])
    mx = n.new("ShaderNodeMath"); mx.operation = "MAXIMUM"; l.new(pr.outputs[0], mx.inputs[0]); l.new(gu.outputs[0], mx.inputs[1])
    fine = n.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 60; fine.inputs["Detail"].default_value = 8
    l.new(geo.outputs["Position"], fine.inputs["Vector"])
    cr = n.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].color = (0.012, 0.012, 0.014, 1); cr.color_ramp.elements[1].color = (0.066, 0.068, 0.072, 1)
    l.new(fine.outputs["Fac"], cr.inputs["Fac"])
    wetc = n.new("ShaderNodeMix"); wetc.data_type = "RGBA"; wetc.inputs[7].default_value = (0.006, 0.006, 0.008, 1)
    l.new(mx.outputs[0], wetc.inputs["Factor"]); l.new(cr.outputs[0], wetc.inputs[6]); l.new(wetc.outputs[2], b.inputs["Base Color"])
    ro = n.new("ShaderNodeMapRange"); ro.inputs["To Min"].default_value = 0.4; ro.inputs["To Max"].default_value = 0.03
    l.new(mx.outputs[0], ro.inputs["Value"]); l.new(ro.outputs[0], b.inputs["Roughness"])
    inv = n.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0; l.new(mx.outputs[0], inv.inputs[1])
    bs = n.new("ShaderNodeMath"); bs.operation = "MULTIPLY"; bs.inputs[1].default_value = 0.5; l.new(inv.outputs[0], bs.inputs[0])
    bump = n.new("ShaderNodeBump"); bump.inputs["Distance"].default_value = 0.01
    l.new(bs.outputs[0], bump.inputs["Strength"]); l.new(fine.outputs["Fac"], bump.inputs["Height"]); l.new(bump.outputs[0], b.inputs["Normal"])
    return m


def worn_steel(nm, rgb, rough=0.45):
    """Oxidised plate: metal whose roughness and tone wander, with faint vertical run-off."""
    m = bpy.data.materials.new(nm); n, l = nodes(m); b = n["Principled BSDF"]
    b.inputs["Metallic"].default_value = 1.0
    geo = n.new("ShaderNodeNewGeometry")
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (7.0, 7.0, 0.8)
    l.new(geo.outputs["Position"], mp.inputs["Vector"])
    nz = n.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 2.2; nz.inputs["Detail"].default_value = 8; nz.inputs["Roughness"].default_value = 0.65
    l.new(mp.outputs[0], nz.inputs["Vector"])
    cr = n.new("ShaderNodeValToRGB"); cr.color_ramp.elements[0].position = 0.32; cr.color_ramp.elements[1].position = 0.74
    cr.color_ramp.elements[0].color = (rgb[0] * 0.42, rgb[1] * 0.42, rgb[2] * 0.44, 1); cr.color_ramp.elements[1].color = (*rgb, 1)
    l.new(nz.outputs["Fac"], cr.inputs["Fac"]); l.new(cr.outputs[0], b.inputs["Base Color"])
    rr = n.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = rough + 0.28; rr.inputs["To Max"].default_value = rough - 0.12
    l.new(nz.outputs["Fac"], rr.inputs["Value"]); l.new(rr.outputs[0], b.inputs["Roughness"])
    n3 = n.new("ShaderNodeTexNoise"); n3.inputs["Scale"].default_value = 55; n3.inputs["Detail"].default_value = 5
    l.new(geo.outputs["Position"], n3.inputs["Vector"])
    bp = n.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = 0.12; bp.inputs["Distance"].default_value = 0.004
    l.new(n3.outputs["Fac"], bp.inputs["Height"]); l.new(bp.outputs[0], b.inputs["Normal"])
    return m


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
