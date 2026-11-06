# PR6 v13 · Institutional portal

Built from v12 (Raking Light) after lu approved the proposal doc "PR6: institutional research supplier"
(https://claude.ai/artifact/6AVuhh8suNhe418JmQPFHC) with "okay let's do it" (Nov 1 2026).

## What it is
A private portal for institutions (labs, universities, companies) that PR6 has vetted in person. No sign-up.
The decoy front stays: Object 0047, code 0047RSRV, or the Members sign-in.

## Kept from v12
- The relightable Cycles renders (six light-group passes mixed in WebGL, js/light.js), the ink pass on the label.
- Slide-4 product panel with the picture in the disc, phone thumb bar + More sheet + top-line Back.
- Type scale (six sizes, two weights), palette, night register for Field Club.

## Changed
- Products: sealed 2R lyophilisation vials (blender/vials.py, render_vials.py): vial_hero, pair_hero (5 mg + 10 mg), lineup (nine vials, one per area). Ink = lot + HPLC purity.
- Catalogue by research area (never by effect): 01 Reference standards … 09 Cellular ageing. Catalogue numbers PR6-C-NNNN.
- Compound record: identity, this lot, CoA/SDS/HPLC/MS sheets (placeholder layouts, labelled), storage and handling, references (cited only), research-use-only statement.
- Quote List replaces Protocol: quote request → PR6 confirms → institution's PO → lot ships with CoA + SDS, invoiced on account terms (EFT/wire).
- Account pages: Dispatches (quotes + POs), Institution Record, References, New Entries, Member Liaison; The Dossier lists every lot's paperwork.
- Field Club: notices only (new lots, new entries, document updates, dispatch windows). No reviews.

## Removed
Protocols/subscriptions, dosing, effect copy, reviews, Nominations, Your Cabinet, Field Notes, the NFC key, wellness formats (tins, pouches, jars).

## Sample data
Every compound, lot, purity, price, institution and order is placeholder data (js/catalog.js, js/content.js) and is marked "Sample" on screen. The owner supplies the real list, CoAs, SDSs, prices and the testing lab's name.
