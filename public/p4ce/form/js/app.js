/* PR6 / Form. Every page is a filled-in form; the navigation is a bar of fields. Pages cut (no fades); the one
   authored motion is values typing themselves into their fields, plus the lot's trace drawing once.
   Catalogue data is SAMPLE (see catalog.js). Nothing is sent anywhere: the quote request stays in this browser. */
import {AREAS, ALL, byId, areaOf, cad, range, RUO, fmtSize} from './catalog.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]rm\b/.test(location.search);
const main = $('#main');
const KEY = '0047RSRV';

/* ---------- storage (per-viewer convenience only) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('pr6form.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('pr6form.' + k, JSON.stringify(v)); } catch { /* private mode */ } }
};
let quote = store.get('quote', []);            // [{id, s, q}]
const pick = store.get('pick', {});           // id -> size index
const saveQ = () => { store.set('quote', quote); counts(); };
const inQuote = (id, s) => quote.find(l => l.id === id && (s == null || l.s === s));
function addQ(id, s) { const l = inQuote(id, s); if (l) l.q++; else quote.push({id, s, q: 1}); saveQ(); }
function counts() {
  const n = quote.reduce((a, l) => a + l.q, 0);
  $('#qn').textContent = n; $('#qn2').textContent = n + (n === 1 ? ' vial' : ' vials');
}

/* ---------- access (the decoy stays: nothing about the range shows before the code) ---------- */
function opened() {
  try {
    if (new URLSearchParams(location.search).get('key') === KEY) sessionStorage.setItem('pr6form.in', '1');
    return sessionStorage.getItem('pr6form.in') === '1';
  } catch { return /key=0047RSRV/.test(location.search); }
}

/* ---------- typing ---------- */
function typeIn(root) {
  const els = [...root.querySelectorAll('[data-ty]')];
  if (RM) { els.forEach(e => { e.textContent = e.dataset.ty; }); return; }
  els.forEach((e, i) => {
    const t = e.dataset.ty; let n = 0;
    e.textContent = '';
    const step = () => { n++; e.textContent = t.slice(0, n) + (n < t.length ? '_' : ''); if (n < t.length) setTimeout(step, 22); };
    setTimeout(step, 120 + i * 90);
  });
}

/* ---------- the field bar ---------- */
const fS = $('#f-series'), fC = $('#f-comp'), fZ = $('#f-size');
fS.innerHTML = `<option value="">All series</option>` + AREAS.map(a => `<option value="${a.c}">${a.c} · ${esc(a.f)}</option>`).join('');
function fillComp(c) {
  const list = c ? areaOf({c}).it : ALL;
  fC.innerHTML = `<option value="">${c ? 'Choose' : 'Any compound'}</option>` + list.map(p => `<option value="${p.id}">${p.id.slice(6)} · ${esc(p.n.replace('Compound ', ''))}</option>`).join('');
}
fS.addEventListener('change', () => go(fS.value ? '#series-' + fS.value : '#catalogue'));
fC.addEventListener('change', () => fC.value && go('#c-' + fC.value));
fZ.addEventListener('change', () => { const id = fZ.dataset.id; if (id) { setSize(id, +fZ.value); } });
function bar(c, id) {
  fS.value = c || ''; fillComp(c); fC.value = id || '';
  const p = id && byId(id);
  fZ.disabled = !p;
  fZ.innerHTML = p ? p.sizes.map((s, j) => `<option value="${j}">${fmtSize(s)} · ${cad(s.price)}</option>`).join('') : '<option>—</option>';
  fZ.dataset.id = p ? id : '';
  if (p) fZ.value = String(pick[id] || 0);
}
const go = h => { if (location.hash !== h) location.hash = h; else render(); };

