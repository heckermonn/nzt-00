/* PR6 v6 · the gate, chosen (from v5/js/gates/index.js). Guests see exactly one gate; main.js talks to it only through this interface:
     init(onEnter) → Promise<{art, light}>   load what the gate needs (onEnter = {load(), prepare(lightHex), go(lightHex)})
     show({key})                             put the gate up (key: a valid ?key= arrived, so let them straight in)
     frame(now)                              called every animation frame while live
     live                                    true while the gate is on screen
     state()                                 a plain object for the test hooks
   The gate owns its markup (it writes it into #gate) and its success: it stores membership, calls onEnter.load() (the
   member bundle is fetched only now, behind the gate's light), then hands its last
   frame of light to onEnter.prepare(light) and onEnter.go(light), and the Index resolves out of that light (a frost that clears).
   Object 0047 (gates/object.js) is the gate; ?gate on its own forces the gate for a member. plain.js is the fallback.
   A future gate is one more module with the same five members, and one more line in KINDS. */
import {Q} from '../util.js';

/* v6 ships Object 0047 only; if three.js cannot load, the plain gate (gates/plain.js) stands in with the same code */
const KINDS = {object: () => import('./object.js'), plain: () => import('./plain.js')};
export const GATE_KIND = KINDS[(Q.get('gate') || '').toLowerCase()] ? Q.get('gate').toLowerCase() : 'object';

let impl = null, ready = null, onEnter = null;
function load(enter) {
  if (enter) onEnter = enter;
  if (!ready) ready = KINDS[GATE_KIND]().catch(e => { console.warn('[pr6] gate unavailable, the plain gate stands in', e); return KINDS.plain(); }).then(m => { impl = m.gate; return impl.init(onEnter); });
  return ready;
}
export const Gate = {
  kind: GATE_KIND,
  init: enter => load(enter),
  /* a member who exits mid-session never ran init: load the gate on first show */
  show(o = {}) { if (impl) impl.show(o); else load().then(() => impl.show(o)); },
  frame(now, noRender) { if (impl && impl.live) impl.frame(now, noRender); },
  get live() { return !!(impl && impl.live); },
  state: () => impl ? Object.assign({kind: GATE_KIND}, impl.state()) : {kind: GATE_KIND, loading: true},
  get impl() { return impl; }
};
