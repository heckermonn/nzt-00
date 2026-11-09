// PR6 / Alley: the light-pass mixer. One square Cycles frame is up to twelve light groups, packed three to a webp as
// luminance; the shader decodes each, tints it, weights it (the page animates the weights) and sums in linear light.
// Two frames are bound at once so a footstep can cross from one camera position to the next.
const VS = `attribute vec2 p; varying vec2 vS; void main(){ vS = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
varying vec2 vS;
uniform sampler2D uA0,uA1,uA2,uA3,uB0,uB1,uB2,uB3;
uniform vec3 uKA[12]; uniform vec3 uKB[12];
uniform vec2 uSpan; uniform vec2 uC; uniform vec2 uVP; uniform float uZA, uZB, uMix, uRoll, uGamma;
uniform float uExpo, uTime, uRain, uGrain, uVig, uSteam, uDark, uLift, uWhite, uInside;
uniform vec3 uWhiteC;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
vec3 dec(vec4 t){ return pow(t.rgb, vec3(uGamma)); }
vec3 frame(sampler2D t0, sampler2D t1, sampler2D t2, sampler2D t3, vec3 K[12], vec2 uv){
  if (uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) return vec3(0.);
  vec3 a = dec(texture2D(t0, uv)), b = dec(texture2D(t1, uv)), c = dec(texture2D(t2, uv)), d = dec(texture2D(t3, uv));
  if (uSteam > 0.) {   // the plume drifts: re-sample its pass through slowly rising noise
    vec2 q = uv*vec2(9., 6.) + vec2(0., uTime*.35);
    vec2 off = (vec2(vn(q), vn(q+17.3)) - .5) * .018 * uSteam;
    b.r = dec(texture2D(t1, uv + off + vec2(0., .004))).r;
  }
  return K[0]*a.r + K[1]*a.g + K[2]*a.b + K[3]*b.r + K[4]*b.g + K[5]*b.b + K[6]*c.r + K[7]*c.g + K[8]*c.b + K[9]*d.r + K[10]*d.g + K[11]*d.b;
}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
void main(){
  vec2 s = vS - .5;
  float cr = cos(uRoll), sr = sin(uRoll);
  vec2 base = uC + mat2(cr, -sr, sr, cr) * (s * uSpan);
  vec2 uvA = uVP + (base - uVP) / uZA;
  vec2 uvB = uVP + (base - uVP) / uZB;
  vec3 col = frame(uA0,uA1,uA2,uA3,uKA,uvA);
  if (uMix < .999) col = mix(frame(uB0,uB1,uB2,uB3,uKB,uvB), col, uMix);
  // rain: three sheets of thin streaks, lit by what is behind them
  if (uRain > 0.) {
    float lum = dot(col, vec3(.3,.5,.2));
    float r = 0.;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 p = vS * vec2(1., 1.) ; p.x += p.y * .07;
      float n = 70. + fi * 55.;
      float cx = floor(p.x * n);
      float rnd = h21(vec2(cx, fi));
      float sp = 1.6 + rnd * 1.2 + fi * .4;
      float y = fract(p.y * (1.4 - fi*.25) - uTime * sp + rnd * 7.);
      float len = .10 - fi * .025;
      float seg = smoothstep(0., .01, y) * smoothstep(len, 0., y);
      float x = abs(fract(p.x * n) - .5);
      float w = smoothstep(.12 - fi*.03, 0., x);
      r += seg * w * step(.72 + fi*.08, rnd) * (1. - fi*.25);
    }
    col += r * uRain * (.02 + lum * 1.6) * vec3(1., .75, .85);
  }
  col *= uExpo;
  col = aces(col);
  col = pow(col, vec3(1./2.2));
  col = mix(col, col * vec3(.96, .98, 1.04) + vec3(.004, .006, .012), uLift);
  // vignette, grain
  float v = smoothstep(1.15, .25, length(s * vec2(uSpan.x/uSpan.y, 1.) * 1.25));
  col *= mix(1., v, uVig);
  col += (h21(vS * 913. + fract(uTime * 7.3)) - .5) * uGrain;
  col *= 1. - uDark;
  col = mix(col, uWhiteC, uWhite);
  gl_FragColor = vec4(col, 1.);
}`;

