/* PR6 / Form, editorial. A cool, misty magazine: full-bleed plates, Abel-style spreads, calm type. The slide-4 slab
   is the product page and the only place with form fields. Catalogue data is SAMPLE (catalog.js). The quote request
   never leaves this browser. Routes are plain hashes so the prototype also runs as a claude.ai artifact. */
import {AREAS, ALL, byId, areaOf, cad, range, RUO, fmtSize} from './catalog.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]rm\b/.test(location.search);
const main = $('#main'), head = $('#head');
const KEY = '0047RSRV';

/* plates: Cycles renders (cool, shallow focus, sample labels) and the owner's kit (concept art) */
const ED = {
  cells: ['assets/ed/cells.webp', 'PR6 kit, slide 1 (concept)', 'Blue-grey cells under a microscope'],
  frost: ['assets/ed/frost.webp', 'Cycles render · sample label', 'A sealed PR6 vial half hidden behind frosted glass'],
  rows: ['assets/ed/rows.webp', 'Cycles render · sample labels', 'Rows of sealed PR6 vials falling out of focus'],
  macro: ['assets/ed/macro.webp', 'Cycles render · sample label', 'Close view of a vial crimp and shoulder, almost all soft'],
  lying: ['assets/ed/lying.webp', 'Cycles render · sample labels', 'Sealed vials lying in rows, seen from above'],
  xray: ['assets/ed/xray.webp', 'PR6 kit, slide 5 (concept)', 'Frosted x-ray study of a neck and spine with measurement marks'],
  foam: ['assets/ed/foam.webp', 'PR6 kit, slide 6 (concept)', 'A PR6 vial set into a pale foam case'],
  cube: ['assets/ed/cube.webp', 'PR6 kit, slide 6 (concept)', 'A frosted cube with a dark sphere inside']
};
const SERIES_PLATE = ['rows', 'macro', 'xray', 'frost', 'lying', 'cube', 'foam', 'cells', 'frost'];

/* ---------- storage (per-viewer convenience only) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('pr6form.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pr6form.' + k, JSON.stringify(v)); } catch { /* private mode */ } }
};
let quote = store.get('quote', []);
const pick = store.get('pick', {});
const saveQ = () => { store.set('quote', quote); counts(); };
const inQuote = (id, s) => quote.find(l => l.id === id && (s == null || l.s === s));
function addQ(id, s) { const l = inQuote(id, s); if (l) l.q++; else quote.push({id, s, q: 1}); saveQ(); }
function counts() { $('#qn').textContent = quote.reduce((a, l) => a + l.q, 0); }

function opened() {
  try {
    if (new URLSearchParams(location.search).get('key') === KEY) sessionStorage.setItem('pr6form.in', '1');
    return sessionStorage.getItem('pr6form.in') === '1';
  } catch { return /key=0047RSRV/.test(location.search); }
}

/* values type themselves into the slab's fields */
function typeIn(root) {
  const els = [...root.querySelectorAll('[data-ty]')];
  if (RM) { els.forEach(e => { e.textContent = e.dataset.ty; }); return; }
  els.forEach((e, i) => {
    const t = e.dataset.ty; let n = 0; e.textContent = '';
    const step = () => { n++; e.textContent = t.slice(0, n) + (n < t.length ? '_' : ''); if (n < t.length) setTimeout(step, 24); };
    setTimeout(step, 260 + i * 110);
  });
}

/* ---------- pieces ---------- */
const plate = (k, fig, cls = '', extra = '') => {
  const [src, cap, alt] = ED[k];
  return `<figure class="plate ${cls}"><img src="${src}" alt="${esc(alt)}" ${cls.includes('hero') ? '' : 'loading="lazy"'}>
    <figcaption class="cap bl m">Fig. ${fig}</figcaption><span class="cap br m">${esc(cap)}</span>${extra}</figure>`;
};
const lines = list => `<ul class="lines">${list.map(p => `<li><a href="#c-${p.id}">
  <span class="nm"><span class="u">${esc(p.n)}</span></span><span class="m id">${p.id}</span><span class="m pr tab">from ${cad(p.sizes[0].price)}</span></a></li>`).join('')}</ul>`;

