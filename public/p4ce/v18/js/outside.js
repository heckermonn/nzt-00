// PR6 / Institute: the first-time journey, outside. Invitation entry (A01), the rain alley and its two doors (A02),
// confirmation (A03), access denied (A04), the Keeper (A05), application (A06), review status (A07), acceptance (A08),
// and the returning member's sign-in. The door is a ritual, not a lock: the choice is checked by the invitation
// service (store.js), and neither it nor the member number is ever a credential.
import { glyph } from './insignia.js';
import { store, fmtCode, fmtId } from './store.js';
import { DESC, RIGHTS } from './institution.js';
import { $, $$, esc, ease, lerpView, fmtDate, fmtTime, field, setErr } from './ui.js';

export function resume(inv) {
  if (!inv) return '#/';
  return { issued: '#/alley', validated: '#/alley', door: '#/keeper', keeper: '#/apply', applied: '#/status', approved: '#/offer' }[inv.state] || '#/';
}
const alleyLight = (S) => { S.rain = 0.9; S.vig = 0.7; S.grain = 0.04; S.expo = 0.82; S.weights.holo = 0; };
const frontView = (app) => (S) => (app.narrow() ? { cx: 0.5, cy: 0.8, zoom: 1 } : { cx: 0.36, cy: 0.56, zoom: 1.05 });
const farView = (app) => (S) => (app.narrow() ? { cx: 0.5, cy: 0.66, zoom: 1 } : { cx: 0.5, cy: 0.585, zoom: 1.2 });
const closeView = (app) => (S) => { const v = app.fit(S, [[0.3, 0.14], [0.71, 0.76]], 0.94); v.cy += (app.narrow() ? 0.1 : 0.05) / v.zoom; return v; };
const doorView = (app) => (S) => app.fit(S, [[0.19, 0.06], [0.9, 0.98]], 0.96);
const flicker = (t) => { const n = Math.sin(t * 37.1) * Math.sin(t * 5.3 + 1.7); return n > 0.84 ? 0.12 : Math.sin(t * 1.31) > 0.972 ? 0.45 : 1; };
const scrim = (v) => document.getElementById('view').style.setProperty('--scrim', v);

// ---------------------------------------------------------------------------------------------- A01 invitation entry
let tries = 0, holdUntil = 0;
export async function entry(app) {
  const ok = app.live(), view = app.view;
  app.amb('city');
  const W3 = app.world, inv = store.invitation();
  if (W3) W3.setDoors(inv && store.doors() ? store.doors() : { L: 'shen', R: 'ouroboros' });
  // The invitation is a card in the visitor's hand, so the page never shows one. What answers a recognised code is
  // the place itself: the lamps over the two doors come on.
  let lit = inv ? 1 : 0.03, lamps = lit;
  await app.scene({ layout: 'full', theme: 'outside', shot: 'front', frame: 'wide', tiles: ['medL_shen', 'medR_ouroboros'], view: frontView(app), dur: 1.8, setup: (S) => { alleyLight(S); S.expo = 0.5; S.vig = 0.9; S.rain = 0.7; } });
  if (!ok()) return null;
  scrim(1);
  const ask = () => {
    view.innerHTML = `<section class="front">
      <h1>Some doors were never meant to be found.</h1>
      <form id="f" novalidate>
        <div class="field"><label for="code">Invitation code</label>
          <input class="code" id="code" type="text" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" maxlength="11" placeholder="0000 0000" aria-describedby="code-h code-e">
          <p class="note" id="code-h">Eight characters, written inside your invitation. The QR mark only brings you to this page.</p>
          <p class="err" id="code-e" role="alert"></p></div>
        <div id="auth" hidden>
          ${field('aemail', 'Email you applied with', 'type="email" autocomplete="email"')}
          ${field('apass', 'Password', 'type="password" autocomplete="current-password"')}
        </div>
        <div class="actions"><button class="btn" type="submit">Present invitation</button></div>
      </form>
      <p class="links"><a href="#/sign-in">Member sign-in</a><a href="#/support">Help with an invitation</a></p>
    </section>`;
    const f = $('#f', view), code = $('#code', view), auth = $('#auth', view);
    let pending = null;
    f.addEventListener('submit', async (e) => {
      e.preventDefault(); setErr(view, 'code', '');
      if (Date.now() < holdUntil) return setErr(view, 'code', 'Too many attempts. Wait a moment and try again, or ask for help with your invitation.');
      if (pending) {
        const r = await store.openApplication(pending, $('#aemail', view).value, $('#apass', view).value);
        if (!ok()) return;
        if (!r.ok) return setErr(view, 'apass', 'That email and password do not match the application on this invitation.');
        return app.go(resume(r.inv));
      }
      const r = store.validate(code.value);
      if (!r.ok) {
        app.sfx('deny');
        if (r.reason === 'unknown' && ++tries >= 5) { tries = 0; holdUntil = Date.now() + 30000; }
        return setErr(view, 'code', {
          unknown: 'That code is not on record. Check the eight characters and try again.',
          revoked: 'This invitation has been withdrawn. If you think that is a mistake, contact support.',
          used: 'This invitation has already opened an account. Use member sign-in instead.',
        }[r.reason]);
      }
      tries = 0;
      if (r.needsAuth) { pending = r.code; auth.hidden = false; code.readOnly = true; $('#code-h', view).textContent = 'This invitation already has an application. Sign in to it to continue.'; $('#aemail', view).focus(); return; }
      app.sfx('key'); app.proto();
      if (r.locked || r.inv.state !== 'validated') return app.go(resume(r.inv));
      recognised(r.inv, true);
    });
  };
  const recognised = (inv, fresh) => {
    view.innerHTML = `<section class="front">
      <h1 tabindex="-1">${fresh ? 'Invitation recognised.' : 'Your invitation is open.'}</h1>
      <p class="lead">Keep it in your hand. One of the two doors ahead carries the seal pressed into its wax.</p>
      <div class="actions"><a class="btn" href="#/alley">Go to the doors</a><button class="link" type="button" id="other">Use a different invitation</button></div>
    </section>`;
    $('#other', view).addEventListener('click', () => { store.leaveInvitation(); app.proto(); app.go('#/'); });
    if (fresh) { $('h1', view).focus(); app.announce('Invitation recognised. The lamps over the two doors come on.'); }
    lit = 1;
  };
  if (inv && ['issued', 'validated'].includes(inv.state) && !store.lock()) recognised(inv, false);
  else if (inv) { view.innerHTML = `<section class="front"><h1>Your invitation is open.</h1><div class="actions"><a class="btn" href="${resume(inv)}">Continue</a><button class="link" type="button" id="other">Use a different invitation</button></div></section>`; $('#other', view).addEventListener('click', () => { store.leaveInvitation(); app.proto(); app.go('#/'); }); }
  else ask();
  return {
    title: 'Invitation',
    tick: (t, dt, mo) => {
      lamps = mo ? lamps + (lit - lamps) * (1 - Math.pow(0.06, dt)) : lit;
      const strike = mo && lit === 1 && lamps < 0.9 ? 0.72 + 0.28 * Math.sign(Math.sin(t * 41)) : 1;        // the tubes catch as they strike
      app.lamp('lampL', lamps * strike); app.lamp('lampR', lamps * strike * (mo && lit === 1 && lamps < 0.7 ? 0.5 : 1));
      app.lamp('tube', mo ? flicker(t) : 1); app.soundTick(t);
    },
    leave: () => { scrim(0); },
  };
}

