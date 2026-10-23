import { useEffect, useRef, useState } from 'react';
import { commerce, useCart } from '../commerce/cart';
import { printSound } from '../audio/sound';

const money = (n: number) => `$${n.toFixed(0)}`;

/** the dispensing record prints out of a slot each time a formula is dispensed; it is the cart's receipt view */
export function DispenseRecord() {
  const printed = useCart((s) => s.printed), cart = useCart((s) => s.cart), setOpen = useCart((s) => s.setOpen);
  const rec = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!printed || !rec.current) return;
    const r = rec.current; r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); printSound();
  }, [printed]);
  if (!printed) return null;
  return (
    <>
      <div className="slot" />
      <button type="button" className="record" ref={rec} onClick={() => setOpen(true)} aria-live="polite" aria-label="Dispensing record, open protocol">
        <div>NZT-00 · Dispensing record</div>
        <div className="steel">Lot 26-10-A · {commerce.name} cart</div>
        {cart?.lines.map((l) => <div key={l.id}><div className="ln"><span>{l.code} {l.title} × {l.quantity}</span><span>{money(l.price.amount * l.quantity)}</span></div><div className="steel">1 capsule daily · 30 days</div></div>)}
        <div className="ln"><span>Monthly total</span><span>{money(cart?.subtotal.amount ?? 0)}</span></div>
        <div className="bc" aria-hidden="true" />
      </button>
    </>
  );
}

/** cart drawer, styled as the full protocol sheet */
export function CartDrawer() {
  const { open, setOpen, cart, setQty, remove, busy } = useCart();
  const [note, setNote] = useState('');
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [setOpen]);
  useEffect(() => { if (!open) setNote(''); }, [open]);
  const checkout = () => {
    if (!cart) return;
    if (cart.emulated) setNote('Checkout is emulated in this build. With Shopify connected, this button goes to the hosted checkout.');
    else location.href = cart.checkoutUrl;
  };
  return (
    <div className={`drawer${open ? ' open' : ''}`} aria-hidden={!open}>
      <button type="button" className="scrim" aria-label="Close protocol" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
      <aside className="sheet" role="dialog" aria-modal="true" aria-label="Your protocol">
        <div className="sheet-head"><span className="mono kick">Your protocol · {commerce.name}</span><button className="chip" type="button" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>Close</button></div>
        <h2>Protocol</h2>
        {!cart?.lines.length && <p className="steel">Nothing dispensed yet. Pick a formula at the dispensing tray.</p>}
        <ul className="lines">
          {cart?.lines.map((l) => (
            <li key={l.id}>
              <div><span className="mono kick">{l.code}</span><b>{l.title}</b><span className="mono steel">1 capsule daily · {money(l.price.amount)}/mo</span></div>
              <div className="qty">
                <button type="button" tabIndex={open ? 0 : -1} aria-label={`One fewer ${l.title}`} disabled={busy} onClick={() => setQty(l.id, l.quantity - 1)}>−</button>
                <span className="dot">{String(l.quantity).padStart(2, '0')}</span>
                <button type="button" tabIndex={open ? 0 : -1} aria-label={`One more ${l.title}`} disabled={busy} onClick={() => setQty(l.id, l.quantity + 1)}>+</button>
                <button type="button" tabIndex={open ? 0 : -1} className="rm mono" disabled={busy} onClick={() => remove(l.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="price"><span className="mono kick">Monthly total</span><b>{money(cart?.subtotal.amount ?? 0)}</b></div>
        <button className="btn primary" type="button" tabIndex={open ? 0 : -1} disabled={!cart?.lines.length || busy} onClick={checkout}>Checkout</button>
        {note && <p className="note mono">{note}</p>}
      </aside>
    </div>
  );
}
