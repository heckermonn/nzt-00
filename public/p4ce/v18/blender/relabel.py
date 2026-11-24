"""Put each record's own printed label on the path-traced vial picture of its place on the stand.
The label is wrapped round the cylinder (three fifths of the way round, as in the render) and takes the render's own
shading, column by column, so the light on the glass stays as it was traced.
The three path-traced pictures of each Series (vialpics.py) are the bases; records after the third reuse them in turn.

  python labels.py LABELS_DIR ../assets/vials/labels.webp && python relabel.py LABELS_DIR
"""
import json, math, sys
import numpy as np
from PIL import Image, ImageFilter
import os
V = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '')
LABELS = sys.argv[1].rstrip('/') + '/'      # the folder labels.py wrote
recs = json.load(open(V + 'blender/catalog.json'))
ARC = 0.6 * 2 * math.pi
PAPER = np.array([238, 240, 236], float)

def make(r, dbg=False):
    slot = (r['i'] - 1) % 3 + 1
    base = Image.open(V + f"assets/vials/PR6-C-{r['c']}0{slot}.webp").convert('RGB')
    a = np.asarray(base).astype(float)
    x0, x1, y0, y1 = 96, 359, 347, 526               # the label in every picture: one camera, one vial
    lab = np.asarray(Image.open(LABELS + f"{r['id']}.png").convert('RGB')).astype(float)
    LH, LW = lab.shape[:2]
    cx, R = (x0 + x1) / 2, (x1 - x0) / 2 + 0.5
    SS = 3                                                    # supersample
    w, h = (x1 - x0 + 1) * SS, (y1 - y0 + 1) * SS
    xs = (np.arange(w) + 0.5) / SS + x0 - 0.5
    th = np.arcsin(np.clip((xs - cx) / R, -0.999, 0.999))
    u = np.clip((0.5 + th / ARC) * LW, 0, LW - 1.001)
    v = np.clip((np.arange(h) + 0.5) / h * LH, 0, LH - 1.001)
    u0, v0 = u.astype(int), v.astype(int); fu, fv = (u - u0)[None, :, None], (v - v0)[:, None, None]
    t = (lab[v0][:, u0] * (1 - fu) + lab[v0][:, u0 + 1] * fu) * (1 - fv) + (lab[v0 + 1][:, u0] * (1 - fu) + lab[v0 + 1][:, u0 + 1] * fu) * fv
    new = np.asarray(Image.fromarray(t.clip(0, 255).astype('uint8')).resize((x1 - x0 + 1, y1 - y0 + 1), Image.LANCZOS)).astype(float)
    old = a[y0:y1 + 1, x0:x1 + 1]
    # the render's shading of bare paper: per column, the bright quantile (text is dark and sparse), smoothed
    shade = np.percentile(old, 88, axis=0)                   # (w, 3)
    k = np.ones(5) / 5
    shade = np.stack([np.convolve(np.pad(shade[:, c], 2, mode='edge'), k, 'valid') for c in range(3)], 1)
    out = new / PAPER * shade[None]
    # keep the render's own soft edge: blend by how paper-like the old pixel rows/cols were at the border
    m = np.ones(out.shape[:2]); f = 2
    for i in range(f): m[i, :] *= (i + 1) / (f + 1); m[-1 - i, :] *= (i + 1) / (f + 1); m[:, i] *= (i + 1) / (f + 1); m[:, -1 - i] *= (i + 1) / (f + 1)
    a[y0:y1 + 1, x0:x1 + 1] = out * m[..., None] + old * (1 - m[..., None])
    im = Image.fromarray(a.clip(0, 255).astype('uint8'))
    im.save(V + f"assets/vials/{r['id']}.webp", 'WEBP', quality=86, method=6)
    return (x0, x1, y0, y1)

only = sys.argv[2:]
for r in sorted(recs, key=lambda r: -r['i']):     # bases (the first three) are rewritten last
    if only and r['id'] not in only: continue
    b = make(r)
    if only: print(r['id'], b)
print('done')
