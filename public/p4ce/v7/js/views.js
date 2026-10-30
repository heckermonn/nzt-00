/* PR6 v7 · the screens on the slab. Each screen is plain markup plus an init(); the slab, the disc and the head are
   shared and persist (app.js), so a screen only says what it puts on them:
     sec   the mono section label after PR6 /       cap   the tiny footer caption
     tr    the slab's top-right instrument            disc  what the disc holds ({show: p} | {track: list, i} | null)
     cam   where the Atlas camera goes ({st, close})  cls   the screen's layout class
   Fields carry data-morph keys: when the next screen has the same key, its value rolls from the old one in place
   instead of entering, so a change of screen reads as the slab's readouts changing, not a new page.
   Section names, catalogue, content and copy rules as v6 (no effect claims, no invented studies). */
import {CAT, ALL, byId, colOf, servingSize, purpose, directions, cautions, batch, CONC, keyLine, PACKNAME} from './catalog.js';
import {$, $$, esc, money, pad2, ic, say, store, RM, clamp, isPhone, roll} from './util.js';
import {packHTML, packOf, Renders} from './renders.js';
import {Protocol, dispatchLabel} from './protocol.js';
import {Disc} from './disc.js';
import {FEED, FEED_KINDS, REVIEWS, reviewOf, PAST, MEMBER, NEW, NOTES, fmtDate} from './content.js';

const N = ALL.length;
const T = s => esc(String(s).toUpperCase());
/* APPROACH on the slab: one of the kit's pillars, read off the product's own directions (a filing label, not a claim):
   taken daily → CONSISTENCY, taken as needed → INTENT, applied or mixed for the occasion → PRACTICE */
export const approach = p => /daily/.test(p.s) ? 'Consistency' : /as needed/.test(p.s) ? 'Intent' : 'Practice';
const fmtShort = p => p.g + ' · ' + p.q.replace(/ (capsules|tablets|softgels|sachets)$/, '');

/* ---------------------------------------------------------------- shared parts */
const fld = (key, label, value, cls = '') => `<div class="fld ${cls}" data-morph="${key}"><p class="fld-l mono">${esc(label)}</p><p class="fld-v mono"><span data-v>${T(value)}</span></p></div>`;
const pillA = (key, href, text, extra = '') => `<a class="pill" href="${href}" data-morph="${key}" ${extra}><span class="pl" data-v>${T(text)}</span><span class="arr" aria-hidden="true">&rarr;</span></a>`;
const pillB = (key, text, extra = '') => `<button class="pill" type="button" data-morph="${key}" ${extra}><span class="pl" data-v>${T(text)}</span><span class="arr" aria-hidden="true">&rarr;</span></button>`;
function ctabs(active) {
  return `<nav class="ctabs mono" aria-label="Collections">${CAT.map(co => `<a href="#/c/${co.c}" class="${active === co.c ? 'on' : ''}"${active === co.c ? ' aria-current="page"' : ''} title="${esc(co.n)}"><span>${co.c}</span><span class="sr"> ${esc(co.n)}</span></a>`).join('')}</nav>`;
}
const rowHTML = (p, i) => `<li class="ix-row e" style="--i:${i}" data-id="${p.id}">
    <span class="c-code mono">${p.id}</span>
    <a class="c-name" href="#/p/${p.id}">${esc(p.n)}</a>
    <span class="c-fmt mono">${esc(p.g)}</span>
    <span class="c-pr mono">${money(p.pc)}</span>
    <button class="c-add mono" type="button" data-add="${p.id}" aria-label="Add ${esc(p.n)} to Your Protocol, one-off, ${money(p.pc)}"><span aria-hidden="true">[+]</span></button>
  </li>`;

