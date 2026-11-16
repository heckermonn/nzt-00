// PR6 / Institute: the member side. Atrium (A10), Compass (A11), Formulary and records (A12), Archive (A13),
// Nominations (A14), Orders and Support (A15), with Dispatches, Account and Library.
// Rooms with something to look at get a picture beside the page; services (orders, support, account) are plain,
// fast pages. No task here needs the picture, a pointer, or motion.
import { INSIGNIA, glyph } from './insignia.js';
import { store, fmtId } from './store.js';
import { GENERATIONS, RIGHTS, TOKENS, STANDINGS, CARD, ORDER_STATE, ORDER_NOTE } from './institution.js';
import { SERIES, ALL, CHECKS, byId, seriesOf, statusOf, cad, canOrder, LABEL_LINE, recordFields, DISPATCHES, dispatch, COMPASS, COMPASS_ORDER, INTEREST_FIELDS, TOPICS, SAFETY_OVERVIEW } from './catalog.js';
import { $, $$, esc, fmtDate, fmtTime, field, setErr } from './ui.js';

const plain = (app, theme = 'inside') => app.scene({ layout: 'off', theme });
// a room beside the page: the camera stands at a named shot (the world), or a still is fitted (no WebGL)
const pane = (app, shot, arg, frame, view, o = {}) => app.scene({ layout: 'pane', theme: 'inside', shot, arg, frame, view, need: o.need ?? 0.9, dur: o.dur ?? 1.4, setup: o.setup });
const tag = (r) => `<span class="tag ${r.status === 'available' ? 'on' : r.status === 'review' ? 'mid' : ''}">${statusOf(r).label}</span>`;
const hashQuery = () => Object.fromEntries(new URLSearchParams((location.hash.split('?')[1] || '')));
const left = (m) => 5 - m.nominations.filter((n) => n.state !== 'revoked-unused').length;
const isSaved = (m, k, id) => m.saved.some((s) => s.k === k && s.id === id);
const toggleSave = (m, k, id) => { const i = m.saved.findIndex((s) => s.k === k && s.id === id); if (i >= 0) m.saved.splice(i, 1); else m.saved.push({ k, id, t: Date.now() }); store.save(); return i < 0; };
const saveBtn = (m, k, id) => `<button class="link" type="button" data-save="${k}:${id}" aria-pressed="${isSaved(m, k, id)}">${isSaved(m, k, id) ? 'Saved to your Library. Remove' : 'Save to your Library'}</button>`;
const bindSave = (root, m) => root.addEventListener('click', (e) => { const b = e.target.closest('[data-save]'); if (!b) return; const [k, id] = b.dataset.save.split(':'); const on = toggleSave(m, k, id); b.textContent = on ? 'Saved to your Library. Remove' : 'Save to your Library'; b.setAttribute('aria-pressed', on); });

// ---------------------------------------------------------------------------------------------- A10 the Atrium
export async function atrium(app) {
  const m = store.member(), ok = app.live(), view = app.view, marks = app.marks;
  const first = !m.seenAtrium;
  app.amb('inside');
  const vf = (S) => (app.narrow() ? { cx: 0.5, cy: (0.5 - 56 / Math.max(1, S.ch)) * S.span[1], zoom: 1 } : { cx: 0.5, cy: 0.5, zoom: 1.05 });
  const F = await app.scene({ layout: 'full', theme: 'inside', shot: 'atrium', frame: 'atrium', need: app.narrow() ? 0.8 : 0, view: vf, setup: (S) => { S.vig = 0.06; S.parK = 0.02; }, dur: 1.8 });
  if (!ok()) return null;
  if (first) { m.seenAtrium = true; store.save(); app.sfx('arrive'); }
  const D = [['compass', 'Discover', 'The Compass'], ['formulary', 'Explore', 'The Formulary'], ['archive', 'View', 'Your Archive']];
  const narrow = app.narrow();
  view.innerHTML = `<section class="atrium">
    <div class="prompt">
      <p class="inscription" aria-label="Member ${esc(m.initials.split('').join(' '))}, Generation one">${esc(m.initials.split('').join(' '))} ${glyph(m.lineage)} Generation I</p>
      <h1>What are we pursuing today?</h1>
    </div>
    ${narrow ? `<div class="dest-list"><ul class="rows">${D.map(([k, a, t]) => `<li><a class="row" href="#/${k}" data-k="${k}"><span class="n">${a}</span><span class="t">${t}</span></a></li>`).join('')}</ul></div>` : ''}
    <p class="also"><a href="#/orders">Orders</a><a href="#/dispatches">Dispatches</a><a href="#/nominations">Nominations</a><a href="#/support">Support</a></p>
  </section>`;
  // the three openings in the far wall are the three ways on: choosing one walks the camera through it
  if (!narrow && F) marks.innerHTML = D.map(([k, a, t]) => `<a class="dest" href="#/${k}" data-k="${k}"><span class="k">${a}</span><span class="t">${t}</span></a>`).join('');
  const place = () => { if (!narrow) for (const el of marks.children) app.place(el, el.dataset.k + '_base'); };
  place();
  return {
    title: 'Atrium', crumb: '', noFocus: first, tick: app.world ? null : place, after: place,
    resize: () => { if (app.narrow() !== narrow) app.go('#/atrium'); else if (app.stage) app.stage.viewA = vf(app.stage); },
  };
}

// ---------------------------------------------------------------------------------------------- A11 the Compass
let session = null;   // answers kept for this visit only, when the member has not asked for them to be stored
// The Compass is the member's wayfinder. They stand at the centre of the card and every place in the institution lies
// on a bearing around them. The card comes to rest with whatever is waiting for them ahead (what they need); turning
// it, or saying where they want to be, brings another place ahead (what they want). It finds places, records by name
// and notes by title. It never matches a goal to a product: a word like "focus" leads to reading, and nowhere else.
// The five questions live on as the reading index, one of the places on the card.
const WAYS = [
  { k: 'formulary', href: '#/formulary', t: 'The Formulary', go: 'Enter the Formulary', kw: 'store shop buy browse records vials catalogue series cases compounds' },
  { k: 'order', href: '#/order', t: 'Order list', go: 'Open your order list', kw: 'cart basket checkout pay payment' },
  { k: 'orders', href: '#/orders', t: 'Orders', go: 'See your orders', kw: 'past tracking shipped shipping delivery invoice receipt history parcel' },
  { k: 'support', href: '#/support', t: 'Support', go: 'Ask support', kw: 'help contact question problem refund return professional person human' },
  { k: 'archive', href: '#/archive', t: 'Your Archive', go: 'Open your Archive', kw: 'stele record member number lineage insignia tokens card rights standing account' },
  { k: 'nominations', href: '#/nominations', t: 'Nominations', go: 'Open Nominations', kw: 'invite invitation refer friend nominate sponsor' },
  { k: 'index', href: '#/compass/index', t: 'Reading index', go: 'Open your reading index', kw: 'read learn questions preferences focus recovery energy rest sleep calm self-care skin ageing longevity strength knowledge' },
  { k: 'dispatches', href: '#/dispatches', t: 'Dispatches', go: 'Read the Dispatches', kw: 'articles notes news evidence certificate analysis grades film talk' },
];
const STEP = (2 * Math.PI) / WAYS.length;
// what each place holds for this member now, and how strongly it calls (the strongest call is ahead on arrival)
function wayState(m, cp) {
  const n = m.cart.reduce((s, l) => s + l.qty, 0), open = m.orders.filter((o) => o.state < 4), asks = m.tickets.filter((t) => t.state === 'open').length;
  return {
    formulary: { d: `Nine cases, ${ALL.length} records.`, call: 1 },
    order: { d: n ? `${n} ${n === 1 ? 'item' : 'items'} waiting to be ordered.` : 'Nothing in it yet.', call: n ? 5 : 0, mark: n ? String(n) : '' },
    orders: { d: open.length ? `Order ${open[0].id} is ${ORDER_STATE[open[0].state].toLowerCase()}.` : m.orders.length ? `${m.orders.length} placed, all delivered.` : 'No orders yet.', call: open.length ? 4 : 0, mark: open.length ? String(open.length) : '' },
    support: { d: asks ? `${asks} ${asks === 1 ? 'request' : 'requests'} open. A person answers.` : 'A person answers.', call: asks ? 3 : 0, mark: asks ? String(asks) : '' },
    archive: { d: `Member ${fmtId(m.id)}. Your stele, your tokens, your rights.`, call: 0 },
    nominations: { d: m.nominationsOpen ? `${left(m)} of 5 places left to give.` : 'They open after a first order.', call: 0 },
    index: { d: cp && cp.done ? 'Reading arranged from your answers.' : 'Five optional questions set what you read first.', call: 0 },
    dispatches: { d: `${DISPATCHES.length} notes. Latest: ${DISPATCHES[0].title}.`, call: 0 },
  };
}
function wayFind(q, m, st) {
  q = q.trim().toLowerCase(); if (q.length < 2) return null;
  const hits = [], at = (k) => WAYS.findIndex((w) => w.k === k), has = (s) => s.toLowerCase().includes(q);
  WAYS.forEach((w, i) => { if (has(w.t) || w.kw.split(' ').some((x) => x.startsWith(q))) hits.push({ href: w.href, t: w.t, d: st[w.k].d, i }); });
  for (const r of ALL) if (has(r.id) || has(r.name) || r.id.slice(-4).includes(q)) hits.push({ href: '#/record/' + r.id, t: r.name, d: `${r.id} · a record in the Formulary`, i: at('formulary') });
  for (const s of SERIES) if (has(s.n) || has(s.f)) hits.push({ href: '#/formulary/' + s.c, t: `${s.n} · ${s.f}`, d: 'A case in the Formulary', i: at('formulary') });
  for (const d of DISPATCHES) if (has(d.title)) hits.push({ href: '#/dispatches/' + d.id, t: d.title, d: `${d.kind} · a Dispatch`, i: at('dispatches') });
  for (const o of m.orders) if (has(o.id)) hits.push({ href: '#/orders/' + o.id, t: 'Order ' + o.id, d: ORDER_STATE[o.state], i: at('orders') });
  return hits.slice(0, 6);
}
const hitsHtml = (hits) => (hits.length ? hits.map((h) => `<li><a href="${h.href}" data-i="${h.i}"><span class="t">${esc(h.t)}</span><span class="d">${esc(h.d)}</span></a></li>`).join('')
  : '<li class="none">Nothing by that name. <a href="#/support?topic=other">Ask support to point you there</a>.</li>');

