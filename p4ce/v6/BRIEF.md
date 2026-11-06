# PR6 v6 · "The Index" · build brief (Oct 30 2026)

The brand is now **PR6** ("THE PRACTICE OF PROGRESS"), replacing P4CE. Same business, same private model, same products.
Brand kit: `/mnt/project-files/PR6.pdf` (11 slides; render pages with `pdftoppm` to look at them).
Proposal (approved direction): https://claude.ai/artifact/YLfoKbY1MnXuZ7CLQzdMCS

## Owner decisions (final)
- **Private site.** A guest sees only a decoy gate. Reuse v5's gate system (`../v5/js/gates/`, Object 0047 by default, code `0047RSRV`, `?key=0047RSRV`, `?gate` forces the gate, `#/exit` clears membership). Re-skin the gate's palette/type to PR6 but keep its mechanics. Opening it lands on the v6 Index (not the Atlas; the Atlas is dropped from v6).
- **Range: exactly the same.** 9 collections, ~50 products, copy from `../v5/js/catalog.js` (copy the file into v6 and adapt; do not edit v5).
- **Section names stay:** The Formulary, Your Protocol (cart + subscription), Dispatches, Nominations, Member Record, Your Cabinet, The Dossier, Field Notes, New Entries, Member Liaison, Your Key.
- **Field Club** = notifications and information only, including a **reviews** section. Not a membership tier. Name it "PR6 / Field Club".
- **Prices in CAD.** Convert the catalogue's numbers (currently USD) at ×1.38, rounded to whole dollars (placeholder prices until the owner sets real ones). Display "CA$42" (or "$42 CAD" in the cart total). Subscription price = the `ps` value converted the same way.
- **Fonts:** close free matches. Helvetica Neue → **Inter Tight** (wordmark 700–800, tight tracking) and **Inter** (body/headlines 400–500). Menlo → **JetBrains Mono** 400 (codes, labels, nav, prices). Google Fonts is fine.
- Kit images are concept art. Do not ship them; use real renders (being made in `assets/renders/`, see below) and stock photography (Unsplash, credited in `assets/CREDITS.md`).
- Ignore unplain. No effect claims. No syringe or injection imagery. Evidence copy must not invent studies.

## Brand
- Palette: Chalk `#F2F3EF`, Ink `#171C1F`, Mist `#CAD5DA`, Steel Blue `#718B9A`, Safety Orange `#E98546` (accent only: live states, ticks, a tab, an arrow; never large fills).
- Lines: "Progress, in practice." · "A higher daily standard." · "Go further. Together." · "Show up. Build together."
- Pillars: PRACTICE / INTENT / CONSISTENCY / COMMUNITY. Node diagram: rest, movement, nutrition, consistency, community.
- Labels in the kit: `PR6 / FIELD CLUB`, `SESSION 006`, `HUMAN / STUDY 009`, `DAILY / 01`, `RITUAL / 02`, `[+] EXPLORE`, `EXPLORE PR6 →` pill (black pill, orange arrow).

## References (what to take)
- liminalrep.com: near-empty white page, one row of tiny text per entry; hover reveals one image.
- lelism.com: giant mono wordmark, numbered list with coordinates.
- juliaplaza.com: full-screen film with a translucent mono index floating on top.
- abelfragrance.com: editorial store, big scenes, small mono caps labels, plain menu/cart.
- vtrshoes.com: nearly blank page, a thin vertical strip of greyscale product shots.
- Behance (contact sheets saved at `/mnt/user-data/uploads/nzt-00/refs/_sheets/*.jpg` if present): P01 = closest (teal-steel/mist gradients, motion-blurred athletes, brushed foil pouch, ribbed tin, mono caps system labels); Luna = frosted-glass panels over misty soft-focus photos; Way Lab = chalk/grey + one hot orange, thermal heat-map; 7PE = square dot grid; INN = blue motion blur, community; Hygico = light clinical site, thin grid lines.

## The store (v6)
One light space: chalk → mist, fine film grain, a faint square dot grid. Pages change by a frost blur; the chosen product stays on screen across the change. No slideshow wipes.
1. **Index (home, `#/`).** Huge PR6 wordmark + THE PRACTICE OF PROGRESS. Hero: a motion-blurred athlete photo (stock) behind frosted glass that sharpens as you scroll or as the pointer moves. Below: the whole range as a numbered JetBrains Mono index, one row per product: code (`03-1`), name, format, size, CA$ price, `[+]`. Grouped under the 9 collection headings (`01 FOUNDATION` …). Hovering/focusing a row brings that product's render up large behind the list on a mist gradient (Liminal/Julia). A toggle switches to a "Strip" view (VTR-style vertical strip of all product renders). Filter by collection via mono tabs.
2. **Collection (`#/c/04`).** Same index, filtered, with the collection descriptor (owner's wording, unchanged).
3. **Product (`#/p/04-1`) = The Dossier.** One object centred on mist (render still or turntable if frames exist). Frosted panel: COLLECTION / FORMAT / APPROACH fields like the kit, then serving, ingredients with amounts (table), directions, cautions, testing/sourcing (no invented studies), price one-off vs Your Protocol (subscription). Black `[+] ADD TO PROTOCOL` pill with an orange arrow. Related products from the same collection.
4. **Your Protocol (drawer).** Right-hand frosted drawer: lines as daily cards (`DAILY / 01`, `RITUAL / 02`), quantity, one-off vs subscribe with frequency, CA$ subtotal, "next dispatch" date. Persist in localStorage (`pr6.v6.protocol`). Reuse logic from `../v5/js/protocol.js` where useful.
5. **Field Club (`#/club`).** Notifications feed (restocks, new entries, session notes) and a reviews section (member reviews per product, star-less: mono rating `4.6 / 5`, short quotes). Mark sample content clearly as sample in code comments. Dark-ink section is allowed here only.
6. **Member pages** (`#/m/dispatches`, `cabinet`, `nominations`, `record`, `liaison`, `key`, `notes`, `new`): simple, practical, consistent shells; all one click away from a menu.
7. **Chrome:** top bar `PR6` mark left, mono nav (Formulary, Field Club, Field Notes, Member), Search, `Protocol (n)`. Everything reachable on phone.

## Renders
Real Blender (Cycles) renders are being produced in parallel into `public/p4ce/v6/assets/renders/` with `manifest.json` (one entry per pack type and view). Pack types by format:
- `tin`: Capsules, Tablets, Softgels → brushed-aluminium round tin, PR6 on the lid/side.
- `pouch`: Powder → brushed foil stand-up pouch (P01 style) with a white PR6 label.
- `box`: Sachets → white box with orange pull tab + two foil sachets.
- `dropper`: Serum → frosted steel-blue glass dropper bottle, black bulb.
- `jar`: Cream → frosted glass jar with brushed-aluminium lid.
Until they land, use a clean CSS/SVG placeholder per pack type; read the manifest at runtime and swap in real images when present.

## Tech
- Plain static files under `public/p4ce/v6/` (served on GitHub Pages at `/nzt-00/p4ce/v6/`). ES modules, no build step, like v5. three.js via the importmap only if needed (gate needs it).
- Hash routes as above. Test hooks: `window.PR6V6.state()`. Respect `prefers-reduced-motion` (`?rm`).
- Must work and look right at 1440×900 and 390×844. Verify with Playwright in the container (Chromium is preinstalled; `require('playwright')`), including gate → enter with `0047RSRV` → Index → product → add → Protocol drawer → Field Club.
- Add v6 to `public/p4ce/index.html` (the hub) as "PR6 v6 · The Index".
- British/Canadian spelling, plain words. Section names exactly as listed.
