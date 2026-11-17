// PR6 / Institute: the Formulary's sample catalogue, the Dispatches and the Compass content.
// EVERY RECORD HERE IS SAMPLE DATA. Names, sizes, prices, lots and statuses are placeholders that show the shape of a
// verified record (blueprint section 10); the owner supplies real, reviewed records. Nothing here describes a dose,
// a use in people or animals, or an effect. A record can be ordered only when every compliance check is on file.

export const SAMPLE = true;

export const SERIES = [
  { c: '01', f: 'Reference standards', d: 'Analytical standards and system-suitability materials for method work.' },
  { c: '02', f: 'Metabolic research', d: 'Materials used in metabolic and endocrine signalling models.' },
  { c: '03', f: 'Musculoskeletal research', d: 'Materials used in muscle, tendon and bone cell and tissue models.' },
  { c: '04', f: 'Mitochondrial and bioenergetics', d: 'Materials used in mitochondrial function and cellular energy assays.' },
  { c: '05', f: 'Tissue and wound-healing models', d: 'Materials used in cell migration, matrix and wound-closure models.' },
  { c: '06', f: 'Neuroscience', d: 'Materials used in neuronal signalling and receptor-binding studies.' },
  { c: '07', f: 'Circadian research', d: 'Materials used in circadian and neuroendocrine rhythm studies.' },
  { c: '08', f: 'Dermatology and cosmetic science', d: 'Materials used in keratinocyte, fibroblast and skin-model research.' },
  { c: '09', f: 'Cellular ageing', d: 'Materials used in senescence and cellular-stress assays.' },
].map((s) => ({ ...s, n: 'Series ' + s.c }));

const CLASS = ['Linear peptide', 'Cyclic peptide', 'Modified peptide', 'Peptide fragment', 'Peptide conjugate'];
const LOTL = 'ABCDEFGHJ';
// The six checks a record must have on file before it can enter an order (blueprint 9 and 10: fail closed).
export const CHECKS = [
  ['jurisdiction', 'Jurisdiction and audience'], ['classification', 'Legal classification'], ['authorization', 'Authorization identifier'],
  ['labelling', 'Lawful labelling'], ['evidence', 'Evidence file and date'], ['quality', 'Identity and lot testing'],
];
const STATUS = {
  available: { label: 'Listed', long: 'All six checks are on file (sample data). Can be added to an order.' },
  review: { label: 'In review', long: 'Compliance review is open. This record cannot enter an order until every check is on file.' },
  library: { label: 'Library only', long: 'Research library entry. Information only; not offered for sale.' },
};
export const statusOf = (r) => STATUS[r.status];

function make(s, i) {
  const n = parseInt(s.c, 10);
  const id = `PR6-C-${s.c}0${i + 1}`;
  const status = i === 0 ? 'available' : i === 1 ? 'review' : 'library';
  const open = status === 'review' ? [['authorization', 'labelling'], ['evidence'], ['authorization']][n % 3] : status === 'library' ? ['jurisdiction', 'authorization', 'labelling'] : [];
  const base = 80 + n * 9 + i * 22;
  return {
    id, c: s.c, i: i + 1, status,
    name: `Compound ${s.c}${String.fromCharCode(65 + i)}`,
    cls: CLASS[(n * 3 + i) % CLASS.length],
    form: 'Lyophilised powder', pack: 'One sealed, crimped 3 mL glass vial',
    sizes: [{ q: 5, u: 'mg', price: base }, { q: 10, u: 'mg', price: Math.round(base * 1.7) }],
    checks: Object.fromEntries(CHECKS.map(([k]) => [k, !open.includes(k)])),
    lot: `LOT 26${s.c}-${LOTL[i]}`,
    tdate: '2026-10-' + String(6 + n * 2 + i).padStart(2, '0'),
    updated: '2026-11-' + String(1 + ((n + i * 3) % 12)).padStart(2, '0'),
    stock: status === 'available' ? (n % 4 === 0 ? 'Low stock' : 'In stock') : 'Not offered',
    tags: [s.f.toLowerCase(), CLASS[(n * 3 + i) % CLASS.length].toLowerCase(), 'lyophilised', 'vial'],
  };
}
SERIES.forEach((s) => { s.items = [0, 1, 2].map((i) => make(s, i)); });
export const ALL = SERIES.flatMap((s) => s.items);
export const byId = (id) => ALL.find((r) => r.id === id) || null;
export const seriesOf = (r) => SERIES.find((s) => s.c === r.c);
export const cad = (n) => 'CA$' + Number(n).toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const canOrder = (r) => r.status === 'available' && CHECKS.every(([k]) => r.checks[k]);
export const LABEL_LINE = 'Research use only. Not for human or veterinary use.';

