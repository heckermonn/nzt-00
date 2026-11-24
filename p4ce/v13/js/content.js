/* PR6 v13 · institutional and SAMPLE content.
   Everything here is placeholder content for the preview, labelled "Sample" on screen: the institution's record,
   its orders, the notices, the references. Copy rules: describe the compound, the lot and the paperwork only. No
   dose, no use in people or animals, no effects, no reviews. */

export const fmtDate = (iso, o = {}) => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', Object.assign({day: 'numeric', month: 'short', year: 'numeric'}, o)).replace(/\./g, '').replace('Sept', 'Sep'); };

/* SAMPLE: the signed-in institution. PR6 vets every institution in person and opens its account; nobody signs up. */
export const INST = {
  name: '[Institution name]', unit: '[Department or laboratory]', acct: 'INST-0047', since: '2026-09-14',
  entity: '[Legal entity name]', bn: '[Business or registration no.]',
  pi: '[Responsible researcher], [title]', vetted: '2026-09-10', vettedBy: 'In person, PR6',
  terms: 'Net 30, invoice to accounts payable',
  users: [['[Purchaser 1]', 'Purchaser', '2FA on'], ['[Purchaser 2]', 'Purchaser', '2FA on'], ['[Responsible researcher]', 'Approver', '2FA on']],
  sites: [['Main laboratory', '[Street address], [City], [Province] [Postal code]'], ['Receiving dock', '[Street address], [City], [Province] [Postal code]']]
};

/* SAMPLE: orders. Each line carries the lot that shipped, so its CoA travels with it. */
export const ORDERS = [
  {no: 'PO-[0000]-118', d: '2026-10-20', items: [['PR6-C-0201', 0, 2], ['PR6-C-0602', 1, 1]], st: 'Delivered', inv: 'INV-2026-0412', paid: 'Paid'},
  {no: 'PO-[0000]-104', d: '2026-09-29', items: [['PR6-C-0103', 0, 4]], st: 'Delivered', inv: 'INV-2026-0388', paid: 'Paid'},
  {no: 'PO-[0000]-097', d: '2026-09-18', items: [['PR6-C-0502', 1, 1], ['PR6-C-0901', 0, 1]], st: 'Delivered', inv: 'INV-2026-0361', paid: 'Paid'}
];

/* SAMPLE: Field Club notices. Notifications only: new lots, new entries, document updates, the dispatch window. */
export const FEED = [
  {d: '2026-10-28', k: 'lot', t: 'New lot released', b: 'LOT 2602-A of PR6-C-0201 is released with its CoA and SDS.', id: 'PR6-C-0201'},
  {d: '2026-10-24', k: 'new', t: 'New entry in 07 Circadian research', b: 'PR6-C-0703 joins the catalogue.', id: 'PR6-C-0703'},
  {d: '2026-10-21', k: 'doc', t: 'SDS revised', b: 'The SDS for PR6-C-0602 has a revised section 7, handling and storage.', id: 'PR6-C-0602'},
  {d: '2026-10-17', k: 'dispatch', t: 'Dispatch window', b: 'Approved purchase orders received before Thursday 12:00 ET ship on Monday, cold-packed.'},
  {d: '2026-10-09', k: 'lot', t: 'New lot released', b: 'LOT 2610-C of PR6-C-0103 is released with its CoA and SDS.', id: 'PR6-C-0103'},
  {d: '2026-10-02', k: 'new', t: 'New entry in 04 Mitochondrial and bioenergetics', b: 'PR6-C-0403 joins the catalogue.', id: 'PR6-C-0403'}
];
export const FEED_KINDS = {lot: 'New lots', new: 'New entries', doc: 'Document updates', dispatch: 'Dispatch windows'};

/* New Entries: catalogue additions and new lots (dates are SAMPLE) */
export const NEW = [['PR6-C-0703', '2026-10-24', 'New entry'], ['PR6-C-0201', '2026-10-28', 'New lot'], ['PR6-C-0403', '2026-10-02', 'New entry'], ['PR6-C-0103', '2026-10-09', 'New lot'], ['PR6-C-0103', '2026-09-21', 'New entry']];

/* SAMPLE: references. Cited as references only: author, title, journal, year, DOI. Never summarised as an outcome. */
export const REFS = [
  {id: 'R-001', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0101', 'PR6-C-0102']},
  {id: 'R-002', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0201', 'PR6-C-0202']},
  {id: 'R-003', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0301', 'PR6-C-0603']},
  {id: 'R-004', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0401', 'PR6-C-0901']},
  {id: 'R-005', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0501', 'PR6-C-0801']},
  {id: 'R-006', a: '[Authors]', t: '[Title of the cited paper]', j: '[Journal]', y: '[Year]', doi: '10.xxxx/xxxxx', ids: ['PR6-C-0103', 'PR6-C-0702']}
];
export const refsFor = id => REFS.filter(r => r.ids.includes(id));
