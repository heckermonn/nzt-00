# P4CE v4: luxury look test for The Reserve (shared brief)

## Why this round exists
The owner wants The Reserve to *sell* an elevated, premium, luxury experience. He added new Pinterest references, and lu approved this plan on 28 Oct 2026:
- commit to one world and re-tone it;
- replace procedural in-browser objects with **path-traced Blender renders** (lu: "create/modify blender models and make sure they look really luxurious/expensive");
- use **stock photography** (Unsplash and Pexels, both free for commercial use);
- build **one art-directed look test**, not the whole site.

Read for context:
- /home/user/nzt-00/p4ce/v2/BRIEF.md (owner's vision, copy rules)
- /home/user/nzt-00/p4ce/v3/BRIEF.md (what v3 tried)
- /home/user/nzt-00/.claude/skills/impeccable/reference/craft-floor.md

The current best v3 direction is /home/user/nzt-00/p4ce/v3/procession.html (scroll journey plus frost transition). v4 keeps that skeleton and re-tones it.

## The new references (owner's pins, described)
- **Tone.** Misty, cool blue-grey gradients (fog, slate, pale steel blue), soft and quiet. A "Clarity in *Complexity*" headline in a sans with a serif-italic word, over a dark teal fog gradient.
- **Photography behind frost.** A man's face half behind frosted glass ("EMOTIONAL INTELLIGENCE", wide-tracked caps). A hand blurred behind frosted glass with a tiny HUD readout. Eye macros with fine data labels. Skin macros.
- **Sculptural objects.**
  - A soft matte white capsule/pill sculpture in a circular recess (clay-render look).
  - "Halo." A blurred metallic ring in motion.
  - A soft translucent blob with an inner light (diamond jewellery site).
  - Stacked jade-green stones.
  - Glowing translucent flowers on black ("Liquid Assets. Luminous Returns.").
  - A porous meteor rock with deadpan mono copy: "HERE IS A METEOR FLOATING IN SPACE. … AND SOMEWHERE THERE THERE'S ALSO YOU PAYING SOME BILLS AND GETTING SOME STRESS."
- **Product as ritual.** Mono product cards "DAWN AM-01 [MORNING] 08:02 AM … RHODIOLA / GINSENG / SCHISANDRA … [+] ADD TO CART" and "FLOW MD-02 [MID-DAY]", each with a frosted-glass dropper bottle.
- **Diagrams.** saelo: thin leader-line diagrams over a soft blue skin texture, with small labels and one focal ring. Avoid its effect claims.
- **Editorial.** "ANTI AGING" → arrow → "SLOW AGING" over a portrait and a gradient.
- **Data and machinery.** A particle-cloud data viz with HUD frames, a mechanical watch movement at the centre of a timeline, a robotic arm in a white room.

**Summary of the look:** restraint, softness, depth (blur to focus), real skin and light, matte and frosted materials, tiny mono labels, one serif-italic accent, slow motion. Acid #CCFF00 survives only as a pinpoint (one dot or one glint), or is dropped if it fights the palette.

## Folder layout (all under /home/user/nzt-00/p4ce/v4/)
- `blender/`: build and render scripts (Python, run with the bpy module), plus `README.md` with how to re-render.
- `assets/renders/`: path-traced outputs (WebP/AVIF stills and turntable frame sequences, plus a `manifest.json`).
- `assets/photos/`: chosen stock photos, resized and compressed (WebP/AVIF, ≤ 2400 px long edge, sensible quality).
- `assets/CREDITS.md`: one line per photo with source URL, photographer and licence (Unsplash License / Pexels License).
- `assets/hdri/`: Poly Haven HDRIs if used (CC0).
- `index.html` (+ optional `app.js` / `app.css`): the look test. A multi-file static site is fine this round, since it ships to GitHub Pages under public/p4ce/v4/. Keep relative paths.

## Tools in this container
- Blender as a Python module: `/tmp/claude-0/bpyenv/bin/python` (bpy 5.2.x). Use Cycles on CPU (4 cores, 15 GB RAM) with the OpenImageDenoise denoiser. Keep render budgets sane: test at low samples and size, final at about 128–256 samples with denoise.
- Old reference models from an earlier project are in /home/user/nzt-00/blender/ (`build.py`, `source/*.glb`). You may reuse or modify them; you don't have to.
- Network: images.unsplash.com, images.pexels.com, dl.polyhaven.org and api.polyhaven.com are reachable with curl. unsplash.com pages sit behind a JS bot check: use Playwright (`require('/opt/node-tools/node_modules/playwright')`, Chromium preinstalled) to search them, or use known photo IDs. CDNs for scripts are blocked here but allowed in production (see the v1 brief harness: /tmp/claude-0/p4ce-vendor/shot.mjs maps them locally).
- Screenshot harness: `node /tmp/claude-0/p4ce-vendor/shot.mjs <file> <out> [steps.json] [--mobile]` (also shotr.mjs for touch and typing).

## Copy rules (unchanged)
- Discreet and plain inside the Reserve.
- No effect or health claims anywhere. Category and product names don't establish effects. Diagrams describe what an ingredient *is* or how a product is *used*, never what it does to the body.
- No needles or injection imagery.
- Evidence uses placeholders only. Testing values are marked "sample".
- Photos must not imply results (no before/after).
