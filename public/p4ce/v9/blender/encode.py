"""PR6 v9 film: turn film.py's PNG frames into the web tiers + manifest.

  python encode.py --frames DIR --stills DIR [--dq 78] [--mq 75] [--sq 82] [--poster 24]

Writes ../assets/film/
  d/NNN.webp     1280x1280  desktop
  m/NNN.webp      720x720   phone
  stations/NN.webp 1600x1600 collection-page stills
  poster.webp    1280x1280  (the first station's rest frame)
  manifest.json  {count, size:{d,m}, stations:[{code, frame}], intro:[0,N], pattern}

A whisper of lens fall-off is added here (the same on every frame), nothing else.
"""
import argparse
import json
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "film"))
sys.path.insert(0, HERE)


def plan():
    # mirror of film.py's plan (kept import-free so this runs without bpy)
    INTRO, SEG, N = 20, 16, 9
    st = [INTRO + SEG * i for i in range(N)]
    return {"count": st[-1] + 1, "intro": [0, st[0]],
            "stations": [{"code": "%02d" % (i + 1), "frame": f} for i, f in enumerate(st)]}


_VIG = {}


def vignette(im, amount=0.055):
    w, h = im.size
    if (w, h) not in _VIG:
        y, x = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.hypot((x - w / 2) / (w / 2), (y - h / 2) / (h / 2)) / np.sqrt(2)
        _VIG[(w, h)] = (1 - amount * np.clip((r - 0.35) / 0.65, 0, 1) ** 2)[..., None]
    a = np.asarray(im.convert("RGB"), dtype=np.float32) * _VIG[(w, h)]
    return Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8), "RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--frames", required=True)
    ap.add_argument("--stills", default="")
    ap.add_argument("--dq", type=int, default=78)
    ap.add_argument("--mq", type=int, default=75)
    ap.add_argument("--sq", type=int, default=82)
    ap.add_argument("--manifest", action="store_true", help="write manifest.json (only once d/ and m/ are complete)")
    a = ap.parse_args()
    P = plan()
    for sub in ("d", "m", "stations"):
        os.makedirs(os.path.join(OUT, sub), exist_ok=True)
    missing = []
    for f in range(P["count"]):
        src = os.path.join(a.frames, "%03d.png" % f)
        if not os.path.exists(src):
            missing.append(f)
            continue
        im = vignette(Image.open(src))
        im.save(os.path.join(OUT, "d", "%03d.webp" % f), "WEBP", quality=a.dq, method=6)
        im.resize((720, 720), Image.LANCZOS).save(os.path.join(OUT, "m", "%03d.webp" % f), "WEBP", quality=a.mq, method=6)
        if f == P["stations"][0]["frame"]:
            im.save(os.path.join(OUT, "poster.webp"), "WEBP", quality=82, method=6)
    if a.stills:
        for s in P["stations"]:
            src = os.path.join(a.stills, "%s.png" % s["code"])
            if os.path.exists(src):
                vignette(Image.open(src)).save(os.path.join(OUT, "stations", "%s.webp" % s["code"]), "WEBP",
                                               quality=a.sq, method=6)
    size = {}
    for sub in ("d", "m", "stations"):
        d = os.path.join(OUT, sub)
        size[sub] = sum(os.path.getsize(os.path.join(d, x)) for x in os.listdir(d))
    print("missing:", missing)
    print("bytes:", size, "poster:", os.path.getsize(os.path.join(OUT, "poster.webp")) if os.path.exists(os.path.join(OUT, "poster.webp")) else 0)
    if a.manifest:
        if missing:
            sys.exit("not writing manifest: frames missing")
        man = {"count": P["count"], "size": {"d": 1280, "m": 720}, "stations": P["stations"],
               "intro": P["intro"], "pattern": "{tier}/{NNN}.webp",
               "poster": "poster.webp", "stills": "stations/{NN}.webp", "stillSize": 1600}
        with open(os.path.join(OUT, "manifest.json"), "w") as fh:
            json.dump(man, fh, indent=1)
        print("manifest written")


if __name__ == "__main__":
    main()
