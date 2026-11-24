// PR6 / Institute: the Formulary's catalogue, the Dispatches and the Compass content.
// Names, strengths and prices (CAD) are the owner's list of 24 Nov 2026, at the 20% margin. Waters and injection pens
// on that list are not sold here. Which Series a compound sits in, its class and its form were assigned for this
// build and are for PR6 to confirm. Lots, certificates, test dates and every value in [brackets] are still to be
// supplied. Nothing here describes a dose, a use in people or animals, or an effect. The Formulary opens only to a
// member whose institution a reviewer has verified (js/store.js).

export const SAMPLE = false;

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

// [name on the list, name on the label, class, [[quantity, unit, price CAD], ...], form if not a lyophilised powder]
// The first three of each Series are the vials standing in its case.
const LIST = {
  '01': [
    ["Vitamin B12", "Vitamin B12", "Small molecule", [["10", "mg", 43.18]]],
    ["Glutathione", "Glutathione", "Tripeptide", [["1500", "mg", 59.88]]],
    ["Melatonin", "Melatonin", "Small molecule", [["10", "mg", 57.03]]],
  ],
  '02': [
    ["Semaglutide", "Semaglutide", "Peptide", [["5", "mg", 49.29], ["10", "mg", 57.44], ["15", "mg", 61.1], ["20", "mg", 64.36], ["30", "mg", 75.77]]],
    ["Tirzepatide", "Tirzepatide", "Peptide", [["5", "mg", 51.73], ["10", "mg", 54.59], ["15", "mg", 60.7], ["20", "mg", 66.81], ["30", "mg", 82.69], ["40", "mg", 95.73], ["50", "mg", 108.77], ["60", "mg", 121.8]]],
    ["Retatrutide", "Retatrutide", "Peptide", [["5", "mg", 54.99], ["10", "mg", 69.25], ["15", "mg", 89.62], ["20", "mg", 101.84], ["30", "mg", 138.5], ["40", "mg", 171.09], ["50", "mg", 191.46], ["60", "mg", 211.83]]],
    ["Cagrilintide", "Cagrilintide", "Peptide", [["5", "mg", 85.14], ["10", "mg", 115.69]]],
    ["Cagrilintide + Semaglutide", "Cagri + Sema", "Peptide blend", [["5 + 5", "mg", 107.54]]],
    ["Survodutide", "Survodutide", "Peptide", [["10", "mg", 147.06]]],
    ["AOD-9604", "AOD-9604", "Peptide fragment", [["5", "mg", 70.47], ["10", "mg", 103.88]]],
    ["HGH Fragment 176-191", "Frag 176-191", "Peptide fragment", [["2", "mg", 48.88], ["5", "mg", 73.32]]],
    ["Adipotide", "Adipotide", "Peptide", [["2", "mg", 67.21], ["5", "mg", 114.06]]],
    ["5-Amino-1MQ", "5-Amino-1MQ", "Small molecule", [["5", "mg", 50.11], ["50", "mg", 73.32]]],
    ["AICAR", "AICAR", "Small molecule", [["50", "mg", 50.92]]],
    ["LC120", "LC120", "Blend", [["10", "mg", 61.1]], "Form to be confirmed"],
    ["LC216", "LC216", "Blend", [["10", "mg", 55.4]], "Form to be confirmed"],
    ["LC600", "LC600", "Blend", [["10", "mg", 89.62]], "Form to be confirmed"],
    ["Lemon Bottle", "Lemon Bottle", "Blend", [["10", "mg", 57.03]], "Form to be confirmed"],
  ],
  '03': [
    ["Ipamorelin", "Ipamorelin", "Peptide", [["5", "mg", 46.03], ["10", "mg", 54.59]]],
    ["CJC-1295 Without DAC", "CJC-1295 no DAC", "Peptide", [["5", "mg", 56.22], ["10", "mg", 76.18]]],
    ["Tesamorelin", "Tesamorelin", "Peptide", [["5", "mg", 70.47], ["10", "mg", 102.65], ["20", "mg", 183.31]]],
    ["CJC-1295 With DAC", "CJC-1295 DAC", "Peptide conjugate", [["5", "mg", 87.99], ["10", "mg", 171.09]]],
    ["CJC-1295 Without DAC + Ipamorelin", "CJC-1295 + Ipa", "Peptide blend", [["5 + 5", "mg", 65.99], ["10 + 10", "mg", 97.77]]],
    ["Sermorelin Acetate", "Sermorelin", "Peptide", [["5", "mg", 54.59], ["10", "mg", 63.55]]],
    ["GHRP-2 Acetate", "GHRP-2", "Peptide", [["5", "mg", 41.14], ["10", "mg", 45.22], ["15", "mg", 49.29]]],
    ["GHRP-6 Acetate", "GHRP-6", "Peptide", [["5", "mg", 41.14], ["10", "mg", 45.22]]],
    ["Hexarelin Acetate", "Hexarelin", "Peptide", [["5", "mg", 63.14], ["10", "mg", 93.69]]],
    ["IGF-1 LR3", "IGF-1 LR3", "Recombinant protein", [["0.1", "mg", 49.29], ["1", "mg", 98.17]]],
    ["PEG MGF", "PEG MGF", "Peptide conjugate", [["2", "mg", 67.21]]],
  ],
  '04': [
    ["MOTS-c", "MOTS-c", "Peptide", [["10", "mg", 59.88], ["40", "mg", 102.65]]],
    ["SS-31", "SS-31", "Peptide", [["10", "mg", 67.62], ["50", "mg", 185.76]]],
    ["NAD+", "NAD+", "Small molecule", [["100", "mg", 54.18], ["500", "mg", 60.7], ["1000", "mg", 86.77]]],
  ],
  '05': [
    ["BPC-157", "BPC-157", "Peptide", [["5", "mg", 48.48], ["10", "mg", 59.07], ["20", "mg", 73.32]]],
    ["TB500 (Thymosin B4 Acetate)", "TB500", "Peptide", [["5", "mg", 57.44], ["10", "mg", 81.06]]],
    ["BPC-157 + TB500", "BPC-157 + TB500", "Peptide blend", [["5 + 5", "mg", 63.55], ["10 + 10", "mg", 98.17]]],
    ["BPC-157 + GHK-Cu + TB500 (BBG70)", "BBG70", "Peptide blend", [["10 + 50 + 10", "mg", 111.62]]],
    ["KLOW80 (KL80)", "KLOW80", "Peptide blend", [["80", "mg", 117.73]]],
    ["KPV", "KPV", "Peptide", [["10", "mg", 57.44]]],
    ["LL-37", "LL-37", "Peptide", [["5", "mg", 61.1]]],
    ["ARA-290", "ARA-290", "Peptide", [["10", "mg", 51.33]]],
  ],
  '06': [
    ["Semax", "Semax", "Peptide", [["5", "mg", 51.73], ["10", "mg", 56.62], ["30", "mg", 81.47]]],
    ["Selank", "Selank", "Peptide", [["5", "mg", 51.73], ["10", "mg", 58.66]]],
    ["Semax + Selank", "Semax + Selank", "Peptide blend", [["10 + 10", "mg", 77.4]]],
    ["Pinealon", "Pinealon", "Peptide", [["10", "mg", 51.33], ["20", "mg", 63.14]]],
    ["Cerebrolysin", "Cerebrolysin", "Peptide preparation", [["60", "mg, box of 6 vials", 81.47]], "Form to be confirmed"],
    ["Oxytocin Acetate", "Oxytocin", "Peptide", [["2", "mg", 40.74], ["5", "mg", 50.11], ["10", "mg", 60.7]]],
    ["PT-141", "PT-141", "Peptide", [["10", "mg", 59.88]]],
  ],
  '07': [
    ["DSIP", "DSIP", "Peptide", [["5", "mg", 51.73], ["10", "mg", 61.1]]],
    ["Kisspeptin-10", "Kisspeptin-10", "Peptide", [["5", "mg", 61.1], ["10", "mg", 65.18]]],
    ["Gonadorelin Acetate", "Gonadorelin", "Peptide", [["2", "mg", 41.55]]],
    ["HCG", "HCG", "Glycoprotein hormone", [["2,000", "IU", 48.88], ["5,000", "IU", 59.88], ["10,000", "IU", 87.99]]],
    ["HMG", "HMG", "Glycoprotein hormone", [["75", "IU", 53.36]]],
  ],
  '08': [
    ["GHK-Cu", "GHK-Cu", "Copper peptide", [["50", "mg", 43.59], ["100", "mg", 51.73]]],
    ["AHK-Cu", "AHK-Cu", "Copper peptide", [["50", "mg", 44.81], ["100", "mg", 57.03]]],
    ["SNAP-8", "SNAP-8", "Peptide", [["10", "mg", 49.29]]],
    ["MT-1 (Melanotan 1)", "MT-1", "Peptide", [["10", "mg", 48.88]]],
    ["MT-2 (Melanotan 2 Acetate)", "MT-2", "Peptide", [["10", "mg", 49.29]]],
  ],
  '09': [
    ["Epithalon", "Epithalon", "Peptide", [["10", "mg", 54.18], ["50", "mg", 89.62]]],
    ["FOXO4", "FOXO4", "Peptide", [["10", "mg", 215.9]]],
    ["Thymalin", "Thymalin", "Peptide", [["10", "mg", 50.11]]],
    ["Thymosin Alpha-1", "Thymosin A1", "Peptide", [["5", "mg", 60.7], ["10", "mg", 85.14]]],
  ],
};
// The six checks a record must have on file before it can enter an order (blueprint 9 and 10: fail closed).
export const CHECKS = [
  ['jurisdiction', 'Jurisdiction and audience'], ['classification', 'Legal classification'], ['authorization', 'Authorization identifier'],
  ['labelling', 'Lawful labelling'], ['evidence', 'Evidence file and date'], ['quality', 'Identity and lot testing'],
];
const STATUS = {
  available: { label: 'Listed', long: 'Listed by PR6 for supply to verified institutions, for laboratory research only. The documents behind each check are for PR6 to attach.' },
  review: { label: 'In review', long: 'Compliance review is open. This record cannot enter an order until every check is on file.' },
  library: { label: 'Library only', long: 'Research library entry. Information only; not offered for sale.' },
};
export const statusOf = (r) => STATUS[r.status];

