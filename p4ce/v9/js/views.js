/* PR6 v9 · the pages. Each is plain markup plus an init(); app.js mounts it into #page, a flat scrolling surface.
   Rules for v9 (the owner found v8 "too AI"): flat surfaces (the Dossier's panel is the only glass), FreeSans
   hierarchy by size and weight, no eyebrows or kicker labels, no section numbers, no card grids, mono only for real
   data (codes, prices, amounts, the Dossier's field values), one black pill per screen.
   Catalogue, content and copy rules as v6 (no effect claims, no invented studies). British/Canadian spelling. */
import {CAT, ALL, byId, colOf, servingSize, purpose, directions, cautions, batch, CONC, PACKNAME} from './catalog.js';
import {$, $$, esc, money, pad2, ic, say, store, RM, clamp} from './util.js';
import {packHTML, packOf, Renders} from './renders.js';
import {Protocol, dispatchLabel} from './protocol.js';
import {Disc} from './disc.js';
import {FEED, FEED_KINDS, REVIEWS, reviewOf, PAST, MEMBER, NEW, NOTES, fmtDate} from './content.js';

const N = ALL.length;
/* APPROACH on the Dossier: one of the kit's pillars, read off the product's own directions (a filing label, not a claim) */
export const approach = p => /daily/.test(p.s) ? 'Consistency' : /as needed/.test(p.s) ? 'Intent' : 'Practice';
const range = co => { const ps = co.it.map(p => p.pc); const a = Math.min(...ps), b = Math.max(...ps); return a === b ? money(a) : `${money(a)}–${Math.round(b)}`; };
export const colData = co => `${co.it.length} entries <span class="dot" aria-hidden="true">·</span> ${range(co)}`;
const fmtLine = p => `${p.g}, ${p.q.replace(/ (capsules|tablets|softgels|sachets)$/, '')}`;
/* the image for a product on a page: the mist render (the pack on its own sweep), or the drawing */
const packImg = p => Renders.mist(p) || Renders.hero(p);

/* ================================================================ the Index: the whole range, one line each */
function index() {
  return {
    key: 'index', cls: 'v-index', title: 'PR6 · The Index',
    html: `<div class="ix wrap">
      <header class="pg-h">
        <h1 class="pg-t" tabindex="-1">The Index</h1>
        <p class="pg-l">The whole Formulary, one line each: ${N} entries in nine collections. Prices in Canadian dollars.</p>
      </header>
      <div class="ix-cols">
        <div class="ix-list">${CAT.map(co => `<section class="ix-g" aria-labelledby="g${co.c}">
          <h2 class="ix-gh" id="g${co.c}"><a href="#/c/${co.c}">${esc(co.n)}</a></h2>
          <p class="ix-gd">${esc(co.d)}.</p>
          <ol class="rows">${co.it.map(rowHTML).join('')}</ol>
        </section>`).join('')}</div>
        <figure class="ix-fig" aria-hidden="true"><div class="ix-pic" data-pic></div><figcaption class="ix-cap" data-piccap></figcaption></figure>
      </div>
    </div>`,
    init(el, ctx) {
      const pic = $('[data-pic]', el), cap = $('[data-piccap]', el);
      let cur = null;
      const show = id => {
        if (cur === id) return; cur = id; const p = byId(id); if (!p) return;
        const src = packImg(p);
        const nx = document.createElement('div'); nx.className = 'ix-im';
        nx.innerHTML = src ? `<img src="${esc(src)}" alt="" decoding="async">` : packHTML(p);
        pic.appendChild(nx); requestAnimationFrame(() => nx.classList.add('on'));
        [...pic.children].slice(0, -2).forEach(c => c.remove());
        cap.innerHTML = `<span class="mono">${p.id}</span> ${esc(p.n)}`;
      };
      show(CAT[0].it[0].id);
      el.addEventListener('pointerover', e => { const r = e.target.closest('.row'); if (r && e.pointerType !== 'touch') show(r.dataset.id); });
      el.addEventListener('focusin', e => { const r = e.target.closest('.row'); if (r) show(r.dataset.id); });
      bindAdd(el, ctx);
      return {};
    }
  };
}
const rowHTML = p => `<li class="row" data-id="${p.id}">
    <a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(fmtLine(p))}</span><span class="r-p mono">${money(p.pc)}</span></a>
    <button class="r-add" type="button" data-add="${p.id}" aria-label="Add ${esc(p.n)} to Your Protocol, one-off, ${money(p.pc)}">Add</button>
  </li>`;