export async function compass(app, args) {
  if (args[0]) return compassIndex(app, args);
  const m = store.member(), ok = app.live(), view = app.view, marks = app.marks, W3 = app.world;
  const cp = (m.compassConsent && m.compass) || session, st = wayState(m, cp);
  const need = WAYS.reduce((b, w, i) => (st[w.k].call > st[WAYS[b].k].call ? i : b), 0);
  app.amb('inside');
  const ask = `<label for="wq">Say where, or turn the Compass</label>
      <input id="wq" type="search" autocomplete="off" spellcheck="false" placeholder="A record, an order, a question" aria-controls="wh">
      <ul class="wf-hits" id="wh" hidden></ul>`;
  const bindAsk = (onHit) => {
    const q = $('#wq', view), list = $('#wh', view);
    q.addEventListener('input', () => { const hits = wayFind(q.value, m, st); list.hidden = !hits; if (hits) { list.innerHTML = hitsHtml(hits); if (hits.length && onHit) onHit(hits[0].i); } });
    q.addEventListener('keydown', (e) => { if (e.key !== 'Enter') return; const a = $('a', list); if (a && !list.hidden) { e.preventDefault(); app.go(a.getAttribute('href')); } });
  };
  if (!W3) {
    // no live world: the same wayfinder as a page, with what is waiting first
    await pane(app, 'compass', null, app.has('compass6') ? 'compass6' : 'compass0', () => ({ cx: 0.5, cy: 0.5, zoom: 1 })); if (!ok()) return null;
    const order = WAYS.map((w, i) => i).sort((a, b) => st[WAYS[b].k].call - st[WAYS[a].k].call || a - b);
    view.innerHTML = `<div class="page"><header><h1 class="title">Where do you need to be?</h1>
      <p class="lead">You are at the centre. Everything in the institution is one step from here${st[WAYS[need].k].call > 1 ? `, and ${WAYS[need].t.toLowerCase()} is first because something there is waiting for you` : ''}.</p></header>
      <div class="field wf-q">${ask}</div>
      <ul class="rows" style="margin-top:26px">${order.map((i) => { const w = WAYS[i]; return `<li><a class="row plain" href="${w.href}"><span><span class="t">${w.t}</span><span class="d">${st[w.k].d}</span></span>${st[w.k].mark ? `<span class="m">${st[w.k].mark} waiting</span>` : ''}</a></li>`; }).join('')}</ul></div>`;
    bindAsk(null);
    return { title: 'Compass', crumb: 'Compass' };
  }
  // ---- the member at the centre of the card
  let cur = need, head = need * STEP, drag = null;
  W3.compassGoal = 1; W3.compassPoint = 1; W3.compassHead = head;
  if (!app.motion() || W3.compassT < 0.5) { W3.compassT = 1; W3.compassHeadT = head; }
  await app.scene({ layout: 'full', theme: 'inside', shot: 'wayfind', dur: 2.0 }); if (!ok()) return null;
  view.innerHTML = `<section class="wayfind">
    <div class="wf-ask"><h1>Where do you need to be?</h1><div class="field wf-q">${ask}</div></div>
    <div class="wf-cap" aria-live="polite"><h2 id="wn"></h2><p id="wd"></p><a class="btn" id="wgo" href="#"></a></div>
  </section>`;
  marks.innerHTML = `<svg class="wf-needle" aria-hidden="true"><line id="wl"></line></svg><div class="wf-turn" aria-hidden="true"></div>
    <span class="wf-you" aria-hidden="true">${glyph(m.lineage)}</span>
    ${WAYS.map((w, i) => `<a class="wf-way" href="${w.href}" data-i="${i}"><span class="t">${w.t}</span>${st[w.k].mark ? `<span class="m" aria-hidden="true">${st[w.k].mark}</span>` : ''}<span class="vh">. ${st[w.k].d}</span></a>`).join('')}`;
  const ways = $$('.wf-way', marks), you = $('.wf-you', marks), line = $('#wl', marks), svg = $('.wf-needle', marks), surf = $('.wf-turn', marks);
  const cap = () => { const w = WAYS[cur]; $('#wn', view).textContent = w.t; $('#wd', view).textContent = st[w.k].d; const go = $('#wgo', view); go.textContent = w.k === 'index' && !(cp && cp.done) ? 'Set your reading index' : w.go; go.href = w.href; ways.forEach((el, i) => el.classList.toggle('ahead', i === cur)); };
  // bring a place ahead by the shorter way round
  const face = (i, quiet) => {
    i = ((i % WAYS.length) + WAYS.length) % WAYS.length;
    let d = (i * STEP - head) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    head += d; W3.compassHead = head; if (!app.motion()) W3.compassHeadT = head;
    if (i !== cur) { cur = i; if (!quiet) app.sfx('tap', 520 + i * 40); cap(); }
  };
  cap();
  const pt = (x, y, z) => W3.project(W3.pt('compass', [x, y, z]));
  let R = 3.5, rpx = 200;
  const place = () => {
    const narrow = app.narrow(), vw = innerWidth, h = W3.compassHeadT; R = narrow ? 3.05 : 3.5;
    const c = pt(0, 0, 0.42), top = pt(0, R - 0.75, 0.05), side = pt(R, 0, 0.05); rpx = Math.max(60, side[0] - c[0]);
    you.style.transform = `translate(${c[0].toFixed(1)}px, ${c[1].toFixed(1)}px)`;
    svg.setAttribute('width', vw); svg.setAttribute('height', innerHeight);
    line.setAttribute('x1', c[0]); line.setAttribute('y1', c[1] - 20); line.setAttribute('x2', top[0]); line.setAttribute('y2', top[1]);
    ways.forEach((el, i) => {
      const th = i * STEP - h, q = pt(R * Math.sin(th), R * Math.cos(th), 0.05), half = el.offsetWidth / 2;
      el.style.transform = `translate(${q[0].toFixed(1)}px, ${q[1].toFixed(1)}px)`;
      el.classList.toggle('off', q[0] - half < 6 || q[0] + half > vw - 6);
    });
    const back = pt(0, -R, 0.05);
    surf.style.transform = `translate(${(c[0] - rpx).toFixed(0)}px, ${(top[1] - 10).toFixed(0)}px)`; surf.style.width = (2 * rpx).toFixed(0) + 'px'; surf.style.height = Math.max(40, back[1] - top[1] + 20).toFixed(0) + 'px';
  };
  place();
  // turning by hand: the far side of the card follows the finger, and it settles on the nearest place
  surf.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, h: head, id: e.pointerId, t: performance.now(), moved: 0 }; surf.setPointerCapture(e.pointerId); surf.classList.add('on'); });
  surf.addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; drag.moved = Math.max(drag.moved, Math.abs(dx)); head = drag.h - dx / rpx; W3.compassHead = head; if (!app.motion()) W3.compassHeadT = head; const i = Math.round(head / STEP); const j = ((i % WAYS.length) + WAYS.length) % WAYS.length; if (j !== cur) { cur = j; cap(); } });
  const drop = (e) => { if (!drag) return; const dx = e.clientX - drag.x, fast = Math.abs(dx) > 24 && performance.now() - drag.t < 260; let i = Math.round(head / STEP); if (fast && i === Math.round(drag.h / STEP)) i -= Math.sign(dx); drag = null; surf.classList.remove('on'); cur = -1; face(i); };
  surf.addEventListener('pointerup', drop); surf.addEventListener('pointercancel', drop);
  marks.addEventListener('focusin', (e) => { const a = e.target.closest('.wf-way'); if (a) face(+a.dataset.i, true); });
  const keys = (e) => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); face(cur + (e.key === 'ArrowRight' ? 1 : -1)); }
    if (e.key === 'Enter' && !e.target.closest('a, button')) { e.preventDefault(); app.go(WAYS[cur].href); }
  };
  document.addEventListener('keydown', keys);
  bindAsk((i) => face(i, true));
  $('#wh', view).addEventListener('focusin', (e) => { const a = e.target.closest('a[data-i]'); if (a) face(+a.dataset.i, true); });
  return {
    title: 'Compass', crumb: 'Compass', tick: place, after: place, resize: place,
    leave: () => { document.removeEventListener('keydown', keys); W3.compassPoint = 0; },
  };
}

