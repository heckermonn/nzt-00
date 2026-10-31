/* PR6 v10-glass (copied from v9) · the product renders.
   Real Blender (Cycles) renders are written in parallel into assets/renders/ with a manifest.json. They are made per
   pack type (tin, pouch, box, dropper, jar), not per product. The manifest's exact shape may vary, so it is read
   tolerantly: every image path anywhere in it is classified by its name ({pack}_hero.*, {pack}_mist.*,
   turntable/{pack}_NN.*), and an optional "formats" map (Capsules → tin …) overrides the catalogue's own.
   The manifest is trusted (no waiting on downloads); a render that fails to load is swapped for a clean SVG drawing
   of its pack type, and with no manifest every pack is drawn, so the store looks finished either way. */
import {FORMATS, byId} from './catalog.js';
import {esc} from './util.js';

const BASE = '../v6/assets/renders/';
const PACKS = ['tin', 'pouch', 'box', 'dropper', 'jar'];
const R = {manifest: null, fmt: {...FORMATS}, hero: {}, mist: {}, tt: {}, ok: {}, bad: {}, tried: false};
const IMG = /\.(webp|png|jpe?g|avif)(\?[^"'\s]*)?$/i;
const url = f => /^(https?:)?\//.test(f) ? f : BASE + f.replace(/^\.?\/?(assets\/renders\/)?/, '');

/* the documented shape: m.assets = [{type:'still', pack, variant:'hero'|'mist', url}, {type:'turntable', pack, frame_urls:[…]}].
   urls carry ?v=<hash> so caches refresh; they are used exactly as given. */
function fromAssets(list) {
  let n = 0;
  list.forEach(a => {
    if (!a || !PACKS.includes(a.pack)) return;
    if (a.type === 'turntable' && Array.isArray(a.frame_urls) && a.frame_urls.length) { R.tt[a.pack] = a.frame_urls.map(url); n++; }
    else if (a.type === 'still' && (a.url || a.path)) { const u = url(a.url || a.path); if (a.variant === 'mist') R.mist[a.pack] = u; else if (a.variant === 'hero') R.hero[a.pack] = u; n++; }
  });
  return n;
}
/* any other shape: every image path anywhere in it, classified by its file name */
function walk(v, out) {
  if (typeof v === 'string') { if (IMG.test(v)) out.push(v); return; }
  if (Array.isArray(v)) { v.forEach(x => walk(x, out)); return; }
  if (v && typeof v === 'object') Object.values(v).forEach(x => walk(x, out));
}
function classify(files) {
  files.forEach(f => {
    const name = f.split('?')[0].split('/').pop(), m = name.match(/^(tin|pouch|box|dropper|jar)[_-]([a-z]+|\d+)\b/i);
    if (!m) return;
    const pack = m[1].toLowerCase(), view = m[2].toLowerCase();
    if (/turntable|\/tt\//i.test(f) || /^\d+$/.test(view)) { (R.tt[pack] = R.tt[pack] || []).includes(url(f)) || R.tt[pack].push(url(f)); }
    else if (view === 'hero') R.hero[pack] = url(f);
    else if (view === 'mist') R.mist[pack] = url(f);
  });
  const num = u => +((u.split('?')[0].match(/(\d+)\.\w+$/) || [0, 0])[1]);
  for (const k in R.tt) R.tt[k].sort((a, b) => num(a) - num(b));
}

/* the manifest is trusted: no waiting for every hero to download. An <img> that fails is swapped for the drawing. */
async function load() {
  try {
    const r = await fetch(BASE + 'manifest.json', {cache: 'no-cache'});
    if (!r.ok) throw new Error(r.status);
    const m = await r.json(); R.manifest = m;
    if (m && m.formats && typeof m.formats === 'object') Object.assign(R.fmt, m.formats);
    if (!(Array.isArray(m.assets) && fromAssets(m.assets))) { const files = []; walk(m, files); classify(files); }
    PACKS.forEach(p => { R.ok[p] = !!R.hero[p]; });
  } catch (e) { /* no manifest yet: placeholders throughout */ }
  R.tried = true;
  return R;
}
const ready = Promise.race([load(), new Promise(r => setTimeout(() => r(R), 1500))]);

export const packOf = p => R.fmt[p.g] || p.pack || 'tin';
const okp = p => R.ok[packOf(p)] && !R.bad[packOf(p)];
export const Renders = {
  ready, PACKS,
  has: p => !!okp(p),
  hero: p => okp(p) ? R.hero[packOf(p)] : null,
  mist: p => okp(p) ? (R.mist[packOf(p)] || null) : null,
  frames: p => okp(p) ? (R.tt[packOf(p)] || []) : [],
  status: () => ({manifest: !!R.manifest, real: PACKS.filter(p => R.ok[p] && !R.bad[p]), broken: Object.keys(R.bad), frames: Object.fromEntries(Object.entries(R.tt).map(([k, v]) => [k, v.length]))})
};
/* a render that does not load: that pack type falls back to its drawing, here and from now on */
document.addEventListener('error', e => {
  const im = e.target; if (!(im instanceof HTMLImageElement) || !im.classList.contains('pk-img')) return;
  const pk = im.closest('.pk'); if (!pk) return;
  const isFrame = im.dataset.frame != null;
  if (!isFrame) R.bad[pk.dataset.pack] = true;
  const p = byId(pk.dataset.id);
  if (p) { pk.classList.remove('real'); pk.innerHTML = placeholderSVG(p); }
}, true);

/* ---------------------------------------------------------------- the placeholders: one drawing per pack type.
   Shared gradients live in one hidden <svg> (defs), so 51 placeholders on a page cost 51 small paths, not 51 copies. */
const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<linearGradient id="pkAlu" x1="0" x2="1"><stop offset="0" stop-color="#7d878c"/><stop offset=".07" stop-color="#b9c1c5"/><stop offset=".2" stop-color="#eef1f1"/><stop offset=".3" stop-color="#c3cacd"/><stop offset=".46" stop-color="#e3e7e8"/><stop offset=".62" stop-color="#a9b2b6"/><stop offset=".78" stop-color="#d6dcde"/><stop offset=".92" stop-color="#959ea3"/><stop offset="1" stop-color="#737c81"/></linearGradient>
<linearGradient id="pkAluL" x1="0" x2="1"><stop offset="0" stop-color="#8a9398"/><stop offset=".1" stop-color="#cfd5d8"/><stop offset=".24" stop-color="#f6f7f7"/><stop offset=".4" stop-color="#d2d8da"/><stop offset=".56" stop-color="#eceff0"/><stop offset=".74" stop-color="#b5bdc1"/><stop offset=".9" stop-color="#a0a9ad"/><stop offset="1" stop-color="#7f888d"/></linearGradient>
<radialGradient id="pkTop" cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#fbfcfc"/><stop offset=".55" stop-color="#dfe4e6"/><stop offset="1" stop-color="#aab3b7"/></radialGradient>
<radialGradient id="pkRings" cx=".5" cy=".5" r=".035" spreadMethod="repeat"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="pkShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#0d1316" stop-opacity=".22"/></linearGradient>
<linearGradient id="pkFoil" x1="0" x2="1" y1="0" y2=".18"><stop offset="0" stop-color="#7e888d"/><stop offset=".12" stop-color="#d9dfe1"/><stop offset=".22" stop-color="#9aa4a9"/><stop offset=".38" stop-color="#f3f5f5"/><stop offset=".52" stop-color="#b3bcc0"/><stop offset=".66" stop-color="#e7ebec"/><stop offset=".82" stop-color="#8f999e"/><stop offset=".93" stop-color="#c9d0d3"/><stop offset="1" stop-color="#6f797e"/></linearGradient>
<linearGradient id="pkSheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset=".58" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="pkBoxF" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f2ef"/><stop offset="1" stop-color="#dde1e0"/></linearGradient>
<linearGradient id="pkBoxS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cdd3d4"/><stop offset="1" stop-color="#b3babd"/></linearGradient>
<linearGradient id="pkGlass" x1="0" x2="1"><stop offset="0" stop-color="#4f6977"/><stop offset=".14" stop-color="#7f98a6"/><stop offset=".3" stop-color="#a9bcc6"/><stop offset=".46" stop-color="#8aa2af"/><stop offset=".7" stop-color="#6d8796"/><stop offset=".88" stop-color="#5a7584"/><stop offset="1" stop-color="#435d6b"/></linearGradient>
<linearGradient id="pkBulb" x1="0" x2="1"><stop offset="0" stop-color="#0f1315"/><stop offset=".3" stop-color="#3a4247"/><stop offset=".45" stop-color="#22292d"/><stop offset="1" stop-color="#0c0f11"/></linearGradient>
<linearGradient id="pkFrost" x1="0" x2="1"><stop offset="0" stop-color="#b8c6cd"/><stop offset=".18" stop-color="#e3eaed"/><stop offset=".36" stop-color="#f4f7f7"/><stop offset=".6" stop-color="#d5dfe3"/><stop offset=".85" stop-color="#c1ced4"/><stop offset="1" stop-color="#a9b8c0"/></linearGradient>
<radialGradient id="pkShadow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b2428" stop-opacity=".34"/><stop offset=".55" stop-color="#1b2428" stop-opacity=".12"/><stop offset="1" stop-color="#1b2428" stop-opacity="0"/></radialGradient>
<filter id="pkBrush" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.004 0.9" numOctaves="2" seed="6"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.32"/></filter>
<filter id="pkBrushV" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9 0.004" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .8 -.3"/></filter>
<filter id="pkSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
<clipPath id="pkcTinB"><path d="M75 258V410a125 26 0 0 0 250 0V258z"/></clipPath>
<clipPath id="pkcTinL"><path d="M71 194v58a129 27 0 0 0 258 0v-58z"/></clipPath>
<clipPath id="pkcPouch"><path d="M104 74h192l3 32c7 96 9 222 1 312q-2 20-20 22H120q-18-2-20-22c-8-90-6-216 1-312z"/></clipPath>
<clipPath id="pkcDrop"><path d="M150 250q0-36 26-44v-8h48v8q26 8 26 44v166q0 16-16 16h-68q-16 0-16-16z"/></clipPath>
<clipPath id="pkcJar"><path d="M112 246h176v166q0 16-16 18H128q-16-2-16-18z"/></clipPath>
</defs></svg>`;
let defsIn = false;
export function ensureDefs() { if (defsIn) return; defsIn = true; document.body.insertAdjacentHTML('afterbegin', DEFS); }

const T = s => esc(String(s).toUpperCase());
const short = n => { const s = n.replace(/\s*\+\s*/g, ' + '); return s.length > 20 ? s.slice(0, 19).trim() + '.' : s; };
const marks = (x, y, k = 4) => Array.from({length: k + 1}, (_, i) => `<rect x="${x}" y="${y + i * 9}" width="1.6" height="5" fill="${i === k ? '#e98546' : '#171c1f'}" opacity="${i === k ? 1 : .55}"/>`).join('');
const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#pkShadow)"/>`;

const DRAW = {
  tin: p => `${shadow(200, 418, 170, 24)}
    <path d="M75 258V410a125 26 0 0 0 250 0V258z" fill="url(#pkAlu)"/>
    <rect x="75" y="240" width="250" height="200" clip-path="url(#pkcTinB)" filter="url(#pkBrush)" opacity=".26"/>
    <path d="M75 258V410a125 26 0 0 0 250 0V258z" fill="url(#pkShade)"/>
    <path d="M71 194v58a129 27 0 0 0 258 0v-58z" fill="url(#pkAluL)"/>
    <rect x="71" y="180" width="258" height="110" clip-path="url(#pkcTinL)" filter="url(#pkBrush)" opacity=".24"/>
    <path d="M71 252a129 27 0 0 0 258 0" fill="none" stroke="#2a3338" stroke-opacity=".38" stroke-width="1.4"/>
    <path d="M75 260a125 26 0 0 0 250 0" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>
    <ellipse cx="200" cy="194" rx="129" ry="27" fill="url(#pkTop)"/>
    <ellipse cx="200" cy="194" rx="129" ry="27" fill="url(#pkRings)" opacity=".7"/>
    <ellipse cx="200" cy="194" rx="128" ry="26.4" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>
    <text x="104" y="352" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="42" letter-spacing="-1.6" fill="#171c1f">PR6</text>
    <text x="106" y="373" font-family="DejaVu Sans Mono, monospace" font-size="8.4" letter-spacing="1" fill="#171c1f" opacity=".78">${T(p.id)} / ${T(p.g)}</text>
    <text x="106" y="385" font-family="DejaVu Sans Mono, monospace" font-size="8.4" letter-spacing="1" fill="#171c1f" opacity=".78">${T(short(p.n))}</text>
    ${marks(292, 322)}`,
  pouch: p => `${shadow(200, 440, 140, 18)}
    <path d="M104 74h192l3 32c7 96 9 222 1 312q-2 20-20 22H120q-18-2-20-22c-8-90-6-216 1-312z" fill="url(#pkFoil)"/>
    <rect x="90" y="60" width="220" height="400" clip-path="url(#pkcPouch)" filter="url(#pkBrushV)" opacity=".35"/>
    <path d="M104 74h192l3 32c7 96 9 222 1 312q-2 20-20 22H120q-18-2-20-22c-8-90-6-216 1-312z" fill="url(#pkSheen)" opacity=".7"/>
    <g clip-path="url(#pkcPouch)"><path d="M100 106h200" stroke="#3a4448" stroke-opacity=".35"/><path d="M100 108h200" stroke="#fff" stroke-opacity=".6"/>
      ${Array.from({length: 48}, (_, i) => `<path d="M${106 + i * 4} 76v26" stroke="#2f383c" stroke-opacity=".16"/>`).join('')}
      <path d="M118 410q82 -26 164 0" fill="none" stroke="#2f383c" stroke-opacity=".18" stroke-width="1.2"/>
      <path d="M150 150c-20 60-24 160-8 240" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="10" filter="url(#pkSoft)"/></g>
    <rect x="128" y="222" width="144" height="128" rx="1.5" fill="#f5f6f3"/>
    <rect x="128" y="222" width="144" height="128" rx="1.5" fill="none" stroke="#000" stroke-opacity=".06"/>
    <text x="140" y="268" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="34" letter-spacing="-1.2" fill="#171c1f">PR6</text>
    <text x="141" y="306" font-family="DejaVu Sans Mono, monospace" font-size="7.6" letter-spacing=".9" fill="#171c1f" opacity=".8">${T(p.id)} / ${T(p.q)}</text>
    <text x="141" y="317" font-family="DejaVu Sans Mono, monospace" font-size="7.6" letter-spacing=".9" fill="#171c1f" opacity=".8">${T(short(p.n))}</text>
    <text x="141" y="338" font-family="DejaVu Sans Mono, monospace" font-size="6.6" letter-spacing=".9" fill="#171c1f" opacity=".55">THE PRACTICE OF PROGRESS</text>
    ${marks(257, 234, 3)}`,
  box: p => `${shadow(205, 430, 172, 22)}
    <path d="M120 122l68-26h130l-68 26z" fill="#f7f8f5"/>
    <path d="M250 122l68-26v298l-68 26z" fill="url(#pkBoxS)"/>
    <path d="M120 122h130v298H120z" fill="url(#pkBoxF)"/>
    <path d="M120 122h130" stroke="#fff" stroke-width="1.2"/><path d="M250 122v298" stroke="#9aa3a7" stroke-opacity=".5"/>
    <rect x="178" y="112" width="20" height="22" rx="1" fill="#e98546"/><rect x="178" y="112" width="20" height="5" fill="#c9692f" opacity=".45"/>
    <text x="134" y="176" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="30" letter-spacing="-1" fill="#171c1f">PR6</text>
    <text x="135" y="196" font-family="DejaVu Sans Mono, monospace" font-size="6.8" letter-spacing=".9" fill="#171c1f" opacity=".75">THE PRACTICE</text>
    <text x="135" y="205" font-family="DejaVu Sans Mono, monospace" font-size="6.8" letter-spacing=".9" fill="#171c1f" opacity=".75">OF PROGRESS.</text>
    <rect x="160" y="250" width="66" height="132" rx="8" fill="none" stroke="#b9c0c2" stroke-width="1.2"/><rect x="161" y="251" width="66" height="132" rx="8" fill="none" stroke="#fff" stroke-opacity=".8"/>
    <text x="135" y="404" font-family="DejaVu Sans Mono, monospace" font-size="6.8" letter-spacing=".9" fill="#171c1f" opacity=".7">${T(p.id)} / ${T(p.q)}</text>
    <g transform="rotate(-9 120 380)"><rect x="52" y="332" width="128" height="92" rx="2" fill="url(#pkFoil)"/><rect x="52" y="332" width="128" height="92" rx="2" fill="none" stroke="#5c666b" stroke-opacity=".35" stroke-dasharray="1.2 2.2" stroke-width="5"/>
      <text x="70" y="370" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="18" fill="#171c1f" opacity=".85">PR6</text></g>
    <g transform="rotate(4 180 400)"><rect x="96" y="352" width="128" height="88" rx="2" fill="url(#pkFoil)"/><rect x="96" y="352" width="128" height="88" rx="2" fill="url(#pkSheen)" opacity=".6"/><rect x="96" y="352" width="128" height="88" rx="2" fill="none" stroke="#5c666b" stroke-opacity=".35" stroke-dasharray="1.2 2.2" stroke-width="5"/>
      <text x="112" y="388" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="18" fill="#171c1f">PR6</text>
      <text x="113" y="402" font-family="DejaVu Sans Mono, monospace" font-size="5.6" letter-spacing=".7" fill="#171c1f" opacity=".7">${T(short(p.n))}</text>${marks(208, 368, 3)}</g>`,
  dropper: p => `${shadow(200, 434, 92, 14)}
    <path d="M150 250q0-36 26-44v-8h48v8q26 8 26 44v166q0 16-16 16h-68q-16 0-16-16z" fill="url(#pkGlass)"/>
    <g clip-path="url(#pkcDrop)"><rect x="140" y="190" width="120" height="250" filter="url(#pkBrushV)" opacity=".18"/>
      <path d="M166 232v186" stroke="#fff" stroke-opacity=".28" stroke-width="8" filter="url(#pkSoft)"/><path d="M236 240v170" stroke="#fff" stroke-opacity=".12" stroke-width="5" filter="url(#pkSoft)"/>
      <rect x="140" y="414" width="120" height="20" fill="#2b3e48" opacity=".25"/></g>
    <rect x="171" y="160" width="58" height="44" rx="3" fill="url(#pkBulb)"/>
    ${Array.from({length: 13}, (_, i) => `<path d="M${175 + i * 4} 163v38" stroke="#fff" stroke-opacity=".07"/>`).join('')}
    <path d="M180 162v-52q0-38 20-38t20 38v52z" fill="url(#pkBulb)"/>
    <path d="M190 150v-40q0-22 8-28" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="3" stroke-linecap="round"/>
    <text x="166" y="318" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="17" letter-spacing="-.4" fill="#f2f3ef" opacity=".92">PR6</text>
    <path d="M206 312h22" stroke="#f2f3ef" stroke-opacity=".8"/>
    <text x="167" y="336" font-family="DejaVu Sans Mono, monospace" font-size="6" letter-spacing=".8" fill="#f2f3ef" opacity=".75">${T(p.id)} / ${T(p.q)}</text>`,
  jar: p => `${shadow(200, 430, 150, 18)}
    <path d="M112 246h176v166q0 16-16 18H128q-16-2-16-18z" fill="url(#pkFrost)"/>
    <g clip-path="url(#pkcJar)"><rect x="100" y="240" width="200" height="200" filter="url(#pkBrushV)" opacity=".14"/>
      <rect x="112" y="398" width="176" height="34" fill="#9fb0b8" opacity=".35"/><path d="M134 262v140" stroke="#fff" stroke-opacity=".6" stroke-width="9" filter="url(#pkSoft)"/></g>
    <path d="M104 186v58a96 14 0 0 0 192 0v-58z" fill="url(#pkAluL)"/>
    <path d="M104 244a96 14 0 0 0 192 0" fill="none" stroke="#2a3338" stroke-opacity=".3"/>
    <ellipse cx="200" cy="186" rx="96" ry="15" fill="url(#pkTop)"/><ellipse cx="200" cy="186" rx="96" ry="15" fill="url(#pkRings)" opacity=".7"/>
    <text x="132" y="318" font-family="FreeSans, Helvetica Neue, sans-serif" font-weight="700" font-size="30" letter-spacing="-1" fill="#171c1f" opacity=".86">PR6</text>
    <text x="133" y="338" font-family="DejaVu Sans Mono, monospace" font-size="7" letter-spacing=".9" fill="#171c1f" opacity=".7">${T(p.id)} / ${T(p.q)}</text>
    <text x="133" y="349" font-family="DejaVu Sans Mono, monospace" font-size="7" letter-spacing=".9" fill="#171c1f" opacity=".7">${T(short(p.n))}</text>
    ${marks(268, 300, 3)}`
};
export function placeholderSVG(p) {
  const pack = packOf(p);
  return `<svg class="pk-svg" viewBox="0 0 400 480" aria-hidden="true" focusable="false">${(DRAW[pack] || DRAW.tin)(p)}</svg>`;
}
/* (thumbnails load eagerly: there are only five hero files, shared by every product of a pack type)
   the pack as markup: the render when there is one, otherwise the drawing. data-pack carries the type for CSS.
   Renders are transparent, so thumbnails use the hero (not the mist sweep) and sit straight on the page.
   o.src forces an image (the Dossier starts on turntable frame 00 so dragging does not jump). */
export function packHTML(p, o = {}) {
  ensureDefs();
  const pack = packOf(p), src = Renders.hero(p) ? (o.src || Renders.hero(p)) : null;
  const inner = src ? `<img class="pk-img" src="${esc(src)}" alt="" decoding="async"${o.eager ? ' fetchpriority="high"' : ''}${o.src ? ' data-frame="0"' : ''} draggable="false">` : placeholderSVG(p);
  return `<span class="pk${src ? ' real' : ''} pk-${pack}${o.cls ? ' ' + o.cls : ''}" data-pack="${pack}" data-id="${esc(p.id)}">${inner}</span>`;
}