function bindAdd(el, ctx) {
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    e.preventDefault(); const id = b.dataset.add;
    ctx.addFly(id, b);
    Protocol.add(id, 'one', 30, 1, {open: false});
    b.textContent = 'Added'; b.classList.add('done');
    setTimeout(() => { b.textContent = b.dataset.lbl || 'Add'; b.classList.remove('done'); }, 1600);
  });
}

/* ================================================================ a collection: an editorial page, one image at a time.
   The station's still, large, on one side; a plain list of the collection's entries on the other. Hover or focus on an
   entry and the image becomes that entry's pack. */
function collection(c, ctx) {
  const co = colOf(c); if (!co) return notFound();
  const i = CAT.indexOf(co), prev = CAT[(i + 8) % 9], next = CAT[(i + 1) % 9];
  const still = ctx.still(co.c);
  return {
    key: 'col', cls: 'v-col', title: `PR6 · ${co.n}`, st: i,
    html: `<article class="col">
      <figure class="col-fig" aria-hidden="true"${still && still.fx != null ? ` style="--fx:${(still.fx * 100).toFixed(1)}%;--fy:${(still.fy * 100).toFixed(1)}%"` : ''}>
        <div class="col-im on" data-im="st">${still ? `<img src="${esc(still.src)}" alt="" decoding="async" data-fb="${esc(still.fb || '')}">` : ''}</div>
      </figure>
      <div class="col-body">
        <header class="col-h">
          <h1 class="col-t" tabindex="-1">${esc(co.n)}</h1>
          <p class="col-d">${esc(co.d)}.</p>
          <p class="col-m mono">${colData(co)}</p>
        </header>
        <ol class="rows col-rows" aria-label="${co.it.length} entries in ${esc(co.n)}">${co.it.map(p => `<li class="row" data-id="${p.id}">
          <a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">${esc(fmtLine(p))}</span><span class="r-p mono">${money(p.pc)}</span></a></li>`).join('')}</ol>
        <nav class="col-nav" aria-label="Other collections">
          <a href="#/c/${prev.c}" class="cn"><span aria-hidden="true">&larr;</span> ${esc(prev.n)}</a>
          <a href="#/c/${next.c}" class="cn">${esc(next.n)} <span aria-hidden="true">&rarr;</span></a>
        </nav>
      </div>
    </article>`,
    init(el) {
      const fig = $('.col-fig', el);
      const stImg = $('[data-im="st"] img', el);
      /* frame the still on its subject: the cover crop centres on it, then a push-in until the subject (plus a little air)
         fills the width of the figure, so the plinth sits large and whole and the frame-edge strays fall outside */
      let ro = null;
      if (stImg && still && still.fw) {
        const fit = () => { const w = fig.clientWidth, h = fig.clientHeight; if (!w || !h) return; const a = Math.min(1, w / h); fig.style.setProperty('--z', clamp(a * .96 / still.fw, 1.04, 1.5).toFixed(3)); };
        fit(); if (window.ResizeObserver) { ro = new ResizeObserver(fit); ro.observe(fig); }
      }
      if (stImg) stImg.addEventListener('error', () => { const fb = stImg.dataset.fb; if (fb && stImg.src.indexOf(fb) < 0) stImg.src = fb; }, {once: true});
      const ims = {};
      let cur = 'st', t = 0;
      const show = id => {
        clearTimeout(t);
        if (cur === id) return; cur = id;
        if (id !== 'st' && !ims[id]) {
          const p = byId(id), src = packImg(p);
          const d = document.createElement('div'); d.className = 'col-im pack'; d.dataset.im = id;
          d.innerHTML = src ? `<img src="${esc(src)}" alt="" decoding="async">` : packHTML(p);
          fig.appendChild(d); ims[id] = d; void d.offsetWidth;
        }
        $$('.col-im', fig).forEach(d => d.classList.toggle('on', d.dataset.im === id));
      };
      const rowOf = e => e.target.closest && e.target.closest('.row');
      /* only a pointer that has moved since the page arrived swaps the image (a cursor left resting where Enter was, which
         is now over the list, must not replace the still before anyone has looked at it) */
      let armed = false; const arm = () => { armed = true; }; el.addEventListener('pointermove', arm, {once: true});
      el.addEventListener('pointerover', e => { const r = rowOf(e); if (r && armed && e.pointerType !== 'touch') show(r.dataset.id); });
      el.addEventListener('pointerout', e => { const r = rowOf(e); if (r && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.col-rows'))) t = setTimeout(() => show('st'), 260); });
      el.addEventListener('focusin', e => { const r = rowOf(e); show(r ? r.dataset.id : 'st'); });
      /* (preload the packs, so a hover never waits) */
      co.it.forEach(p => { const s = packImg(p); if (s) { const im = new Image(); im.src = s; } });
      return {
        keydown(e) {
          if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
          if (e.key === 'Escape') location.hash = '#/';
        },
        destroy() { if (ro) ro.disconnect(); }
      };
    }
  };
}

/* ================================================================ the Dossier: as close as possible to the kit's slide 4.
   The thick, rounded, frosted panel (the one place in v9 that is glass): PR6 / the product's name, Collection, Format and
   Approach in debossed fields on the left, the real pack turning on a debossed disc on the right, the black pill.
   The detail follows below on the plain page. */
function ingTable(p) {
  if (p.top) {
    const c = CONC[p.id] || [];
    return `${c.length ? `<table class="tbl"><thead><tr><th scope="col">Key ingredient</th><th scope="col">Concentration</th></tr></thead><tbody>${c.map(r => `<tr><td>${esc(r[0])}</td><td class="mono">${esc(r[1])}</td></tr>`).join('')}</tbody></table>` : ''}
      <p class="full"><b>Full ingredients.</b> ${esc(p.oth)}</p>`;
  }
  const per = (p.act.find(a => a.per) || {}).per || 'per serving';
  return `<table class="tbl"><thead><tr><th scope="col">Ingredient</th><th scope="col">Amount, ${esc(per)}</th></tr></thead><tbody>
    ${p.act.map(a => `<tr><td>${esc(a.name)}${a.form ? ` <span class="frm">(${esc(a.form)})</span>` : ''}</td><td class="mono">${esc(a.amt)}</td></tr>`).join('')}</tbody></table>
    <p class="full"><b>Other ingredients.</b> ${esc(p.oth)}</p>`;
}
function product(id, ctx) {
  const p = byId(id); if (!p) return notFound();
  const co = colOf(p.c), rel = co.it.filter(x => x.id !== p.id), rv = reviewOf(p.id), pack = packOf(p);
  const still = ctx.still(co.c);
  const fld = (label, value) => `<div class="fld"><p class="fld-l">${esc(label)}</p><p class="fld-v mono">${esc(String(value).toUpperCase())}</p></div>`;
  return {
    key: 'product', cls: 'v-product', title: `PR6 · ${p.n}`, st: CAT.indexOf(co),
    html: `<div class="pd">
      <div class="pd-bg" aria-hidden="true">${still ? `<img src="${esc(still.src)}" alt="" decoding="async" data-fb="${esc(still.fb || '')}">` : ''}</div>
      <section class="pd-stage" aria-labelledby="pnT">
        <div class="plate" aria-hidden="true"></div>
        <div class="panel">
          <div class="panel-glass" aria-hidden="true"></div>
          <header class="pn-h">
            <a class="pn-mark" href="#/c/${co.c}" aria-label="Back to ${esc(co.n)}"><span class="wm" aria-hidden="true">PR6</span><i aria-hidden="true">/</i></a>
            <h1 class="pn-t" id="pnT" tabindex="-1">${esc(p.n)}</h1>
          </header>
          <a class="pn-back" href="#/c/${co.c}"><span aria-hidden="true">&larr;</span> ${esc(co.n)}</a>
          <div class="pn-fields">
            ${fld('Collection', `${co.c} ${co.n}`)}
            ${fld('Format', p.g)}
            ${fld('Approach', approach(p))}
          </div>
          <div class="pn-disc" data-disc aria-hidden="true"><div class="disc"></div><div class="disc-items"></div></div>
          <div class="pn-act"><button class="pill" type="button" data-add1><span class="pl">ADD TO PROTOCOL</span><span class="arr" aria-hidden="true">&rarr;</span></button></div>
          <footer class="pn-f"><p><span class="mono">${money(p.pc)}</span> one-off <span class="dot" aria-hidden="true">·</span> <span class="mono">${money(p.psc)}</span> on Your Protocol</p><i class="hair" aria-hidden="true"></i></footer>
        </div>
      </section>
      <article class="pd-detail" aria-labelledby="pdH">
        <div class="wrap pd-grid">
          <div class="pd-main">
            <h2 id="pdH" class="pd-t">${esc(p.n)}</h2>
            <p class="pd-w">${esc(p.w)}</p>
            <section class="ds"><h3 class="ds-h">Serving</h3><dl class="kv"><div><dt>Serving</dt><dd>${esc(servingSize(p))}</dd></div><div><dt>Directions</dt><dd>${esc(p.s)}</dd></div><div><dt>In the pack</dt><dd>${esc(p.q)}</dd></div></dl><p class="ds-p">${esc(purpose(p))} ${esc(p.e)}</p></section>
            <section class="ds"><h3 class="ds-h">Ingredients</h3>${ingTable(p)}</section>
            <section class="ds"><h3 class="ds-h">Directions</h3><ol class="ds-list">${directions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ol></section>
            <section class="ds"><h3 class="ds-h">Cautions</h3><ul class="ds-list">${cautions(p).map(d => `<li>${esc(d)}</li>`).join('')}</ul></section>
          </div>
          <aside class="pd-side">
            <form class="buy" data-buy novalidate aria-labelledby="buyH">
              <h3 class="ds-h" id="buyH">How you would like it</h3>
              <fieldset class="opts"><legend class="sr">How you would like it</legend>
                <label class="opt"><input type="radio" name="m" value="sub" checked><span class="o-b"><span class="o-t">On Your Protocol</span><span class="o-p mono">${money(p.psc)}</span><span class="o-s">Sent every <select name="fr" aria-label="Frequency"><option value="30">30</option><option value="60">60</option><option value="90">90</option></select> days. Skip or stop from Dispatches.</span></span></label>
                <label class="opt"><input type="radio" name="m" value="one"><span class="o-b"><span class="o-t">One-off</span><span class="o-p mono">${money(p.pc)}</span><span class="o-s">Sent once, with the next dispatch.</span></span></label>
              </fieldset>
              <div class="buy-r">
                <span class="step" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="One fewer">${ic('minus', 's')}</button><output class="mono" name="q" aria-live="polite">1</output><button type="button" data-q="1" aria-label="One more">${ic('plus', 's')}</button></span>
                <button class="add-txt" type="submit">Add to Your Protocol <span aria-hidden="true">&rarr;</span></button>
              </div>
              <p class="buy-f">Next dispatch <span class="mono">${dispatchLabel()}</span></p>
            </form>
            <section class="ds"><h3 class="ds-h">Testing and sourcing</h3><dl class="kv"><div><dt>Batch</dt><dd class="mono">${batch(p)}</dd></div><div><dt>Certificate</dt><dd>On request</dd></div><div><dt>Pack</dt><dd>${esc(PACKNAME[pack])}</dd></div></dl><p class="ds-p">Each batch is identified by the code on the base of the pack. A certificate of analysis for your batch is available from <a class="u" href="#/m/liaison">Member Liaison</a>. Sourcing details for each ingredient will be published here.</p></section>
            ${rv ? `<section class="ds"><h3 class="ds-h">From Field Club</h3><p class="rv-s"><span class="mono">${rv.r.toFixed(1)} / 5</span> from ${rv.n} sample reviews</p><blockquote class="rv-q">“${esc(rv.q[0].t)}”</blockquote><p class="rv-m">Member <span class="mono">${rv.q[0].m}</span>, ${esc(rv.q[0].d)}</p><a class="u" href="#/club/reviews">All reviews</a></section>` : ''}
          </aside>
        </div>
        <section class="wrap rel" aria-labelledby="relH">
          <h3 id="relH" class="rel-t">More from ${esc(co.n)}</h3>
          <ol class="rows">${rel.map(x => `<li class="row" data-id="${x.id}"><a class="row-a" href="#/p/${x.id}"><span class="r-c mono">${x.id}</span><span class="r-n">${esc(x.n)}</span><span class="r-f">${esc(fmtLine(x))}</span><span class="r-p mono">${money(x.pc)}</span></a></li>`).join('')}</ol>
        </section>
      </article>
    </div>`,
    init(el, ctx2) {
      const bgI = $('.pd-bg img', el); if (bgI) bgI.addEventListener('error', () => { const fb = bgI.dataset.fb; if (fb && bgI.src.indexOf(fb) < 0) bgI.src = fb; }, {once: true});
      const discEl = $('[data-disc]', el);
      Disc.init(discEl); Disc.show(p, {instant: true}); Disc.setIdle('spin'); Disc.setTurn(null);
      const f = $('[data-buy]', el), out = $('output', f); let q = 1;
      const sync = () => { const sub = f.m.value === 'sub'; $$('.opt', f).forEach(o => o.classList.toggle('on', o.querySelector('input').checked)); f.fr.disabled = !sub; };
      f.addEventListener('change', sync); sync();
      $$('[data-q]', f).forEach(b => b.onclick = () => { q = clamp(q + +b.dataset.q, 1, 99); out.textContent = q; });
      const added = (btn, m, fr, qq, label) => {
        ctx2.addFly(p.id, btn);
        Protocol.add(p.id, m, fr, qq, {open: false});
        const pl = $('.pl', btn) || btn; const was = pl.innerHTML;
        pl.textContent = label; btn.classList.add('done');
        setTimeout(() => { pl.innerHTML = was; btn.classList.remove('done'); }, 1900);
      };
      $('[data-add1]', el).addEventListener('click', e => added(e.currentTarget, 'one', 30, 1, 'ADDED'));
      f.addEventListener('submit', e => { e.preventDefault(); added($('.add-txt', f), f.m.value, +f.fr.value, q, 'Added to Your Protocol'); });
      /* drag across the disc to turn the pack */
      let drag = null;
      discEl.addEventListener('pointerdown', e => { if (e.button > 0) return; drag = {x: e.clientX, y: e.clientY, lx: e.clientX, axis: null, id: e.pointerId}; });
      discEl.addEventListener('pointermove', e => {
        if (!drag || e.pointerId !== drag.id) return;
        if (!drag.axis && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) { drag.axis = Math.abs(e.clientX - drag.x) > Math.abs(e.clientY - drag.y) ? 'x' : 'y'; if (drag.axis === 'x') { try { discEl.setPointerCapture(e.pointerId); } catch (x) {} Disc.grab(true); } }
        if (drag.axis === 'x') { Disc.dragTurn(e.clientX - drag.lx); drag.lx = e.clientX; }
      });
      const up = () => { if (drag && drag.axis === 'x') Disc.grab(false); drag = null; };
      discEl.addEventListener('pointerup', up); discEl.addEventListener('pointercancel', up);
      return {
        keydown(e) { if (/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') Disc.nudge(2); if (e.key === 'ArrowLeft') Disc.nudge(-2); },
        destroy() { Disc.setTurn(null); Disc.grab(false); Disc.release(); }
      };
    }
  };
}

/* ================================================================ PR6 / Field Club: notifications and reviews */
const CLUB = 'pr6.v9.club';
const PLURAL = {restock: 'Restocks', new: 'New entries', session: 'Session notes', dispatch: 'Dispatch reminders', note: 'Field notes'};
function club(sub) {
  const prefs = Object.assign({restock: true, new: true, session: true, dispatch: false, note: true}, store.get(CLUB, {}));
  const total = REVIEWS.reduce((s, r) => s + r.n, 0), rvAll = REVIEWS.reduce((s, r) => s + r.r * r.n, 0) / total;
  return {
    key: 'club', cls: 'v-club', title: 'PR6 · Field Club',
    html: `<div class="wrap club">
      <header class="pg-h">
        <h1 class="pg-t" tabindex="-1">Field Club</h1>
        <p class="pg-l">Notifications and information from the Formulary: restocks, new entries, session notes, and what members say about the range. Field Club is not a membership tier; every member has it.</p>
      </header>
      <div class="club-cols">
        <section class="club-feed" aria-labelledby="nH">
          <h2 id="nH" class="sec-t">Notifications <span class="smp">sample</span></h2>
          <ol class="feed">${FEED.map(fd => { const p = fd.id && byId(fd.id); return `<li class="fd" data-k="${fd.k}"${prefs[fd.k] === false ? ' data-muted' : ''}>
            <p class="fd-d"><span class="mono">${fmtDate(fd.d, {year: undefined})}</span> ${esc(FEED_KINDS[fd.k])}</p>
            <p class="fd-b"><b>${esc(fd.t)}.</b> ${esc(fd.b)}${p ? ` <a class="u" href="#/p/${p.id}">${esc(p.n)}</a>` : fd.href ? ` <a class="u" href="${fd.href}">Read it</a>` : ''}</p>
          </li>`; }).join('')}</ol>
          <div class="prefs-w">
            <h3 class="sub-t">Tell me about</h3>
            <ul class="prefs">${Object.keys(FEED_KINDS).map(kk => `<li><label class="sw"><input type="checkbox" data-pref="${kk}"${prefs[kk] ? ' checked' : ''}><span class="sw-t">${esc(PLURAL[kk])}</span><span class="sw-k" aria-hidden="true"></span></label></li>`).join('')}</ul>
            <p class="fine">By email, from Member Liaison. Saved on this device in the preview.</p>
          </div>
        </section>
        <section class="club-rev" id="reviews" aria-labelledby="rH">
          <h2 id="rH" class="sec-t">Reviews <span class="smp">sample</span></h2>
          <p class="rv-all"><span class="mono">${rvAll.toFixed(1)} / 5</span> across ${total} reviews of ${REVIEWS.length} entries</p>
          <ol class="rv">${REVIEWS.map(r => { const p = byId(r.id); return `<li class="rv-i">
            <p class="rv-p"><a href="#/p/${p.id}">${esc(p.n)}</a> <span class="mono">${p.id}</span></p>
            <p class="rv-s"><span class="mono">${r.r.toFixed(1)} / 5</span>, ${r.n} reviews</p>
            ${r.q.map(q => `<blockquote class="rv-q"><p>“${esc(q.t)}”</p><footer>Member <span class="mono">${q.m}</span>, ${esc(q.d)}</footer></blockquote>`).join('')}
          </li>`; }).join('')}</ol>
          <p class="fine">Reviews describe the pack, the taste, the texture and the dispatch. Reviews that describe effects are not published.</p>
        </section>
      </div>
    </div>
    <section class="ink" aria-labelledby="sH"><div class="wrap ink-in">
      <h2 id="sH" class="ink-t">Session 006</h2>
      <p class="ink-b">Saturday, 08:00. A 6 km easy loop, then coffee. Members only; Member Liaison sends the meeting point on Friday.</p>
    </div></section>`,
    init(el) {
      $$('[data-pref]', el).forEach(c => c.addEventListener('change', () => {
        const all = Object.assign({}, prefs); $$('[data-pref]', el).forEach(x => all[x.dataset.pref] = x.checked); store.set(CLUB, all);
        $$(`.fd[data-k="${c.dataset.pref}"]`, el).forEach(fd => fd.toggleAttribute('data-muted', !c.checked));
        say((c.checked ? 'On: ' : 'Off: ') + PLURAL[c.dataset.pref] + '.');
      }));
      if (sub === 'reviews') setTimeout(() => { const r = $('#reviews', el); if (r) r.scrollIntoView({behavior: RM ? 'auto' : 'smooth', block: 'start'}); }, RM ? 30 : 400);
      return {};
    }
  };
}

/* ================================================================ member pages: one shell */
export const MPAGES = [
  ['record', 'Member Record'], ['cabinet', 'Your Cabinet'], ['dispatches', 'Dispatches'], ['nominations', 'Nominations'],
  ['notes', 'Field Notes'], ['new', 'New Entries'], ['liaison', 'Member Liaison'], ['key', 'Your Key']
];
const form = (id, fields, btn, note) => `<form class="mf" data-mf="${id}" novalidate>${fields}<div class="mf-a"><button class="pill" type="submit"><span class="pl">${esc(btn.toUpperCase())}</span><span class="arr" aria-hidden="true">&rarr;</span></button><p class="mf-s" role="status"></p></div>${note ? `<p class="fine">${note}</p>` : ''}</form>`;
const inp = (n, l, t = 'text', o = '') => `<label class="fl"><span class="fl-l">${l}</span><input class="fl-in" name="${n}" type="${t}" ${o}></label>`;
const kv = rows => `<dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const MBODY = {
  record: () => `${kv([['Member', `<span class="mono">${MEMBER.no}</span>`], ['Member since', fmtDate(MEMBER.since)], ['Name', MEMBER.name], ['Email', MEMBER.email], ['Delivery', MEMBER.city + ' <span class="mono">' + MEMBER.post + '</span>'], ['Key', MEMBER.key], ['Your Protocol', '<span data-rec-pro></span>'], ['Field Club', '<a class="u" href="#/club">Notifications on</a>']])}
    <p class="fine">Sample record. To change any of these details, write to <a class="u" href="#/m/liaison">Member Liaison</a>.</p>`,
  cabinet: () => { const ids = [...new Set(PAST.flatMap(d => d.items.map(i => i[0])))]; return `<p class="lede">Everything that has come to you, in one place. Reorder a single item without changing Your Protocol.</p>
    <ol class="rows cab">${ids.map(id => { const p = byId(id); return `<li class="row" data-id="${id}"><a class="row-a" href="#/p/${id}"><span class="r-c mono">${id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">Last sent ${fmtDate(PAST.find(d => d.items.some(x => x[0] === id)).d)}</span><span class="r-p mono">${money(p.pc)}</span></a><button class="r-add" type="button" data-add="${id}" data-lbl="Reorder" aria-label="Reorder ${esc(p.n)}, one-off">Reorder</button></li>`; }).join('')}</ol>
    <p class="fine">Sample cabinet, built from the sample dispatches.</p>`; },
  dispatches: () => `<div class="nxd"><h2 class="sub-t">Next dispatch</h2><p class="nxd-d">${dispatchLabel()}</p><div data-nxd></div></div>
    <h2 class="sub-t mt">Past dispatches <span class="smp">sample</span></h2>
    <div class="tbl-w"><table class="tbl disp"><thead><tr><th scope="col">No.</th><th scope="col">Sent</th><th scope="col">Items</th><th scope="col">Total</th><th scope="col">Status</th></tr></thead><tbody>
    ${PAST.map(d => `<tr><td class="mono">${d.no}</td><td>${fmtDate(d.d)}</td><td class="mono">${d.items.map(([id, q]) => `<a class="u" href="#/p/${id}">${id}</a>${q > 1 ? ' ×' + q : ''}`).join(', ')}</td><td class="mono">${money(d.items.reduce((s, [id, q]) => s + byId(id).pc * q, 0))}</td><td>${d.st}</td></tr>`).join('')}</tbody></table></div>`,
  nominations: () => `<p class="lede">Members may nominate someone for a key. Member Liaison reviews each nomination and replies to you, not to them.</p>
    ${form('nom', inp('name', 'Their name') + inp('email', 'Their email', 'email', 'autocomplete="off"') + `<label class="fl"><span class="fl-l">One line on why</span><textarea class="fl-in" name="why" rows="3"></textarea></label>`, 'Send nomination', 'Two nominations per member per year.')}
    <h2 class="sub-t mt">Your nominations <span class="smp">sample</span></h2><p class="noms"><span class="mono">N-0031</span> J. Okafor, under review</p>`,
  notes: () => `<ol class="notes">${NOTES.map(n => `<li><details><summary><span class="n-t">${esc(n.t)}</span><span class="n-x">${esc(n.x)}</span><span class="n-m">${fmtDate(n.d)}, ${n.min} min read</span></summary><div class="n-b">${n.b.map(x => `<p>${esc(x)}</p>`).join('')}</div></details></li>`).join('')}</ol>`,
  new: () => `<p class="lede">The most recent additions to the Formulary.</p>
    <ol class="rows">${NEW.map(([id, d]) => { const p = byId(id); return `<li class="row" data-id="${id}"><a class="row-a" href="#/p/${id}"><span class="r-c mono">${id}</span><span class="r-n">${esc(p.n)}</span><span class="r-f">Added ${fmtDate(d)}</span><span class="r-p mono">${money(p.pc)}</span></a></li>`; }).join('')}</ol>
    <p class="fine">Dates are sample dates.</p>`,
  liaison: () => `<p class="lede">One desk for everything: dispatches, your key, certificates of analysis, nominations, and any question about an entry.</p>
    ${kv([['Hours', 'Monday to Friday, 09:00 to 17:00 ET'], ['Reply', 'Within one business day'], ['Email', 'liaison@pr6.example']])}
    ${form('liai', `<label class="fl"><span class="fl-l">About</span><select class="fl-in" name="about"><option>A dispatch</option><option>Your Protocol</option><option>A certificate of analysis</option><option>Your key</option><option>Something else</option></select></label><label class="fl"><span class="fl-l">Message</span><textarea class="fl-in" name="msg" rows="4"></textarea></label>`, 'Send to Member Liaison')}`,
  key: () => `<div class="keyc"><div class="card" aria-hidden="true"><span class="card-wm">PR6</span><span class="card-c mono">0047 RSRV</span><span class="card-chip"></span></div>
    <div><p class="lede">Your key is a card with an NFC chip. Hold it to a phone and the Formulary opens already unlocked. The code on the card works on any device.</p>
    ${kv([['Code', '<span class="mono">0047RSRV</span>'], ['Card', MEMBER.key], ['Lost it?', '<a class="u" href="#/m/liaison">Member Liaison</a> retires the old code']])}
    <p><a class="u" href="#/exit">Exit this device</a></p><p class="fine">Exit forgets the key on this browser and closes the Formulary.</p></div></div>`
};
const MLEDE = {record: 'Your details, as we hold them.', dispatches: 'What is coming, and what has been sent.', notes: 'Short notes on reading, storing and using the Formulary.', cabinet: '', key: ''};
function member(pg) {
  const i = MPAGES.findIndex(m => m[0] === pg); if (i < 0) return notFound();
  const [k, name] = MPAGES[i];
  return {
    key: 'member', cls: 'v-mem', title: 'PR6 · ' + name,
    html: `<div class="wrap mem">
      <nav class="mem-nav" aria-label="Member pages"><ol>${MPAGES.map(([kk, nn]) => `<li><a class="${kk === k ? 'on' : ''}" href="#/m/${kk}"${kk === k ? ' aria-current="page"' : ''}>${esc(nn)}</a></li>`).join('')}<li><a href="#/exit">Exit this device</a></li></ol></nav>
      <section class="mem-main" aria-labelledby="mH">
        <header class="pg-h"><h1 id="mH" class="pg-t" tabindex="-1">${esc(name)}</h1>${MLEDE[k] ? `<p class="pg-l">${MLEDE[k]}</p>` : ''}</header>
        <div class="mem-b mb-${k}">${MBODY[k]()}</div>
      </section>
    </div>`,
    init(el, ctx) {
      $$('[data-mf]', el).forEach(fm => fm.addEventListener('submit', e => {
        e.preventDefault(); const req = $$('input,textarea', fm).filter(x => x.type !== 'checkbox');
        const empty = req.find(x => !x.value.trim()); req.forEach(x => x.toggleAttribute('aria-invalid', !x.value.trim()));
        const s = $('.mf-s', fm);
        if (empty) { s.textContent = 'Please fill in every field.'; empty.focus(); return; }
        s.textContent = 'Received. In this preview nothing has been sent.'; fm.reset();
      }));
      bindAdd(el, ctx);
      const rp = $('[data-rec-pro]', el); if (rp) { const ls = Protocol.lines(); rp.textContent = ls.length ? `${ls.length} ${ls.length === 1 ? 'line' : 'lines'}, ${ls.filter(l => l.m === 'sub').length} on subscription` : 'Empty'; }
      const nx = $('[data-nxd]', el); if (nx) {
        const subs = Protocol.lines().filter(l => l.m === 'sub');
        nx.innerHTML = subs.length ? `<ol class="rows">${subs.map(l => { const p = byId(l.id); return `<li class="row"><a class="row-a" href="#/p/${p.id}"><span class="r-c mono">${p.id}</span><span class="r-n">${esc(p.n)} <span class="mono">×${l.q}</span></span><span class="r-f">Every ${l.fr} days</span><span class="r-p mono">${money(p.psc * l.q)}</span></a></li>`; }).join('')}</ol>`
          : `<p class="fine">Nothing on subscription yet. Choose “On Your Protocol” on any entry to have it sent on a schedule.</p>`;
      }
      return {};
    }
  };
}

function notFound() {
  return {key: 'nf', cls: 'v-nf', title: 'PR6 · Not found',
    html: `<div class="wrap nf"><h1 class="pg-t" tabindex="-1">Not in the Formulary.</h1><p class="pg-l">That address does not lead anywhere. <a class="u" href="#/">Back to the film</a> or <a class="u" href="#/index">open the Index</a>.</p></div>`, init() { return {}; }};
}

export function makeView(r, ctx) {
  switch (r.v) {
    case 'index': return index();
    case 'col': return collection(r.c, ctx);
    case 'product': return product(r.id, ctx);
    case 'club': return club(r.sub);
    case 'member': return member(r.page);
    default: return notFound();
  }
}
