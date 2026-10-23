# NZT-00 Laboratory

A scroll-driven storefront for NZT-00 supplements. The page is one continuous lab: a capsule swarm forms each formula, a single capsule is pulled out and cross-sectioned, assayed at the vial bench, sealed into the tin and pouch, and finally dispensed into the indexing tray, which is the "add to cart" moment.

## Run it

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # production build in dist/ (models as separate .glb files)
npm run build:preview  # self-contained build: relative paths, models inlined into the JS
npm run typecheck
```

Every push to `main` builds the site and publishes it to the `gh-pages` branch (`.github/workflows/pages.yml`), which GitHub Pages serves at `https://<owner>.github.io/<repo>/`.

Add `?test` to the URL to expose the live scroll state as `window.__lab` (used by the headless screenshot checks).

## Stack

| Layer | Library |
| --- | --- |
| Build | Vite 8, TypeScript 7 |
| UI | React 19 |
| 3D | three 0.186, @react-three/fiber 9, @react-three/drei 10 |
| Post | @react-three/postprocessing 3 (bloom, depth of field, ACES tone mapping) |
| Scroll | GSAP 3 + ScrollTrigger (with @gsap/react), Lenis smooth scroll |
| State | zustand 5 for UI and cart; a plain mutable `lab` object for per-frame values |
| Models | Blender → glTF → gltf-transform (meshopt compression) |

Vite and React were chosen so the code can move into Shopify Hydrogen (also Vite + React) without a rewrite if Shopify is the route.

## Layout

```
src/
  App.tsx            wires scroll, cart and every layer together
  state/lab.ts       `lab` (read every frame) and the `useUI` store
  state/scroll.ts    Lenis + ScrollTrigger; writes chapter/card progress into `lab`
  data/formulas.ts   the four formulas, twelve ingredient vials, chapter list
  three/             the WebGL scene
    Experience.tsx   Canvas, environment, fog, Suspense for the models
    CameraRig.tsx    camera rail: one pose per chapter, view offset beside the copy
    rail.ts          the rail itself (`poseFor`, per-chapter travel and phone distances)
    Swarm.tsx        500 instanced capsules morphing cloud → lattice → helix → torus → sphere
    Specimen.tsx     hero capsule: extraction, clip-plane cutaway, powder, laser scan
    Bench.tsx        vial rack, ampoules, dropper rig, scan beam
    Pack.tsx         tin and foil pouch (drag to turn the pouch)
    Tray.tsx         30-well dispensing tray that fills as you add formulas
    Lab.tsx          room: floor grid, ceiling bars, bench, wall plates
    Effects.tsx      post-processing
  ui/                DOM layer: chapters, header/rail/HUD, cart drawer, dispense record
  commerce/          cart adapters (see below)
  audio/sound.ts     tiny WebAudio blips, off by default
blender/
  build.py           builds every model from code in Blender (units: cm)
  source/*.glb       raw Blender exports
scripts/
  optimize-models.mjs  compresses blender/source → src/assets/models
```

## Commerce: emulated for now

All cart calls go through one interface, `CommerceAdapter` in `src/commerce/types.ts`. The backend is picked by `VITE_COMMERCE` (copy `.env.example` to `.env`):

- `mock` (default): an emulated cart in `localStorage` with fake latency. Checkout shows a "checkout is emulated" note.
- `shopify`: a Storefront API adapter (`cartCreate`, `cartLinesAdd/Update/Remove`, products with a `custom.code` metafield). It is a placeholder that has not been run against a real store yet. Fill in `VITE_SHOPIFY_STORE_DOMAIN` and `VITE_SHOPIFY_STOREFRONT_TOKEN` to try it.

Any other platform (Stripe, Medusa, a custom API) only needs a new file that implements `CommerceAdapter`.

## Models

1. Edit `blender/build.py` and run it in Blender (or `blender --background --python blender/build.py`). It exports to `blender/source/`.
2. `npm run models` welds, quantizes and meshopt-compresses them into `src/assets/models/`.

Quantization bakes an offset and scale into node transforms, so animation code always moves parts relative to their loaded position rather than setting absolute values.

## Notes

- Phone layout uses a longer camera distance per chapter and a softer floor grid; both live in `rail.ts` and `Lab.tsx`.
- Performance has only been checked in headless Chromium (software GL). Check on a real phone before launch; `AdaptiveDpr` will lower resolution when frames drop.