// ---------------------------------------------------------------------------------------------- A02 to A04 the alley
export async function alley(app) {
  const inv = store.invitation(), ok = app.live(), S = app.stage, W3 = app.world, view = app.view, marks = app.marks;
  if (!['issued', 'validated'].includes(inv.state)) { app.go(resume(inv)); return null; }
  const doors = store.doors();
  app.amb('city');
  if (W3) W3.setDoors(doors);
  const W = await app.scene({ layout: 'full', theme: 'outside', shot: 'alley', frame: 'wide', tiles: ['medL_' + doors.L, 'medR_' + doors.R], view: farView(app), dur: 2.8, setup: alleyLight });
  if (!ok()) return null;
  const tiled = (k) => !!(W3 || (W && W.info.tiles && W.info.tiles['med' + k + '_' + doors[k]]));
  if (app.motion()) [0.1, 0.62, 1.15, 1.7].forEach((d, i) => app.sfx('step', true, 1 - i * 0.12, d));
  let mode = store.lock() ? 'denied' : 'choose', chosen = null, busy = false;
  const name = { L: 'left', R: 'right' };
  marks.innerHTML = ['L', 'R'].map((k) => `<button class="door" type="button" data-side="${k}" aria-label="The ${name[k]} door. Its insignia: ${DESC[doors[k]]}."><span class="door-name" aria-hidden="true">${name[k]} door</span></button><div class="door-plate${tiled(k) ? '' : ' show'}" data-plate="${k}" aria-hidden="true">${glyph(doors[k])}</div>`).join('');
  view.innerHTML = `<h1 class="sr">The alley. Two doors, each with an insignia.</h1><div class="sheet" id="sheet"></div>`;
  const sheet = $('#sheet', view);
  const paint = (focus) => {
    $$('.door, .door-plate', marks).forEach((b) => { b.hidden = mode !== 'choose'; });
    if (mode === 'choose') {
      sheet.className = 'sheet wide';
      sheet.innerHTML = `<div><h2>One of these doors carries the seal on your invitation.</h2><p class="note">Hold the card up to them, then choose.</p></div>
        <div class="actions door-pick"><button class="btn ghost" type="button" data-pick="L">Left door</button><button class="btn ghost" type="button" data-pick="R">Right door</button></div>
        <details class="seal-help"><summary>My seal is hard to make out</summary>
          <p class="note">The seal recorded for this invitation shows ${DESC[inv.symbol]}. If the card is damaged, a person will replace it: <a href="#/support">contact support</a>.</p></details>`;
      $$('[data-pick]', sheet).forEach((b) => b.addEventListener('click', () => pick(b.dataset.pick)));
    } else if (mode === 'confirm') {
      sheet.className = 'sheet wide';
      sheet.innerHTML = `<div><h2 tabindex="-1">The ${name[chosen]} door.</h2><p class="note">Its insignia: ${DESC[doors[chosen]]}. Opening a door is final for this visit. A door that is not yours stays shut, and the invitation rests for 24 hours.</p></div>
        <div class="actions"><button class="btn" type="button" id="open">Open this door</button><button class="btn ghost" type="button" id="backb">Step back</button></div>`;
      $('#open', sheet).addEventListener('click', confirm); $('#backb', sheet).addEventListener('click', back);
    } else {
      sheet.className = 'sheet wide';
      sheet.innerHTML = `<div><h2 tabindex="-1">That door does not open for this invitation.</h2><p class="note">Try again after ${fmtTime(store.lock())}, when the doors may have traded places. Nothing else about your invitation has changed.</p>
        <p class="note">If your seal is damaged or hard to make out, a person will help: <a href="#/support">contact support</a>.</p></div>`;
    }
    if (focus) { const h = $('h2', sheet); if (h) h.focus(); }
  };
  const toClose = async (side, fwd) => {
    if (W3) {                                        // walk up to the door, or step back from it
      if (fwd) [0, 0.5, 1.0].forEach((dl) => app.sfx('step', true, 0.9, dl));
      await app.scene({ layout: 'full', theme: 'outside', shot: fwd ? 'door' : 'alley', arg: side, dur: 1.7 });
      return;
    }
    const C = await S.load('close' + side).catch(() => null);
    if (C) await C.setTiles(['med' + side + '_' + doors[side]], 0);
    if (!ok() || !C || !W) return;
    const far = farView(app)(S), near = closeView(app)(S), d = W.info.rects['door' + side];
    const into = app.fit(S, d, 1.7), nearOut = { ...near, zoom: near.zoom * 0.7 };
    if (fwd) { S.B = C; [0, 0.5, 1.0].forEach((dl) => app.sfx('step', true, 0.9, dl)); } else { S.B = W; }
    await app.tween(1.5, (k) => {
      const q = fwd ? k : 1 - k, m = Math.min(1, Math.max(0, (q - 0.3) / 0.55));
      const vw = lerpView(far, into, q), vc = lerpView(nearOut, near, q);
      if (fwd) { S.viewA = vw; S.viewB = vc; S.mix = m; } else { S.viewA = vc; S.viewB = vw; S.mix = 1 - m; }
    });
    if (!ok()) return;
    S.A = fwd ? C : W; S.viewA = fwd ? near : far; S.B = null; S.mix = 0;
  };
  const pick = async (side) => {
    if (busy || mode !== 'choose') return; busy = true; chosen = side; mode = 'confirm';
    $$('.door, .door-plate', marks).forEach((b) => { b.hidden = true; }); sheet.innerHTML = '';
    await toClose(side, true); if (!ok()) return;
    paint(true); busy = false;
  };
  const back = async () => {
    if (busy) return; busy = true; sheet.innerHTML = '';
    await toClose(chosen, false); if (!ok()) return;
    mode = store.lock() ? 'denied' : 'choose'; paint(false); busy = false;
    if (mode === 'choose') { const b = $(`.door[data-side=${chosen}]`, marks); if (b) b.focus(); } else { const h = $('h2', sheet); if (h) h.focus(); }
  };
  const confirm = async () => {
    if (busy) return; busy = true; sheet.innerHTML = '';
    const r = store.chooseDoor(chosen); app.proto();
    if (r.ok) {
      app.sfx('lock'); app.announce('The lock releases.');
      await app.beat(1.7); if (!ok()) return;
      return app.go('#/keeper');
    }
    app.sfx('deny'); app.announce('The door stays shut.');
    await app.tween(1.4, (k) => { app.lamp('lamp' + chosen, k > 0.85 ? 0.06 : (Math.sin(k * 60) > 0 ? 1 : 0.2) * (1 - k * 0.6)); }, ease.lin);
    if (!ok()) return;
    busy = false; await back();
  };
  marks.addEventListener('click', (e) => { const b = e.target.closest('.door'); if (b) pick(b.dataset.side); });
  if (mode === 'denied') { app.lamp('lampL', 0.25); app.lamp('lampR', 0.25); }
  paint(false);
  const place = () => {
    if (!W || mode !== 'choose') return;
    for (const k of ['L', 'R']) { app.place($(`.door[data-side=${k}]`, marks), 'door' + k); app.place($(`[data-plate=${k}]`, marks), 'med' + k, 0.14); }
  };
  return {
    title: 'The alley',
    tick: (t, dt, mo) => {
      const f = mo ? flicker(t) : 1; app.lamp('tube', f); app.buzz(mo ? 1 - f : 0); app.soundTick(t); if (!W3) place();
      if (mode === 'denied' && !busy && !store.lock()) { store.clearLock(); app.go('#/alley'); }
    },
    after: place,                                    // the buttons follow the doors once the camera has moved
    leave: () => app.buzz(0),
  };
}

