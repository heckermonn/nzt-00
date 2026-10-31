/* P4CE v5 · the entry. A guest gets the gate and nothing else: the member bundle (app.js: the catalogue, the views,
   the product renders, the Atlas) is fetched only once the gate has been opened, behind its light. A member (the
   class "in", set before first paint in index.html) goes straight to the member bundle. */
import {Q, CLOCK, stepTweens} from './util.js';
import {Tone} from './tone.js';

const HTML = document.documentElement;
let app = null, appP = null, gate = null;
const loadApp = () => appP || (appP = import('./app.js').then(m => (app = m)));

if (HTML.classList.contains('in')) loadApp().then(m => m.boot());
else guest();

async function guest() {
  Tone.set('night');
  const key = (Q.get('key') || '').replace(/\s+/g, '').toUpperCase() === '0047RSRV';
  const {Gate} = await import('./gates/index.js'); gate = Gate;
  /* the gate calls load() the moment it is opened, then prepare(light) and go(light) when its light is complete */
  const ready = () => loadApp().then(m => m.fromGate());
  const enter = {
    load: ready,
    prepare(light) { ready().then(e => e.prepare(light)); },
    go(light) { ready().then(e => e.go(light)); }
  };
  hooks();
  await Gate.init(enter);
  requestAnimationFrame(loop);
  Gate.show({key});
}
/* the gate's loop, until the member bundle starts its own */
function loop(now) {
  if (app && app.running()) return;
  requestAnimationFrame(loop);
  CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  if (gate && gate.live) gate.frame(CLOCK.now());
}
/* test hooks while only the gate is loaded (app.js replaces them with the full set) */
function hooks() {
  window.P4V5 = {
    state: () => ({route: null, hash: location.hash, member: false, gate: gate && gate.live ? gate.state() : gate ? {kind: gate.kind, loading: !gate.impl} : null, clock: Math.round(CLOCK.now()), held: CLOCK.held, loaded: !!app}),
    hold: (on = true) => { CLOCK.held = on; return CLOCK.now(); },
    step: ms => {
      for (let t = 0; t < ms; t += 16) { const d = Math.min(16, ms - t); CLOCK.t += d; stepTweens(); if (gate && gate.live) gate.frame(CLOCK.now(), true); }
      if (gate && gate.live) gate.frame(CLOCK.now());
      return CLOCK.now();
    },
    get gate() { return gate; }
  };
}