function make(s, e, i) {
  const [name, short, cls, sizes, form] = e;
  return {
    id: `PR6-C-${s.c}${String(i + 1).padStart(2, '0')}`, c: s.c, i: i + 1, status: 'available',
    name, short, cls, form: form || 'Lyophilised powder', pack: 'One sealed, crimped glass vial',
    sizes: sizes.map(([q, u, price]) => ({ q, u, price })),
    checks: Object.fromEntries(CHECKS.map(([k]) => [k, true])),
    lot: '[lot]', tdate: '[test date]', updated: '2026-11-24', stock: 'Listed',
    tags: [s.f.toLowerCase(), cls.toLowerCase(), short.toLowerCase()],
  };
}
SERIES.forEach((s) => { s.items = LIST[s.c].map((e, i) => make(s, e, i)); });
export const ALL = SERIES.flatMap((s) => s.items);
// the picture of a record: its own vial, labelled with its own name
export const picOf = (r) => `assets/vials/${r.id}.webp`;
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
      ['Name', r.name], ['Catalogue number', r.id], ['Formulation', `${r.cls}, ${r.form.toLowerCase()}`],
      ['Presentation', r.pack], ['Strengths', r.sizes.map((z) => `${z.q} ${z.u}`).join(' · ')], ['Manufacturer or supplier', '[supplier identity]'],
    ]],
    ['Regulatory', [
      ['Jurisdiction', 'Canada'],
      ['Legal classification', r.checks.classification ? '[classification]' : 'Not on file'],
      ['Authorization identifier', r.checks.authorization ? '[identifier]' : 'Not on file'],
      ['Permitted audience', 'Verified institutions and laboratories, for laboratory research'],
      ['Label statement', r.checks.labelling ? LABEL_LINE : 'Labelling not yet approved'],
    ]],
    ['Evidence', [
      ['Documented uses', '[documented uses, with sources]'], ['Study population', '[for example: in vitro, cell models]'],
      ['Evidence quality', r.checks.evidence ? '[grade], see how evidence is graded' : 'Not yet graded'],
      ['Uncertainty', '[what is not known]'], ['Last reviewed', r.checks.evidence ? r.updated : 'Not on file'],
    ]],
    ['Safety', [
      ['Warnings', '[approved warnings]'], ['Handling', '[storage conditions]. Handle as set out in the safety data sheet.'],
      ['Safety data sheet', '[safety data sheet]'], ['Use', 'Laboratory research only. PR6 does not give dosing or treatment guidance and does not supply materials for use in people or animals.'],
    ]],
    ['Quality', [
      ['Lot', r.lot], ['Identity and purity', '[test date, named independent laboratory and purity for this lot]'],
      ['Certificate of analysis', '[certificate of analysis for this lot]'], ['Chain of custody', '[chain-of-custody record]'],
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
  intent: { q: 'What does your group study?', help: 'Fields of research, used only to order your reading. Choose as many as apply.', multi: true, opts: [
    ['focus', 'Neuroscience'], ['recovery', 'Tissue and musculoskeletal models'], ['energy', 'Metabolism and bioenergetics'], ['rest', 'Circadian biology'], ['selfcare', 'Skin and cosmetic science'], ['longevity', 'Cellular ageing'], ['knowledge', 'Analytical methods'],
  ] },
  objective: { q: 'What would a useful result look like?', help: 'This sets the order of your index.', opts: [
    ['learn', 'Learn the ground'], ['compare', 'Compare listed materials'], ['evidence', 'Read the evidence'], ['expert', 'Speak with scientific support'],
  ] },
  preference: { q: 'How do you prefer to take things in?', help: 'Optional. It only changes the form of what is shown.', opts: [
    ['read', 'Reading'], ['watch', 'Films and talks'], ['both', 'No preference'],
  ] },
  depth: { q: 'A concise overview, or detailed references?', help: 'This changes how much is shown. It never changes what counts as evidence.', opts: [
    ['overview', 'Concise overview'], ['detailed', 'Detailed, with references'],
  ] },
  safety: { q: 'Would you like the handling and safety overview?', help: 'Either can be opened later from Support.', opts: [
    ['overview', 'The handling and safety overview'], ['professional', 'A conversation with scientific support'], ['none', 'Not now'],
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
  'Materials are supplied to verified institutions for laboratory research and are handled under that institution\'s own safety procedures.',
];
