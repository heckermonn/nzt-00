# Asset credits (v5)

## Photos

All photos are from Unsplash and used under the Unsplash License (https://unsplash.com/license): free for commercial and non-commercial use, no permission needed. Attribution is a courtesy.

| File | Used for | Source | Photographer | Licence |
|---|---|---|---|---|
| gate/eyes.webp | The gate: the eyes behind the slot (cropped to a 4.8:1 band, levelled, graded cool and dark, edges fall to black) | https://unsplash.com/photos/a-serious-man-stares-directly-at-the-camera-7mHRIPLCrcE | M_pxio (@m_pxio) | Unsplash License |

## The gate: Object 0047 (`object/`)

| File | Used for | Source | Author | Licence |
|---|---|---|---|---|
| object/studio.hdr (256 × 128 Radiance RGBE, 91 KB) | The soft reflections in the glass block: the umbrella and the overhead panel write the bevels | Studio Small 03, https://polyhaven.com/a/studio_small_03 (1k .hdr, box-downsampled; the white floor below the horizon darkened to 3% so the studio reads as a black room; lamps clamped at 400; then Gaussian-blurred (σ ≈ 5°) and darkened to 55% so no window bars or rigging show in the glass) | Greg Zaal, Poly Haven | CC0 |

Everything else in Object 0047 (the glass, the laser-etched 4, the two engravings, the light, the film grain, the contact shadow) is drawn in real time by `js/gates/object.js`.

## Textures and HDRIs (the Door, `?gate=door`)

From Poly Haven (https://polyhaven.com), CC0 (public domain); credit given as a courtesy. Used only as inputs to the path-traced gate renders in `gate/` (built by `../blender/build_gate.py`).

| Asset | Used for | Source | Licence |
|---|---|---|---|
| concrete_wall_008 (diffuse, roughness, displacement, 2k) | The cast-concrete facade and doorway niche | https://polyhaven.com/a/concrete_wall_008 | CC0 |
| brushed_concrete (diffuse, roughness, displacement, 2k) | The wet pavement | https://polyhaven.com/a/brushed_concrete | CC0 |
| modern_buildings_night (HDRI, 2k) | Night-street reflections in the steel and the wet ground | https://polyhaven.com/a/modern_buildings_night | CC0 |

Everything else in `gate/` (the door, steel, slot, light) is original path-traced work, not photography.
