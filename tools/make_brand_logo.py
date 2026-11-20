#!/usr/bin/env python3
"""
"Another You" brand mark, drawn as precise vector-style art (no AI): the hero's round white head
with a solid offset silhouette behind it ("another you"). Renders at 4x and downsamples for clean edges.

Usage:
    .venv/bin/python tools/make_brand_logo.py      # writes storage/stick_brand/logo_*.png + logo_options.jpg
"""

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "storage" / "stick_brand"
SIZE = 1024
SS = 4  # supersampling

PALETTES = {
    "coral":  {"bg": "#FF5E3A", "echo": "#1B1F3B"},
    "navy":   {"bg": "#1B1F3B", "echo": "#FFC23C"},
    "yellow": {"bg": "#FFC23C", "echo": "#1B1F3B"},
}


def hair_polygon(cx, cy, r):
    """Hair cap: soft tufts over the crown, a gentle 3-point fringe across the forehead."""
    pts = []
    n = 9
    for i in range(n + 1):  # outer edge, left to right over the top
        a = math.radians(188 - i * (196 / n))
        rr = r * (1.10 if i % 2 else 1.0)
        pts.append((cx + rr * math.cos(a), cy - rr * math.sin(a)))
    fy = cy - r * 0.30
    for x, dy in ((0.98, 0.10), (0.55, -0.02), (0.30, 0.14), (-0.05, -0.04), (-0.40, 0.12), (-0.98, 0.10)):
        pts.append((cx + r * x, fy + r * dy))
    return pts


def head(img, cx, cy, r, face=True, fill="white", ink="#111111", stroke=0.0, hair=True):
    d = ImageDraw.Draw(img)
    w = int(r * stroke) if stroke else 0
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)
    if hair:  # hair clipped to a slightly larger circle so tufts stay round and tidy
        mask = Image.new("L", img.size, 0)
        md = ImageDraw.Draw(mask)
        md.polygon(hair_polygon(cx, cy, r), fill=255)
        clip = Image.new("L", img.size, 0)
        ImageDraw.Draw(clip).ellipse([cx - r * 1.07, cy - r * 1.07, cx + r * 1.07, cy + r * 1.07], fill=255)
        from PIL import ImageChops
        img.paste(ink, (0, 0), ImageChops.multiply(mask, clip))
    if w:
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=ink, width=w)
    if face:
        er = r * 0.09
        for sx in (-0.32, 0.32):
            ex, ey = cx + r * sx, cy + r * 0.10
            d.ellipse([ex - er, ey - er, ex + er, ey + er], fill=ink)
        d.arc([cx - r * 0.28, cy + r * 0.10, cx + r * 0.28, cy + r * 0.56], 25, 155, fill=ink, width=int(r * 0.075))


def render(palette: dict) -> Image.Image:
    S = SIZE * SS
    img = Image.new("RGB", (S, S), palette["bg"])
    r = S * 0.25
    cx, cy = S * 0.44, S * 0.54
    # echo: a second, plain head offset to the right - "another you"
    head(img, cx + r * 0.62, cy - r * 0.12, r, face=False, fill=palette["echo"], ink=palette["echo"], hair=True)
    head(img, cx, cy, r, face=True, fill="white", ink="#111111", stroke=0.07)
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tiles = []
    for name, pal in PALETTES.items():
        im = render(pal)
        im.save(OUT / f"logo_{name}.png")
        tiles.append((name, im))

    # preview: each option as a big circle and as a tiny feed-size circle
    W = 3 * 520 + 40
    sheet = Image.new("RGB", (W, 700), "#F2F2F2")
    sd = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 34)
    for i, (name, im) in enumerate(tiles):
        x = 20 + i * 520
        mask = Image.new("L", (480, 480), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, 479, 479], fill=255)
        sheet.paste(im.resize((480, 480), Image.LANCZOS), (x, 60), mask)
        small = im.resize((56, 56), Image.LANCZOS)
        m2 = Image.new("L", (56, 56), 0)
        ImageDraw.Draw(m2).ellipse([0, 0, 55, 55], fill=255)
        sheet.paste(small, (x, 600), m2)
        sd.text((x + 70, 610), "feed size", fill="#666666", font=ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 24))
        sd.text((x, 10), f"{i + 1}. {name}", fill="#111111", font=font)
    sheet.save(OUT / "logo_options.jpg", quality=92)
    print(OUT / "logo_options.jpg")


if __name__ == "__main__":
    main()