// the reading index: five optional questions, then reading arranged from the answers (#/compass/index, #/compass/edit)
async function compassIndex(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, W3 = app.world;
  const c = (m.compassConsent && m.compass) || session || { a: {}, done: false };
  let step = args[0] === 'edit' ? 0 : c.done ? 5 : -1;
  const frameFor = (s) => { const want = s + 1; let best = null; for (let i = 0; i <= 6; i++) if (app.has('compass' + i) && (best === null || Math.abs(i - want) < Math.abs(best - want))) best = i; return best === null ? 'compass0' : 'compass' + best; };
  const vf = () => ({ cx: 0.5, cy: 0.5, zoom: 1 });
  app.amb('inside');
  // the blades stand scattered until a direction is chosen, and settle a little with every answer
  const settle = () => { if (W3) W3.compassGoal = (step + 1) / 6; };
  settle(); if (W3 && !app.motion()) W3.compassT = W3.compassGoal;
  await pane(app, 'compass', null, frameFor(step), vf); if (!ok()) return null;
  const persist = () => { if (m.compassConsent) { m.compass = c; session = null; } else { m.compass = null; session = c; } store.save(); };
  const label = (k, v) => { const o = COMPASS[k].opts.find((x) => x[0] === v); return o ? o[1] : ''; };
  const render = (focus = true) => {
    if (W3) settle(); else pane(app, 'compass', null, frameFor(step), vf);
    if (step === -1) {
      view.innerHTML = `<div class="page"><header><h1 class="title">Choose the direction that deserves your attention.</h1>
        <p class="lead">Five short questions, each one optional. They arrange your reading. They do not diagnose, and they never match a product to a goal.</p></header>
        <label class="check"><input type="checkbox" id="keep" ${m.compassConsent ? 'checked' : ''}><span>Keep my choices on my record, so my index is here next time.<span class="note">Optional. Without it, your choices last for this visit only.</span></span></label>
        <div class="actions"><button class="btn" type="button" id="start">Begin</button><a class="link" href="#/formulary">Go straight to the Formulary</a></div></div>`;
      $('#keep', view).addEventListener('change', (e) => { m.compassConsent = e.target.checked; if (!m.compassConsent) m.compass = null; store.save(); });
      $('#start', view).addEventListener('click', () => { step = 0; app.sfx('tap'); render(); });
    } else if (step < 5) {
      const k = COMPASS_ORDER[step], Q = COMPASS[k], cur = c.a[k] || (Q.multi ? [] : null);
      const on = (v) => (Q.multi ? cur.includes(v) : cur === v);
      view.innerHTML = `<div class="page"><div class="steps" aria-hidden="true">${COMPASS_ORDER.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
        <p class="label">Question ${step + 1} of 5</p><h1 class="title" style="margin-top:10px">${Q.q}</h1><p class="lead dim" style="margin-top:12px">${Q.help}</p>
        <div class="opts" role="${Q.multi ? 'group' : 'radiogroup'}" aria-label="${esc(Q.q)}">${Q.opts.map(([v, t]) => `<button class="opt" type="button" role="${Q.multi ? 'checkbox' : 'radio'}" aria-checked="${on(v)}" data-v="${v}">${t}</button>`).join('')}</div>
        <div class="actions"><button class="btn" type="button" id="next">${step < 4 ? 'Next' : 'See my index'}</button><button class="link" type="button" id="skipq">Skip this question</button>${step > 0 ? '<button class="link" type="button" id="prev">Back</button>' : ''}</div></div>`;
      $('.opts', view).addEventListener('click', (e) => {
        const b = e.target.closest('.opt'); if (!b) return; const v = b.dataset.v; app.sfx('tap', 660 + step * 60);
        if (Q.multi) { const a = c.a[k] || (c.a[k] = []); const i = a.indexOf(v); if (i >= 0) a.splice(i, 1); else a.push(v); b.setAttribute('aria-checked', i < 0); } else { c.a[k] = v; $$('.opt', view).forEach((x) => x.setAttribute('aria-checked', x === b)); }
      });
      const fwd = () => { step++; if (step === 5) { c.done = true; c.t = Date.now(); } persist(); render(); };
      $('#next', view).addEventListener('click', fwd);
      $('#skipq', view).addEventListener('click', () => { delete c.a[k]; fwd(); });
      if (step > 0) $('#prev', view).addEventListener('click', () => { step--; render(); });
    } else {
      const intents = c.a.intent || [];
      const topics = (intents.length ? TOPICS.filter((t) => t.for.some((f) => intents.includes(f))) : TOPICS.slice(0, 4)).filter((t) => c.a.preference !== 'read' || t.kind !== 'Film' || true);
      const fields = [...new Set(intents.flatMap((i) => INTEREST_FIELDS[i] || []))].map((cc) => SERIES.find((s) => s.c === cc));
      const detailed = c.a.depth === 'detailed';
      const sec = {
        learn: `<section><h2>Learn</h2><ul class="rows">${topics.map((t) => `<li><div class="row plain"><span><span class="t">${t.title}</span><span class="d">${t.dek}</span><span class="why">${intents.length ? 'Shown because you chose ' + t.for.filter((f) => intents.includes(f)).map((f) => label('intent', f)).join(' and ') + '.' : 'Shown because you did not choose a direction.'}</span></span><span class="m">${t.kind} · sample</span></div></li>`).join('')}</ul></section>`,
        evidence: `<section><h2>Explore the evidence</h2><p class="note">${detailed ? 'You asked for detail, so references are shown in full where a note has them.' : 'You asked for a concise overview. The full references stay one press away.'} What counts as evidence is the same either way.</p>
          <ul class="rows">${['evidence-grades', 'coa'].map((id) => { const d = dispatch(id); return `<li><a class="row plain" href="#/dispatches/${d.id}"><span><span class="t">${d.title}</span><span class="d">${d.dek}</span></span><span class="m">${d.kind}</span></a></li>`; }).join('')}</ul></section>`,
        compare: `<section><h2>Compare eligible options</h2>
          <p class="notice"><strong>No product is matched to a goal.</strong> To do that, a record would need an authorised use for that purpose, approved labelling and evidence for it. None of those is on file for any record, so nothing is shown here rather than a guess.</p>
          ${fields.length ? `<p style="margin-top:16px">You can browse the Formulary by field of study. These fields touch what you chose as subjects of research. They are not suggestions.</p><ul class="rows" style="margin-top:12px">${fields.map((s) => `<li><a class="row" href="#/formulary/${s.c}"><span class="n">${s.c}</span><span><span class="t">${s.f}</span><span class="d">${s.d}</span></span></a></li>`).join('')}</ul>` : '<p style="margin-top:16px"><a href="#/formulary">Browse the Formulary by field of study</a>.</p>'}</section>`,
        expert: `<section><h2>Speak to a professional</h2><p>If a question is about your own health, the right person is a qualified professional who can know your circumstances. PR6 does not give dosing, treatment or regimen guidance.</p><div class="actions" style="margin-top:14px"><a class="btn ghost" href="#/support?topic=referral">Ask support to point you to the right kind</a></div></section>`,
      };
      const first = { learn: 'learn', compare: 'compare', evidence: 'evidence', expert: 'expert' }[c.a.objective] || 'learn';
      const order = [first, ...['learn', 'evidence', 'compare', 'expert'].filter((k) => k !== first)];
      view.innerHTML = `<div class="page"><header><h1 class="title">Your personal index is ready.</h1><p class="lead">Arranged from what you chose, and nothing else. Change an answer and it rearranges.</p></header>
        ${order.map((k) => sec[k]).join('')}
        <section><h2>Safety</h2><ul class="rows">${SAFETY_OVERVIEW.map((t) => `<li><div class="row plain"><span class="t" style="font-size:var(--s3)">${t}</span></div></li>`).join('')}</ul></section>
        <section><h2>Why you are seeing this</h2><dl class="kv">${COMPASS_ORDER.map((k) => `<dt>${COMPASS[k].q}</dt><dd>${c.a[k] ? (Array.isArray(c.a[k]) ? c.a[k].map((v) => label(k, v)).join(', ') || 'Skipped' : label(k, c.a[k])) : 'Skipped'}</dd>`).join('')}
          <dt>Stored</dt><dd>${m.compassConsent ? 'On your record, at your request.' : 'For this visit only.'}</dd></dl>
          <div class="actions"><button class="btn ghost" type="button" id="edit">Change my answers</button><button class="link" type="button" id="clear">Clear my answers</button></div></section></div>`;
      $('#edit', view).addEventListener('click', () => { step = 0; render(); });
      $('#clear', view).addEventListener('click', () => { m.compass = null; session = null; c.a = {}; c.done = false; store.save(); step = -1; render(); });
    }
    if (focus) { const h = $('h1', view); if (h) { h.tabIndex = -1; h.focus({ preventScroll: true }); } window.scrollTo(0, 0); }
  };
  render(false);
  return { title: 'Reading index', crumb: 'Compass' };
}

