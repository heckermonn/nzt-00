# PR6 / Alley

Isolated prototype (Nov 9 2026). The visitor starts outside PR6, in a wet, failing near-future service alley, and is
let in only with an invitation code. PR6 is not advertised; it is discovered.

## Sequence

1. **Black.** One button (with sound, or in silence). Footsteps before anything is seen.
2. **Reveal.** Each footstep brings one light up: crimson rain light on the wet ground, the steam plume, the stained
   concrete, the cool fill on the steel doors, a failing fluorescent tube, the pink haze of the cross street with a
   figure standing in it, a half-dead electronic sign, then the hologram.
3. **The hologram.** An original, androgynous head drawn only as broken scan lines (`js/holo.js`, signed distance
   fields, no reference face). It says four lines, turns to look at the visitor on the third, and loses signal.
   No product, no claims, no explanation on this screen.
4. **The walk.** Scroll, swipe, arrow keys, or press and hold to walk to the single lit door (16 Cycles camera
   positions, crossed with a zoom per step).
5. **The threshold.** A small terminal beside the door: SUBJECT IDENTIFICATION / CLEARANCE REQUIRED / ENTER ACCESS
   CODE. Wrong code: SUBJECT NOT RECOGNIZED. and nothing else. Right code (`0047RSRV`): the city's sound stops in one
   sample, the rain freezes, the door slides open, white.
6. **Inside.** A long, dry, bright locker-room corridor in the brand kit (chalk, mist, steel blue, orange as a tick
   only, Helvetica and Menlo clones). The ceiling switches on bank by bank. Walk to locker 0047; a slide-4 frosted slab
   says the place is held and hands over to the store (`../form/?key=0047RSRV`).

## How it is made

- `blender/alley.py`, `blender/corridor.py`: path-traced scenes. Every lamp sits in its own Cycles light group, so the
  page can turn lights on one by one and flicker them live. `run.sh` / `run_corridor.sh` render (resumable).
- `blender/post.py`: each light-group pass is stored as luminance plus a tint, three passes per webp.
- `js/scene.js`: WebGL mixer (weights, tints, rain, steam drift, grain, two frames at once for a step).
- `js/sound.js`: all sound is synthesised in WebAudio (no recordings): rain, rumble, machinery, the tube's buzz,
  the hologram's carrier, wet footsteps in a narrow alley, the terminal, the door's hiss, the dry room inside.
- Review shortcuts: `?at=walk`, `?at=door`, `?at=inside`; grade overrides `?expo=1.1&w=crimson:.8`.

Mood reference only: a still of a film hologram. Nothing here copies a film's face, city or type.