/* ---------- shared bits ---------- */
const rowsTable = (list, cap = true) => `
<table class="rows"><thead><tr><th>Catalogue no.</th><th>Compound</th><th>Class</th><th>Sizes</th><th></th></tr></thead><tbody>
${list.map(p => `<tr>
  <td class="c">${p.id}</td>
  <td class="n"><a href="#c-${p.id}">${esc(p.n)}</a>${p.isNew ? '<span class="new">NEW</span>' : ''}</td>
  <td class="k">${esc(p.cls)}</td>
  <td class="p tab">${p.sizes.map(s => fmtSize(s) + ' ' + cad(s.price)).join(' / ')}</td>
  <td class="a"><button class="add" data-add="${p.id}" aria-pressed="${!!inQuote(p.id)}">${inQuote(p.id) ? '[✓] In quote' : '[+] Add 5 mg'}</button></td>
</tr>`).join('')}</tbody></table>`;
main.addEventListener('click', e => {
  const b = e.target.closest('[data-add]');
  if (!b) return;
  const id = b.dataset.add;
  if (!inQuote(id)) addQ(id, 0);
  b.setAttribute('aria-pressed', 'true'); b.textContent = '[✓] In quote';
});
const plate = (src, fig, cap, alt, h) => `<figure class="plate"><img src="${src}" alt="${esc(alt)}" loading="lazy" style="aspect-ratio:${h}"><figcaption><span class="m">${fig}</span><span class="m">${cap}</span></figcaption></figure>`;

/* deterministic SAMPLE chromatogram for a compound: one main peak, a few small ones. Not data. */
function tracePath(p) {
  let s = [...p.id].reduce((a, c) => a * 31 + c.charCodeAt(0) >>> 0, 7);
  const r = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
  const main = 0.42 + r() * 0.2, peaks = [[main, 1, 0.009]];
  for (let i = 0; i < 4; i++) peaks.push([0.12 + r() * 0.76, 0.02 + r() * 0.05, 0.006 + r() * 0.006]);
  const W = 1000, H = 220, base = 196, pts = [];
  for (let i = 0; i <= 500; i++) {
    const x = i / 500; let y = 0;
    for (const [m, a, w] of peaks) y += a * Math.exp(-((x - m) ** 2) / (2 * w * w));
    pts.push(`${(x * W).toFixed(1)},${(base - y * 168).toFixed(1)}`);
  }
  return {d: 'M' + pts.join(' L'), mx: main * W, my: base - 168, W, H};
}

/* ---------- pages ---------- */
function vIndex() {
  return `<div class="sheet">
  <section class="cover">
    <div class="meta"><dl class="m">
      <dt>Catalogue</dt><dd>2026 · Issue 01</dd>
      <dt>Series</dt><dd>${AREAS.length}</dd>
      <dt>Compounds</dt><dd>${ALL.length}</dd>
      <dt>Access</dt><dd>Vetted institutions</dd>
      <dt>Data</dt><dd class="sample">Sample, not final</dd>
    </dl></div>
    <div class="stmt">
      <p class="lede">Research compounds for laboratories and institutions PR6 has vetted in person. Every lot is tested by an independent laboratory, and its certificate travels with the vial.</p>
      <p class="m tag">The practice of progress</p>
    </div>
  </section>
  <div class="cover-mark"><p class="giant" aria-hidden="true">PR6</p></div>
  <section class="grid blk">
    <div style="grid-column:1/8">${plate('assets/plates/cells.webp', 'Fig. 01', 'From the PR6 kit, slide 1 (concept)', 'Grainy blue-grey cells under a microscope', '16/10')}</div>
    <div style="grid-column:8/13">
      <div class="rule"><span class="m">Contents</span><span class="m">Page</span></div>
      <ol class="toc">
        <li><a href="#catalogue"><span class="m">—</span><span class="t">The catalogue</span><span class="m">02</span></a></li>
        ${AREAS.map((a, i) => `<li><a href="#series-${a.c}"><span class="m">${a.c}</span><span class="t">${esc(a.f)}</span><span class="m">${String(i + 3).padStart(2, '0')}</span></a></li>`).join('')}
        <li><a href="#quote"><span class="m">—</span><span class="t">Quote list</span><span class="m">40</span></a></li>
        <li><a href="#record"><span class="m">—</span><span class="t">Institution record</span><span class="m">41</span></a></li>
      </ol>
    </div>
  </section></div>`;
}

