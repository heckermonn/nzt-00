// PR6 / Institute: the stage. Every scene is one square path-traced frame, stored as its steady light (RGB), up to
// three live light groups (luminance), and inverse depth. The shader sums the light in linear space, tone-maps, adds
// depth haze, a little parallax, rain and grain, and can hold two frames at once so a move between views is authored
// rather than cut. Small rendered tiles (a door's insignia, a shut viewing slit) are pasted into a frame on a 2D
// canvas before upload, so any insignia can sit on either door.
const VS = `attribute vec2 p; varying vec2 vS; void main(){ vS = vec2(p.x*.5+.5, .5-p.y*.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
varying vec2 vS;
uniform sampler2D uAc,uAx,uAz,uBc,uBx,uBz;
uniform vec3 uKA[3]; uniform vec3 uKB[3];
uniform float uSA, uSB, uZA, uZB, uMix, uHasZA, uHasZB, uExpoA, uExpoB, uFogAmtA, uFogAmtB;
uniform vec2 uSpan, uCA, uCB, uPar;
uniform vec3 uFogA, uFogB, uFade, uBg;
uniform float uGC, uGX, uTime, uRain, uGrain, uVig, uFadeAmt, uParK, uOnA;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14), 0., 1.); }
vec3 frame(sampler2D tc, sampler2D tx, sampler2D tz, vec3 K[3], float s, vec2 uv, float hasZ, vec3 fog, float fogAmt, float expo, out float inside){
  float d = hasZ > .5 ? texture2D(tz, clamp(uv, 0., 1.)).r : .4;
  uv += uPar * (d - .3) * uParK * hasZ;
  inside = smoothstep(0., .03, uv.x) * smoothstep(1., .97, uv.x) * smoothstep(0., .03, uv.y) * smoothstep(1., .97, uv.y);
  vec2 q = clamp(uv, 0., 1.);
  vec3 c = pow(texture2D(tc, q).rgb, vec3(uGC)) * s;
  vec3 x = pow(texture2D(tx, q).rgb, vec3(uGX));
  c += K[0]*x.r + K[1]*x.g + K[2]*x.b;
  c = pow(aces(c * expo), vec3(1./2.2));
  float far = 1. - d;
  c = mix(c, fog, fogAmt * far * far * hasZ);
  return c;
}
void main(){
  vec2 s = vS - .5;
  float inA, inB;
  vec3 col = frame(uAc,uAx,uAz,uKA,uSA, uCA + s*uSpan/uZA, uHasZA, uFogA, uFogAmtA, uExpoA, inA);
  col = mix(uBg, col, inA * uOnA);
  if (uMix > .001) {
    vec3 b = frame(uBc,uBx,uBz,uKB,uSB, uCB + s*uSpan/uZB, uHasZB, uFogB, uFogAmtB, uExpoB, inB);
    col = mix(col, mix(uBg, b, inB), uMix);
  }
  if (uRain > 0.) {
    float lum = dot(col, vec3(.3,.5,.2)); float r = 0.;
    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      vec2 p = vS; p.x += p.y * .06;
      float n = 80. + fi * 60.;
      float cx = floor(p.x * n);
      float rnd = h21(vec2(cx, fi));
      float sp = 1.5 + rnd * 1.1 + fi * .4;
      float y = fract(p.y * (1.3 - fi*.22) - uTime * sp + rnd * 7.);
      float len = .11 - fi * .025;
      float seg = smoothstep(0., .012, y) * smoothstep(len, 0., y);
      float x = abs(fract(p.x * n) - .5);
      float w = smoothstep(.13 - fi*.03, 0., x);
      r += seg * w * step(.70 + fi*.08, rnd) * (1. - fi*.25);
    }
    col += r * uRain * (.012 + lum * .55) * vec3(.82, .92, 1.);
  }
  float v = smoothstep(1.2, .2, length(s * vec2(1.25, 1.25)));
  col *= mix(1., v, uVig);
  col += (h21(vS * 913. + fract(uTime * 7.3)) - .5) * uGrain;
  col = mix(col, uFade, uFadeAmt);
  gl_FragColor = vec4(col, 1.);
}`;

const loadImg = (src) => new Promise((res, rej) => { const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });

