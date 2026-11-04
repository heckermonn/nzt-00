/* PR6 / Form · atmosphere, after Abel: every product lives in its own colour, and the light keeps moving.
   field(canvas, pal)   a slow, grainy, domain-warped colour field whose palette itself drifts (colour plates, the
                        compound page's stage, the index statement)
   relight(canvas, pal) the b-roll still (assets/broll, one Cycles render split into light groups) relit live: a warm
                        and a cool key trade places across the vial while the colours of its Series pass through them
   Each returns {start, stop, setPal, destroy}. Canvases are drawn small (they are soft) and pause off screen.
   Reduced motion: one still frame. */
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]rm\b/.test(location.search);

/* colour worlds per Series, inside the kit: chalk, mist, steel, deep blue 3F668F, sky A5C7DB, ink, and the orange as
   light rather than paint. Four stops each; the field rotates through them. */
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
export const WORLDS = {
  '01': ['#DCE3E7', '#A5C7DB', '#718B9A', '#F2F3EF'],
  '02': ['#A5C7DB', '#3F668F', '#E9B48C', '#CAD5DA'],
  '03': ['#718B9A', '#2B3F55', '#CAD5DA', '#A5C7DB'],
  '04': ['#3F668F', '#E98546', '#A5C7DB', '#1E3550'],
  '05': ['#CAD5DA', '#EBC3A8', '#A5C7DB', '#F2F3EF'],
  '06': ['#24395A', '#5D7FB0', '#A5C7DB', '#3F668F'],
  '07': ['#1B2A44', '#3F668F', '#E98546', '#A5C7DB'],
  '08': ['#F2F3EF', '#E4C2B0', '#CAD5DA', '#A5C7DB'],
  '09': ['#718B9A', '#A5C7DB', '#DCE3E7', '#3F668F'],
  pale: ['#E4EBEF', '#A5C7DB', '#ECD5C4', '#C6D5DF'],
  all: ['#A5C7DB', '#3F668F', '#E98546', '#CAD5DA']
};
export const world = k => (WORLDS[k] || WORLDS.pale).map(hex);

const VS = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
const NOISE = `
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn(p);p=p*2.03+17.1;a*=.5;}return s;}`;

const FIELD = `precision highp float;varying vec2 v;uniform vec2 res;uniform float t;uniform vec3 c0,c1,c2,c3;${NOISE}
void main(){
  vec2 q=v*vec2(res.x/res.y,1.)*1.25;
  vec2 w=vec2(fbm(q+vec2(0.,t*.06)),fbm(q+vec2(5.2,1.3)-t*.05));
  q+=.55*w;
  float f1=fbm(q*1.1+t*.035),f2=fbm(q*.75-t*.03+3.),f3=fbm(q*1.7+t*.05+9.);
  vec3 col=mix(c0,c1,smoothstep(.3,.72,f1));
  col=mix(col,c2,smoothstep(.38,.78,f2)*.85);
  col=mix(col,c3,smoothstep(.58,.86,f3)*.75);
  col*=.94+.1*v.y;
  vec2 gp=v*res;col+=(h(gp+fract(t*7.)*91.)-.5)*.045;
  gl_FragColor=vec4(col,1.);}`;

const RELIGHT = `precision highp float;varying vec2 v;uniform vec2 res,img;uniform float t;
uniform sampler2D L0,L1,L2,L3,L4;uniform vec3 T0,T1,T2,T3,T4;${NOISE}
vec3 lin(vec3 c){return pow(c,vec3(2.2));}
void main(){
  /* cover: fill the frame, keep the vial's centre */
  float ra=res.x/res.y,ia=img.x/img.y;vec2 uv=v;
  if(ra>ia){uv.y=(v.y-.5)*ia/ra+.5;}else{uv.x=(v.x-.5)*ra/ia+.5;}
  uv.y=1.-uv.y;
  vec3 c=T0*lin(texture2D(L0,uv).rgb)+T1*lin(texture2D(L1,uv).rgb)+T2*lin(texture2D(L2,uv).rgb)+T3*lin(texture2D(L3,uv).rgb)+T4*lin(texture2D(L4,uv).rgb);
  c=c/(1.+c*.18)*1.18;
  c=pow(c,vec3(1./2.2));
  vec2 gp=v*res;c+=(h(gp+fract(t*7.)*91.)-.5)*.04;
  gl_FragColor=vec4(c,1.);}`;

function gl0(canvas, fs) {
  const gl = canvas.getContext('webgl', {antialias: false, alpha: false, preserveDrawingBuffer: false});
  if (!gl) return null;
  const sh = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr); gl.useProgram(pr);
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
  return {gl, U: n => gl.getUniformLocation(pr, n)};
}

