# P4CE v5 · the gate · Blender renders

The decoy gate is a steel door at night, set in a recessed cast-concrete doorway. A single cool downlight hangs in the niche soffit, the pavement is wet, and there is a little haze. The only mark on the street is a small engraved stainless plate reading "4" above the door. The letterbox slot sits at eye height and has a brushed-steel plate that slides into a pocket in the door. On entry, the door swings inward. The camera then dollies through the doorway into a warm off-white light, and that light is the Atlas sky.

Everything is built by Python scripts, and there is no hand-made .blend file. The scripts run on Blender 5.2 as a Python module, with Cycles on the CPU, OpenImageDenoise and AgX (Medium High Contrast). The render setup, node helpers, lights and camera come from `../../v4/blender/common.py`.

```
PY=/tmp/claude-0/bpyenv/bin/python      # python with bpy 5.2.x + pillow + numpy
cd p4ce/v5/blender
```

## Files

| file | what it does |
| --- | --- |
| `build_gate.py` | Builds the scene and poses it. It covers the facade and niche (boolean-cut cast concrete), the basalt threshold, the steel-lined opening with door stops, and the brushed-stainless leaf. The leaf has a slot bezel, a sliding plate and a dark hood behind the slot. It also builds the engraved number plate, the downlight, the wet pavement and the street haze. Beyond the door it builds the stone passage, the fog slabs, the portal light and the interior key. `pose(h, 'closed' \| 'slot' \| 'open', k, n)` sets one state. |
| `render_gate.py` | `render` writes 16-bit PNGs to `/tmp/claude-0/p4ce-gate/<orient>/`. `publish` post-processes them (diffusion and vignette), writes WebP q90 into `../assets/gate/`, measures the slot rect and the light colour, and writes `manifest.json`. `preview` draws a contact sheet. `solve-light` finds the linear RGB that AgX displays as a given hex. |
| `eyes.py` | Builds `../assets/gate/eyes.webp` from the Unsplash portrait credited in `../assets/CREDITS.md`. It crops a band at the slot's 4.8:1 aspect, levels the head, grades it cool and dark, and fades the edges to black. |
| `polyhaven/` | CC0 maps from Poly Haven: concrete_wall_008, brushed_concrete and the modern_buildings_night HDRI. `build_gate.py` downloads them on first run (the folder is git-ignored). |
| `tex/plate_4.png` | The engraving mask for the number plate (Geist Light, from `../../v4/blender/fonts`). It is generated if missing. |

## Re-render

```
$PY render_gate.py render land all            # closed + slot + open/f_000..f_027, 1600x1067
$PY render_gate.py render port all            # the same for the phone camera, 900x1600
$PY eyes.py                                   # eyes.webp (only when the crop or grade changes)
$PY render_gate.py publish                    # WebP + manifest.json into ../assets/gate/
```

Options: `--samples N` (stills, default 40), `--seq-samples N` (open frames, default 16), `--scale P` (one fixed resolution %, for look-dev), `--frames a:b`, `--step s`, `--n N` (frame count, default 28) and `--force`. Without `--scale`, open frames follow a resolution schedule: 100% for the door swing (f_001–f_007), 70% for the motion-blurred dolly (f_008–f_019) and 50% for the near-uniform tail. `publish` upsamples them to full size with Lanczos. `f_000` is not rendered: `publish` copies `closed.png`, which has the same pose and settings. A render skips PNGs that already exist, so an interrupted run resumes. Delete the scratch folder, or pass `--force`, to re-render.

For quick look-dev, render small and look at the sheet:

```
$PY render_gate.py render land open --step 3 --samples 16 --scale 40 --out /tmp/claude-0/gate/t
$PY render_gate.py preview land --out /tmp/claude-0/gate/t
```

## How it works

- **The light beyond.** The light is a stack of homogeneous absorbing and emitting fog slabs in the passage. Density rises with depth: 0.02/m near the door and 3.5/m from 4.9 m in. Each slab's emission is its density times `LIGHT_LIN`, so radiance converges to exactly `LIGHT_LIN` wherever the medium is deep. `LIGHT_LIN` = (2.918, 2.600, 2.016) is what AgX MHC at exposure 0 displays as #EEEBE5; re-derive it with `solve-light` if the look or exposure changes. Homogeneous slabs are integrated analytically, so they cost little and add no noise. The near metres stay clear, so the passage walls (warm grey honed stone with joints every 0.9 m) read as a darker tunnel opening into the glow.
- **The spill.** A camera-invisible area light (the portal) sits just behind the door. While the door is closed, it leaks through the 8 mm gap under the leaf. Once the door opens, it pours warm light onto the threshold and the wet pavement and lights up the street haze. The door stops block side and top leaks.
- **Steel.** The door is satin brushed stainless with a horizontal grain and anisotropy along it, so the overhead lamp draws a vertical sheen down the leaf. The world HDRI is strong only for glossy rays: the street behind the camera shows up in the steel and the water without lifting the diffuse ambient. The bezel and plate are a brighter #4 finish. The plate is engraved with a bead-blasted floor.
- **Wet ground.** The pavement is Poly Haven brushed_concrete, darkened by water. A clear coat (IOR 1.33) pools into puddles via low-frequency noise plus the texture's low spots, and a faint ripple sits in the coat normal.
- **Motion.** The door and camera are keyframed for the whole move. Motion blur uses a 0.3 shutter and is off on f_000, so it matches `closed.webp`. The dolly follows monotone cubic keys, so it never backs up. The seed is fixed and not animated, so the noise does not shimmer.
- **Finish (publish).** Diffusion redistributes light above 0.3 linear into a wide halo, like a Pro-Mist filter: blacks stay black and a flat field is unchanged. A lens vignette fades out before the camera reaches the doorway, which keeps the last frame uniform.
- **Slot rect.** The rect is measured from the renders, not projected. It starts as the region where `closed` and `slot` differ (the plate) and is then grown to the full dark opening.
- **WebP.** Published at q90. At q82, WebP smeared the brushed-steel grain in the dark frames. At q90 the whole set is about 1.3 MB.
- **Render times (Oct 2026, 4 shared CPU cores).** Stills take about 5 min each at 40 spp. Door-swing frames take about 2.3 min, dolly frames 1.3–2.2 min and tail frames 0.5–0.9 min. Both orientations took 1 h 41 min end to end.
