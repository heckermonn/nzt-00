# Product

<!-- impeccable:product-schema 1 -->
<!-- 31 Oct 2026. From the owner's brief, his decisions via lu (27–31 Oct), the PR6 kit and the v6–v9 briefs; no interview was held. Open questions are marked "Open". Visuals: DESIGN.md and the PR6 Source Board. -->

## Platform

web

## Users

- **Members.** Invited customers of a private supplement store. They arrive with a personal invitation (a numbered package and a metal NFC key tag, "Member 0047" style) and come back to reorder, manage a subscription, track deliveries and nominate others. They shop on their phones first.
- **Guests.** Anyone who finds the site without an invitation. They are meant to see only a decoy and learn nothing about the products.
- **The owner** decides direction, through lu, who runs the builds.

## Product Purpose

PR6 is a private, members-only online store for vitamins and supplements, sold one-off or as a recurring order. It exists to give a vetted circle a premium, discreet way to buy a fixed range, with product information as thorough as The Ordinary's. Success means members can get in, find any product, understand exactly what is in it and reorder quickly, in a store that feels like an experience.

## Positioning

- Invitation-only access through a physical key, with a decoy front. "The whole idea is to deceive the viewer" (owner, 28 Oct). Guests only see the decoy gate; members open it and are not checked again inside.
- A small, fixed range presented with full transparency: ingredients and amounts, format, serving, directions, cautions, testing and sourcing, with no effect claims.

## Operating Context

- **Access:** the decoy gate is Object 0047 (a frosted cube; align the 4), chosen by the owner on 28 Oct. A demo code (`0047RSRV`, or `?key=0047RSRV`) stands in for the NFC key in builds. The invitation package from the brief: a numbered outer box, a sealed metallic ACCESS pouch, a brushed-metal NFC key engraved with PR6 and the member number, and a welcome card reading "01 OPEN / 02 TAP / 03 ENTER".
- **Range:** exactly the same nine collections as before (owner, 30 Oct), about 50 products, in `public/p4ce/v9/js/catalog.js`. Collection descriptors are the owner's wording and stay unchanged:
  - 01 Foundation: Everyday nutrition and essential support
  - 02 Form: Body composition and physique
  - 03 Force: Strength and physical performance
  - 04 Endure: Stamina and sustained effort
  - 05 Restore: Recovery and physical maintenance
  - 06 Focus: Attention and mental clarity
  - 07 Still: Calm, rest, and sleep
  - 08 Renew: Skin, hair, and appearance
  - 09 Vital: Healthy ageing and long-term wellbeing
