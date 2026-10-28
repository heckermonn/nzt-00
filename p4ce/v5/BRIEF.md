# P4CE v5, phase 1: the hinge proof (shared brief)

## Where we are (28 Oct 2026)
The owner (via lu) set the direction:
- the v3 Atlas becomes the front of the private site;
- a proper e-commerce store sits behind it: "super clean and high end", "sophisticated luxury, but still feel like an experience";
- lu: v4's path tracing "definitely helped", but "the section transitions feel a bit disjointed / not a clean transition";
- the owner: "the whole idea is to deceive the viewer". Guests see a decoy gate. Once you get through, "a really cool high end sophisticated website shows".

The approved plan is the Claude Doc "P4CE: Atlas front and luxury store plan". The parts that matter are restated here, so you do not need to open it.

Owner references (TikToks, downloaded to /mnt/project-files/tiktok-refs/<id>.mp4 with contact sheets <id>-sheet.jpg; LOOK at the sheets):
- ZSggY3oKd, EYEZY Shopify theme. Product page: big centred product, info on the left, buy on the right. A dark cinematic hero, then a white collection grid.
- ZSggYgk9h, skript.so 3D Shopify stores.
  - Ormaie: one bottle travels and tilts between sections on white.
  - Aesop: the camera glides along a warm product lineup.
- ZSggYcRGQ, wearebrand.io. The collection is a lineup on a seamless white sweep. The focused item is sharp and centred; the others ghost into fog. All one space.
- ZSgbF1Fd5, NURV (AI mockups). Frosted white bottle in rock, a big grotesk wordmark, spec lines, warm grey and sage light.

Owner's Pinterest digest: /home/user/nzt-00/p4ce/v4/PINS.md (files in /mnt/project-files/pinterest/).

## Why v4 felt disjointed (do not repeat this)
v4 used a frost veil at every chapter boundary. Behind it, the photo, the light and palette, and the layout all swapped at once. Nothing carried across, so it read as glued slides.

## The one transition rule
**One space, one camera, one product.**
- Every move between views is a single unbroken camera or object move of about 0.9–1.4 s.
- The product you chose stays on screen the whole way (a shared element).
- Nothing covers the screen: no wipes, no veils, no full-screen effects, no loading screens.
- Colour follows the camera: one palette, sand → stone → paper, interpolated and never snapped.
- Text never wipes. It fades out and in over about 250 ms while the object or camera carries the motion.
- Going back plays the same move in reverse.
- Reduced motion: each move becomes a short crossfade.

## What phase 1 must prove (one flow, end to end, desktop + phone)
1. **The gate (decoy front): The Door, rebuilt at v4 quality.**
   - Guests see only this. It must give nothing away: no product, no store, no "supplements". Make the `<title>` neutral.
   - The mechanic comes from /home/user/nzt-00/p4ce/v2/door.html (read it): a steel door at night; you knock, a slot opens, eyes look back, and the hidden key ritual appears.
   - Key ritual: an invitation code (demo `0047RSRV`, shown only as a tiny hint after the slot opens) or "Tap your key" (the NFC card opens a URL such as `?key=0047RSRV`; simulate it). There is also a quiet "Members" log-in (any email and password). Wrong code: the slot shuts. Deadpan, no error theatre.
   - Gate art is path-traced renders delivered to `assets/gate/` by a separate agent (spec below). Code against that spec. If the files are not there yet, use a plain dark placeholder and leave it obviously swappable.
   - On success, the door opens inward onto bright warm light. The camera goes through the doorway, and that light IS the Atlas's sky and haze: the Atlas resolves out of it. This is a camera move through a doorway, not a fade to white.
   - Remember entry in localStorage (`p4ce.v5.member` = '1'). Returning members land straight on the Atlas. `?gate` forces the gate; `#/exit` clears membership.
