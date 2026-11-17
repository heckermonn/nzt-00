/* PR6 v7 · editorial and SAMPLE content.
   Everything in this file marked SAMPLE is placeholder content for the preview: the notifications, the member reviews,
   the dispatch history and the member's record are invented to show the layout, and are labelled "Sample" on screen.
   Copy rules: descriptive only (texture, taste, pack, dispatch), no effect claims, no studies. */

/* the kit's pillars and the node diagram's five words */
export const PILLARS = ['Practice', 'Intent', 'Consistency', 'Community'];
export const NODES = ['rest', 'movement', 'nutrition', 'consistency', 'community'];
/* APPROACH on the Dossier: which node of the diagram a collection sits under (a filing label, not a claim) */
export const APPROACH = {'01': 'Nutrition', '02': 'Movement', '03': 'Movement', '04': 'Movement', '05': 'Rest', '06': 'Consistency', '07': 'Rest', '08': 'Consistency', '09': 'Consistency'};

/* SAMPLE: the Field Club notification feed */
export const FEED = [
  {d: '2026-10-28', k: 'restock', t: 'Back on the shelf', b: 'Creatine Monohydrate is back in stock in the 300 g pouch.', id: '03-1'},
  {d: '2026-10-24', k: 'new', t: 'New entry in 07 Still', b: 'Chamomile Infusion joins the Formulary: 30 single-serve sachets.', id: '07-6'},
  {d: '2026-10-21', k: 'session', t: 'Session 006', b: 'Saturday, 08:00. A 6 km easy loop, then coffee. Members only; Member Liaison sends the meeting point on Friday.'},
  {d: '2026-10-17', k: 'dispatch', t: 'Dispatch window', b: 'Orders and Protocol changes made before Thursday 12:00 leave on Friday.'},
  {d: '2026-10-12', k: 'note', t: 'Field Note 007', b: 'Per serving, not per pack: why every amount in the Dossier is listed against one serving.', href: '#/m/notes'},
  {d: '2026-10-09', k: 'restock', t: 'Back on the shelf', b: 'Omega-3 is back in stock in the 90 softgel tin.', id: '09-1'},
  {d: '2026-10-02', k: 'new', t: 'New entry in 04 Endure', b: 'Sodium Citrate, 120 tablets, joins the Formulary.', id: '04-6'}
];
export const FEED_KINDS = {restock: 'Restock', new: 'New entry', session: 'Session note', dispatch: 'Dispatch', note: 'Field note'};

/* SAMPLE: member reviews. Ratings are mono "4.6 / 5", no stars. */
export const REVIEWS = [
  {id: '03-1', r: 4.8, n: 41, q: [{m: '0112', d: 'Oct 2026', t: 'Unflavoured means unflavoured. It disappears into coffee.'}, {m: '0379', d: 'Sep 2026', t: 'The pouch reseals properly, which matters with a 300 g bag.'}]},
  {id: '01-1', r: 4.5, n: 33, q: [{m: '0044', d: 'Oct 2026', t: 'Two capsules, easy to swallow. The tin lives on the counter and does not look like a pharmacy.'}]},
  {id: '04-1', r: 4.7, n: 28, q: [{m: '0201', d: 'Oct 2026', t: 'One sachet per bottle. No measuring at the trailhead.'}, {m: '0158', d: 'Aug 2026', t: 'Light citrus, not sweet. The box fits in a door pocket.'}]},
  {id: '02-2', r: 4.6, n: 52, q: [{m: '0317', d: 'Sep 2026', t: 'Mixes in a shaker with no clumps. The vanilla is light.'}]},
  {id: '08-1', r: 4.6, n: 19, q: [{m: '0088', d: 'Oct 2026', t: 'The dropper gives a clean three drops. Thin texture, no scent I could notice.'}]},
  {id: '09-1', r: 4.5, n: 37, q: [{m: '0263', d: 'Sep 2026', t: 'No smell when the tin opens. Softgels are a normal size.'}]},
  {id: '07-2', r: 4.4, n: 16, q: [{m: '0405', d: 'Oct 2026', t: 'Capsules are on the large side. The dispatch came two days early.'}]},
  {id: '05-5', r: 4.3, n: 12, q: [{m: '0129', d: 'Aug 2026', t: 'Thick in the jar, softens with warm hands. The lid has a good weight to it.'}]}
];
export const reviewOf = id => REVIEWS.find(r => r.id === id) || null;