// ---------------------------------------------------------------------------------------------- A05 the Keeper
// her recorded lines (assets/voice/keeper-NN.mp3), by the caption they belong to. Captions always show; the voice
// only plays while sound is on.
const VOICE = {
  'There you are.': '01', 'I wondered when you would arrive.': '02', 'You have brought something with you.': '03',
  'Tell me, dear. If nothing stood in your way, what would you pursue?': '04', 'Then you have come at an interesting time.': '05',
  'Most people spend their lives asking what is possible. Very few ask what they would do if it were.': '06',
  'Very well. Nothing you become will erase everything you have been.': '07',
};
const STOP = Symbol('stop');
export async function keeper(app) {
  const inv = store.invitation(), ok = app.live(), S = app.stage, W3 = app.world, K = app.keeper, view = app.view, marks = app.marks;
  if (inv.state !== 'door') { app.go(resume(inv)); return null; }
  const side = inv.doorSide || 'L', sym = inv.symbol;
  app.amb('city');
  if (W3) W3.setDoors(store.doors());
  const C = await app.scene({ layout: 'full', theme: 'outside', shot: 'door', arg: side, frame: 'close' + side, tiles: ['med' + side + '_' + sym], slit: 0, view: closeView(app), dur: 1.2, setup: alleyLight });
  if (!ok()) return null;
  const D = W3 ? W3.doors[side] : null;
  const setSlit = (v) => { if (D) D.slit = v; else if (C) C.setSlit(v); };
  if (W3 && K) { K.place(0, 0, 400, 100); W3.setKeeper(document.getElementById('keeper'), side); }
  view.innerHTML = `<h1 class="sr">The Keeper</h1>
    <div class="keeper-ui"><p class="caption off" id="cap" aria-live="polite"></p>
      <div class="choices" id="choices" role="group" aria-label="Your answer. Optional; there is no right one." hidden>
        ${[['discover', 'To discover'], ['create', 'To create'], ['become', 'To become'], ['unknown', 'I do not know yet']].map(([k, t]) => `<button class="chip" type="button" data-a="${k}">${t}</button>`).join('')}
      </div></div>
    <div class="keeper-ctl"><button class="btn ghost" type="button" id="next">Continue</button><button class="link small" type="button" id="skip">Skip to the application</button></div>`;
  const cap = $('#cap', view), choices = $('#choices', view), next = $('#next', view);
  const open = !W3 && C ? C.info.rects['open' + side] : [[0.39, 0.63], [0.61, 0.69]];
  const slitView = (S) => {
    const w = Math.abs(open[1][0] - open[0][0]), zoom = (app.narrow() ? 0.88 : 0.46) * S.span[0] / w;
    return { cx: (open[0][0] + open[1][0]) / 2, cy: (open[0][1] + open[1][1]) / 2 + 0.1 * S.span[1] / zoom, zoom };
  };
  const lvl = { open: 0, warm: 0, roots: 0 };
  app.sfx('preload', Object.values(VOICE).map((id) => `assets/voice/keeper-${id}.mp3`));
  let fb = null;
  if (!K) { marks.innerHTML = '<div class="keeper-fallback"></div>'; fb = marks.firstChild; }
  let adv = null, done = false;
  const step = async (p) => { await p; if (!ok() || done) throw STOP; };
  const hold = (sec) => new Promise((res) => { const t = setTimeout(() => { adv = null; res(); }, sec * 1000); adv = () => { clearTimeout(t); adv = null; res(); }; });
  next.addEventListener('click', () => { if (adv) adv(); });
  const say = async (text, wait = true) => {
    cap.classList.add('off'); await step(app.wait(0.3));
    cap.textContent = text; cap.classList.remove('off');
    app.sfx('holo', 0.5); app.tween(0.6, (k) => { lvl.warm = Math.max(lvl.warm, k); });
    let spoken = 0; await step(app.voice(VOICE[text]).then((sec) => { spoken = sec; }));   // her voice, when sound is on
    if (wait) { await step(hold(Math.max(2.4, text.length * 0.075, spoken + 0.5))); app.sfx('holo', 0.12); app.tween(0.9, (k) => { lvl.warm = 1 - k * 0.85; }); }
  };
  const finish = async (fast) => {
    if (done) return; done = true; if (adv) adv();
    cap.classList.add('off'); choices.hidden = true; app.sfx('holo', 0); app.hush();
    if (!fast) {
      await app.tween(0.8, (k) => { lvl.open = 1 - k; });
      app.sfx('slide'); await app.tween(0.7, (k) => setSlit(1 - k), ease.lin);
    }
    if (ok()) app.go('#/apply');
  };
  $('#skip', view).addEventListener('click', () => { store.keeperAnswer(inv.pursuit || null); finish(true); });
  choices.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b || done) return;
    store.keeperAnswer(b.dataset.a); choices.hidden = true; next.hidden = false; app.sfx('holo', 0.12);
    try {
      await say(b.dataset.a === 'unknown' ? 'Then you have come at an interesting time.' : 'Most people spend their lives asking what is possible. Very few ask what they would do if it were.');
      await say('Very well. Nothing you become will erase everything you have been.');
      done = false; await finish(false);
    } catch (e2) { if (e2 !== STOP) throw e2; }
  });
  (async () => {
    try {
      await step(app.beat(1.3));
      app.sfx('slide'); await step(app.tween(0.8, (k) => setSlit(k), ease.lin));
      document.body.classList.add('keeper-on');
      app.tween(1.8, (k) => { lvl.open = k; });
      if (W3) await step(app.scene({ layout: 'full', theme: 'outside', shot: 'slit', arg: side, dur: 2.8 }));
      else { const v0 = { ...S.viewA }, v1 = slitView(S); await step(app.tween(2.6, (k) => { S.viewA = lerpView(v0, v1, k); })); }
      await step(app.beat(0.6));
      await say('There you are.');
      await step(app.beat(0.9));
      await say('I wondered when you would arrive.');
      if (K) K.gazeT = [0, 0.95];
      await say('You have brought something with you.');
      if (K) K.gazeT = [0, 0];
      cap.classList.add('off');
      await step(app.tween(1.3, (k) => { lvl.roots = k; })); await step(app.beat(0.9)); await step(app.tween(1.1, (k) => { lvl.roots = 1 - k; }));
      await say('Tell me, dear. If nothing stood in your way, what would you pursue?', false);
      choices.hidden = false; next.hidden = true;
    } catch (e) { if (e !== STOP) throw e; }
  })();
  return {
    title: 'The Keeper', noFocus: true,
    tick: (t, dt, mo) => {
      const bx = app.box('slit' + side) || { x: innerWidth * 0.3, y: innerHeight * 0.45, w: innerWidth * 0.4, h: 40 }, { x, y, w, h } = bx;
      if (K) { K.open = lvl.open; K.warm = lvl.warm; K.roots = lvl.roots; K.glitch = mo && Math.sin(t * 0.37) > 0.995 ? 0.5 : 0; }
      if (fb) { Object.assign(fb.style, { transform: `translate(${x}px, ${y}px)`, width: w + 'px', height: h + 'px', opacity: lvl.open }); }
      const holo = lvl.open * (0.5 + 0.6 * lvl.warm) * (mo ? 0.94 + 0.06 * Math.sin(t * 23) : 1);
      if (W3) {                                      // her light falls on the door around the slit, and on the rain
        const a = W3.anchors['slit' + side].rect, c = W3.pt('alley', [(a[0][0] + a[1][0]) / 2, a[0][1] - 0.22, (a[0][2] + a[1][2]) / 2]);
        W3.light(1, c, [0.5 * holo + 0.5 * holo * lvl.warm, 0.8 * holo, 1.1 * holo - 0.3 * holo * lvl.warm], 0.05);
      }
      app.lamp('tube', mo ? flicker(t) : 1);
      view.style.setProperty('--cap-top', Math.round(Math.min(innerHeight - 250, y + h + Math.max(34, h * 0.5))) + 'px');
      app.soundTick(t);
    },
    leave: () => { done = true; if (adv) adv(); app.sfx('holo', 0); app.hush(); document.body.classList.remove('keeper-on'); if (K) K.gazeT = [0, 0]; if (W3) { W3.setKeeper(null); W3.light(1, null); if (D) D.slit = 0; } },
  };
}

