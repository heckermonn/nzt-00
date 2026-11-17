/* PR6 v11 · the entry (from v9/js/main.js). The gate is in the night register: the `night` still (one glowing subject
   on black) is its poster, and stays faintly under the live object once it is lit. A guest gets the gate (Object 0047) and nothing else: the member bundle
   (app.js: the film, the catalogue, every page) is fetched only once the gate has been opened, behind its light.
   A member (the class "in", set before first paint in index.html) goes straight to the bundle.
   The gate's Chalk light clears onto the film's first frame. */
import {Q, CLOCK, stepTweens} from './util.js';

const HTML = document.documentElement;
let app = null, appP = null, gate = null;
const loadApp = () => appP || (appP = import('./app.js').then(m => (app = m)));

if (HTML.classList.contains('in')) loadApp().then(m => m.boot());
else guest();

async function guest() {
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
  night();
  requestAnimationFrame(loop);
  Gate.show({key});
}
/* the night still under the gate (never a blank box: its LQIP paints first) */
async function night() {
  try {
    const {IMG} = await import('./img.js'); await IMG.ready;
    const g = document.getElementById('gate'); if (!g || g.querySelector('.g-night')) return;
    g.insertAdjacentHTML('afterbegin', `<div class="g-night" aria-hidden="true">${IMG.pic('night', {eager: true, alt: '', cls: 'g-nim'})}</div>`);
    IMG.watch(g);
  } catch (e) { /* the gate stands on its own */ }
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
  window.PR6V11 = {
    state: () => ({route: null, hash: location.hash, member: false, gate: gate && gate.live ? gate.state() : gate ? {kind: gate.kind, loading: !gate.impl} : null, loaded: !!app}),
    get gate() { return gate; }
  };
}
