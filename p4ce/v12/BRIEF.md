# PR6 v12 · "Raking Light" · build brief (Nov 1 2026)

v12 is a new version beside v6 to v11. Don't edit those folders; copy what you reuse into `public/p4ce/v12/`.

**Read first:**
1. `/mnt/project-files/pr6-v11/critique/CRITIQUE.md`, in full. lu said v11 had "no wow factor and feels really amateur". This critique is the diagnosis, and lu picked **direction A, Raking Light**, from it. Its "Top 10 fixes" 3–9 are in scope too, and its frame-by-frame description of A is the spec.
2. `/home/user/nzt-00/DESIGN.md` and `PRODUCT.md`. The brand rules still hold. Where this brief or the critique overrides them (stock people, the image themes), this brief wins.
3. `../v11/BRIEF.md`, then the v11 code, which you start from.
4. The Impeccable skill: `/home/user/nzt-00/.claude/skills/impeccable/` `SKILL.md`, `reference/overdrive.md`, `reference/craft-floor.md`, `reference/animate.md`.

## The idea in one line
Every product image is a path-traced photograph from one pale set, rendered once with each light written as its own pass. The browser adds those passes back together under the member's thumb, so the member moves a real light across a sealed tin. Under the grazing light the embossed PR6 rises out of the brushed metal. Hold, and an "invisible ink" layer shows the pack's real ingredients and amounts, printed on the label.

## What changes from v11
- **No stock portraits on store screens.** Remove the c01–c09 people, the hero runner, glass-face and the macro chapters from home, the Formulary and collections. Every store image is now our own render from the one set.
- **Field Club keeps the night register** with the cube, and may use **one** owner-kit image (kit 1 cells or kit 5 x-ray) as a still pause, without leader lines.
- **Remove the fixed-anchor leader lines** on the x-ray. Product facts belong on the product (the ink layer and the Dossier).
- **Never composite a pack onto a photo.** A pack only appears in an image where it was lit.
- **Keep** v11's phone navigation (thumb bar, top line as Back, More sheet), the gate (Object 0047, code `0047RSRV`), the catalogue, the section names, CA$ prices, Protocol with ritual cards, and FreeSans + DejaVu Sans Mono.

## Two workstreams in parallel

### 1. Renders, agent "light"
Output goes in `public/p4ce/v12/assets/light/` with a `manifest.json`. The site reads the manifest at runtime.

**Set and models**
- One shared set: a pale cyclorama in Mist/Chalk, a stone-grey floor, and slide 4's debossed disc (as real geometry where the shot needs it).
- Rebuild the five pack models from `../v11/blender/build_packs.py` and `labels.py` (tin, pouch, box with sachets, dropper, jar) until they look like real products:
  - labels wrapped by UV and printed, not decals;
  - a real embossed or debossed PR6 on the tin lid (displacement or geometry; `../v11/blender/tex/` may have a lid emboss map);
  - bevels, seams, the crimp on the pouch, and brushed anisotropic aluminium.
- Look at kit slides 2, 6 and 11 (`/mnt/project-files/PR6.pdf`, rasterise a copy) for the target. CC0 HDRIs and textures from Poly Haven (`dl.polyhaven.org`, `api.polyhaven.com`) are allowed if useful.

**Light groups**
Use Cycles light groups: Blender 5.x View Layer, Light Groups, with a pass per group. Six groups:

| Group | Role |
|---|---|
| `key_l` | low raking key from the left |
| `key_r` | low raking key from the right |
| `top` | soft overhead |
| `rim` | back rim |
| `amb` | world / fill, low |
| `ink` | an emission-only "UV ink" layer on the label |

The `ink` text is the pack's real ingredients and amounts per serving from `../v11/js/catalog.js`. Use the product named in the manifest; no invented values. It sits in Steel Blue or cold white, wrapped on the label so it follows the surface. It must be invisible in all other groups: emission strength 0 unless that group is lit, done for example as an emissive shader only on an object assigned to the `ink` group.