// ---------------------------------------------------------------------------------------------- A06 application
const doorPane = async (app, inv) => app.scene({
  layout: 'pane', theme: 'outside', shot: 'doorpane', arg: inv.doorSide || 'L', dur: 1.6, frame: 'close' + (inv.doorSide || 'L'), need: 0.8,
  tiles: ['med' + (inv.doorSide || 'L') + '_' + inv.symbol], slit: 0,
  view: doorView(app), setup: (S) => { S.rain = 0.5; S.vig = 0.5; S.expo = 0.8; S.weights.holo = 0; },
});
export async function apply(app) {
  const inv = store.invitation(), ok = app.live(), view = app.view;
  if (inv.state !== 'keeper') { app.go(resume(inv)); return null; }
  app.amb('city');
  if (app.world) app.world.setDoors(store.doors());
  await doorPane(app, inv); if (!ok()) return null;
  view.innerHTML = `<div class="page">
    <header><h1 class="title">Application</h1><p class="lead">An invitation is an opportunity to apply. A person reviews every application, and admission is not automatic.</p></header>
    <form id="f" novalidate>
      ${field('name', 'Full name', 'type="text" autocomplete="name" required')}
      ${field('email', 'Email', 'type="email" autocomplete="email" required', 'We write to this address about your application. Nothing else is sent to it.')}
      <fieldset><legend>Eligibility</legend>
        <label class="check"><input type="checkbox" name="age"><span>I am at or over the age of majority where I live.</span></label>
        <label class="check"><input type="checkbox" name="region"><span>I live in Canada.<span class="note">Membership is offered in Canada only for now.</span></span></label>
        <p class="err" id="elig-e" role="alert"></p>
      </fieldset>
      ${field('password', 'Choose a password', 'type="password" autocomplete="new-password" required minlength="10"', 'At least 10 characters. Your member number will never work as a password.')}
      <label class="check"><input type="checkbox" name="passkey"><span>Offer me a passkey once I am admitted.<span class="note">Optional. A passkey replaces the password on devices that support one.</span></span></label>
      <div class="field"><label for="interests">What would you like to explore? Optional</label><textarea id="interests" maxlength="400"></textarea>
        <p class="note">Context only. It is not scored, and leaving it empty changes nothing. Please leave out health information.</p></div>
      <fieldset><legend>Consent</legend>
        <label class="check"><input type="checkbox" name="terms"><span>I have read the privacy notice below and agree to the application terms.</span></label>
        <label class="check"><input type="checkbox" name="compass"><span>If I am admitted, keep my Compass choices on my record.<span class="note">Optional and separate. You can change it at any time.</span></span></label>
        <p class="err" id="terms-e" role="alert"></p>
      </fieldset>
      <details class="more"><summary>Privacy notice for applicants</summary><div>
        <p>We use your name and email to review this application and to write to you about it. Your answer to the Keeper, if you gave one, is kept with the application and is not used in the review.</p>
        <p>We do not ask for a mailing address here. We ask only when something is being sent to you.</p>
        <p>You can ask to see, correct or delete what we hold at any time through Support. Applications that are not approved are deleted after [retention period, to be confirmed].</p></div></details>
      <div class="actions"><button class="btn" type="submit">Submit application</button><a class="link" href="#/support">Ask a question first</a></div>
    </form></div>`;
  const f = $('#f', view);
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = (n) => f.elements[n];
    const email = v('email').value.trim();
    const good = [
      setErr(view, 'name', v('name').value.trim().length < 2 ? 'Enter your full name.' : ''),
      setErr(view, 'email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? '' : 'Enter an email address we can write to.'),
      setErr(view, 'password', v('password').value.length < 10 ? 'Use at least 10 characters.' : /^\d[\d\s]*$/.test(v('password').value) ? 'A password made only of digits is too easy to guess.' : ''),
    ];
    $('#elig-e', view).textContent = v('age').checked && v('region').checked ? '' : 'Both eligibility statements must be true to apply.';
    $('#terms-e', view).textContent = v('terms').checked ? '' : 'Please read the privacy notice and agree to the application terms.';
    if (good.includes(false) || $('#elig-e', view).textContent || $('#terms-e', view).textContent) { const bad = $('[aria-invalid=true]', f) || $('.err:not(:empty)', f); if (bad) bad.focus ? bad.focus() : bad.scrollIntoView(); return; }
    const r = await store.apply({ name: v('name').value, email, password: v('password').value, passkey: v('passkey').checked, interests: $('#interests', view).value.trim(), consents: { terms: true, compass: v('compass').checked, at: Date.now() } });
    if (r.ok && ok()) { app.proto(); app.go('#/status'); }
  });
  return { title: 'Application', tick: (t) => app.soundTick(t) };
}