function vCatalogue() {
  return `<div class="sheet">
  <section class="grid" style="padding-top:28px">
    <h1 class="h1" style="grid-column:1/8">The catalogue</h1>
    <p class="body" style="grid-column:8/13;align-self:end">Nine series, grouped by field of study. Each compound is listed by catalogue number, with its sizes and price per vial in Canadian dollars before tax. <span class="sample">Sample list</span></p>
  </section>
  ${AREAS.map(a => `<section class="band" aria-labelledby="b${a.c}">
    <div class="num"><p class="giant" aria-hidden="true">${a.c}</p></div>
    <div class="info">
      <div class="label"><span class="m">Series ${a.c}</span><span class="m tab">${a.it.length} compounds · ${range(a)}</span></div>
      <h2 class="h2" id="b${a.c}"><a href="#series-${a.c}">${esc(a.f)}</a></h2>
      <p class="body">${esc(a.d)}</p>
      ${rowsTable(a.it)}
    </div></section>`).join('')}
  </div>`;
}

function vSeries(c) {
  const a = AREAS.find(x => x.c === c);
  if (!a) return vMissing();
  const i = AREAS.indexOf(a), prev = AREAS[i - 1], next = AREAS[i + 1];
  return `<div class="sheet">
  <section class="s-head">
    <div class="over">
      <span class="m">Series ${a.c} · ${a.it.length} compounds</span>
      <h1 class="h2">${esc(a.f)}</h1>
      <p class="body">${esc(a.d)}</p>
    </div>
    <p class="giant" aria-hidden="true">${a.c}</p>
  </section>
  <section class="grid blk" style="margin-top:56px">
    <div style="grid-column:1/13">${rowsTable(a.it)}</div>
  </section>
  <section class="blk">${plate(`assets/plates/s${a.c}.webp`, `Fig. ${a.c}`, `Series ${a.c} · 5 mg and 10 mg vials · Cycles render, sample labels`, `The three compounds of series ${a.c} in sealed vials on a pale set`, '2/1')}</section>
  <nav class="rule blk" aria-label="Series">
    ${prev ? `<a class="m" href="#series-${prev.c}">← Series ${prev.c}</a>` : '<span class="m">—</span>'}
    ${next ? `<a class="m" href="#series-${next.c}">Series ${next.c} →</a>` : '<a class="m" href="#catalogue">Catalogue →</a>'}
  </nav></div>`;
}

