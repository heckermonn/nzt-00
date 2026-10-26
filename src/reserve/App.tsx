import { useEffect, useState } from 'react';
import { U_END } from './line';
import { Scene } from './Scene';
import { useReserve } from './state';
import { ReserveUI } from './UI';
import './reserve.css';

const isNarrow = () => innerWidth < 760 || innerWidth / innerHeight < 0.8;

export function ReserveApp() {
  const [narrow, setNarrow] = useState(isNarrow);
  useEffect(() => { const on = () => setNarrow(isNarrow()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  const inside = useReserve((s) => s.phase === 'hall');
  // inside, the page scrolls: its length is the line's, one screen per unit of the layout
  useEffect(() => { if (inside) scrollTo(0, 0); }, [inside]);
  return (
    <>
      <Scene narrow={narrow} />
      <ReserveUI />
      {inside && <div className="track" style={{ height: `${(U_END + 1) * 100}lvh` }} aria-hidden="true" />}
    </>
  );
}