/* deterministic SAMPLE chromatogram (not data) */
function tracePath(p) {
  let s = [...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7);
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const mx = 0.42 + r() * 0.2, peaks = [[mx, 1, 0.009]];
  for (let i = 0; i < 4; i++) peaks.push([0.12 + r() * 0.76, 0.02 + r() * 0.05, 0.006 + r() * 0.006]);
  const pts = [];
  for (let i = 0; i <= 500; i++) {
    const x = i / 500; let y = 0;
    for (const [m, a, w] of peaks) y += a * Math.exp(-((x - m) ** 2) / (2 * w * w));
    pts.push(`${(x * 1000).toFixed(1)},${(196 - y * 168).toFixed(1)}`);
  }
  return {d: 'M' + pts.join(' L'), mx: mx * 1000, my: 28};
}

/* ---------- pages ---------- */
function vIndex() {
  return `
  <figure class="plate hero dark reveal"><img src="${ED.cells[0]}" alt="${ED.cells[2]}">
    <div class="center"><p class="mark">PR6</p><p class="m wide">The practice of progress</p></div>
    <span class="cap bl m">Fig. 01 · Issue 01</span><span class="cap br m">Catalogue 2026</span></figure>
  <section class="stmt">
    <h1 class="d1">Research compounds for laboratories and institutions we have met in person.</h1>
    <dl class="meta m"><dt>Series</dt><dd>${AREAS.length}</dd><dt>Compounds</dt><dd>${ALL.length}</dd><dt>Access</dt><dd>By invitation</dd><dt>Data</dt><dd class="sample">Sample, not final</dd></dl>
    <p class="body note">Every lot is tested by an independent laboratory, by RP-HPLC and mass spectrometry. Its certificate travels with the vial.</p>
  </section>
  <section class="spread">
    ${plate('frost', '02', 'sticky')}
    <div class="txt">
      <div class="head2"><span class="m">The catalogue</span><span class="m">P. 02</span></div>
      <div><h2 class="d2">Nine series, grouped by field of study.</h2><p class="body" style="margin-top:20px">Each compound is listed by catalogue number, sealed as a lyophilised powder, in 5 mg and 10 mg vials. Prices are per vial in Canadian dollars, invoiced on your institution's terms.</p></div>
      <ol class="toc">${AREAS.map(a => `<li><a href="#series-${a.c}"><span class="m">${a.c}</span><span class="t"><span class="u">${esc(a.f)}</span></span><span class="m tab">${String(2 + +a.c).padStart(2, '0')}</span></a></li>`).join('')}</ol>
    </div>
  </section>
  ${plate('lying', '03', 'full')}
  <section class="spread flip">
    ${plate('macro', '04', 'sticky')}
    <div class="txt">
      <div class="head2"><span class="m">This lot</span><span class="m">P. 03</span></div>
      <div><h2 class="d2">The certificate travels with the vial.</h2><p class="body" style="margin-top:20px">Each record shows the lot, its purity by RP-HPLC, its mass by ESI-MS, the laboratory that tested it and the date. The certificate of analysis and the safety data sheet sit beside it.</p></div>
      <a class="m more" href="#c-PR6-C-0103"><span class="u">Open a sample record</span></a>
    </div>
  </section>`;
}

function vCatalogue() {
  return `
  <section class="page" style="padding-bottom:64px"><div class="intro" style="margin-bottom:0">
    <h1 class="d1">The catalogue</h1>
    <p class="lede">Nine series, grouped by field of study. Prices per vial, Canadian dollars, before tax. <span class="sample">Sample list</span></p>
  </div></section>
  ${AREAS.map((a, i) => `<section class="spread ${i % 2 ? 'flip' : ''}" aria-labelledby="s${a.c}">
    ${plate(SERIES_PLATE[i], a.c, 'sticky')}
    <div class="txt">
      <div class="head2"><span class="m">Series ${a.c}</span><span class="m tab">${a.it.length} compounds · ${range(a)}</span></div>
      <div><h2 class="d2" id="s${a.c}">${esc(a.f)}</h2><p class="body" style="margin-top:18px">${esc(a.d)}</p></div>
      <div>${lines(a.it)}<p style="margin-top:22px"><a class="m more" href="#series-${a.c}"><span class="u">Series ${a.c}</span></a></p></div>
    </div></section>`).join('')}`;
}

