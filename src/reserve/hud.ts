import type { Form } from './data';

/**
 * DOM the scene writes to every frame without going through React: the heading readout, the tape,
 * and the measured overlay on the bay you face.
 */
export const hud = {
  hdg: null as HTMLElement | null,
  tape: null as HTMLElement | null,
  svg: null as SVGSVGElement | null,
  lines: null as SVGPathElement | null,
  leader: null as SVGPathElement | null,
  tag: null as SVGTextElement | null,
  dim: null as SVGTextElement | null,
  callout: null as SVGGElement | null,
  values: [] as SVGTextElement[],
};

/** px per degree on the heading tape */
export const TAPE_K = 4;

/**
 * What each specimen is, as printed on the overlay. Placeholders until the owner confirms the lineup.
 * `h` is the specimen's height in the scene before the bay's own scale; `x` is where the dimension line stands.
 */
export const SPEC: Record<Form, { h: number; x: number; format: string; fill: string; mm: number }> = {
  tin: { h: 0.31, x: 0.5, format: 'ALUMINIUM TIN', fill: '60 CAPSULES', mm: 62 },
  jar: { h: 0.31, x: 0.5, format: 'FROSTED GLASS JAR', fill: '50 ML', mm: 58 },
  bottle: { h: 0.49, x: 0.5, format: 'SMOKED GLASS BOTTLE', fill: '90 CAPSULES', mm: 96 },
  dropper: { h: 0.55, x: 0.5, format: 'DROPPER BOTTLE', fill: '30 ML', mm: 92 },
  vial: { h: 0.67, x: 0.52, format: 'FREEZE-DRIED POWDER', fill: '10 ML VIAL', mm: 46 },
  ampoules: { h: 0.77, x: 0.98, format: 'ORAL AMPOULES ×5', fill: '2 ML EACH', mm: 75 },
};
