import { useEffect } from 'react';
import { useLabScroll } from './state/scroll';
import { useCart } from './commerce/cart';
import { Experience } from './three/Experience';
import { Boot, Header, Hud, ProcessRail } from './ui/Chrome';
import { Chapters, Footer } from './ui/Chapters';
import { CartDrawer, DispenseRecord } from './ui/Commerce';

export function App() {
  useLabScroll();
  useEffect(() => { useCart.getState().init(); }, []);
  return (
    <>
      <Experience />
      <Header />
      <ProcessRail />
      <Hud />
      <Chapters />
      <Footer />
      <DispenseRecord />
      <CartDrawer />
      <Boot />
    </>
  );
}
