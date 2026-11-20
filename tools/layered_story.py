#!/usr/bin/env python3
"""
Layered stick-story pipeline (Lantern Job Part 4 onwards).

Instead of asking the image model for a whole scene per frame (which broke faces, duplicated people and changed the
room between shots), every picture holds ONE thing:
    locations - each background drawn once, empty, reused by every shot there ("EDIT:<loc>:..." = variant of another)
    poses     - one character per image on a green screen, drawn from that character's cast sheet
    inserts   - one object / detail close-up (hands allowed)
The render stage keys out the green, places the characters on the background with shadows and depth, animates them
(walking, breathing, pose changes on the narrated word) and moves the camera (wide / medium / close-up).

Usage:
    .venv/bin/python tools/layered_story.py assets --slug lantern_p4            # generate missing images
    .venv/bin/python tools/layered_story.py sheet --slug lantern_p4             # contact sheets for review
    .venv/bin/python tools/layered_story.py render --slug lantern_p4 --part A   # render 4A (or B, or all)
"""

import argparse
import json
import shutil
import sys
import zlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))

from stick_consistency_test import KLEIN, gen_text_to_image, gen_with_references  # noqa: E402
import stick_story as ss  # noqa: E402

EPISODES = ROOT / "storage" / "stick_episodes"
PLATE_W, PLATE_H = 1920, 1088
GREEN = ("on a plain flat solid bright GREEN background (#00FF00), nothing else behind the character: no floor, no "
         "shadow, no scenery, no text")


def ep_dir(slug: str) -> Path:
    return EPISODES / slug


# ---------------------------------------------------------------------- assets

def _copy_from(slug: str, kind: str, key: str, out: Path) -> bool:
    """Reuse an image another episode already generated (no pollen)."""
    src = EPISODES / slug / kind / f"{key}.jpg"
    if not src.exists():
        return False
    shutil.copy(src, out)
    return True


def _plate(data: dict, lid: str, out: Path, plates: Path) -> bool:
    desc = data["locations"][lid]
    if desc.startswith("COPY:"):
        return _copy_from(desc.split(":", 1)[1], "plates", lid, out)
    if desc.startswith("EDIT:"):
        _, base, change = desc.split(":", 2)
        src = plates / f"{base}.jpg"
        if not src.exists():
            return False
        return gen_with_references(f"Edit this image: {change} No people. No text.", [src], out, f"{PLATE_W}x{PLATE_H}")
    prompt = (f"{desc} Very richly detailed environment full of props. Completely empty: no people, no figures, no faces. "
              f"Single full frame, no text, no letters. {data['style']}")
    return gen_text_to_image(prompt, out, KLEIN, PLATE_W, PLATE_H, seed=zlib.crc32(lid.encode()) % 10000)


def _pose(data: dict, pid: str, out: Path) -> bool:
    p = data["poses"][pid]
    if p.get("copy"):
        return _copy_from(p["copy"], "poses", pid, out)
    if p.get("bust"):
        frame = "Head and shoulders only, large and centered, filling most of the image"
        size = "1024x1024"
    else:
        frame = "Exactly one character, the whole body visible from head to shoes, centered"
        size = "768x1344"
    if p.get("desc"):  # minor character without a cast sheet: text only
        w, h = (int(v) for v in size.split("x"))
        prompt = f"{p['desc']}. {frame}, {GREEN}. {data['style']}"
        return gen_text_to_image(prompt, out, KLEIN, w, h, seed=zlib.crc32(pid.encode()) % 10000)
    costumes = {p["char"]: p["costume"]} if p.get("costume") else {}
    sheet, desc = ss._sheet_and_desc(p["char"], costumes)
    prompt = (f"A single character: {desc} (reference image 1), {p['pose']}. {frame}, {GREEN}. Match the reference "
              f"character's head, hair and outfit exactly. {data['style']}")
    return gen_with_references(prompt, [sheet], out, size)


def _insert(data: dict, iid: str, out: Path) -> bool:
    if data["inserts"][iid].startswith("COPY:"):
        return _copy_from(data["inserts"][iid].split(":", 1)[1], "inserts", iid, out)
    prompt = (f"{data['inserts'][iid]}. No faces and no full people in the frame (only hands where described). Any hands are "
              f"plain WHITE cartoon hands with thick black outlines, exactly like simple stick-figure cartoon characters, "
              f"never realistic skin. Single "
              f"full frame, no text, no letters, no numbers. {data['style']}")
    return gen_text_to_image(prompt, out, KLEIN, 1344, 768, seed=zlib.crc32(iid.encode()) % 10000)