let tab = 'identity';
function vCompound(id) {
  const p = byId(id);
  if (!p) return vMissing();
  const a = areaOf(p), s = pick[id] || 0;
  const sib = a.it.filter(x => x.id !== id);
  return `<section class="stage" aria-label="${esc(p.n)}">
  <div class="slab">
    <div class="sh"><b>PR6</b><span class="slash" aria-hidden="true">/</span><span class="m">Series ${a.c}</span></div>
    <div class="left">
      <div><h1 class="nm">${esc(p.n)}</h1></div>
      <p class="cls">${esc(p.cls)}. ${esc(a.f)}. <span class="sample">Sample</span></p>
      <div class="sf"><span class="m">Catalogue no.</span><div class="box ty" data-ty="${p.id}">${p.id}</div></div>
      <div class="sf"><span class="m">Format</span><div class="box ty" data-ty="LYOPHILISED POWDER">LYOPHILISED POWDER</div></div>
      <div class="sf"><span class="m">Method</span><div class="box ty" data-ty="RP-HPLC · ESI-MS">RP-HPLC · ESI-MS</div></div>
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
  <div class="sheet">
    <section class="rec-top">
      <h2 class="h1">${esc(p.n)}</h2>
      <p class="caps">${esc(p.cls)}, supplied as a lyophilised powder in a sealed glass vial. ${esc(p.lot)} was tested by ${esc(p.tested)}, independent of PR6, by RP-HPLC and ESI-MS. The certificate travels with the vial.</p>
    </section>
    <div class="tabs" role="tablist" aria-label="Record">
      ${[['identity', 'Identity'], ['lot', 'This lot'], ['docs', 'Documents'], ['handling', 'Handling']].map(([k, l]) =>
        `<button role="tab" id="t-${k}" aria-controls="tp" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('')}
    </div>
    <div id="tp" role="tabpanel" aria-labelledby="t-${tab}">${tabBody(p)}</div>
    <section class="blk">
      <div class="rule"><span class="m">Also in series ${a.c}</span><a class="m" href="#series-${a.c}">All of series ${a.c} →</a></div>
      ${rowsTable(sib)}
    </section>
  </div>`;
}
function tabBody(p) {
  const a = areaOf(p);
  if (tab === 'identity') return `<div class="panel"><dl class="dl">
    <dt>Catalogue no.</dt><dd class="mono">${p.id}</dd>
    <dt>Name</dt><dd>${esc(p.n)} <span class="sample">Placeholder</span></dd>
    <dt>Class</dt><dd>${esc(p.cls)}</dd>
    <dt>Series</dt><dd>${a.c} · ${esc(a.f)}</dd>
    <dt>Sequence</dt><dd class="mono">${esc(p.seq)}</dd>
    <dt>Formula</dt><dd class="mono">${esc(p.formula)}</dd>
    <dt>Mol. weight</dt><dd class="mono">${esc(p.mw)}</dd>
    <dt>CAS no.</dt><dd class="mono">${esc(p.cas)}</dd>
    <dt>Format</dt><dd>${esc(p.form)}, sealed glass vial</dd>
  </dl><aside><p class="caps" style="font-size:12px">${RUO}</p></aside></div>`;
  if (tab === 'lot') {
    const t = tracePath(p);
    return `<div class="panel"><dl class="dl">
      <dt>Lot</dt><dd class="mono">${esc(p.lot)}</dd>
      <dt>Purity</dt><dd class="mono">${esc(p.purity)} by RP-HPLC <span class="sample">From the CoA</span></dd>
      <dt>Identity</dt><dd>ESI-MS, mass confirmed</dd>
      <dt>Tested by</dt><dd>${esc(p.tested)}</dd>
      <dt>CoA date</dt><dd class="mono">${p.tdate}</dd>
    </dl><aside><p class="body">The trace below is a drawn placeholder. The real chromatogram from this lot's certificate replaces it.</p></aside>
    <div class="full trace">
      <div class="rule"><span class="m">Fig. ${p.id.slice(6)} · RP-HPLC, 214 nm</span><span class="sample">Sample trace, not data</span></div>
      <svg viewBox="-10 -40 1030 300" role="img" aria-label="Placeholder HPLC trace with one main peak">
        <line class="ax" x1="0" y1="196" x2="1000" y2="196"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<line class="ax" x1="${i * 200}" y1="196" x2="${i * 200}" y2="204"/><text x="${i * 200}" y="226" text-anchor="${i === 0 ? 'start' : i === 5 ? 'end' : 'middle'}">${i * 6} MIN</text>`).join('')}
        <path class="ln" id="tl" d="${t.d}" pathLength="1"/>
        <path class="ld" d="M${t.mx.toFixed(0)} ${t.my.toFixed(0)} L${(t.mx + 60).toFixed(0)} -20 L${(t.mx + 260).toFixed(0)} -20"/>
        <text class="k" x="${(t.mx + 70).toFixed(0)}" y="-28">MAIN PEAK · PURITY ${esc(p.purity)}</text>
        <text x="0" y="-28">+ ×</text><text x="1000" y="-28" text-anchor="end">+ ×</text>
      </svg>
    </div></div>`;
  }
  if (tab === 'docs') return `<div class="panel"><ul class="docs full">
    ${[['CoA', 'Certificate of analysis, ' + p.lot], ['SDS', 'Safety data sheet'], ['HPLC', 'Chromatogram, RP-HPLC'], ['MS', 'Mass spectrum, ESI-MS']].map(([k, l]) =>
      `<li><span class="m">${k}</span><span>${esc(l)}</span><span class="sample">Owner to supply</span></li>`).join('')}
  </ul></div>`;
  return `<div class="panel"><dl class="dl">
    <dt>Storage</dt><dd>${esc(p.store)}</dd>
    <dt>Shelf life</dt><dd>${esc(p.shelf)}</dd>
    <dt>Dispatch</dt><dd>Cold pack, tracked, to the institution's registered address only</dd>
    <dt>Use</dt><dd>${RUO}</dd>
  </dl></div>`;
}
function setSize(id, j) {
  pick[id] = j; store.set('pick', pick);
  const p = byId(id);
  main.querySelectorAll('[data-size]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.size === j)));
  const pr = $('#price'); if (pr) { pr.dataset.ty = cad(p.sizes[j].price); typeIn(pr.parentElement); }
  fZ.value = String(j);
  const b = $('#buy'); if (b) { delete b.dataset.done; b.textContent = 'Add to quote'; }
}
function drawTrace() {
  const l = $('#tl'); if (!l || RM) return;
  l.style.strokeDasharray = '1'; l.style.strokeDashoffset = '1';
  l.getBoundingClientRect();
  l.style.transition = 'stroke-dashoffset 2.6s cubic-bezier(.6,0,.2,1)'; l.style.strokeDashoffset = '0';
}
function wireCompound(id) {
  const p = byId(id);
  main.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => setSize(id, +b.dataset.size)));
  $('#buy').addEventListener('click', e => {
    const s = pick[id] || 0; addQ(id, s);
    const b = e.currentTarget; b.dataset.done = '1';
    const l = inQuote(id, s); b.textContent = `In quote · ${l.q} × ${fmtSize(p.sizes[s])}`;
  });
  main.querySelector('.tabs').addEventListener('click', e => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    tab = t.dataset.tab;
    main.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === t)));
    const tp = $('#tp'); tp.setAttribute('aria-labelledby', t.id); tp.innerHTML = tabBody(p);
    if (tab === 'lot') drawTrace();
  });
  main.querySelector('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const bs = [...main.querySelectorAll('[data-tab]')], i = bs.findIndex(b => b.getAttribute('aria-selected') === 'true');
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); n.click();
  });
  if (tab === 'lot') drawTrace();
}