// ---------------------------------------------------------------------------------------------- A12 the Formulary
const nicheRect = (F, i) => {
  if (!F) return null; const r = F.info.rects && F.info.rects['n' + i]; if (r) return r;
  const p = F.info.marks['n' + i]; return p ? [[p[0] - 0.11, p[1] - 0.12], [p[0] + 0.11, p[1] + 0.12]] : null;
};
// The stand in a case turns by hand: drag sideways on the picture and it follows; let go and it settles on the
// nearest vial. The same choice is always there as links in the page, so this is an extra way and never the only one.
function turner(app, c, onPick) {
  const W3 = app.world, marks = app.marks; if (!W3) return () => {};
  const el = document.createElement('div'); el.className = 'turner'; el.setAttribute('aria-hidden', 'true'); marks.appendChild(el);
  const d = (W3.zones.formulary && W3.zones.formulary.man.anchors.dims) || { ring: 0.305, NW: 1.8 };
  let id = null, x = 0, t = 0, v = 0, moved = 0, tot = 0, on = false;
  const perPx = () => { const b = app.box('n' + c); return 1 / Math.max(36, (b ? b.w : 300) * d.ring / d.NW); };
  el.addEventListener('pointerdown', (e) => { if (e.button) return; id = e.pointerId; x = e.clientX; t = e.timeStamp; v = 0; moved = 0; tot = 0; on = false; try { el.setPointerCapture(id); } catch (er) { /* gone */ } });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return; const dx = e.clientX - x, dt = Math.max(1, e.timeStamp - t); moved += Math.abs(dx);
    if (!on && moved < 6) return;
    if (!on) { on = true; el.classList.add('on'); }
    const da = dx * perPx(); W3.turn.by(c, da); tot += da; v = v * 0.6 + (da / dt) * 400; x = e.clientX; t = e.timeStamp; e.preventDefault();
  });
  const end = (e) => {
    if (e.pointerId !== id) return; id = null; el.classList.remove('on'); if (!on) return; on = false;
    // a short pull is enough to ask for the next vial; a flick carries on the way it was going
    const flick = e.timeStamp - t > 120 ? 0 : v * 0.22, pull = Math.abs(tot) > 0.38 ? Math.sign(tot) * 0.7 : 0;
    const k = W3.turn.drop(c, Math.max(-1.3, Math.min(1.3, flick + pull))); app.sfx('tap'); onPick(k);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  // the drag surface is the case as far as the picture shows it, and never reaches over the page
  return () => {
    const b = app.box('n' + c), r = W3.rect; if (!b) { el.style.visibility = 'hidden'; return; }
    const x0 = Math.max(b.x, r.x), y0 = Math.max(b.y, r.y), x1 = Math.min(b.x + b.w, r.x + r.w), y1 = Math.min(b.y + b.h, r.y + r.h);
    el.style.visibility = x1 > x0 + 8 && y1 > y0 + 8 ? '' : 'hidden';
    el.style.transform = `translate(${x0.toFixed(1)}px, ${y0.toFixed(1)}px)`; el.style.width = Math.max(0, x1 - x0).toFixed(1) + 'px'; el.style.height = Math.max(0, y1 - y0).toFixed(1) + 'px';
  };
}