/* ================================================================ 1. The Index (home) */
function index(all) {
  let k = 0;
  const lead = byId('01-1');
  return {
    key: 'index', cls: 's-index', sec: all ? 'The Formulary' : 'Daily practice', cap: `The Index / ${N} entries`, title: all ? 'PR6 · The Formulary' : 'PR6 · The Index',
    tr: ctabs(null), disc: {show: lead}, cam: {st: -1},
    html: `<h1 class="sr" tabindex="-1">${all ? 'The Formulary' : 'PR6, the Index'}</h1>
    <div class="ix">
      <p class="ix-lede e" style="--i:0">${all ? 'The whole range, one line each.' : 'A higher daily standard.'} <span class="mono">${N} entries / 9 collections / CA$</span></p>
      <div class="ix-head mono e" style="--i:1" aria-hidden="true"><span>Code</span><span>Name</span><span>Format</span><span>CA$</span><span></span></div>
      <div class="ix-scroll" data-scroll tabindex="0" aria-label="The Formulary, ${N} entries">
        <ol class="ix-list">${CAT.map(co => `<li class="ix-g" data-c="${co.c}">
          <h2 class="g-h e" style="--i:${Math.min(++k, 14)}"><a href="#/c/${co.c}"><span class="g-c mono">${co.c}</span><span class="g-n mono">${T(co.n)}</span><span class="g-d">${esc(co.d)}</span><span class="g-k mono">${pad2(co.it.length)} <span class="arr" aria-hidden="true">&rarr;</span></span></a></h2>
          <ol class="g-rows">${co.it.map(p => rowHTML(p, Math.min(++k, 16))).join('')}</ol></li>`).join('')}</ol>
      </div>
    </div>
    <div class="under">
      <p class="cap-n" data-morph="capn"><span data-v>${esc(lead.n)}</span></p>
      <p class="cap-m mono" data-morph="capm"><span data-v>${T(lead.id + ' · ' + fmtShort(lead) + ' · ' + money(lead.pc))}</span></p>
    </div>
    <div class="act">${pillA('pill', '#/c/01', 'Explore PR6', 'data-ixpill')}</div>`,
    init(el, ctx) {
      const sc = $('[data-scroll]', el), pill = $('[data-ixpill]', el);
      let cur = null, t = 0;
      const show = id => {
        if (cur === id) return; cur = id;
        $$('.ix-row.on', el).forEach(r => r.classList.remove('on'));
        const p = id ? byId(id) : lead;
        if (id) $$(`.ix-row[data-id="${id}"]`, el).forEach(r => r.classList.add('on'));
        Disc.show(p);
        roll($('.cap-n [data-v]', el), p.n, {per: 14});
        roll($('.cap-m [data-v]', el), (p.id + ' · ' + fmtShort(p) + ' · ' + money(p.pc)).toUpperCase(), {per: 12});
        roll($('.pl', pill), id ? 'VIEW DOSSIER' : 'EXPLORE PR6', {per: 16});
        pill.setAttribute('href', id ? '#/p/' + id : '#/c/01');
      };
      const rowOf = e => e.target.closest && e.target.closest('.ix-row');
      el.addEventListener('pointerover', e => { const r = rowOf(e); if (r && e.pointerType !== 'touch') { clearTimeout(t); show(r.dataset.id); } });
      el.addEventListener('focusin', e => { const r = rowOf(e); if (r) show(r.dataset.id); });
      /* a phone has no hover: the row in the middle of the list is the one on the disc */
      const spy = () => {
        if (!isPhone()) return;
        const r = sc.getBoundingClientRect(), mid = r.top + r.height * .35;
        let best = null, bd = 1e9; $$('.ix-row', sc).forEach(x => { const b = x.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = x; } });
        if (best && sc.scrollTop > 8) show(best.dataset.id); else if (sc.scrollTop <= 8) show(null);
      };
      sc.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(spy, 60); }, {passive: true});
      /* the quick [+]: one-off, quantity one; the pack flies into Your Protocol */
      el.addEventListener('click', e => {
        const b = e.target.closest('[data-add]'); if (!b) return;
        e.preventDefault(); const id = b.dataset.add;
        show(id); ctx.addFly(id, b);
        Protocol.add(id, 'one', 30, 1, {open: false});
        b.classList.add('done'); b.firstElementChild.textContent = '[✓]';
        setTimeout(() => { b.classList.remove('done'); b.firstElementChild.textContent = '[+]'; }, 1600);
      });
      Disc.setIdle('sway'); Disc.setTurn(null);
      return {};
    }
  };
}

