// PR6 / Institute: the stage without WebGL. The same frames as tone-mapped stills, placed with the same view maths,
// so every screen keeps its picture, its marks and its controls on a device that cannot run the shader.
// Each frame is a square layer: the still, with the same rendered tiles (a door's insignia, the shut slit) laid over it.
export function createStill(root, man, base) {
  const mk = () => { const d = document.createElement('div'); d.className = 'still-f'; root.appendChild(d); return d; };
  const layA = mk(), layB = mk();
  const cache = new Map();
  const img = (src) => new Promise((res, rej) => { const im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false; im.onload = () => res(im); im.onerror = () => rej(new Error('image ' + src)); im.src = src; });
  const load = (name) => {
    if (cache.has(name)) return cache.get(name);
    const info = man.frames[name];
    if (!info) return Promise.reject(new Error('no frame ' + name));
    const p = img(`${base}${name}.jpg`).then((im) => {
      const el = document.createElement('div'); el.className = 'still-in'; el.appendChild(im);
      const F = { name, info, el, tiles: {}, med: [], slit: null, paint: () => {} };
      const place = (n, tim) => {
        const t = info.tiles[n], r = info.res;
        Object.assign(tim.style, { left: (t.x / r * 100) + '%', top: (t.y / r * 100) + '%', width: (t.w / r * 100) + '%', height: (t.h / r * 100) + '%' });
        tim.hidden = true; el.appendChild(tim); F.tiles[n] = tim;
      };
      F.setTiles = async (names, slit = null) => {
        const need = names.filter((n) => info.tiles[n]);
        if (slit !== null && info.tiles.slit) need.push('slit');
        await Promise.all(need.filter((n) => !F.tiles[n]).map(async (n) => { try { place(n, await img(`${base}${name}_t_${n}.webp`)); } catch (e) { /* the frame's own picture stays */ } }));
        F.med = names.filter((n) => n !== 'slit');
        for (const n in F.tiles) if (n !== 'slit') F.tiles[n].hidden = !F.med.includes(n);
        F.slit = null; F.setSlit(slit);
      };
      // 0 is shut (the shut tile covers the opening), 1 is open (the frame's own picture)
      F.setSlit = (v) => {
        const S = F.tiles.slit; if (!S || F.slit === v) return; F.slit = v;
        S.hidden = v === null || v >= 1; S.style.opacity = v === null ? 0 : 1 - Math.max(0, Math.min(1, v));
      };
      return F;
    });
    cache.set(name, p); p.catch(() => cache.delete(name));
    return p;
  };
  const S = {
    still: true, canvas: root, A: null, B: null, mix: 0, viewA: { cx: 0.5, cy: 0.5, zoom: 1 }, viewB: { cx: 0.5, cy: 0.5, zoom: 1 }, need: 0,
    weights: {}, expo: 1, rain: 0, grain: 0, vig: 0, fade: [0.95, 0.953, 0.937], fadeAmt: 0, bg: [0.02, 0.025, 0.03], par: [0, 0], parK: 0, fogK: 1,
    span: [1, 1], cw: 1, ch: 1, load, man,
  };
  S.resize = () => {
    const cw = root.clientWidth, ch = root.clientHeight, asp = cw / Math.max(1, ch);
    let sx = asp >= 1 ? 1 : asp, sy = asp >= 1 ? 1 / asp : 1;
    if (sx < S.need) { const k = S.need / sx; sx *= k; sy *= k; }
    S.span = [sx, sy]; S.cw = cw; S.ch = ch;
  };
  S.toScreen = (u, v, view = S.viewA) => [((u - view.cx) * view.zoom / S.span[0] + 0.5) * S.cw, ((v - view.cy) * view.zoom / S.span[1] + 0.5) * S.ch];
  S.pxPerUnit = (view = S.viewA) => S.cw / S.span[0] * view.zoom;
  S.clampView = (v) => {
    const hx = S.span[0] / v.zoom / 2, hy = S.span[1] / v.zoom / 2;
    return { cx: hx >= 0.5 ? 0.5 : Math.min(1 - hx, Math.max(hx, v.cx)), cy: hy >= 0.5 ? v.cy : Math.min(1 - hy, Math.max(hy, v.cy)), zoom: v.zoom };
  };
  const put = (lay, F, view, op) => {
    if (!F) { lay.style.opacity = 0; if (lay.firstChild) lay.replaceChildren(); lay.dataset.name = ''; return; }
    if (lay.dataset.name !== F.name) { lay.replaceChildren(F.el); lay.dataset.name = F.name; }
    const size = S.pxPerUnit(view);
    lay.style.width = lay.style.height = size + 'px';
    lay.style.transform = `translate(${S.cw / 2 - view.cx * size}px, ${S.ch / 2 - view.cy * size}px)`;
    lay.style.opacity = op; lay.style.filter = S.expo < 0.99 ? `brightness(${Math.max(0.2, Math.pow(S.expo, 0.6))})` : '';
  };
  S.draw = () => {
    const c = (a) => `rgb(${a.map((v) => Math.round(v * 255)).join(',')})`;
    root.style.background = c(S.bg);
    // one frame's layer can only sit in one place: when both slots hold the same frame, the incoming one wins
    if (S.B && S.A && S.B.name === S.A.name) { put(layA, null); put(layB, S.B, S.mix > 0.5 ? S.viewB : S.viewA, 1); }
    else { put(layA, S.A, S.viewA, 1); put(layB, S.B, S.viewB, S.B ? S.mix : 0); }
    root.style.setProperty('--veil', c(S.fade)); root.style.setProperty('--veil-a', S.fadeAmt);
  };
  return S;
}