All lights and the world must be assigned to a group. Then `sum(all group passes)` equals the beauty pass. **Verify that numerically on the spike** (mean absolute error under 1% in linear values).

**Export**
- Denoise each pass: Denoising Data plus a compositor OIDN node per pass, or render the passes denoised. They must stay additive.
- Export each pass as an 8-bit sRGB-encoded WebP. Record in the manifest that the shader linearises them and adds them in linear space.
- Also export a `poster` (a good default mix) as a WebP for the fallback and the first paint.
- Sizes:
  - `d`: 1600px long edge.
  - `m`: 1024px long edge.
- Keep the whole set at 20 MB or less.

**Shots**

| Shot | Spec |
|---|---|
| `tin_hero` | Portrait 4:5. The tin fills about 70% of the width. The phone home hero and the gate handoff. |
| `pouch_hero`, `box_hero`, `dropper_hero`, `jar_hero` | Same framing, as a consistent family. They double as the product-disc shots. |
| `disc_<pack>` | Optional. Seated in the debossed disc, as in slide 4, for the product panel. Alternatively the site masks the hero into the disc. Pick whichever looks better and say so. |
| `lineup` | 16:9 at 2400 wide, plus a phone-friendly crop or second render. The nine collections' lead packs in one row in the same room, under the same groups, with shadows that overlap correctly. Formats come from the catalogue: tin, pouch, box, dropper, jar, repeated as needed. Give each collection a distinct label or colourway note, so nine look like nine and not four identical tins. |
| `night_tin` | Optional. The tin or cube in the night register for the gate handoff frame. |

**Order of work**
1. **Spike first:** a tin at 640px with low samples, all six groups, plus an additivity check. Write `manifest.json` immediately so the site agent can wire the shader against real passes.
2. Then the full renders. These are resumable: skip finished passes and write `*.part` then rename, because container restarts kill renders. Run them in the background and keep checking.

**Budget and checks**
- About 2.5 hours of render CPU in total. Prefer fewer, better shots.
- Contact sheet: `/mnt/project-files/pr6-v12/light-sheet.jpg`, showing each shot's passes and three sample mixes. Look at it. If the labels look like decals or the metal looks plastic, fix the models before the final render.
- Manifest shape:

  ```
  {groups:[...], encoding:"srgb8", shots:{tin_hero:{w,h,product:"03-2",
    passes:{key_l:{d,m},...}, poster:{d,m}, ink_text:"..."}, ...}}
  ```

### 2. Site, agent "site"
Start from v11. Rename keys and hooks to `pr6.v12.*` and `window.PR6V12`.

**`js/light.js` relight module**
- A WebGL quad (raw WebGL2, or three r169 from the existing importmap; keep it small).
- It loads a shot's passes, linearises them, computes `sum(w_i · pass_i) · exposure`, tonemaps to sRGB, and adds a blue-noise or hash dither against banding.
- **Light position mapping:** a 2D light position `(x, y)` maps to weights:
  - `key_l` and `key_r` follow `x` (smooth falloff);
  - `top` follows `y`;
  - `rim` stays low and constant;
  - `amb` is low;
  - `ink` follows a separate `ink` value from 0 to 1. When `ink` is up, the white keys dim a little so the label reads.
- Spring smoothing comes from `util.js` (about 120 ms of lag, so the light feels weighted).
- Inputs:
  - pointer or touch drag on the image (`touch-action: pan-y`, so vertical page scroll still works);
  - scroll, which sweeps the light as the section passes;
  - an idle auto-sweep on first view;
  - long press (600 ms) or dragging to the label edge, which raises `ink`;
  - keyboard: arrow keys move the light and `I` toggles ink.