// ---------------------------------------------------------------------------------------------- A07 review status
export async function status(app) {
  const inv = store.invitation(), a = store.application(), ok = app.live(), view = app.view;
  if (!a || !['applied', 'approved'].includes(inv.state)) { app.go(resume(inv)); return null; }
  if (a.status === 'approved') { app.go('#/offer'); return null; }
  app.amb('city');
  if (app.world) app.world.setDoors(store.doors());
  await doorPane(app, inv); if (!ok()) return null;
  const declined = a.status === 'declined';
  view.innerHTML = `<div class="page">
    <header><p class="label">Reference ${a.ref}</p>
      <h1 class="title">${declined ? 'Not approved at this time.' : 'Your application is with a reviewer.'}</h1>
      <p class="lead">${declined
    ? 'The reviewer could not confirm one or more of the eligibility criteria. It is a decision about this application, not about you.'
    : 'Reviews are done by people, against written standards. We aim to answer within about 14 days. That is a working target, not a waiting period.'}</p></header>
    ${declined ? `<p class="notice">If something we relied on is wrong, say so and a different reviewer will look again. <a href="#/support">Ask for a correction</a>.</p>` : ''}
    <section><h2>Record</h2><ul class="rows">${a.updates.slice().reverse().map((u) => `<li><div class="row plain"><span class="t" style="font-size:var(--s3)">${esc(u.what)}</span><span class="m">${fmtTime(u.t)}</span></div></li>`).join('')}</ul>
      <p class="note" style="margin-top:14px">We will write to ${esc(a.email)} when there is a decision. You can come back to this page with your invitation code and the password you chose.</p></section>
    <section><h2>Contact email</h2>
      <form id="cf" novalidate>${field('nemail', 'Change the address we write to', `type="email" autocomplete="email" value="${esc(a.email)}"`)}
        <div class="actions"><button class="btn ghost" type="submit">Update email</button><span class="note" id="cf-ok" role="status"></span></div></form></section>
    <section><h2>Questions</h2><p>A person answers support requests, usually within two business days. <a href="#/support">Contact support</a>.</p>
      <p class="note">Your details are used only for this review. You can ask to see, correct or delete them at any time.</p></section>
  </div>`;
  $('#cf', view).addEventListener('submit', (e) => {
    e.preventDefault(); const v = $('#nemail', view).value.trim();
    if (!setErr(view, 'nemail', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? '' : 'Enter an email address we can write to.')) return;
    store.updateContact(v); $('#cf-ok', view).textContent = 'Updated.';
  });
  return { title: 'Review status', tick: (t) => app.soundTick(t) };
}

