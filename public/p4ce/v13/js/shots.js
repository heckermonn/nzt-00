/* PR6 v13 · which photograph goes where.
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
const POSTER = 'assets/light/vial_hero/poster-m.webp';

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
const still = () => ({name: 'vial_still', poster: POSTER, passes: null, product: null, still: true, mix: {}, scale: []});
/* the vial render for a compound; o.pair for the two-size shot on an area page */
export function forProduct(p, o = {}) {
  const s = (o.pair && shot('pair_hero')) || shot('vial_hero') || still();
  const own = !!(s && s.product && s.product === p.id && s.passes && s.passes.ink);
  return {pack: 'vial', shot: s, own, poster: s.poster || POSTER};
}
export const heroFor = () => shot('vial_hero') || still();
export const posterFor = () => { const s = shot('vial_hero'); return (s && s.poster) || POSTER; };
export function lineup() { return shot('lineup'); }
export function productOf(s) { return (s && s.product && byId(s.product)) || ALL[0]; }
/* the nine lead vials, in catalogue order */
export const leads = () => AREAS.map(a => a.it[0]);
export const status = () => ({manifest: S.real, shots: S.real ? Object.keys(manifest().shots) : []});