/* ================================================================ 2. Collection: the picker */
function collection(c, startId) {
  const co = colOf(c); if (!co) return notFound();
  const i0 = Math.max(0, co.it.findIndex(p => p.id === startId));
  const p0 = co.it[i0], from = Math.min(...co.it.map(p => p.pc));
  return {
    key: 'col', cls: 's-col', sec: `${co.c} ${co.n}`, cap: `Collection ${co.c} / ${pad2(CAT.length)}`, title: `PR6 · ${co.c} ${co.n}`,
    tr: ctabs(co.c), disc: {track: co.it, i: i0}, cam: {st: CAT.indexOf(co)},
    html: `<h1 class="sr" tabindex="-1">Collection ${co.c}, ${esc(co.n)}</h1>
    <div class="fields">
      ${fld('f1', 'Collection', `${co.c} ${co.n}`, 'e')}
      ${fld('f2', 'Descriptor', co.d, 'e wrap')}
      ${fld('f3', 'Entry', `${p0.id} ${p0.n}`, 'e')}
      ${fld('f4', 'Format', fmtShort(p0), 'e')}
    </div>
    <div class="under">
      <p class="cap-m mono" data-morph="capm"><span data-v>${T(money(p0.pc) + ' · one-off / ' + money(p0.psc) + ' on your protocol')}</span></p>
      <div class="ticks mono" role="tablist" aria-label="Entries in ${esc(co.n)}">${co.it.map((p, i) => `<button type="button" role="tab" class="${i === i0 ? 'on' : ''}" aria-selected="${i === i0}" data-tick="${i}" aria-label="${esc(p.n)}"><span>${pad2(i + 1)}</span></button>`).join('')}<i class="tk-bar" aria-hidden="true"></i></div>
    </div>
    <div class="act">${pillA('pill', '#/p/' + p0.id, 'View dossier', 'data-colpill')}</div>
    <p class="swipe-hint mono e" style="--i:6" aria-hidden="true"><span class="sh-a">&larr;</span> ${isPhone() ? 'Swipe' : 'Drag or arrow keys'} <span class="sh-a">&rarr;</span></p>
    <p class="sr" aria-live="polite" data-live></p>`,
    init(el, ctx) {
      const pill = $('[data-colpill]', el), ticks = $$('[data-tick]', el), bar = $('.tk-bar', el), live = $('[data-live]', el);
      const place = i => { const t = ticks[i]; if (!t) return; bar.style.transform = `translateX(${t.offsetLeft}px)`; bar.style.width = t.offsetWidth + 'px'; };
      const set = (i, p) => {
        roll($('[data-morph="f3"] [data-v]', el), `${p.id} ${p.n}`.toUpperCase(), {per: 14});
        roll($('[data-morph="f4"] [data-v]', el), fmtShort(p).toUpperCase(), {per: 14, delay: 40});
        roll($('[data-morph="capm"] [data-v]', el), (money(p.pc) + ' · one-off / ' + money(p.psc) + ' on your protocol').toUpperCase(), {per: 10, delay: 60});
        pill.setAttribute('href', '#/p/' + p.id);
        ticks.forEach((t, j) => { t.classList.toggle('on', j === i); t.setAttribute('aria-selected', j === i); });
        place(i); live.textContent = `${p.id}, ${p.n}, ${money(p.pc)}`;
        /* the address follows the picker, so back from a Dossier returns to the same product */
        history.replaceState(null, '', location.pathname + location.search + '#/c/' + co.c + (i ? '/' + p.id : ''));
        ctx.setHash(location.hash);
      };
      Disc.onChange = set;
      ticks.forEach(t => t.addEventListener('click', () => Disc.go(+t.dataset.tick)));
      requestAnimationFrame(() => place(i0));
      Disc.setIdle('sway'); Disc.setTurn(null);
      return {
        keydown(e) {
          if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
          if (e.key === 'ArrowRight') { e.preventDefault(); Disc.step(1); }
          if (e.key === 'ArrowLeft') { e.preventDefault(); Disc.step(-1); }
          if (e.key === 'Enter' && document.activeElement === document.body) location.hash = pill.getAttribute('href');
        },
        resize() { place(Disc.index); },
        destroy() { Disc.onChange = null; }
      };
    }
  };
}

