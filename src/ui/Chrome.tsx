import { useEffect, useRef } from 'react';
import { useProgress } from '@react-three/drei';
import { CHAPTERS } from '../data/formulas';
import { lab, useUI } from '../state/lab';
import { useCart } from '../commerce/cart';
import { setSound } from '../audio/sound';
import { sgn } from '../three/shared';

export function Header() {
  const sound = useUI((s) => s.sound), count = useCart((s) => s.cart?.lines.reduce((a, l) => a + l.quantity, 0) ?? 0), setOpen = useCart((s) => s.setOpen);
  return (
    <header className="top">
      <a className="logo" href="#top">NZT-00</a>
      <span className="sp">
        <button className="chip" type="button" aria-pressed={sound} onClick={() => { setSound(!sound); useUI.getState().setSound(!sound); }}>{sound ? 'Sound on' : 'Sound off'}</button>
        <button className="chip" type="button" onClick={() => setOpen(true)}>Protocol <b className="count">{String(count).padStart(2, '0')}</b></button>
      </span>
    </header>
  );
}

/** right-edge process rail: where you are in the protocol, with a measured depth needle */
export function ProcessRail() {
  const chapter = useUI((s) => s.chapter);
  const needle = useRef<HTMLDivElement>(null), depth = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => { if (needle.current) needle.current.style.top = `${lab.page * 100}%`; if (depth.current) depth.current.textContent = String(Math.round(scrollY / 4)).padStart(4, '0'); raf = requestAnimationFrame(tick); };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <nav className="rail" aria-label="Protocol steps">
      <ol className="mono">{CHAPTERS.map((c, i) => <li key={c} className={i === chapter ? 'on' : ''} aria-current={i === chapter ? 'step' : undefined}>{c}<b>{String(i).padStart(2, '0')}</b></li>)}</ol>
      <div className="ruler"><div className="needle" ref={needle}><span className="depth" ref={depth}>0000</span></div></div>
    </nav>
  );
}

export function Hud() {
  const r = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const b = r.current?.querySelectorAll('b');
      if (b) { b[0].textContent = '0' + lab.k; b[1].textContent = sgn(lab.camX, 5, 1); b[2].textContent = String(Math.round(lab.disturbed)).padStart(3, '0'); b[3].textContent = String(lab.fps).padStart(2, '0'); }
      raf = requestAnimationFrame(tick);
    };
    tick(); return () => cancelAnimationFrame(raf);
  }, []);
  return <div className="hud" aria-hidden="true" ref={r}><div><small>Stage</small><b>00</b></div><div><small>Rail X</small><b>+000.0</b></div><div><small>Disturbed</small><b>000</b></div><div><small>FPS</small><b>60</b></div></div>;
}

/** instrument calibration while the Blender models stream in */
export function Boot() {
  const { progress, active, loaded, total } = useProgress();
  const done = !active && progress >= 100;
  useEffect(() => { if (done) useUI.getState().setReady(); }, [done]);
  return <div className={`boot mono${done ? ' done' : ''}`} aria-live="polite">Calibrating instruments<b>{loaded}/{Math.max(total, 6)}</b></div>;
}