export function createScene(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const u = gl.getActiveUniform(pr, i); const nm = u.name.replace(/\[0\]$/, ''); U[nm] = gl.getUniformLocation(pr, u.name); }
  ['uA0', 'uA1', 'uA2', 'uA3', 'uB0', 'uB1', 'uB2', 'uB3'].forEach((nm, i) => gl.uniform1i(U[nm], i));
  const black = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, black);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));

  const texCache = new Map();   // url -> texture
  function tex(img) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  const S = {
    gl, canvas, set: null, A: null, B: null, mix: 1, zA: 1, zB: 1, roll: 0, c: [0.5, 0.5], vp: [0.5, 0.45],
    expo: 1, rain: 0, grain: 0.035, vig: 0.8, steam: 0, dark: 0, lift: 0, white: 0, whiteC: [0.95, 0.953, 0.937],
    weights: {}, tint: {}, span: [1, 1], cw: 1, ch: 1, shift: 0,
  };
  // a "set" = { base, man } ; frames load on demand
  S.useSet = (set) => { S.set = set; };
  S.load = (set, fr) => {
    const key = set.base + fr;
    if (texCache.has(key)) return texCache.get(key);
    const k = set.man.pack.length;
    const p = Promise.all(Array.from({ length: k }, (_, i) => new Promise((res, rej) => {
      const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = `${set.base}${fr}_${i}.webp`;
    }))).then((ims) => { const ts = ims.map(tex); const o = { fr, ts, info: set.man.frames[fr], set }; ready.set(key, o); return o; });
    texCache.set(key, p); return p;
  };
  const ready = new Map();
  S.get = (set, fr) => ready.get(set.base + fr) || null;

  function K(F) {
    const out = new Float32Array(36);
    if (!F) return out;
    const pk = F.set.man.pack;
    pk.forEach((trio, img) => trio.forEach((g, ch) => {
      const P = F.info.passes[g]; if (!P) return;
      const w = S.weights[g] || 0; const sc = w / P.scale; const j = (img * 3 + ch) * 3;
      const tn = S.tint[g] || P.tint;
      out[j] = tn[0] * sc; out[j + 1] = tn[1] * sc; out[j + 2] = tn[2] * sc;
    }));
    return out;
  }
  S.resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const asp = canvas.clientWidth / Math.max(1, canvas.clientHeight);
    S.span = asp >= 1 ? [1, 1 / asp] : [asp, 1];
    S.cw = canvas.clientWidth; S.ch = canvas.clientHeight;
  };
  // image uv (y down) -> CSS px, for the current frame's transform
  S.toScreen = (u, v) => {
    const x = S.vp[0] + (u - S.vp[0]) * S.zA - S.c[0], y = S.vp[1] + (v - S.vp[1]) * S.zA - S.c[1];
    const cr = Math.cos(-S.roll), sr = Math.sin(-S.roll);
    const rx = cr * x - sr * y, ry = sr * x + cr * y;
    return [(rx / S.span[0] + 0.5) * S.cw, (ry / S.span[1] + 0.5) * S.ch];
  };
  S.pxPerImage = () => S.cw / S.span[0] * S.zA;   // CSS px per 1.0 of image uv
  S.draw = (time) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const A = S.A, B = S.B || S.A;
    for (let i = 0; i < 4; i++) {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, (A && A.ts[i]) || black);
      gl.activeTexture(gl.TEXTURE4 + i); gl.bindTexture(gl.TEXTURE_2D, (B && B.ts[i]) || black);
    }
    gl.uniform3fv(U.uKA, K(A)); gl.uniform3fv(U.uKB, K(B));
    gl.uniform2fv(U.uSpan, S.span); gl.uniform2fv(U.uC, S.c); gl.uniform2fv(U.uVP, S.vp);
    gl.uniform1f(U.uZA, S.zA); gl.uniform1f(U.uZB, S.zB); gl.uniform1f(U.uMix, S.B ? S.mix : 1); gl.uniform1f(U.uRoll, S.roll);
    gl.uniform1f(U.uGamma, (A && A.set.man.gamma) || 2.8);
    gl.uniform1f(U.uExpo, S.expo); gl.uniform1f(U.uTime, time); gl.uniform1f(U.uRain, S.rain); gl.uniform1f(U.uGrain, S.grain);
    gl.uniform1f(U.uVig, S.vig); gl.uniform1f(U.uSteam, S.steam); gl.uniform1f(U.uDark, S.dark); gl.uniform1f(U.uLift, S.lift);
    gl.uniform1f(U.uWhite, S.white); gl.uniform3fv(U.uWhiteC, S.whiteC);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return S;
}