def _frame(data: dict, fid: str, out: Path, plates: Path) -> bool:
    """A real multi-character image (people touching / handing things over), drawn INTO the shot's background plate so
    the room matches the layered shots. Reference 1 = plate, then one cast sheet per named character."""
    f = data["frames"][fid]
    if f.get("copy"):
        return _copy_from(f["copy"], "frames", fid, out)
    plate = plates / f"{f['loc']}.jpg"
    refs, who = [plate], []
    for c, costume in f.get("chars", []):
        sheet, desc = ss._sheet_and_desc(c, {c: costume} if costume else {})
        refs.append(sheet)
        who.append(f"{desc} (reference image {len(refs)})")
    for pid, desc in f.get("pose_refs", []):  # minor characters: their already-approved pose image as the reference
        refs.append(plates.parent / "poses" / f"{pid}.jpg")
        who.append(f"{desc} (reference image {len(refs)}, ignore its green background)")
    n = len(who) + len(f.get("extras", []))
    prompt = (f"Use reference image 1 as the exact background: keep that room, its furniture, camera angle and lighting "
              f"unchanged. Draw into it: {f['desc']}. Characters: {'; '.join(who + f.get('extras', []))}. Exactly {n} "
              f"people, each appearing once with exactly one head, matching their reference sheets exactly. Nobody else. "
              f"No text. {data['style']}")
    return gen_with_references(prompt, refs, out, f"{PLATE_W}x{PLATE_H}")


def stage_assets(slug: str, only: list[str] | None = None) -> None:
    d = ep_dir(slug)
    data = json.loads((d / "script.json").read_text())
    dirs = {k: d / k for k in ("plates", "poses", "inserts", "frames")}
    for p in dirs.values():
        p.mkdir(exist_ok=True)
    # plain plates first so EDIT variants find their base
    jobs = sorted(data["locations"], key=lambda k: data["locations"][k].startswith("EDIT:"))  # COPY/new first
    todo = [("plates", k, _plate) for k in jobs] + [("poses", k, _pose) for k in data["poses"]] + \
           [("inserts", k, _insert) for k in data["inserts"]] + [("frames", k, _frame) for k in data.get("frames", {})]
    made = failed = 0
    for kind, key, fn in todo:
        if only and key not in only:
            continue
        out = dirs[kind] / f"{key}.jpg"
        if out.exists():
            continue
        ok = fn(data, key, out, dirs["plates"]) if kind in ("plates", "frames") else fn(data, key, out)
        made += ok
        failed += not ok
        print(f"  {kind}/{key}: {'ok' if ok else 'FAILED'}", flush=True)
    print(f"done: {made} generated (~{made * 0.005:.3f} pollen), {failed} failed")


def stage_sheet(slug: str) -> None:
    d = ep_dir(slug)
    font = ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 20)
    for kind, th in (("plates", (480, 272)), ("poses", (200, 300)), ("inserts", (400, 228)), ("frames", (480, 272))):
        files = sorted((d / kind).glob("*.jpg"))
        if not files:
            continue
        cols = 4 if kind != "poses" else 10
        rows = (len(files) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * (th[0] + 6), rows * (th[1] + 30)), (30, 30, 30))
        for i, f in enumerate(files):
            im = Image.open(f).convert("RGB")
            im.thumbnail(th)
            x, y = (i % cols) * (th[0] + 6), (i // cols) * (th[1] + 30)
            sheet.paste(im, (x, y + 26))
            ImageDraw.Draw(sheet).text((x + 3, y + 2), f.stem, fill=(255, 220, 0), font=font)
        sheet.save(d / f"_sheet_{kind}.jpg", quality=85)
        print(d / f"_sheet_{kind}.jpg")


# ---------------------------------------------------------------------- cutouts

def cutout(src: Path, cache: Path) -> Image.Image:
    """Green screen -> RGBA, cropped to the character, with green fringes removed."""
    if cache.exists() and cache.stat().st_mtime >= src.stat().st_mtime:
        return Image.open(cache)
    a = np.asarray(Image.open(src).convert("RGB")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 120) & (g > r + 45) & (g > b + 45)
    # only green connected to the border is background (keeps green clothes / props inside the outline)
    from collections import deque
    h, w = green.shape
    bgmask = np.zeros_like(green)
    q = deque([(y, x) for y in (0, h - 1) for x in range(w) if green[y, x]] +
              [(y, x) for x in (0, w - 1) for y in range(h) if green[y, x]])
    for y, x in q:
        bgmask[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and green[ny, nx] and not bgmask[ny, nx]:
                bgmask[ny, nx] = True
                q.append((ny, nx))
    # enclosed green pockets (between arm and body) that are pure screen green also go
    pure = (g > 200) & (r < 90) & (b < 90)
    bgmask |= pure
    alpha = np.where(bgmask, 0, 255).astype(np.uint8)
    spill = (g > r + 15) & (g > b + 15) & ~bgmask
    rgb = a.copy()
    rgb[..., 1] = np.where(spill, np.maximum(r, b), g)
    im = Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), alpha]), "RGBA")
    al = im.split()[3].filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    im.putalpha(al)
    im = im.crop(im.getbbox())
    cache.parent.mkdir(exist_ok=True)
    im.save(cache)
    return im


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["assets", "sheet", "render"])
    ap.add_argument("--slug", required=True)
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--part", default="all")
    a = ap.parse_args()
    if a.stage == "assets":
        stage_assets(a.slug, a.only)
    elif a.stage == "sheet":
        stage_sheet(a.slug)
    else:
        from layered_render import stage_render
        stage_render(a.slug, a.part)
