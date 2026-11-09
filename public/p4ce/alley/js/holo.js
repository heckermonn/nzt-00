// PR6 / Alley: the hologram. An original, androgynous head built from signed distance fields and drawn only as
// broken horizontal scan lines: each line is the head sampled at one height, dashed, shifted when the signal tears.
// The canvas is composited over the alley with `screen`, so black is transparent and the face is pure light.
const VS = `attribute vec2 p; varying vec2 vU; void main(){ vU = p*.5+.5; gl_Position = vec4(p,0.,1.); }`;
const FS = `precision highp float;
varying vec2 vU;
uniform vec2 uRes; uniform float uT, uYaw, uPitch, uSignal, uGlitch, uAlpha, uLine, uSeed;
float h21(vec2 p){ p = fract(p*vec2(233.34, 851.73)); p += dot(p, p+23.45); return fract(p.x*p.y); }
float sdE(vec3 p, vec3 r){ float k0 = length(p/r); float k1 = length(p/(r*r)); return k0*(k0-1.)/k1; }
float smin(float a, float b, float k){ float h = clamp(.5+.5*(b-a)/k, 0., 1.); return mix(b, a, h) - k*h*(1.-h); }
float smax(float a, float b, float k){ return -smin(-a, -b, k); }
float sdCap(vec3 p, vec3 a, vec3 b, float r){ vec3 pa = p-a, ba = b-a; float h = clamp(dot(pa,ba)/dot(ba,ba), 0., 1.); return length(pa - ba*h) - r; }
float head(vec3 p){
  vec3 q = vec3(abs(p.x), p.y, p.z);
  float d = sdE(p - vec3(0., .32, -.10), vec3(.64, .84, .80));            // cranium
  d = smin(d, sdE(p - vec3(0., -.18, .10), vec3(.50, .78, .64)), .22);     // face mass
  d = smin(d, sdE(p - vec3(0., -.74, .22), vec3(.26, .24, .30)), .22);     // chin
  d = smin(d, sdE(q - vec3(.34, -.06, .40), vec3(.16, .13, .18)), .14);     // cheekbones
  d = smin(d, sdCap(q, vec3(.10, .26, .64), vec3(.34, .24, .57), .05), .08); // brow
  d = smax(d, -(length(q - vec3(.22, .07, .64)) - .11), .08);            // sockets
  d = smin(d, length(q - vec3(.22, .065, .50)) - .1, .025);              // eyes
  d = smin(d, sdE(q - vec3(.22, .095, .555), vec3(.125, .05, .085)), .03);  // upper lids
  d = smin(d, sdCap(p, vec3(0., .1, .64), vec3(0., -.21, .79), .042), .07); // nose
  d = smin(d, length(p - vec3(0., -.22, .77)) - .06, .05);
  d = smin(d, length(q - vec3(.06, -.25, .71)) - .045, .04);
  d = smin(d, sdE(p - vec3(0., -.43, .68), vec3(.15, .036, .07)), .05);   // lips
  d = smin(d, sdE(p - vec3(0., -.51, .665), vec3(.13, .042, .07)), .05);
  d = smax(d, -sdE(p - vec3(0., -.468, .73), vec3(.135, .006, .05)), .012);
  d = smin(d, sdE(q - vec3(.62, -.02, -.08), vec3(.06, .17, .11)), .05);  // ears
  d = smin(d, sdCap(p, vec3(0., -.55, -.18), vec3(0., -1.9, -.14), .27), .24); // neck
  return d;
}
float map(vec3 p){
  float cy = cos(uYaw), sy = sin(uYaw), cp = cos(uPitch), sp = sin(uPitch);
  p.yz = mat2(cp, -sp, sp, cp) * p.yz;
  p.xz = mat2(cy, -sy, sy, cy) * p.xz;
  return head(p);
}
vec3 nrm(vec3 p){ vec2 e = vec2(.004, 0.); return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx))); }
void main(){
  vec2 fc = vU * uRes;
  float ls = uLine;                              // line pitch in device px
  float li = floor(fc.y / ls);
  float tq = floor(uT * 14.);
  // tearing: bands of lines jump sideways
  float band = floor(li / 5.);
  float tear = step(1. - .12 - uGlitch*.6, h21(vec2(band, tq + uSeed))) * (h21(vec2(band+3., tq)) - .5) * (.05 + uGlitch*.25) * uRes.x;
  float x = fc.x + tear;
  // lose signal: the image folds into one horizontal line
  float cyc = uRes.y * .5;
  float yq = (li + .5) * ls;
  float ys = cyc + (yq - cyc) / max(uSignal, .002);
  vec2 uv = (vec2(x, ys) - .5 * uRes) / uRes.y;
  vec3 ro = vec3(0., -.12, 4.9), rd = normalize(vec3(uv, -1.65));   // looking down -z at the face
  float t = 1.8, d = 1.; bool hit = false;
  for (int i = 0; i < 72; i++) { vec3 p = ro + rd*t; d = map(p); if (d < .0015) { hit = true; break; } t += d * .9; if (t > 6.) break; }
  float v = 0.; float rim = 0.;
  if (hit) {
    vec3 p = ro + rd*t; vec3 n = nrm(p);
    float dif = clamp(dot(n, normalize(vec3(.3, .55, .8))), 0., 1.);
    float fr = pow(1. - clamp(dot(n, -rd), 0., 1.), 2.2);
    float fade = smoothstep(-1.55, -.75, p.y);    // the neck dissolves
    v = (.08 + .5 * dif * dif) * fade; rim = fr * 1.5 * fade;
  }
  // the line itself: thin, dashed, some dashes dropped
  float yin = abs(fract(fc.y / ls) - .5);
  float lineProf = smoothstep(.5, .3, yin);
  float dash = step(.16 + uGlitch*.4, h21(vec2(floor(x / (ls*5.)), li + tq*.0)));
  float drop = step(.06 + uGlitch*.3, h21(vec2(li, floor(uT*3.) + uSeed)));
  float on = lineProf * mix(1., dash, .55) * drop;
  vec3 pink = vec3(1., .26, .62), cyan = vec3(.42, .80, 1.);
  vec3 col = pink * v + cyan * rim;
  col *= on;
  // when folded, the single surviving line burns bright
  col += (1. - smoothstep(0., .25, uSignal)) * smoothstep(ls*1.2, 0., abs(fc.y - cyc)) * step(abs(fc.x - .5*uRes.x), uRes.x*.42*uSignal + uRes.x*.05) * vec3(1., .5, .8);
  col *= uAlpha * (.86 + .14 * h21(vec2(tq, 1.)));
  gl_FragColor = vec4(col, 1.);
}`;

export function createHolo(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return null;
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  const U = {}; ['uRes', 'uT', 'uYaw', 'uPitch', 'uSignal', 'uGlitch', 'uAlpha', 'uLine', 'uSeed'].forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });
  const H = { yaw: -0.55, pitch: 0.05, signal: 1, glitch: 0, alpha: 0, seed: 0 };
  H.resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); H.dpr = dpr;
  };
  H.draw = (t) => {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(U.uRes, canvas.width, canvas.height); gl.uniform1f(U.uT, t);
    gl.uniform1f(U.uYaw, H.yaw); gl.uniform1f(U.uPitch, H.pitch); gl.uniform1f(U.uSignal, H.signal);
    gl.uniform1f(U.uGlitch, H.glitch); gl.uniform1f(U.uAlpha, H.alpha); gl.uniform1f(U.uSeed, H.seed);
    gl.uniform1f(U.uLine, Math.max(2.5, canvas.height / 120));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
  return H;
}
