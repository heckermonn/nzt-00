# PR6 v11 · "The Practice, Observed" · build brief (Oct 31 2026)

v11 is a new version next to v6 to v10. Don't edit those; copy into `public/p4ce/v11/` whatever you reuse.

**Read first, in this order:**
1. `/home/user/nzt-00/PRODUCT.md` and `/home/user/nzt-00/DESIGN.md`. These are the source of truth: the 9 image themes, colours, type, mobile rules and the measured slide-4 product panel. Everything below applies them. Where this brief is silent, DESIGN.md decides.
2. `../v9/BRIEF.md`, `../v8/BRIEF.md`, `../v7/BRIEF.md` and `../v6/BRIEF.md` for the gate, catalogue, section names and product reference (`../v7/ref/owner-product-page.jpg`, `../v7/ref/kit-slide4.png`).
3. The Impeccable skill at `/home/user/nzt-00/.claude/skills/impeccable/`: `SKILL.md`, `reference/craft-floor.md`. Running `scripts/impeccable context` from the repo root prints PRODUCT.md and DESIGN.md.

## Why v11 (lu, Oct 31)
"Mobile feels really sparse/hard to navigate, and we've lost the imagery/theming from the other references." v9 fixed the "AI" look, but on a phone each screen was one small grey object on mist. It had no people, no body-as-data, no macro and no night register, and navigation hid behind a scrub. v11 keeps v9's de-AI rules (FreeSans + DejaVu Sans Mono, mono only for real data, glass only on the product panel and Protocol drawer, no eyebrows, no identical card grids, no scattered fade-ups) and brings the references back.

## Two workstreams in parallel

### 1. Imagery, agent "imagery"
Output: `public/p4ce/v11/assets/img/` plus `img.json`. The site reads `img.json` at runtime.

`img.json` maps a key to `{d, m, w, h, alt, kind: "photo"|"render"|"kit", credit, licence, source, lqip}`:
- `d` is about 1800px on the long edge, webp q≈78. `m` is about 900px, q≈74.
- `lqip` is a tiny base64 blurred placeholder.
- Keep the whole set at 12 MB or less (`d` + `m`).

Every image is graded to the PR6 world (DESIGN.md "Graded World Rule"): Mist and Steel Blue cast, lifted blacks, fine grain, warm skin kept. One shared grading script (`v11/tools/grade.py`) keeps the set coherent.

**Legal sources only, never Pinterest, Behance or TikTok:**
- **Wikimedia Commons**, through its API (`commons.wikimedia.org/w/api.php`, `upload.wikimedia.org`), restricted to public domain, CC0, CC BY or CC BY-SA. Record the author, licence and file page for every image. Public-domain micrographs and radiographs (NIH, NIAID, Wellcome CC BY, CDC PHIL) are good for theme 3 (cells) and theme 2 (x-ray). Only use images whose licence on the file page is clearly one of those. If the licence is unclear, skip the image.
- **The owner's kit** `/mnt/project-files/PR6.pdf`, rasterised with pdftoppm at high DPI and cropped. The owner said kit assets are usable; mark them `kind:"kit"`, credit "PR6 brand kit (concept)". The kit gives the macro cells (slide 1), the x-ray figure (5 and 9), frosted glass over a face (10) and the athlete in a balaclava.
- **Blender renders** (venv `/tmp/claude-0/bpyenv`, Cycles CPU, 4 cores; reuse `../v6/blender/build_packs.py` and `labels.py`). Use renders for:
  - big sealed-metal pack heroes, with the pack filling 60–70% of the frame (theme 5);
  - one macro detail per pack format (embossed PR6 on brushed aluminium, crinkled foil seal, dropper glass);
  - one night-register still (theme 9: a pack or the frosted cube glowing on black) for the gate and Field Club.
  
  Make render scripts resumable: skip finished outputs and write `*.part` then rename, because container restarts kill renders.

**Keys needed (minimum):**
- `hero`: a motion-blurred athlete, misty. Also make a sharp version `hero-sharp` of the same frame, so the hero can resolve from blur to sharp.
- `c01`…`c09`: one human or body image per collection, by its descriptor and never as an effect claim:
  - 01 Foundation: hands, morning, water.
  - 02 Form: torso or silhouette.
  - 03 Force: lifter or chalked hands.
  - 04 Endure: runner, cyclist or rower.
  - 05 Restore: rest after effort, swimmer.
  - 06 Focus: eye or face in concentration.
  - 07 Still: closed eyes, dusk.
  - 08 Renew: skin macro.
  - 09 Vital: older athlete.
  
  Faces turned or in effort. No smiling stock, no gym-selfie look.
- `macro-eye`, `macro-skin`, `macro-cell` (theme 3).
- `body-xray` (theme 2): a figure or radiograph on mist, with room for leader lines.
- `glass-face` (theme 4): a face behind frosted glass, from kit 10 or a composite of a photo behind a rendered or blurred pane.
- `pack-tin`, `pack-pouch`, `pack-box`, `pack-dropper`, `pack-jar`, each with a `-detail` version.
- `night`.

**Credits:** write `credits` entries into `img.json` and also `v11/CREDITS.md`. The site shows them on `#/credits`.

**Contact sheet:** before you finish, save a single contact sheet of every graded image to `/mnt/project-files/pr6-v11/imagery-sheet.jpg`, and look at it. Replace anything off-world: wrong mood, stocky, low-res, watermarked or a licence doubt.

