# PR6 v7 · "The Device" · build brief (Oct 30 2026)

v7 is a new version next to v6 (`../v6/`, live at /nzt-00/p4ce/v6/). Do not edit v6 or v5; copy what you reuse into `public/p4ce/v7/`.
Read `../v6/BRIEF.md` first: every owner decision, brand rule, page and section name there still holds. This brief only says what changes.

Directions page lu picked from (direction **B, The Device**): https://claude.ai/artifact/3EpBUfqBmy6C6x1WiaqN7k

## What the owner asked for
1. "Some form of the Atlas" back (the 3D world from v3/v5: `../v5/js/atlas/world.js`, `stations.js`, `arm.js`, `gfx.js`).
2. Collection and product pages like **slide 4** of the brand kit. Look at `ref/kit-slide4.png` and `ref/owner-product-page.jpg`.
   **The owner's latest words, about `ref/owner-product-page.jpg`: "When I click on the product can we set up the page to be as close to this."** The product page must be a near copy of that image (with the real product on the disc, real data in the fields).
3. He loves **rounded corners, Apple style**.
4. lu: much more animation across the whole site.

## The idea
The whole store lives on **one thick, rounded, frosted-glass slab** (the slide-4 panel) floating in front of the Atlas. The Atlas is always alive behind it, softly out of focus through the glass. Changing collection makes the camera glide to that collection's station behind the slab, so navigation is felt as travel. One object, one world, no page loads.

### The slab (match the reference closely)
- Outer stage: mist/steel-blue grey (`#AEB9C0`–`#CAD5DA`), the Atlas rendered in that palette (re-light v5's world: misty blue-grey, soft overcast, no warm sand; keep the nine stations in `LAYOUT` but make them simple soft clay/frosted forms on low plinths, and use matte white clay pills/spheres like the kit as a recurring object in the world).
- The slab: a light frosted pane (`backdrop-filter: blur` over the canvas, plus a faint chalk tint), ~28px corner radius on desktop (scale down on phone), a bright 1–2px inner bevel highlight on the top/left edge and a darker one bottom/right, a soft wide drop shadow under it. It reads as a thick piece of glass, not a card. Optional second, larger, flatter backing plate behind it as in the reference.
- Top-left inside the slab: `PR6` wordmark, orange `/`, then a mono section label (`DAILY PRACTICE`, or the current collection/section).
- Fields: small mono caps label (`COLLECTION`, `FORMAT`, `APPROACH`) above a soft debossed rounded field (inset shadow, slightly darker than the glass) holding mono value text.
- Object: sits on a **debossed circular disc** (inset, darker mist, soft inner shadow) on the right.
- Primary action: **black pill** (Ink, fully rounded ends) with white mono caps text and an orange `→`.
- Footer line bottom-left: tiny mono `PRODUCT CONCEPT` style caption with a hairline after it.

### Screens on the slab
1. **Index** (home): v6's numbered mono index lives on as one screen of the slab (scrolls inside the slab). Hovering a row shows that product on the disc.
2. **Collection** (`#/c/04`): slide-4 layout. Left fields: COLLECTION `04`, name, descriptor. Right: the disc holds the current product; swipe/drag/arrow keys/wheel cycle through the collection's products like an Apple picker (the product slides and turns from disc to disc, the fields roll to the new values). Small row of dots or numbered ticks shows position. Pill: `VIEW DOSSIER →`. A row of the 9 collections (mono `01`…`09` tabs) to travel; choosing one moves the Atlas camera.
3. **Product** (`#/p/04-1`, The Dossier): as close as possible to `ref/owner-product-page.jpg`. Left: `COLLECTION 04`, `FORMAT <format>`, `APPROACH <one word, e.g. CONSISTENCY/INTENT/PRACTICE>`. Right: the real pack render turning on the disc (turntable frames from the manifest, drag to turn, slow idle turn). Pill: `ADD TO PROTOCOL →` with CA$ price nearby. Everything else from the v6 Dossier (serving, ingredients table, directions, cautions, testing, one-off vs subscribe, related) goes below the fold inside the slab or in a second panel that slides up, so the first view stays as clean as the reference.
4. **Your Protocol**, **Field Club** (`#/club`, reviews and notices), member pages (`#/m/...`): same slab language (fields, discs, pills). Protocol can be a smaller slab that slides out from the main one.

### Motion (lu wants a lot, but every move must feel physical and calm, Apple-like)
- Bevel highlight follows the pointer (and device tilt on phone, with a permission-free fallback); slab tilts a few degrees with spring easing.
- Spring physics for slab moves, picker swipes and pills (overshoot slightly, settle).
- Camera glide across the Atlas between collections, eased, ~1.2–1.8s; the slab stays put while the world moves behind it.
- Screen changes: content morphs (fields roll character by character like a mono readout, numbers roll, the disc keeps the object and swaps it with a turn), never a page wipe or a slideshow slide.
- Add to Protocol: the pack lifts off the disc and arcs into the `Protocol (n)` pill, which bumps; count rolls.
- Staggered spring entry of list rows and fields.
- Scroll inside the product screen turns the pack (scroll-driven turntable) before revealing detail.
- Drag outside the slab to look around the Atlas; a small "hide panel" control lets you roam (click a station to open its collection); the slab returns with a spring.
- Respect `prefers-reduced-motion` and `?rm` (cross-fades only).

## Reuse
- Gate: reuse v6's gate system (`../v6/js/gates/`, `main.js` entry pattern; code `0047RSRV`, `?key=0047RSRV`, `?gate`, `#/exit`). Opening the gate lands on the slab over the Atlas.
- Catalogue, CAD prices, content, protocol logic from `../v6/js/` (catalog.js, content.js, protocol.js, util.js). Use localStorage keys `pr6.v7.member`, `pr6.v7.protocol`.
- Renders: use v6's real renders by relative path (`../v6/assets/renders/manifest.json` and files, via a copied/adapted `renders.js`). Do not copy the image files.
- Atlas: adapt v5's world (three@0.169.0 via importmap as in v5/v6). Keep it light: cap DPR, pause rendering when hidden, fall back to a static misty gradient with `?nogl` or no WebGL.
- Fonts: Inter Tight, Inter, JetBrains Mono (as v6).

## Musts
- Works and looks right at 1440×900 and 390×844 (phone: the slab becomes the full screen with rounded inset margins; the Atlas peeks around it; picker is a horizontal swipe).
- Verify with Playwright (Chromium preinstalled, `require('playwright')`; serve `python3 -m http.server` from `/home/user/nzt-00/public`; use `?cap=` or software GL as v6 did): gate → `0047RSRV` → Index → collection 04 → swipe → product → add → Protocol → Field Club, both widths, no console errors. Screenshot the product page and compare it side by side with `ref/owner-product-page.jpg`.
- Test hook `window.PR6V7.state()`.
- Add v7 to `public/p4ce/index.html` as "PR6 v7 · The Device".
- No effect claims, no syringe imagery, no invented studies. British/Canadian spelling. Section names exactly as in v6.
- Don't commit; the lead will commit.
