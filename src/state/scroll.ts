import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lab, useUI } from './lab';

gsap.registerPlugin(ScrollTrigger);

/** first part of each chapter is spent travelling the camera from the previous station */
export const TRAVEL = [0, 0.05, 0.22, 0.3, 0.3, 0.3];

/**
 * Lenis smooths the native scroll; ScrollTrigger turns each chapter section into a 0..1 progress
 * that the 3D scene reads from `lab`. Nothing is pinned or hijacked: the page scrolls like a page.
 */
export function useLabScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: lab.reduce ? 1 : 0.1, smoothWheel: !lab.reduce });
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const sections = gsap.utils.toArray<HTMLElement>('[data-ch]');
    const triggers = sections.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: i === 0 ? 'top top' : 'top center',
        end: i === 0 ? 'bottom bottom' : 'bottom center',
        onUpdate: (self) => { lab.chapter[i] = self.progress; },
        onToggle: (self) => { if (self.isActive) { lab.k = i; useUI.getState().setChapter(i); } },
      }),
    );
    // each formula card morphs the swarm as it rises into view
    gsap.utils.toArray<HTMLElement>('[data-card]').forEach((el, i) =>
      triggers.push(ScrollTrigger.create({ trigger: el, start: 'top bottom', end: 'top 45%', onUpdate: (s) => { lab.card[i] = s.progress; } })),
    );
    triggers.push(ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (s) => { lab.page = s.progress; } }));

    // cards print in from the top edge, in hard mechanical steps
    gsap.utils.toArray<HTMLElement>('.card').forEach((el) =>
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', ease: 'steps(8)', duration: lab.reduce ? 0 : 0.7,
        scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' } }),
    );

    const onResize = () => { lab.narrow = innerWidth / innerHeight < 0.9; ScrollTrigger.refresh(); };
    onResize();
    addEventListener('resize', onResize);
    (window as unknown as { __lenis: Lenis }).__lenis = lenis;
    return () => { removeEventListener('resize', onResize); triggers.forEach((t) => t.kill()); ScrollTrigger.getAll().forEach((t) => t.kill()); gsap.ticker.remove(tick); lenis.destroy(); };
  }, []);
}

/** local progress inside a chapter once the camera has arrived */
export const settled = (k: number, t: number) => (k === 0 ? t : Math.max(0, (t - TRAVEL[k]) / (1 - TRAVEL[k])));
