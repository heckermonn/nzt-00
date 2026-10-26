# P4CE — 3D direction POCs (shared brief for builders and reviewers)

Fresh project. Ignore every other folder in this repo (old NZT-00 site, src/, blender/): none of it applies.

## The brand (from the owner's brief, 25 Oct 2026)
- **P4CE**, pronounced "pace". Invitation-only wellness brand (vitamins and supplements). Momentum, progression, human potential. Keep the **4** as the central coded detail of the wordmark.
- **The Reserve**: the private membership. **The Formulary**: the product collection. **Member 0047**: example member identifier used on invitations and member screens.
- Physical invitation: numbered box, metallic sealed pouch marked ACCESS with a contrasting seal, a **brushed-metal NFC key tag engraved with P4CE and the member number**, a welcome card reading **"01 OPEN / 02 TAP / 03 ENTER"**.
- Member journey: receive invitation, tap the key, activate account, **"a brief locker-opening transition reveals The Formulary"**, browse and purchase (one-time or subscription), return and manage.
- Visual direction: strong atmospheric inspiration from the film *The Substance*: **stark white interiors, numbered lockers, brushed steel, sealed foil, condensed black typography, acid yellow-green accents**. Original imagery and branding only; austere and cinematic. **Pair a dark access terminal with a bright, clinical collection page.** The transition into the member space must feel deliberate. Oversized headlines used sparingly, small monospaced labels for secondary info, generous space around forms and products.
- Tone: discreet, concise, assured. Membership copy may create intrigue ("You have been selected." "Your place has been reserved." "Your next chapter is private."). Shopping instructions and product info stay direct and plain.
- The Formulary, nine collections (code / name / descriptor):
  01 FOUNDATION Everyday nutrition and essential support · 02 FORM Body composition and physique · 03 FORCE Strength and physical performance · 04 ENDURE Stamina and sustained effort · 05 RESTORE Recovery and physical maintenance · 06 FOCUS Attention and mental clarity · 07 STILL Calm, rest, and sleep · 08 RENEW Skin, hair, and appearance · 09 VITAL Healthy ageing and long-term wellbeing
- Product presentation: clear product names beneath the collection code; each product shows ingredients, format, quantity, price, and purchase options (one-time / subscribe = "Your Protocol"). **No effect or health claims**: the category name does not establish a product's effects. Use plain sample products (e.g. Vitamin D3 + K2 softgels, Creatine Monohydrate powder, Magnesium Glycinate capsules, Electrolyte sachets, Collagen Peptides, L-Theanine, Glycine, Omega-3) and mark prices as sample prices.
- Nav names (secondary, can appear small): The Formulary, Your Protocol (subscription = the cart/tray in these POCs), Dispatches, Nominations, Member Record, Your Cabinet.
- Owner's mood board (Pinterest, not readable, themes only): brushed aluminium, foil vacuum packs, embossed monochrome type, vials and ampoules, a glowing capsule on black, measurement overlays, dot-matrix type.

## What lu asked for
"Make it 3D. Something extraordinary." Libraries allowed: three.js, GSAP, anime.js, Motion, raw WebGL/shaders. Each POC is a **direction lu can workshop**, so it must be a real, working slice of the journey, not a mood still:
1. **Dark access terminal** with the key moment (tap / insert / hold).
2. **The deliberate transition** into the member space (the "locker-opening" beat, interpreted per direction).
3. **Bright clinical Formulary** showing all nine collections, with at least one collection you can open into a product, see its details (name, format, quantity, ingredients, sample price, one-time vs subscribe), and **add it to Your Protocol** with a satisfying physical 3D beat and a visible protocol count/tray.
Impeccable Overdrive rules apply: ONE authored extraordinary moment per direction, everything around it quiet; 60fps target; progressive enhancement; sound only on explicit opt-in (optional, off by default); respect prefers-reduced-motion (skip to end states, crossfades).

## Technical contract (these become claude.ai Artifacts)
- ONE self-contained file: `p4ce/directions/<slug>/index.html`. All geometry procedural in three.js (no external models, no image files; textures generated with canvas/shaders or as data: URIs). Total under ~1.5 MB.
- Do NOT write `<!doctype>`, `<html>`, `<head>`, `<body>`: the file starts with `<title>` (2–4 word name), `<meta name="claude:viewport-fit-sides" content="cover">`, `<style>`, then markup and scripts. Side gutter on text wrappers: `padding-left: max(16px, env(safe-area-inset-left, 0px))` and same for right. Fixed edge UI adds `env(safe-area-inset-*)`.
- Scripts ONLY from these hosts, exact pinned versions: three via importmap `https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js` and addons `https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/` ; GSAP `https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js` (+ ScrollTrigger at same path `ScrollTrigger.min.js` if needed). Fonts ONLY from Google Fonts with fallback stacks. No fetch/XHR to anything external. No alert/confirm/prompt, no downloads, no window.open.
- Deliberately single-look design (dark terminal + white clinical): set `body` background and every colour explicitly as tokens on `:root`; no light/dark media blocks needed. Visible keyboard focus, every control is a real `<button>` with an id. Theme selection colour, scrollbars, caret.
- Must work at phone width (390×844, touch) and desktop (1440×900). No horizontal page scroll. Cap devicePixelRatio at 1.75 (1.5 on phones), pause the render loop when the tab is hidden, and degrade gracefully if WebGL fails (show a styled static fallback with the same copy).
- First frame must show something meaningful (the terminal) within ~1s; never a blank screen waiting.
- Provide a small fixed "skip" affordance so lu can jump straight to the Formulary when workshopping.

## Verifying in this container (CDNs are blocked here, the harness maps them to local copies)
`node /tmp/claude-0/p4ce-vendor/shot.mjs <file.html> <outPrefix> [steps.json] [--mobile]`
steps.json is a list like `[{"wait":1500},{"shot":"terminal"},{"click":"#tap"},{"wait":2500},{"shot":"after"},{"wheel":900},{"clickAt":[700,450]},{"mouse":[700,450]},{"key":"Enter"},{"eval":"document.title"}]`. It prints console errors / page errors / vendor misses. Need another npm package? `cd /tmp/claude-0/p4ce-vendor && npm i <pkg>@<exact>` (registry works; CDNs don't). WebGL runs on SwiftShader (slow), so judge composition/lighting/timing from screenshots, not frame rate. Put screenshots in `/tmp/claude-0/p4ce-shots/<slug>/`. Look at your screenshots (Read the PNG) and iterate until it is genuinely beautiful at both sizes.
