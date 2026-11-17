/* PR6 v14 · the entry. A guest gets the gate (Object 0047, in the night register) and nothing else: the member bundle
   (app.js: the catalogue, the light, every page) is fetched only once the gate has been opened. A member (the class
   "in", set before first paint in index.html) goes straight to the bundle. The gate's last frame is black, and the
   store's first light comes up out of it (views.js home(): the dawn). */
import {Q, CLOCK, stepTweens} from './util.js';

const HTML = document.documentElement;
let app = null, appP = null, gate = null;
const loadApp = () => appP || (appP = import('./app.js').then(m => (app = m)));

if (HTML.classList.contains('in')) loadApp().then(m => m.boot());
else guest();

async function guest() {
  const key = (Q.get('key') || '').replace(/\s+/g, '').toUpperCase() === '0047RSRV';
  const {Gate} = await import('./gates/index.js'); gate = Gate;
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
/* the night still under the gate: Object 0047 rendered on black, the poster before the live object is lit */
function night() {
  const g = document.getElementById('gate'); if (!g || g.querySelector('.g-night')) return;
  g.insertAdjacentHTML('afterbegin', `<div class="g-night" aria-hidden="true"><img src="assets/img/night-m.webp" srcset="assets/img/night-m.webp 900w, assets/img/night-d.webp 1800w" sizes="100vw" alt="" decoding="async" fetchpriority="high"></div>`);
}
/* the gate's loop, until the member bundle takes over */
function loop(now) {
  if (app && app.running() && !(gate && gate.live)) return;
  requestAnimationFrame(loop);
  CLOCK.tick(now);
  if (document.hidden) return;
  stepTweens();
  if (gate && gate.live) gate.frame(CLOCK.now());
}
function hooks() {
  window.PR6V14 = {
    state: () => ({route: null, hash: location.hash, member: false, gate: gate && gate.live ? gate.state() : gate ? {kind: gate.kind, loading: !gate.impl} : null, loaded: !!app}),
    get gate() { return gate; }
  };
}
