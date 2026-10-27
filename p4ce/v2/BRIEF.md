# P4CE v2 — game front → access ritual → private world (shared brief)

Read this fully, then /home/user/nzt-00/p4ce/directions/BRIEF.md for the brand basics, the technical contract (file format, pinned CDNs, Google Fonts only, single-file, phone + desktop) and the screenshot harness. Everything there still applies unless this file overrides it. Also read /home/user/nzt-00/.claude/skills/impeccable/reference/craft-floor.md.

## The owner's vision (verbatim, 27 Oct 2026)
"The public-facing site should feel like a slightly unserious, mysterious interactive game. Something unexpected that makes people curious and encourages them to explore. It should have personality, with unusual interactions and subtle humour.
That experience would lead into the access process: an application for new visitors, or a login and invitation code for people who have been invited. Returning members should also have a straightforward way to log in.
Once someone gains access, the atmosphere changes. They enter a high-end, immersive private website. I like our existing hallway → room → locker sequence and want to build on that sense of travelling somewhere exclusive. The transition should feel like discovering an entirely different world.
Inside, the design should feel clean, futuristic, artistic, and captivating. Think sculptural forms, brushed metal, frosted glass, cinematic lighting, and carefully considered typography. The overall feeling is human potential, transformation, and pushing boundaries.
The private site also needs to be practical and comprehensive. Members should easily find every product category, their account, orders, subscriptions, saved products, and support. The immersive experience should work alongside clear navigation.
For product information, The Ordinary is a strong reference: what each product is, its ingredients and concentration, intended purpose, supporting evidence, directions, cautions, testing, and sourcing. The brand can feel mysterious, but the product information should be transparent and easy to understand."
Navigation terms: The Formulary (product collections) · Your Protocol (subscription) · Dispatches (orders and deliveries) · Nominations (referral invitations) · Member Record (account) · Your Cabinet (saved products) · The Dossier (ingredients, testing, sourcing) · Member Liaison (support).
Central idea: a playful entrance, a compelling access ritual, and a sophisticated private world behind it. Memorable and exclusive, yet browsing and purchasing stay intuitive.

## New mood board (owner's Pinterest, described)
Monochrome and greyscale with rare warm skin/amber tones. Human body as data: wireframe and point-cloud figures, x-ray spine, anatomical lungs with HUD labels, DNA helix in black line, a hand with measurement arcs ("HAND / SIZE 8"), a back with many arms (transformation), particle faces, eye macro shots with tiny HUD callouts, a figure dissolving into particles. Frosted glass and motion blur (blurred bottle behind frosted glass, "DROPPING 03.19.26" vertical type over a blurred object), a glowing frosted cube on black, a white room with a robotic arm in sand, a chrome helmet portrait. Embossed metal type ("humanoid", "NOT FOR EVERYONE"). Swiss/mono typography: tiny mono labels, wide tracking, vertical type, dot-matrix numerals, a tag that says "0058 / SCAN TO SEE THE MANUAL". Club-poster energy (dates, "YEAH—CLUB"), editorial serif accents ("COSE", "ARCILLA" display serif) used sparingly. Keep the acid yellow-green (#CCFF00) as the only accent, used rarely.

## Copy rules
Deadpan, dry, subtle humour on the public side (lab notes about the visitor, polite refusals, the site noticing what you do). Never silly, never memes, no emoji. Inside: discreet, precise, plain. No effect or health claims anywhere; category names don't establish effects. No needles/injection imagery. Evidence sections must NOT invent studies, authors, journals or numbers: write "Evidence summary: to be written and referenced before launch" plus a neutral one-line description of what the ingredient is (e.g. "Creatine monohydrate is one of the most widely studied sports nutrition ingredients."), and show the layout for references as empty labelled slots. Testing/sourcing likewise show the structure with "sample" values clearly marked (e.g. "Batch 0047-A · Certificate of analysis: sample").

## The access ritual (same rules in every front)
Three clear paths, always visible once the ritual starts:
1. **I have an invitation** → invitation code (accept any 8+ chars; demo code `0047RSRV` shown as a small hint) → create login (email + password fields, no real submission) → enter.
2. **Member log in** → email + password (any non-empty) → enter. Must be reachable in one click from anywhere on the public site (a small persistent "Members" link).
3. **Apply** → a short, characterful application (name, email, city, "Why now?" one line, how did you hear) → "Application received. We'll be in touch. Or we won't." style confirmation; no entry.
On success, set `sessionStorage['p4ce.v2.entry']='1'` and go to `enter.html`. Forms: `<form>` with submit handled in JS (preventDefault), labelled inputs with ids, visible errors that name the fix. No alert/confirm/prompt.

## File layout (all in /home/user/nzt-00/p4ce/v2/, relative links between them)
- `door.html`, `specimen.html`, `cube.html` — three public front directions (one builder each).
- `enter.html` — the transition: hallway → room → locker, then into the private world. Built by the private-world builder.
- `reserve.html` — the private site (hash routes). Built by the private-world builder.
- `index.html` — tiny chooser for lu (I write it).
Each file follows the artifact contract (starts with `<title>`, no doctype/html/head/body). Screenshots to /tmp/claude-0/p4ce-shots/v2-<name>/.