/* ================================================================ 3. The Dossier: as close as possible to the kit's slide */
function ingTable(p) {
  if (p.top) {
    const c = CONC[p.id] || [];
    return `${c.length ? `<table class="tbl mono"><thead><tr><th scope="col">Key ingredient</th><th scope="col">Concentration</th></tr></thead><tbody>${c.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="full"><span class="mono">Full ingredients</span> ${esc(p.oth)}</p>`;
  }
  const per = (p.act.find(a => a.per) || {}).per || 'per serving';
  return `<table class="tbl mono"><thead><tr><th scope="col">Ingredient</th><th scope="col">Amount <span>${esc(per)}</span></th></tr></thead><tbody>
    ${p.act.map(a => `<tr><td>${esc(a.name)}${a.form ? ` <span>(${esc(a.form)})</span>` : ''}</td><td>${esc(a.amt)}</td></tr>`).join('')}</tbody></table>
    <p class="full"><span class="mono">Other ingredients</span> ${esc(p.oth)}</p>`;
}
function product(id) {
  const p = byId(id); if (!p) return notFound();
  const co = colOf(p.c), rel = co.it.filter(x => x.id !== p.id), rv = reviewOf(p.id), pack = packOf(p), pos = co.it.indexOf(p);
  const sec = (n, t, body) => `<section class="ds"><h3 class="ds-h mono"><span>${n}</span>${t}</h3>${body}</section>`;
  return {
    key: 'product', cls: 's-product', sec: p.n, cap: `The Dossier / ${p.id}`, title: `PR6 · ${p.n}`,
    tr: `<a class="back mono" href="#/c/${co.c}${pos ? '/' + p.id : ''}"><span aria-hidden="true">&larr;</span> ${co.c} ${T(co.n)} <span class="pos">${pad2(pos + 1)} / ${pad2(co.it.length)}</span></a>`,
    disc: {show: p}, cam: {st: CAT.indexOf(co), close: true},
    html: `<div class="p-scroll" data-pscroll>
      <section class="p-hero">
        <h1 class="sr" tabindex="-1">${esc(p.n)}</h1>
        <div class="fields">
          ${fld('f1', 'Collection', co.c, 'e')}
          ${fld('f2', 'Format', p.g, 'e')}
          ${fld('f3', 'Approach', approach(p), 'e')}
        </div>
        <div class="under"><p class="cap-m mono p-price" data-morph="capm"><span data-v>${T(money(p.pc) + ' · one-off / ' + money(p.psc) + ' on your protocol')}</span></p></div>
        <div class="act">${pillB('pill', 'Add to protocol', 'data-add1')}</div>
        <p class="p-hint mono e" style="--i:5" aria-hidden="true">Scroll to turn <span>&darr;</span></p>
      </section>
      <div class="p-gap" aria-hidden="true"></div>
      <article class="p-detail" aria-labelledby="pdH">
        <div class="pd-grid">
          <div class="pd-main">
            <p class="lbl mono">PR6 <i>/</i> The Dossier <span>${p.id}</span></p>
            <h2 id="pdH" class="pd-n">${esc(p.n)}</h2>
            <p class="pd-w">${esc(p.w)}</p>
            ${sec('01', 'Serving', `<dl class="kv mono"><div><dt>Serving</dt><dd>${esc(servingSize(p))}</dd></div><div><dt>Directions</dt><dd>${esc(p.s)}</dd></div><div><dt>In the pack</dt><dd>${esc(p.q)}</dd></div></dl><p class="ds-p">${esc(purpose(p))} ${esc(p.e)}</p>`)}
            ${sec('02', 'Ingredients', ingTable(p))}
            ${sec('03', 'Directions', `<ol class="ds-list">${directions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ol>`)}
            ${sec('04', 'Cautions', `<ul class="ds-list">${cautions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ul>`)}
          </div>
          <div class="pd-side">
            <form class="buy" data-buy novalidate>
              <p class="lbl mono">Add to Your Protocol</p>
              <fieldset class="opts"><legend class="sr">How you would like it</legend>
                <label class="opt"><input type="radio" name="m" value="sub" checked><span class="o-b"><span class="o-t">Your Protocol <em class="mono">Subscribe</em></span><span class="o-p mono">${money(p.psc)}</span><span class="o-s mono">Sent every <select name="fr" aria-label="Frequency"><option value="30">30</option><option value="60">60</option><option value="90">90</option></select> days. Skip or stop from Dispatches.</span></span></label>
                <label class="opt"><input type="radio" name="m" value="one"><span class="o-b"><span class="o-t">One-off</span><span class="o-p mono">${money(p.pc)}</span><span class="o-s mono">Sent once, with the next dispatch.</span></span></label>
              </fieldset>
              <div class="buy-r">
                <span class="step mono" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 's')}</button><output name="q" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 's')}</button></span>
                <button class="pill add" type="submit"><span class="pl">Add to protocol</span><span class="arr" aria-hidden="true">&rarr;</span></button>
              </div>
              <p class="buy-f mono"><span><i class="live" aria-hidden="true"></i>Next dispatch ${dispatchLabel()}</span><span>Prices in CAD</span></p>
            </form>
            ${sec('05', 'Testing and sourcing', `<dl class="kv mono"><div><dt>Batch</dt><dd>${batch(p)}</dd></div><div><dt>Certificate</dt><dd>On request</dd></div><div><dt>Pack</dt><dd>${esc(PACKNAME[pack])}</dd></div></dl><p class="ds-p">Each batch is identified by the code on the base of the pack. A certificate of analysis for your batch is available from <a href="#/m/liaison">Member Liaison</a>. Sourcing details for each ingredient will be published here.</p>`)}
            ${rv ? sec('06', 'Field Club', `<div class="rv1"><p class="rv-s mono">${rv.r.toFixed(1)} / 5 <span>${rv.n} reviews · sample</span></p><blockquote>“${esc(rv.q[0].t)}”</blockquote><p class="mono rv-m">Member ${rv.q[0].m} <i>/</i> ${T(rv.q[0].d)}</p><a class="lnk mono" href="#/club/reviews">All reviews <span aria-hidden="true">&rarr;</span></a></div>`) : ''}
          </div>
        </div>
        <section class="rel" aria-labelledby="relH">
          <header class="rel-h"><h3 id="relH" class="lbl mono">More from ${co.c} ${T(co.n)}</h3><a class="lnk mono" href="#/c/${co.c}">The collection <span aria-hidden="true">&rarr;</span></a></header>
          <ol class="rel-l">${rel.map(x => `<li><a href="#/p/${x.id}"><span class="rel-v disc-s">${packHTML(x)}</span><span class="rel-t mono"><span>${x.id}</span><b>${esc(x.n)}</b><span>${esc(x.g)} · ${money(x.pc)}</span></span></a></li>`).join('')}</ol>
        </section>
      </article>
    </div>`,
    init(el, ctx) {
      const sc = $('[data-pscroll]', el), hero = $('.p-hero', el), det = $('.p-detail', el);
      const f = $('[data-buy]', el), out = $('output', f); let q = 1;
      const sync = () => { const sub = f.m.value === 'sub'; $$('.opt', f).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); f.fr.disabled = !sub; };
      f.addEventListener('change', sync); sync();
      $$('[data-q]', f).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; });
      const added = (btn, m, fr, qq) => {
        ctx.addFly(p.id, btn);
        Protocol.add(p.id, m, fr, qq, {open: false});
        const pl = $('.pl', btn); roll(pl, 'ADDED TO PROTOCOL', {per: 12}); btn.classList.add('done');
        setTimeout(() => { roll(pl, 'ADD TO PROTOCOL', {per: 12}); btn.classList.remove('done'); }, 1900);
      };
      $('[data-add1]', el).addEventListener('click', e => added(e.currentTarget, 'one', 30, 1));
      f.addEventListener('submit', e => { e.preventDefault(); added($('button.add', f), f.m.value, +f.fr.value, q); });
      /* the scroll turns the pack a full turn before the detail comes up over it */
      let spin = 0;
      const onScroll = () => {
        const H = sc.clientHeight, gap = H * .62, y = sc.scrollTop;
        const t = clamp(y / gap);
        Disc.setTurn(y > 2 ? t * 24 : null);
        const up = clamp((y - gap * .7) / (H * .5));
        el.style.setProperty('--up', up.toFixed(3)); $('#slab').style.setProperty('--up', up.toFixed(3));
        Disc.dim(up);
        hero.classList.toggle('turning', y > 2);
        spin = t;
      };
      sc.addEventListener('scroll', onScroll, {passive: true});
      /* drag across the disc to turn the pack (the scroller sits over the disc, so it listens and passes it on) */
      let drag = null;
      sc.addEventListener('pointerdown', e => {
        if (e.button > 0 || e.target.closest('a,button,input,select,label,.p-detail')) return;
        const r = $('#disc').getBoundingClientRect();
        if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) > r.width * .55) return;
        drag = {x: e.clientX, y: e.clientY, lx: e.clientX, axis: null, id: e.pointerId};
      });
      sc.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.axis && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.axis = Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y) ? 'x' : 'y'; if (drag.axis === 'x') { try { sc.setPointerCapture(e.pointerId); } catch (x) {} sc.classList.add('grab'); Disc.grab(true); } }
        if (drag.axis === 'x') { Disc.dragTurn(e.clientX - drag.lx); drag.lx = e.clientX; }
      });
      const up = () => { if (drag && drag.axis === 'x') Disc.grab(false); drag = null; sc.classList.remove('grab'); };
      sc.addEventListener('pointerup', up); sc.addEventListener('pointercancel', up);
      Disc.setIdle('spin'); Disc.setTurn(null);
      onScroll();
      return {
        scroller: sc,
        keydown(e) { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') Disc.nudge(2); if (e.key === 'ArrowLeft') Disc.nudge(-2); },
        destroy() { Disc.dim(0); Disc.setTurn(null); Disc.grab(false); }
      };
    }
  };
}

/* ================================================================ 4. PR6 / Field Club */
const CLUB = 'pr6.v7.club';
const PLURAL = {restock: 'Restocks', new: 'New entries', session: 'Session notes', dispatch: 'Dispatch reminders', note: 'Field notes'};
function club(sub) {
  const prefs = Object.assign({restock: true, new: true, session: true, dispatch: false, note: true}, store.get(CLUB, {}));
  const rvAll = REVIEWS.reduce((s, r) => s + r.r * r.n, 0) / REVIEWS.reduce((s, r) => s + r.n, 0);
  let k = 0;
  return {
    key: 'club', cls: 's-club s-scroll', sec: 'Field Club', cap: 'Field Club / Session 006', title: 'PR6 · Field Club',
    tr: `<p class="tr-tag mono"><i class="live" aria-hidden="true"></i>Session 006 <span>/ Sat 08:00</span></p>`, disc: null, cam: {st: -1},
    html: `<div class="sc" data-scroll>
      <header class="sc-h e" style="--i:0">
        <h1 class="h1" tabindex="-1">Go further.<br>Together.</h1>
        <p class="lede">Notifications and information from the Formulary: restocks, new entries, session notes, and what members say about the range. Field Club is not a membership tier; every member has it.</p>
      </header>
      <div class="club-grid">
        <section class="club-feed" aria-labelledby="nH">
          <h2 id="nH" class="lbl mono e" style="--i:1"><span>01</span> Notifications <span class="smp">Sample</span></h2>
          <ol class="feed">${FEED.map(f => { const p = f.id && byId(f.id); return `<li class="fd e" style="--i:${Math.min(++k + 1, 12)}" data-k="${f.k}"${prefs[f.k] === false ? ' data-muted' : ''}>
            <span class="fd-d mono">${fmtDate(f.d, {year: undefined})}</span>
            <span class="fd-k mono">${T(FEED_KINDS[f.k])}</span>
            <span class="fd-b"><b>${esc(f.t)}</b> ${esc(f.b)}</span>
            ${p ? `<a class="fd-a mono" href="#/p/${p.id}">${p.id} <span aria-hidden="true">&rarr;</span><span class="sr"> ${esc(p.n)}</span></a>` : f.href ? `<a class="fd-a mono" href="${f.href}">Read <span aria-hidden="true">&rarr;</span></a>` : '<span></span>'}
          </li>`; }).join('')}</ol>
          <div class="prefs-w e" style="--i:10">
            <h3 class="lbl mono">Tell me about</h3>
            <ul class="prefs">${Object.keys(FEED_KINDS).map(kk => `<li><label class="sw"><input type="checkbox" data-pref="${kk}"${prefs[kk] ? ' checked' : ''}><span class="sw-t mono">${T(PLURAL[kk])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
            <p class="fine mono">By email, from Member Liaison. Saved on this device in the preview.</p>
          </div>
          <div class="ink-card e" style="--i:11"><p class="lbl mono"><i class="live" aria-hidden="true"></i>Session 006</p><p class="ink-t">Saturday, 08:00. A 6 km easy loop, then coffee.</p><p class="mono ink-m">Members only / Member Liaison sends the meeting point on Friday</p></div>
        </section>
        <section class="club-rev" id="reviews" aria-labelledby="rH">
          <div class="rv-h e" style="--i:2"><h2 id="rH" class="lbl mono"><span>02</span> Reviews <span class="smp">Sample</span></h2><p class="rv-all mono"><b>${rvAll.toFixed(1)} / 5</b> <span>${REVIEWS.reduce((s, r) => s + r.n, 0)} reviews / ${REVIEWS.length} entries</span></p></div>
          <ol class="rv">${REVIEWS.map((r, i) => { const p = byId(r.id); return `<li class="rv-c e" style="--i:${Math.min(i + 3, 12)}">
            <a class="rv-p" href="#/p/${p.id}"><span class="rv-v disc-s">${packHTML(p)}</span><span class="mono rv-pt"><span>${p.id}</span><b>${esc(p.n)}</b></span></a>
            <p class="rv-s mono">${r.r.toFixed(1)} / 5 <span>${r.n} reviews</span></p>
            ${r.q.map(q => `<blockquote><p>“${esc(q.t)}”</p><footer class="mono">Member ${q.m} <i>/</i> ${T(q.d)}</footer></blockquote>`).join('')}
          </li>`; }).join('')}</ol>
          <p class="fine mono">Reviews describe the pack, the taste, the texture and the dispatch. Reviews that describe effects are not published.</p>
        </section>
      </div>
    </div>`,
    init(el) {
      $$('[data-pref]', el).forEach(c => c.addEventListener('change', () => {
        const all = Object.assign({}, prefs); $$('[data-pref]', el).forEach(x => all[x.dataset.pref] = x.checked); store.set(CLUB, all);
        $$(`.fd[data-k="${c.dataset.pref}"]`, el).forEach(f => f.toggleAttribute('data-muted', !c.checked));
        say((c.checked ? 'On: ' : 'Off: ') + FEED_KINDS[c.dataset.pref] + 's.');
      }));
      if (sub === 'reviews') setTimeout(() => { const r = $('#reviews', el), s = $('[data-scroll]', el); if (r && s) s.scrollTo({top: r.offsetTop - 20, behavior: RM ? 'auto' : 'smooth'}); }, RM ? 30 : 650);
      return {};
    }
  };
}

