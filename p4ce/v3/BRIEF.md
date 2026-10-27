# P4CE v3: The Reserve as an immersive world (shared brief)

lu's feedback on v2 (27 Oct 2026): "The Reserve is lacking." It reads like a well-made store with a 3D hero. lu sent four references and asked us to "really nail that immersive experience the business owner is looking for."

Read these first:
- /home/user/nzt-00/p4ce/v2/BRIEF.md: the owner's vision (verbatim), mood board, copy rules.
- /home/user/nzt-00/p4ce/directions/BRIEF.md: tech contract and screenshot harness. Everything there still applies unless this file overrides it.
- /home/user/nzt-00/.claude/skills/impeccable/reference/craft-floor.md
- /home/user/nzt-00/p4ce/v2/reserve.html: the current private site. Reuse its product data, copy, product-detail depth (The Ordinary-style sections, evidence placeholders, sample testing), and localStorage protocol logic. Do not reuse its page layout.

## What the references teach (read this as the bar)
- **Igloo Inc (igloo.inc, Awwwards SOTY).**
  - One continuous real-time 3D scroll journey with no page loads.
  - Each project lives inside its own ice block. The blocks are procedurally grown crystal structures inside cubes and cylinders.
  - Scenes transition through frost, chromatic aberration and "tech displacement".
  - The links section is a particle simulation that morphs into a shape per link.
  - The UI is rendered in WebGL, with scrambling text and shader glitches.
  - Sound is synced to motion.
  - Tuned for low-end devices, with background shader compilation.
- **Unseen Studio World (unseen.co/world).**
  - An entry gate: "Enter" or "Enter without audio".
  - The world is explorable: "Drag to explore our world", "Click & hold".
  - Numbered global nav: Index / Projects / Contact / World. The world is a place, and content sits in it.
- **Immersive Garden (immersive-g.com).** Luxury-house work (Louis Vuitton, Cartier, Dior):
  - cinematic scroll, huge restrained type, slow camera, transitions that feel like film cuts;
  - projects presented as objects in space, with no cards or grids.
- **Press Edition (press-edition.com).** A Framer shop for print and paper mockups:
  - editorial and quiet, with a minimal top bar (All / Video / Photo / Collections / About / Search / Account / Bag 0);
  - product imagery does all the talking.
  - It is the practical counterweight: shopping stays this simple.

## The goal
**Inside The Reserve you are in a place, not on a website.**
- One persistent WebGL world never unloads. The Formulary, collections and products are locations and objects in it. You travel between them with camera moves and authored transitions, not page swaps.
- Practical layers float over the world as frosted glass:
  - Your Protocol (cart and subscription), Dispatches, Member Record, Cabinet, Nominations, Dossier and Liaison;
  - the full product dossier.
- Navigation stays as simple as Press Edition: a minimal persistent bar with the Formulary index, search, Protocol count and Member menu. Every collection and product is at most 2 clicks away from anywhere, and every location has a hash route so back and forward and deep links work.

**Mood.** Clean, futuristic, artistic and captivating:
- sculptural forms, brushed metal, frosted glass, cinematic lighting;
- human potential, transformation, pushing boundaries;
- monochrome, with acid #CCFF00 used rarely.

Start from the v2 enter.html hand-off: it ends on black after locker 0047 opens.

## Must haves
1. **Arrival.** The world assembles from the locker's light, or from black. It includes a sound gate ("Enter with sound" / "Enter without sound"). Sound is designed with Web Audio: a low room tone plus motion-synced cues. It is off unless chosen.
2. **The Formulary as a place.** All nine collections are present and legible as places or objects. Name and code are always readable, in WebGL or in DOM placed in the scene.
3. **Collection to product.** Entering a collection is an authored transition. Its 5–6 products appear as real objects in space:
   - procedural packs reused from reserve.html builders: vial, jar, tin, pouch, sachet, tube, dropper;
   - each object is clickable and labelled;
   - a quiet list fallback is always one tap away.
4. **The product moment.**
   - The object comes to you. You can turn it by dragging.
   - The frosted dossier panel shows: name, format, quantity, sample price, key ingredient with concentration, one-time vs subscribe, and Add to Protocol.
   - Add to Protocol has a physical 3D beat into a persistent protocol object or tray.
   - Full sections follow: Overview, Ingredients, Directions, Cautions, Evidence (placeholders only), Testing & Sourcing (sample).
5. **Member layers.** Protocol, Dispatches, Cabinet, Nominations, Member Record, Dossier and Liaison are overlay layers over the dimmed or blurred world. They have real, useful content: reuse reserve.html's content and logic.
6. **The rule-of-one.** One signature, extraordinary transition technique used consistently, for example frost or crystallization, or particles reforming. Everything else is quiet and slow.
7. **Craft.**
   - 60fps target, DPR caps, pause when hidden, adaptive quality.
   - Reduced motion uses crossfades and still cameras.
   - No WebGL falls back to an elegant DOM version of the same structure.
   - Phone (390×844, touch) must be first-class: the world can reframe vertically, and layers become sheets.
   - Keyboard: every object reachable. Visible focus.

## Copy rules (unchanged)
- Inside the world: discreet, precise, plain.
- No effect or health claims; category names don't establish effects.
- No needles or injection imagery.
- Evidence is "Evidence summary: to be written and referenced before launch" plus empty reference slots.
- Testing and sourcing values are marked "sample".

## Two directions (one builder each)
- **A, The Procession** (`/home/user/nzt-00/p4ce/v3/procession.html`). Follows Igloo and Immersive Garden. Scroll drives one continuous camera journey through a vast, cinematic space.
  - The nine collections are nine frosted-glass monoliths. Inside each, a procedurally grown crystalline or metallic structure holds that collection's products suspended like specimens.
  - Between monoliths, the space changes light: dark brushed-steel corridor to pale frosted white.
  - Entering a monolith: the glass frosts over the whole screen, then clears inside the collection.
  - A numbered scroll index (01–09) on the edge doubles as navigation.
- **B, The Atlas** (`/home/user/nzt-00/p4ce/v3/atlas.html`). Follows Unseen's world. A drag-to-explore landscape:
  - a vast pale room or plane, like sand or poured resin, with a white-room horizon;
  - the nine collections are nine sculptural stations placed on it, with brushed-steel plinths, frosted forms and measurement overlays.
  - Drag or swipe to look and pan. Click-and-hold a station to travel there (a hold ring fills).
  - A precise robotic arm, or an equivalent instrument, presents each product to you. The mood board has a white room with a robotic arm in sand.
  - A small top-down map or index toggles a complete list view.

Each file is self-contained and follows the artifact contract: it starts with `<title>`, has no doctype, uses pinned CDNs and has procedural assets only. A rough budget is ≤ 400 KB. Screenshots go to `/tmp/claude-0/p4ce-shots/v3-<name>/`.
