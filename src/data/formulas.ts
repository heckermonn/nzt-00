// Placeholder formulas, doses and prices for the concept. Not the owner's final numbers.
export type FactRow = [ingredient: string, amount: string, dailyValue: string];
export interface Formula {
  id: string;
  code: string;
  name: string;
  shape: 'Lattice' | 'Helix' | 'Ring' | 'Sphere';
  line: string;
  price: number;
  /** cap colour in the 3D scenes */
  tint: number;
  rows: FactRow[];
}

export const FORMULAS: Formula[] = [
  { id: 'base', code: '00·01', name: 'Base', shape: 'Lattice', line: 'The daily foundation. Vitamin D3, K2 and magnesium, with breakfast.', price: 34, tint: 0xc9ced1,
    rows: [['Vitamin D3 (as cholecalciferol)', '50 mcg (2,000 IU)', '250%'], ['Vitamin K2 (as MK-7)', '100 mcg', '83%'], ['Magnesium (as glycinate)', '100 mg', '24%']] },
  { id: 'focus', code: '00·02', name: 'Focus', shape: 'Helix', line: 'For long afternoons of deep work. Calm attention, no jitter.', price: 42, tint: 0xf2f4f5,
    rows: [['Citicoline (as CDP-choline)', '250 mg', '†'], ['Bacopa monnieri extract (50% bacosides)', '300 mg', '†'], ['L-Theanine', '200 mg', '†']] },
  { id: 'sleep', code: '00·03', name: 'Sleep', shape: 'Ring', line: 'An hour before lights out. Magnesium, glycine and apigenin.', price: 38, tint: 0x3b4044,
    rows: [['Magnesium (as glycinate)', '50 mg', '12%'], ['Glycine', '400 mg', '†'], ['Apigenin', '50 mg', '†']] },
  { id: 'recover', code: '00·04', name: 'Recover', shape: 'Sphere', line: 'After training. Taurine, tart cherry and zinc.', price: 36, tint: 0x8d9499,
    rows: [['Taurine', '500 mg', '†'], ['Tart cherry extract', '200 mg', '†'], ['Zinc (as bisglycinate)', '11 mg', '100%']] },
];

/** the twelve vials on the assay bench */
export const INGREDIENTS: [code: string, name: string, dose: string][] = [
  ['V-01', 'Vitamin D3', '50 mcg'], ['V-02', 'Vitamin K2', '100 mcg'], ['V-03', 'Magnesium', '100 mg'], ['V-04', 'Citicoline', '250 mg'],
  ['V-05', 'Bacopa', '300 mg'], ['V-06', 'L-Theanine', '200 mg'], ['V-07', 'Glycine', '400 mg'], ['V-08', 'Apigenin', '50 mg'],
  ['V-09', 'Taurine', '500 mg'], ['V-10', 'Tart cherry', '200 mg'], ['V-11', 'Zinc', '11 mg'], ['V-12', 'Reference', 'blank'],
];

export const CHAPTERS = ['Specimen cloud', 'Formulary', 'Cross-section', 'Assay bench', 'Seal', 'Dispense'] as const;
