# PR6 / Institute (v18)

The site described in "PR6: A New Dimension of Human Possibility" (working blueprint v1.0, 14 Nov 2026), built as a
static prototype. One change from the document, on lu's instruction: **the colours are the original PR6 kit palette,
not the palette in the blueprint.**

Live path (once on Pages): `/p4ce/v18/`. No build step: plain ES modules, open `index.html` from any static server.

## What is here

| Blueprint screen | Route | Notes |
| --- | --- | --- |
| A01 Invitation Entry | `#/` | Code form, QR only brings you to this page. Five unknown codes pause the form. The invitation is a physical card, so the page never draws one or names its seal: when the code is accepted the two doors, dark until then, come on under their lamps. |
| A02 Rain Alley, two doors | `#/alley` | Doors are real buttons, named with the insignia in words (on a phone there are also plain Left door and Right door buttons). The visitor matches the seal on the card in their hand. "My seal is hard to make out" names the recorded seal in words and links to a person. Positions vary per visit. |
| A03 Confirmation | `#/alley` | Nothing is recorded until "Open this door". |
| A04 Access Denied | `#/alley` | 24 hour rest, states when it lifts, links to a person. Doors may trade places after. |
| A05 The Keeper | `#/keeper` | Captions for every line, Continue, optional answer, Skip to the application. |
| A06 Application | `#/apply` | Age and Canada eligibility, password, optional passkey offer. |
| A07 Review Status | `#/status` | Received, in review, question, decision. Approval is separate from the door. |
| A08 Member Acceptance | `#/offer` | Offer, generation, founding rights (marked proposed), two explicit acceptances. The door answers (below). |
| A09 Film | `#/passage` | One living cell, nine signs. The member's door opens on darkness, and a bright drop is waiting behind it: soft, never still, with a heart in it, like the cells on the first page of the kit. The camera follows it down the passage in one take. In each of the nine bays the drop gathers itself into one sign of something people worked out (tools, fire, agriculture, mathematics, medicine, engineering, flight, computation, space), holds it, and lets go; each sign is larger than the last and comes sooner. In the dark the cell is the light; as the passage grows and pales it becomes a body of deep blue that the day shines through. In the Atrium it makes a tenth sign, the member's own insignia, then clears like water and goes on ahead into the round light at the far end. The film ends in the Atrium. Captions give the era, a line and an approximate date. Space pauses, arrows step from sign to sign, Skip or Esc hurries the same film. Direct mode shows the nine as a page. The steles that stood in the passage are put away (`W.steles`). |
| A10 Atrium | `#/atrium` | "What are we pursuing today?" Three destinations plus routine links. |
| A11 Compass | `#/compass`, `#/compass/index`, `#/compass/edit` | The wayfinder: the member at the centre of a compass card, every place on a bearing around them (below). The five optional questions are now the reading index. Never maps a goal to a product; fails closed. |
| A12 Formulary | `#/formulary`, `#/formulary/NN`, `#/record/ID` | Search, status, structured records, checks before any order. |
| A13 Member Archive | `#/archive` | Record, insignia (history kept apart from PR6 meaning), card, tokens, standing, rights. |
| A14 Nominations | `#/nominations` | Five lifetime, single use, withdraw returns unused ones, no promise of admission. |
| A15 Orders & Support | `#/orders`, `#/order`, `#/support` | Plain pages, no 3D needed. |
| also | `#/sign-in`, `#/account`, `#/library`, `#/dispatches` | Member number is refused as a credential. |

Two ways through the same site, as the blueprint asks:

- **Explore**: one continuous 3D building. Every change of screen is a camera move through it (alley, door, passage,
  Atrium, the three rooms); pages slide in beside the picture. There are no cross-fades between pictures. Optional
  sound, off until switched on.
- **Direct**: still pictures and instant pages. Chosen automatically when the device asks for reduced motion, or from
  the menu (Movement).

## Institutions only, and the real catalogue (24 Nov)

PR6 supplies laboratories and institutions, so the check happens before the Formulary opens, not after an order.

- **Application (A06)** asks for a work email (personal mail domains are refused), the institution, its kind,
  department, the applicant's role, the institution's website, a person there who can confirm it, and the research the
  materials are for. Three statements must be true: of age and authorised to order, institution in Canada, laboratory
  research only with no use in people or animals and no resale.
- **Review (A07)** shows the institution on the application and "verification in progress". An application with no
  institution cannot be approved (`store.decide`), and `store.member()` returns nobody unless the member's
  institution carries a verified date, so the shop, prices and bag are closed until a reviewer has confirmed it.
  Members made before this change are signed out by that rule; use Reset in the Prototype panel.
