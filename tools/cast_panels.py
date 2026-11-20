#!/usr/bin/env python3
"""
Cut cast sheets into individual figure panels, and assemble clean sheets
from chosen panels.

Usage:
    .venv/bin/python tools/cast_panels.py split            # all sheets -> storage/stick_cast/panels/
    .venv/bin/python tools/cast_panels.py assemble you front=panels/you_r1_c0.png side=... ...
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CAST_DIR = ROOT / "storage" / "stick_cast"
PANELS = CAST_DIR / "panels"
NAMES = ["you", "crush", "bestie", "rival", "mentor", "pet", "nadia", "brick", "eleanor"]


def _runs(mask: np.ndarray, min_gap: int, min_len: int) -> list[tuple[int, int]]:
    """Return [start, end) spans where mask is True, merging gaps shorter than min_gap."""
    spans, start, gap = [], None, 0
    for i, v in enumerate(mask):
        if v:
            if start is None:
                start = i
            gap = 0
        elif start is not None:
            gap += 1
            if gap >= min_gap:
                spans.append((start, i - gap + 1))
                start, gap = None, 0
    if start is not None:
        spans.append((start, len(mask) - gap))
    return [s for s in spans if s[1] - s[0] >= min_len]


def split_sheet(name: str) -> list[Path]:
    img = Image.open(CAST_DIR / f"{name}.jpg").convert("RGB")
    ink = np.asarray(img.convert("L")) < 200
    out = []
    rows = _runs(ink.any(axis=1), min_gap=25, min_len=60)
    for r, (y0, y1) in enumerate(rows):
        cols = _runs(ink[y0:y1].any(axis=0), min_gap=25, min_len=40)
        for c, (x0, x1) in enumerate(cols):
            pad = 12
            box = (max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad))
            p = PANELS / f"{name}_r{r}_c{c}.png"
            img.crop(box).save(p)
            out.append(p)
    return out


def split_all() -> None:
    PANELS.mkdir(parents=True, exist_ok=True)
    font = ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 22)
    for name in NAMES:
        panels = split_sheet(name)
        # labelled index so panels can be picked by eye
        th = 300
        tiles = []
        for p in panels:
            im = Image.open(p)
            im.thumbnail((th, th))
            tile = Image.new("RGB", (th, th + 34), (255, 255, 255))
            tile.paste(im, ((th - im.width) // 2, 34 + (th - im.height) // 2))
            ImageDraw.Draw(tile).text((6, 4), p.stem, fill=(200, 0, 0), font=font)
            tiles.append(tile)
        per_row = 6
        rows = (len(tiles) + per_row - 1) // per_row
        sheet = Image.new("RGB", (per_row * (th + 8), rows * (th + 42)), (40, 40, 40))
        for i, t in enumerate(tiles):
            sheet.paste(t, ((i % per_row) * (th + 8), (i // per_row) * (th + 42)))
        sheet.save(PANELS / f"_index_{name}.jpg", quality=85)
        print(f"{name}: {len(panels)} panels")


def assemble(name: str, views: list[Path], faces: list[Path]) -> Path:
    """Top row: full-body views. Bottom row: expression close-ups. White background."""
    W = 1536
    top_h, bot_h, gap = 860, 560, 40

    def place_row(canvas, items, y, h):
        cell = W // len(items)
        for i, p in enumerate(items):
            im = Image.open(p).convert("RGB")
            im.thumbnail((cell - gap, h - gap), Image.LANCZOS)
            x = i * cell + (cell - im.width) // 2
            canvas.paste(im, (x, y + (h - im.height) // 2))

    canvas = Image.new("RGB", (W, top_h + bot_h), (255, 255, 255))
    place_row(canvas, views, 0, top_h)
    if faces:
        place_row(canvas, faces, top_h, bot_h)
    out = CAST_DIR / f"{name}.jpg"
    canvas.save(out, quality=95)
    return out


if __name__ == "__main__":
    if sys.argv[1:2] == ["split"]:
        split_all()
    elif sys.argv[1:2] == ["assemble"]:
        name = sys.argv[2]
        views = [CAST_DIR / a.split("=", 1)[1] for a in sys.argv[3:] if a.startswith("view=")]
        faces = [CAST_DIR / a.split("=", 1)[1] for a in sys.argv[3:] if a.startswith("face=")]
        print(assemble(name, views, faces))
    else:
        sys.exit(__doc__)
