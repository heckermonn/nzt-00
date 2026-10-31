"""Write v11/CREDITS.md from assets/img/img.json.  python3 -I credits.py"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
V11 = os.path.dirname(HERE)

HEAD = """# PR6 v11 · image credits

Every image in `assets/img/` is listed here and in `assets/img/img.json` (`credit`, `licence`, `source`),
which the site shows on `#/credits`. All images are graded to the PR6 world by `tools/grade.py`
(Mist / Steel Blue cast, lifted blacks, fine grain) and cropped; Commons images are therefore
modified versions ("adapted") of the originals. CC BY and CC BY-SA images keep their licence
for the adapted file; CC0 and public-domain images need no credit but are credited anyway.

Sources used: Wikimedia Commons (API only; public domain, CC0, CC BY, CC BY-SA), the owner's
brand kit `PR6.pdf` (concept art, used with the owner's permission; slide type and HUD marks
removed by `tools/kit_prep.py`), and Blender 5.2 Cycles renders (`blender/render_v11.py`, reusing
the v6 pack builders). No Pinterest, Behance or TikTok material is used.

Rebuild: `tools/commons.py` (fetch) → `tools/kit_prep.py` (kit crops) → `blender/render_v11.py`
(renders) → `tools/build_img.py` (crop, grade, webp, lqip, img.json) → `tools/contact_sheet.py`
→ `tools/credits.py`.

| Key | Kind | Credit | Licence | Source |
|---|---|---|---|---|
"""


def main():
    data = json.load(open(os.path.join(V11, "assets", "img", "img.json")))
    rows = []
    for k, r in data.items():
        src = r["source"]
        src = "[file page](%s)" % src if src.startswith("http") else src
        rows.append("| `%s` | %s | %s | %s | %s |" % (k, r["kind"], r["credit"].replace("|", "/"), r["licence"], src))
    open(os.path.join(V11, "CREDITS.md"), "w").write(HEAD + "\n".join(rows) + "\n")
    print("CREDITS.md", len(rows), "rows")


if __name__ == "__main__":
    main()