export async function formulary(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, marks = app.marks, W3 = app.world;
  const series = SERIES.find((s) => s.c === args[0]);
  app.amb('inside');
  let F = null;
  // the whole wall: all nine niches in view, pushed in until the frame fills the pane where it can
  const wall = (S, Fr) => {
    const rs = SERIES.map((x) => nicheRect(Fr, +x.c)); if (rs.some((r) => !r)) return { cx: 0.5, cy: 0.5, zoom: 1 };
    const xs = rs.flatMap((r) => [r[0][0], r[1][0]]), ys = rs.flatMap((r) => [r[0][1], r[1][1]]);
    const v = app.fit(S, [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]], 0.9);
    return { cx: 0.5, cy: 0.5, zoom: Math.max(1, Math.min(v.zoom, Math.max(S.span[0], S.span[1]))) };
  };
  const vf = (S, Fr) => { const r = series && nicheRect(Fr, +series.c); return r ? app.fit(S, r, 0.62) : wall(S, Fr); };
  F = await pane(app, series ? 'niche' : 'formulary', series ? +series.c : null, 'formulary', vf, { need: 1 }); if (!ok()) return null;
  if (W3) W3.setNiche(series ? +series.c : 0);
  if (series) {
    view.innerHTML = `<div class="page"><a class="back" href="#/formulary">The Formulary</a>
      <header><p class="label">${series.n}</p><h1 class="title" style="margin-top:8px">${series.f}</h1><p class="lead">${series.d}</p></header>
      <p class="sample">SAMPLE DATA. Names, lots, prices and statuses are placeholders that show the shape of a verified record.</p>
      <ul class="rows" style="margin-top:24px">${series.items.map((r) => `<li><a class="row" href="#/record/${r.id}"><span class="n">${r.id.slice(-4)}</span><span><span class="t">${r.name}</span><span class="d">${r.cls} · ${r.sizes.map((z) => `${z.q} ${z.u}`).join(', ')}${canOrder(r) ? ' · from ' + cad(r.sizes[0].price) : ''}</span></span><span class="m">${tag(r)}</span></a></li>`).join('')}</ul>
      <p class="note" style="margin-top:18px">${LABEL_LINE}</p></div>`;
    // reading down the list turns the stand, so the vial in front is always the one the row names
    const rows = $$('.row', view), mark = (k) => rows.forEach((a, i) => a.classList.toggle('at-front', i === k));
    const front = (k) => { if (W3) W3.turn.set(+series.c, k); mark(k); };
    rows.forEach((a, i) => { a.addEventListener('pointerenter', () => front(i)); a.addEventListener('focus', () => front(i)); });
    mark(W3 ? W3.turn.at(+series.c) : 0);
    const placeT = turner(app, +series.c, mark);
    return { title: series.n, crumb: 'Formulary', after: placeT, leave: () => { if (W3) W3.setNiche(0); } };
  }
  let filter = 'all', q = '';
  view.innerHTML = `<div class="page"><header><h1 class="title">The Formulary</h1><p class="lead">Information first. Action with clarity.</p></header>
    <p class="sample">SAMPLE DATA. Every name, lot, price and status here is a placeholder that shows the shape of a verified record. PR6 supplies the real, reviewed records before anything is offered.</p>
    <div class="field"><label for="fq">Search the Formulary</label><input id="fq" type="search" placeholder="Name, catalogue number, class or lot" autocomplete="off"></div>
    <div class="chips" role="group" aria-label="Filter by status">${[['all', 'All'], ['available', 'Listed'], ['review', 'In review'], ['library', 'Library only']].map(([k, t]) => `<button class="chip" type="button" aria-pressed="${k === 'all'}" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="out" style="margin-top:26px" aria-live="polite"></div></div>`;
  const out = $('#out', view);
  const draw = () => {
    if (filter === 'all' && !q) {
      out.innerHTML = `<ul class="rows">${SERIES.map((s) => `<li><a class="row" href="#/formulary/${s.c}" data-n="${+s.c}"><span class="n">${s.c}</span><span><span class="t">${s.f}</span><span class="d">${s.d}</span></span><span class="m">${s.items.filter(canOrder).length} of ${s.items.length} listed</span></a></li>`).join('')}</ul>`;
      return;
    }
    const res = ALL.filter((r) => (filter === 'all' || r.status === filter) && (!q || (r.id + ' ' + r.name + ' ' + r.cls + ' ' + r.lot + ' ' + seriesOf(r).f + ' ' + r.tags.join(' ')).toLowerCase().includes(q)));
    out.innerHTML = res.length ? `<p class="note" style="margin-bottom:10px">${res.length} record${res.length > 1 ? 's' : ''}</p><ul class="rows">${res.map((r) => `<li><a class="row" href="#/record/${r.id}"><span class="n">${r.id.slice(-4)}</span><span><span class="t">${r.name}</span><span class="d">${seriesOf(r).n} · ${r.cls}</span></span><span class="m">${tag(r)}</span></a></li>`).join('')}</ul>`
      : `<p>No record matches. <button class="link" type="button" id="clr">Clear the search and filter</button></p>`;
    const c = $('#clr', out); if (c) c.addEventListener('click', () => { q = ''; filter = 'all'; $('#fq', view).value = ''; $$('.chip', view).forEach((b) => b.setAttribute('aria-pressed', b.dataset.f === 'all')); draw(); });
  };
  $('#fq', view).addEventListener('input', (e) => { q = e.target.value.trim().toLowerCase(); draw(); });
  $('.chips', view).addEventListener('click', (e) => { const b = e.target.closest('.chip'); if (!b) return; filter = b.dataset.f; $$('.chip', view).forEach((x) => x.setAttribute('aria-pressed', x === b)); draw(); });
  draw();
  // the niches in the picture are the same nine links
  if (F) {
    marks.innerHTML = SERIES.map((s) => `<a class="niche" href="#/formulary/${s.c}" data-n="${+s.c}" aria-label="${s.n}, ${s.f}"><span>${s.c}</span></a>`).join('');
    const hot = (n, on) => { const el = $(`.niche[data-n="${n}"]`, marks); if (el) el.classList.toggle('hot', on); if (W3) W3.setNiche(on ? +n : 0); };
    marks.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-n]'); if (a && W3) W3.setNiche(+a.dataset.n); });
    marks.addEventListener('pointerout', () => { if (W3) W3.setNiche(0); });
    out.addEventListener('pointerover', (e) => { const a = e.target.closest('[data-n]'); if (a) hot(a.dataset.n, true); });
    out.addEventListener('pointerout', (e) => { const a = e.target.closest('[data-n]'); if (a) hot(a.dataset.n, false); });
    out.addEventListener('focusin', (e) => { const a = e.target.closest('[data-n]'); $$('.niche', marks).forEach((x) => x.classList.remove('hot')); if (a) hot(a.dataset.n, true); });
  }
  const place = () => { for (const el of marks.children) app.place(el, 'n' + el.dataset.n); };
  place();
  return {
    title: 'Formulary', crumb: 'Formulary',
    tick: W3 ? null : place, after: place, leave: () => { if (W3) W3.setNiche(0); },
  };
}

// the order of a record's sections below the essentials, by what the member told the Compass a useful result looks like
const REC_ORDER = {
  none: ['checks', 'identity', 'evidence', 'safety', 'quality', 'regulatory', 'commerce', 'field'],
  learn: ['identity', 'evidence', 'safety', 'quality', 'checks', 'regulatory', 'commerce', 'field'],
  evidence: ['evidence', 'quality', 'checks', 'safety', 'regulatory', 'identity', 'commerce', 'field'],
  compare: ['checks', 'quality', 'commerce', 'identity', 'evidence', 'safety', 'regulatory', 'field'],
  expert: ['safety', 'evidence', 'regulatory', 'checks', 'quality', 'identity', 'commerce', 'field'],
};
const REC_WHY = { learn: 'learn the ground', evidence: 'read the evidence', compare: 'compare eligible options', expert: 'speak with a professional' };
export async function record(app, args) {
  const m = store.member(), ok = app.live(), view = app.view, r = byId(args[0]);
  if (!r) { app.go('#/formulary'); return null; }
  const s = seriesOf(r);
  app.amb('inside');
  // its vial comes round to the front of its stand while the camera moves in
  const W3 = app.world, k = s.items.indexOf(r);
  if (W3) { W3.setNiche(+s.c); W3.turn.set(+s.c, k); }
  await pane(app, 'record', +s.c, 'formulary', (S, F) => { const rc = nicheRect(F, +s.c); return rc ? app.fit(S, rc, 0.66) : { cx: 0.5, cy: 0.5, zoom: 1 }; }, { need: 1 }); if (!ok()) return null;
  const able = canOrder(r), missing = CHECKS.filter(([k]) => !r.checks[k]).map(([, t]) => t.toLowerCase());
  // The essentials come first: what it is, which size, how many. Everything else follows in the member's own order:
  // the Compass sets it (what a useful result looks like, how much detail, whether safety leads), and "Show first" on
  // this page overrides it and is remembered for every record.
  const cp = (m.compassConsent && m.compass) || session, ans = (cp && cp.done && cp.a) || {};
  const SECT = {
    checks: ['Checks on file', `<p class="note">${statusOf(r).long}</p><ul class="checks">${CHECKS.map(([kk, t]) => `<li class="${r.checks[kk] ? '' : 'no'}"><span>${t}</span><b>${r.checks[kk] ? 'On file' : 'Not on file'}</b></li>`).join('')}</ul>`],
  };
  for (const [h, rows] of recordFields(r)) SECT[h.toLowerCase()] = [h, `<dl class="kv">${rows.map(([kk, v]) => `<dt>${kk}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`];
  const arrange = () => {
    let o = [...(REC_ORDER[ans.objective] || REC_ORDER.none)];
    const lead = (key) => { o = [key, ...o.filter((x) => x !== key)]; };
    if (ans.safety === 'overview' || ans.safety === 'professional') lead('safety');
    if (m.recordFirst && SECT[m.recordFirst]) lead(m.recordFirst);
    return o.filter((x) => SECT[x]);
  };
  const openCount = ans.depth === 'detailed' ? 99 : ans.depth === 'overview' ? 1 : 2;
  const why = () => (m.recordFirst && SECT[m.recordFirst] ? `${SECT[m.recordFirst][0]} first, as you chose here. `
    : ans.objective || ans.depth || ans.safety ? `In the order your reading index set${ans.objective ? ': you asked to ' + REC_WHY[ans.objective] : ''}${ans.depth ? (ans.objective ? ', ' : ': ') + (ans.depth === 'detailed' ? 'in detail' : 'as a concise overview') : ''}${ans.safety === 'overview' || ans.safety === 'professional' ? (ans.objective || ans.depth ? ', with safety first' : ': safety first') : ''}. `
    : 'In the standard order. ');
  const below = () => `<div class="arrange"><p class="note">${why()}<a href="#/compass/${cp && cp.done ? 'edit' : 'index'}">${cp && cp.done ? 'Change my answers' : 'Let your reading index arrange it'}</a></p>
      <label class="firstpick"><span>Show first</span><select id="first"><option value="">${cp && cp.done ? 'What my reading index says' : 'The standard order'}</option>${Object.keys(SECT).map((key) => `<option value="${key}"${m.recordFirst === key ? ' selected' : ''}>${SECT[key][0]}</option>`).join('')}</select></label></div>
    ${arrange().map((key, i) => `<details class="fold" data-k="${key}"${i < openCount ? ' open' : ''}><summary><h2>${SECT[key][0]}</h2></summary>${SECT[key][1]}</details>`).join('')}`;
  const z0 = able ? r.sizes[0] : null;
  view.innerHTML = `<div class="page"><a class="back" href="#/formulary/${s.c}">${s.n} · ${s.f}</a>
    <div class="rec-head"><div><h1 class="title">${r.name}</h1><p class="lead dim" style="margin-top:8px"><span class="mono">${r.id}</span> · ${r.cls}, ${r.form.toLowerCase()}</p><p style="margin-top:14px">${tag(r)}</p></div>
      <img src="assets/vials/${r.id}.webp" width="180" height="300" alt="A sealed glass vial on its stand, with a printed label reading ${r.id}, ${esc(r.name)}." loading="lazy">
    ${able ? `<form class="buy" id="buy">
        <fieldset><legend>Size</legend><div class="sizes" role="radiogroup" aria-label="Size">${r.sizes.map((z, i) => `<button class="chip" type="button" role="radio" aria-checked="${i === 0}" data-i="${i}">${z.q} ${z.u} · ${cad(z.price)}</button>`).join('')}</div></fieldset>
        <div class="buy-row"><div><span class="field-l" id="qty-l">Quantity</span><span class="qty" role="group" aria-labelledby="qty-l"><button type="button" data-q="-1" aria-label="One fewer">−</button><span id="qty" aria-live="polite">1</span><button type="button" data-q="1" aria-label="One more">+</button></span></div>
          <p class="buy-sum" id="sum" aria-live="polite">${cad(z0.price)}</p>
          <button class="btn" type="submit">Add to order</button></div>
        <p class="note" id="added" role="status"></p>
        <p class="note">${r.stock}. Taxes are added at order, by province. ${LABEL_LINE}</p></form>`
    : `<div class="buy"><p><strong>This record cannot be ordered.</strong></p><p class="note" style="margin-top:6px">${r.status === 'library' ? 'It is a research library entry: information only, and not an offer for sale.' : 'Its compliance review is still open.'} Not on file: ${missing.join(', ')}. Until every check is on file, the order service refuses it.</p></div>`}</div>
    <nav class="stand" aria-label="The three records in this case"><span class="label">In this case</span>${s.items.map((x, i) => `<a href="#/record/${x.id}"${i === k ? ' aria-current="page"' : ''}><span class="n">${x.id.slice(-4)}</span>${esc(x.name)}</a>`).join('')}${W3 ? '<span class="note hint">Or turn the stand in the picture by hand.</span>' : ''}</nav>
    <div id="below">${below()}</div>
    <p class="sample">SAMPLE RECORD. Values in [brackets] are for PR6 to supply. Nothing here states a dose, a use in people or animals, or an effect.</p>
    <div class="actions">${saveBtn(m, 'record', r.id)}<a class="link" href="#/support?topic=other&about=${r.id}">Ask about this record</a></div></div>`;
  bindSave(view, m);
  $('#below', view).addEventListener('change', (e) => {
    if (e.target.id !== 'first') return;
    m.recordFirst = e.target.value || null; store.save();
    $('#below', view).innerHTML = below(); $('#first', view).focus();
    app.announce(m.recordFirst ? `${SECT[m.recordFirst][0]} now comes first on every record.` : 'Back to the order your reading index set.');
  });
  if (able) {
    let si = 0, qty = 1; const f = $('#buy', view);
    const sum = () => { const z = r.sizes[si]; $('#qty', f).textContent = qty; $('#sum', f).textContent = qty > 1 ? `${qty} × ${z.q} ${z.u} · ${cad(z.price * qty)}` : cad(z.price); };
    f.addEventListener('click', (e) => {
      const b = e.target.closest('[role=radio]'), q = e.target.closest('[data-q]');
      if (b) { si = +b.dataset.i; $$('[role=radio]', f).forEach((x) => x.setAttribute('aria-checked', x === b)); sum(); }
      if (q) { qty = Math.max(1, Math.min(9, qty + +q.dataset.q)); sum(); }
    });
    f.addEventListener('submit', (e) => {
      e.preventDefault(); if (!canOrder(r)) return;
      const z = r.sizes[si], line = m.cart.find((l) => l.id === r.id && l.q === z.q);
      if (line) line.qty = Math.min(9, line.qty + qty); else m.cart.push({ id: r.id, q: z.q, u: z.u, price: z.price, qty });
      store.save(); app.chrome(); app.sfx('tap');
      $('#added', view).innerHTML = `Added ${qty} × ${z.q} ${z.u}. <a href="#/order">Open your order list</a>`;
    });
  }
  // turning the stand by hand opens the record that comes to the front
  const placeT = turner(app, +s.c, (kk) => { if (kk !== k) app.go('#/record/' + s.items[kk].id); });
  return { title: r.name, crumb: 'Formulary', after: placeT, leave: () => { if (W3) W3.setNiche(0); } };
}