// ---------------------------------------------------------------------------------------------- A08 member acceptance
// The offer is made at the door the invitation opened. Where the world is live the door answers: the rain stops in
// the air while the offer is read, each agreement draws one of the door's two bolts, and accepting strikes the
// member's number into the plate under the seal. Enter then lets the rain fall again and the film opens the door.
// Without the world (stills) the same offer is a plain page beside the door's picture.
const offerFacts = (inv) => `<dl class="kv">
      <dt>Generation</dt><dd>I · The First Record</dd>
      <dt>Insignia</dt><dd><span style="font-size:28px">${glyph(inv.symbol)}</span> Permanent. It is the seal on your invitation; its name is kept in your Archive.</dd>
      <dt>Member number</dt><dd>Nine digits, issued when you accept.<span class="note">It identifies you. It is never a password.</span></dd>
      <dt>Metal card</dt><dd>Follows a first qualifying order.<span class="note">A record of admission, not a key. Your account never depends on it.</span></dd>
      <dt>Status</dt><dd>Yours alone. It cannot be sold, exchanged or passed on.</dd></dl>`;
const offerRights = () => `<p class="note">Proposed. Each one still needs financial and legal sign-off before it becomes a commitment.</p>
      <div class="scrollx"><table class="t"><thead><tr><th>Right</th><th>Scope</th><th>Boundary</th></tr></thead><tbody>${RIGHTS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>`;