- **Orders** ship to the verified institution, take an optional purchase order number, and record the institution.
- **Compass** questions ask what the group studies (fields of research), not what a person wants for themselves.
- **Catalogue** (`js/catalog.js`, `LIST`): the owner's list of 24 Nov 2026 at the 20% margin, 61 compounds and 118
  strengths in CAD. The waters and injection pens on that list are not sold. Which Series a compound sits in, its
  class and its form were assigned for this build and are for PR6 to confirm; LC120, LC216, LC600, Lemon Bottle and
  Cerebrolysin are marked "form to be confirmed". Lots, certificates, test dates and bracketed values are not yet
  supplied.
- **Pictures**: `blender/labels.py` prints a label for every record; `blender/relabel.py` wraps each label onto the
  path-traced vial picture of its Series (three base pictures per Series, reused in turn after the third record).
  The three vials standing in each case in the 3D room are the first three records of that Series.

## Getting around inside (store navigation, 24 Nov)

Once a member is inside, the site is laid out like a shop, because the rooms and the Compass alone were hard for
ordinary visitors to find their way around. The entry (code, alley, Keeper, application, film) is unchanged.

- **One fixed header on every inside page**: Menu, PR6 (home), Shop, Dispatches, Support, then Search, Account and
  Bag with its count. On a phone it is Menu, PR6 in the centre, Search and Bag; there is no bottom bar any more.
- **Menu** (also opened by Shop): a sheet with four columns, Shop, Series, Account and PR6, the search field, and
  the sound and movement settings. `/` opens search from anywhere. Search still never maps a goal word to a record.
- **Home** (`#/atrium`): the Atrium picture as the hero with "What are we pursuing today?", then Ready to order,
  the nine Series as tiles, the member's own places (Bag, Orders, Nominations, Membership), Dispatches and a footer.
- **Shop** (`#/formulary`): every record as a picture card under its Series, with search (status filters appear
  only when records differ in status). A Series page (`#/formulary/NN`) is a card grid with previous and next Series. Records carry breadcrumbs: Shop / Series / name.
- **Bag** (`#/order`) is the old order list under a plainer name. A record that has not been reviewed still cannot
  reach it.
- **Account pages** (Membership, Orders, Nominations, Saved, Reading guide, Settings) share one row of links.
- The Compass wayfinder is still at `#/compass` but nothing depends on it; the reading guide lives under Account.

Code: header and menu in `index.html` and `js/main.js` (`chrome`, `menuCols`, `openIndex`, `ACCOUNT`); home, shop and
the product card `pcard` in `js/inside.js`; styles under "the store (inside)" in `app.css`.

A device without WebGL 2 gets the earlier Cycles stills of the same rooms, with the same controls (`?still` forces it).

## Palette (kit in place of the blueprint's)

| Blueprint | Used here |
| --- | --- |
| Oxblood invitation | Not drawn on the site: the card is physical. The kit's reading for print is an Ink `#171C1F` card, a Deep Blue `#3F668F` wax seal and a Safety Orange edge |
| Violet Keeper | Sky `#A5C7DB` hologram that warms slightly when speaking |
| Stone, titanium, bone | Chalk `#F2F3EF`, Mist `#CAD5DA`, Steel `#718B9A` |
| Night alley | `#0B0E10` with the kit's cool grade |
| Accent | Safety Orange `#E98546`, under 1% of any screen: arrows, ticks, the invitation edge, error rules |

The colours live in the `:root` block of `app.css` and in the materials at the top of `blender/common.py`. A different
reading (for example a warmer Keeper) is a small change plus a re-render of the frames that show it.

## What is simulated

There is no server. Everything a server would hold lives in the browser's localStorage under `pr6.v18`
(`js/store.js`), so nothing here is a security boundary and nothing is sent anywhere. Simulated: invitation records
and assigned symbols, door order, the 24 hour rest, applications and review, acceptance and member numbers,
sign-in, orders, nominations, the audit log. The **Prototype** panel (bottom left; on a phone top left outside, and under More inside) stands in
for staff: approve or decline an application, lift the rest, move an order along, sign out, reset. Because there
are no printed cards for the sample invitations, it also names the seal each one's card would carry.

Demo invitations: `0047RSRV` Ouroboros, `7K2MQ9DX` Djed, `R4VN81TC` Scarab, `H6PZ3W5L` Shen Ring.

Catalogue records, prices, lots, dispatches and library entries are **sample data** shaped like the real thing
(`js/catalog.js`). No record makes a health claim, and a record can only be ordered when every compliance check is
on file.

## Against the blueprint's acceptance checklist

Done in the prototype:

- Both doors keyboard and screen-reader accessible; positions vary without changing the correct symbol.
- Confirmation before the choice is recorded; a human recovery route from every dead end.
- Wrong-door rest implemented, and staff can lift it (policy still has to approve it, or it comes out).
- Keeper captions, skip and hand-off to the form; approval separate from the door.
- Member number never accepted as a credential; account recovery never asks for the metal card.
- Direct navigation from every room; orders and support need no 3D.
- One shared site; the personal insignia persists in the bar, the Archive and the invitation.
- Compass optional, editable, explains why each item is shown, and shows no product for a goal.
- Records that fail a compliance check cannot reach checkout.
- Founding rights listed as explicit entries, each marked proposed.
- Reduced-motion and no-3D routes complete; semantic HTML; sound off by default with a control; captions.
- The Keeper is an original figure (a pair of eyes drawn in light), not the film reference.
- Historical meaning of each symbol kept apart from what PR6 means by it.

Needs PR6 or a real backend:

- Server-side invitation state, authentication, passkeys, rate limits, audit logs.
- Final insignia masters (the four here are original drawings in `js/insignia.js`, to be replaced or approved).
- The Keeper's final voice (lines are from the copy bank; no recorded voice yet).
- The real catalogue, evidence, labelling, prices, supplier traceability.
- Regulatory review of what may be sold, and to whom; privacy, retention and breach documents.
- Financial and legal sign-off on every founding right.
- Measured render budgets on real phones and GPUs (tested here in headless Chromium with software rendering only).
- Payment. The order page stops at "order placed" with no card form.

## The 3D world

Three.js r180 (vendored in `vendor/`, loaded through the import map in `index.html`; no build step). The building is
real geometry in one coordinate frame, and its light is path-traced in Blender Cycles and baked into textures, so
the page draws it with no lights of its own and it still reads as the Cycles picture from any camera position.