// ---------------------------------------------------------------------------------------------- order list and orders (A15)
const PROV = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'];
export async function order(app) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  const draw = () => {
    const lines = m.cart.map((l) => ({ ...l, r: byId(l.id) })).filter((l) => l.r);
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0), a = m.address || {};
    if (!lines.length) { view.innerHTML = `<div class="page"><header><h1 class="title">Order list</h1><p class="lead">Nothing here yet.</p></header><div class="actions"><a class="btn" href="#/formulary">Open the Formulary</a><a class="link" href="#/orders">Past orders</a></div></div>`; return; }
    view.innerHTML = `<div class="page"><header><h1 class="title">Order list</h1></header>
      <ul class="rows">${lines.map((l, i) => `<li><div class="row"><span class="n">${l.id.slice(-4)}</span><span><a class="t" href="#/record/${l.id}" style="text-decoration:none">${l.r.name}</a><span class="d">${l.q} ${l.u} · ${cad(l.price)} each${canOrder(l.r) ? '' : ' · no longer orderable'}</span>
        <span class="actions" style="margin-top:10px"><span class="qty" role="group" aria-label="Quantity of ${l.r.name}"><button type="button" data-q="-1" data-i="${i}" aria-label="One fewer">−</button><span aria-live="polite">${l.qty}</span><button type="button" data-q="1" data-i="${i}" aria-label="One more">+</button></span><button class="link small" type="button" data-rm="${i}">Remove</button></span></span>
        <span class="m">${cad(l.price * l.qty)}</span></div></li>`).join('')}</ul>
      <div class="total"><span>Subtotal</span><span class="mono">${cad(total)}</span></div>
      <p class="note" style="margin-top:10px">Taxes are added at payment, by province. Shipping: [shipping rule, to be supplied].</p>
      <form id="f" novalidate><section><h2>Where it goes</h2><p class="note">We ask for an address now because something is being sent to you.</p>
        ${field('line', 'Street address', `type="text" autocomplete="address-line1" value="${esc(a.line || '')}"`)}
        <div class="cols">${field('city', 'City', `type="text" autocomplete="address-level2" value="${esc(a.city || '')}"`)}${field('postal', 'Postal code', `type="text" autocomplete="postal-code" value="${esc(a.postal || '')}"`)}</div>
        <div class="field"><label for="prov">Province or territory</label><select id="prov" autocomplete="address-level1"><option value="">Choose</option>${PROV.map((p) => `<option${a.prov === p ? ' selected' : ''}>${p}</option>`).join('')}</select><p class="err" id="prov-e" role="alert"></p></div></section>
        <label class="check" style="margin-top:26px"><input type="checkbox" id="ack"><span>I have read the label statement for each item: ${LABEL_LINE}</span></label><p class="err" id="ack-e" role="alert"></p>
        <div class="actions"><button class="btn" type="submit">Place order</button><a class="link" href="#/formulary">Keep browsing</a></div>
        <p class="sample">PROTOTYPE. No payment is taken and nothing ships. In the live service, payment is handled by an established provider and every item is checked again against its record before the order is accepted.</p></form></div>`;
    $('#f', view).addEventListener('submit', (e) => {
      e.preventDefault(); const g = (id) => $('#' + id, view).value.trim();
      const good = [setErr(view, 'line', g('line').length < 4 ? 'Enter a street address.' : ''), setErr(view, 'city', g('city') ? '' : 'Enter a city.'), setErr(view, 'postal', /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(g('postal')) ? '' : 'Enter a Canadian postal code, like K1A 0B1.')];
      $('#prov-e', view).textContent = g('prov') ? '' : 'Choose a province or territory.';
      $('#ack-e', view).textContent = $('#ack', view).checked ? '' : 'Please confirm you have read the label statement.';
      const blocked = lines.filter((l) => !canOrder(l.r));
      if (blocked.length) { $('#ack-e', view).textContent = `${blocked.map((l) => l.r.name).join(', ')} can no longer be ordered. Remove it to continue.`; return; }
      if (good.includes(false) || !g('prov') || !$('#ack', view).checked) { const bad = $('[aria-invalid=true]', view); if (bad) bad.focus(); return; }
      const res = store.placeOrder(lines.map(({ r, ...l }) => ({ ...l, name: r.name })), total, { line: g('line'), city: g('city'), postal: g('postal').toUpperCase(), prov: g('prov') });
      app.chrome(); app.sfx('tap'); app.go('#/orders/' + res.id);
    });
  };
  view.addEventListener('click', (e) => {
    const qb = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
    if (qb) { const l = m.cart[+qb.dataset.i]; l.qty = Math.max(1, Math.min(9, l.qty + +qb.dataset.q)); store.save(); app.chrome(); draw(); const nb = $(`[data-q="${qb.dataset.q}"][data-i="${qb.dataset.i}"]`, view); if (nb) nb.focus(); }
    if (rm) { m.cart.splice(+rm.dataset.rm, 1); store.save(); app.chrome(); draw(); const h = $('h1', view); h.tabIndex = -1; h.focus(); }
  });
  draw();
  return { title: 'Order list', crumb: 'Order list' };
}

export async function orders(app, args) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  const o = args[0] && m.orders.find((x) => x.id === args[0]);
  if (args[0] && !o) { app.go('#/orders'); return null; }
  if (!o) {
    view.innerHTML = `<div class="page"><header><h1 class="title">Orders</h1>${m.orders.length ? '' : '<p class="lead">No orders yet.</p>'}</header>
      ${m.orders.length ? `<ul class="rows">${m.orders.map((x) => `<li><a class="row plain" href="#/orders/${x.id}"><span><span class="t">${x.id}</span><span class="d">Placed ${fmtDate(x.placed)} · ${x.lines.reduce((s, l) => s + l.qty, 0)} item${x.lines.reduce((s, l) => s + l.qty, 0) > 1 ? 's' : ''} · ${cad(x.total)}</span></span><span class="m">${ORDER_STATE[x.state]}</span></a></li>`).join('')}</ul>` : '<div class="actions"><a class="btn" href="#/formulary">Open the Formulary</a></div>'}
      <section><h2>Help with an order</h2><p>A person answers, usually within two business days. <a href="#/support?topic=order">Contact support about an order</a>.</p></section></div>`;
    return { title: 'Orders', crumb: 'Orders' };
  }
  const firstOne = m.orders[m.orders.length - 1].id === o.id, a = m.address || {};
  view.innerHTML = `<div class="page"><a class="back" href="#/orders">Orders</a>
    <header><p class="label">Order ${o.id} · placed ${fmtDate(o.placed)}</p><h1 class="title" style="margin-top:8px">${ORDER_STATE[o.state]}</h1><p class="lead">${ORDER_NOTE[o.state]}</p></header>
    <ol class="track" aria-label="Order progress">${ORDER_STATE.map((s, i) => `<li class="${i <= o.state ? 'done' : ''} ${i === o.state ? 'now' : ''}"${i === o.state ? ' aria-current="step"' : ''}>${s}</li>`).join('')}</ol>
    ${firstOne ? `<p class="notice">This was your first qualifying order. Your metal card is ${m.card === 'active' ? 'with you' : 'being made'}, and <a href="#/nominations">five nominations</a> are open.</p>` : ''}
    <section><h2>Delivery</h2><dl class="kv"><dt>Tracking</dt><dd class="mono">${o.state >= 3 ? o.track : 'Issued when the carrier has it'}<span class="note">Sample number. The live service links the carrier's own page.</span></dd>
      <dt>Ships to</dt><dd>${esc([a.line, a.city, a.prov, a.postal].filter(Boolean).join(', ') || 'On file')}</dd></dl></section>
    <section><h2>Items</h2><ul class="rows">${o.lines.map((l) => `<li><a class="row" href="#/record/${l.id}"><span class="n">${l.id.slice(-4)}</span><span><span class="t">${esc(l.name)}</span><span class="d">${l.q} ${l.u} · ${l.qty} × ${cad(l.price)}</span></span><span class="m">${cad(l.price * l.qty)}</span></a></li>`).join('')}</ul>
      <div class="total"><span>Subtotal</span><span class="mono">${cad(o.total)}</span></div></section>
    <section><h2>If something is wrong</h2><p>Returns and refunds: [conditions, to be supplied]. Your consumer rights are not changed by membership.</p>
      <div class="actions" style="margin-top:14px"><a class="btn ghost" href="#/support?topic=order&about=${o.id}">Contact support about this order</a></div></section></div>`;
  return { title: 'Order ' + o.id, crumb: 'Orders' };
}

