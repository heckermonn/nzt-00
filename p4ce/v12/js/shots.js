/* PR6 v12 · which photograph goes where.
   The light agent's renders (assets/light/manifest.json) are made per pack format, not per product: tin_hero,
   pouch_hero, box_hero, dropper_hero, jar_hero (portrait 4:5, one family), optional disc_<pack>, the lineup (the nine
   lead packs in one row, one render) and optional night_tin. Each shot names the one product whose label and ink it
   carries ("product"). So, honestly:
   - a product page or a collection shows its format's render; when that render was made for another product, the
     ink is switched off (another product's ingredients must never appear on this one) and the facts are given in
     the mono line under the picture instead;
   - the collection lineup reuses the format renders, one per product, captioned with that product's own label note.
   A shot the manifest does not have falls back to its poster from the v11 render set (the same pale sweep, lit in its
   own scene, never composited), and with no manifest at all the fake passes in light.js stand in (development). */
import {CAT, ALL, byId, FORMATS, servingSize} from './catalog.js';
import {loadManifest, manifest, shotFiles, hasShot, fakeShot} from './light.js';
import {Q} from './util.js';

export const PACKS = ['tin', 'pouch', 'box', 'dropper', 'jar'];
export const packOf = p => FORMATS[p.g] || 'tin';
const V11 = pack => `../v11/assets/img/pack-${pack}-m.webp`;
const S = {fake: {}, ready: false, real: false};

/* the ink facts, from the catalogue only: "Creatine monohydrate 5 g · per 3 capsules · 180 capsules" */
export function inkLine(p) {
  if (!p) return '';
  if (p.top) return p.oth.replace(/\.$/, '');
  const act = p.act.filter(a => a.amt).map(a => `${a.name} ${a.amt}`);
  const per = (p.act.find(a => a.per) || {}).per || ('per ' + servingSize(p));
  return [...act, per, p.q].join(' · ');
}

async function prepare() {
  const m = await loadManifest();
  S.real = !!m;
  if (!m || Q.has('fake')) {
    /* development only: fake passes from the v11 pack renders, so the relight works before the renders land */
    await Promise.all(PACKS.map(async k => { try { S.fake[k + '_hero'] = await fakeShot(k + '_hero', V11(k), null); } catch (e) {} }));
  }
  S.ready = true;
  return S;
}
export const ready = prepare();

/* a shot by name: the real one when the manifest has it, else a fake (dev), else null */
export function shot(name) {
  if (S.real && hasShot(name) && !Q.has('fake')) { const f = shotFiles(name); if (f && (f.passes || f.poster)) return f; }
  return S.fake[name] || null;
}
/* the format render for a product (disc_<pack> first on the product panel, when there is one) */
/* a format the light renders do not have yet: its v11 still (the same kind of pale sweep, lit in its own scene),
   framed like the live pictures but not relightable */
const still = pack => ({name: pack + '_still', poster: V11(pack), passes: null, product: null, still: true, mix: {}, scale: []});
export function forProduct(p, o = {}) {
  const pack = packOf(p);
  const s = (o.disc && shot('disc_' + pack)) || shot(pack + '_hero') || still(pack);
  const own = !!(s && s.product && s.product === p.id && s.passes && s.passes.ink);
  return {pack, shot: s, own, poster: s.poster || V11(pack)};
}
export const heroFor = pack => shot(pack + '_hero') || still(pack);
export const posterFor = pack => { const s = shot(pack + '_hero'); return (s && s.poster) || V11(pack); };
export function lineup() {
  const phone = innerWidth <= 860;
  return (phone && (shot('lineup_m') || shot('lineup_phone') || shot('lineup_tall'))) || shot('lineup');
}
/* the product a shot was made for, or the first product of that format */
export function productOf(s, pack) { return (s && s.product && byId(s.product)) || ALL.find(p => packOf(p) === pack) || ALL[0]; }
/* the nine lead packs, in catalogue order */
export const leads = () => CAT.map(co => co.it[0]);
export const status = () => ({manifest: S.real, shots: S.real ? Object.keys(manifest().shots) : Object.keys(S.fake).map(k => k + ' (fake)')});