function vSeries(c) {
  const i = AREAS.findIndex(x => x.c === c), a = AREAS[i];
  if (!a) return vMissing();
  const prev = AREAS[i - 1], next = AREAS[i + 1];
  return `
  <section class="spread">
    ${plate(SERIES_PLATE[i], a.c, 'sticky')}
    <div class="txt">
      <div class="head2"><span class="m">Series ${a.c}</span><span class="m tab">${a.it.length} compounds</span></div>
      <div><h1 class="d1">${esc(a.f)}</h1><p class="lede" style="margin-top:24px">${esc(a.d)}</p></div>
      <div>${lines(a.it)}
        <div style="display:flex;justify-content:space-between;margin-top:28px">
          ${prev ? `<a class="m" href="#series-${prev.c}"><span class="u">← Series ${prev.c}</span></a>` : '<span></span>'}
          ${next ? `<a class="m more" href="#series-${next.c}"><span class="u">Series ${next.c}</span></a>` : `<a class="m more" href="#catalogue"><span class="u">Catalogue</span></a>`}
        </div></div>
    </div>
  </section>`;
}

let tab = 'identity';
function vCompound(id) {
  const p = byId(id);
  if (!p) return vMissing();
  const a = areaOf(p), s = pick[id] || 0, ai = AREAS.indexOf(a);
  return `<section class="stage" aria-label="${esc(p.n)}">
  <div class="slab">
    <div class="sh"><b>PR6</b><span class="slash" aria-hidden="true">/</span><span class="m">Series ${a.c}</span></div>
    <div class="left">
      <div><h1 class="nm">${esc(p.n)}</h1></div>
      <p class="cls">${esc(p.cls)}. ${esc(a.f)}. <span class="sample">Sample</span></p>
      <label class="sf"><span class="m">Series</span><select id="f-series">${AREAS.map(x => `<option value="${x.c}" ${x.c === a.c ? 'selected' : ''}>${x.c} · ${esc(x.f)}</option>`).join('')}</select></label>
      <label class="sf"><span class="m">Compound</span><select id="f-comp">${a.it.map(x => `<option value="${x.id}" ${x.id === id ? 'selected' : ''}>${x.id} · ${esc(x.n.replace('Compound ', ''))}</option>`).join('')}</select></label>
      <div class="sf"><span class="m">Format</span><div class="box" data-ty="LYOPHILISED · RP-HPLC · ESI-MS">LYOPHILISED · RP-HPLC · ESI-MS</div></div>
      <div class="sf"><span class="m" id="szl">Size</span><div class="sizes" role="group" aria-labelledby="szl">
        ${p.sizes.map((z, j) => `<button type="button" data-size="${j}" aria-pressed="${j === s}"><span class="m">${fmtSize(z)}</span><b class="tab">${cad(z.price)}</b></button>`).join('')}
      </div></div>
    </div>
    <div class="right">
      <div class="disc"><img src="assets/disc_vial.webp" alt="A sealed PR6 vial lying in the panel's pressed disc beside a small matte sphere" width="1100" height="1100"></div>
      <div class="buy"><button class="pill" type="button" id="buy">Add to quote</button><span class="price tab" id="price">${cad(p.sizes[s].price)}</span></div>
    </div>
    <div class="foot"><span class="m">Per vial, before tax</span><i></i><span class="m">${esc(p.lot)}</span></div>
  </div></section>
  <section class="spread">
    ${plate(SERIES_PLATE[ai] === 'macro' ? 'frost' : 'macro', p.id.slice(6), 'sticky')}
    <div class="rec">
      <div class="head2" style="display:flex;justify-content:space-between;color:var(--soft)"><span class="m">The record</span><span class="m">${p.id}</span></div>
      <p class="caps">${esc(p.cls)}, supplied as a lyophilised powder in a sealed glass vial. ${esc(p.lot)} was tested by ${esc(p.tested)}, independent of PR6, by RP-HPLC and ESI-MS. The certificate travels with the vial.</p>
      <div>
        <div class="tabs" role="tablist" aria-label="Record">
          ${[['identity', 'Identity'], ['lot', 'This lot'], ['docs', 'Documents'], ['handling', 'Handling']].map(([k, l]) =>
            `<button role="tab" id="t-${k}" aria-controls="tp" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}
        </div>
        <div id="tp" role="tabpanel" aria-labelledby="t-${tab}">${tabBody(p)}</div>
      </div>
      <div><p class="m" style="color:var(--soft);margin:0 0 12px">Also in series ${a.c}</p>${lines(a.it.filter(x => x.id !== id))}</div>
    </div>
  </section>`;
}
function tabBody(p) {
  const a = areaOf(p);
  if (tab === 'identity') return `<dl class="dl">
    <dt>Catalogue no.</dt><dd class="mono">${p.id}</dd>
    <dt>Name</dt><dd>${esc(p.n)} <span class="sample">Placeholder</span></dd>
    <dt>Class</dt><dd>${esc(p.cls)}</dd>
    <dt>Series</dt><dd>${a.c} · ${esc(a.f)}</dd>
    <dt>Sequence</dt><dd class="mono">${esc(p.seq)}</dd>
    <dt>Formula</dt><dd class="mono">${esc(p.formula)}</dd>
    <dt>Mol. weight</dt><dd class="mono">${esc(p.mw)}</dd>
    <dt>CAS no.</dt><dd class="mono">${esc(p.cas)}</dd>
  </dl>`;
  if (tab === 'lot') {
    const t = tracePath(p);
    return `<dl class="dl">
      <dt>Lot</dt><dd class="mono">${esc(p.lot)}</dd>
      <dt>Purity</dt><dd class="mono">${esc(p.purity)} by RP-HPLC <span class="sample">From the CoA</span></dd>
      <dt>Identity</dt><dd>ESI-MS, mass confirmed</dd>
      <dt>Tested by</dt><dd>${esc(p.tested)}</dd>
      <dt>CoA date</dt><dd class="mono">${p.tdate}</dd>
    </dl>
    <div class="trace" style="margin-top:28px">
      <div style="display:flex;justify-content:space-between;gap:12px"><span class="m" style="color:var(--soft)">RP-HPLC, 214 nm</span><span class="sample">Drawn placeholder, not data</span></div>
      <svg viewBox="0 -40 1000 300" role="img" aria-label="Placeholder HPLC trace with one main peak">
        <line class="ax" x1="0" y1="196" x2="1000" y2="196"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<line class="ax" x1="${i * 200}" y1="196" x2="${i * 200}" y2="206"/><text x="${i * 200}" y="236" text-anchor="${i === 0 ? 'start' : i === 5 ? 'end' : 'middle'}">${i * 6}</text>`).join('')}
        <path class="ln" id="tl" d="${t.d}" pathLength="1"/>
        <path class="ld" d="M${t.mx.toFixed(0)} ${t.my} L${(t.mx + 50).toFixed(0)} -12 L${Math.min(t.mx + 300, 990).toFixed(0)} -12"/>
        <text class="k" x="${(t.mx + 58).toFixed(0)}" y="-20">MAIN PEAK · ${esc(p.purity)}</text>
      </svg>
    </div>`;
  }
  if (tab === 'docs') return `<ul class="docs">
    ${[['CoA', 'Certificate of analysis, ' + p.lot], ['SDS', 'Safety data sheet'], ['HPLC', 'Chromatogram, RP-HPLC'], ['MS', 'Mass spectrum, ESI-MS']].map(([k, l]) =>
      `<li><span class="m">${k}</span><span>${esc(l)}</span><span class="sample">Owner to supply</span></li>`).join('')}</ul>`;
  return `<dl class="dl">
    <dt>Storage</dt><dd>${esc(p.store)}</dd>
    <dt>Shelf life</dt><dd>${esc(p.shelf)}</dd>
    <dt>Dispatch</dt><dd>Cold pack, tracked, to the institution's registered address only</dd>
    <dt>Use</dt><dd>${RUO}</dd>
  </dl>`;
}
function drawTrace() {
  const l = $('#tl'); if (!l || RM) return;
  l.style.strokeDasharray = '1'; l.style.strokeDashoffset = '1'; l.getBoundingClientRect();
  l.style.transition = 'stroke-dashoffset 2.4s cubic-bezier(.6,0,.2,1)'; l.style.strokeDashoffset = '0';
}
function wireCompound(id) {
  const p = byId(id);
  const setSize = j => {
    pick[id] = j; store.set('pick', pick);
    main.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.size === j)));
    $('#price').textContent = cad(p.sizes[j].price);
    const b = $('#buy'); delete b.dataset.done; b.textContent = 'Add to quote';
  };
  main.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => setSize(+b.dataset.size)));
  $('#f-series').addEventListener('change', e => go('#c-' + AREAS.find(x => x.c === e.target.value).it[0].id));
  $('#f-comp').addEventListener('change', e => go('#c-' + e.target.value));
  $('#buy').addEventListener('click', e => {
    const s = pick[id] || 0; addQ(id, s);
    const b = e.currentTarget; b.dataset.done = '1';
    b.textContent = `In quote · ${inQuote(id, s).q} × ${fmtSize(p.sizes[s])}`;
  });
  const tabs = main.querySelector('.tabs');
  tabs.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    tab = t.dataset.tab;
    tabs.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === t)));
    const tp = $('#tp'); tp.setAttribute('aria-labelledby', t.id); tp.innerHTML = tabBody(p);
    if (tab === 'lot') drawTrace();
  });
  tabs.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...tabs.querySelectorAll('[data-tab]')], i = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
  });
  if (tab === 'lot') drawTrace();
}