// ---------------------------------------------------------------------------------------------- A13 the Archive
const KEEPER_LINES = ['There you are.', 'I wondered when you would arrive.', 'You have brought something with you.', 'Tell me, dear. If nothing stood in your way, what would you pursue?', 'Very well. Nothing you become will erase everything you have been.'];
export async function archive(app) {
  const m = store.member(), ok = app.live(), view = app.view, I = INSIGNIA[m.lineage];
  app.amb('inside');
  if (app.world) app.world.setLineage(m.lineage);
  await pane(app, 'archive', null, 'archive_' + m.lineage, () => ({ cx: 0.5, cy: 0.5, zoom: 1 }), { need: 0.6 }); if (!ok()) return null;
  const inv = Object.values(store.exportAll().invitations).find((i) => i.member === m.id) || {};
  const answer = { discover: 'To discover', create: 'To create', become: 'To become', unknown: 'I do not know yet' }[inv.pursuit];
  view.innerHTML = `<div class="page"><header><h1 class="title">A record of where you began.</h1>
      <p class="lead">Nine records stand in the passage you came in by. This stele is the tenth, and it is cut with your insignia.</p></header>
    <dl class="kv">
      <dt>Institution</dt><dd>PR6</dd>
      <dt>Member number</dt><dd class="mono">${fmtId(m.id)}<span class="note" style="font-family:var(--sans)">Identifies you. Not a credential.</span></dd>
      <dt>Generation</dt><dd>I · The First Record</dd>
      <dt>Lineage</dt><dd><span style="font-size:26px;margin-right:6px">${glyph(m.lineage)}</span> ${I.name}</dd>
      <dt>Insignia status</dt><dd>Permanent</dd>
      <dt>Standing</dt><dd>${m.standing}</dd>
      <dt>Journey tokens</dt><dd>${m.tokens.map((t) => TOKENS.find((x) => x[0] === t.id)[1]).join(', ')}</dd>
      <dt>Nomination allowance</dt><dd>Five lifetime nominations. ${m.nominationsOpen ? `<a href="#/nominations">${left(m)} remaining</a>` : 'They open after a first qualifying order.'}</dd>
      <dt>Card status</dt><dd>${CARD[m.card]}</dd>
      <dt>Founding rights</dt><dd>${m.rights === 'active' ? 'Active' : esc(m.rights)}</dd>
      <dt>Admitted</dt><dd>${fmtDate(m.admitted)}</dd></dl>
    <section><h2>Your insignia</h2><div class="cols"><div><p class="label" style="margin-bottom:8px">Historical association</p><p>${I.history}</p></div><div><p class="label" style="margin-bottom:8px">What PR6 means by it</p><p>${I.meaning}</p></div></div>
      <p class="note" style="margin-top:16px;max-width:62ch">The drawing is new and belongs to PR6. PR6 does not claim descent from, or the endorsement of, any ancient tradition. The insignia records how you were admitted. It says nothing about your character or your worth. <a href="#/dispatches/insignias">Four signs, and what we do not claim</a>.</p></section>
    <section><h2>Card</h2><div class="card ${m.card === 'active' ? '' : 'pending'}" role="img" aria-label="Your metal card: the PR6 mark, your insignia, your initials and your member number.">
        <div class="c-top"><span>PR6</span><span>I</span></div>${glyph(m.lineage)}<div class="c-bot"><span>${esc(m.initials)}</span><span>${fmtId(m.id)}</span></div></div>
      <p class="note" style="margin-top:14px;max-width:62ch">${{ 'not-issued': 'Not issued yet. The card is made after a first qualifying order.', processing: 'Being made. It ships with five blank nomination cards.', active: 'Active.', replaced: 'Replaced.' }[m.card]} The card opens this site when tapped or scanned and does nothing else: it cannot sign you in, and losing it never locks you out. <a href="#/support?topic=card">Report a lost card</a>.</p></section>
    <section><h2>Journey tokens</h2><ul class="tokens">${TOKENS.map(([id, n, d]) => { const h = m.tokens.find((t) => t.id === id); return `<li class="${h ? 'held' : ''}"><b>${n}</b><span class="small">${d}${h ? ' Recorded ' + fmtDate(h.t) + '.' : ' Not yet recorded.'}</span></li>`; }).join('')}</ul>
      <p class="note" style="margin-top:12px;max-width:62ch">Tokens mark milestones and contribution. They cannot be bought, traded or earned by ordering, and nobody else can see them.</p></section>
    <section><h2>Standing</h2><p style="max-width:62ch">${STANDINGS.join(', ')}. Standing recognises conduct and documented contribution, not the date you joined or what you order. The criteria are published before launch. There is no ranking and no list of members.</p></section>
    <section><h2>Founding rights</h2><p class="note">Proposed. Each one still needs financial and legal sign-off before it becomes a commitment.</p>
      <div class="scrollx"><table class="t"><thead><tr><th>Right</th><th>Scope</th><th>Boundary</th></tr></thead><tbody>${RIGHTS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div></section>
    <section><h2>Generations</h2><div class="scrollx"><table class="t"><thead><tr><th>Generation</th><th>Name</th><th>Places</th><th>Status</th></tr></thead><tbody>${GENERATIONS.map((g) => `<tr><td>${g.n}</td><td>${g.name}</td><td class="mono">${g.cap}</td><td>${g.status}</td></tr>`).join('')}</tbody></table></div>
      <p class="note" style="margin-top:12px;max-width:62ch">A generation closes for good when its places are accepted. Places that are later vacated are not refilled. Possibility is infinite. Capacity is not.</p></section>
    <section><h2>The threshold</h2><div class="actions" style="margin-top:0"><a class="btn ghost" href="#/passage/again">Watch the passage again</a></div>
      <details class="more"><summary>What the Keeper said</summary><div>${KEEPER_LINES.map((l) => `<p class="serif" style="font-size:var(--s4);color:var(--fg)">${l}</p>`).join('')}<p>${answer ? `You answered: ${answer}.` : 'You did not answer, which was allowed.'} The answer was never part of your review.</p></div></details></section></div>`;
  return { title: 'Archive', crumb: 'Archive' };
}

