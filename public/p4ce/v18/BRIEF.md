# PR6 / Institute (v18)

The site described in "PR6: A New Dimension of Human Possibility" (working blueprint v1.0, 14 Nov 2026), built as a
static prototype. One change from the document, on lu's instruction: **the colours are the original PR6 kit palette,
not the palette in the blueprint.**

Live path (once on Pages): `/p4ce/v18/`. No build step: plain ES modules, open `index.html` from any static server.

## What is here

| Blueprint screen | Route | Notes |
| --- | --- | --- |
| A01 Invitation Entry | `#/` | Code form, QR only brings you to this page. Five unknown codes pause the form. |
| A02 Rain Alley, two doors | `#/alley` | Doors are real buttons, named with the insignia in words. Positions vary per visit. |
| A03 Confirmation | `#/alley` | Nothing is recorded until "Open this door". |
| A04 Access Denied | `#/alley` | 24 hour rest, states when it lifts, links to a person. Doors may trade places after. |
| A05 The Keeper | `#/keeper` | Captions for every line, Continue, optional answer, Skip to the application. |
| A06 Application | `#/apply` | Age and Canada eligibility, password, optional passkey offer. |
| A07 Review Status | `#/status` | Received, in review, question, decision. Approval is separate from the door. |
| A08 Member Acceptance | `#/offer` | Offer, generation, founding rights (marked proposed), two explicit acceptances. |
| A09 Film & Passage | `#/passage` | Nine chapters drawn in one line. Pause, Skip, Esc. Direct mode shows a still list. |
| A10 Atrium | `#/atrium` | "What are we pursuing today?" Three destinations plus routine links. |
| A11 Compass | `#/compass` | Five optional questions, editable. Never maps a goal to a product; fails closed. |
| A12 Formulary | `#/formulary`, `#/formulary/NN`, `#/record/ID` | Search, status, structured records, checks before any order. |
| A13 Member Archive | `#/archive` | Record, insignia (history kept apart from PR6 meaning), card, tokens, standing, rights. |
| A14 Nominations | `#/nominations` | Five lifetime, single use, withdraw returns unused ones, no promise of admission. |
| A15 Orders & Support | `#/orders`, `#/order`, `#/support` | Plain pages, no 3D needed. |
| also | `#/sign-in`, `#/account`, `#/library`, `#/dispatches` | Member number is refused as a credential. |

Two ways through the same site, as the blueprint asks:

- **Explore**: rooms move, authored transitions, optional sound (off until switched on).
- **Direct**: still pictures and instant pages. Chosen automatically when the device asks for reduced motion, or from
  the Index (top right, or press `/`), which also lists and searches every room.

A device without WebGL gets the same frames as stills, with the same controls.

## Palette (kit in place of the blueprint's)

| Blueprint | Used here |
| --- | --- |
| Oxblood invitation | Ink `#171C1F` card, Deep Blue `#3F668F` wax seal, a Safety Orange edge |
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
sign-in, orders, nominations, the audit log. The **Prototype** panel (bottom left; top left on a phone) stands in
for staff: approve or decline an application, lift the rest, move an order along, sign out, reset.

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
- Measured render budgets on real phones (tested here in headless Chromium only).
- Payment. The order page stops at "order placed" with no card form.

## Pictures

Every scene is a Cycles render packed for a small WebGL shader (`js/stage.js`): steady light, up to three live light
groups, depth for haze and parallax, and small tiles pasted over a frame (each door's insignia, the shut slit).

    cd blender
    ./run_alley.sh      # alley, both doors close up, insignia and slit crops
    ./run_rooms.sh      # Atrium, invitations, Compass, Formulary, Archive
    PY post.py RAW_DIR ../assets/scenes     # RAW_DIR is where the two scripts wrote (OUT)

Both scripts skip finished frames, so they can be run again after an interruption. `PY` is a Python with `bpy`,
`numpy` and `pillow`. Two lessons kept in the code: call `view_layer.update()` before projecting a crop border
(a stale camera matrix gives "Image too small"), and keep the Keeper's light as a live group in the close frames
or its glow is baked into the door.

Fonts are free stand-ins (see `fonts/LICENCE.txt`): FreeSans for Helvetica Neue, DejaVu Sans Mono for Menlo, FreeSerif
for the serif voice.