// The structured record (blueprint 10, "Required product record fields"). [Bracketed] values are for the owner to supply.
export function recordFields(r) {
  const s = seriesOf(r);
  return [
    ['Identity', [
      ['Name', `${r.name} (placeholder name)`], ['Catalogue number', r.id], ['Formulation', `${r.cls}, ${r.form.toLowerCase()}`],
      ['Presentation', r.pack], ['Sizes', r.sizes.map((z) => `${z.q} ${z.u}`).join(', ')], ['Manufacturer or supplier', '[supplier identity]'],
    ]],
    ['Regulatory', [
      ['Jurisdiction', r.checks.jurisdiction ? 'Canada (sample)' : 'Not on file'],
      ['Legal classification', r.checks.classification ? '[classification]' : 'Not on file'],
      ['Authorization identifier', r.checks.authorization ? '[identifier]' : 'Not on file'],
      ['Permitted audience', r.checks.jurisdiction ? '[permitted audience]' : 'Not on file'],
      ['Label statement', r.checks.labelling ? LABEL_LINE : 'Labelling not yet approved'],
    ]],
    ['Evidence', [
      ['Documented uses', '[documented uses, with sources]'], ['Study population', '[for example: in vitro, cell models]'],
      ['Evidence quality', r.checks.evidence ? '[grade], see how evidence is graded' : 'Not yet graded'],
      ['Uncertainty', '[what is not known]'], ['Last reviewed', r.checks.evidence ? r.updated : 'Not on file'],
    ]],
    ['Safety', [
      ['Warnings', '[approved warnings]'], ['Handling', 'Store sealed at −20 °C, away from light and moisture. Handle as set out in the safety data sheet.'],
      ['Safety data sheet', 'SDS (placeholder document)'], ['Professional referral', 'Questions about suitability go to a qualified professional. PR6 does not give dosing or treatment guidance.'],
    ]],
    ['Quality', [
      ['Lot', r.lot], ['Identity and purity', r.checks.quality ? `Tested ${r.tdate} by [named independent laboratory]; purity xx.x%` : 'Not on file'],
      ['Certificate of analysis', r.checks.quality ? 'CoA for this lot (placeholder document)' : 'Not on file'], ['Chain of custody', '[chain-of-custody record]'],
    ]],
    ['Commerce', [
      ['Price', r.sizes.map((z) => `${z.q} ${z.u} ${cad(z.price)}`).join(' · ')], ['Taxes', 'Added at order, by province'],
      ['Stock', r.stock], ['Shipping', '[shipping rule]; dispatch window [x] business days'], ['Returns', '[refund and return conditions]'],
    ]],
    ['Field', [['Series', `${s.n} · ${s.f}`], ['Tags', r.tags.join(', ')]]],
  ];
}

// ------------------------------------------------------------------ Dispatches (sample editorial)
export const DISPATCHES = [
  { id: 'first-record', kind: 'Institutional record', date: '2026-11-14', title: 'The First Record', read: '3 min',
    dek: 'What Generation I is, how many places it holds, and what closes it.',
    body: [
      'Generation I holds two hundred places. It closes for good when two hundred members have accepted; places that are later vacated are not refilled.',
      'A place is not bought and cannot be passed on. It follows an invitation, a review and an offer that the applicant accepts. The metal card comes later, after a first qualifying order, and is a record of admission rather than a key.',
      'The cap exists because service capacity is finite. It says nothing about who has potential.',
      ['Status', 'The cap of 200 is established. Founding rights are proposed and still need financial and legal sign-off.'],
    ] },
  { id: 'evidence-grades', kind: 'Explainer', date: '2026-11-10', title: 'How evidence is graded here', read: '4 min',
    dek: 'Four plain grades, what each one means, and what none of them can tell you.',
    body: [
      'Every evidence note in the Institute carries a grade and a date. The grade describes the kind of study behind a statement, not how exciting the statement is.',
      ['A', 'Consistent results from well-run controlled trials in people.'],
      ['B', 'Limited or mixed results from studies in people.'],
      ['C', 'Laboratory or animal findings only. Interesting, and not evidence of an effect in people.'],
      ['D', 'Early, indirect or disputed. Shown so that you know it exists.'],
      'A grade can go down as well as up. When a note is revised, the old date is kept beside the new one.',
    ] },
  { id: 'invitation', kind: 'Institutional record', date: '2026-11-06', title: 'What an invitation is, and is not', read: '2 min',
    dek: 'An invitation opens an application. It does not promise admission.',
    body: [
      'Each invitation carries one insignia and one code that works once. The code on the card is typed by hand; the QR mark only opens the site.',
      'Choosing the door that matches your seal is a ritual, not a test of worth and not a security check. The review that follows is done by people, to written standards, and you can ask for an error to be corrected.',
      'A member may nominate up to five people in a lifetime. A nominee receives their own insignia, chosen by PR6 from the generation that is open.',
    ] },
  { id: 'insignias', kind: 'History', date: '2026-10-30', title: 'Four signs, and what we do not claim', read: '5 min',
    dek: 'The historical associations of the founding insignias, kept apart from what PR6 means by them.',
    body: [
      'The four founding insignias borrow forms with long histories: a serpent taking its own tail, the djed pillar, the scarab and the shen ring. The drawings are new and belong to PR6. They are not copies of any object.',
      'We describe the historical association and the PR6 reading separately, in every place they appear, so that one is never passed off as the other. PR6 does not claim descent from, or the endorsement of, any ancient tradition.',
      ['Status', 'Final artwork and the historical notes are to be reviewed by a commissioned specialist.'],
    ] },
  { id: 'coa', kind: 'Explainer', date: '2026-10-22', title: 'Reading a certificate of analysis', read: '4 min',
    dek: 'What a lot number ties together, and the three lines worth checking first.',
    body: [
      'A certificate of analysis belongs to one lot. Check that the lot on the certificate matches the lot on the label, that the laboratory is named, and that the test date is stated.',
      'Identity says the material is what the label says. Purity says how much of it is. Neither says anything about suitability for a use.',
      'Every Formulary record that can be ordered links the certificate for its current lot.',
    ] },
  { id: 'service-hours', kind: 'Service notice', date: '2026-10-18', title: 'Support hours and reply times', read: '1 min',
    dek: 'People answer support requests. Here is when, and how fast.',
    body: [
      'Support requests are answered by people. The target for a first reply is two business days; founding members are routed first.',
      ['Status', 'Target times are proposed and depend on staffing being confirmed.'],
    ] },
];
export const dispatch = (id) => DISPATCHES.find((d) => d.id === id) || null;

