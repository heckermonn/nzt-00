/** Synthesised lab sound: a low room hum plus instrument blips. Off until the visitor turns it on. */
let ac: AudioContext | null = null, hum: GainNode | null = null, on = false;

export function setSound(enabled: boolean) {
  on = enabled;
  if (on && !ac) { try { ac = new AudioContext(); } catch { return; } }
  if (!ac) return;
  if (on && !hum) {
    hum = ac.createGain(); hum.gain.value = 0; hum.connect(ac.destination);
    [55, 110.5, 165].forEach((f, i) => { const o = ac!.createOscillator(); o.frequency.value = f; const g = ac!.createGain(); g.gain.value = [0.05, 0.02, 0.008][i]; o.connect(g).connect(hum!); o.start(); });
  }
  hum?.gain.setTargetAtTime(on ? 0.6 : 0, ac.currentTime, 0.4);
}

export function blip(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.045) {
  if (!ac || !on) return;
  const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + dur + 0.02);
}

export function printSound() {
  blip(140, 0.05, 'triangle', 0.08);
  for (let i = 0; i < 14; i++) setTimeout(() => blip(2400, 0.012, 'square', 0.02), 300 + i * 100);
  setTimeout(() => { blip(1320, 0.08); setTimeout(() => blip(1760, 0.07), 110); }, 1750);
}
