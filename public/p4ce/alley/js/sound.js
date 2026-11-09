// PR6 / Alley: all sound is synthesised here (no recordings). Two worlds on two buses:
// CITY (rain, rumble, machinery, a failing tube, the hologram's data) cuts to nothing in one sample when the code is right.
// INSIDE (dry room tone, clean steps in a long hard room) fades in after the door.
export function createSound() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ac = new AC();
  const master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
  const city = ac.createGain(); city.gain.value = 0; city.connect(master);
  const inside = ac.createGain(); inside.gain.value = 0; inside.connect(master);

  const SR = ac.sampleRate;
  function noiseBuf(sec, kind = 'white') {
    const b = ac.createBuffer(2, SR * sec, SR);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let last = 0, b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < d.length; i++) {
        const w = Math.random() * 2 - 1;
        if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
        else if (kind === 'pink') { b0 = 0.997 * b0 + w * 0.029591; b1 = 0.985 * b1 + w * 0.032534; b2 = 0.95 * b2 + w * 0.048056; d[i] = (b0 + b1 + b2 + w * 0.05) * 1.6; }
        else d[i] = w;
      }
    }
    return b;
  }
  // an impulse response: early reflections (alley walls 3.5 m apart) then a decaying tail
  function ir(sec, decay, early = [], bright = 1) {
    const b = ac.createBuffer(2, SR * sec, SR);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c); let lp = 0;
      for (let i = 0; i < d.length; i++) {
        const t = i / SR; const w = Math.random() * 2 - 1;
        lp += (w - lp) * bright; d[i] = lp * Math.pow(1 - t / sec, decay) * 0.5;
      }
      for (const [t, g] of early) { const i = Math.floor((t + c * 0.0013) * SR); if (i < d.length) d[i] += g * (c ? -1 : 1); }
    }
    return b;
  }
  const WHITE = noiseBuf(3), BROWN = noiseBuf(4, 'brown'), PINK = noiseBuf(4, 'pink');
  function loop(buf, dest, gain, filt) {
    const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.loopStart = Math.random();
    const g = ac.createGain(); g.gain.value = gain; let n = s;
    for (const f of filt || []) { const bq = ac.createBiquadFilter(); Object.assign(bq, { type: f[0] }); bq.frequency.value = f[1]; if (f[2]) bq.Q.value = f[2]; n.connect(bq); n = bq; }
    n.connect(g); g.connect(dest); s.start(); return g;
  }

  // ---------------- city bed
  const alleyVerb = ac.createConvolver();
  alleyVerb.buffer = ir(1.6, 3.2, [[0.011, 0.9], [0.021, 0.6], [0.032, 0.45], [0.043, 0.35], [0.064, 0.25]], 0.35);
  const verbIn = ac.createGain(); verbIn.gain.value = 0.55; verbIn.connect(alleyVerb); alleyVerb.connect(city);
  const rain = loop(WHITE, city, 0.05, [['highpass', 900], ['lowpass', 7000]]);
  loop(WHITE, city, 0.018, [['bandpass', 3800, 0.7]]);
  const rumble = loop(BROWN, city, 0.35, [['lowpass', 140]]);
  // distant machinery: two detuned saws, slowly breathing
  const mach = ac.createGain(); mach.gain.value = 0.0; mach.connect(city);
  const mf = ac.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 220; mf.connect(mach);
  for (const f of [46.2, 69.5, 92.9]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const g = ac.createGain(); g.gain.value = 0.25; o.connect(g); g.connect(mf); o.start(); }
  const lfo = ac.createOscillator(); lfo.frequency.value = 0.07; const lg = ac.createGain(); lg.gain.value = 0.012; lfo.connect(lg); lg.connect(mach.gain); lfo.start();
  // the failing tube: a 100 Hz buzz whose level the page drives with the flicker
  const buzz = ac.createGain(); buzz.gain.value = 0; buzz.connect(city);
  { const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 100; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 2; o.connect(bp); bp.connect(buzz); o.start(); }
  // hologram carrier: a thin, slightly unstable tone + data grains
  const holo = ac.createGain(); holo.gain.value = 0; holo.connect(city); holo.connect(verbIn);
  { const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = 1760; const o2 = ac.createOscillator(); o2.frequency.value = 3.3; const g2 = ac.createGain(); g2.gain.value = 9; o2.connect(g2); g2.connect(o.frequency); const g = ac.createGain(); g.gain.value = 0.05; o.connect(g); g.connect(holo); o.start(); o2.start(); }
  { const h = loop(WHITE, holo, 0.12, [['bandpass', 5200, 6]]); h; }

  // occasional far-off metal: a clank in the reverb only
  let clankT = 0;
  function clank(t) {
    const s = ac.createBufferSource(); s.buffer = WHITE; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 400 + Math.random() * 900; bp.Q.value = 12;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    s.connect(bp); bp.connect(g); g.connect(verbIn); s.start(t, Math.random(), 0.6);
  }
  // rain on things nearby: random ticks
  function drip(t) {
    const s = ac.createBufferSource(); s.buffer = WHITE; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800 + Math.random() * 4000; bp.Q.value = 8;
    const g = ac.createGain(); const v = 0.05 + Math.random() * 0.12; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null; let n = g; if (p) { p.pan.value = Math.random() * 2 - 1; g.connect(p); n = p; }
    s.connect(bp); bp.connect(g); n.connect(city); s.start(t, Math.random() * 2, 0.04);
  }

  // ---------------- footsteps
  const shaper = ac.createWaveShaper(); { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(2.6 * x); } shaper.curve = c; }
  const stepBusOut = ac.createGain(); stepBusOut.gain.value = 0.9; shaper.connect(stepBusOut); stepBusOut.connect(city); stepBusOut.connect(verbIn);
  let foot = 0;
  function stepOutside(t, weight = 1) {
    foot ^= 1;
    // heel: a low thud, slightly overdriven by the narrow walls
    const o = ac.createOscillator(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const og = ac.createGain(); og.gain.setValueAtTime(0.0, t); og.gain.linearRampToValueAtTime(0.9 * weight, t + 0.006); og.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(og); og.connect(shaper); o.start(t); o.stop(t + 0.2);
    const n = ac.createBufferSource(); n.buffer = WHITE; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const ng = ac.createGain(); ng.gain.setValueAtTime(0.7 * weight, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    n.connect(lp); lp.connect(ng); ng.connect(shaper); n.start(t, Math.random() * 2, 0.08);
    // the wet slap and grit of the sole rolling off
    const t2 = t + 0.07 + Math.random() * 0.02;
    const s = ac.createBufferSource(); s.buffer = WHITE; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500 + Math.random() * 700; bp.Q.value = 1.2;
    const sg = ac.createGain(); sg.gain.setValueAtTime(0, t2); sg.gain.linearRampToValueAtTime(0.35 * weight, t2 + 0.01); sg.gain.exponentialRampToValueAtTime(0.001, t2 + 0.16);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null; let out = sg; if (p) { p.pan.value = foot ? 0.18 : -0.18; sg.connect(p); out = p; }
    s.connect(bp); bp.connect(sg); out.connect(stepBusOut); s.start(t2, Math.random() * 2, 0.2);
  }

  // ---------------- inside: dry and exact
  const roomVerb = ac.createConvolver(); roomVerb.buffer = ir(2.4, 2.2, [[0.018, 0.4], [0.037, 0.25]], 0.9);
  const roomIn = ac.createGain(); roomIn.gain.value = 0.35; roomIn.connect(roomVerb); roomVerb.connect(inside);
  loop(PINK, inside, 0.03, [['lowpass', 500], ['highpass', 60]]);
  { const o = ac.createOscillator(); o.frequency.value = 50; const g = ac.createGain(); g.gain.value = 0.012; o.connect(g); g.connect(inside); o.start(); }
  function stepInside(t) {
    foot ^= 1;
    const n = ac.createBufferSource(); n.buffer = WHITE; const hp = ac.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 2400; hp.Q.value = 0.9;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32, t + 0.002); g.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null; let out = g; if (p) { p.pan.value = foot ? 0.12 : -0.12; g.connect(p); out = p; }
    n.connect(hp); hp.connect(g); out.connect(inside); out.connect(roomIn); n.start(t, Math.random() * 2, 0.06);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(70, t + 0.05);
    const og = ac.createGain(); og.gain.setValueAtTime(0.18, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    o.connect(og); og.connect(inside); o.start(t); o.stop(t + 0.08);
  }
  function relay(t, pan = 0) {   // a ceiling bank switching on
    const n = ac.createBufferSource(); n.buffer = WHITE; const bp = ac.createBiquadFilter(); bp.type = 'highpass'; bp.frequency.value = 3000;
    const g = ac.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    const p = ac.createStereoPanner ? ac.createStereoPanner() : null; let out = g; if (p) { p.pan.value = pan; g.connect(p); out = p; }
    n.connect(bp); bp.connect(g); out.connect(inside); out.connect(roomIn); n.start(t, Math.random(), 0.03);
  }
  function hiss(t, dur = 1.8) {   // the door: a pneumatic release, then a soft stop
    const n = ac.createBufferSource(); n.buffer = WHITE; const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(5000, t); bp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.22, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(bp); bp.connect(g); g.connect(master); n.start(t, 0, dur + 0.1);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(60, t + dur * 0.9); const og = ac.createGain();
    og.gain.setValueAtTime(0, t + dur * 0.9); og.gain.linearRampToValueAtTime(0.4, t + dur * 0.9 + 0.01); og.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.9 + 0.25);
    o.connect(og); og.connect(master); o.start(t + dur * 0.9); o.stop(t + dur + 0.4);
  }
  function deny(t) {   // the terminal refusing: two low dull tones, no drama
    for (const [dt, f] of [[0, 180], [0.16, 150]]) {
      const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const g = ac.createGain();
      g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(0.16, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.14);
      o.connect(g); g.connect(city); o.start(t + dt); o.stop(t + dt + 0.16);
    }
  }
  function key(t) {
    const o = ac.createOscillator(); o.type = 'square'; o.frequency.value = 2400; const g = ac.createGain();
    g.gain.setValueAtTime(0.03, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.03); o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.04);
  }

  let rafT = 0;
  return {
    ac,
    resume() { return ac.resume(); },
    cityOn(sec = 4) { const t = ac.currentTime; city.gain.cancelScheduledValues(t); city.gain.setValueAtTime(city.gain.value, t); city.gain.linearRampToValueAtTime(1, t + sec); mach.gain.setTargetAtTime(0.05, t + 1, 3); },
    cityCut() { const t = ac.currentTime; city.gain.cancelScheduledValues(t); city.gain.setValueAtTime(0, t); },
    insideOn(sec = 3) { const t = ac.currentTime; inside.gain.setValueAtTime(0, t); inside.gain.linearRampToValueAtTime(1, t + sec); },
    step(outside = true, weight = 1) { const t = ac.currentTime + 0.01; outside ? stepOutside(t, weight) : stepInside(t); },
    holo(v) { holo.gain.setTargetAtTime(v, ac.currentTime, 0.03); },
    buzz(v) { buzz.gain.setTargetAtTime(v * 0.05, ac.currentTime, 0.008); },
    relay(pan) { relay(ac.currentTime + 0.01, pan); },
    hiss() { hiss(ac.currentTime + 0.02); },
    deny() { deny(ac.currentTime + 0.01); },
    key() { key(ac.currentTime); },
    tick(now) {  // called every frame: schedules sparse random events
      if (city.gain.value < 0.01) return;
      const t = ac.currentTime;
      if (t > clankT) { clankT = t + 6 + Math.random() * 14; if (clankT > 4) clank(t + 0.1); }
      if (Math.random() < 0.08) drip(t + Math.random() * 0.05);
      rafT = now;
    },
  };
}