function vQuote() {
  const ls = quote.map(l => ({...l, p: byId(l.id)})).filter(l => l.p);
  const total = ls.reduce((a, l) => a + l.q * l.p.sizes[l.s].price, 0);
  return `<section class="page">
  <div class="intro"><h1 class="d1">Quote list</h1><p class="lede">Collect the vials your institution needs and send the list. PR6 replies with a quote and an invoice on your terms.</p></div>
  ${ls.length ? `<ul class="lines">${ls.map((l, i) => `<li><div class="row">
      <span class="nm"><a href="#c-${l.id}"><span class="u">${esc(l.p.n)}</span></a> <span class="m" style="color:var(--soft);margin-left:10px">${fmtSize(l.p.sizes[l.s])} · ${l.id}</span></span>
      <span class="qty"><button type="button" data-q="${i}" data-d="-1" aria-label="One fewer ${esc(l.p.n)}">−</button><span class="tab">${l.q}</span><button type="button" data-q="${i}" data-d="1" aria-label="One more ${esc(l.p.n)}">+</button></span>
      <span class="m pr tab">${cad(l.q * l.p.sizes[l.s].price)}</span></div></li>`).join('')}</ul>
  <div class="total"><span class="m">Total before tax, CAD</span><b class="tab">${cad(total)}</b></div>
  <form class="form" id="qf" novalidate>
    <label><span class="m">Institution</span><input id="q-inst" autocomplete="organization"></label>
    <label><span class="m">Department or lab</span><input id="q-dept"></label>
    <label><span class="m">Contact name</span><input id="q-name" autocomplete="name"></label>
    <label><span class="m">Work email</span><input id="q-mail" type="email" autocomplete="email"></label>
    <label><span class="m">PO number (optional)</span><input id="q-po"></label>
    <label><span class="m">Member no.</span><input id="q-mem" value="0047" readonly></label>
    <label class="full"><span class="m">Notes</span><textarea id="q-notes"></textarea></label>
    <p class="err full" id="qerr" role="alert" hidden></p>
    <div class="full buy"><button class="pill" type="submit">Send quote request</button></div>
  </form>
  <p class="note body" id="qok" role="status" tabindex="-1" hidden>Prototype: nothing was sent. In the portal this becomes a quote request to PR6, answered with a quote and an invoice.</p>`
  : `<p class="lede">The list is empty. Add vials from any compound page in the <a href="#catalogue"><span class="u" style="background-size:100% 1px">catalogue</span></a>.</p>`}
  </section>`;
}
function wireQuote() {
  main.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
    const l = quote[+b.dataset.q]; l.q += +b.dataset.d;
    if (l.q <= 0) quote.splice(+b.dataset.q, 1);
    saveQ(); render(true);
  }));
  const f = $('#qf'); if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const miss = [['q-inst', 'institution'], ['q-name', 'contact name'], ['q-mail', 'work email']].filter(([i]) => !$('#' + i).value.trim());
    const err = $('#qerr');
    if (miss.length) { err.hidden = false; err.textContent = 'Add the ' + miss.map(m => m[1]).join(', ') + ' to send the request.'; $('#' + miss[0][0]).focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('#q-mail').value.trim())) { err.hidden = false; err.textContent = 'The work email looks incomplete. Check it and send again.'; $('#q-mail').focus(); return; }
    err.hidden = true; const ok = $('#qok'); ok.hidden = false; ok.focus();
  });
}

