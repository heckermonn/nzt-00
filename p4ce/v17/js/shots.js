/* PR6 v17 · which photograph goes where.
   The renders (assets/light/manifest.json, from blender/render_vials.py) are the v12 pale set and six light groups
   with lyophilisation vials: vial_hero (PR6-C-0103, portrait 4:5), pair_hero (the 5 mg and 10 mg of PR6-C-0201) and
   the lineup (nine vials, one per research area). Each shot names the one compound whose label and ink it carries.
   Honestly: any other compound's page shows the vial render with the ink switched off (another lot's figures must
   never appear on it) and gives its own lot facts in the mono line under the picture. */
import {AREAS, byId, ALL} from './catalog.js';
import {loadManifest, manifest, shotFiles, hasShot} from './light.js';

export const PACKS = ['vial'];
export const packOf = () => 'vial';
const S = {ready: false, real: false};
const POSTER = 'assets/light/vial_hero/poster-m.webp', BLANK = 'assets/light/vial_blank/poster-m.webp';

/* the lot facts for the mono line and the ink: "LOT 2601-C · HPLC xx.x% · CoA 9 Oct 2026" */
export function inkLine(p) {
  if (!p) return '';
  return `${p.lot} · HPLC ${p.purity} · MS confirmed · tested by ${p.tested}`;
}

async function prepare() { const m = await loadManifest(); S.real = !!m; S.ready = true; return S; }
export const ready = prepare();

export function shot(name) {
  if (S.real && hasShot(name)) { const f = shotFiles(name); if (f && (f.passes || f.poster)) return f; }
  return null;
}
const still = () => ({name: 'vial_still', poster: BLANK, passes: null, product: null, still: true, mix: {}, scale: []});
/* the vial render for a compound. Only a shot whose printed label names this compound may show it (vial_hero is
   PR6-C-0103; pair_hero is PR6-C-0201 and 0202, for area 02); every other record gets vial_blank, the house vial
   whose label names no compound, so no page ever shows another compound's number. o.area: an area page's hero. */
const names = s => (s && s.packs ? s.packs.map(q => q && q.id).filter(Boolean) : []).concat(s && s.product ? [s.product] : []);
export function forProduct(p, o = {}) {
  const pair = shot('pair_hero'), hero = shot('vial_hero'), blank = shot('vial_blank');
  let s = null;
  if (o.area && pair && names(pair).includes(p.id)) s = pair;
  else if (hero && hero.product === p.id) s = hero;
  else s = blank || still();
  const own = !!(s && s.product && s.product === p.id && s.passes && s.passes.ink);
  return {pack: 'vial', shot: s, own, poster: s.poster || BLANK};
}
export const heroFor = () => shot('vial_hero') || still();
export const posterFor = id => { const p = id && byId(id); return p ? forProduct(p).poster : (((shot('vial_blank') || {}).poster) || BLANK); };
export function lineup() { return shot('lineup'); }
/* v15: the counter set for a research area (its compounds, 5 mg and 10 mg vials, side by side): shelf_<area> */
export function shelf(c) { return shot('shelf_' + c); }
export function productOf(s) { return (s && s.product && byId(s.product)) || ALL[0]; }
/* the nine lead vials, in catalogue order */
export const leads = () => AREAS.map(a => a.it[0]);
export const status = () => ({manifest: S.real, shots: S.real ? Object.keys(manifest().shots) : []});
