# PR6 v8 · "Stations" (direction A) · build brief (Oct 30 2026)

v8 is a new version next to v6 and v7. Don't edit v5, v6 or v7: copy into `public/p4ce/v8/` whatever you reuse.
Read `../v7/BRIEF.md` and `../v6/BRIEF.md` first. Every owner decision, brand rule and section name in them still holds. Directions page: https://claude.ai/artifact/3EpBUfqBmy6C6x1WiaqN7k (this is direction **A, Stations**).

## Why v8 exists (lu's feedback on v7, Oct 30)
- "On mobile I can't really see anything Atlas-like from B's implementation." In v7 the Atlas hides behind the glass slab.
- "The collections are quite hard to read as is." The v7 collection picker (one product at a time, with faint neighbours) is unclear.
- lu wants direction A **with the product page looking like the reference slide**: `../v7/ref/owner-product-page.jpg`. The owner said: "When I click on the product can we set up the page to be as close to this." v7's product page already matches it closely (see `../v7/js/views.js`, `disc.js`, `app.css`), so reuse it.

## The idea: the Atlas is the front, and each station is a slide-4 panel
1. **Gate** (reuse v7's gate: code `0047RSRV`, `?key=0047RSRV`, `?gate`, `#/exit`). Opening it lands in the Atlas.
2. **Atlas (home, `#/`).** The world is the main thing on screen, at full size, on desktop and on phone. It is v7's re-lit misty blue-grey Atlas (`../v7/js/atlas/`). Each of the nine stations is a **standing rounded frosted-glass panel** (slide-4 style, made in 3D: rounded box, frosted transmission or a convincing fake, bevel highlight). On it are a big legible number and name (`04 / ENDURE`) and its lead pack on a small debossed disc. Clay pills sit around as brand objects.
   - Desktop: drag to look around, hover a station to raise and light it, click to enter. A clean mono list of the nine collections, as small chrome on one side, also travels there.
   - **Phone: the Atlas must read clearly.** Use a camera framing made for portrait. Swipe left and right to glide from station to station, with one station centred and big and the next ones peeking in. A large readable label sits under the centred station, and a clear `ENTER 04 →` pill below it. No glass slab covers the world on the home screen.
   - Keep a quiet way to reach the full Index (v6/v7 index list) from the chrome, for fast shopping (e.g. "Index" in the menu, opening as a panel).
3. **Collection (`#/c/04`).** Click a station and the camera glides up to its panel until the panel fills the screen. Do it with no cut: crossfade or morph from the 3D panel to a DOM slab of the same shape and position, so it looks like the same object. That slab **is** the collection page, with a clear, readable layout:
   - Slide-4 header (`PR6 / 04 ENDURE`), the collection descriptor, and COLLECTION / FORMATS / ENTRIES fields.
   - **All the collection's products visible at once** as a grid or row of debossed discs (each with its real pack render, code, name, format and CA$ price in clear type). On phone, a 2-column grid or a clean vertical list, not a one-at-a-time picker. Hovering or pressing lifts a disc. Text must be easy to read: real contrast (body text at least 4.5:1) and no faint 10px greys.
   - A back control returns to the Atlas with the camera pulling back from the panel. Prev and next collection controls travel to the next station.
4. **Product (`#/p/04-1`) = The Dossier.** Click a disc and that disc grows into the product slab (shape morph). The first view must be as close as possible to `../v7/ref/owner-product-page.jpg`: PR6 / product name, COLLECTION / FORMAT / APPROACH fields on the left, the real pack turning on the big debossed disc, and the black `ADD TO PROTOCOL →` pill. The detail (serving, ingredients, directions, cautions, testing, one-off vs subscribe, related) goes below or slides up on scroll, as in v7. Behind the slab, the station stays visible, blurred.
5. **Your Protocol, Field Club, member pages, search.** Reuse v7's in the same rounded glass language (drawer slab, `#/club`, `#/m/...`).

## Motion
Keep v7's physical motion: springs, rolling mono readouts, the bevel light following the pointer, the pack arcing into the `Protocol (n)` pill, whole-frame turntable stepping. Add camera glides between stations and into panels (eased, 1.2–1.6 s, interruptible), and panel→slab and disc→product shape morphs. Respect `?rm` (cross-fades) and `?nogl` (a 2D fallback home: the nine stations as rounded cards in a grid).

## Musts
- Works and looks right at 1440×900 and **390×844 (phone is the priority this time)**. Also check 1280×720.
- Verify with Playwright (Chromium preinstalled, `require('playwright')`, serve `python3 -m http.server` from `/home/user/nzt-00/public`). Walk: gate → `0047RSRV` → Atlas → swipe/drag to station 04 → enter → collection grid → product → add → Protocol → Field Club, both widths, with no console errors. Look at every screenshot, and compare the product page side by side with the reference.
- Test hook `window.PR6V8.state()`. Storage keys `pr6.v8.member`, `pr6.v8.protocol`.
- Renders come from `../v6/assets/renders/` (don't copy the images).
- Add "PR6 v8 · Stations" to `public/p4ce/index.html`.
- Rules as before: no effect claims, no syringe imagery, no invented studies, British/Canadian spelling.
- Don't commit.
