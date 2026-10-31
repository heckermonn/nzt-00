"""Clean crops from the owner's kit (/mnt/project-files/PR6.pdf, embedded images via pdfimages).

Removes the slide typography and HUD marks so the site can set its own (true) labels:
  kit_prep.py RAWDIR OUTDIR
RAWDIR holds k-001-000.png (slide 1, cells) and k-005-006.png (slide 5, x-ray figure).
Writes OUTDIR/kit-cells.png and OUTDIR/kit-xray.png (+ *_mask.png for checking).
"""
import os
import sys

import cv2
import numpy as np


def clean(img, mask, shift=(0, -260)):
    """Fill masked pixels: inpaint the low frequencies, then borrow high-frequency texture
    (grain, paper) from a shifted region so the patch does not read as a smudge."""
    img = img.astype(np.float32)
    lf = cv2.GaussianBlur(img, (0, 0), 5)
    hf = img - lf
    # inpaint at full resolution (boundary pixels are clean), then keep only its low frequencies
    base = cv2.inpaint(np.clip(img, 0, 255).astype(np.uint8), mask, 9, cv2.INPAINT_TELEA).astype(np.float32)
    lf_in = cv2.GaussianBlur(base, (0, 0), 3.0)
    M = np.float32([[1, 0, shift[0]], [0, 1, shift[1]]])
    hf_s = cv2.warpAffine(hf, M, (img.shape[1], img.shape[0]), borderMode=cv2.BORDER_REFLECT)
    fill = lf_in + hf_s
    m = cv2.GaussianBlur(mask.astype(np.float32) / 255.0, (0, 0), 2.0)[..., None]
    return np.clip(img * (1 - m) + fill * m, 0, 255).astype(np.uint8)


def box_mask(shape, boxes):
    m = np.zeros(shape[:2], np.uint8)
    for x0, y0, x1, y1 in boxes:
        m[y0:y1, x0:x1] = 255
    return m


def cells(raw, out):
    im = cv2.imread(os.path.join(raw, "k-001-000.png"))
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.int16)
    bl = cv2.GaussianBlur(g.astype(np.uint8), (0, 0), 12).astype(np.int16)
    bright = ((g - bl) > 28).astype(np.uint8) * 255
    region = box_mask(im.shape, [(400, 610, 720, 740), (350, 740, 780, 780)])
    m = cv2.dilate(cv2.bitwise_and(bright, region), np.ones((25, 25), np.uint8))
    m = cv2.bitwise_or(m, box_mask(im.shape, [(405, 615, 712, 735), (360, 742, 772, 778)]))
    res = clean(im, m, shift=(0, -300))
    res = res[0:1290, :]
    cv2.imwrite(os.path.join(out, "kit-cells.png"), res)
    cv2.imwrite(os.path.join(out, "kit-cells_mask.png"), m[0:1290])


def xray(raw, out):
    im = cv2.imread(os.path.join(raw, "k-005-006.png"))
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    gi = g.astype(np.int16)
    # 1) slide text, dark on mist
    bl = cv2.GaussianBlur(g, (0, 0), 10).astype(np.int16)
    dark = ((bl - gi) > 22).astype(np.uint8) * 255
    m_text = cv2.bitwise_and(dark, box_mask(im.shape, [(1300, 345, 1715, 392)]))
    m_text = cv2.bitwise_or(cv2.dilate(m_text, np.ones((7, 7), np.uint8)), box_mask(im.shape, [(1305, 352, 1712, 388)]))
    # 2) HUD, measured on the slide: two hairlines across the neck, a ruler with ticks,
    #    a long vertical on the spine, a short end mark and two orange markers
    m_h = box_mask(im.shape, [
        (618, 340, 914, 354), (618, 365, 914, 382),      # horizontals
        (752, 335, 780, 360), (752, 360, 780, 392),      # orange markers
        (645, 392, 678, 401), (645, 482, 678, 492), (645, 624, 678, 633), (645, 749, 678, 760),  # ticks
    ])
    m_v = box_mask(im.shape, [
        (657, 338, 665, 887), (761, 338, 770, 887),      # verticals
        (893, 340, 901, 382),                            # end mark
    ])
    # borrow texture from outside each mask: across the line, never along it
    res = clean(im, m_text, shift=(0, 60))
    res = clean(res, m_h, shift=(0, -44))  # content moves up: borrow from 44 px below
    res = clean(res, m_v, shift=(28, 0))
    m = cv2.bitwise_or(m_text, cv2.bitwise_or(m_h, m_v))
    res = res[:, 430:]
    cv2.imwrite(os.path.join(out, "kit-xray.png"), res)
    cv2.imwrite(os.path.join(out, "kit-xray_mask.png"), m[:, 430:])


def balaclava(raw, out):
    """Slide 7 athlete: crop below the headline, remove the two small labels in the crop."""
    im = cv2.imread(os.path.join(raw, "k-007-010.png"))
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    bl = cv2.GaussianBlur(g, (0, 0), 8).astype(np.int16)
    bright = ((g.astype(np.int16) - bl) > 18).astype(np.uint8) * 255
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    orange = ((hsv[..., 0] > 3) & (hsv[..., 0] < 25) & (hsv[..., 1] > 120) & (hsv[..., 2] > 150)).astype(np.uint8) * 255
    region = box_mask(im.shape, [(512, 724, 645, 754), (958, 724, 1140, 754)])
    m = cv2.bitwise_and(cv2.bitwise_or(bright, orange), region)
    m = cv2.bitwise_or(cv2.dilate(m, np.ones((9, 9), np.uint8)), box_mask(im.shape, [(540, 729, 640, 750), (992, 729, 1136, 750)]))
    res = clean(im, m, shift=(0, -34))
    res = res[452:1327, 385:1185]
    cv2.imwrite(os.path.join(out, "kit-balaclava.png"), res)
    cv2.imwrite(os.path.join(out, "kit-balaclava_mask.png"), m[452:1327, 385:1185])


if __name__ == "__main__":
    raw, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    cells(raw, out)
    xray(raw, out)
    balaclava(raw, out)
