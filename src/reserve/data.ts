/** P4CE collections and member goals. Lines are the owner's; the goal-to-collection map is a placeholder until the owner confirms it. */
export const COLLECTIONS = [
  { n: '01', name: 'FOUNDATION', line: 'Everyday nutrition and essential support', form: 'tin' },
  { n: '02', name: 'FORM', line: 'Body composition and physique', form: 'jar' },
  { n: '03', name: 'FORCE', line: 'Strength and physical performance', form: 'bottle' },
  { n: '04', name: 'ENDURE', line: 'Stamina and sustained effort', form: 'dropper' },
  { n: '05', name: 'RESTORE', line: 'Recovery and physical maintenance', form: 'vial' },
  { n: '06', name: 'FOCUS', line: 'Attention and mental clarity', form: 'bottle' },
  { n: '07', name: 'STILL', line: 'Calm, rest, and sleep', form: 'ampoules' },
  { n: '08', name: 'RENEW', line: 'Skin, hair, and appearance', form: 'jar' },
  { n: '09', name: 'VITAL', line: 'Healthy ageing and long-term wellbeing', form: 'dropper' },
] as const;

export type Form = (typeof COLLECTIONS)[number]['form'];

/** goal → indices into COLLECTIONS */
export const GOALS: { name: string; bays: number[] }[] = [
  { name: 'Fat Loss & Body Definition', bays: [1] },
  { name: 'Muscle Growth & Strength', bays: [2, 1] },
  { name: 'Recovery & Tissue Repair', bays: [4] },
  { name: 'Energy & Physical Endurance', bays: [3] },
  { name: 'Skin Quality & Rejuvenation', bays: [7] },
  { name: 'Hair Growth & Scalp Health', bays: [7] },
  { name: 'Sleep & Physical Restoration', bays: [6, 4] },
  { name: 'Focus & Mental Performance', bays: [5] },
  { name: 'Libido & Sexual Wellness', bays: [8] },
  { name: 'Pigmentation & Tanning', bays: [7] },
  { name: 'Healthy Ageing & Cellular Function', bays: [8, 0] },
];

/** the door wall stands this far from the origin; the Line runs behind it */
export const R = 7;

export const MEMBER = '0047';
