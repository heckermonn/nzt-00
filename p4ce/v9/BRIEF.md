# PR6 v9 · "The Film" · build brief (Oct 30 2026)

v9 is a new version next to v6, v7 and v8. Don't edit them; copy into `public/p4ce/v9/` whatever you reuse. Read `../v8/BRIEF.md`, `../v7/BRIEF.md` and `../v6/BRIEF.md` for the owner decisions, catalogue, section names, gate and product-page reference (`../v7/ref/owner-product-page.jpg`). They all still hold except where this brief overrides them.

## Why v9
The owner says v8 still feels **too "AI"**. lu ran Impeccable Overdrive (skill at `/home/user/nzt-00/.claude/skills/impeccable/`; read `SKILL.md`, `reference/overdrive.md`, `reference/craft-floor.md`) and picked direction **Film: the Atlas as a real shoot**.

### What reads as AI in v8 (remove all of it)
- Glass and blur on every surface. In v9, glass appears **only** on the slide-4 product panel (and the Protocol drawer may share it). Everything else sits on plain flat surfaces.
- Tiny letter-spaced mono caps used as costume everywhere, plus eyebrow/kicker labels ("CHOOSE AN ENTRY TO OPEN ITS DOSSIER", "STATION 04 / 09", "THE ATLAS / 09 STATIONS"). Also section numbers as decoration and the fake coordinate HUD strip ("X +00.00 Z…"). Mono is for real data only: product codes, prices, amounts, the slide-4 field values. No eyebrows at all (Impeccable bans them).
- Grids of same-size rounded cards, chips and identical pills. Only one black pill per screen (the primary action).
- Inter / Inter Tight. Use true free clones of the kit's fonts:
  - Helvetica Neue → **FreeSans** (GNU FreeFont, a Nimbus Sans/Helvetica clone, GPL with font exception). It is at `/usr/share/fonts/truetype/freefont/FreeSans.ttf` and `FreeSansBold.ttf`.
  - Menlo → **DejaVu Sans Mono** (Menlo is derived from it). It is at `/usr/share/fonts/truetype/dejavu/`.
  - Subset to Latin, convert to woff2 (fonttools/brotli via pip if needed), self-host in `v9/fonts/`, and add their licence notes. The PR6 wordmark is FreeSans Bold with tight tracking.
- 3D that looks real-time. In v9 the world is **path-traced film frames**, not live WebGL.

## The idea
After the gate, the home **is a film**. It is one continuous path-traced camera move through a misty blue-grey studio holding the nine stations. Scrolling, swiping or dragging scrubs the film, and it eases to rest on a station. It should feel like a real product shoot you steer, not a 3D website. Over it sits only quiet type: the PR6 wordmark, a thin nav, and the collection name of the station you're resting on, large, set in FreeSans, with one line of descriptor. You enter by clicking the frame or a single `Enter` action. The image pushes in (scale plus slight blur, from the same frame) and becomes the collection page.

## Two parallel workstreams
### 1. The film (Blender, Cycles), agent "film"
- Use the Blender venv `/tmp/claude-0/bpyenv` (bpy 5.2, Cycles CPU, 4 cores). Reuse the pack models and labels from `../v6/blender/build_packs.py` and `labels.py` (tin, pouch, box with sachets, dropper, jar).
- **Set:** a seamless studio cyclorama in PR6 mist (Chalk `#F2F3EF` → Mist `#CAD5DA` → Steel Blue `#718B9A` tones), soft large area lights, gentle volumetric haze or depth falloff, and real contact shadows. The nine stations are spaced along one gentle curve. Each is a considered still life, not a template:
  - a low matte clay plinth with a debossed disc;
  - that collection's lead pack (format from the catalogue);
  - soft white matte clay pills/spheres, as in the kit's slide 4;
  - at a few stations, a thick frosted glass pane (real transmission and roughness) standing behind.
  
  Vary composition and heights between stations so it doesn't read as a repeated template. No text baked into the frames other than the pack labels (the site sets the type).
