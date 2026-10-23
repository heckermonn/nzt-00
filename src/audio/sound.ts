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

/** one second of white noise, shared by every hiss and fan */
let noise: AudioBuffer | null = null;
const noiseBuf = () => {
  if (!ac) return null;
  if (!noise) { noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return noise;
};

/** filtered noise burst: a seal releasing, gas venting */
export function hiss(dur = 1.2, freq = 3200, vol = 0.12) {
  const b = noiseBuf(); if (!ac || !on || !b) return;
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; s.loop = true; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
  g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(vol, ac.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
  s.connect(f).connect(g).connect(ac.destination); s.start(); s.stop(ac.currentTime + dur + 0.05);
}

/** a bolt seating: low thud with a metallic tick on top */
export function clunk() { blip(70, 0.18, 'sine', 0.22); blip(1900, 0.02, 'square', 0.03); }

/** continuous airflow for the air shower, 0 = still */
let fan: GainNode | null = null;
export function setFans(level: number) {
  const b = noiseBuf(); if (!ac || !b) return;
  if (!fan) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(); fan = ac.createGain(); fan.gain.value = 0;
    s.buffer = b; s.loop = true; f.type = 'lowpass'; f.frequency.value = 900; s.connect(f).connect(fan).connect(ac.destination); s.start();
  }
  fan.gain.setTargetAtTime(on ? level * 0.16 : 0, ac.currentTime, 0.12);
}