const offerForm = () => `<form id="f" novalidate>
        <label class="check"><input type="checkbox" name="t1"><span>I accept the membership terms.<span class="note">[Membership terms, to be supplied by PR6.]</span></span></label>
        <label class="check"><input type="checkbox" name="t2"><span>I understand that membership promises a standard of service and information, not an outcome.</span></label>
        <p class="err" id="acc-e" role="alert"></p>
        <div class="actions"><button class="btn" type="submit">Accept membership</button></div>
        <p class="note" style="margin-top:14px">You can also let the offer lapse. Nothing is charged either way.</p>
      </form>`;
const offerNote = 'It identifies you in correspondence and on your card. It is not a credential: you sign in with your email and your password, and you can recover your account without the card.';

export async function offer(app) {
  const inv = store.invitation(), a = store.application(), ok = app.live(), view = app.view;
  if (!a || inv.state !== 'approved') { app.go(resume(inv)); return null; }
  const W3 = app.world, side = inv.doorSide || 'L';
  if (!W3) {
    app.amb('none');
    await doorPane(app, inv); if (!ok()) return null;         // the door the invitation opened; the card itself stays in the hand
    view.innerHTML = `<div class="page">
    <header><h1 class="title">You have been offered a place.</h1>
      <p class="lead">Generation I, The First Record. Two hundred places, never refilled. This offer is open until ${fmtDate(a.offerUntil)}.</p></header>
    <section><h2>What acceptance records</h2>${offerFacts(inv)}</section>
    <section><h2>Founding rights</h2>${offerRights()}</section>
    <section><h2>Acceptance</h2>${offerForm()}</section></div>`;
    $('#f', view).addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      if (!f.elements.t1.checked || !f.elements.t2.checked) { $('#acc-e', view).textContent = 'Both statements need your agreement to accept.'; return; }
      const m = store.acceptOffer(); if (!m) return;
      app.proto(); app.sfx('key');
      view.innerHTML = `<div class="page"><header><h1 class="title" tabindex="-1">Welcome, ${esc(m.name.split(/\s+/)[0])}.</h1><p class="note">Admitted ${fmtDate(m.admitted)}.</p></header>
      <p class="lead">Your member number</p><p class="display mono" style="margin:10px 0 18px;font-size:clamp(34px,5vw,64px)">${fmtId(m.id)}</p>
      <p class="note" style="max-width:52ch">${offerNote}</p>
      <div class="actions"><a class="btn" href="#/passage">Enter</a></div></div>`;
      $('h1', view).focus(); app.announce('Membership accepted.');
    });
    return { title: 'Offer of membership' };
  }
  // ---- the door answers
  app.doorHeld = true;
  W3.setDoors(store.doors());
  for (const d of ['L', 'R']) { W3.bolt(d, 0, 0, true); W3.bolt(d, 1, 0, true); W3.plate(d, ''); }
  app.amb('city');
  let held = false, kick = 0, done = false;
  await app.scene({ layout: 'full', theme: 'outside', shot: 'offer', arg: side, dur: 2.4 }); if (!ok()) return null;
  // the rain stops where it is, and the alley goes quiet
  held = true; W3.rainHold = 1; app.amb('none');
  view.innerHTML = `<div class="sheet wide offer" id="offer">
    <div><h1 tabindex="-1">You have been offered a place.</h1>
      <p class="note">Generation I, The First Record. Two hundred places, never refilled. This offer is open until ${fmtDate(a.offerUntil)}.</p></div>
    ${offerForm()}
    <details class="seal-help"><summary>What acceptance records</summary>${offerFacts(inv)}</details>
    <details class="seal-help"><summary>Founding rights</summary>${offerRights()}</details>
  </div>`;
  const sheet = $("#offer", view), f = $('#f', view);
  $$('input[type=checkbox]', f).forEach((box, i) => box.addEventListener('change', () => {
    // each agreement is a bolt: given, it draws back; taken back, it shoots home
    W3.bolt(side, i, box.checked ? 1 : 0); app.sfx('slide'); setTimeout(() => { if (ok()) app.sfx('lock'); }, 300);
    app.announce(box.checked ? `The ${i ? 'second' : 'first'} bolt draws back.` : `The ${i ? 'second' : 'first'} bolt shoots home.`);
    $('#acc-e', view).textContent = '';
  }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault(); if (done) return;
    if (!f.elements.t1.checked || !f.elements.t2.checked) { $('#acc-e', view).textContent = 'Both statements need your agreement to accept. The door has a bolt for each.'; return; }
    const m = store.acceptOffer(); if (!m) return;
    done = true; app.proto(); sheet.hidden = true;
    // the camera goes to the plate, and the number is struck into it one figure at a time
    const id = fmtId(m.id);
    await app.scene({ layout: 'full', theme: 'outside', shot: 'plate', arg: side, dur: 1.5 }); if (!ok()) return;
    if (app.motion()) {
      await app.wait(0.25);
      for (let i = 0; i < id.length; i++) {
        if (!ok()) return; if (id[i] === ' ') { await app.wait(0.16); continue; }
        W3.plate(side, id.slice(0, i + 1)); kick = 1; app.sfx('key'); await app.wait(0.15);
      }
      await app.wait(0.5); if (!ok()) return;
    }
    W3.plate(side, id);
    sheet.innerHTML = `<div><h1 tabindex="-1">Welcome, ${esc(m.name.split(/\s+/)[0])}.</h1>
      <p class="offer-id mono" aria-label="Your member number: ${id.split('').join(' ')}">${id}</p>
      <p class="note">Your member number, struck into your door on ${fmtDate(m.admitted)}. ${offerNote}</p></div>
      <div class="actions"><a class="btn" href="#/passage">Enter</a></div>`;
    sheet.hidden = false; $('h1', sheet).focus(); app.announce(`Membership accepted. Your member number is ${id.split('').join(' ')}.`);
  });
  $('h1', sheet).focus({ preventScroll: true });
  return {
    title: 'Offer of membership',
    tick: (t, dt, mo) => {
      // while the rain is held nothing flickers; a strike on the plate shakes the lamp above the door
      kick *= Math.pow(0.002, dt);
      app.lamp('tube', mo && !held ? flicker(t) : 1); app.lamp('lamp' + side, 1 + kick * 0.6);
      W3.cam.roll = mo ? kick * 0.0035 * Math.sin(t * 90) : 0;
      app.soundTick(t);
    },
    leave: () => { app.doorHeld = false; held = false; W3.rainHold = 0; W3.cam.roll = 0; app.lamp('lamp' + side, 1); },
  };
}

