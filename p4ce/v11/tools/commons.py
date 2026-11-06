"""Wikimedia Commons search + fetch for PR6 v11 imagery (API only, polite UA, low volume).

  python3 -I commons.py search "<query>" OUTDIR [--n 20]
      -> OUTDIR/<slug>/index.json (title, licence, artist, size, file page, thumb) and
         400px preview thumbs, plus OUTDIR/<slug>/sheet.jpg to look at.
         Only files whose licence is PD / CC0 / CC BY / CC BY-SA are kept.
  python3 -I commons.py fetch "File:Name.jpg" OUTDIR [--w 2400]
      -> OUTDIR/<safe name> (a scaled original, 2400px wide max) + .json metadata.

Downloads are untrusted data: OUTDIR must be a dedicated download directory.
"""
import html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "PR6-prototype-imagery/1.0 (https://github.com/heckermonn/nzt-00; low-volume research)"
OK = re.compile(r"^(public domain|pd\b|pd-|cc0|cc[- ]by(-sa)?[- ]?\d(\.\d)?|cc[- ]by(-sa)?$)", re.I)


def get(url, binary=False, tries=4):
    """Polite GET: honours Retry-After on 429 (capped at 15 min)."""
    import urllib.error
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=90) as r:
                data = r.read()
            return data if binary else json.loads(data)
        except urllib.error.HTTPError as e:
            wait = 8 * (i + 1)
            if e.code == 429:
                try:
                    wait = min(900, int(e.headers.get("Retry-After", "60")) + 5)
                except ValueError:
                    wait = 120
            print("  %s, waiting %ds" % (e, wait), file=sys.stderr, flush=True)
            time.sleep(wait)
        except Exception as e:  # noqa: BLE001
            print("  retry", i, e, file=sys.stderr, flush=True)
            time.sleep(8 * (i + 1))
    raise RuntimeError("failed " + url)


def strip(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    return html.unescape(s).strip()


def licence_ok(meta):
    short = strip(meta.get("LicenseShortName", {}).get("value", ""))
    nonfree = meta.get("NonFree", {}).get("value", "")
    restr = strip(meta.get("Restrictions", {}).get("value", ""))
    if nonfree in ("true", True):
        return False, short
    if restr and "trademark" not in restr.lower() and "personality" not in restr.lower():
        return False, short + " [restrictions: %s]" % restr
    return bool(OK.match(short)), short


def info_params(titles=None, gsearch=None, n=20, thumbw=330):
    p = {"action": "query", "format": "json", "prop": "imageinfo",
         "iiprop": "url|size|mime|extmetadata", "iiurlwidth": str(thumbw)}
    if gsearch:
        p.update({"generator": "search", "gsrsearch": gsearch, "gsrnamespace": "6", "gsrlimit": str(n)})
    if titles:
        p["titles"] = titles
    return API + "?" + urllib.parse.urlencode(p)


def record(page):
    ii = page["imageinfo"][0]
    m = ii.get("extmetadata", {})
    ok, short = licence_ok(m)
    return {
        "title": page["title"], "ok": ok, "licence": short,
        "licence_url": strip(m.get("LicenseUrl", {}).get("value", "")),
        "artist": strip(m.get("Artist", {}).get("value", "")),
        "credit": strip(m.get("Credit", {}).get("value", ""))[:200],
        "desc": strip(m.get("ImageDescription", {}).get("value", ""))[:240],
        "w": ii["width"], "h": ii["height"], "mime": ii["mime"],
        "page": ii["descriptionurl"], "url": ii["url"], "thumb": ii.get("thumburl"),
    }


def safe(name):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name.replace("File:", ""))[:120]


def search(q, out, n):
    d = os.path.join(out, safe(q))
    os.makedirs(d, exist_ok=True)
    js = get(info_params(gsearch=q + " filew:>1400 filemime:image/jpeg", n=n))
    pages = sorted(js.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0))
    recs = []
    for p in pages:
        if "imageinfo" not in p:
            continue
        r = record(p)
        if not r["ok"]:
            print("skip licence:", r["title"], r["licence"])
            continue
        tp = os.path.join(d, "%02d.jpg" % len(recs))
        if NOTHUMBS:
            recs.append(r)
            continue
        if not (os.path.exists(tp) and os.path.getsize(tp) > 0):
            open(tp, "wb").write(get(r["thumb"], binary=True))
            time.sleep(2.5)
        r["preview"] = tp
        recs.append(r)
    json.dump(recs, open(os.path.join(d, "index.json"), "w"), indent=1)
    if not NOTHUMBS:
        sheet(recs, os.path.join(d, "sheet.jpg"))
    for i, r in enumerate(recs):
        print("%02d %-70s %5dx%-5d %s | %s | %s" % (i, r["title"][:70], r["w"], r["h"], r["licence"], r["artist"][:30], r["desc"][:90]))


def sheet(recs, path):
    from PIL import Image, ImageDraw
    if not recs:
        return
    T = 300
    cols = 5
    rows = (len(recs) + cols - 1) // cols
    sh = Image.new("RGB", (cols * T, rows * (T + 16)), "white")
    dr = ImageDraw.Draw(sh)
    for i, r in enumerate(recs):
        try:
            im = Image.open(r["preview"]).convert("RGB")
            im.thumbnail((T, T))
            x, y = (i % cols) * T, (i // cols) * (T + 16)
            sh.paste(im, (x, y))
            dr.text((x + 3, y + T + 2), "%02d %dx%d" % (i, r["w"], r["h"]), fill="black")
        except Exception as e:  # noqa: BLE001
            print("thumb fail", e)
    sh.save(path, quality=82)


def fetch(title, out, w):
    os.makedirs(out, exist_ok=True)
    js = get(info_params(titles=title, thumbw=w))
    page = next(iter(js["query"]["pages"].values()))
    r = record(page)
    if not r["ok"]:
        raise SystemExit("licence not acceptable: %s %s" % (title, r["licence"]))
    # Wikimedia asks for standard thumbnail widths (https://w.wiki/GHai) instead of originals:
    # pass --w 1920 or 3840 (one API call); the original is used only when it is narrower.
    src = r["thumb"] if (r["w"] > w and r.get("thumb")) else r["url"]
    fn = os.path.join(out, safe(title))
    if not fn.lower().endswith((".jpg", ".jpeg", ".png", ".tif", ".tiff")):
        fn += ".jpg"
    if not (os.path.exists(fn) and os.path.getsize(fn) > 0):
        data = get(src, binary=True)
        open(fn + ".part", "wb").write(data)
        os.replace(fn + ".part", fn)
    json.dump(r, open(fn + ".json", "w"), indent=1)
    print(fn, r["licence"], r["artist"])


NOTHUMBS = "--nothumbs" in sys.argv

if __name__ == "__main__":
    cmd, arg, out = sys.argv[1], sys.argv[2], sys.argv[3]
    n = int(sys.argv[sys.argv.index("--n") + 1]) if "--n" in sys.argv else 20
    w = int(sys.argv[sys.argv.index("--w") + 1]) if "--w" in sys.argv else 1920
    if cmd == "search":
        search(arg, out, n)
    else:
        fetch(arg, out, w)
