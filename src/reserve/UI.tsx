import { useEffect, useState, type ReactNode } from 'react';
import { COLLECTIONS, GOALS, MEMBER } from './data';
import { TAPE_K, hud } from './hud';
import { MeasureOverlay } from './Measure';
import { presentKey, rv, turnTo, useReserve } from './state';

type Reader = { scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: { serialNumber?: string }) => void) | null; onreadingerror: (() => void) | null };

/** Android Chrome reads the card in the page; everywhere else the button stands in for the card */
async function readKey() {
  const ui = useReserve.getState();
  if (ui.nfc !== 'ready') { presentKey(); return; }
  try {
    const reader = new (window as unknown as { NDEFReader: new () => Reader }).NDEFReader(), stop = new AbortController();
    await reader.scan({ signal: stop.signal });
    ui.setNfc('scanning');
    reader.onreading = (e) => { stop.abort(); rv.uid = (e.serialNumber ?? '').replace(/:/g, ' ').toUpperCase(); ui.setNfc('ready'); presentKey(); };
  } catch {
    presentKey(); // permission refused or no reader: fall back to the stand-in
  }
}

function Contactless() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M7 8.2a5.5 5.5 0 0 1 0 7.6" /><path d="M10.4 5.8a9 9 0 0 1 0 12.4" /><path d="M13.8 3.4a12.5 12.5 0 0 1 0 17.2" />
    </svg>
  );
}

function Chevron({ dir }: { dir: -1 | 1 }) {
  return (
    <svg viewBox="0 0 24 48" width="18" height="36" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d={dir < 0 ? 'M18 4 6 24l12 20' : 'M6 4l12 20L6 44'} />
    </svg>
  );
}

function Threshold() {
  const nfc = useReserve((s) => s.nfc);
  const [touch] = useState(() => matchMedia('(pointer: coarse)').matches);
  const hint = nfc === 'scanning' ? 'Hold your key flat against the back of your phone.'
    : nfc === 'ready' ? 'Your phone reads the key. Tap, then hold the card to its back.'
      : touch ? 'On iPhone, hold the key near the top of the phone.' : 'On a laptop, your phone reads the key for you.';
  return (
    <section className="threshold" aria-labelledby="threshold-title">
      <dl className="spec">
        <Cell k="Access" v="By invitation" /><Cell k="Key" v="NFC · engraved metal" /><Cell k="Door" v="00" />
      </dl>
      <h1 id="threshold-title">Members only beyond this door.</h1>
      <button type="button" className="key" onClick={readKey} data-state={nfc}>
        <Contactless /><span>{nfc === 'scanning' ? 'Waiting for your key' : 'Present your key'}</span>
      </button>
      <p className="hint">{hint}</p>
      {nfc !== 'ready' && nfc !== 'scanning' && <p className="note">Prototype: the button stands in for the card.</p>}
    </section>
  );
}

function Goals() {
  const goal = useReserve((s) => s.goal), setGoal = useReserve((s) => s.setGoal);
  const lit = goal >= 0 ? GOALS[goal].bays.map((b) => `${COLLECTIONS[b].n} ${COLLECTIONS[b].name}`).join(', ') : '';
  return (
    <div className="goals">
      <div className="goals-head">
        <h2 id="goals-title">What are you working on?</h2>
        {goal >= 0 && (
          <p className="lit" aria-live="polite"><span className="mono">{lit}</span><button type="button" className="text" onClick={() => setGoal(-1)}>Show every collection</button></p>
        )}
      </div>
      <div className="goal-list" role="group" aria-labelledby="goals-title">
        {GOALS.map((g, i) => (
          <button key={g.name} type="button" aria-pressed={goal === i} onClick={() => setGoal(goal === i ? -1 : i)}>{g.name}</button>
        ))}
      </div>
    </div>
  );
}

const pad = (n: number) => String(n).padStart(2, '0');

/** heading tape: the hall's bays as a compass strip that slides as you turn; the scene moves it each frame */
function Tape() {
  const bay = useReserve((s) => s.bay), goal = useReserve((s) => s.goal);
  const lit = goal >= 0 ? GOALS[goal].bays : null;
  const marks: ReactNode[] = [];
  for (let c = -1; c <= 1; c++) for (let s = 0; s < 10; s++) {
    const left = (c * 360 + s * 36 + 360) * TAPE_K, key = `${c}-${s}`;
    marks.push(s === 0
      ? <span key={key} className="tape-mark door" style={{ left }}>Door</span>
      : <button key={key} type="button" tabIndex={-1} className="tape-mark" style={{ left }} data-on={bay === s - 1} data-dim={!!lit && !lit.includes(s - 1)}
        onClick={() => turnTo(s - 1)}>{COLLECTIONS[s - 1].n}</button>);
  }
  return (
    <div className="tape" aria-hidden="true">
      <div className="tape-strip" ref={(el) => { hud.tape = el; }} style={{ width: 1080 * TAPE_K }}>{marks}</div>
    </div>
  );
}

