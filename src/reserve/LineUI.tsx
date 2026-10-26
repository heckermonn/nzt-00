import { useEffect, useRef, useState, type ReactNode } from 'react';
import { count, launch, useCart } from './cart';
import { COLLECTIONS } from './data';
import { LINE_K, SPEC, lh } from './hud';
import { BELT, END_X, LINE, STATIONS, U_END, arriveAt, itemX, nearest, readout, scrollToU, stationP, stepOf } from './line';
import { rv } from './state';

const pad = (n: number) => String(n).padStart(2, '0');

/** re-render on a value derived from the scene clock, only when that value changes */
function useLive<T>(read: () => T, same: (a: T, b: T) => boolean = Object.is) {
  const [v, setV] = useState(read);
  const last = useRef(v);
  useEffect(() => {
    let id = 0;
    const tick = () => { const n = read(); if (!same(n, last.current)) { last.current = n; setV(n); } id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return v;
}

/** the batch record for the station you are at: its steps, the one running, and live values */
function StationPanel() {
  const at = useLive(() => {
    const i = nearest(rv.u), p = stationP(i, rv.u), u0 = arriveAt(i);
    const near = rv.u > u0 - 0.45 && rv.u < u0 + 2.0;
    return near ? i * 10 + stepOf(STATIONS[i], p) : -1;
  });
  const vals = useRef<HTMLElement[]>([]);
  useEffect(() => {
    let id = 0;
    const tick = () => {
      const i = nearest(rv.u), rows = readout(STATIONS[i], stationP(i, rv.u));
      rows.forEach(([, v], k) => { const el = vals.current[k]; if (el && el.textContent !== v) el.textContent = v; });
      id = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);
  if (at < 0) return null;
  const i = Math.floor(at / 10), k = at % 10, st = STATIONS[i], c = COLLECTIONS[st.c];
  const rows = readout(st, stationP(i, rv.u));
  return (
    <section className="station" key={i}>
      <p className="station-head">Station {pad(i + 1)} / {pad(STATIONS.length)}</p>
      <h2><span className="station-n">{c.n}</span>{c.name}</h2>
      <p className="station-line">{c.line}</p>
      <ol className="steps">
        {st.steps.map(([, label], j) => <li key={label} data-state={j < k ? 'done' : j === k ? 'now' : 'next'}><span>{pad(j + 1)}</span>{label}</li>)}
      </ol>
      <dl className="cells-v">
        {rows.map(([key], j) => <div className="cell" key={key}><dt>{key}</dt><dd ref={(el) => { if (el) vals.current[j] = el; }} /></div>)}
      </dl>
      <button type="button" className="text dossier-link" onClick={() => useCart.getState().setDossier(st.c)}>Read the dossier</button>
    </section>
  );
}

/** a tape of the line in metres, sliding as you scroll; station marks jump you there */
function LineTape() {
  const len = LINE.x1 - LINE.x0;
  const go = (u: number) => scrollToU(u, !rv.reduce);
  return (
    <div className="tape line-tape" aria-hidden="true">
      <div className="tape-strip" ref={(el) => { lh.tape = el; }} style={{ width: len * LINE_K }}>
        {STATIONS.map((s, i) => (
          <button key={i} type="button" tabIndex={-1} className="tape-mark" style={{ left: (s.x - LINE.x0) * LINE_K }} onClick={() => go(arriveAt(i) + 1)}>{COLLECTIONS[s.c].n}</button>
        ))}
        <button type="button" tabIndex={-1} className="tape-mark" style={{ left: (END_X - LINE.x0) * LINE_K }} onClick={() => go(U_END)}>End</button>
      </div>
    </div>
  );
}

/** the protocol tray: a row of wells that fill as products land, and a count */
function Tray() {
  const items = useCart((s) => s.items), landed = useCart((s) => s.landed), setOpen = useCart((s) => s.setOpen);
  const n = count(items);
  const [bump, setBump] = useState(false);
  useEffect(() => { if (!landed) return; setBump(true); const t = setTimeout(() => setBump(false), 420); return () => clearTimeout(t); }, [landed]);
  return (
    <button type="button" className="tray" ref={(el) => { lh.tray = el; }} data-bump={bump || undefined} onClick={() => setOpen(true)} aria-label={`Your protocol, ${n} ${n === 1 ? 'item' : 'items'}`}>
      <span className="tray-head">Your protocol</span>
      <span className="wells" aria-hidden="true">{Array.from({ length: 6 }, (_, k) => <i key={k} data-full={k < n || undefined} />)}</span>
      <span className="tray-n">{pad(n)}</span>
    </button>
  );
}

/** a product's dossier: what it is, as described, and a way to add it */
function Dossier() {
  const c = useCart((s) => s.dossier), setDossier = useCart((s) => s.setDossier);
  useEffect(() => {
    if (c < 0) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDossier(-1); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [c, setDossier]);
  if (c < 0) return null;
  const col = COLLECTIONS[c], spec = SPEC[col.form], i = STATIONS.findIndex((s) => s.c === c);
  const add = () => {
    const st = STATIONS[i], p = stationP(i, rv.u);
    launch(c, [st.x + itemX(p), BELT, 0]);
    setDossier(-1);
  };
  return (
    <aside className="sheet" role="dialog" aria-labelledby="dossier-title">
      <p className="station-head">The Dossier · {col.n}</p>
      <h2 id="dossier-title">{col.name}</h2>
      <p className="station-line">{col.line}</p>
      <dl className="cells-v">
        <Row k="Format" v={spec.format} /><Row k="Fill" v={spec.fill} /><Row k="Height" v={`${spec.mm} mm`} />
      </dl>
      <p className="note">Placeholder details until the lineup is confirmed.</p>
      <div className="sheet-actions">
        <button type="button" className="key" onClick={add}>Add to protocol</button>
        <button type="button" className="text" onClick={() => setDossier(-1)}>Close</button>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="cell"><dt>{k}</dt><dd>{v}</dd></div>;
}

/** the protocol drawer: what you have pulled off the line */
function Drawer() {
  const open = useCart((s) => s.open), items = useCart((s) => s.items), setOpen = useCart((s) => s.setOpen), setQty = useCart((s) => s.setQty);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [open, setOpen]);
  if (!open) return null;
  return (
    <aside className="sheet" role="dialog" aria-labelledby="protocol-title">
      <p className="station-head">Dispatch record</p>
      <h2 id="protocol-title">Your protocol</h2>
      {items.length === 0 ? <p className="station-line">Nothing yet. Add a product as it comes off the line.</p> : (
        <ul className="lines">
          {items.map(({ c, qty }) => (
            <li key={c}>
              <span className="mono">{COLLECTIONS[c].n}</span><span className="line-name">{COLLECTIONS[c].name}</span>
              <span className="qty">
                <button type="button" onClick={() => setQty(c, qty - 1)} aria-label={`One fewer ${COLLECTIONS[c].name}`}>−</button>
                <span className="mono">{pad(qty)}</span>
                <button type="button" onClick={() => setQty(c, qty + 1)} aria-label={`One more ${COLLECTIONS[c].name}`}>+</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="note">Checkout opens once commerce is connected.</p>
      <div className="sheet-actions"><button type="button" className="text" onClick={() => setOpen(false)}>Close</button></div>
    </aside>
  );
}

/** the add button and crop marks the scene places on the finished product */
function AddOnLine() {
  const add = () => { const i = lh.ready; if (i >= 0) launch(STATIONS[i].c, [...lh.from]); };
  return (
    <>
      <svg className="measure crops" ref={(el) => { lh.frame = el; }} aria-hidden="true">
        <path className="m-line" ref={(el) => { lh.crops = el; }} />
        <text className="m-tag" ref={(el) => { lh.tag = el; }} />
      </svg>
      <button type="button" className="add" ref={(el) => { lh.add = el; }} onClick={add} style={{ visibility: 'hidden' }}>
        <span aria-hidden="true">+</span> Add
      </button>
    </>
  );
}

/** the first screen and the last: how to start, and what you leave with */
function Ends() {
  const where = useLive(() => (rv.u < 0.3 ? 'start' : rv.u > U_END - 0.35 ? 'end' : ''));
  const n = count(useCart((s) => s.items)), setOpen = useCart((s) => s.setOpen);
  if (where === 'start') return <p className="cue mono">Scroll to run the line</p>;
  if (where === 'end') return (
    <section className="end">
      <p className="station-head">End of line</p>
      <h2>{n ? `${pad(n)} in your protocol` : 'Nothing taken off the line'}</h2>
      <button type="button" className="key" onClick={() => setOpen(true)}>Open your protocol</button>
    </section>
  );
  return null;
}

export function LineUI() {
  return (
    <>
      <AddOnLine />
      <StationPanel />
      <Ends />
      <div className="dock line-dock">
        <LineTape />
        <Tray />
      </div>
      <Dossier />
      <Drawer />
    </>
  );
}

/** the readout bar's cells inside: line, station, position, protocol */
export function useLineReadout() {
  const st = useLive(() => nearest(rv.u));
  const n = count(useCart((s) => s.items));
  return { st, n };
}
