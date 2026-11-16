// PR6 / Institute: the prototype's stand-in for the services the blueprint names (invitation, identity, membership,
// compass, commerce, nominations, support). Everything lives in this browser's localStorage. In production each
// function here is a server call: the page never decides whether a door is right, an invitation is valid, a record
// can be ordered or an application is approved. Nothing in this file is a security boundary.
import { ORDER as LINEAGES } from './insignia.js';

const KEY = 'pr6.v18';
const now = () => Date.now();
const DAY = 86400000;
const rnd = (n) => { const a = new Uint32Array(n); crypto.getRandomValues(a); return a; };
const pick = (arr) => arr[rnd(1)[0] % arr.length];
const ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const code8 = () => Array.from(rnd(8), (v) => ALPHA[v % ALPHA.length]).join('');
export const fmtCode = (c) => (c || '').replace(/(.{4})(.{4})/, '$1 $2');
export const normCode = (s) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
export const fmtId = (id) => String(id).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

// Demo invitations. One per founding lineage. The code never encodes the insignia.
const SEED = () => ({
  '0047RSRV': { symbol: 'ouroboros' },
  '7K2MQ9DX': { symbol: 'djed' },
  'R4VN81TC': { symbol: 'scarab' },
  'H6PZ3W5L': { symbol: 'shen' },
});
export const DEMO_CODES = Object.keys(SEED());
/** The seal on each sample invitation's card (for the prototype panel only: there are no real cards for them). */
export const DEMO_SEALS = Object.fromEntries(Object.entries(SEED()).map(([c, o]) => [c, o.symbol]));

const fresh = () => ({
  v: 3,
  invitations: Object.fromEntries(Object.entries(SEED()).map(([c, o]) => [c, { code: c, symbol: o.symbol, state: 'issued', sponsor: null, issued: now() }])),
  current: null,          // invitation code being used in this browser (pre-membership)
  applications: {},       // by invitation code
  members: {},            // by member id
  session: null,          // member id signed in
  prefs: { motion: 'auto', sound: false },
  log: [],
});

let db;
function read() {
  try { const o = JSON.parse(localStorage.getItem(KEY)); if (o && o.v === 3) return o; } catch (e) { /* fall through */ }
  return fresh();
}
function write() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* private mode: keep in memory */ } }
db = read();
const audit = (what, detail = {}) => { db.log.push({ t: now(), what, ...detail }); if (db.log.length > 200) db.log.shift(); };

async function digest(s) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');
  } catch (e) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0; return 'x' + h; }
}

