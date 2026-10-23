import { useRef } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { FORMULAS, type Formula } from '../data/formulas';
import { lab, useUI } from '../state/lab';
import { useCart } from '../commerce/cart';
import { blip } from '../audio/sound';

function Facts({ f }: { f: Formula }) {
  return (
    <div className="facts">
      <div className="t">Supplement Facts</div>
      <div className="r"><span>Serving Size 1 Capsule</span></div>
      <div className="r ln"><span>Servings Per Container 30</span></div>
      <div className="r hd"><span>Amount Per Serving</span><span>% Daily Value</span></div>
      {f.rows.map((r) => <div key={r[0]} className="r ln"><span><b>{r[0]}</b></span><span className="num">{r[1]}&nbsp; {r[2]}</span></div>)}
      <div className="ft">† Daily Value not established. Sample formula, not final doses.</div>
    </div>
  );
}

function Hero() {
  const h1 = useRef<HTMLHeadingElement>(null);
  // the headline types on in hard steps, like a label printer
  useGSAP(() => {
    if (lab.reduce || !h1.current) return;
    gsap.from(h1.current.querySelectorAll('.lt'), { opacity: 0, duration: 0.01, stagger: 0.035, delay: 0.4 });
  }, { scope: h1 });
  const split = (s: string) => [...s].map((c, i) => <span key={i} className="lt">{c}</span>);
  return (
    <section className="ch hero" data-ch="0" id="top">
      <div className="in">
        <div className="meta">
          <p>Supplements engineered like lab specimens. Four formulas, measured to the milligram, assayed in glass and sealed in aluminium. Move through the capsules.</p>
          <span className="mono cue"><i />Scroll to begin the protocol</span>
        </div>
        <h1 ref={h1} aria-label="Measured in milligrams"><span aria-hidden="true">{split('Measured')}</span><span className="o" aria-hidden="true">{split('in milligrams')}</span></h1>
      </div>
    </section>
  );
}

function Formulary() {
  return (
    <section className="ch formulary" data-ch="1" aria-label="Formulary">
      {FORMULAS.map((f) => (
        <div className="f" key={f.id} data-card>
          <article className="card sticky">
            <span className="mono kick">01 · Formulary · {f.code} · {f.shape} formation</span>
            <h2>{f.name}</h2>
            <p>{f.line}</p>
            <div className="spec">{f.rows.map((r) => [<span key={r[0]}>{r[0].split(' (')[0]}</span>, <span key={r[0] + 'x'} />, <span key={r[0] + 'a'}>{r[1]}</span>])}</div>
            <div className="price"><span className="mono kick">30 capsules · monthly</span><b>${f.price}</b></div>
          </article>
        </div>
      ))}
    </section>
  );
}

function Dispense() {
  const picked = useUI((s) => s.picked), pick = useUI((s) => s.pick);
  const add = useCart((s) => s.add), busy = useCart((s) => s.busy);
  const f = FORMULAS[picked];
  const dispense = async () => {
    const w = lab.nextWell % 30; lab.wells[w] = picked; lab.nextWell++; lab.wellsVersion++; lab.trayIndex++; lab.lastWell = w; lab.wellFlash = 3;
    const code = document.getElementById('wellCode'), name = document.getElementById('wellName');
    if (code) code.textContent = `W-${String(w + 1).padStart(2, '0')}`; if (name) name.textContent = `${f.name} · dispensed`;
    await add(f.id);
  };
  return (
    <section className="ch dispense" data-ch="5" id="dispense">
      <div className="gap" />
      <article className="card sticky r">
        <span className="mono kick">05 · Dispense · Lot 26-10-A</span>
        <h2>Build your protocol.</h2>
        <p>Pick a formula and dispense it. The tray indexes one well per formula and your dispensing record prints. That record is the cart.</p>
        <div className="pick" role="group" aria-label="Formula">
          {FORMULAS.map((x, i) => (
            <button key={x.id} type="button" aria-pressed={i === picked} onClick={() => { pick(i); blip(520, 0.05); }}><small>{x.code} · ${x.price}/mo</small><b>{x.name}</b></button>
          ))}
        </div>
        <div className="row"><button className="btn primary" type="button" disabled={busy} onClick={dispense}>Dispense · ${f.price}/mo</button></div>
      </article>
    </section>
  );
}

export function Chapters() {
  return (
    <main>
      <Hero />
      <Formulary />
      <section className="ch specimen" data-ch="2">
        <div className="gap" />
        <article className="card sticky">
          <span className="mono kick">02 · Cross-section · Specimen 137</span>
          <h2>One capsule, cut open.</h2>
          <p>Size 00, 23.3 by 8.5 millimetres. Pulled from the formation and sectioned so you can see what is inside it: the formula, and nothing else. No fillers, no flow agents.</p>
          <Facts f={FORMULAS[3]} />
        </article>
      </section>
      <section className="ch bench" data-ch="3">
        <div className="gap" />
        <article className="card sticky r">
          <span className="mono kick">03 · Assay bench · 12 ingredients</span>
          <h2>Assayed before it is a capsule.</h2>
          <p>Every raw ingredient is held in its own vial and tested three ways: identity, purity, potency. If a lot misses its number by more than two percent, it never reaches the encapsulator.</p>
          <div className="spec"><span>ID</span><span>FTIR fingerprint</span><span>Pass</span><span>Purity</span><span>Heavy metals · microbes</span><span>&lt; limit</span><span>Potency</span><span>HPLC</span><span>±2.0%</span></div>
          <p className="mono kick">Hover a vial to read it</p>
        </article>
      </section>
      <section className="ch pack" data-ch="4">
        <div className="gap" />
        <article className="card sticky">
          <span className="mono kick">04 · Seal · Aluminium and foil</span>
          <h2>Nothing gets in.</h2>
          <p>Sixty capsules in a machined aluminium tin that blocks light completely. Refills arrive in a vacuum-sealed foil pouch with nitrogen headspace, so the last capsule tests like the first.</p>
          <div className="spec"><span>Tin</span><span>Anodised aluminium</span><span>56 × 24 × 84 mm</span><span>Refill</span><span>Foil laminate · N₂ flush</span><span>90 × 130 mm</span><span>Light</span><span>Transmission</span><span>0.0%</span></div>
          <p className="mono kick">Drag to turn the pouch</p>
        </article>
      </section>
      <Dispense />
    </main>
  );
}

export function Footer() {
  return (
    <footer>
      <div className="big">NZT-00</div>
      <div className="cols mono"><span>Lot 26-10-A</span><span>Clean room 00 · ISO class 5</span><span>Concept build · not for sale</span></div>
      <p>Formulas, doses and prices on this page are placeholders for the concept, not the owner's final numbers. These statements have not been evaluated by the Food and Drug Administration.</p>
    </footer>
  );
}