### 2. The site, agent "site"
Start from v9 (`../v9/`): fonts, gate, router, catalogue, content, protocol, disc/turntable and the product view. Copy them in and rename the keys and hooks to `pr6.v11.*` and `window.PR6V11`.

Until `img.json` lands, use a `placeholder.json` with the same shape. Point it at the v9 station stills, the v6 renders and LQIP gradients. Read `img.json` first and fall back to `placeholder.json`.

**Navigation (the main fix):**
- **Phone:**
  - A bottom thumb bar in Ink with four items: Formulary, Search, Field Club, Protocol (n). Targets must be 48px or more, with safe-area padding.
  - A "More" control (or a long press on Formulary) opens a bottom sheet listing every section name from DESIGN.md.
  - A top line "PR6 / 04 Endure" shows where you are and is the Back control.
  - Nothing is hidden behind a scrub or a gesture-only control.
- **Desktop:** the wordmark plus plain links (Formulary, Field Club, Field Notes, Member), with Search and Protocol (n) on the right.

**Screens:**
1. **Gate:** reuse v9's, in the night register (theme 9), using the `night` image. Code `0047RSRV`, `?key=0047RSRV`, `?gate`, `#/exit`. Opening it lifts the screen from black to Chalk.
2. **Home `#/`**: a scroll story of chapters, each opening on a full image. Alternate photo, render and macro.
   1. **Hero.** The full-bleed `hero` resolves from blur to sharp as you start scrolling. One frosted pane over part of it (theme 4) carries "THE PRACTICE OF PROGRESS" and one line.
   2. **The Formulary.** On a phone, nine full-width image tiles: the collection's `cNN` photo, with its lead pack (v9 station still or pack render) set large over or beside it, and the name at 28px or more. On desktop, a lineup row of the nine lead packs over a large photo that changes as you hover each one.
   3. **Macro pause.** `macro-eye` or `macro-cell` full-bleed, with a slow scroll-linked push-in and at most a few true labels.
   4. **Body as data.** `body-xray` with leader lines to real facts from one featured product (ingredient, amount, serving). The lines draw on entry.
   5. **Sealed metal.** One big pack hero (`pack-*`) with its `-detail` and New Entries as an index list.
   6. **Field Club.** A night-register band with the latest notices and reviews.
   
   Keep the v9 film reachable as **The Atlas** (`#/atlas`), linked from the Formulary chapter. Copy `film.js` and point it at `../v9/assets/film/`; don't copy the frames. That keeps "some form of the Atlas" without making it the only way in.
3. **Collection `#/c/04`**:
   - A full-bleed `c04` header (60% or more of the first view on a phone) with the collection name at display size and the descriptor.
   - Then a **lineup**: on a phone, swipe through the packs with the active one at about 70% width, the next peeking at about 15%, and blur-to-focus on the active one. On desktop, one row where the hovered or tapped pack comes forward and the rest fade to about 20%.
   - Then the full **index list**: code (mono), name, format, size and CA$, with hairlines.
4. **Product `#/p/04-1`**: the slide-4 panel, built to DESIGN.md's measured spec. The button is a rounded rectangle at about 25% of its height, not a capsule.
   - On a phone it is portrait: header, the disc at 68% width with the turning pack, the fields, then the button pinned in the thumb zone above the thumb bar.
   - Below the panel, on flat Chalk, is the Dossier: the pack's `-detail` macro, a body-as-data diagram with leader lines to its real ingredients and amounts, serving, directions, cautions, testing, one-off or subscribe, and related products.
5. **Your Protocol:** a glass drawer whose items are **ritual cards** (DAILY / 01, RITUAL / 02, the time, the image, the ingredients, [+]). These are the only cards on the site. Keep the pack arcing into Protocol (n).
6. **Field Club `#/club`**: the night register. Notices and reviews in kit-6 label/value columns, with the `night` image.
7. **Member pages `#/m/...`, Search and `#/credits`**: each opens on an image (DESIGN.md: "a phone screen without an image is a bug"). Use the flat FreeSans hierarchy.

**Motion:** one authored moment per screen.
- Home: the hero resolves from blur, then the chapters run on scroll.
- Collection: blur-to-focus on the lineup.
- Product: the turntable, plus the arc into Protocol.
- Body as data: the leader lines draw.
- Images enter with a 300–500 ms motion blur that resolves to sharp, not a fade-up.

Support `?rm` (crossfades only, no scroll-linked motion) and `prefers-reduced-motion`.

## Musts
- Must work and look right at **390×844 first**, then 1440×900 and 1280×720. Verify with Playwright: Chromium is preinstalled, `require('playwright')` works, and you serve with `python3 -m http.server` from `/home/user/nzt-00/public`.
- Walk the whole flow on both phone and desktop with no console errors: gate (`0047RSRV`) → home (scroll every chapter) → Formulary tile 04 → collection → swipe the lineup → product → add → Protocol → Field Club → the More sheet → a member page → `#/atlas`.
- Look at the screenshots. Compare the product page side by side with `../v7/ref/owner-product-page.jpg`. Count every phone first view: each must be at least 60% image.
- Run `/home/user/nzt-00/.claude/skills/impeccable/scripts/impeccable detect --json public/p4ce/v11` and fix what it finds where it is right.
- Save phone and desktop screenshots of each screen to `/mnt/project-files/pr6-v11/`.
- Add "PR6 v11 · The Practice, Observed" to `public/p4ce/index.html`.
- No effect claims, no syringes, needles or fill lines, and no invented studies or metrics, even in leader lines. Use British/Canadian spelling and CA$ prices.
- Don't commit.