- `js/world.js`: loads each zone (`assets/world/<zone>.glb`, `<zone>.json`, `<zone>_<group>_*.webp`), the shaders
  (baked colour times baked light, per-lamp light for the alley's flicker, fog, exposure, tone curve, grain), wet
  floor and pool reflections from a mirror pass, rain, the doors, the Keeper in the slit, the
  Compass blades, the Formulary vials, the Archive stele, and the camera director (`W.fly`).
- `js/shots.js`: where the camera stands for each screen and the way it travels between rooms.
- `js/film.js`: A09. Everything is a function of one clock, so it can be paused and stepped. `js/cell.js` is the
  cell: not a mesh but a distance field, marched in the fragment shader inside a box that follows it (with
  `gl_FragDepth`, so walls hide it and it shows in the floor's mirror). The drop is five spheres that run into one
  another; each sign is the outline the page uses (`js/eras.js`, `js/insignia.js`) turned into a distance field once
  at load (canvas, then an exact distance transform, into one half-float atlas), given a body that is fuller toward
  its middle. `uForm` moves the surface from the drop to the sign, so the change is a change of shape and never a
  fade. Its colour is light let through a blue body (thin is pale, thick is deep) plus its own glow in the dark. It
  leads the walker at a set distance and waits at its place in each bay. A live point light (`W.light`) is its glow
  on the walls. `W.steles(false)` hides the nine steles and lays a patch of floor over each place one stood.
- `js/still.js`: the route without WebGL 2 (stills in `assets/scenes/`).

Zones: alley, passage (nine bays that widen from 1.7 m to 13 m, a stele in each), atrium, compass, formulary and
archive (these two stand directly behind their openings in the Atrium's far wall, and are hidden from the court
behind it, so a move never shows the outside of a room).

    cd blender
    PY world.py -- --zone alley --out ../assets/world --q 1 --samples 96     # one zone; about 15 to 40 minutes on 4 cores
    PY world.py -- --zone archive --out /tmp/try --q 0.25 --samples 8        # a two-minute look at a change
    PY eras.py                                                               # redraw the nine era emblems (before the passage)

`PY` is a Python with `bpy`, `numpy` and `pillow`. `world.py` builds a zone with the materials in `common.py`, sorts
its objects into groups, and `bake.py` turns each group into one mesh with one UV layout: `split` (colour and
light as two textures), `combined` (metal and small parts, gloss as seen from the room's camera), `relief` (the
insignia: baked from the sculpted relief, drawn as a flat sheet). The manifest is rewritten after every group, so a
half-finished bake leaves a partial `<zone>.json`; let a zone finish before loading it.

### A08: the door answers

The offer is made at the door the invitation opened, full screen. While it is read the rain stands still in the air
(`W.rainHold`: the weather has its own clock, `uWet`, so streaks, puddle rings and the tube's flicker all stop) and
the alley goes quiet. Each of the two agreements is one of the door's two bolts (`W.bolt(side, i, v)`): ticked, it
draws back; unticked, it shoots home. Accepting moves the camera to the steel plate under the seal and strikes the
member's nine figures into it one at a time (`W.plate(side, text)`, a canvas texture). Enter lets the rain fall again
and the film begins by opening that door. From then on a member's own door always shows drawn bolts and their number
(`app.scene` keeps it so); every other door stays bolted with a blank plate. The bolts and plates are not in the
baked stills, so without WebGL the offer is the plain page beside the door's picture; in Direct mode nothing
animates and the number is simply there. The figures are also in the page, and each bolt is announced.

### A11: the Compass, with the member at the centre

The Compass is how a member gets to where they want or need to be. The camera stands above and behind them; their
insignia is at the centre of the plinth, and the eight places of the institution (Formulary, Order list, Orders,
Support, Archive, Nominations, Reading index, Dispatches) lie on bearings around them.

- **Need.** `wayState` reads the member's record: items waiting in the order list, an order on its way, an open
  support request. The card comes to rest with the strongest call ahead, and a count sits beside that place.
- **Want.** "Say where": typing finds places (by name and plain words like refund, invoice, invite), records by
  name or number, cases, Dispatches by title and orders by number. The first match swings ahead; Enter goes.
  A goal word such as "focus" or "sleep" finds only the reading index, never a record.
- **Turning.** Drag or swipe the card, or use the arrow keys; it settles on the nearest place and the caption names
  it, says what it holds and offers one button. Every place is also a link in the picture, so one press goes.
- The ring of glass blades is the card (`W.compassHead` turns it, `W.compassPoint` raises the blades that stand
  ahead). Shot `wayfind`. Without the world the same thing is a page: the question, the field, and the places in
  order of what is waiting.
- The five questions moved to `#/compass/index` ("Reading index"). Their answers now also set the order of a
  record page.

### Records: the essentials first

A record page opens with its name, then size, quantity and "Add to order" beside its product picture. Everything
else (checks, identity, evidence, safety, quality, regulatory, commerce, field) folds below in the member's own
order: the reading index sets it (`REC_ORDER` by what a useful result looks like; safety first if they asked for a
safety overview; "detailed" opens every section, "concise" only the first), and "Show first" on the page overrides
it for every record (`recordFirst` on the member).

### The Formulary's cases and vials

Nine lit cases in a dark stone wall, one per Series. Each case holds its Series' three records as sealed glass
vials on a round stand; the stand turns so that the record being read stands at the front. Opening a record moves
the camera in on its case while its vial comes round. On a Series page the rows turn the stand (hover or focus);
on a record page the three records of the case are links, and the stand can also be turned by hand in the picture
(drag or swipe sideways; letting go settles on the nearest vial and opens its record). In Direct mode the stand is
simply in place. The links are always there, so the drag is never the only way.

- `blender/formulary.py`: the one builder of the wall, cases, stands and vials, used by the light bake (`world.py`)
  and by the path-traced pictures (`rooms.py`), so the two cannot drift apart. Vial profiles are life size and
  scaled by `S`; they travel to the page in the zone's manifest (`anchors.dims`).
- `blender/labels.py` + `blender/catalog.json` (dumped from `js/catalog.js`): each record's printed label, as PNGs
  for Cycles and as one atlas for the page (`assets/vials/labels.webp`, 3 columns by 9 rows).
- `js/vials.js`: the 27 vials as real geometry, lit by a path-traced panorama of what a vial sees from its stand
  (`formulary_env.webp` for reflection and refraction, `formulary_envd.webp` for matt surfaces; `blender/envmap.py`).
  The stands' tops are baked twice, with the vials and without (`formulary_pads_l` / `_pads_nov_l`), so their
  shadows can travel with the stand.
- `blender/vialpics.py`: the 27 path-traced product pictures (`assets/vials/<id>.webp`), shown on each record.

      PR6_LABELS=/tmp/labels PY rooms.py -- --out RAW --frame formulary_env --res 512 --samples 160
      PY envmap.py RAW/formulary_env ../assets/world
      PR6_LABELS=/tmp/labels PY rooms.py -- --out RAW --frame formulary_p0502 --res 760 --samples 96   # one product picture
      PY vialpics.py RAW ../assets/vials

Lessons kept in the code: a relief's flat sheet must sit in front of whatever stands behind it and the body behind
a sunk relief must start behind its deepest cut (the Archive stele was black until both were true); bind an empty
texture as the reflection while drawing the mirror pass (a feedback loop otherwise); keep meshes hidden until their
baked material is on (the glTF default material flashes grey).

The stills for the no-WebGL route come from the older scene scripts (`run_alley.sh`, `run_rooms.sh`, `post.py`).

Tested in headless Chromium with software rendering at 1440x900 and 390x844. Not yet measured on a real GPU or a
real phone: frame rate, texture memory and the look of the tone curve on a phone screen all need that.

Fonts are free stand-ins (see `fonts/LICENCE.txt`): FreeSans for Helvetica Neue, DejaVu Sans Mono for Menlo, FreeSerif
for the serif voice.