function vQuote() {
  const lines = quote.map(l => ({...l, p: byId(l.id)})).filter(l => l.p);
  const total = lines.reduce((a, l) => a + l.q * l.p.sizes[l.s].price, 0);
  return `<div class="sheet">
  <section class="grid" style="padding-top:28px">
    <h1 class="h1" style="grid-column:1/8">Quote list</h1>
    <p class="body" style="grid-column:8/13;align-self:end">Collect the vials your institution needs, then send the list as a quote request. PR6 replies with a quote and invoice on your institution's terms.</p>
  </section>
  <section class="blk" style="margin-top:56px">
  ${lines.length ? `<table class="rows qrows"><thead><tr><th>Catalogue no.</th><th>Compound</th><th>Size</th><th>Vials</th><th>Line</th></tr></thead><tbody>
    ${lines.map((l, i) => `<tr>
      <td class="c">${l.id}</td><td class="n"><a href="#c-${l.id}">${esc(l.p.n)}</a></td>
      <td class="k">${fmtSize(l.p.sizes[l.s])} · ${cad(l.p.sizes[l.s].price)}</td>
      <td><span class="qty"><button type="button" data-q="${i}" data-d="-1" aria-label="One fewer ${esc(l.p.n)}">−</button><span class="tab">${l.q}</span><button type="button" data-q="${i}" data-d="1" aria-label="One more ${esc(l.p.n)}">+</button></span></td>
      <td class="p tab">${cad(l.q * l.p.sizes[l.s].price)}</td></tr>`).join('')}
  </tbody></table>
  <div class="total"><span class="m">Total before tax, CAD</span><b class="tab">${cad(total)}</b></div>
  <form class="form" id="qf" novalidate>
    <label><span class="m">Institution</span><input id="q-inst" name="inst" autocomplete="organization" required></label>
    <label><span class="m">Department or lab</span><input id="q-dept" name="dept"></label>
    <label><span class="m">Contact name</span><input id="q-name" name="name" autocomplete="name" required></label>
    <label><span class="m">Work email</span><input id="q-mail" name="mail" type="email" autocomplete="email" required></label>
    <label><span class="m">PO number (optional)</span><input id="q-po" name="po"></label>
    <label><span class="m">Member no.</span><input id="q-mem" name="mem" value="0047" readonly></label>
    <label class="full"><span class="m">Notes</span><textarea id="q-notes" name="notes"></textarea></label>
    <p class="err full" id="qerr" role="alert" hidden></p>
    <div class="full buy" style="width:min(100%,460px)"><button class="pill" type="submit">Send quote request</button></div>
  </form>
  <p class="note" id="qok" role="status" hidden>Prototype: nothing was sent. In the portal this becomes a quote request to PR6, answered with a quote and invoice.</p>`
  : `<div class="empty"><p class="lede">The list is empty. Add vials from any compound page, or from the rows in the <a href="#catalogue">catalogue</a>.</p></div>`}
  </section></div>`;
}
function wireQuote() {
  main.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => {
    const l = quote[+b.dataset.q]; l.q += +b.dataset.d;
    if (l.q <= 0) quote.splice(+b.dataset.q, 1);
    saveQ(); render();
  }));
  const f = $('#qf'); if (!f) return;
  f.addEventListener('submit', e => {
    e.preventDefault();
    const miss = [['q-inst', 'institution'], ['q-name', 'contact name'], ['q-mail', 'work email']].filter(([i]) => !$('#' + i).value.trim());
    const mail = $('#q-mail').value.trim();
    const err = $('#qerr');
    if (miss.length) { err.hidden = false; err.textContent = 'Add the ' + miss.map(m => m[1]).join(', ') + ' to send the request.'; $('#' + miss[0][0]).focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) { err.hidden = false; err.textContent = 'The work email looks incomplete. Check it and send again.'; $('#q-mail').focus(); return; }
    err.hidden = true; $('#qok').hidden = false; $('#qok').focus?.();
  });
}

