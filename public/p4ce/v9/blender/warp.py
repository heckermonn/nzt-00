# estimate a similarity transform (scale s, translation tx,ty) mapping frame i -> frame i+1, in units of image width,
# around the image centre: p_{i+1} = c + s*(p_i - c) + t
import cv2, numpy as np, json, sys
D = sys.argv[1]
N = int(sys.argv[2])
orb = cv2.ORB_create(4000, fastThreshold=5)
def load(i):
    im = cv2.imread(f'{D}/d/{i:03d}.webp', cv2.IMREAD_GRAYSCALE)
    return im
res = []
prev = load(0); W = prev.shape[1]
clahe = cv2.createCLAHE(3.0, (8, 8))
for i in range(N - 1):
    cur = load(i + 1)
    a, b = clahe.apply(prev), clahe.apply(cur)
    ka, da = orb.detectAndCompute(a, None); kb, db = orb.detectAndCompute(b, None)
    M = None; inl = 0
    if da is not None and db is not None and len(ka) > 20 and len(kb) > 20:
        bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
        m = sorted(bf.match(da, db), key=lambda x: x.distance)[:1500]
        pa = np.float32([ka[x.queryIdx].pt for x in m]); pb = np.float32([kb[x.trainIdx].pt for x in m])
        M, mask = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=2.5, maxIters=5000, confidence=0.999)
        inl = int(mask.sum()) if mask is not None else 0
    if M is None:
        s, tx, ty = 1.0, 0.0, 0.0
    else:
        s = float(np.hypot(M[0, 0], M[1, 0])); c = W / 2
        # p' = A p + T ; rewrite about centre: p' = c + s (p - c) + t  =>  t = A c + T - c
        cc = np.array([c, c]); t = M[:, :2] @ cc + M[:, 2] - cc
        tx, ty = float(t[0] / W), float(t[1] / W)
    res.append([round(tx, 5), round(ty, 5), round(s, 5)])
    print(i, inl, res[-1], file=sys.stderr)
    prev = cur
print(json.dumps(res))
