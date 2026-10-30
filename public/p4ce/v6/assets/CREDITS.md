# Asset credits (PR6 v6 · The Index)

## Photography

All photographs are from Unsplash and used under the Unsplash License (https://unsplash.com/license): free for commercial and non-commercial use, no permission needed. Credit is given as a courtesy. Every photo was re-graded for PR6 (luminance mapped onto the Ink → Steel Blue → Mist → Chalk palette, resized, saved as WebP). No kit concept art is shipped.

| File | Used for | Source | Photographer | Licence |
|---|---|---|---|---|
| photos/hero-sprint.webp | Index hero, behind the frosted glass (cropped to the runner; no visible logos or text) | https://unsplash.com/photos/two-athletes-running-on-a-track-with-motion-blur-R9hR2inD8YA | Noah Katz (@nktz_10) | Unsplash License |
| photos/sprint.webp | Collection headers (03 Force, 04 Endure) | https://unsplash.com/photos/pFYI404z_a4 | R_ INVSCIMENTO (@r_inascimento) | Unsplash License |
| photos/field.webp | Field Club band on the Index; collection headers (01, 05, 07, 09); Field Notes | https://unsplash.com/photos/person-standing-on-misty-ground-arOyDPUAJzc | Jakub Kriz (@jakubkriz) | Unsplash License |
| photos/fog.webp | Collection headers (02, 06, 08); Member Liaison | https://unsplash.com/photos/silhouette-of-man-during-foggy-day-nyKJlVwKTAU | Patrick Hendry (@worldsbetweenlines) | Unsplash License |
| photos/runner.webp | Field Club header | https://unsplash.com/photos/Kojhfhrld90 | Mathias Reding (@matreding) | Unsplash License |

The earlier hero (photos/hero-cyclist.webp, Ollie Danvers) was removed because the jersey carried third-party sponsor logos.

## The gate: Object 0047 (`object/`)

| File | Used for | Source | Author | Licence |
|---|---|---|---|---|
| object/studio.hdr | Reflections in the glass block (carried over from v5 unchanged) | Studio Small 03, https://polyhaven.com/a/studio_small_03 (downsampled, darkened, blurred) | Greg Zaal, Poly Haven | CC0 |

## Product renders (`renders/`)

Original renders made for PR6 in Blender (Cycles) by the parallel render job; scripts in `../blender/` (build_packs.py, labels.py, finalize.py). One set per pack type (tin, pouch, box, dropper, jar): a transparent hero still, a mist-sweep still and a 24-frame turntable, listed with cache-busting `?v=` urls in `renders/manifest.json`, which `js/renders.js` reads at runtime. If an image fails to load, `js/renders.js` draws an SVG placeholder of that pack type instead (also original work).

## Type

Inter Tight, Inter and JetBrains Mono, from Google Fonts (SIL Open Font License 1.1).