// ---------------------------------------------------------------------------------------------- A14 nominations
export async function nominations(app) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  const draw = (msg = '') => {
    const n = left(m);
    view.innerHTML = `<div class="page"><header><h1 class="title">Nominations</h1><p class="lead">An invitation is an opportunity to apply, not a promise of admission.</p></header>
      ${!m.nominationsOpen ? `<p class="notice">Nominations open after your first qualifying order, when your card and five nomination cards are made. Until then there is nothing to do here.</p>` : `
      <p class="display mono" aria-label="${n} of 5 nominations remaining">${n}<span style="font-size:var(--s4);font-family:var(--sans);letter-spacing:0;color:var(--dim)"> of 5 remaining, for life</span></p>
      ${msg ? `<p class="notice" role="status">${msg}</p>` : ''}
      ${n > 0 ? `<section><h2>Nominate someone</h2><form id="f" novalidate>
        ${field('nname', 'Their full name', 'type="text" autocomplete="off"')}
        ${field('nemail', 'Their email', 'type="email" autocomplete="off"', 'Used once, to tell them an invitation is on its way. Ask them first.')}
        <label class="check"><input type="checkbox" id="phys" checked><span>Send a physical invitation.<span class="note">PR6 seals and posts it. We ask them for a mailing address; you do not need to give it.</span></span></label>
        <label class="check"><input type="checkbox" id="und"><span>I understand that they apply like anyone else, and that approval is never automatic.</span></label>
        <p class="err" id="und-e" role="alert"></p>
        <div class="actions"><button class="btn" type="submit">Issue invitation</button></div></form></section>` : '<p class="notice">All five nominations have been used.</p>'}`}
      ${m.nominations.length ? `<section><h2>Issued</h2><ul class="rows">${m.nominations.map((x) => { const st = store.nominationState(x), can = !['admitted', 'revoked'].includes(st) && !st.startsWith('withdrawn'); return `<li><div class="row plain"><span><span class="t">${esc(x.name)}</span><span class="d">Issued ${fmtDate(x.t)}${x.physical ? ' · physical invitation' : ''}</span>${can ? `<span class="actions" style="margin-top:8px" data-w="${x.id}"><button class="link small" type="button" data-ask="${x.id}">Withdraw this invitation</button></span>` : ''}</span><span class="m">${st === 'revoked' ? 'Withdrawn' : st}</span></div></li>`; }).join('')}</ul></section>` : ''}
      <section><h2>How it works</h2><ul class="rows">${[
    'PR6 chooses your nominee’s insignia from the generation that is open. It is not inherited from yours.',
    'The code is single-use and goes only to them. You never see it, so it cannot be copied or passed on by mistake.',
    'They go through the same doors, the same application and the same review as you did.',
    'Your name is linked to the invitation for administrative audit only. It is never shown publicly and confers no rank.',
    'An invitation you withdraw before it is opened returns to your allowance. Once opened, it stays counted, whatever the outcome.',
  ].map((t) => `<li><div class="row plain"><span class="t" style="font-size:var(--s3)">${t}</span></div></li>`).join('')}</ul></section></div>`;
    const f = $('#f', view);
    if (f) f.addEventListener('submit', (e) => {
      e.preventDefault(); const nm = $('#nname', view).value.trim(), em = $('#nemail', view).value.trim();
      const good = [setErr(view, 'nname', nm.length < 2 ? 'Enter their full name.' : ''), setErr(view, 'nemail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? (em.toLowerCase() === m.email ? 'You cannot nominate yourself.' : '') : 'Enter their email address.')];
      $('#und-e', view).textContent = $('#und', view).checked ? '' : 'Please confirm you understand this.';
      if (good.includes(false) || !$('#und', view).checked) { const bad = $('[aria-invalid=true]', view); if (bad) bad.focus(); return; }
      const r = store.nominate(nm, em, $('#phys', view).checked); app.proto(); app.sfx('tap');
      draw(r ? `An invitation for ${esc(nm)} has been issued. They will hear from PR6.` : 'That nomination could not be issued.');
      const h = $('h1', view); h.tabIndex = -1; h.focus();
    });
  };
  view.addEventListener('click', (e) => {
    const ask = e.target.closest('[data-ask]'), yes = e.target.closest('[data-yes]'), no = e.target.closest('[data-no]');
    if (ask) { const box = ask.parentElement; box.innerHTML = `<span class="small">Withdraw it? This cannot be undone.</span><button class="link small" type="button" data-yes="${ask.dataset.ask}">Withdraw</button><button class="link small" type="button" data-no>Keep it</button>`; $('[data-yes]', box).focus(); }
    if (yes) { store.revoke(yes.dataset.yes); app.proto(); draw('The invitation has been withdrawn.'); }
    if (no) draw();
  });
  draw();
  return { title: 'Nominations', crumb: 'Nominations' };
}

// ---------------------------------------------------------------------------------------------- A15 support (members and visitors)
const SUPPORT_TOPICS = [['order', 'An order or delivery'], ['account', 'Sign-in and account recovery'], ['invitation', 'An invitation or application'], ['card', 'My card'], ['privacy', 'Privacy and my data'], ['safety', 'A safety concern or a complaint'], ['referral', 'Speaking with a professional'], ['other', 'Something else']];
export async function support(app) {
  const m = store.member(), ok = app.live(), view = app.view, q = hashQuery(), a = store.application();
  await plain(app, m ? 'inside' : 'outside'); if (!ok()) return null;
  const draw = (sent) => {
    view.innerHTML = `<div class="page">${m ? '' : `<a class="back" href="${store.invitation() ? '#/' : '#/'}">Back</a>`}
      <header><h1 class="title">Support</h1><p class="lead">People answer these. The target for a first reply is two business days.</p></header>
      ${sent ? `<p class="notice" role="status"><strong>Request ${sent.ref} received.</strong> We will reply to ${esc(sent.to)}.</p>` : ''}
      <form id="f" novalidate>
        <div class="field"><label for="topic">What is it about?</label><select id="topic">${SUPPORT_TOPICS.map(([k, t]) => `<option value="${k}"${q.topic === k ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
        ${m ? '' : field('semail', 'Your email', `type="email" autocomplete="email" value="${esc(a ? a.email : '')}"`, 'So that a person can reply.')}
        <div class="field"><label for="msg">Your message</label><textarea id="msg" maxlength="1500">${q.about ? esc('About ' + q.about + ': ') : ''}</textarea><p class="note">Please leave out health details and passwords. Nobody at PR6 will ever ask for your password or your invitation code.</p><p class="err" id="msg-e" role="alert"></p></div>
        <div class="actions"><button class="btn" type="submit">Send to support</button></div></form>
      ${m && m.tickets.length ? `<section><h2>Your requests</h2><ul class="rows">${m.tickets.map((t) => `<li><div class="row plain"><span><span class="t" style="font-size:var(--s3)">${esc(SUPPORT_TOPICS.find((x) => x[0] === t.topic)[1])}</span><span class="d">${esc(t.message.slice(0, 120))}</span></span><span class="m">${t.ref} · open · ${fmtDate(t.t)}</span></div></li>`).join('')}</ul></section>` : ''}
      <section><h2>Good to know</h2><dl class="kv">
        <dt>Account recovery</dt><dd>By your verified email. The metal card and the member number are never needed, and never enough.</dd>
        <dt>Invitations</dt><dd>If a seal or code is damaged or hard to read, we can describe it to you or reissue the invitation after checking it is yours.</dd>
        <dt>Refunds and returns</dt><dd>[Conditions, to be supplied.] Membership does not change your consumer rights.</dd>
        <dt>Your data</dt><dd>You can ask to see, correct or delete what PR6 holds about you.</dd>
        <dt>Complaints</dt><dd>Nothing about membership or its discretion limits your right to complain, to report a safety concern to a regulator, or to take professional advice.</dd>
        <dt>Health questions</dt><dd>PR6 does not give dosing, treatment or regimen guidance. Support can point you to the right kind of professional.</dd></dl></section></div>`;
    $('#f', view).addEventListener('submit', (e) => {
      e.preventDefault(); const msg = $('#msg', view).value.trim(), em = m ? m.email : $('#semail', view).value.trim();
      const good = [m ? true : setErr(view, 'semail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em) ? '' : 'Enter an email address we can reply to.')];
      $('#msg-e', view).textContent = msg.length < 8 ? 'Tell us a little more, so the right person can help.' : '';
      if (good.includes(false) || msg.length < 8) return;
      const t = store.ticket($('#topic', view).value, msg); app.sfx('tap');
      draw({ ref: t.ref, to: em }); const h = $('h1', view); h.tabIndex = -1; h.focus(); window.scrollTo(0, 0);
    });
  };
  draw();
  return { title: 'Support', crumb: 'Support' };
}

// ---------------------------------------------------------------------------------------------- account, library, dispatches
export async function account(app) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  view.innerHTML = `<div class="page"><header><h1 class="title">Account</h1></header>
    <dl class="kv"><dt>Name</dt><dd>${esc(m.name)}</dd><dt>Email</dt><dd>${esc(m.email)}<span class="note">Verified. This is how you sign in and how you recover your account.</span></dd>
      <dt>Member number</dt><dd class="mono">${fmtId(m.id)}</dd><dt>Sign-in</dt><dd>Email and password${m.passkey ? '. A passkey will be offered on this device.' : ''}</dd></dl>
    <section><h2>Password</h2><form id="pf" novalidate>${field('npass', 'New password', 'type="password" autocomplete="new-password"', 'At least 10 characters.')}
      <div class="actions"><button class="btn ghost" type="submit">Change password</button><span class="note" id="pf-ok" role="status"></span></div></form></section>
    <section><h2>Movement and sound</h2><fieldset style="margin-top:0"><legend>Movement</legend>
      ${[['auto', 'Follow my device setting'], ['explore', 'Explore: rooms move, with authored transitions'], ['direct', 'Direct: still pictures, instant pages']].map(([v, t]) => `<label class="check"><input type="radio" name="amotion" value="${v}" ${(store.prefs.motion || 'auto') === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</fieldset>
      <p class="note" style="margin-top:14px">Sound is off until you turn it on with the control at the top of the page. Nothing that matters is carried by sound alone.</p></section>
    <section><h2>Privacy</h2><label class="check"><input type="checkbox" id="cc" ${m.compassConsent ? 'checked' : ''}><span>Keep my reading index answers on my record.<span class="note">Turning this off deletes the stored choices now.</span></span></label>
      <div class="actions"><button class="btn ghost" type="button" id="dl">Download my data</button><a class="link" href="#/support?topic=privacy">Ask for my data to be deleted</a></div></section>
    <section><h2>Card</h2><p>${CARD[m.card]}. Losing the card never locks you out. <a href="#/support?topic=card">Report a lost card or ask for a replacement</a>.</p></section>
    <div class="actions" style="margin-top:52px"><button class="btn ghost" type="button" id="out">Sign out</button></div></div>`;
  $('#pf', view).addEventListener('submit', async (e) => { e.preventDefault(); const v = $('#npass', view).value; if (!setErr(view, 'npass', v.length < 10 ? 'Use at least 10 characters.' : '')) return; await store.setPassword(v); $('#npass', view).value = ''; $('#pf-ok', view).textContent = 'Password changed.'; });
  view.addEventListener('change', (e) => {
    if (e.target.name === 'amotion') { store.setPref('motion', e.target.value); app.chrome(); }
    if (e.target.id === 'cc') { m.compassConsent = e.target.checked; if (!m.compassConsent) m.compass = null; store.save(); }
  });
  $('#dl', view).addEventListener('click', () => { const b = new Blob([JSON.stringify({ exported: new Date().toISOString(), member: { ...m, pass: undefined, passSalt: undefined } }, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'pr6-my-data.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); });
  $('#out', view).addEventListener('click', () => { store.signOut(); app.go('#/'); });
  return { title: 'Account', crumb: 'Account' };
}

export async function library(app) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  const recs = m.saved.filter((s) => s.k === 'record').map((s) => byId(s.id)).filter(Boolean), dis = m.saved.filter((s) => s.k === 'dispatch').map((s) => dispatch(s.id)).filter(Boolean);
  view.innerHTML = `<div class="page"><header><h1 class="title">Library</h1><p class="lead">What you have saved: records and reading, nothing more.</p></header>
    <section><h2>Records</h2>${recs.length ? `<ul class="rows">${recs.map((r) => `<li><a class="row" href="#/record/${r.id}"><span class="n">${r.id.slice(-4)}</span><span><span class="t">${r.name}</span><span class="d">${seriesOf(r).n} · ${r.cls}</span></span><span class="m">${tag(r)}</span></a></li>`).join('')}</ul>` : '<p class="note">No saved records. Any record in the <a href="#/formulary">Formulary</a> can be saved from its page.</p>'}</section>
    <section><h2>Reading</h2>${dis.length ? `<ul class="rows">${dis.map((d) => `<li><a class="row plain" href="#/dispatches/${d.id}"><span><span class="t">${d.title}</span><span class="d">${d.dek}</span></span><span class="m">${d.kind}</span></a></li>`).join('')}</ul>` : '<p class="note">No saved reading. Save any <a href="#/dispatches">Dispatch</a> from its page.</p>'}</section>
    <section><h2>Your index</h2><p>${(m.compass && m.compass.done) ? '<a href="#/compass/index">Open your reading index</a>.' : 'Your <a href="#/compass/index">reading index</a> arranges reading around what you want to explore. It is optional.'}</p></section>
    <p class="note" style="margin-top:52px;max-width:62ch">An earlier plan called this place “Your Protocol”. PR6 does not plan regimens or doses for anyone, so it is a library: your saved interests, reading and preferences.</p></div>`;
  return { title: 'Library', crumb: 'Library' };
}

export async function dispatches(app, args) {
  const m = store.member(), ok = app.live(), view = app.view;
  await plain(app); if (!ok()) return null;
  const d = args[0] && dispatch(args[0]);
  if (!d) {
    view.innerHTML = `<div class="page"><header><h1 class="title">Dispatches</h1><p class="lead">Records, explainers and notices from the Institute. Each is dated, and revised in the open.</p></header>
      <ul class="rows">${DISPATCHES.map((x) => `<li><a class="row plain" href="#/dispatches/${x.id}"><span><span class="t">${x.title}</span><span class="d">${x.dek}</span></span><span class="m">${x.kind} · ${fmtDate(x.date + 'T12:00:00')}</span></a></li>`).join('')}</ul>
      <p class="sample">SAMPLE EDITORIAL. Written for this prototype to show the voice and the format.</p></div>`;
    return { title: 'Dispatches', crumb: 'Dispatches' };
  }
  let html = '', open = false;
  for (const b of d.body) {
    if (Array.isArray(b)) { if (!open) { html += '<dl class="kv">'; open = true; } html += `<dt>${b[0]}</dt><dd>${b[1]}</dd>`; } else { if (open) { html += '</dl>'; open = false; } html += `<p>${b}</p>`; }
  }
  if (open) html += '</dl>';
  view.innerHTML = `<div class="page"><a class="back" href="#/dispatches">Dispatches</a>
    <article class="article"><p class="label">${d.kind} · ${fmtDate(d.date + 'T12:00:00')} · ${d.read}</p><h1 class="title" style="margin-top:10px">${d.title}</h1><p class="lead dim" style="margin-top:12px">${d.dek}</p>${html}</article>
    <div class="actions">${saveBtn(m, 'dispatch', d.id)}</div></div>`;
  bindSave(view, m);
  return { title: d.title, crumb: 'Dispatches' };
}
