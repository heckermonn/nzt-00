import { useEffect, useState } from 'react';
import { Scene } from './Scene';
import { ReserveUI } from './UI';
import './reserve.css';

const isNarrow = () => innerWidth < 760 || innerWidth / innerHeight < 0.8;

export function ReserveApp() {
  const [narrow, setNarrow] = useState(isNarrow);
  useEffect(() => { const on = () => setNarrow(isNarrow()); addEventListener('resize', on); return () => removeEventListener('resize', on); }, []);
  return (
    <>
      <Scene narrow={narrow} />
      <ReserveUI />
    </>
  );
}