- **Camera:** a calm dolly. A short establishing move (high and wide, descending), then station 01 → 09, each station framed centred with breathing room. Use the same framing logic at every stop. Lens about 50–65mm equivalent, shallow-ish depth of field.
- **Framing for both screens:** render **square** frames and compose so the subject sits in the central ~56% width (the phone crop of a square at 390×844 cover) and the central ~62% height (the desktop crop at 16:10). Keep the horizon and type-safe areas clear: the lower third should be calm for the overlay type.
- **Frame budget:** 4 cores only, so plan for about 3 hours of rendering in total. Suggested: about 160 frames (intro ~20, plus ~16 between each pair of stations, with an exact frame on each station). Use 1280² masters at moderate samples plus the OpenImageDenoise denoiser. Render in the background in chunks, checking progress, and do a low-res test of the full path first (e.g. 320², 8 spp) to check the camera before the final render.
- **Output:** `public/p4ce/v9/assets/film/`
  - `d/NNN.webp` (1280², quality ~78) for desktop
  - `m/NNN.webp` (720², quality ~75) for phone
  - `poster.webp`
  - `manifest.json`:
    ```
    {count, size:{d,m}, stations:[{code:"01", frame:N}, …], intro:[0,N], pattern:"{tier}/{NNN}.webp"}
    ```
  
  Keep the desktop set ≤ 25 MB and the phone set ≤ 10 MB. Also write a matching render script in `v9/blender/film.py`.
- **Station stills for the collection pages:** also render each station at its rest frame as a higher-quality still (`assets/film/stations/NN.webp`, 1600², more samples).

### 2. The site, agent "site"
- Start from v8 (`../v8/`): gate, router, views, protocol, disc/turntable, catalogue, content, renders. Drop the live WebGL Atlas.
- **Home (`#/`):** a full-screen `<canvas>` (or `<img>` double buffer) that draws the film frame for the current scrub position. Crossfade between adjacent frames for sub-frame smoothness. The scrub has inertia and eases to rest on station frames. Input is wheel/scroll, drag, swipe, arrow keys and a row of nine small station marks; keep the marks unobtrusive, not dots-plus-pill. Preloading:
  1. the poster and the nine station frames first;
  2. then the frames near the current position;
  3. then the rest, by priority.
  
  Never block on the whole set. Show a frame immediately. Phone uses the `m` tier, desktop the `d` tier, with `object-fit: cover` maths.
- Overlay type at rest: the collection name very large (e.g. "Endure"), the descriptor in one line, and the product count and price range in mono as real data. While scrubbing, the type fades out and the next name resolves as you settle.
- Until the film agent's frames land, use a placeholder `manifest.json` with v6 renders on a mist gradient so the site can be built and tested. Read the real manifest at runtime.
- **Enter → collection (`#/c/04`):** push into the frame (scale ~1.15 + blur), crossfading into the collection page. The collection page is **not** a card grid. Build it as an editorial page in the spirit of the owner's references (liminalrep, abelfragrance, lelism, juliaplaza: lots of empty space, one image at a time):
  - the station still large on one side;
  - a plain list of the collection's products (code in mono, name in FreeSans, format, CA$ price);
  - hover/focus swaps the large image to that product's pack render.
  
  On phone, the still sits on top and the list below. It must be easy to read: real contrast, body text ≥ 16px on phone.
- **Product (`#/p/04-1`):** the slide-4 page, as close as possible to `../v7/ref/owner-product-page.jpg`. Reuse v8/v7's product view and turntable, but set it in the new fonts and strip extra labels. This is the one place the thick rounded frosted panel appears. The black `ADD TO PROTOCOL →` pill stays.
- Index, Protocol, Field Club, member pages and search: same de-AI rules. Flat surfaces, FreeSans hierarchy (size and weight steps instead of mono labels), mono only for data. Theme text selection, the caret, focus rings and scrollbars from the palette.
- **Motion:** one authored moment per screen. The film scrub is the hero. The push-in, the pack arcing into Protocol and the turntable stay. Remove scattered entrance animations. Support `?rm` (no scrub inertia, crossfades) and `?nofilm` (static stills).

## Musts
- Works and looks right at **390×844 (priority)**, 1440×900 and 1280×720. Verify with Playwright (Chromium preinstalled, `require('playwright')`; serve with `python3 -m http.server` from `/home/user/nzt-00/public`). Walk: gate (`0047RSRV`) → film → scrub to 04 → enter → collection → product → add → Protocol → Field Club, with no console errors. Look at the screenshots.
- Run `/home/user/nzt-00/.claude/skills/impeccable/scripts/impeccable detect --json public/p4ce/v9` at the end, and fix what it finds where it is right.
- Test hook `window.PR6V9.state()`; keys `pr6.v9.member`, `pr6.v9.protocol`. Renders come from `../v6/assets/renders/`.
- Add "PR6 v9 · The Film" to `public/p4ce/index.html`.
- No effect claims, no syringe imagery, no invented studies. British/Canadian spelling.
- Don't commit.
