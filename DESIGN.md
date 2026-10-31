---
name: PR6
description: The Practice of Progress. A private members-only supplement store, misty, human and exact.
colors:
  chalk: "#F2F3EF"
  ink: "#171C1F"
  mist: "#CAD5DA"
  steel-blue: "#718B9A"
  safety-orange: "#E98546"
  ink-muted: "#4A5961"
  stage-mist: "#ADB8C0"
  panel-glass: "#BDC9D1"
  field-deboss: "#C7D2D9"
  button-black: "#0B1118"
typography:
  wordmark:
    fontFamily: "FreeSans, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontWeight: 700
    letterSpacing: "-0.03em"
    lineHeight: 0.92
  display:
    fontFamily: "FreeSans, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "clamp(3rem, 9vw, 7rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "FreeSans, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "clamp(2rem, 5vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "FreeSans, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "1.375rem"
    fontWeight: 400
    lineHeight: 1.2
  body:
    fontFamily: "FreeSans, 'Helvetica Neue', Helvetica, Arial, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  data:
    fontFamily: "'DejaVu Sans Mono', Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.04em"
  data-caps:
    fontFamily: "'DejaVu Sans Mono', Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.16em"
rounded:
  field: "6px"
  image: "14px"
  button: "12px"
  panel-phone: "24px"
  panel: "28px"
  full: "999px"
spacing:
  gutter-phone: "16px"
  gutter-desktop: "40px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  section: "72px"
components:
  button-primary:
    backgroundColor: "{colors.button-black}"
    textColor: "{colors.chalk}"
    typography: "{typography.data-caps}"
    rounded: "{rounded.button}"
    height: "52px"
    padding: "0 28px"
  product-panel:
    backgroundColor: "{colors.panel-glass}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  product-field:
    backgroundColor: "{colors.field-deboss}"
    textColor: "{colors.ink}"
    typography: "{typography.data-caps}"
    rounded: "{rounded.field}"
    height: "36px"
    padding: "0 12px"
  thumb-bar:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.chalk}"
    height: "68px"
---

<!-- Distilled 31 Oct 2026 from the PR6 Source Board (the visual source: a private claude.ai Artifact: https://claude.ai/artifact/QRCENLp7JgHDnu5yivmLaW), the kit /mnt/project-files/PR6.pdf and the owner's decisions. This is the direction for v11. Re-run /impeccable document once v11 exists. Reference images are listed by local path only; never copy them into this public repo. -->

# Design System: PR6

## Overview

**Creative North Star: "The Practice, Observed"**

PR6 looks like a calm study of the human body in motion, seen through frosted glass in a pale blue-grey room. It has three image layers. The first is real people: athletes blurred by movement, faces half behind glass, eyes and skin in macro. The second is the body as data: x-ray figures, point clouds and leader lines that carry true facts. The third is the product: sealed metal and foil packs and clay objects on debossed discs, shown big. Type is quiet, mono is for data only, and the store is light (Chalk to Mist), with a black night register for Field Club and the gate. Every phone screen opens on a full picture. Motion is slow and physical, with one authored moment per screen.

Anti-references: v8, which the owner called "too AI" (glass everywhere, mono caps as costume, identical card grids, Inter, real-time 3D), and v9 on a phone, which was sparse and lost the people, bodies, metal and glass-over-skin imagery.

### Image themes

Nine themes cluster the 129 Pinterest pins (`/mnt/project-files/pinterest/NNN_*`), the Behance sheets (`/mnt/user-data/uploads/nzt-00/refs/_sheets/`), the TikTok frames (`/mnt/project-files/tiktok-refs/*-sheet.jpg`) and the kit. The board shows every image. The status says how each fared in v9.

1. **Mist and motion** (lost). Misty blue human photography and motion-blurred athletes. Refs: Behance p01, inn, luna; pins 004, 022, 041, 073, 097, 114; kit 10. *Rules:* Home after the gate opens on a full-bleed blurred athlete that sharpens on scroll. Each collection has its own graded human image as its header and Atlas tile. Images enter with a 300–500 ms motion blur that resolves to sharp. Faces turned or in effort; no smiling stock.
2. **The body as data** (lost). X-ray glass figures, point clouds, wireframes, HUD brackets and leader lines. Refs: kit 5 and 9; pins 003, 014, 020, 037, 040, 061, 082, 085, 087; Behance waylab (thermal), akme (x-ray). *Rules:* This is the image system for The Dossier and Field Notes, with leader lines pointing only to true facts (ingredient, amount, serving). Render the figures in Blender on Mist. HUD marks frame only real images and carry only real data. The figure builds from points on entry. On a phone, kit 9's node map is one form of the Atlas.
3. **Close: eye, skin, cell** (lost). Extreme macro of eyes, skin, cells and gel. Refs: kit 1; pins 011, 032, 034, 058, 106, 110, 125, 126; Behance 7pe. *Rules:* One full-bleed macro is the pause between chapters. At most a dot grid or a few true labels on top. A slow scroll-linked push-in and focus pull.
4. **Frosted glass** (partly lost). Frosted glass over a face, a hand or a bottle; blur to focus. Refs: kit 4, 8 and 10; pins 005, 008, 027, 030, 049, 083; Behance luna. *Rules:* Glass appears only over the Home hero photo, on the product panel and on the Protocol drawer. Blur to focus is the product reveal on collection pages. On phones, crossfade pre-blurred pairs.
5. **Sealed metal** (partly lost). Brushed aluminium, foil, vacuum seals, crimped vials and embossed type. Refs: kit 2, 6 and 11; pins 013, 018, 043, 067, 081, 105, 108, 113, 121; Behance p01 (foil, tin), waylab (vacuum pack). *Rules:* The pack fills 60–70% of its frame, with one macro detail per product. Blender materials: brushed aluminium, crinkled foil, vacuum shrink, embossed PR6. Your Key and the invitation use sealed pouches, numbered boxes and an engraved tag. Vials are only sealed and capped.
6. **Soft matte objects** (kept). Clay pills and spheres, debossed discs, the frosted cube, a stone. Refs: kit 4 and 6; pins 052, 069, 071, 096, 107, 124; TikTok ZSgbF1Fd5 (NURV). *Rules:* The object language of the disc and the Atlas stations. Always paired with a human, body or macro image, because alone it reads sparse (v9). Objects settle softly and never bounce.
7. **Information type** (over-corrected). Mono index sheets, ritual cards, dot-matrix numerals, vertical type. Refs: kit 3, 6 and 7; pins 001, 002, 029, 050, 065, 084; Behance 7pe, akme. *Rules:* Product lists are a visible mono-data index. Your Protocol is a set of ritual cards. Field Club records follow kit 6's label and value columns. A serif accent needs the owner's OK.
8. **The white room** (partly lost). Pale space; the store as a gallery with one object large. Refs: TikTok ZSggYcRGQ (lineup), ZSggY3oKd, ZSggYgk9h; pins 026, 116, 123; Behance hygico; the owner's sites liminalrep, vtrshoes, abelfragrance, lelism, juliaplaza (see `public/p4ce/v6/BRIEF.md`). *Rules:* Collection page = lineup, where the tapped product comes forward and the rest fade to about 20%. The Formulary is a lineup of nine lead packs. A phone screen without an image is a bug.
9. **Night register** (lost). Black ground, one glowing subject. Refs: kit 7; pins 025, 033, 079, 093, 101, 127. *Rules:* For Field Club and the gate only; opening the gate lifts the screen to Chalk. Never the whole store.

Outside the world, so leave them out: pins 074, 088, 100, 112.

## Colors

Chalk and Mist grounds with Ink type. Steel Blue does the quiet work; Safety Orange appears only in small amounts.

- **Ink** (primary): text, wordmark, thumb bar, night ground.
- **Steel Blue** (secondary): photo grade, focus rings, markers, annotations. Not for body text on Chalk; use **Ink Muted** for that.
- **Safety Orange** (tertiary): the slash in "PR6 / …", the button arrow, a live state, one tick.
- **Chalk**, **Mist**: grounds. **Stage Mist**, **Panel Glass**, **Field Deboss**, **Button Black**: the product panel only, sampled from kit slide 4.

**The Tick Rule.** Orange covers less than 1% of any screen.
**The Graded World Rule.** Every photo is graded to Mist and Steel Blue with fine grain, warm skin kept.

## Typography

**Display/Body:** FreeSans (the free Helvetica clone, for Helvetica Neue). **Mono:** DejaVu Sans Mono (the parent of Menlo). Files: `public/p4ce/v9/fonts/`. The wordmark is FreeSans Bold with tight tracking; the kit's mark is wider, so ship it as an SVG. Use display once per screen (a collection name), headline for sections and product names, title for list names, body at 16 px or larger on phones, data for codes, CA$ prices and amounts, and data caps only for slide-4 fields and the button.

**The Real Data Rule.** Mono only for something a member could look up. No eyebrows, kickers, decorative numbers or fake coordinates.
**The Sentence Case Rule.** Headlines in sentence case, never tracked. Wide caps only for "THE PRACTICE OF PROGRESS".

## Layout

Max width 1320 px, with 16 px phone and 40 px desktop gutters. Desktop is asymmetric (text in about 5 of 12 columns, images in about 7); phones stack. 72 px between sections. Product lists are index rows (code, name, format, size, CA$) with hairlines, liminalrep style. Lineups sit in one row; on phones they swipe, with the active item at about 70% width and a 15% peek of the next.

**Mobile (390 × 844 first):**
1. A bottom thumb bar (Formulary, Search, Field Club, Protocol (n)), targets at least 48 px, plus a bottom sheet listing every section name.
2. A top line ("PR6 / 04 Endure") shows where you are and doubles as Back.
3. Every screen opens on a full-bleed image filling at least 60% of the first view.
4. The Formulary is nine full-width image tiles with large names.
5. A collection is a swipe lineup with the full list below.
6. The product panel turns portrait (header, disc at 68% width, fields, button pinned in the thumb zone).
7. Body at least 16 px, names at least 20 px, mono at least 13 px, contrast at least 4.5:1.
8. Alternate photo, render and macro; blurred placeholders, never blank boxes.
9. Motion tied to touch and scroll; reduced motion respected.
10. No sideways page scroll.

## Elevation & Depth

The interface is flat. Depth comes from photography, focus and blur.

**The One Slab Rule.** Only the product panel (and the Protocol drawer) has glass, an edge highlight and a shadow.

## Shapes

Rounded and Apple-like, never pill-everything. Panel radius is about 3.2% of its width (`panel` 28 px, `panel-phone` 24 px); images 14 px; fields 6 px. The button is a rounded rectangle with a radius of about 25% of its height: slide 4's "pill" is not a capsule. The disc is a true circle. Lists use 1 px hairlines, not boxes.

## Components

### Buttons
Primary: Button Black, Chalk mono caps label and an orange →, 52 px tall, 12 px radius. One per screen. On focus, a 2 px Steel Blue ring. Secondary actions are underlined text links.

### Product panel (signature; the owner's request)
Copy kit slide 4 (`public/p4ce/v7/ref/owner-product-page.jpg`, `kit-slide4.png`). Measured at 5334 px:
- Stage Mist ground with a lighter backing plate.
- Panel: 7 : 5, Panel Glass, a 1 px light top and left edge, an inner rim 1.8% inside, and a soft shadow below.
- Header at 4.3% / 6.8%: wordmark, orange slash, tracked mono caps ("PR6 / ENDURE").
- Fields from 4.3% to 28.8% of the width, labels at 22%, 40% and 59% of the height: COLLECTION (04 ENDURE), FORMAT (real format), APPROACH (a pillar word until the owner defines it). Values sit in Field Deboss boxes about 5% of the height tall.
- Disc: 36% of the width, centred at 62.5% / 42%, debossed, holding the real pack turning slowly.
- Button: 28% of the width, centred under the disc, top at 84.6%. Footer: mono code and CA$ price plus a hairline.
- The full Dossier continues on flat Chalk below the panel.

### Ritual cards
Your Protocol only (kit 3, pin 001): DAILY / 01 or RITUAL / 02, the time, the image, the ingredients and [+]. These are the only cards.

### Navigation
Desktop: wordmark plus plain links (Formulary, Field Club, Field Notes, Member), with Search and Protocol (n) on the right. Phone: the thumb bar plus a sheet listing The Formulary, Your Protocol, Dispatches, Nominations, Member Record, Your Cabinet, The Dossier, Field Notes, New Entries, Member Liaison, Your Key and Field Club.

## Do's and Don'ts

### Do:
- **Do** open every screen on a real image of a person, a body, a macro or a big pack.
- **Do** give each collection its own human or body image as well as its pack.
- **Do** match slide 4 for the product page, with the real pack and real data.
- **Do** use path-traced renders and graded photography, and credit stock photography.

### Don't:
- **Don't** put glass on cards, nav or chips, or blur everywhere.
- **Don't** use mono caps as decoration, eyebrows, section numbers or fake HUD coordinates.
- **Don't** build grids of identical cards, chips or pills.
- **Don't** use Inter or Inter Tight, or real-time-looking 3D.
- **Don't** scatter fade-up entrance animations.
- **Don't** leave a phone screen with one small grey object (v9).
- **Don't** show syringes, needles or fill lines, effect claims, or invented studies or metrics, even in a HUD.
- **Don't** copy Pinterest, Behance or TikTok images into this repo.