/* SAMPLE: the dispatch history (Dispatches) */
export const PAST = [
  {no: 'D-0412', d: '2026-10-16', items: [['03-1', 1], ['01-1', 1], ['04-1', 2]], st: 'Delivered'},
  {no: 'D-0388', d: '2026-09-18', items: [['03-1', 1], ['09-1', 1]], st: 'Delivered'},
  {no: 'D-0361', d: '2026-08-14', items: [['01-1', 1], ['07-2', 1], ['08-1', 1]], st: 'Delivered'}
];
/* SAMPLE: the member's record */
export const MEMBER = {no: '0047-118', since: '2026-03-12', name: 'A. Member', email: 'member@example.com', city: 'Toronto, ON', post: 'M5V 0A0', key: 'NFC key, card 0047'};

/* New Entries: the most recent additions to the Formulary (dates are SAMPLE) */
export const NEW = [['07-6', '2026-10-24'], ['04-6', '2026-10-02'], ['06-6', '2026-09-19'], ['02-6', '2026-09-05'], ['08-6', '2026-08-22'], ['09-6', '2026-08-08']];

/* Field Notes: short editorial pieces about using the Formulary. Plain, descriptive, no claims. */
export const NOTES = [
  {no: '007', d: '2026-10-12', t: 'Per serving, not per pack', min: 3, x: 'Every amount in the Dossier is listed against one serving, because that is what you take.',
    b: ['A pack of 120 capsules with 2 capsules a serving holds 60 servings. The amounts in the ingredients table are for those 2 capsules together, not for one capsule and not for the whole tin.', 'Where a product uses a scoop, the serving is given in grams first and the number of servings in the pack second, so the arithmetic is already done.']},
  {no: '006', d: '2026-09-28', t: 'mcg, mg, g, IU', min: 2, x: 'Four units, and how to read them side by side.',
    b: ['1 g is 1,000 mg, and 1 mg is 1,000 mcg. Vitamins with very small amounts (B12, D3, K2, biotin) are listed in mcg; minerals mostly in mg; powders in g.', 'We list vitamin D in mcg. If you are used to IU, 25 mcg of vitamin D3 is 1,000 IU.']},
  {no: '005', d: '2026-09-10', t: 'Reading a PR6 label', min: 3, x: 'The code, the format, the serving and the batch: what each line on the pack is for.',
    b: ['The code (03-1) is the collection and the position in it. The format line tells you what is inside and how many. The batch code (2610-031A) is printed on the base and matches the certificate Member Liaison can send you.', 'The orange mark at the end of the five rules on every pack has no meaning beyond marking the front.']},
  {no: '004', d: '2026-08-21', t: 'Storing the range', min: 2, x: 'Below 25 °C, dry, out of direct light, lids closed.',
    b: ['Tins and pouches keep their contents dry if they are closed after use. A bathroom is the worst place in most homes; a kitchen cupboard away from the stove is better.', 'Serums and creams prefer the same: cool, dark and closed.']},
  {no: '003', d: '2026-08-02', t: 'One-off, or Your Protocol', min: 3, x: 'How the subscription works: every 30, 60 or 90 days, change or skip from Dispatches.',
    b: ['A one-off order is sent once. A line in Your Protocol is sent again on the frequency you choose, at the subscription price shown in the Dossier.', 'You can change the frequency, skip one dispatch, or remove a line at any time before Thursday 12:00 of the dispatch week.']},
  {no: '002', d: '2026-07-15', t: 'Packing for a session', min: 2, x: 'Sachets for the bag, tins for the shelf.',
    b: ['The sachet formats exist so that nothing has to be measured away from home. The tins are made to be refilled from the counter, not carried.']},
  {no: '001', d: '2026-07-01', t: 'Why a key', min: 2, x: 'The Formulary is private. The key is how members open it.',
    b: ['Each member has a card with an NFC chip. Holding it to a phone opens this site already unlocked. If you lose it, Member Liaison can issue a new one and retire the old code.']}
];

export const fmtDate = (iso, o = {}) => { const d = new Date(iso + 'T12:00:00'); return d.toLocaleDateString('en-GB', Object.assign({day: 'numeric', month: 'short', year: 'numeric'}, o)).toUpperCase().replace(/\./g, '').replace('SEPT', 'SEP'); };
