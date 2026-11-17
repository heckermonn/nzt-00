// PR6 / Institute: the institutional facts the blueprint sets out (generations, rights, tokens, standings).
// "Proposed" items are marked as such wherever they are shown; none is a commitment until signed off.

// What each insignia looks like, in words. Doors and seals are matched by description, never by name:
// the name is first given in the member's Archive.
export const DESC = {
  ouroboros: 'a serpent bent into a ring, taking its own tail',
  djed: 'an upright pillar crossed by four bars',
  scarab: 'a beetle with spread wings, holding a disc above its head',
  shen: 'a ring standing on a straight bar',
};

export const GENERATIONS = [
  { n: 'I', name: 'The First Record', cap: '200', status: 'Open. Cap established.' },
  { n: 'II', name: 'The Horizon', cap: '500', status: 'Not open. Name and symbols provisional.' },
  { n: 'III', name: 'The Construct', cap: '2,000', status: 'Not open. Name and symbols provisional.' },
];

export const RIGHTS = [
  ['Recognition', 'Permanent Generation I designation in your Archive.', 'Subject to lawful privacy and record-retention rights.'],
  ['Standard membership fee', 'Waived if a paid standard digital tier is ever introduced.', 'Products, shipping, third-party services and premium offers are not included.'],
  ['Early registration', 'A 72-hour head start on selected event and release registrations.', 'No guaranteed inventory and no clinical priority.'],
  ['Support', 'Priority routing, with a first reply targeted within two business days.', 'Depends on staffing being confirmed.'],
  ['Card replacement', 'One complimentary standard replacement.', 'Delivery region and activation controls to be defined.'],
  ['Archive and updates', 'A founding archive and an annual institutional update.', 'Available whether or not you ever order.'],
  ['Consultation', 'An invitation to give feedback on major developments.', 'No ownership and no formal governance power.'],
];

export const TOKENS = [
  ['threshold', 'The Threshold', 'Admission.'],
  ['continuity', 'Continuity', 'A membership anniversary.'],
  ['signal', 'The Signal', 'A recognised contribution.'],
  ['architect', 'The Architect', 'Extraordinary constructive work.'],
];

export const STANDINGS = ['Member', 'Custodian', 'Steward'];
export const CARD = { 'not-issued': 'Not issued', processing: 'Processing', active: 'Active', replaced: 'Replaced' };
export const ORDER_STATE = ['Received', 'Verified', 'Packed', 'Shipped', 'Delivered'];
export const ORDER_NOTE = [
  'We have your order. A person checks it before anything is packed.',
  'Checked against the record for each item. Packing is next.',
  'Packed and sealed. Waiting for the carrier.',
  'With the carrier. Tracking is live.',
  'Delivered.',
];