- **Formats:** capsules, tablets, softgels, powder, sachets, serum, cream.
- **Section names (unchanged, owner 30 Oct):** The Formulary (collections), Your Protocol (cart and subscription), Dispatches (orders and deliveries), Nominations (referrals), Member Record (account), Your Cabinet (saved), The Dossier (product information, ingredients, testing), Field Notes (guides), New Entries (new products), Member Liaison (support), Your Key (activate, replace or deactivate the key).
- **PR6 / Field Club:** notifications and information only, including a reviews section. It is not a membership tier (owner, 30 Oct).
- **Prices:** Canadian dollars (owner, 30 Oct), shown as "CA$42". Current numbers are placeholders until the owner sets prices. Each product has a one-off and a Your Protocol (subscription) price.
- **Product page:** the owner asked for it to be "as close to this" as possible, pointing at kit slide 4 (`public/p4ce/v7/ref/owner-product-page.jpg`). It carries COLLECTION, FORMAT and APPROACH fields and a primary ADD TO PROTOCOL action. The full Dossier follows below it.
- **Builds:** static ES-module sites, one folder per version under `public/p4ce/vN/`, served on GitHub Pages (https://heckermonn.github.io/nzt-00/p4ce/). The repository is public. Commerce (probably Shopify) comes later.

## Capabilities and Constraints

- A guest sees only the gate. The code check is client-side for now; real accounts, invitation status and key recovery are still to be designed (the brief notes NFC-only entry "might not be possible").
- Everything a member needs must be easy to find from anywhere: every collection, Your Protocol, Dispatches, Your Cabinet, Member Record and Member Liaison (owner vision, 27 Oct).
- The owner wants "some form of the Atlas" (an explorable world with nine stations, one per collection) back, and more motion across the site (30 Oct).
- Phones come first. v9 felt sparse and hard to navigate on a phone (lu, 31 Oct). Builds are checked at 390×844 before desktop.
- Fonts must be close free matches to Helvetica Neue and Menlo, with no licence purchase (owner, 30 Oct).
- The brand kit images are concept art. They can be used, but real renders and photography are preferred (owner, 30 Oct).
- Reference images (Pinterest, Behance, TikTok) belong to others and must never be committed to this public repository.
- **Open:** whether membership is free or paid; subscription terms, frequencies and cancellation; payment provider eligibility; real prices; final packaging; the authentication design behind the key; what APPROACH means for a real product (the kit uses pillar words like CONSISTENCY).

## Brand Commitments

- **Name:** PR6, "THE PRACTICE OF PROGRESS" (replaced P4CE on 29 Oct, which replaced NZT-00; the old names remain in repo paths). Kit: `/mnt/project-files/PR6.pdf`.
- **Lines:** "Progress, in practice." · "A higher daily standard." · "Go further. Together." · "Show up. Build together."
- **Pillars:** Practice, Intent, Consistency, Community. Node diagram: rest, movement, nutrition, consistency, community.
- **Field Club labels from the kit:** PR6 / FIELD CLUB, ID 006, SESSION 006, MEMBER EDITION, principle GO FURTHER / TOGETHER.
- **Voice:** discreet, concise and assured. Membership copy may create intrigue ("You have been selected", "Your place has been reserved", "Your next chapter is private"). Shopping instructions and product information stay plain and direct. British/Canadian spelling.
- **Copy cautions (binding):**
  - No effect claims. Collection names and descriptors describe where a product sits, not what it does. No "boosts", "burns", "heals" or "anti-aging" promises.
  - No syringe, needle or injection imagery, and no fill-line clinical scenes. Vials appear only sealed and capped.
  - No invented studies, trials, statistics, scores or testimonials. Evidence copy states only what is on hand, and sample reviews are marked as samples in code.
  - Limited availability may only reflect real capacity.
- The owner dislikes unplain; do not use it as a reference.

## Evidence on Hand

- Catalogue with ingredients and amounts for 50 products: `public/p4ce/v9/js/catalog.js`, with product copy in `content.js`. Prices are placeholders.
- Real Blender (Cycles) pack renders (tin, pouch, box with sachets, dropper, jar): `public/p4ce/v6/assets/renders/`. A path-traced studio film: `public/p4ce/v9/assets/film/`.
- The owner's brief (PDF): `/mnt/project-files/uploads/hearth/4ad9d0d4-1fd0-4981-b0e8-845667c5f54c`.
- **Not on hand, so never fabricate:** clinical studies, third-party test certificates, real member reviews, press, real prices, member numbers beyond the demo.

## Product Principles

1. **Private first.** Nothing about the range is visible before the gate, and nothing inside needs a second check.
2. **Easy beats clever.** Members must reach any product, Your Protocol or support in one or two taps on a phone. Experience never costs navigation.
3. **Transparent, not promotional.** Show exactly what is in each product and how to take it. Let the facts carry the premium feel.
4. **Same range, same names.** The nine collections, their descriptors and the section names are fixed unless the owner changes them.
5. **Real over generated.** Prefer real renders, photography and data to concept art and anything that looks AI-made.

## Accessibility & Inclusion

- Body text at least 16 px on phones, real contrast (WCAG 2.1 AA, 4.5:1 for text) on the light mist palette. lu found earlier collection pages hard to read on a phone.
- Respect `prefers-reduced-motion` (and the `?rm` flag in builds) for every scrubbed or animated moment.
- Touch targets at least 48 px; full keyboard access, including the gate.