function vRecord() {
  return `<section class="page">
  <div class="intro"><h1 class="d1">Institution record</h1><p class="lede">What PR6 holds for your institution. Changes go to PR6 for approval first. <span class="sample">Sample record</span></p></div>
  <dl class="dl" style="max-width:900px">
    <dt>Member no.</dt><dd class="mono">0047</dd>
    <dt>Institution</dt><dd>[Vetted institution]</dd>
    <dt>Status</dt><dd>Approved in person by PR6</dd>
    <dt>Ship to</dt><dd>[Registered laboratory address]</dd>
    <dt>Invoice terms</dt><dd>[Net 30, on PO]</dd>
    <dt>Contacts</dt><dd>[Principal investigator] · [Lab manager]</dd>
    <dt>Documents</dt><dd>Signed research-use declaration, on file</dd>
  </dl></section>`;
}
const vMissing = () => `<section class="page"><div class="intro"><h1 class="d1">Not in the catalogue</h1><p class="lede">That page does not exist. Go to the <a href="#catalogue"><span class="u" style="background-size:100% 1px">catalogue</span></a>.</p></div></section>`;

function vGate() {
  return `<section class="gate"><img src="${ED.cube[0]}" alt="">
    <div class="in">
      <div class="row"><span class="m">Object 0047</span><span class="m">Private</span></div>
      <form id="gf" novalidate>
        <p class="obj">Object 0047</p>
        <label class="m" for="g-code">Access code</label>
        <input id="g-code" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <p class="err" id="gerr" role="alert" hidden></p>
        <button class="pill" type="submit" style="background:var(--white);color:var(--ink)">Enter</button>
      </form>
      <div class="row"><span class="m">By invitation</span><span class="m">Demo code 0047RSRV</span></div>
    </div></section>`;
}