/* ================================================================ 5. member pages: one shell, same slab language */
export const MPAGES = [
  ['record', 'Member Record'], ['cabinet', 'Your Cabinet'], ['dispatches', 'Dispatches'], ['nominations', 'Nominations'],
  ['notes', 'Field Notes'], ['new', 'New Entries'], ['liaison', 'Member Liaison'], ['key', 'Your Key']
];
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="pill" type="submit"><span class="pl">${T(btn)}</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s mono" role="status"></p></div>${note ? `<p class="fine mono">${note}</p>` : ''}</form>`;
const inp = (n, l, t = 'text', o = '') => `<label class="fl"><span class="fld-l mono">${l}</span><input class="fld-in mono" name="${n}" type="${t}" ${o}></label>`;
const MBODY = {
  record: () => `<div class="rec">${[['Member', MEMBER.no], ['Member since', fmtDate(MEMBER.since)], ['Name', MEMBER.name], ['Email', MEMBER.email], ['Delivery', MEMBER.city + ' ' + MEMBER.post], ['Key', MEMBER.key], ['Protocol', '<span data-rec-pro></span>'], ['Field Club', '<a href="#/club">Notifications on</a>']].map(([kk, v], i) => `<div class="fld e" style="--i:${i + 2}"><p class="fld-l mono">${kk}</p><p class="fld-v mono">${v}</p></div>`).join('')}</div>
    <p class="fine mono">Sample record. To change any of these details, write to <a href="#/m/liaison">Member Liaison</a>.</p>`,
  cabinet: () => { const ids = [...new Set(PAST.flatMap(d => d.items.map(i => i[0])))]; return `<p class="lede">Everything that has come to you, in one place. Reorder a single item without changing Your Protocol.</p>
    <ol class="cab">${ids.map((id, i) => { const p = byId(id); return `<li class="e" style="--i:${i + 2}"><a class="cab-v disc-s" href="#/p/${id}">${packHTML(p)}</a><p class="mono cab-t"><span>${id}</span><b>${esc(p.n)}</b><span>Last sent ${fmtDate(PAST.find(d => d.items.some(x => x[0] === id)).d)}</span></p><button class="c-add mono" type="button" data-add="${id}" aria-label="Reorder ${esc(p.n)}, one-off"><span aria-hidden="true">[+]</span> Reorder</button></li>`; }).join('')}</ol>
    <p class="fine mono">Sample cabinet, built from the sample dispatches.</p>`; },
  dispatches: () => `<div class="nxd e" style="--i:2"><p class="lbl mono"><i class="live" aria-hidden="true"></i>Next dispatch</p><p class="nxd-d">${dispatchLabel()}</p><div data-nxd></div></div>
    <h2 class="lbl mono mt">Past dispatches <span class="smp">Sample</span></h2>
    <table class="tbl mono disp"><thead><tr><th scope="col">No.</th><th scope="col">Sent</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${PAST.map(d => `<tr><td>${d.no}</td><td>${fmtDate(d.d)}</td><td>${d.items.map(([id, q]) => `<a href="#/p/${id}">${id}</a>${q > 1 ? ' ×' + q : ''}`).join(', ')}</td><td>${money(d.items.reduce((s, [id, q]) => s + byId(id).pc * q, 0))}</td><td>${d.st}</td></tr>`).join('')}</tbody></table>`,
  nominations: () => `<p class="lede">Members may nominate someone for a key. Member Liaison reviews each nomination and replies to you, not to them.</p>
    ${form('nom', inp('name', 'Their name') + inp('email', 'Their email', 'email', 'autocomplete="off"') + `<label class="fl"><span class="fld-l mono">One line on why</span><textarea class="fld-in" name="why" rows="3"></textarea></label>`, 'Send nomination', 'Two nominations per member per year.')}
    <h2 class="lbl mono mt">Your nominations <span class="smp">Sample</span></h2><ol class="noms mono"><li><span>N-0031</span><span>J. Okafor</span><span>Under review</span></li></ol>`,
  notes: () => `<ol class="notes">${NOTES.map((n, i) => `<li class="e" style="--i:${Math.min(i + 2, 10)}"><details><summary><span class="mono n-no">Field note ${n.no}</span><span class="n-t">${esc(n.t)}</span><span class="mono n-m">${fmtDate(n.d)} · ${n.min} min</span><span class="n-x">${esc(n.x)}</span></summary><div class="n-b">${n.b.map(x => `<p>${esc(x)}</p>`).join('')}</div></details></li>`).join('')}</ol>`,
  new: () => `<p class="lede">The most recent additions to the Formulary.</p>
    <ol class="newl">${NEW.map(([id, d], i) => { const p = byId(id); return `<li class="e" style="--i:${i + 2}"><a href="#/p/${id}"><span class="newl-v disc-s">${packHTML(p)}</span><span class="mono newl-d">Added ${fmtDate(d)}</span><span class="newl-n">${esc(p.n)}</span><span class="mono newl-m">${id} · ${esc(p.g)} · ${money(p.pc)}</span></a></li>`; }).join('')}</ol>
    <p class="fine mono">Dates are sample dates.</p>`,
  liaison: () => `<div class="liai"><div><p class="lede">One desk for everything: dispatches, your key, certificates of analysis, nominations, and any question about an entry.</p>
    <dl class="kv mono"><div><dt>Hours</dt><dd>Mon to Fri, 09:00 to 17:00 ET</dd></div><div><dt>Reply</dt><dd>Within one business day</dd></div><div><dt>Email</dt><dd>liaison@pr6.example</dd></div></dl></div>
    ${form('liai', `<label class="fl"><span class="fld-l mono">About</span><select class="fld-in mono" name="about"><option>A dispatch</option><option>Your Protocol</option><option>A certificate of analysis</option><option>Your key</option><option>Something else</option></select></label><label class="fl"><span class="fld-l mono">Message</span><textarea class="fld-in" name="msg" rows="4"></textarea></label>`, 'Send to Member Liaison')}</div>`,
  key: () => `<div class="keyc"><div class="card" aria-hidden="true"><span class="card-wm">PR6</span><span class="card-c mono">0047 RSRV</span><span class="card-n mono">Member edition <i>/</i> 0047</span><span class="card-chip"></span></div>
    <div><p class="lede">Your key is a card with an NFC chip. Hold it to a phone and the Formulary opens already unlocked. The code on the card works on any device.</p>
    <dl class="kv mono"><div><dt>Code</dt><dd>0047RSRV</dd></div><div><dt>Card</dt><dd>${MEMBER.key}</dd></div><div><dt>Lost it?</dt><dd><a href="#/m/liaison">Member Liaison</a> retires the old code</dd></div></dl>
    <a class="pill ghost" href="#/exit"><span class="pl">EXIT THIS DEVICE</span><span class="arr" aria-hidden="true">&rarr;</span></a><p class="fine mono">Exit forgets the key on this browser and closes the Formulary.</p></div></div>`
};
const MLEDE = {record: 'Your details, as we hold them.', dispatches: 'What is coming, and what has been sent.', notes: 'Short notes on reading, storing and using the Formulary.'};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  return {
    key: 'member', cls: 's-mem s-scroll', sec: name, cap: `Member / M/${pad2(i + 1)}`, title: 'PR6 · ' + name,
    tr: `<p class="tr-tag mono">Member ${MEMBER.no}</p>`, disc: null, cam: {st: -1},
    html: `<div class="mem">
      <nav class="mem-nav" aria-label="Member pages"><ol>${MPAGES.map(([kk, nn], j) => `<li class="e" style="--i:${j}"><a class="mono${kk === k ? ' on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}><span>M/${pad2(j + 1)}</span>${T(nn)}</a></li>`).join('')}<li class="e" style="--i:8"><a class="mono" href="#/exit"><span>--</span>EXIT</a></li></ol></nav>
      <section class="mem-main sc" data-scroll aria-labelledby="mH">
        <header class="mem-h e" style="--i:1"><h1 id="mH" class="h1" tabindex="-1">${esc(name)}</h1>${MLEDE[k] ? `<p class="lede">${MLEDE[k]}</p>` : ''}</header>
        <div class="mem-b mb-${k} e" style="--i:2">${MBODY[k]()}</div>
      </section>
    </div>`,
    init(el, ctx) {
      $$('[data-mf]', el).forEach(f => f.addEventListener('submit', e => {
        e.preventDefault(); const req = $$('input,textarea', f).filter(x => x.type !== 'checkbox');
        const empty = req.find(x => !x.value.trim()); req.forEach(x => x.toggleAttribute('aria-invalid', !x.value.trim()));
        const s = $('.mf-s', f);
        if (empty) { s.textContent = 'Please fill in every field.'; empty.focus(); return; }
        s.textContent = 'Received. In this preview nothing has been sent.'; f.reset();
      }));
      el.addEventListener('click', e => { const b = e.target.closest('[data-add]'); if (!b) return; ctx.addFly(b.dataset.add, b); Protocol.add(b.dataset.add, 'one', 30, 1, {open: false}); });
      const rp = $('[data-rec-pro]', el); if (rp) { const ls = Protocol.lines(); rp.textContent = ls.length ? `${ls.length} ${ls.length === 1 ? 'line' : 'lines'}, ${ls.filter(l => l.m === 'sub').length} on subscription` : 'Empty'; }
      const nx = $('[data-nxd]', el); if (nx) {
        const subs = Protocol.lines().filter(l => l.m === 'sub');
        nx.innerHTML = subs.length ? `<ul class="nxd-l mono">${subs.map(l => { const p = byId(l.id); return `<li><a href="#/p/${p.id}">${p.id}</a><span>${esc(p.n)}</span><span>×${l.q}</span><span>Every ${l.fr} days</span><span>${money(p.psc * l.q)}</span></li>`; }).join('')}</ul>`
          : `<p class="mono fine">Nothing on subscription yet. Choose “Your Protocol” on any Dossier to have it sent on a schedule.</p>`;
      }
      return {};
    }
  };
}

function notFound() {
  return {key: 'nf', cls: 's-nf', sec: 'Not found', cap: '404', title: 'PR6 · Not found', tr: ctabs(null), disc: null, cam: {st: -1},
    html: `<div class="nf"><p class="lbl mono e" style="--i:0">404</p><h1 class="h1 e" style="--i:1" tabindex="-1">Not in the Formulary.</h1><p class="e" style="--i:2">${pillA('pill', '#/', 'Back to the Index')}</p></div>`, init() { return {}; }};
}

export function makeView(r) {
  switch (r.v) {
    case 'home': return index(false);
    case 'formulary': return index(true);
    case 'col': return collection(r.c, r.id);
    case 'product': return product(r.id);
    case 'club': return club(r.sub);
    case 'member': return member(r.page);
    default: return notFound();
  }
}
