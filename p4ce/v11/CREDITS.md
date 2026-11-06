# PR6 v11 · image credits

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
| `hero` | photo | Isaac Wendland isaacwendland, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Running_in_the_winter_(Unsplash).jpg) |
| `hero-sharp` | photo | Isaac Wendland isaacwendland, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Running_in_the_winter_(Unsplash).jpg) |
| `c01` | photo | Geetanjal Khanna geetanjalkhanna, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Geetanjal_Khanna_2016_(Unsplash).jpg) |
| `c02` | photo | Scott Webb scottwebb, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:World_Gym_workout_(Unsplash).jpg) |
| `c03` | photo | Filip Mroz mroz, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Gym_Life_(Unsplash).jpg) |
| `c04` | photo | Matteo Vistocco biscuits94, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:I_canottari_(Unsplash).jpg) |
| `c05` | photo | Felix Russell-Saw frsphoto, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Foggy_Swim_(Unsplash).jpg) |
| `c06` | kit | PR6 brand kit (concept), slide 7, type removed | Owner's kit, used with permission | PR6.pdf (owner's brand kit) |
| `c07` | photo | Usama usamaa, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Up_Close_(Unsplash).jpg) |
| `c08` | photo | Lotte Meijer lottemeijer, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Freckles_on_dutch_girl_face_(Unsplash).jpg) |
| `c09` | photo | Shixart1985, via Wikimedia Commons | CC BY 2.0 | [file page](https://commons.wikimedia.org/wiki/File:Senior_woman_doing_fitnes_at_home._Sports_shoes_closeup.jpg) |
| `macro-eye` | photo | Jordan Whitfield whitfieldjordan, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Eye_Contact_(Unsplash).jpg) |
| `macro-skin` | photo | Ildar Sagdejev (Specious), via Wikimedia Commons | CC BY-SA 3.0 | [file page](https://commons.wikimedia.org/wiki/File:2003-09-17_Goose_bumps.jpg) |
| `macro-cell` | kit | PR6 brand kit (concept), slide 1, type removed | Owner's kit, used with permission | PR6.pdf (owner's brand kit) |
| `body-xray` | kit | PR6 brand kit (concept), slide 5, type and markers removed | Owner's kit, used with permission | PR6.pdf (owner's brand kit) |
| `glass-face` | photo | William Stitt willpower, via Wikimedia Commons | CC0 | [file page](https://commons.wikimedia.org/wiki/File:Xavier_(Unsplash).jpg) |
| `pack-tin` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-tin-detail` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-pouch` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-pouch-detail` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-box` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-box-detail` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-dropper` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-dropper-detail` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-jar` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `pack-jar-detail` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
| `night` | render | PR6 studio render (Blender Cycles), blender/render_v11.py | PR6 original, all rights reserved | Blender 5.2 Cycles render |
