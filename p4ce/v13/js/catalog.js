/* PR6 v13 · the catalogue. Research compounds supplied only to institutions PR6 has vetted in person.
   Nine numbered research areas (fields of study, never outcomes), each holding compounds listed by catalogue
   number. Every field here is SAMPLE DATA: the owner supplies the real compound list, sizes, prices, lots and
   CoAs. Names, purities and lot codes are placeholders and say so. Nothing here describes dose, use in people or
   animals, or an effect. */

export const SAMPLE = true;

export const AREAS = [
  {c: '01', s: 'HPLC and MS method standards', n: 'Reference standards', d: 'Analytical standards and system-suitability peptides for HPLC and mass spectrometry method work.'},
  {c: '02', s: 'Metabolic and endocrine models', n: 'Metabolic research', d: 'Peptides used in metabolic and endocrine signalling models.'},
  {c: '03', s: 'Muscle, tendon and bone models', n: 'Musculoskeletal research', d: 'Peptides used in muscle, tendon and bone cell and tissue models.'},
  {c: '04', s: 'Mitochondrial assays', n: 'Mitochondrial and bioenergetics', d: 'Peptides used in mitochondrial function and cellular energy assays.'},
  {c: '05', s: 'Migration and matrix models', n: 'Tissue and wound-healing models', d: 'Peptides used in cell migration, matrix and wound-closure models.'},
  {c: '06', s: 'Receptor-binding studies', n: 'Neuroscience', d: 'Peptides used in neuronal signalling and receptor-binding studies.'},
  {c: '07', s: 'Rhythm studies', n: 'Circadian research', d: 'Peptides used in circadian and neuroendocrine rhythm studies.'},
  {c: '08', s: 'Skin-model research', n: 'Dermatology and cosmetic science', d: 'Peptides used in keratinocyte, fibroblast and skin-model research.'},
  {c: '09', s: 'Senescence assays', n: 'Cellular ageing', d: 'Peptides used in senescence, telomere and cellular-stress assays.'}
];

/* compound classes: what the molecule is, not what it is for */
const CLASS = ['Linear peptide', 'Cyclic peptide', 'Modified peptide', 'Peptide fragment', 'Peptide conjugate'];
const LOTL = 'ABCDEFGHJ';

/* three sample entries per area. Prices are per vial in CAD on the institution's invoice terms. */
const SIZES = [[5, 'mg'], [10, 'mg']];
function make(a, i) {
  const id = `PR6-C-${a.c}0${i + 1}`;
  const k = (parseInt(a.c, 10) * 3 + i) % CLASS.length;
  const base = 80 + parseInt(a.c, 10) * 9 + i * 22;
  return {
    id, c: a.c, i: i + 1,
    n: `Compound ${a.c}${String.fromCharCode(65 + i)}`,    // placeholder name
    cls: CLASS[k],
    form: 'Lyophilised powder',
    sizes: SIZES.map(([q, u], j) => ({q, u, price: Math.round(base * (j ? 1.7 : 1))})),
    lot: `LOT 26${a.c}-${LOTL[i]}`,
    purity: 'xx.x%',                                        // from the lot's CoA
    tested: '[named third-party lab]',
    tdate: '2026-10-' + String(6 + parseInt(a.c, 10) * 2 + i).padStart(2, '0'),
    cas: '[CAS no.]', formula: '[molecular formula]', mw: '[g/mol]',
    seq: '[sequence or IUPAC name]',
    store: 'Store sealed at −20 °C, protected from light and moisture. Allow to reach room temperature before opening. Handle as set out in the SDS.',
    shelf: '24 months from the CoA date, sealed, at −20 °C',
    refs: 2 + (i % 2),
    isNew: i === 2 && parseInt(a.c, 10) % 3 === 1
  };
}
AREAS.forEach(a => { a.it = [0, 1, 2].map(i => make(a, i)); });

export const ALL = AREAS.flatMap(a => a.it);
export const byId = id => ALL.find(p => p.id === id) || null;
export const areaOf = p => AREAS.find(a => a.c === p.c);
export const cad = n => 'CA$' + Math.round(n).toLocaleString('en-CA');
export const range = a => { const ps = a.it.flatMap(p => p.sizes.map(s => s.price)); return `${cad(Math.min(...ps))}–${Math.round(Math.max(...ps))}`; };
export const RUO = 'For laboratory research use only. Not for human or veterinary use.';
export const fmtSize = s => `${s.q} ${s.u}`;