- **Fallback:** without WebGL, with `?nogl`, or before the passes load, show `poster` and on press crossfade to a pre-mixed ink still. The site agent can make that still in the browser from the passes once, or the light agent exports it.
- **Reduced motion and `?rm`:** no auto-sweep; the light is fixed at `key_l`; ink on press only.
- Also give the screen-reader and text fallback for the ink content: a visible mono line under the image carrying the same facts.

**Screens**
1. **Gate handoff:** delete the white splash. After "Come in.", the night register opens into the tin hero: the black falls away as `key_l` rises from 0, with the same tin, then "Your place has been reserved." in Ink. This is the critique's frames 1–3.
2. **Home `#/`** on a phone is about 6 screens:
   1. **Tin hero,** relightable, filling the screen above the thumb bar, with one display line set on the image (no frosted card).
   2. **Lineup,** relightable, using the same light state. Swipe through it on a phone; on desktop the hovered pack comes forward and the rest drop to about 20%. Tap a pack to go to its collection.
   3. **An index of the nine collections** as type rows: name at title size, descriptor, count, CA$ range, with hairlines.
   4. **Night band** for Field Club.
   5. **Footer.**
   
   Remove the stock chapters.
3. **Collection `#/c/04`:** open on that collection's lead-pack hero, relightable, with the collection name at display size on the image. Then a lineup of its products, which may reuse the format heroes with a distinct label note per product (be honest in the code where images are shared), then the index list.
4. **Product `#/p/04-1`:** the slide-4 panel, to DESIGN.md's measured spec, with the disc showing the relightable pack (drag on the disc moves the light; long press shows the ink).
   - Product name at headline size and CA$ price at title size beside the button.
   - A clean Stage Mist backdrop, no murky photo.
   - On a phone the disc takes 68% of the width, the fields sit below, and the button is pinned above the thumb bar without stacking black on black. Give it a gap or a lighter thumb bar treatment.
   - The Dossier below stays on flat Chalk.
5. **Lineup → product continuity:** use the View Transitions API (same document) where supported, so the pack's frame becomes the disc. Keep the light position across the cut.
6. **Member pages, Search, Credits:** no forced unrelated photo. A clean type page, or the relevant pack render where it means something.

**Type: fix 4.**
- Six sizes and two weights. Phone guide: 13 mono / 17 body / 22 title / 34 headline / 56 display / 88 hero (scale up on desktop).
- FreeSans Bold for product names and prices where it helps hierarchy.
- Put the scale in CSS custom properties and use only those.
- Run `impeccable detect` and bring font-size, colour and radius drift close to zero.

**Motion:** one authored moment, the light. Kill the never-seen entrance blur and random fades. Route changes use View Transitions or a short crossfade.

**Spike:** until the light agent's spike lands, the site agent can build `light.js` against fake passes generated in the browser (e.g. directional gradients on a v11 pack render), but it must re-wire to the real manifest as soon as it appears. Check `v12/assets/light/manifest.json` periodically.

## Musts
- Must look right at **390×844 first**, then 1440×900 and 1280×720.
- Walk the whole flow with Playwright, with no console errors: gate → handoff → home (drag the light, long-press the ink, swipe the lineup) → collection 04 → product → add → Protocol → Field Club → More sheet → a member page.
  - Chromium is preinstalled; headless WebGL uses SwiftShader, which is slow but works.
  - Record a short frame sequence of the light being dragged across the tin, at 390×844, and save it as a GIF or a strip to `/mnt/project-files/pr6-v12/`.
  - Save phone and desktop screenshots of every screen there too.
- Compare the product page against `../v7/ref/owner-product-page.jpg` side by side.
- Performance: the phone texture set per screen is 6×1024² or less. Pause rendering offscreen and when no input or sweep is running.
- Add "PR6 v12 · Raking Light" to `public/p4ce/index.html`.
- No effect claims, no syringes, and no invented data. The ink text is catalogue data only. British/Canadian spelling.
- Don't commit.