/* ---------- router + head ---------- */
const go = h => { if (location.hash !== h) location.hash = h; else render(); };
let overHero = false;
function onScroll() {
  const y = scrollY;
  head.classList.toggle('solid', y > 40 && !(overHero && y < innerHeight - 80));
  head.classList.toggle('light', overHero && y < innerHeight - 80);
}
addEventListener('scroll', onScroll, {passive: true});
function render(keep) {
  const h = location.hash.replace(/^#\/?/, '');
  let r = h, arg = '';
  const m = h.match(/^(series|c)[-/](.+)$/);
  if (m) { r = m[1]; arg = m[2]; }
  const ok = opened();
  head.hidden = $('#folio').hidden = !ok;
  if (!ok) {
    main.innerHTML = vGate();
    $('#gf').addEventListener('submit', e => {
      e.preventDefault();
      if ($('#g-code').value.trim().toUpperCase().replace(/\s/g, '') === KEY) { try { sessionStorage.setItem('pr6form.in', '1'); } catch { /* ignore */ } render(); }
      else { const er = $('#gerr'); er.hidden = false; er.textContent = 'That code does not open this object.'; $('#g-code').select(); }
    });
    return;
  }
  let html, path, pg, nav = '';
  overHero = false;
  if (r === 'catalogue') { html = vCatalogue(); path = 'Catalogue'; pg = 2; nav = 'catalogue'; }
  else if (r === 'series') { html = vSeries(arg); path = `Catalogue / Series ${arg}`; pg = 2 + parseInt(arg, 10); nav = 'catalogue'; }
  else if (r === 'c') { const p = byId(arg); html = vCompound(arg); path = p ? `Series ${p.c} / ${p.id}` : 'Catalogue'; pg = 12 + ALL.indexOf(p); nav = 'catalogue'; }
  else if (r === 'quote') { html = vQuote(); path = 'Quote list'; pg = 40; nav = 'quote'; }
  else if (r === 'record') { html = vRecord(); path = 'Institution record'; pg = 41; nav = 'record'; }
  else { html = vIndex(); path = 'Index'; pg = 1; overHero = true; }
  main.innerHTML = html;
  $('#path').textContent = path;
  $('#pg').textContent = 'P. ' + String(pg).padStart(2, '0');
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === nav));
  document.title = path === 'Index' ? 'PR6' : 'PR6 · ' + path.split(' / ').pop();
  if (r === 'c' && byId(arg)) wireCompound(arg);
  if (r === 'quote') wireQuote();
  typeIn(main);
  if (!keep) scrollTo(0, 0);
  onScroll();
}
addEventListener('hashchange', () => { if (location.hash === '#main') return; if (!location.hash.startsWith('#c-')) tab = 'identity'; render(); });
counts();
render();
