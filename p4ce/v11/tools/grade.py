"""PR6 v11 shared grade: the Graded World Rule (DESIGN.md).

Mist #CAD5DA / Steel Blue #718B9A cast, lifted blacks, fine grain, warm skin kept.
One function, a few named presets, so every photo, render and kit crop lands in one world.

  grade(img: PIL.Image RGB, preset="photo", seed=0) -> PIL.Image RGB
Presets: photo, macro, xray, render, kit, night.
"""
import numpy as np
from PIL import Image, ImageFilter


def hexf(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4)], np.float32)


INK = hexf("1B2328")     # lifted black (Ink #171C1F, lifted a touch)
STEEL = hexf("718B9A")
MIST = hexf("CAD5DA")
CHALK = hexf("F2F3EF")

PRESETS = {
    #           tone: amount of the Ink>Steel>Mist>Chalk duotone mixed in (non-skin / skin)
    #           sat: saturation kept (non-skin / skin); lift: black floor; grain: sigma; gamma: midtone
    "photo":  dict(tone=0.62, tone_skin=0.28, sat=0.42, sat_skin=0.80, lift=0.075, roll=0.035, grain=0.020, gamma=0.94, contrast=0.92),
    "macro":  dict(tone=0.70, tone_skin=0.40, sat=0.35, sat_skin=0.70, lift=0.070, roll=0.030, grain=0.018, gamma=0.95, contrast=0.95),
    "xray":   dict(tone=0.55, tone_skin=0.55, sat=0.55, sat_skin=0.55, lift=0.050, roll=0.020, grain=0.016, gamma=1.06, contrast=1.14),
    "render": dict(tone=0.28, tone_skin=0.28, sat=0.75, sat_skin=0.75, lift=0.045, roll=0.015, grain=0.012, gamma=1.02, contrast=1.06),
    "kit":    dict(tone=0.40, tone_skin=0.20, sat=0.65, sat_skin=0.85, lift=0.060, roll=0.020, grain=0.016, gamma=0.98, contrast=0.97),
    "night":  dict(tone=0.45, tone_skin=0.30, sat=0.55, sat_skin=0.80, lift=0.030, roll=0.010, grain=0.016, gamma=1.00, contrast=1.00),
}


def skin_mask(a):
    """Soft mask of skin tones (YCrCb box, feathered)."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    y = 0.299 * r + 0.587 * g + 0.114 * b
    cr = (r - y) * 0.713 + 0.5
    cb = (b - y) * 0.564 + 0.5
    m = np.clip(1 - np.abs(cr - 0.60) / 0.075, 0, 1) * np.clip(1 - np.abs(cb - 0.42) / 0.075, 0, 1)
    m *= np.clip((y - 0.12) / 0.10, 0, 1)  # not in deep shadow
    im = Image.fromarray((np.clip(m * 1.6, 0, 1) * 255).astype(np.uint8))
    im = im.filter(ImageFilter.GaussianBlur(max(2, a.shape[1] / 300)))
    return np.asarray(im, np.float32)[..., None] / 255.0


def duotone(L):
    """Map luminance to the PR6 ramp Ink -> Steel Blue -> Mist -> Chalk."""
    stops = [(0.0, INK), (0.42, STEEL), (0.78, MIST), (1.0, CHALK)]
    out = np.zeros(L.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(stops[:-1], stops[1:]):
        t = np.clip((L - p0) / (p1 - p0), 0, 1)[..., None]
        sel = ((L >= p0) & (L <= p1))[..., None]
        out = np.where(sel, c0 + (c1 - c0) * t, out)
    return out


def grade(img, preset="photo", seed=0, **over):
    p = dict(PRESETS[preset])
    p.update(over)
    a = np.asarray(img.convert("RGB"), np.float32) / 255.0
    sk = skin_mask(a) if p["tone"] != p["tone_skin"] or p["sat"] != p["sat_skin"] else np.zeros(a.shape[:2] + (1,), np.float32)
    L = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]
    # saturation
    sat = p["sat"] * (1 - sk) + p["sat_skin"] * sk
    a = L + (a - L) * sat
    # contrast around mid grey + midtone gamma
    a = np.clip(0.5 + (a - 0.5) * p["contrast"], 0, 1) ** p["gamma"]
    L2 = (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])
    # the world cast: blend towards the ramp, less on skin so it stays warm
    tone = p["tone"] * (1 - sk) + p["tone_skin"] * sk
    a = a * (1 - tone) + duotone(L2) * tone
    # lifted blacks / rolled highlights (tinted lift = Ink, not grey)
    lift = p["lift"]
    a = lift + a * (1 - lift - p["roll"])
    a = a + (INK - INK.mean()) * (1 - L2[..., None]) * 0.6  # cool the floor slightly
    # fine luminance grain, strongest in mid tones, very slightly soft
    rng = np.random.default_rng(seed)
    n = rng.normal(0, 1, a.shape[:2]).astype(np.float32)
    nim = Image.fromarray(np.clip(n * 40 + 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.45))
    n = (np.asarray(nim, np.float32) - 128) / 40
    mid = 0.55 + 1.6 * L2 * (1 - L2)
    a = a + (n * p["grain"] * mid)[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


if __name__ == "__main__":
    import sys
    im = Image.open(sys.argv[1])
    grade(im, sys.argv[3] if len(sys.argv) > 3 else "photo").save(sys.argv[2], quality=90)