// ---------------------------------------------------------------------------------------------- returning member
export async function signIn(app) {
  const ok = app.live(), view = app.view;
  if (store.member()) { app.go('#/atrium'); return null; }
  app.amb('city');
  if (app.world) app.world.setDoors({ L: 'shen', R: 'ouroboros' });
  await app.scene({ layout: 'full', theme: 'outside', shot: 'front', frame: 'wide', tiles: ['medL_shen', 'medR_ouroboros'], view: frontView(app), dur: 1.4, setup: (S) => { alleyLight(S); S.expo = 0.5; S.vig = 0.9; S.rain = 0.7; } });
  if (!ok()) return null;
  scrim(1);
  view.innerHTML = `<section class="front">
    <h1>Welcome back.</h1>
    <form id="f" novalidate>
      ${field('email', 'Email', 'type="email" autocomplete="username"')}
      ${field('password', 'Password', 'type="password" autocomplete="current-password"')}
      <div class="actions"><button class="btn" type="submit">Sign in</button><button class="link small" type="button" id="forgot">Forgot password</button></div>
      <p class="note" id="msg" role="status" style="margin-top:14px">${store.hasMembers() ? '' : 'No member has been admitted in this browser yet. Start with an invitation.'}</p>
    </form>
    <p class="links"><a href="#/">I have an invitation</a><a href="#/support">Help</a></p>
  </section>`;
  $('#f', view).addEventListener('submit', async (e) => {
    e.preventDefault(); setErr(view, 'email', ''); setErr(view, 'password', '');
    const r = await store.signIn($('#email', view).value, $('#password', view).value);
    if (!ok()) return;
    if (!r.ok) return r.reason === 'member-number' ? setErr(view, 'email', 'A member number identifies you; it does not sign you in. Use the email you applied with.') : setErr(view, 'password', 'That email and password do not match a member.');
    let next = '#/atrium'; try { next = sessionStorage.getItem('pr6.next') || next; sessionStorage.removeItem('pr6.next'); } catch (e2) { /* ignore */ }
    app.go(next);
  });
  $('#forgot', view).addEventListener('click', () => { $('#msg', view).textContent = 'In the live service a recovery link goes to your verified email. The metal card is never needed to recover an account. In this prototype, use Reset in the prototype controls.'; });
  return { title: 'Sign in', tick: (t, dt, mo) => { app.lamp('tube', mo ? flicker(t) : 1); app.soundTick(t); }, leave: () => scrim(0) };
}
