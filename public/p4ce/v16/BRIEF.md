# PR6 v16 · Landing, Series, editorial compound page, turn the vial

lu (Nov 3 2026): the site lacked a hero (it jumped straight into the catalogue); use keynote slide 1 as the landing,
with the background cells migrating and dividing like a lava lamp. Owner: catalogue more spaced out and named
differently (lu picked "Series 01 to 09"). Then: more editorial/raw brutalist, owner references Abel fragrance's
product page (keep slide 4 for the product), and another interaction than the light, which is hard to see on a phone.

- Landing: js/cells.js (metaball shader + small sim: cells drift, divide, merge; nuclei; grain). It covers the
  Atlas after the gate and when the PR6 mark is pressed on the Atlas; scroll, swipe, a key or ENTER divides every
  cell at once and the Atlas runs its intro.
- Naming: catalog.js AREAS n = "Series NN", f = the old field of study (shown as a small line).
- Catalogue (#/catalogue): editorial bands, one per Series: big number, field, compounds as mono rows, the series
  counter set as the picture; bands alternate sides; hairline rules with mono labels at both ends.
- Compound page: Abel-style split screen. Left: the vial to turn (js/turn.js, 32 path-traced frames from
  blender/turntable.py, drag or arrow keys, slow idle turn, angle readout). Right: the slide-4 frosted panel with the
  buying fields. Then a mono-capitals statement beside the kit macro, the record as tabs (mono tabs left, rows
  right), and the series side by side (a still now).

---

# PR6 v15 · The compound page as slide 4, and the counter set

lu (Nov 3 2026): the compound page looked disjointed (slide-4 panel on top, a plain chalk record below); style the
whole page like the kit's slide 4, and bring back products standing side by side like the Aesop reference.

- Everything in v14 stays (gate, Atlas film home, portal). Only the compound record and the area pages change.
- Counter sets: blender/render_vials.py `shelf_NN`, one per research area: the area's three compounds, each in a
  5 mg vial and a larger 10 mg vial, one on a low chalk plinth, two matte spheres, set to the right of a 2:1 frame
  so type sits in the empty sweep at the left (the Aesop layout). Same pale set and six light groups as v13, so it
  relights under the hand. Render: /tmp/claude-0/v15shelf.sh (resumable), then post.py (shelves count as lineups:
  mask value = 25 * vial index; set_box in the manifest).
- Compound page: the slide-4 hero panel, then the counter set (hover a vial or a name: that compound's pair comes
  forward, the rest recede; click opens its record; this record's vial is tagged), then the record as more slide-4
  panels on Stage Mist: PR6 / IDENTITY, THIS LOT (with CoA, SDS, HPLC, MS as debossed tiles), STORAGE AND HANDLING,
  REFERENCES, RESEARCH USE ONLY, and a sticky PR6 / QUOTE LIST panel (size tiles, vial count, black pill, total).
- Area pages: the counter set is the hero (type left, set right; on a phone the set sits under the type).

---

# PR6 v14 · The Atlas, then the portal

lu (Nov 2 2026) approved bringing the v9 Atlas film back as the first screen after the gate, with the v13
institutional portal behind it. lu liked the original Atlas best.

- Gate: unchanged (Object 0047, code 0047RSRV, Members sign-in). Invite-only, no sign-up.
- `#/` is the Atlas film (js/film.js from v9): one path-traced camera move past nine still lifes. Scroll, swipe, drag,
  keys or the marks move it; it rests on a station. The type names the research area (never an effect).
  Tap the frame or ENTER: the frame pushes in and `#/a/NN` opens.
- The film was re-rendered (blender/film/, from v9's film.py) with the same set, light and camera, but every
  supplement pack is now that area's sealed vial (v13 vialkit, printed label, no ink) and every pill-like prop is a
  plain clay sphere. Frames: assets/film/{d,m}/NNN.webp, station stills, manifest (+ v9-style warp).
- Everything behind it is v13: catalogue (`#/catalogue`, the relightable vial hero and lineup), area pages, compound
  records with CoA/SDS/HPLC/MS, quote list, Dossier, account pages, Field Club notices. All compound data is SAMPLE.
