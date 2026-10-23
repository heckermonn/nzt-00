import { useEffect, useRef } from 'react';
import { lab, useUI } from '../state/lab';
import { setSound } from '../audio/sound';

const STAGES = ['Air shower', 'UV-C', 'N₂ purge'];
const DUST = 12400;

/** press-and-hold control; the ring shows how far the bolts or the cycle have got */
function HoldButton({ label, value }: { label: string; value: () => number }) {
  const ring = useRef<SVGCircleElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { if (ring.current) ring.current.style.strokeDashoffset = String(301.6 * (1 - value())); raf = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(raf);
  }, [value]);
  const set = (on: boolean) => { lab.entry.holding = on; };
  return (
    <button type="button" className="hold" aria-label={label}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); set(true); }}
      onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onLostPointerCapture={() => set(false)}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); set(true); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') set(false); }}
      onContextMenu={(e) => e.preventDefault()}>
      <svg viewBox="0 0 108 108" aria-hidden="true"><circle cx="54" cy="54" r="48" className="track" /><circle ref={ring} cx="54" cy="54" r="48" className="fill" /></svg>
      <span>{label}</span>
    </button>
  );
}

/** live readout of the decontamination cycle */
function Cycle() {
  const count = useRef<HTMLElement>(null), rows = useRef<HTMLOListElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = lab.entry.cycle;
      if (count.current) count.current.textContent = Math.round(DUST * Math.max(0, 1 - c * 1.04)).toLocaleString('en-US');
      rows.current?.querySelectorAll('li').forEach((li, i) => {
        const a = c * 3 - i, state = a >= 1 ? 'Done' : a > 0 ? 'Active' : 'Standby';
        li.dataset.state = state.toLowerCase(); (li.lastElementChild as HTMLElement).textContent = state;
      });
      raf = requestAnimationFrame(tick);
    };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="cycle">
      <div className="count"><b className="dot" ref={count}>12,400</b><small className="mono">particles / m³</small></div>
      <ol className="mono" ref={rows}>{STAGES.map((s, i) => <li key={s}><span>{String(i + 1).padStart(2, '0')} {s}</span><b>Standby</b></li>)}</ol>
    </div>
  );
}

function SoundChoice() {
  const sound = useUI((s) => s.sound);
  const pick = (on: boolean) => { setSound(on); useUI.getState().setSound(on); };
  return (
    <div className="choice mono" role="group" aria-label="Facility sound">
      <span>Sound</span>
      <button type="button" className="chip" aria-pressed={sound} onClick={() => pick(true)}>On</button>
      <button type="button" className="chip" aria-pressed={!sound} onClick={() => pick(false)}>Off</button>
    </div>
  );
}

/** the visitor's pass, printed when the cycle clears */
function Badge() {
  const d = new Date(), id = useRef(String(1000 + Math.floor(Math.random() * 8999)));
  const stamp = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return (
    <div className="badge mono" role="status">
      <b className="dot">Cleared</b>
      <span>Visitor {id.current}</span><span>Clearance 01</span><span>{stamp}</span>
    </div>
  );
}

/** condensation on the lens between zones */
function Frost() {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { if (r.current) r.current.style.opacity = lab.entry.frost.toFixed(3); raf = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="frost" ref={r} aria-hidden="true" />;
}

const skip = () => {
  const ui = useUI.getState(); lab.entry.holding = false; lab.entry.blend = 1;
  ui.setPhase('lab'); (window as unknown as { __lenis?: { start(): void } }).__lenis?.start();
};

/** door, airlock and the hand-off into the lab; everything else stays hidden until then */
export function EntryUI() {
  const phase = useUI((s) => s.phase), ready = useUI((s) => s.ready);
  useEffect(() => { document.documentElement.classList.toggle('in-entry', phase !== 'lab'); document.documentElement.dataset.entry = phase; }, [phase]);
  if (phase === 'lab') return <Frost />;
  const atDoor = phase === 'door', inLock = phase === 'airlock';
  return (
    <>
      <Frost />
      <div className={`entry ${phase}${ready ? ' ready' : ''}`}>
        <div className="entry-top"><span className="logo">NZT-00</span><button type="button" className="skip mono" onClick={skip}>Skip entry</button></div>
        {atDoor && (
          <div className="panel">
            <p className="mono steel">Sector 00 · Restricted</p>
            <h1>Authorised<br />personnel only</h1>
            <p className="lede">Hold the keypad to draw the bolts. Inside: four formulas in five formats, prepared in front of you.</p>
            <HoldButton label="Hold to unlock" value={() => lab.entry.hold} />
          </div>
        )}
        {inLock && (
          <div className="panel">
            <p className="mono steel">Airlock 01 · Decontamination</p>
            <Cycle />
            <SoundChoice />
            <HoldButton label="Hold to decontaminate" value={() => lab.entry.cycle} />
          </div>
        )}
        {phase === 'cleared' && <Badge />}
      </div>
    </>
  );
}