export const store = {
  get prefs() { return db.prefs; },
  setPref(k, v) { db.prefs[k] = v; write(); },
  reset() { const p = db.prefs; db = fresh(); db.prefs = p; write(); },
  exportAll() { return JSON.parse(JSON.stringify(db)); },

  // ------------------------------------------------------------ invitation service
  invitation() { return db.current ? db.invitations[db.current] : null; },
  /** Validate an invitation credential. Returns {ok, reason, inv}. */
  validate(raw) {
    const code = normCode(raw);
    const inv = db.invitations[code];
    if (!inv) { audit('invite.unknown'); return { ok: false, reason: 'unknown' }; }
    if (inv.state === 'revoked') return { ok: false, reason: 'revoked' };
    if (inv.state === 'accepted') return { ok: false, reason: 'used' };
    // an invitation that already carries an application belongs to the applicant: opening it again takes their sign-in
    if ((inv.state === 'applied' || inv.state === 'approved') && db.current !== code) return { ok: true, needsAuth: true, code };
    if (inv.lockUntil && inv.lockUntil > now()) { db.current = code; write(); return { ok: true, locked: true, inv }; }
    if (inv.state === 'issued') {
      inv.state = 'validated';
      // the other door: one alternative insignia, and which side the right door is on, drawn fresh per validation
      inv.alt = pick(LINEAGES.filter((s) => s !== inv.symbol));
      inv.side = pick(['L', 'R']);
    }
    db.current = code; audit('invite.validated', { code }); write();
    return { ok: true, inv };
  },
  async openApplication(code, email, password) {
    const a = db.applications[code];
    if (!a || a.email !== (email || '').trim().toLowerCase() || a.pass !== await digest(code + '|' + password)) { audit('application.signin.failed'); return { ok: false }; }
    db.current = code; write(); return { ok: true, inv: db.invitations[code] };
  },
  leaveInvitation() { db.current = null; write(); },
  /** The two doors for this visit: [{side, symbol}]. Sides can swap between visits. */
  doors(reshuffle = false) {
    const inv = this.invitation(); if (!inv) return null;
    if (reshuffle) { inv.side = pick(['L', 'R']); write(); }
    return inv.side === 'L' ? { L: inv.symbol, R: inv.alt } : { L: inv.alt, R: inv.symbol };
  },
  /** The confirmed door choice. The comparison happens here ("on the server"), never in the animation. */
  chooseDoor(side) {
    const inv = this.invitation(); if (!inv) return { ok: false };
    if (inv.lockUntil && inv.lockUntil > now()) return { ok: false, locked: true, until: inv.lockUntil };
    const chosen = this.doors()[side];
    const ok = chosen === inv.symbol;
    audit('door.choice', { code: inv.code, ok });
    if (ok) { inv.state = 'door'; inv.doorSide = side; delete inv.lockUntil; }
    else { inv.lockUntil = now() + DAY; inv.wrong = (inv.wrong || 0) + 1; }
    write();
    return { ok, until: inv.lockUntil };
  },
  lock() { const inv = this.invitation(); return inv && inv.lockUntil && inv.lockUntil > now() ? inv.lockUntil : 0; },
  clearLock() { const inv = this.invitation(); if (inv) { delete inv.lockUntil; inv.side = pick(['L', 'R']); audit('door.lock.cleared'); write(); } },
  keeperAnswer(a) { const inv = this.invitation(); if (inv) { inv.pursuit = a; if (inv.state === 'door') inv.state = 'keeper'; write(); } },

  // ------------------------------------------------------------ application + review
  application() { return db.current ? db.applications[db.current] || null : null; },
  async apply(f) {
    const inv = this.invitation(); if (!inv) return { ok: false };
    const ref = 'A-26-' + String(rnd(1)[0] % 1000000).padStart(6, '0');
    db.applications[inv.code] = {
      ref, name: f.name.trim(), email: f.email.trim().toLowerCase(), pass: await digest(inv.code + '|' + f.password), passkey: !!f.passkey,
      interests: f.interests || '', consents: f.consents, submitted: now(), status: 'review', updates: [{ t: now(), what: 'Application received' }],
    };
    inv.state = 'applied'; audit('application.submitted', { ref }); write();
    return { ok: true, ref };
  },
  updateContact(email) { const a = this.application(); if (a) { a.email = email.trim().toLowerCase(); a.updates.push({ t: now(), what: 'Contact email updated' }); write(); } },
  /** Prototype stand-in for the human review. */
  decide(decision) {
    const a = this.application(), inv = this.invitation(); if (!a) return;
    a.status = decision; a.decided = now();
    a.updates.push({ t: now(), what: decision === 'approved' ? 'Review complete: an offer of membership has been made' : 'Review complete: not approved at this time' });
    if (decision === 'approved') { a.offerUntil = now() + 7 * DAY; inv.state = 'approved'; }
    audit('application.decided', { ref: a.ref, decision }); write();
  },
  acceptOffer() {
    const a = this.application(), inv = this.invitation(); if (!a || a.status !== 'approved') return null;
    let id; do { id = String(100000000 + (rnd(1)[0] % 900000000)); } while (db.members[id]);
    const initials = a.name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 3).join('').toUpperCase() || 'M';
    db.members[id] = {
      id, name: a.name, initials, email: a.email, pass: a.pass, passSalt: inv.code, passkey: a.passkey, lineage: inv.symbol, generation: 1, standing: 'Member',
      admitted: now(), tokens: [{ id: 'threshold', t: now() }], card: 'not-issued', nominationsOpen: false, nominations: [],
      orders: [], cart: [], saved: [], compass: null, compassConsent: !!(a.consents && a.consents.compass), sponsor: inv.sponsor || null,
      filmSeen: false, tickets: [], rights: 'active',
    };
    a.status = 'accepted'; inv.state = 'accepted'; inv.member = id;
    db.session = id; db.current = null; audit('member.accepted', { id }); write();
    return db.members[id];
  },

  // ------------------------------------------------------------ identity
  member() { return db.session ? db.members[db.session] : null; },
  hasMembers() { return Object.keys(db.members).length > 0; },
  async signIn(email, password) {
    const e = (email || '').trim().toLowerCase();
    if (/^\d[\d\s]{7,}$/.test(e)) return { ok: false, reason: 'member-number' };
    const m = Object.values(db.members).find((x) => x.email === e);
    if (!m) return { ok: false, reason: 'no-match' };
    if (m.pass !== await digest(m.passSalt + '|' + password)) { audit('signin.failed'); return { ok: false, reason: 'no-match' }; }
    db.session = m.id; audit('signin.ok', { id: m.id }); write();
    return { ok: true, member: m };
  },
  signOut() { db.session = null; write(); },
  /** Prototype only: the codes a nominee would receive by post. */
  issuedCodes() { return Object.values(db.invitations).filter((i) => i.sponsor && i.state !== 'revoked' && i.state !== 'accepted').map((i) => i.code); },
  lastLog(n = 12) { return db.log.slice(-n).reverse(); },
  async setPassword(password) { const m = this.member(); m.pass = await digest(m.passSalt + '|' + password); audit('password.changed'); write(); },
  save() { write(); },

  // ------------------------------------------------------------ commerce
  placeOrder(lines, total, address) {
    const m = this.member(); if (address) m.address = address;
    const id = 'PR6-' + String(26000 + (rnd(1)[0] % 9000));
    const first = m.orders.length === 0;
    m.orders.unshift({ id, placed: now(), lines, total, state: 0, track: 'SAMPLE-' + code8() });
    m.cart = [];
    if (first) { m.card = 'processing'; m.nominationsOpen = true; }
    audit('order.placed', { id }); write();
    return { id, first };
  },
  advanceOrder(id) { const o = this.member().orders.find((x) => x.id === id); if (o && o.state < 4) { o.state++; if (o.state === 4 && this.member().card === 'processing') this.member().card = 'active'; write(); } },

  // ------------------------------------------------------------ nominations
  nominate(name, email, physical) {
    const m = this.member();
    if (!m.nominationsOpen || m.nominations.filter((n) => n.state !== 'revoked-unused').length >= 5) return null;
    let code; do { code = code8(); } while (db.invitations[code]);
    db.invitations[code] = { code, symbol: pick(LINEAGES), state: 'issued', sponsor: m.id, issued: now() };
    const n = { id: 'N-' + (m.nominations.length + 1), name, email, physical: !!physical, code, state: 'issued', t: now() };
    m.nominations.push(n); audit('nomination.issued', { by: m.id }); write();
    return n;
  },
  nominationState(n) {
    const inv = db.invitations[n.code];
    if (n.state === 'revoked-unused') return 'withdrawn, returned to your allowance';
    if (!inv) return 'revoked';
    if (inv.state === 'revoked') return 'revoked';
    if (inv.state === 'accepted') return 'admitted';
    if (inv.state === 'issued') return 'issued';
    return 'in progress';
  },
  revoke(nid) {
    const m = this.member(); const n = m.nominations.find((x) => x.id === nid); if (!n) return;
    const inv = db.invitations[n.code];
    // an invitation withdrawn before anyone opened it goes back to the allowance; once opened it stays counted
    if (inv && inv.state !== 'accepted') { n.state = inv.state === 'issued' ? 'revoked-unused' : 'revoked'; inv.state = 'revoked'; audit('nomination.revoked'); write(); }
  },

  // ------------------------------------------------------------ support
  ticket(topic, message) {
    const m = this.member(); const who = m || this.application() || {};
    const ref = 'S-' + String(rnd(1)[0] % 100000).padStart(5, '0');
    const t = { ref, topic, message, t: now(), state: 'open' };
    if (m) { m.tickets.unshift(t); }
    audit('support.ticket', { ref, by: who.email || 'visitor' }); write();
    return t;
  },
};
