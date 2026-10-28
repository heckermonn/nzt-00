# P4CE v4 · 08 RENEW · Blender renders

Every model, material, label and light here is built by Python scripts. There are no hand-made .blend files.
The scripts run on Blender 5.2 as a Python module (`bpy`), and Cycles renders on the CPU with the OpenImageDenoise denoiser.

```
PY=/tmp/claude-0/bpyenv/bin/python      # python with bpy 5.2.x + pillow
cd p4ce/v4/blender
```

If bpy is missing, reinstall it with `cd /tmp/claude-0 && VIRTUAL_ENV=/tmp/claude-0/bpyenv uv pip install bpy==5.2.3 pillow`.

## Files

| file | what it does |
| --- | --- |
| `labels.py` | Draws the label artwork with PIL into `tex/`. Each texture is an ink mask (alpha = ink), so one mask can serve as a print, a frost etch or a deboss. |
| `common.py` | The shared studio. It has the lathe and fillet profile builder (with label UVs), the materials (etched glass, clear glass, liquid, bead-blasted aluminium, brushed steel, soft-touch rubber, porcelain, clay), the softbox rig with black flags and a glass backlight, the HDRI world, the shadow catcher and the camera. |
| `build_dropper.py` | 08-1 and 08-2: a 30 ml tinted-glass dropper (pin #1): 3 mm wall, 7.5 mm refracting base, serum with a meniscus and the pipette standing in it, a micro-knurled bead-blasted aluminium collar and a black soft-touch bulb. Glass colour is an absorption volume: 08-1 is amber-olive, 08-2 is sage; add `-smoke`, `-sage`, `-olive` or `-flint` to the variant for another colourway. `lying=True` levels the liquid in world space after the pack is turned. |
| `build_jar.py` | 08-3: a 50 ml heavy satin-frosted glass jar (6 mm wall, 10 mm base, polished inner wall visible above the cream) and a brushed-steel lid with the letterspaced P4CE debossed and ring text. It is glass, not porcelain. Lying uses a turned label (`v2_08-3_lying.png`) so the type reads level. |
| `build_bottle.py` | 08-4: bead-blasted anodised aluminium canister (pin #28). 08-5: soft-touch slate. 08-6: smoked glass with capsules inside and a matte silver wrap label (pin #13). All three share a low (21 mm) brushed-steel cap with 0.3 mm bevels, one machined groove and no knurl. |
| `scenes.py` | Composed shots: `08-group`, `08-stack` (filled olive, sage and smoke droppers in a floating diagonal stack, after pins #13 and #38; published as `08-group_stack-hero.webp`), `sculpt-capsule`, `sculpt-halo`, `sculpt-halo-motion` and `sculpt-emboss` (a clay tile with an embossed capsule and raised type, after pin #71). |
| `render.py` | Renders one image or turntable to PNG in the scratch folder. |
| `post.py` | Builds the fog backdrop composite, converts to WebP and writes `manifest.json`. |
| `batch.py` | Runs a job end to end: render, then WebP into `../assets/renders/`, then the manifest. |
| `fonts/` | Geist and Geist Mono (OFL, from the `geist` npm package), and Archivo Expanded for the wordmark (OFL, fonts.gstatic.com). |
| `hdri/` | `studio_small_09_2k.hdr` from Poly Haven (CC0). It is used desaturated, for reflections only. |

## Re-render

```
$PY labels.py                                   # regenerate label textures (after copy changes)

# hero stills: 1600x2000 transparent + fog composite
$PY batch.py still dropper 08-1                 # also 08-2
$PY batch.py still jar 08-3
$PY batch.py still bottle 08-4                  # also 08-5, 08-6

# turntables: 48 frames, 900x1125, transparent WebP, kept under 4 MB
$PY batch.py turntable dropper 08-1 --samples 16

# composed scenes
$PY batch.py scene 08-group 08-group --res 2400x1350
$PY batch.py scene sculpt-capsule sculpt-capsule
$PY batch.py scene sculpt-halo sculpt-halo
$PY batch.py scene sculpt-halo-motion sculpt-halo-motion
$PY batch.py scene sculpt-emboss sculpt-emboss
$PY batch.py scene 08-stack 08-stack

# tinted-glass colourways (stills), written as 08-2_smoke-hero.webp etc.
$PY batch.py still dropper 08-2-smoke

# extra views
$PY batch.py lying dropper 08-1                 # stills/08-1_lying.webp, 2000x1000, cap right, no floor (+ _lying-fog)
$PY batch.py top jar 08-3                       # stills/08-3_top-hero.webp, three-quarter top-down
$PY batch.py macro bottle 08-5 --kind hero --name macro-cap --res 4000x5000 --crop 0.20,0.60,0.80,0.95 --fstop 4
$PY batch.py macro dropper 08-2 --kind lying --name macro-label --res 3200x1600 --crop 0.10,0.20,0.66,0.80 --fstop 2.8

$PY batch.py manifest                           # rescan assets/renders
```

For quick look-dev, call `render.py` directly at low samples:

```
$PY render.py dropper 08-1 hero --samples 24 --res 640x800 --out /tmp/claude-0/p4ce-render/t.png
$PY render.py jar 08-3 hero --samples 24 --res 1600x2000 --crop 0.25,0.55,0.75,0.85 --out /tmp/x.png   # detail crop
```

A `hero` render writes a transparent PNG and also `*_fog.png`, which is the same pixels over the fog backdrop.
Turntable PNG frames are cached in `/tmp/claude-0/p4ce-render/final/tt_<id>/`. Re-running a turntable resumes from the last frame, so delete that folder to force a full re-render.

## Look notes

- **Glass.** The outer surface is satin (lightly etched rough transmission with noise-varied roughness and micro bump; the jar is frostier). The inner surface is polished clear glass. The liquid overlaps the glass by 0.12 mm, so the interface refracts correctly, and its meniscus rises about 0.9 mm at the wall. Caustics are off. Shadow rays pass through glass tinted, so the bottles cast light shadows rather than black ones.
- **Transparent background.** Film is set to Transparent and Transparent Glass is on, but the roughness threshold is 0.05. As a result, frosted glass keeps its frost, and only clear glass would go see-through. Light that refracts through the frost sees a fog-grey world (#9aa4ad), so the glass reads correctly when it is composited over the site's fog. Contact shadows sit in the alpha channel (shadow catcher).
- **Lighting.** The rig has a big key softbox camera-left, a large top-rear scrim (it makes the soft shadow that falls toward the camera), two strip rims, a weak fill and four black flags (reflection only) that give glass and metal their dark edge lines. A feathered diffuser behind the product, visible only through glass, makes the frost glow from inside. The Poly Haven studio HDRI is desaturated and used at low strength for reflections.
- **Color.** AgX, Medium High Contrast, exposure -0.35. The fog backdrop is graded in sRGB in `post.py`, from fog #c9d0d6 to slate #6e7a84, so it matches the site's CSS exactly.
- **Labels (v2, pin #13).** A left-aligned grid that runs up the pack: the letterspaced P4CE (Archivo Expanded with a Geist Mono 4 as the coded detail, no disc) and the code top right, a hairline, a large Geist Light product name, "Collection 08 — Renew", bracketed tags (`[SERUM] [30 ML]`) and `LOT 0047-A · SAMPLE`. Droppers print white on tinted glass; 08-6 is a matte silver wrap label. No claims.
- **Lighting (v2).** A slightly warm key, a large top-rear strip, a black negative-fill flag camera-right (reflection only, so the catcher stays clean) and shadowless rims.
- **Manifest.** Each asset carries `v` (content hash; stills also get `url` = `path?v=…`), `view` (upright, stack, lying, top, macro-cap, macro-label) and `material`. The meteor was dropped in v2.
