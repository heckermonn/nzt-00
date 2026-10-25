import { useEffect, useState } from 'react';
import { COLLECTIONS, GOALS, MEMBER } from './data';
import { presentKey, turnTo, useReserve } from './state';

type Reader = { scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: (() => void) | null; onreadingerror: (() => void) | null };

/** Android Chrome reads the card in the page; everywhere else the button stands in for the card */
async function readKey() {
  const ui = useReserve.getState();
  if (ui.nfc !== 'ready') { presentKey(); return; }
  try {
    const reader = new (window as unknown as { NDEFReader: new () => Reader }).NDEFReader(), stop = new AbortController();
    await reader.scan({ signal: stop.signal });
    ui.setNfc('scanning');
    reader.onreading = () => { stop.abort(); ui.setNfc('ready'); presentKey(); };
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

function Hall() {
  const bay = useReserve((s) => s.bay), c = COLLECTIONS[bay];
  const step = (d: number) => { let b = bay + d; b = ((b % 9) + 9) % 9; turnTo(b); };
  return (
    <>
      <p className="sr" aria-live="polite">{`${c.n} ${c.name}. ${c.line}.`}</p>
      <button type="button" className="turn prev" onClick={() => step(-1)} aria-label={`Previous: ${COLLECTIONS[(bay + 8) % 9].name}`}><Chevron dir={-1} /></button>
      <button type="button" className="turn next" onClick={() => step(1)} aria-label={`Next: ${COLLECTIONS[(bay + 1) % 9].name}`}><Chevron dir={1} /></button>
      <Goals />
    </>
  );
}

const SAY: Record<string, string> = { reading: 'Reading your key.', verified: `Member ${MEMBER} verified. The door is opening.`, hall: 'You are in the Reserve.' };

export function ReserveUI() {
  const phase = useReserve((s) => s.phase);
  useEffect(() => { document.documentElement.dataset.phase = phase; }, [phase]);
  return (
    <div className="ui">
      <header className="bar">
        <span className="mark">P4CE</span>
        {phase === 'hall' && <span className="member mono">Member {MEMBER}</span>}
      </header>
      {phase === 'door' && <Threshold />}
      {phase === 'hall' && <Hall />}
      <p className="sr" aria-live="assertive">{SAY[phase] ?? ''}</p>
    </div>
  );
}

/** test hook for headless screenshots */