// ------------------------------------------------------------------ The Compass (blueprint 9)
export const COMPASS = {
  intent: { q: 'What are you pursuing?', help: 'A broad interest, not a diagnosis. Choose as many as apply.', multi: true, opts: [
    ['focus', 'Focus'], ['recovery', 'Recovery'], ['energy', 'Energy'], ['rest', 'Rest'], ['selfcare', 'Self-care'], ['longevity', 'Healthy ageing'], ['knowledge', 'Knowledge for its own sake'],
  ] },
  objective: { q: 'What would a useful result look like?', help: 'This sets the order of your index.', opts: [
    ['learn', 'Learn the ground'], ['compare', 'Compare eligible options'], ['evidence', 'Read the evidence'], ['expert', 'Speak with a professional'],
  ] },
  preference: { q: 'How do you prefer to take things in?', help: 'Optional. It only changes the form of what is shown.', opts: [
    ['read', 'Reading'], ['watch', 'Films and talks'], ['both', 'No preference'],
  ] },
  depth: { q: 'A concise overview, or detailed references?', help: 'This changes how much is shown. It never changes what counts as evidence.', opts: [
    ['overview', 'Concise overview'], ['detailed', 'Detailed, with references'],
  ] },
  safety: { q: 'Would you like a safety overview or professional guidance?', help: 'Either can be opened later from Support.', opts: [
    ['overview', 'A safety overview'], ['professional', 'A conversation with a professional'], ['none', 'Not now'],
  ] },
};
export const COMPASS_ORDER = ['intent', 'objective', 'preference', 'depth', 'safety'];
// interests -> fields of study (for reading), never -> products
export const INTEREST_FIELDS = {
  focus: ['06'], recovery: ['05', '03'], energy: ['04', '02'], rest: ['07'], selfcare: ['08'], longevity: ['09'], knowledge: ['01'],
};
export const TOPICS = [
  { id: 't-focus', for: ['focus'], title: 'Attention as a field of study', kind: 'Reading', dek: 'What laboratories measure when they study attention, and why bench findings rarely transfer cleanly to people.' },
  { id: 't-recovery', for: ['recovery'], title: 'How tissue repair is modelled', kind: 'Reading', dek: 'From scratch assays to matrix models: what each can show and what it cannot.' },
  { id: 't-energy', for: ['energy'], title: 'Bioenergetics without the slogans', kind: 'Reading', dek: 'Mitochondrial function, how it is assayed, and the limits of those assays.' },
  { id: 't-rest', for: ['rest'], title: 'Clocks: circadian research in brief', kind: 'Film', dek: 'A short film on how rhythm is studied, from light to hormones.' },
  { id: 't-selfcare', for: ['selfcare'], title: 'Skin models and cosmetic science', kind: 'Reading', dek: 'What reconstructed skin can tell a researcher, and the line between cosmetic and drug.' },
  { id: 't-longevity', for: ['longevity'], title: 'Senescence, carefully', kind: 'Reading', dek: 'What the word means at the bench, and how far the field is from answers.' },
  { id: 't-knowledge', for: ['knowledge'], title: 'How to read a method', kind: 'Reading', dek: 'Standards, system suitability and why a result is only as good as its method.' },
];
export const SAFETY_OVERVIEW = [
  'PR6 does not give dosing, treatment or regimen guidance, and the Compass does not match products to a goal.',
  'Materials labelled for research use are not for human or veterinary use.',
  'If a question concerns your health, speak with a qualified professional. Support can help you find the right kind.',
];
