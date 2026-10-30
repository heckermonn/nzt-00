/* PR6 v6 · the entry. A guest gets the gate (Object 0047) and nothing else: the member bundle (app.js: the catalogue,
   the Index, the Dossier, Your Protocol, Field Club, the member pages) is fetched only once the gate has been opened,
   behind its light. A member (the class "in", set before first paint in index.html) goes straight to the bundle.
   Reused from v5/js/main.js; the Atlas is gone: the gate's Chalk light clears into the Index. */
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
  window.PR6V6 = {
    state: () => ({route: null, hash: location.hash, member: false, gate: gate && gate.live ? gate.state() : gate ? {kind: gate.kind, loading: !gate.impl} : null, loaded: !!app}),
    get gate() { return gate; }
  };
}