export function createStage(canvas, man, base) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  try {
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  } catch (e) { console.warn('stage shader', e); return null; }
  gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; const nU = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nU; i++) { const u = gl.getActiveUniform(pr, i); U[u.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(pr, u.name); }
  ['uAc', 'uAx', 'uAz', 'uBc', 'uBx', 'uBz'].forEach((nm, i) => gl.uniform1i(U[nm], i));
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  const mk = (src) => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    if (src) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const black = mk(null);
  const cache = new Map();

  // ---- frames
  function load(name) {
    if (cache.has(name)) return cache.get(name);
    const info = man.frames[name];
    if (!info) return Promise.reject(new Error('no frame ' + name));
    const p = Promise.all([
      loadImg(`${base}${name}_c.webp`),
      info.x ? loadImg(`${base}${name}_x.webp`) : null,
      info.z ? loadImg(`${base}${name}_z.webp`) : null,
    ]).then(([c, x, z]) => {
      const F = { name, info, imgC: c, imgX: x, tc: mk(c), tx: x ? mk(x) : black, tz: z ? mk(z) : black, hasZ: !!z, tiles: {}, cv: null };
      // paste rendered tiles (insignia per door, the shut slit) into this frame
      F.setTiles = async (names, slit = null) => {
        const need = names.filter((n) => info.tiles[n]);
        if (slit !== null && info.tiles.slit) need.push('slit');
        await Promise.all(need.filter((n) => !F.tiles[n]).map(async (n) => {
          const t = info.tiles[n];
          const [tcI, txI] = await Promise.all([loadImg(`${base}${name}_t_${n}_c.webp`), t.hasx ? loadImg(`${base}${name}_t_${n}_x.webp`) : null]);
          F.tiles[n] = { t, c: tcI, x: txI };
        }));
        if (!F.cv) {
          const mkc = (im) => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; return cv; };
          F.cv = { c: mkc(c), x: x ? mkc(x) : null };
        }
        F.med = names.filter((n) => n !== 'slit');
        F.slit = slit;
        F.paint();
      };
      F.paint = (onlySlit = false) => {
        if (!F.cv) return;
        for (const k of ['c', 'x']) {
          const cv = F.cv[k]; if (!cv) continue;
          const g = cv.getContext('2d', { willReadFrequently: true }); const src = k === 'c' ? F.imgC : F.imgX;
          let rect = null;
          if (!onlySlit) {
            g.globalCompositeOperation = 'copy'; g.drawImage(src, 0, 0); g.globalCompositeOperation = 'source-over';
            for (const n of F.med || []) { const T = F.tiles[n]; if (T && T[k]) g.drawImage(T[k], T.t.x, T.t.y); }
          }
          const S = F.tiles.slit;
          if (S && F.slit !== null && S[k]) {
            const t = S.t; rect = t;
            g.drawImage(src, t.x, t.y, t.w, t.h, t.x, t.y, t.w, t.h);
            const side = info.side || 'L'; const o = info.rects['open' + side];
            const res = info.res; const ox0 = Math.min(o[0][0], o[1][0]) * res - 1, ox1 = Math.max(o[0][0], o[1][0]) * res + 1;
            const oy0 = Math.min(o[0][1], o[1][1]) * res - 1, oy1 = Math.max(o[0][1], o[1][1]) * res + 1;
            const open = Math.max(0, Math.min(1, F.slit));
            if (open < 1) {
              g.save(); g.beginPath(); g.rect(ox0, oy0, ox1 - ox0, oy1 - oy0); g.clip();
              g.drawImage(S[k], t.x - open * (ox1 - ox0 + 4), t.y);
              g.restore();
              // the surround (outside the opening) always comes from the shut tile when fully shut, for a seamless join
              if (open <= 0) g.drawImage(S[k], t.x, t.y);
            }
          }
          gl.bindTexture(gl.TEXTURE_2D, k === 'c' ? F.tc : F.tx);
          if (onlySlit && rect) {
            const sub = g.getImageData(rect.x, rect.y, rect.w, rect.h);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, rect.x, rect.y, gl.RGBA, gl.UNSIGNED_BYTE, sub);
          } else if (!onlySlit) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
          }
        }
      };
      F.setSlit = (v) => { if (F.slit === v || !F.tiles.slit) return; F.slit = v; F.paint(true); };
      return F;
    });
    cache.set(name, p);
    p.catch(() => cache.delete(name));
    return p;
  }

  const S = {
    gl, canvas, A: null, B: null, mix: 0,
    viewA: { cx: 0.5, cy: 0.5, zoom: 1 }, viewB: { cx: 0.5, cy: 0.5, zoom: 1 },
    need: 0,            // least share of the frame's width that must stay visible (portrait screens shrink to fit)
    weights: {}, expo: 1, rain: 0, grain: 0.03, vig: 0.5, fade: [0.95, 0.953, 0.937], fadeAmt: 0, bg: [0.02, 0.025, 0.03],
    par: [0, 0], parK: 0.012, fogK: 1, span: [1, 1], cw: 1, ch: 1, load, man,
  };
  S.resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth, chh = canvas.clientHeight;
    const w = Math.max(2, Math.round(cw * dpr)), h = Math.max(2, Math.round(chh * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const asp = cw / Math.max(1, chh);
    let sx = asp >= 1 ? 1 : asp, sy = asp >= 1 ? 1 / asp : 1;
    if (sx < S.need) { const k = S.need / sx; sx *= k; sy *= k; }
    S.span = [sx, sy]; S.cw = cw; S.ch = chh;
  };
  // frame uv (y down) -> CSS px inside the canvas box, for the A frame
  S.toScreen = (u, v, view = S.viewA) => [((u - view.cx) * view.zoom / S.span[0] + 0.5) * S.cw, ((v - view.cy) * view.zoom / S.span[1] + 0.5) * S.ch];
  S.pxPerUnit = (view = S.viewA) => S.cw / S.span[0] * view.zoom;
  // keep a view inside the frame where the frame is larger than the window
  S.clampView = (v) => {
    const hx = S.span[0] / v.zoom / 2, hy = S.span[1] / v.zoom / 2;
    const cx = hx >= 0.5 ? 0.5 : Math.min(1 - hx, Math.max(hx, v.cx));
    const cy = hy >= 0.5 ? v.cy : Math.min(1 - hy, Math.max(hy, v.cy));
    return { cx, cy, zoom: v.zoom };
  };
  function K(F) {
    const out = new Float32Array(9);
    if (!F || !F.info.x) return out;
    for (const [g, P] of Object.entries(F.info.x)) {
      const w = S.weights[g] === undefined ? 1 : S.weights[g]; const sc = w / P.scale; const j = P.ch * 3;
      out[j] = P.tint[0] * sc; out[j + 1] = P.tint[1] * sc; out[j + 2] = P.tint[2] * sc;
    }
    return out;
  }
  S.draw = (time) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    const A = S.A, B = S.B;
    const bind = (i, F) => {
      gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, F ? F.tc : black);
      gl.activeTexture(gl.TEXTURE0 + i + 1); gl.bindTexture(gl.TEXTURE_2D, F ? F.tx : black);
      gl.activeTexture(gl.TEXTURE0 + i + 2); gl.bindTexture(gl.TEXTURE_2D, F ? F.tz : black);
    };
    bind(0, A); bind(3, B);
    gl.uniform3fv(U.uKA, K(A)); gl.uniform3fv(U.uKB, K(B));
    gl.uniform1f(U.uOnA, A ? 1 : 0);
    gl.uniform1f(U.uSA, A ? 1 / A.info.c.scale : 0); gl.uniform1f(U.uSB, B ? 1 / B.info.c.scale : 0);
    gl.uniform1f(U.uHasZA, A && A.hasZ ? 1 : 0); gl.uniform1f(U.uHasZB, B && B.hasZ ? 1 : 0);
    gl.uniform1f(U.uExpoA, (A ? A.info.expo : 1) * S.expo); gl.uniform1f(U.uExpoB, (B ? B.info.expo : 1) * S.expo);
    const fog = (F) => (F && F.info.fog) || [0.8, 0.86, 0.9];
    gl.uniform3fv(U.uFogA, fog(A)); gl.uniform3fv(U.uFogB, fog(B));
    gl.uniform1f(U.uFogAmtA, (A ? A.info.fog_d || 0 : 0) * S.fogK); gl.uniform1f(U.uFogAmtB, (B ? B.info.fog_d || 0 : 0) * S.fogK);
    gl.uniform2fv(U.uSpan, S.span);
    gl.uniform2f(U.uCA, S.viewA.cx, S.viewA.cy); gl.uniform2f(U.uCB, S.viewB.cx, S.viewB.cy);
    gl.uniform1f(U.uZA, S.viewA.zoom); gl.uniform1f(U.uZB, S.viewB.zoom); gl.uniform1f(U.uMix, B ? S.mix : 0);
    gl.uniform2fv(U.uPar, S.par); gl.uniform1f(U.uParK, S.parK);
    gl.uniform1f(U.uGC, man.gc || 2.2); gl.uniform1f(U.uGX, man.gx || 2.8);
    gl.uniform1f(U.uTime, time); gl.uniform1f(U.uRain, S.rain); gl.uniform1f(U.uGrain, S.grain); gl.uniform1f(U.uVig, S.vig);
    gl.uniform3fv(U.uFade, S.fade); gl.uniform1f(U.uFadeAmt, S.fadeAmt); gl.uniform3fv(U.uBg, S.bg);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return S;
}