/* a shared clock + loop: a surface draws only while on screen; with reduced motion it draws once */
function surface(canvas, scale, draw) {
  let live = false, raf = 0, last = 0, T = Math.random() * 40, vis = false, started = false;
  const size = () => {
    const r = canvas.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2) * scale;
    const w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  };
  const frame = now => {
    raf = 0; if (!live) return;
    const dt = last ? Math.min(.05, (now - last) / 1000) : 0; last = now; T += dt;
    size(); draw(T, dt); raf = requestAnimationFrame(frame);
  };
  const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; sync(); });
  io.observe(canvas);
  function sync() {
    const want = started && vis && !RM;
    if (want && !live) { live = true; last = 0; raf = requestAnimationFrame(frame); }
    if (!want && live) { live = false; cancelAnimationFrame(raf); raf = 0; }
    if (started && vis && RM) { size(); draw(T, 0); }
  }
  return {
    start() { started = true; sync(); },
    stop() { started = false; sync(); },
    redraw() { size(); draw(T, 0); },
    destroy() { started = false; sync(); io.disconnect(); }
  };
}

/* palette easing: the field always shows the current world, rotating its stops over ~14 s each */
function paletteAt(P, T, period = 14) {
  const k = T / period, i = Math.floor(k), f = k - i, s = f * f * (3 - 2 * f);
  return [0, 1, 2, 3].map(j => { const a = P[(i + j) % 4], b = P[(i + j + 1) % 4]; return a.map((x, n) => x + (b[n] - x) * s); });
}

export function field(canvas, pal) {
  const g = gl0(canvas, FIELD); if (!g) return null;
  const {gl, U} = g; const u = {res: U('res'), t: U('t'), c: [U('c0'), U('c1'), U('c2'), U('c3')]};
  let P = pal, Q = pal, mixT = 1;
  const s = surface(canvas, .35, (T, dt) => {
    mixT = Math.min(1, mixT + dt / 1.6);
    const a = paletteAt(Q, T), b = paletteAt(P, T), e = mixT * mixT * (3 - 2 * mixT);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height); gl.uniform1f(u.t, T);
    for (let j = 0; j < 4; j++) gl.uniform3fv(u.c[j], a[j].map((x, n) => x + (b[j][n] - x) * e));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return {...s, setPal(p) { Q = P; P = p; mixT = 0; if (RM) { mixT = 1; s.redraw(); } }, destroy() { s.destroy(); const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }};
}

const lum = c => .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
/* a light's tint: the colour's hue at a steady brightness (so dark stops still light the set) */
const tint = (c, k, sat = 1.7) => { const l = Math.max(lum(c), .05); return c.map(x => Math.max(0, Math.min(2.6, (l + (x - l) * sat) / l * k))); };
const mixc = (a, b, s) => a.map((x, i) => x + (b[i] - x) * s);

export function relight(canvas, pal, base = 'assets/broll/') {
  const g = gl0(canvas, RELIGHT); if (!g) return null;
  const {gl, U} = g; const G = ['key_l', 'key_r', 'top', 'rim', 'amb'];
  const u = {res: U('res'), img: U('img'), t: U('t'), T: G.map((_, i) => U('T' + i))};
  let ready = 0, iw = 1200, ih = 1500, P = pal;
  G.forEach((n, i) => {
    const tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0]));
    for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
    gl.uniform1i(U('L' + i), i);
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { gl.activeTexture(gl.TEXTURE0 + i); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); iw = im.naturalWidth; ih = im.naturalHeight; if (++ready === G.length) { canvas.classList.add('ready'); s.redraw(); } };
    im.src = base + n + '.webp';
  });
  const s = surface(canvas, .8, T => {
    if (ready < G.length) return;
    /* the two keys trade places every ~11 s, like a light passing over the set; colours drift through the world */
    const sw = .5 + .5 * Math.sin(T * .57), c = paletteAt(P, T, 9);
    const kl = tint(c[0], .3 + 1.25 * sw);
    const kr = tint(c[1], .3 + 1.25 * (1 - sw));
    const tp = tint(mixc(c[2], [1, 1, 1], .65), .55 + .2 * Math.sin(T * .31));
    const rm = tint(c[3], .75 + .4 * Math.sin(T * .43 + 1.3), 2.2);
    const am = tint(mixc(c[0], c[3], .5), .8, 1.4);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.res, canvas.width, canvas.height); gl.uniform2f(u.img, iw, ih); gl.uniform1f(u.t, T);
    [kl, kr, tp, rm, am].forEach((x, i) => gl.uniform3fv(u.T[i], x));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });
  return {...s, setPal(p) { P = p; s.redraw(); }, destroy() { s.destroy(); const x = gl.getExtension('WEBGL_lose_context'); x && x.loseContext(); }};
}