function vRecord() {
  return `<div class="sheet">
  <section class="grid" style="padding-top:28px">
    <h1 class="h1" style="grid-column:1/8">Institution record</h1>
    <p class="body" style="grid-column:8/13;align-self:end">The details PR6 holds for your institution. Changes go to PR6 for approval before they take effect. <span class="sample">Sample record</span></p>
  </section>
  <section class="panel blk" style="margin-top:56px"><dl class="dl">
    <dt>Member no.</dt><dd class="mono">0047</dd>
    <dt>Institution</dt><dd>[Vetted institution]</dd>
    <dt>Status</dt><dd>Approved in person by PR6</dd>
    <dt>Ship to</dt><dd>[Registered laboratory address]</dd>
    <dt>Invoice terms</dt><dd>[Net 30, on PO]</dd>
    <dt>Contacts</dt><dd>[Principal investigator] · [Lab manager]</dd>
    <dt>Documents</dt><dd>Signed research-use declaration, on file</dd>
  </dl><aside><p class="body">To change a contact or address, write to PR6 Liaison. Access is by invitation only, and codes are never reissued by email.</p></aside></section>
  </div>`;
}
const vMissing = () => `<div class="sheet empty"><h1 class="h1">Not in the catalogue</h1><p class="lede" style="margin-top:20px">That page does not exist. Go to the <a href="#catalogue">catalogue</a>.</p></div>`;