function Hall() {
  const bay = useReserve((s) => s.bay), c = COLLECTIONS[bay];
  const step = (d: number) => { let b = bay + d; b = ((b % 9) + 9) % 9; turnTo(b); };
  return (
    <>
      <p className="sr" aria-live="polite">{`${c.n} ${c.name}. ${c.line}.`}</p>
      <button type="button" className="turn prev" onClick={() => step(-1)} aria-label={`Previous: ${COLLECTIONS[(bay + 8) % 9].name}`}><Chevron dir={-1} /></button>
      <button type="button" className="turn next" onClick={() => step(1)} aria-label={`Next: ${COLLECTIONS[(bay + 1) % 9].name}`}><Chevron dir={1} /></button>
      <div className="dock">
        <Tape />
        <Goals />
      </div>
    </>
  );
}

/** what the reader reports while it reads the key, in order, by seconds into the read */
const LOG: [number, string, () => string][] = [
  [0.25, 'Field', () => '13.56 MHz'],
  [0.6, 'UID', () => rv.uid || '04 A2 5F 1C 9E 33 80'],
  [1.0, 'Record', () => 'p4ce.com/k/••••'],
  [1.5, 'Signature', () => 'Valid'],
  [1.95, 'Member', () => MEMBER],
];

function KeyLog() {
  const phase = useReserve((s) => s.phase);
  const [n, setN] = useState(0);
  useEffect(() => {
    let id = 0;
    const tick = () => { setN(rv.phase === 'reading' ? LOG.filter(([t]) => rv.tp >= t).length : LOG.length); id = requestAnimationFrame(tick); };
    tick();
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <section className="keylog" aria-hidden="true">
      <p className="keylog-head">Reader 00 · Key log</p>
      <dl>
        {LOG.slice(0, n).map(([, k, v]) => <Cell key={k} k={k} v={v()} />)}
        {phase === 'reading' ? <Cell k="Status" v={<>Reading<i className="caret" /></>} live /> : <Cell k="Result" v="Verified" />}
      </dl>
    </section>
  );
}

/** `min` hides a cell below a width: md on phones, lg on anything narrower than a wide laptop */
function Cell({ k, v, live, min }: { k: string; v: ReactNode; live?: boolean; min?: 'md' | 'lg' }) {
  return <div className="cell" data-min={min}><dt>{k}</dt><dd data-live={live || undefined}>{v}</dd></div>;
}

/** the readout along the top: door and lock state outside, heading and bay inside */
function Readout() {
  const phase = useReserve((s) => s.phase), bay = useReserve((s) => s.bay), goal = useReserve((s) => s.goal);
  if (phase === 'hall') {
    const lit = goal >= 0 ? GOALS[goal].bays.length : 9;
    return (
      <dl className="cells">
        <Cell k="Reserve" v="Hall" min="lg" />
        <Cell k="Hdg" v={<span className="hdg" ref={(el) => { hud.hdg = el; }}>180.0°</span>} min="md" />
        <Cell k="Bay" v={`${COLLECTIONS[bay].n}/09`} />
        <Cell k="Lit" v={`${pad(lit)}/09`} min="md" />
        <Cell k="Member" v={MEMBER} />
      </dl>
    );
  }
  const shut = phase === 'door' || phase === 'reading';
  return (
    <dl className="cells">
      <Cell k="Door" v="00" min="md" />
      <Cell k="Lock" v={shut ? 'Engaged' : 'Released'} />
      <Cell k="Reader" v={phase === 'door' ? 'Armed' : phase === 'reading' ? 'Reading' : 'Verified'} live={phase === 'reading'} />
    </dl>
  );
}

const SAY: Record<string, string> = { reading: 'Reading your key.', verified: `Member ${MEMBER} verified. The door is opening.`, hall: 'You are in the Reserve.' };

export function ReserveUI() {
  const phase = useReserve((s) => s.phase);
  useEffect(() => { document.documentElement.dataset.phase = phase; }, [phase]);
  return (
    <div className="ui">
      <MeasureOverlay />
      <div className="frame" aria-hidden="true"><i /><i /><i /><i /></div>
      <header className="bar">
        <span className="mark">P4CE</span>
        <Readout />
      </header>
      {phase === 'door' && <Threshold />}
      {(phase === 'reading' || phase === 'verified') && <KeyLog />}
      {phase === 'hall' && <Hall />}
      <p className="sr" aria-live="assertive">{SAY[phase] ?? ''}</p>
    </div>
  );
}