2. **The Atlas: the reveal, from v3.**
   - Sources: /tmp/claude-0/atlas/ (`world.js`, `arm.js`, `core.js` …; `build.py` assembles /home/user/nzt-00/p4ce/v3/atlas.html). Read v3/BRIEF.md.
   - Keep: the sand plane, nine stations, drag to look, click or hold to travel, the robotic arm, the index/list view.
   - Re-tone:
     - sand to a warm grey that sits close to the store's paper;
     - stations to carved pale stone plus brushed-steel plinths (NURV rock; pins #59 rock on a grid, #32 stacked jade stones).
   - Remove: all in-world shopping (dossier panels, add to cart) and the "accretion" full-screen effect.
   - At station 08 RENEW, the arm presents the lead product. Use the path-traced render (transparent turntable frames, see Assets) as a camera-facing textured plane or sprite, so it is the SAME image the store uses. One line reads "Enter 08 RENEW".
   - Other stations can travel and show their name. Their "Enter" goes to a calm collection page listing the products (no renders yet; a neutral silhouette or text-only rows are fine).
3. **Atlas → Collection 08 (the key move).**
   - Click "Enter 08 RENEW". The camera pushes in on the product in the arm while the world's colour drifts to paper and a seamless white sweep rises around it.
   - The held product lands in its slot in the lineup, and the other five products come out of the haze beside it.
   - The WebGL canvas may fade only as the paper colour takes over (colour drift, not a wipe).
   - Implementation is your call. Suggested: FLIP the product's screen rect from the arm sprite to the DOM lineup slot, while the canvas animates camera and tone.
4. **Collection 08 (wearebrand lineup).**
   - Six products stand on a seamless paper sweep. Hover, focus or swipe moves focus: the chosen product is sharp and slightly forward, and the rest soften into haze (blur, lower contrast, slight scale down).
   - Below it, a clean grid: name, format, quantity, price, quick add.
   - A horizontal swipe on phone.
5. **Collection → Product page (EYEZY / Ormaie).**
   - The chosen product glides from its lineup slot to the centre and grows. The others fall back into fog.
   - Details fade in on the left: name, code, format, quantity, key ingredient with concentration.
   - Buying fades in on the right: price, one-time / subscribe, frequency, Add to Protocol.
   - The product is draggable: scrub the 48 turntable frames, with inertia.
   - On scroll, the product tilts to show the detail stills (macro-cap, macro-label, top, lying), Ormaie-style, then the full sections:
     - Overview, Ingredients (with concentrations), Directions, Cautions;
     - Evidence: placeholders only;
     - Testing & Sourcing: values marked "sample".
   - Phone: product centred, details stacked below, slim sticky buy bar.
6. **Add to Protocol.**
   - A small copy of the product drops into the Protocol drawer (right side, from the top bar) and becomes a card.
   - Cards are ritual cards grouped by time of day, like pin #1 "DAWN AM-01 [MORNING] 08:02 … [+] ADD TO CART".
   - Lines are keyed by id + mode + frequency. Never merge one-time and subscription lines.
   - Keep quantity, remove, and the subtotal. Checkout button: "Checkout" → a quiet note that Shopify checkout arrives in phase 4.
   - localStorage `p4ce.v5.protocol`.
7. **Top bar on every member view (Press Edition-simple).**
   - The P4CE mark (to the Atlas), Formulary (the index of all nine), Search (can be a simple filter over the catalogue), Protocol (count), Member (a menu linking stub pages: Dispatches, Cabinet, Nominations, Member Record, Liaison, Your Key, Exit).
   - "Store" must be reachable from the Atlas in one click.

**Routes (hash, so back/forward and deep links work):**
- `#/` gate (or the Atlas if a member);
- `#/atlas`, `#/atlas/08`;
- `#/formulary`, `#/c/08`, `#/p/08-3`;
- the Protocol drawer as an overlay state.

Back from the product page reverses into the lineup. Back from the collection reverses into the Atlas station.

## Look (store)
- Warm paper white (around #EFEDE8 to #F4F2EE), near-black ink, hairline rules.
- Type: a quiet grotesk with ONE serif-italic accent word per view, tracked mono for codes and specs, and dot-matrix numerals at most once.
- Acid #CCFF00: one pinpoint at most, or none.
- Generous space, Aesop/Ormaie restraint. Product imagery does the talking.
- Use real path-traced renders only. No CSS-faked products.

## Assets you can use
- 08 RENEW renders: /home/user/nzt-00/p4ce/v4/assets/renders/.
  - Read `manifest.json` (50 assets; `v` hash → `?v=`).
  - Transparent RGBA stills: `stills/08-N_hero.webp`, `_lying`, `_top-hero`, `_macro-*-hero`, `08-group_stack-hero`.
  - `_fog` variants are on an opaque fog background.
  - Turntables: `turntable/08-N/f_000..f_047.webp`, RGBA 900×1125. Frame 0 is the label front-on; the frames rotate counter-clockwise seen from above.
  - Reference them by relative path `../v4/assets/renders/...`. That works in the repo and on Pages (public/p4ce/v4 sits beside public/p4ce/v5). Do not copy them.
- Product data and copy: /home/user/nzt-00/p4ce/v4/data.js (catalogue for all nine collections, from v2 reserve.html). Collection descriptors stay in the owner's wording.
- Stock photos: /home/user/nzt-00/p4ce/v4/assets/photos/ (credits in CREDITS.md). Use sparingly, for example one editorial band on the product page.
- Fonts: Google Fonts only.

## Gate art spec (produced by the gate-render agent into /home/user/nzt-00/p4ce/v5/assets/gate/)
- `manifest.json`:
  - for each orientation (`land` 1600×1067, `port` 900×1600): the file list;
  - the slot rectangle in normalised 0–1 image coords (for placing the eyes layer and the ritual UI);
  - `lightHex`: the colour of the light beyond the door in the final frame;
  - the frame count.
- `land/closed.webp`, `land/slot.webp` (slot open, dark behind, no eyes), `land/open/f_000..f_0NN.webp` (the door swings inward, then the camera dollies through; the last frame is almost entirely the soft warm light); the same set under `port/`.
- `eyes.webp`: eyes only, cropped to fit the slot (stock photo, credited in assets/CREDITS.md).

## Tech
- A multi-file static site in /home/user/nzt-00/p4ce/v5/: index.html, app.js (ES modules are fine), app.css, plus anything else needed.
- Pinned CDNs via importmap or script tags: three@0.169.0 (jsdelivr), gsap 3.12.5 (cdnjs), lenis@1.1.13 if used.
- The CDNs are blocked in this container. Screenshot through the local mapping harness: `/tmp/claude-0/p4ce-vendor/shot.mjs` (read it; it maps CDN URLs to local node_modules). Serve over http (`python3 -m http.server` from /home/user/nzt-00/p4ce/) so `../v4/` paths resolve.
- Craft floor: /home/user/nzt-00/.claude/skills/impeccable/reference/craft-floor.md.
- 60 fps target, DPR caps, pause when hidden, preload the next view's frames, lazy-load the rest.
- No WebGL: the Atlas falls back to an elegant still (or the index), and the store works fully.
- Keyboard reachable with visible focus. Phone 390×844 is first-class.
- Test hooks: `?nogl`, `?rm` (reduced motion), and `window.P4V5.state()`.

## Copy rules
- Gate: deadpan, minimal, gives nothing away.
- Inside: discreet, precise, plain.
- No effect or health claims anywhere. Category and product names don't establish effects.
- No needles or injection imagery.
- Evidence is "Evidence summary: to be written and referenced before launch" plus empty reference slots. Testing values are marked "sample". Do not invent studies or numbers.
- Do not commit, push or open PRs. The lead does that.
