// PR6 / Institute: the Keeper. An original character seen only as light through the door's viewing slit: a pair of
// eyes and the bridge of a face, drawn procedurally (no photograph, no reference likeness) as a cool projection in
// the kit's sky blue. When she speaks, warmth comes into the light. Once, in a silence, the face gives way to a
// branching pattern (roots, nerves, vessels) and then returns.
const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
uniform vec2 uRes; uniform vec4 uRect;
uniform float uT, uOpen, uWarm, uBlink, uRoots, uGlitch, uPx;
uniform vec2 uGaze;
float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,9.2); a*=.5; } return s; }
float band(float x, float c, float w){ return smoothstep(w, 0., abs(x-c)); }

// luminance of the face at p (x across the slit -1..1, y up, same scale)
float face(vec2 p, out float eyeMask){
  float sx = p.x < 0. ? -1. : 1.;
  vec2 e = vec2(p.x - sx*.41, p.y - .004);
  float t = e.x * sx;                         // + towards the temple
  e.y -= .07 * t;                             // almond tilt
  float a = .205;
  float xn = clamp(e.x / a, -1., 1.);
  float inner = smoothstep(-1., -.6, -t/a);   // rounder at the tear duct
  float yu0 = .076 * pow(1. - xn*xn, .66) * (1. - .10*smoothstep(.2, 1., t/a));
  float yl = -.050 * pow(1. - xn*xn, .85);
  float yu = mix(yu0, yl + .004, uBlink);
  // skin: a quiet field with the forms of brow, socket, bridge and cheek
  float L = .29;
  L += .15 * smoothstep(.08, .26, p.y);                               // brow bone
  L -= .10 * exp(-pow((e.y - .085)/.06, 2.)) * exp(-pow(e.x/.26, 2.));
  L += .10 * exp(-pow((e.y - .045)/.022, 2.)) * exp(-pow(e.x/.15, 2.)) * (1. - uBlink);   // light on the lid // socket above the lid
  L += .10 * exp(-pow(p.x/.075, 2.));                                  // bridge of the nose
  L -= .10 * exp(-pow((abs(p.x) - .16)/.05, 2.)) * smoothstep(.15, -.2, p.y);
  L += .09 * exp(-pow((e.y + .15)/.07, 2.)) * exp(-pow((e.x)/.22, 2.)); // top of the cheek
  L -= .05 * exp(-pow((e.y + .07)/.03, 2.)) * exp(-pow((e.x + sx*.04)/.16, 2.));
  L *= 1. - .78 * smoothstep(.66, 1.0, abs(p.x));
  L *= 1. - .35 * smoothstep(.10, .26, -p.y);                       // the face turns away into hair
  L += .05 * (fbm(vec2(p.x*60., p.y*4.) + 3.) - .5) * smoothstep(.82, .98, abs(p.x));
  // brow: fine strokes following an arch
  float by = .185 + .035*t/a - .05*pow(max(t/a, 0.), 2.) - .02*pow(max(-t/a, 0.), 2.);
  float bw = .026 * (1. - .55*smoothstep(.2, 1.25, t/a)) * smoothstep(-1.05, -.6, t/a);
  float bwm = max(bw, .0008);
  float brow = smoothstep(bwm, bwm*.3, abs(e.y - by)) * smoothstep(1.35, 1.05, t/a) * step(.001, bw);
  brow *= .65 + .35 * vn(vec2(e.x*150. + e.y*70., e.y*18.));
  L *= 1. - .62 * brow;
  // crease and lashes
  float inX = smoothstep(1., .93, abs(xn));
  L *= 1. - .30 * band(e.y, yu0 + .034 + .01*t/a, .010) * inX * (1. - uBlink);
  float lash = band(e.y, yu + .006, .013) * inX;
  lash = max(lash, band(e.y, yu + .016 + .05*smoothstep(.55, 1.1, t/a), .010) * smoothstep(.5, .95, t/a) * smoothstep(1.2, 1.0, t/a) * .8);
  L *= 1. - .86 * lash;
  L *= 1. - .30 * band(e.y, yl - .004, .007) * inX;
  // the eye itself
  float open = smoothstep(0., .008, yu - e.y) * smoothstep(0., .006, e.y - yl) * step(abs(e.x), a);
  eyeMask = open;
  if (open > 0.) {
    float sc = .80 - .30 * xn*xn - .34 * smoothstep(.045, 0., yu - e.y);         // sclera, shaded by the lid
    vec2 ic = vec2(uGaze.x * .05, uGaze.y * .020 + .016);
    vec2 d = e - ic; float r = length(d) / .092; float ang = atan(d.y, d.x);
    float iris = .40 + .26 * (fbm(vec2(ang*5.5, r*2.2)) - .35) + .16 * band(r, .40, .12);
    iris *= 1. - .62 * smoothstep(.80, 1.0, r);                                   // limbal ring
    iris = mix(iris, .015, smoothstep(.36, .31, r));                              // pupil
    iris *= 1. - .40 * smoothstep(.05, 0., yu - e.y);
    float eye = mix(sc, iris, smoothstep(1.0, .95, r));
    eye += .95 * smoothstep(.016, .006, length(d - vec2(-.030, .034)));           // catch-light
    eye += .35 * smoothstep(.010, .003, length(d - vec2(.026, -.022)));
    L = mix(L, eye, open);
  }
  return clamp(L, 0., 1.4);
}
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c = (uRect.xy + uRect.zw) * .5, hs = (uRect.zw - uRect.xy) * .5;
  vec2 q = (uv - c) / hs;
  float asp = (hs.y * uRes.y) / (hs.x * uRes.x);
  // the signal: a slow roll, a rare tear
  float line = floor(gl_FragCoord.y / uPx);
  float tq = floor(uT * 12.);
  float tear = step(1. - .02 - uGlitch*.5, h21(vec2(floor(line/4.), tq))) * (h21(vec2(line, tq)) - .5) * (.03 + .25*uGlitch);
  vec2 p = vec2(q.x + tear, q.y * asp);
  p.y += .004 * sin(uT * .7);                          // she breathes
  float em;
  float L = face(p * vec2(1., 1.) , em);
  // roots / nerves / vessels: a ridged, domain-warped field that only shows in a silence
  vec2 w = p * vec2(2.2, 5.0) + vec2(0., uT * .03);
  w += .55 * vec2(fbm(w * 1.3 + 4.), fbm(w * 1.3 + 9.));
  float ridge = 1. - abs(2. * fbm(w * 1.7) - 1.);
  float ridge2 = 1. - abs(2. * fbm(w * 3.9 + 11.) - 1.);
  float roots = smoothstep(.93, .995, ridge) * .8 + .35 * smoothstep(.95, .995, ridge2);
  roots *= .55 + .45 * sin(uT * 1.4 - ridge * 9.);
  L = mix(L, L * .22 + .9 * roots, uRoots);
  // light: cool projection, warmer when she speaks
  vec3 cool = mix(vec3(.02, .07, .16), vec3(.60, .84, 1.0), smoothstep(0., 1., L));
  vec3 warm = mix(vec3(.07, .06, .07), vec3(1.0, .91, .80), smoothstep(0., 1., L));
  vec3 col = mix(cool, warm, uWarm * .62) * (.25 + 1.05 * L);
  // scan lines and grain
  float sl = .70 + .30 * smoothstep(.15, .5, abs(fract(gl_FragCoord.y / uPx) - .5) * 2.);
  col *= sl;
  col *= .93 + .07 * h21(vec2(tq, line));
  col += .035 * (h21(gl_FragCoord.xy + tq) - .5);
  float roll = smoothstep(.06, 0., abs(fract(q.y * .5 + .5 - uT * .11) - .5));
  col += vec3(.10, .16, .22) * roll * .5;
  // the aperture: only what the slit lets through, opening from the centre line
  float inside = smoothstep(1., .975, abs(q.x)) * smoothstep(1., .9, abs(q.y));
  float reveal = smoothstep(0., .3, uOpen - abs(q.y) * .7 * (1. - uOpen));
  col *= inside * reveal * uOpen;
  // a thread of spill beyond the edge
  float dx = max(abs(q.x) - 1., 0.) * hs.x * uRes.x, dy = max(abs(q.y) - 1., 0.) * hs.y * uRes.y;
  float spill = exp(-length(vec2(dx, dy)) / (10. * uPx)) * (1. - inside);
  col += mix(vec3(.20, .34, .50), vec3(.5, .46, .42), uWarm * .6) * spill * .22 * uOpen;
  gl_FragColor = vec4(col, 1.);
}`;

export function createKeeper(canvas) {
  let gl = null;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false }); } catch (e) { gl = null; }
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram();
  try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); } catch (e) { console.warn('keeper shader', e); return null; }
  gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uRect', 'uT', 'uOpen', 'uWarm', 'uBlink', 'uRoots', 'uGlitch', 'uPx', 'uGaze'].forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });
  const K = { open: 0, warm: 0, blink: 0, roots: 0, glitch: 0, gaze: [0, 0], gazeT: [0, 0], rect: [0.2, 0.3, 0.8, 0.7], nextBlink: 2, blinkT: -1, sacc: 0 };
  // place the canvas over the slit: (x, y, w, h) of the opening in CSS px relative to the canvas' offset parent
  K.place = (x, y, w, h) => {
    const mx = w * 0.18, my = h * 1.1;
    const s = canvas.style; s.left = (x - mx) + 'px'; s.top = (y - my) + 'px'; s.width = (w + 2 * mx) + 'px'; s.height = (h + 2 * my) + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.max(2, Math.round((w + 2 * mx) * dpr)), ch = Math.max(2, Math.round((h + 2 * my) * dpr));
    if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
    K.rect = [mx / (w + 2 * mx), my / (h + 2 * my), (mx + w) / (w + 2 * mx), (my + h) / (h + 2 * my)];
    K.dpr = dpr; K.h = h;
  };
  K.draw = (t, dt) => {
    // blinks and small saccades keep the eyes alive
    if (t > K.nextBlink) { K.blinkT = t; K.nextBlink = t + 2.6 + Math.random() * 4.5; }
    const bt = (t - K.blinkT) / 0.16;
    K.blink = bt >= 0 && bt <= 1 ? Math.sin(bt * Math.PI) : 0;
    if (t > K.sacc) { K.sacc = t + 0.8 + Math.random() * 2.2; K.jit = [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.1]; }
    const j = K.jit || [0, 0];
    const k = 1 - Math.pow(0.0006, dt);
    K.gaze[0] += (K.gazeT[0] + j[0] - K.gaze[0]) * k; K.gaze[1] += (K.gazeT[1] + j[1] - K.gaze[1]) * k;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform4fv(U.uRect, K.rect);
    gl.uniform1f(U.uT, t); gl.uniform1f(U.uOpen, K.open); gl.uniform1f(U.uWarm, K.warm); gl.uniform1f(U.uBlink, K.blink);
    gl.uniform1f(U.uRoots, K.roots); gl.uniform1f(U.uGlitch, K.glitch); gl.uniform2fv(U.uGaze, K.gaze);
    gl.uniform1f(U.uPx, Math.max(2, Math.round((K.h || 60) * (K.dpr || 1) / 34)));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return K;
}
