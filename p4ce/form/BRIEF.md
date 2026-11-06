# PR6 / Form · slide 4 as the whole site, editorial and raw

lu (3 Nov 2026): slide 4 of the kit should set the design direction for the whole site, overdriven as a separate
prototype (v17 untouched). Owner also wants an editorial, raw look. Directions page:
https://claude.ai/artifact/5QBAk52GvNoRVfasaPK3nJ (lu picked 2, The form). Notes: notes/pr6-slide4-overdrive.md.

- Contrast is the idea: the site is a raw printed sheet (chalk paper, ink, hairlines, running head, folio,
  huge cropped numbers against tiny mono labels, images as FIG. plates, underlined links, pages cut with no fades).
  The slide-4 slab is the ONE polished object: only it has radius, gradient and shadow (compound page).
- Navigation is a form: a bar of fields (Series, Compound, Size, Quote list). Changing a field moves you. On a
  phone the bar sits at the thumb (Series, Compound, Quote).
- One authored motion: mono values type themselves into their fields; the lot's trace draws once (This lot tab).
- Compound page = slide 4: PR6 / SERIES NN, name, fields (Catalogue no., Format, Method), size tiles, a vial lying
  in the pressed disc (blender/disc_vial.py: top-down Cycles render, transparent film, shadow catcher, house
  vial with blank label + matte sphere), black ADD TO QUOTE pill with orange arrow. Then a raw record with tabs.
- Orange only as slash, arrow, focus, tab underline and SAMPLE tags.
- Data: js/catalog.js copied from v16 (SAMPLE). The HPLC trace is a drawn placeholder, labelled as such.
- Quote request never leaves the browser (prototype note shown on send). Gate: Object 0047, code 0047RSRV. Routes are plain hashes (#catalogue, #series-01, #c-PR6-C-0103, #quote, #record) so it also runs as a claude.ai artifact: https://claude.ai/artifact/83rcdjVg8Gw7gYni748G1H
- Series plates: v15 shelf renders converted to an ink/mist duotone with grain (assets/plates).