function vGate() {
  return `<section class="gate">
    <div class="top"><span class="m">Object 0047</span><span class="m">Private</span></div>
    <form id="gf" novalidate>
      <p class="giant" aria-hidden="true" style="margin-left:-.05em;letter-spacing:-.045em">0047</p>
      <label class="sf" for="g-code"><span class="m">Access code</span></label>
      <input class="box" id="g-code" autocomplete="off" autocapitalize="characters" spellcheck="false" style="font:400 16px/1 var(--mono);letter-spacing:.2em;text-transform:uppercase;border:1px solid rgba(23,28,31,.32);border-radius:3px;padding:14px;background:transparent">
      <p class="err" id="gerr" role="alert" hidden style="color:var(--orange-ink);font:400 11px/1.4 var(--mono);margin:0"></p>
      <button class="pill" type="submit">Enter</button>
    </form>
    <div class="bot"><span class="m">By invitation</span><span class="m">Demo code 0047RSRV</span></div>
  </section>`;
}

/* ---------- router ---------- */
const PATHS = {index: 'Index', catalogue: 'Catalogue', quote: 'Quote list', record: 'Institution record'};
function render() {
  const h = location.hash.replace(/^#\/?/, '');
  let r = h, arg = '';
  const m = h.match(/^(series|c)[-/](.+)$/);
  if (m) { r = m[1]; arg = m[2]; }
  const ok = opened();
  $('#head').hidden = $('#folio').hidden = !ok;
  if (!ok) {
    main.innerHTML = vGate();
    $('#gf').addEventListener('submit', e => {
      e.preventDefault();
      const v = $('#g-code').value.trim().toUpperCase().replace(/\s/g, '');
      if (v === KEY) { try { sessionStorage.setItem('pr6form.in', '1'); } catch { /* ignore */ } render(); }
      else { const er = $('#gerr'); er.hidden = false; er.textContent = 'That code does not open this object.'; $('#g-code').select(); }
    });
    return;
  }
  let html, path, pg, c = '', id = '', nav = '';
  if (r === 'catalogue') { html = vCatalogue(); path = 'Catalogue'; pg = 2; nav = 'catalogue'; }
  else if (r === 'series') { html = vSeries(arg); c = arg; path = `Catalogue / Series ${arg}`; pg = 2 + parseInt(arg, 10); nav = 'catalogue'; }
  else if (r === 'c') { const p = byId(arg); html = vCompound(arg); id = arg; c = p ? p.c : ''; path = p ? `Catalogue / Series ${p.c} / ${p.id}` : 'Catalogue'; pg = 12 + ALL.indexOf(p); nav = 'catalogue'; }
  else if (r === 'quote') { html = vQuote(); path = PATHS.quote; pg = 40; nav = 'quote'; }
  else if (r === 'record') { html = vRecord(); path = PATHS.record; pg = 41; nav = 'record'; }
  else { html = vIndex(); path = PATHS.index; pg = 1; }
  main.innerHTML = html;
  $('#path').textContent = path;
  $('#pg').textContent = 'P. ' + String(pg).padStart(2, '0');
  document.querySelectorAll('[data-nav]').forEach(a => a.toggleAttribute('aria-current', a.dataset.nav === nav));
  document.title = (path === 'Index' ? 'PR6' : 'PR6 · ' + path.split(' / ').pop());
  bar(c, id);
  if (r === 'c' && byId(arg)) wireCompound(arg);
  if (r === 'quote') wireQuote();
  typeIn(main);
  scrollTo(0, 0);
}
addEventListener('hashchange', () => { if (location.hash === '#main') return; if (!location.hash.startsWith('#c-')) tab = 'identity'; render(); });
counts();
render();
