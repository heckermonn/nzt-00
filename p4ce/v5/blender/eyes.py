"""Make assets/gate/eyes.webp from an Unsplash portrait (see assets/CREDITS.md).

  $PY eyes.py            # downloads the source from images.unsplash.com if missing, writes ../assets/gate/eyes.webp

Crop: a 4.8:1 band (the slot's aspect, 0.36 x 0.075 m) centred on the eyes, with the head levelled a little.
Grade: cool neutral, pushed down into the slot's shadow; a soft band of light across the eyes that falls
to black at the edges, so the layer sits inside the dark slot with no visible rectangle.
"""
import os
import urllib.request

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_URL = "https://images.unsplash.com/photo-1743254467058-517c4d321452?fm=jpg&q=92&w=3000"
SRC = "/tmp/claude-0/p4ce-gate/eyes_src.jpg"
OUT = os.path.normpath(os.path.join(HERE, "..", "assets", "gate", "eyes.webp"))
ASPECT = 0.36 / 0.075


def main():
    if not os.path.exists(SRC):
        os.makedirs(os.path.dirname(SRC), exist_ok=True)
        urllib.request.urlretrieve(SRC_URL, SRC)
    im = Image.open(SRC).convert("L")
    W, H = im.size  # 3000 x 4200
    # pupils measured on the 3000 px source: left (1053, 1853), right (2109, 1763)
    lx, ly, rx, ry = 1053, 1853, 2109, 1763
    cx, cy = (lx + rx) / 2, (ly + ry) / 2
    import math
    tilt = math.degrees(math.atan2(ry - ly, rx - lx))  # negative: right eye higher
    im = im.rotate(tilt * 0.75, resample=Image.BICUBIC, center=(cx, cy), fillcolor=0)
    ipd = math.hypot(rx - lx, ry - ly)
    w = ipd / 0.36            # pupils sit 36% of the band apart
    h = w / ASPECT
    cy -= h * 0.06            # a little more brow than cheek
    canvas = Image.new("L", (int(w), int(h)), 0)
    box = (int(cx - w / 2), int(cy - h / 2), int(cx + w / 2), int(cy + h / 2))
    canvas.paste(im.crop(box), (0, 0))
    out_w = 1440
    band = canvas.resize((out_w, int(round(out_w / ASPECT))), Image.LANCZOS)
    a = np.asarray(band).astype(np.float32) / 255.0
    lin = a ** 2.2
    Hh, Ww = lin.shape
    yy, xx = np.mgrid[0:Hh, 0:Ww].astype(np.float32)
    u = (xx - Ww / 2) / (Ww / 2)
    v = (yy - Hh * 0.52) / (Hh / 2)
    light = np.exp(-(np.abs(u) / 0.56) ** 3.6) * np.clip(1.0 - 0.55 * v ** 2, 0, 1)
    light *= np.clip((0.97 - np.abs(u)) / 0.2, 0, 1)  # always black at the very edge
    lin = lin * 0.55 * light
    lin = lin / (1.0 + lin * 0.4)                        # soft shoulder on skin highlights
    rgb = np.stack([lin * 0.93, lin * 0.975, lin * 1.03], -1)  # cool, like the lamp outside
    out = np.clip(rgb, 0, 1) ** (1 / 2.2)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGB").save(OUT, "WEBP", quality=85, method=6)
    print(OUT, Image.open(OUT).size, os.path.getsize(OUT))


if __name__ == "__main__":
    main()
