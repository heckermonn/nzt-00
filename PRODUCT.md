# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of P4CE / RESERVE, a private, invite-only supplement membership. They return every few weeks to manage a subscription, reorder and read up. Guests arrive through a nomination and can look in but not buy. (Inferred from the brand brief, 2026-10-25: whether guests can browse the Formulary is still open.)

## Product Purpose

Sell P4CE supplements to members and make membership feel earned. Success is a member who opens the site with their key, adjusts their protocol in seconds, and wants to nominate someone.

## Positioning

Access, not just product. Every member holds an engraved NFC metal key (for example MEMBER 0047) that opens the site. No open-door supplement store can copy that ritual truthfully.

## Operating Context

- The physical key: an engraved metal NFC card sent with the invitation. Tapping it to a phone signs the member in. Android Chrome reads it in the page (Web NFC); iPhone opens the card's link from a system banner; a laptop pairs through the member's phone.
- Repeat visits matter more than the first: a returning member should be inside in about two seconds. The full airlock ceremony is a one-time induction for a new key.
- Commerce will most likely run on Shopify (undecided). The codebase has a `CommerceAdapter` with a mock in use.

## Capabilities and Constraints

- Collections: 01 FOUNDATION (everyday nutrition and essential support), 02 FORM (body composition and physique), 03 FORCE (strength and physical performance), 04 ENDURE (stamina and sustained effort), 05 RESTORE (recovery and physical maintenance), 06 FOCUS (attention and mental clarity), 07 STILL (calm, rest and sleep), 08 RENEW (skin, hair and appearance), 09 VITAL (healthy ageing and long-term wellbeing).
- Goal categories: Fat Loss & Body Definition; Muscle Growth & Strength; Recovery & Tissue Repair; Energy & Physical Endurance; Skin Quality & Rejuvenation; Hair Growth & Scalp Health; Sleep & Physical Restoration; Focus & Mental Performance; Libido & Sexual Wellness; Pigmentation & Tanning; Healthy Ageing & Cellular Function. The goal-to-collection mapping in code is a placeholder until the owner confirms it.
- Member sections (lu's proposed names): The Formulary, Your Protocol, Dispatches, Nominations, Member Record, Your Cabinet, The Dossier, Field Notes, New Entries, Member Liaison, Your Key.
- Formats include capsules, creams, ampoules and freeze-dried powder vials. The real product lineup is not known yet.
- Real key sign-in needs a backend (signed NTAG 424 DNA links checked server-side). Until then the prototype simulates the read, or accepts any NFC tag on Android.

## Brand Commitments

- Name: P4CE. Membership: P4CE / RESERVE. Credential wording: MEMBER 0047. (NZT-00 was the working name and is retired.)
- Look committed by lu: monochrome, futuristic, mechanical, measured, clean; a sterile lab; an experience like an art exhibition, not a slideshow of pages. Signal orange only for live states.
- No P4CE wordmark has been supplied; the display face stands in until one arrives.

## Evidence on Hand

No product photography, testing data, testimonials or press yet. Doses, prices and product names in the code are placeholders and must not be presented as real.

## Product Principles

1. The key is the way in. Make entry ceremonial once and fast every time after.
2. Exhibition for discovery, precise tools for running a membership.
3. Fewer objects, each built to be seen up close.
4. Describe, don't claim: no medical claims and no injection imagery, especially for tanning, tissue repair, libido and freeze-dried vials.
