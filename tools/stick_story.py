#!/usr/bin/env python3
"""
Stick Story pipeline: second-person "You" stories with the recurring stick cast.

Stages (run in order, each one resumable):
    script  - Groq writes the story as beats (narration + new scene / edit of previous frame)
    images  - flux.2-klein-4b draws new scenes with cast sheets as references, and edits the
              previous frame for expression/action changes
    render  - edge-tts narration, frames cut on the exact narrated word, 2-3 word subtitles

Usage:
    .venv/bin/python tools/stick_story.py script --slug ask_her_out --idea "..."
    .venv/bin/python tools/stick_story.py images --slug ask_her_out
    .venv/bin/python tools/stick_story.py render --slug ask_her_out
"""

import argparse
import asyncio
import json
import random
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "tools"))

from app.config import config  # noqa: E402
from stick_consistency_test import KLEIN, gen_text_to_image, gen_with_references  # noqa: E402

CAST_DIR = ROOT / "storage" / "stick_cast"
EPISODES = ROOT / "storage" / "stick_episodes"
FRAME_SIZE = "1088x1920"
VOICE = "en-US-AndrewMultilingualNeural"
VOICE_RATE = "+10%"
MUSIC_DIR = ROOT / "resource" / "music"

# Story mood -> narration voice + background music. Music is picked at random from
# resource/music/<mood>/ (drop royalty-free tracks there); an empty/missing folder means no music.
# A script.json can override any of these with "voice", "rate", "bgm" ("none" = no music), "bgm_volume".
MOODS = {
    "emotional": {"voice": "en-US-AndrewMultilingualNeural", "rate": "+5%", "bgm_volume": 0.15},
    "comedy":    {"voice": "en-US-AndrewMultilingualNeural", "rate": "+10%", "bgm_volume": 0.10},
    "suspense":  {"voice": "en-US-ChristopherNeural", "rate": "+0%", "bgm_volume": 0.18},
    "epic":      {"voice": "en-GB-RyanNeural", "rate": "+5%", "bgm_volume": 0.15},
    "romance":   {"voice": "en-US-JennyNeural", "rate": "+5%", "bgm_volume": 0.15},
}
MIN_FRAME_SECONDS = 1.2

CAST = {
    "you": "YOU, the hero: short messy black hair, round white head, dot eyes, blue t-shirt, grey jeans, white sneakers",
    "crush": "CRUSH, the girl: long auburn ponytail with a yellow hair tie, eyelashes, green sweater, dark blue skirt",
    "bestie": "BESTIE, the best friend: big round black glasses, curly brown hair, toothy grin, orange hoodie, brown shorts",
    "rival": "RIVAL: slicked-back black hair, sharp angry eyebrows, pointy curled mustache, dark purple suit, black tie",
    "mentor": "MENTOR, an old man: bald, long white beard, round spectacles, brown cardigan, wooden cane",
    "pet": "PET, a stick figure dog: round white head, floppy black ears, red collar with a gold tag",
    "nadia": "NADIA, the hacker: sleek short black bob with bangs, black headset with microphone, red zip-up jacket, black jeans",
    "brick": "BRICK, a very big broad man: grey knit beanie, stubble beard dots, small kind eyes, dark green hoodie, cargo pants",
    "eleanor": "ELEANOR, the museum director: silver hair in a neat bun, pearl necklace, elegant long black dress",
}

# Costume sheets (storage/stick_cast/<name>.jpg) and how the character looks in them. A beat selects them
# with "costume": {"you": "you_restorer"}; edit beats inherit the costume of their shot's new beat.
COSTUMES = {
    "you_restorer": "YOU, the hero: short messy black hair, round white head, dot eyes, long white lab coat over a blue t-shirt, grey jeans",
    "you_heist": "YOU, the hero: short messy black hair, round white head, dot eyes, all-black outfit with black gloves and a small black backpack",
    "bestie_guard": "LEO, the guard: big round black glasses, curly brown hair, navy blue security guard uniform with a silver badge and belt flashlight",
    "crush_investigator": "LENA, the investigator: long auburn ponytail with a yellow hair tie, beige belted trench coat over dark clothes",
    "rival_heist": "VICTOR: slicked-back black hair, sharp angry eyebrows, pointy curled mustache, black turtleneck, black trousers, black gloves",
}


def _costumes_for(beats: list[dict], i: int) -> dict:
    """Costume map for frame i (1-based): its own if a new beat, else the shot's new beat's."""
    for j in range(i - 1, -1, -1):
        if beats[j]["type"] == "new" or j == 0:
            return beats[j].get("costume", {})
    return {}


def _sheet_and_desc(c: str, costumes: dict) -> tuple[Path, str]:
    name = costumes.get(c)
    if name and name in COSTUMES:
        return CAST_DIR / f"{name}.jpg", COSTUMES[name]
    return CAST_DIR / f"{c}.jpg", CAST[c]

STYLE = (
    "Flat 2D cel-shaded cartoon illustration. Characters are minimalist stick figures with perfectly "
    "round pure white heads, bold black outlines and thin black stick limbs, exactly matching their "
    "reference sheets. Rich, detailed, colorful background environment filling the whole frame, with "
    "simple stick-figure background people where the location would naturally have them. Vertical "
    "9:16 single full frame, cinematic composition, no text, no letters, no signs with writing, no "
    "speech bubbles, no comic panels, no borders, no watermark."
)

SCRIPT_SYSTEM = """You write viral 2D stick-figure animated shorts told in SECOND PERSON ("you").
The viewer IS the hero. Tone: funny, warm, relatable, fast. Talk like a friend telling a story.
Narrate like a person telling a friend a story out loud: flowing, conversational sentences (usually 12-30 words)
with connecting words ("and", "but", "so", "when"), small inner thoughts and feelings, and the occasional
short punch line for effect. A sentence may run across two beats. NEVER write strings of 3-5 word fragments -
it sounds like reading notes. No narrator cliches, no "little did you know".
Avoid comma-heavy sentences. End with a twist or a punchline.

Recurring cast (use their ids exactly):
- you: the hero (the viewer)
- crush: the girl the hero likes
- bestie: the hero's best friend, gives terrible confident advice
- rival: smug show-off with a curled mustache
- mentor: wise old bearded man
- pet: the hero's dog (cannot talk)

You output the story as BEATS. Each beat = one on-screen frame + the narration spoken during it.
Two beat types:
- "new": a brand new shot. Describe the full frame in "scene": location, camera angle, what each
  character is doing, their facial expression, and background details/background people.
- "edit": SAME shot as the previous beat, only a character's expression or action changes.
  Describe ONLY the change in "change" (e.g. "you now look shocked with wide eyes and open mouth").
  Use edits whenever the narration describes a reaction or small action in the same place.
  Never use an edit to change location or camera angle.

Rules:
- 20 to 24 beats total, about 9 to 11 "new" and the rest "edit". The first beat is "new".
- Total narration 175 to 195 words (about 70 seconds). Each beat 4 to 14 words.
- The first beat is a scroll-stopping hook.
- Max 3 cast members visible in any frame. List every visible cast member in "characters".
- Use 3 to 5 distinct locations, revisit them instead of inventing many.
- Everyone wears their normal everyday outfit (modern day story).
- Visuals must be simple to draw: clear poses, clear expressions, no tiny details, no written text.
- Every character must be visible on screen (listed in "characters" of an earlier or the same beat) BEFORE
  they speak or act. Never let someone "already be there" without having been shown and introduced.
- In narration never use the ids as names. Say "her", "your best friend", "the rich kid", "your dog".
- For "edit" beats, "characters" lists everyone still visible in the frame, not just who changes.

Also pick the story mood: one of "emotional", "comedy", "suspense", "epic", "romance".

Return JSON only:
{"title": "...", "mood": "...", "beats": [{"type": "new", "narration": "...", "characters": ["you"],
  "scene": "..."}, {"type": "edit", "narration": "...", "characters": ["you"], "change": "..."}]}"""


def ep_dir(slug: str) -> Path:
    d = EPISODES / slug
    d.mkdir(parents=True, exist_ok=True)
    return d


# ---------------------------------------------------------------------- script

def stage_script(slug: str, idea: str, minutes: float = 2.5) -> None:
    """Write a script with the multi-pass story writer, then save a free narration preview for review."""
    from story_writer import review_markdown, write_story

    d = ep_dir(slug)
    script, bible, remaining = write_story(idea, minutes)
    old = json.loads((ROOT / "storage/stick_episodes/the_wallet/script.json").read_text())
    script.update({"style": old["style"], "frame_size": "1344x768", "layout": "letterbox",
                   "title_text": script.get("title_text") or script["title"], "bgm": "none"})
    (d / "script.json").write_text(json.dumps(script, indent=2))
    (d / "bible.json").write_text(json.dumps(bible, indent=2))
    (d / "review.md").write_text(review_markdown(script, bible, remaining))
    a = resolve_audio(script, {})
    asyncio.run(_tts(" ".join(b["narration"] for b in script["beats"]), d / "narration_preview.mp3", a["voice"], a["rate"]))
    print_script(script)
    print(f"\nsaved {d / 'script.json'} + review.md + narration_preview.mp3 ({_probe_duration(d / 'narration_preview.mp3'):.0f}s)")
    if remaining:
        print(f"!! {len(remaining)} unresolved check issue(s) listed in review.md")


def validate_script(data: dict) -> list[str]:
    beats = data.get("beats") or []
    problems = []
    if not 18 <= len(beats) <= 26:
        problems.append(f"{len(beats)} beats")
    if beats and beats[0].get("type") != "new":
        problems.append("first beat is not new")
    words = sum(len(b.get("narration", "").split()) for b in beats)
    if not 170 <= words <= 240:
        problems.append(f"{words} words")
    for i, b in enumerate(beats, 1):
        chars = b.get("characters") or []
        if any(c not in CAST for c in chars):
            problems.append(f"beat {i} unknown character {chars}")
        if len(chars) > 3:
            problems.append(f"beat {i} has {len(chars)} characters")
        if b.get("type") == "new" and not b.get("scene"):
            problems.append(f"beat {i} missing scene")
        if b.get("type") == "edit" and not b.get("change"):
            problems.append(f"beat {i} missing change")
    return problems


def print_script(data: dict) -> None:
    beats = data["beats"]
    words = sum(len(b["narration"].split()) for b in beats)
    news = sum(b["type"] == "new" for b in beats)
    print(f"\n=== {data.get('title')} === {len(beats)} beats ({news} new, {len(beats) - news} edits), {words} words")
    for i, b in enumerate(beats, 1):
        tag = "NEW " if b["type"] == "new" else "EDIT"
        print(f"{i:2d} [{tag}] {b['narration']}")
        print(f"          -> {b.get('scene') or b.get('change')}  {b['characters']}")


# ---------------------------------------------------------------------- images

def stabilize(prev: Path, edited: Path) -> None:
    """Keep the previous frame's pixels wherever the edit didn't really change anything,
    so backgrounds don't flicker between an original frame and its edit."""
    a = Image.open(prev).convert("RGB")
    b = Image.open(edited).convert("RGB").resize(a.size, Image.LANCZOS)
    diff = np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)).sum(axis=2)
    mask = Image.fromarray(((diff > 60) * 255).astype(np.uint8))
    mask = mask.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.GaussianBlur(12))
    coverage = (np.asarray(mask) > 128).mean()
    if coverage > 0.6:  # the model redrew the whole frame; masking would look worse
        print(f"    stabilize skipped (changed area {coverage:.0%})")
        return
    Image.composite(b, a, mask).save(edited, quality=95)
    print(f"    stabilized (changed area {coverage:.0%})")


MAX_QA_RETRIES = 2  # regenerations per frame after a confirmed QA failure (0.005 pollen each)


def _generate_frame(data: dict, beats: list[dict], i: int, out: Path, prev: Path | None, fix_notes: str = "") -> bool:
    b = beats[i - 1]
    chars = list(dict.fromkeys(b["characters"]))
    costumes = _costumes_for(beats, i)
    pairs = [_sheet_and_desc(c, costumes) for c in chars]
    sheets = [p for p, _ in pairs]
    descs = [d for _, d in pairs]
    size = data.get("frame_size", FRAME_SIZE)
    if b["type"] == "new" and not chars:  # insert shot (object / detail, nobody in frame): plain text-to-image
        w, h = (int(v) for v in size.split("x"))
        # drop the style's sentences about people, they made klein add little white-headed figures
        style = ". ".join(x for x in data.get("style", STYLE).split(". ") if "head" not in x and "character" not in x)
        prompt = (f"{b['scene']}. The place is completely empty: no people, no figures, no faces, no heads "
                  f"anywhere in the frame.{fix_notes} {style}")
        if gen_text_to_image(prompt, out, KLEIN, w, h, seed=1000 + i):
            return True
        if prev is None:
            return False
        # text-to-image endpoint keeps timing out on long prompts: draw it via the edits endpoint instead, with the
        # previous frame only as a style reference
        print("    text-to-image failed, retrying with the previous frame as a style reference")
        return gen_with_references(f"Draw a completely NEW image in exactly the same flat 2D cartoon art style as "
                                   f"the reference image (do not copy its content): {prompt}", [prev], out, size)
    if b["type"] == "new" or prev is None:
        who = " ".join(f"{descs[n]} (reference image {n + 1})." for n in range(len(chars)))
        n = len(chars)
        count = f" Exactly {n} main character{'s' if n != 1 else ''}, each appearing once with exactly one head." if n else ""
        prompt = f"{b['scene']}. Characters: {who}{count}{fix_notes} {data.get('style', STYLE)}"
        return gen_with_references(prompt, sheets, out, size)
    # Edits get ONLY one frame: the shot's ORIGINAL new frame (not the previous edit), so small mistakes don't pile up
    # along a chain of edits (Victor slowly turned into the hero). Cast sheets are left out: they made klein swap hair.
    shot_base = next((j for j in range(i - 1, -1, -1) if beats[j]["type"] == "new"), None)
    if shot_base is not None:
        prev = out.parent / f"{shot_base + 1:02d}.jpg"
    prompt = (
        f"Edit this image: {b['change']}. Every character keeps exactly the same head, hair, face features, "
        f"outfit and position as in the image. Keep the background, camera angle, composition, lighting "
        f"and every other detail exactly the same.{fix_notes} No text."
    )
    ok = gen_with_references(prompt, [prev], out, size)
    if ok:
        stabilize(prev, out)
    return ok


def keep_largest_change(base: Path, edited: Path) -> None:
    """Talking frames: keep only the single biggest changed region (the speaker's open mouth) and restore
    every other pixel from the base frame, so nobody else's mouth or face moves. Pure numpy (no scipy)."""
    from collections import deque

    a = Image.open(base).convert("RGB")
    b = Image.open(edited).convert("RGB").resize(a.size, Image.LANCZOS)
    diff = (np.abs(np.asarray(a, dtype=np.int16) - np.asarray(b, dtype=np.int16)).sum(axis=2) > 90).astype(np.uint8) * 255
    cell = 8  # label on a coarse grid: fast and merges nearby pixels of the same change
    small = np.asarray(Image.fromarray(diff).resize((a.width // cell, a.height // cell), Image.BOX)) > 10
    h, w = small.shape
    labels = np.zeros((h, w), np.int32)
    sizes = [0]
    for y in range(h):
        for x in range(w):
            if small[y, x] and not labels[y, x]:
                lab = len(sizes); sizes.append(0)
                q = deque([(y, x)]); labels[y, x] = lab
                while q:
                    cy, cx = q.popleft(); sizes[lab] += 1
                    for ny in range(cy - 2, cy + 3):
                        for nx in range(cx - 2, cx + 3):
                            if 0 <= ny < h and 0 <= nx < w and small[ny, nx] and not labels[ny, nx]:
                                labels[ny, nx] = lab; q.append((ny, nx))
    if len(sizes) == 1:
        return
    keep = (labels == int(np.argmax(sizes))).astype(np.uint8) * 255
    mask = Image.fromarray(keep).resize(a.size, Image.NEAREST).filter(ImageFilter.MaxFilter(41)).filter(ImageFilter.GaussianBlur(6))
    Image.composite(b, a, mask).save(edited, quality=95)
    print(f"    talk frame: kept the largest of {len(sizes) - 1} changed region(s)")


def make_talk_frame(base: Path, talk: Path, box: list, note: str = "") -> bool:
    """Open the speaker's mouth by editing only a square crop around their head, then pasting back a feathered
    ellipse over the head. Rejects the result if the edit changed too much (the model redrew the character)."""
    im = Image.open(base).convert("RGB"); W, H = im.size
    l, t, r, b_ = box[0] * W, box[1] * H, box[2] * W, box[3] * H
    cx, cy, side = (l + r) / 2, (t + b_) / 2, max(r - l, b_ - t) * 1.6
    x0, y0 = int(max(0, cx - side / 2)), int(max(0, cy - side / 2))
    x1, y1 = int(min(W, cx + side / 2)), int(min(H, cy + side / 2))
    crop = im.crop((x0, y0, x1, y1))
    tmp_in, tmp_out = talk.with_name(talk.stem + "_crop_in.png"), talk.with_name(talk.stem + "_crop_out.png")
    crop.resize((512, 512), Image.LANCZOS).save(tmp_in)
    ok = gen_with_references("Edit this image: the cartoon character's mouth is now WIDE OPEN in the middle of saying a word. "
                             "Change NOTHING else: do not add or remove anything, keep the same face, the same eyes, the same hair, the same clothes "
                             "and the same background exactly as they are. Only the mouth opens." + (f" {note}" if note else "") + " No text.",
                             [tmp_in], tmp_out, "512x512")
    tmp_in.unlink(missing_ok=True)
    if not ok:
        return False
    edited = Image.open(tmp_out).convert("RGB").resize(crop.size, Image.LANCZOS); tmp_out.unlink(missing_ok=True)
    diff = np.abs(np.asarray(crop, dtype=np.int16) - np.asarray(edited, dtype=np.int16)).sum(axis=2) > 90
    if diff.mean() > 0.25:
        print(f"    talk frame rejected for {base.name}: edit changed {diff.mean():.0%} of the crop")
        return False
    mask = Image.new("L", crop.size, 0)
    hl, ht, hr, hb = l - x0, t - y0, r - x0, b_ - y0
    ImageDraw.Draw(mask).ellipse([hl - 0.08 * (hr - hl), ht, hr + 0.08 * (hr - hl), hb + 0.05 * (hb - ht)], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(6))
    out = im.copy(); out.paste(Image.composite(edited, crop, mask), (x0, y0)); out.save(talk, quality=95)
    print(f"    talk frame {talk.name}: mouth edited inside the head box only")
    return True


def stage_images(slug: str, qa: bool = True) -> None:
    from frame_qa import beat_description, check_frame

    d = ep_dir(slug)
    data = json.loads((d / "script.json").read_text())
    beats = data["beats"]
    frames = d / "frames"
    frames.mkdir(exist_ok=True)
    rejected = d / "_rejected"
    qa_path = frames / "qa.json"
    qa_log = json.loads(qa_path.read_text()) if qa_path.exists() else {}
    spent = 0
    prev = None
    for i, b in enumerate(beats, 1):
        out = frames / f"{i:02d}.jpg"
        if out.exists():
            prev = out
            continue
        fix_notes = ""
        for attempt in range(MAX_QA_RETRIES + 1):
            if not _generate_frame(data, beats, i, out, prev, fix_notes):
                sys.exit(f"frame {i} failed to generate; rerun to resume")
            spent += 1
            if not qa:
                break
            desc = beat_description(beats, i - 1)
            res = check_frame(out, desc, b["characters"])
            if not res["pass"]:  # confirm with a second look before paying for a regeneration
                res2 = check_frame(out, desc, b["characters"])
                if res2["pass"]:
                    res = res2
            qa_log[f"{i:02d}"] = {"pass": res["pass"], "problems": res["problems"], "attempt": attempt + 1,
                                   **({"qa_error": res["qa_error"]} if res.get("qa_error") else {})}
            qa_path.write_text(json.dumps(qa_log, indent=2))
            if res["pass"]:
                print(f"    QA pass (attempt {attempt + 1})")
                break
            print(f"    QA FAIL (attempt {attempt + 1}): {'; '.join(res['problems'])[:200]}")
            if attempt < MAX_QA_RETRIES:
                rejected.mkdir(exist_ok=True)
                out.rename(rejected / f"{i:02d}_qa{attempt + 1}.jpg")
                fix_notes = " AVOID THESE MISTAKES: " + "; ".join(res["problems"]) + "."
        prev = out
    # Talking animation: only for beats with a "speaker" AND a "speaker_box" ([l, t, r, b] fractions around the speaker's
    # head, marked by the reviewer). Only a crop around that head is sent to klein, and only the head area is pasted
    # back, so no other character can change. (Full-frame mouth edits changed the wrong people.)
    for i, b in enumerate(beats, 1):
        box = b.get("speaker_box")
        base, talk = frames / f"{i:02d}.jpg", frames / f"{i:02d}_talk.jpg"
        if not (b.get("speaker") and box) or talk.exists() or not base.exists():
            continue
        if make_talk_frame(base, talk, box, b.get("talk_note", "")):
            spent += 1
    flagged = [k for k, v in qa_log.items() if not v["pass"]]
    print(f"done: {len(beats)} frames, {spent} generated now (~{spent * 0.005:.3f} pollen)")
    if flagged:
        print(f"!! still failing QA after {MAX_QA_RETRIES} retries, review by hand: frames {', '.join(flagged)} (see frames/qa.json)")


# ---------------------------------------------------------------------- render

async def _tts(text: str, mp3: Path, voice: str = VOICE, rate: str = VOICE_RATE) -> list[dict]:
    import edge_tts

    comm = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(mp3, "wb") as f:
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({"text": chunk["text"], "start": chunk["offset"] / 1e7,
                              "end": (chunk["offset"] + chunk["duration"]) / 1e7})
    return words


def _fmt(t: float) -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def _probe_duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                          "default=nw=1:nk=1", str(path)], capture_output=True, text=True)
    return float(out.stdout.strip())


def compose_letterbox(src: Path, out: Path, title: str, with_picture: bool = True) -> tuple[int, int]:
    """Landscape frame centered in a 1080x1920 canvas over a dark blurred copy, title above
    (the Born to Suffer layout). Returns (y, height) of the picture area."""
    from PIL import ImageDraw, ImageEnhance, ImageFont

    W, H = 1080, 1920
    img = Image.open(src).convert("RGB")
    bg = img.resize((W * 3, H)).crop((W, 0, 2 * W, H)).filter(ImageFilter.GaussianBlur(40))
    bg = ImageEnhance.Brightness(bg).enhance(0.35)
    fg = img.resize((W, round(img.height * W / img.width)), Image.LANCZOS)
    y = (H - fg.height) // 2
    if with_picture:
        bg.paste(fg, (0, y))
    if title:
        d = ImageDraw.Draw(bg)
        font = ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 70)
        lines = title.split("\n")
        ty = y - 70 - 95 * len(lines)
        for ln in lines:
            d.text(((W - d.textlength(ln, font=font)) / 2, ty), ln, font=font, fill="white",
                   stroke_width=5, stroke_fill="black")
            ty += 95
    bg.save(out, quality=95)
    return y, fg.height


# Camera moves for "camera_motion": cycled per shot (a "new" beat plus the edits that follow it).
# (zoom_start, zoom_end, x_start, x_end) with x as 0..1 of the free horizontal travel.
CAMERA_MOVES = [(1.0, 1.07, 0.5, 0.5), (1.07, 1.0, 0.5, 0.5), (1.07, 1.07, 0.15, 0.85), (1.07, 1.07, 0.85, 0.15)]


FONT = ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"


def motion_clip(bg: Path, frame: Path, y: int, h: int, out: Path, dur: float, t0: float, shot_dur: float,
                move: tuple, film_vf: str = "", fx: str | None = None, timer: tuple | None = None) -> None:
    """One clip = static vertical background + the landscape picture with a slow camera move. The move is
    computed on time within the whole shot, so consecutive frames of the same shot continue seamlessly.
    fx (per beat): "punch" = fast push-in, "shake" = impact shake, "blackout" = lights flicker then die,
    "lights_on" = white flash as the lights return. timer = (from, to) countdown seconds over this clip."""
    z0, z1, x0, x1 = move
    frac = f"(({t0:.4f}+on/30)/{shot_dur:.4f})"
    z = f"({z0}+({z1}-{z0})*{frac})"
    if fx == "punch":
        z += "*(1+0.18*min(1,on/6))"
    x = f"(iw-iw/zoom)*({x0}+({x1}-{x0})*{frac})"
    yexpr = "(ih-ih/zoom)/2"
    pic = f"[1:v]scale=5376:-1,zoompan=z='{z}':x='{x}':y='{yexpr}':d=1:s=1080x{h}:fps=30"
    if fx == "blackout":
        pic += ",eq=eval=frame:brightness='if(lt(t,0.55),0.4*gt(mod(t,0.18),0.09),0)'"
    elif fx == "lights_on":
        pic += ",eq=eval=frame:brightness='if(lt(t,0.4),0.7*(1-t/0.4),0)'"
    ox, oy = "0", f"{y}"
    if fx == "shake":
        ox = "if(lt(t,0.45),16*sin(2*PI*t*23)*(1-t/0.45),0)"
        oy = f"{y}+if(lt(t,0.45),12*cos(2*PI*t*19)*(1-t/0.45),0)"
    filt = f"{pic}[p];[0:v][p]overlay=x='{ox}':y='{oy}'{(',' + film_vf) if film_vf else ''}"
    inputs = []
    if timer:  # ffmpeg here has no drawtext: overlay one pre-drawn PNG per second value
        a, b = timer
        vals = list(range(a, b, -1)) if a > b else [a]  # b is where the next beat starts
        step = dur / len(vals)
        filt += "[c0]"
        for n, v in enumerate(vals):
            inputs += ["-i", str(_timer_png(v))]
            end = dur + 1 if n == len(vals) - 1 else (n + 1) * step
            filt += f";[c{n}][{n + 2}:v]overlay=x=W-w-40:y={y + 30}:enable='between(t,{n * step:.3f},{end:.3f})'[c{n + 1}]"
        filt = filt[: filt.rindex("[")]
    filt += "[v]"
    subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", str(bg), "-loop", "1", "-framerate", "30", "-i", str(frame),
                    *inputs, "-filter_complex", filt, "-map", "[v]", "-t", f"{dur:.3f}", "-r", "30", "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", str(out)], check=True, capture_output=True)


def _timer_png(v: int) -> Path:
    """Red countdown digits (m:ss) on a dark rounded box, cached per value."""
    from PIL import ImageFont

    out = EPISODES / "_timer" / f"{v}.png"
    if out.exists():
        return out
    out.parent.mkdir(exist_ok=True)
    font = ImageFont.truetype(str(FONT), 66)
    text = f"{v // 60}:{v % 60:02d}"
    tw = int(ImageDraw.Draw(Image.new("RGBA", (1, 1))).textlength("0:00", font=font))
    im = Image.new("RGBA", (tw + 44, 96), (0, 0, 0, 0))
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle((0, 0, im.width - 1, im.height - 1), radius=18, fill=(0, 0, 0, 160))
    dr.text((im.width / 2, im.height / 2), text, font=font, fill=(255, 59, 48, 255), anchor="mm")
    im.save(out)
    return out


def ticking_track(out: Path, start: float, end: float, total: float) -> None:
    """Clock tick-tock (synthesized, so no licence needed): one tick per second between start and end."""
    expr = "0.5*sin(2*PI*(1700+500*mod(floor(t),2))*t)*exp(-70*mod(t,1))"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", f"aevalsrc='{expr}':s=44100:d={end - start:.3f}",
                    "-af", f"adelay={int(start * 1000)}:all=1,apad=whole_dur={total:.3f}", "-ac", "1", str(out)],
                   check=True, capture_output=True)


def resolve_audio(data: dict, opts: dict) -> dict:
    """Pick voice/rate/music: CLI opts > script.json fields > mood defaults > globals."""
    mood = opts.get("mood") or data.get("mood") or "emotional"
    m = MOODS.get(mood, {})
    voice = opts.get("voice") or data.get("voice") or m.get("voice", VOICE)
    rate = opts.get("rate") or data.get("rate") or m.get("rate", VOICE_RATE)
    bgm = "none" if opts.get("no_music") else (opts.get("bgm") or data.get("bgm"))
    if not bgm:
        tracks = sorted((MUSIC_DIR / mood).glob("*.mp3")) if (MUSIC_DIR / mood).exists() else []
        bgm = str(random.choice(tracks).relative_to(ROOT)) if tracks else "none"
    vol = float(data.get("bgm_volume", m.get("bgm_volume", 0.15)))
    return {"mood": mood, "voice": voice, "rate": rate,
            "bgm": None if bgm == "none" else bgm, "bgm_volume": vol}


def stage_render(slug: str, opts: dict | None = None) -> None:
    from app.models.schema import VideoAspect, VideoParams
    from app.services import video

    d = ep_dir(slug)
    data = json.loads((d / "script.json").read_text())
    audio = resolve_audio(data, opts or {})
    print(f"  audio: mood={audio['mood']} voice={audio['voice']} rate={audio['rate']} music={audio['bgm'] or 'none'}")
    beats = data["beats"]
    full_text = " ".join(b["narration"].strip() for b in beats)

    mp3 = d / "narration.mp3"
    words = asyncio.run(_tts(full_text, mp3, audio["voice"], audio["rate"]))
    total = _probe_duration(mp3)
    print(f"  narration {total:.1f}s, {len(words)} word timings")

    # frame start = when the first word of that beat is spoken
    counts = [len([w for w in b["narration"].split() if any(ch.isalnum() for ch in w)]) for b in beats]
    starts, idx = [], 0
    if sum(counts) == len(words):
        for c in counts:
            starts.append(words[idx]["start"] if idx < len(words) else total)
            idx += c
    else:  # tokenization mismatch: fall back to proportional timing
        print(f"  word count mismatch ({sum(counts)} vs {len(words)}), using proportional timing")
        acc = 0
        for c in counts:
            starts.append(total * acc / sum(counts))
            acc += c
    # Speaking intervals per beat (relative to the beat start) for the talking-mouth animation.
    talk_spans: dict[int, list[tuple[float, float]]] = {}
    if sum(counts) == len(words):
        idx, in_quote = 0, False
        for k, b in enumerate(beats):
            toks = [w for w in b["narration"].split() if any(ch.isalnum() for ch in w)]
            has_quote = '"' in b["narration"]
            spans = []
            for tok in toks:
                if tok.startswith('"'):
                    in_quote = True
                quoted = in_quote
                if tok.rstrip(".,!?").endswith('"') or tok.endswith('",') or tok.endswith('."'):
                    in_quote = False
                w = words[idx]
                idx += 1
                if b.get("speaker") and (quoted or not has_quote):
                    a0 = max(0.0, w["start"] - starts[k])
                    spans.append((a0, a0 + max(0.08, min(0.2, 0.6 * (w["end"] - w["start"])))))
            if spans:
                talk_spans[k] = spans
    starts[0] = 0.0
    durations = [max(MIN_FRAME_SECONDS, (starts[i + 1] if i + 1 < len(starts) else total) - starts[i])
                 for i in range(len(starts))]
    scale = total / sum(durations)
    durations = [x * scale for x in durations]

    # 2-3 word subtitle cues straight from the word timings
    cues, i = [], 0
    while i < len(words):
        n = 2 if len(words) - i == 4 else min(3, len(words) - i)
        group = words[i:i + n]
        end = words[i + n]["start"] if i + n < len(words) else group[-1]["end"]
        cues.append((group[0]["start"], end, " ".join(w["text"] for w in group)))
        i += n
    srt = d / "subtitles.srt"
    srt.write_text("\n\n".join(f"{k}\n{_fmt(s)} --> {_fmt(e)}\n{t}" for k, (s, e, t) in enumerate(cues, 1)) + "\n")

    vf = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920"
    if data.get("film_look"):
        vf += ",vignette=PI/5,noise=alls=7:allf=t"  # subtle moving film grain + darkened edges
    frame_dir = d / "frames"
    if data.get("layout") == "letterbox":
        frame_dir = d / "composed"
        frame_dir.mkdir(exist_ok=True)
        for k in range(1, len(beats) + 1):
            compose_letterbox(d / "frames" / f"{k:02d}.jpg", frame_dir / f"{k:02d}.jpg", data.get("title_text", ""))
    clips = []
    motion = data.get("layout") == "letterbox" and data.get("camera_motion", False)
    if motion:  # shots = a new beat + its edits; each shot gets one continuous camera move
        bg = d / "composed" / "_background.jpg"
        pic_y, pic_h = compose_letterbox(d / "frames" / "01.jpg", bg, data.get("title_text", ""), with_picture=False)
        shot_of, shot_start, shot_len, shot_idx, t = [], {}, {}, -1, 0.0
        for k, b in enumerate(beats):
            if b["type"] == "new" or k == 0:
                shot_idx += 1
                shot_start[shot_idx] = t
            shot_of.append(shot_idx)
            shot_len[shot_idx] = t + durations[k] - shot_start[shot_idx]
            t += durations[k]
        def timer_for(k: int) -> tuple | None:  # countdown from this beat's value to the next beat's
            a = beats[k - 1].get("timer")
            if a is None:
                return None
            nxt = beats[k].get("timer") if k < len(beats) else None
            return (a, a if nxt is None else nxt)

        t = 0.0
        for k, dur in enumerate(durations, 1):
            sid = shot_of[k - 1]
            extra = {"fx": beats[k - 1].get("fx"), "timer": timer_for(k)}
            clip = d / f"clip_{k:02d}.mp4"
            move = CAMERA_MOVES[sid % len(CAMERA_MOVES)]
            talk_img = d / "frames" / f"{k:02d}_talk.jpg"
            if talk_img.exists() and talk_spans.get(k - 1) and not (opts or {}).get("no_talk"):
                # same camera move on both versions, then show the mouth-open one only while words are spoken
                base_c, talk_c = d / f"clip_{k:02d}_base.mp4", d / f"clip_{k:02d}_talk.mp4"
                motion_clip(bg, d / "frames" / f"{k:02d}.jpg", pic_y, pic_h, base_c, dur, t - shot_start[sid], shot_len[sid],
                            move, **extra)
                motion_clip(bg, talk_img, pic_y, pic_h, talk_c, dur, t - shot_start[sid], shot_len[sid], move, **extra)
                enable = "+".join(f"between(t,{a:.3f},{b:.3f})" for a, b in talk_spans[k - 1] if a < dur)
                subprocess.run(["ffmpeg", "-y", "-i", str(base_c), "-i", str(talk_c), "-filter_complex",
                                f"[0:v][1:v]overlay=0:0:enable='{enable}'[v]", "-map", "[v]", "-c:v", "libx264",
                                "-pix_fmt", "yuv420p", "-r", "30", str(clip)], check=True, capture_output=True)
                base_c.unlink(missing_ok=True); talk_c.unlink(missing_ok=True)
            else:
                motion_clip(bg, d / "frames" / f"{k:02d}.jpg", pic_y, pic_h, clip, dur, t - shot_start[sid],
                            shot_len[sid], move, **extra)
            clips.append(str(clip))
            t += dur
    for k, dur in enumerate(durations if not motion else [], 1):
        clip = d / f"clip_{k:02d}.mp4"
        subprocess.run(["ffmpeg", "-y", "-loop", "1", "-i", str(frame_dir / f"{k:02d}.jpg"),
                        "-t", f"{dur:.3f}", "-r", "30", "-c:v", "libx264", "-pix_fmt", "yuv420p",
                        "-vf", vf,
                        str(clip)], check=True, capture_output=True)
        clips.append(str(clip))
    raw = d / "raw.mp4"
    video.concat_video_clips_with_ffmpeg(clip_files=clips, output_file=str(raw), threads=4, output_dir=str(d))

    params = VideoParams(
        video_subject=data.get("title", slug), video_aspect=VideoAspect.portrait,
        subtitle_enabled=True, subtitle_position="custom", custom_position=78.0,
        font_name="MicrosoftYaHeiBold.ttc", font_size=56, text_fore_color="#FFF200",
        stroke_color="#000000", stroke_width=2.8,
        bgm_type="custom" if audio["bgm"] else "", bgm_volume=audio["bgm_volume"] if audio["bgm"] else 0.0,
    )
    bgm_override = None
    if audio["bgm"]:  # trim + fade the track to the narration length (override path doesn't trim)
        bgm_override = d / "bgm_trimmed.mp3"
        subprocess.run(["ffmpeg", "-y", "-i", str(ROOT / audio["bgm"]), "-t", f"{total:.3f}",
                        "-af", f"afade=t=in:d=2,afade=t=out:st={max(0, total - 4):.3f}:d=4",
                        str(bgm_override)], check=True, capture_output=True)
    voice_track = mp3
    timed = [k for k, b in enumerate(beats) if b.get("timer") is not None]
    if data.get("ticking_clock") and timed:  # tick-tock under the narration while the countdown runs
        tick_start = sum(durations[:timed[0]])
        tick_end = sum(durations[:timed[-1]])
        ticks, voice_track = d / "ticks.wav", d / "narration_ticks.mp3"
        ticking_track(ticks, tick_start, tick_end, total)
        subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-i", str(ticks), "-filter_complex",
                        "[1:a]volume=0.22[t];[0:a][t]amix=inputs=2:duration=first:normalize=0[a]", "-map", "[a]",
                        "-b:a", "192k", str(voice_track)], check=True, capture_output=True)
    final = d / f"{slug}{(opts or {}).get('suffix', '')}.mp4"
    video.generate_video(video_path=str(raw), audio_path=str(voice_track), subtitle_path=str(srt),
                         output_file=str(final), params=params,
                         bgm_file_override=str(bgm_override) if bgm_override else None)
    for c in clips:
        Path(c).unlink(missing_ok=True)
    print(f"done: {final} ({_probe_duration(final):.1f}s)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["script", "images", "render", "show"])
    ap.add_argument("--slug", required=True)
    ap.add_argument("--idea", default="")
    ap.add_argument("--minutes", type=float, default=2.5, help="script: target narration length")
    ap.add_argument("--mood", choices=list(MOODS), help="render: override the story mood")
    ap.add_argument("--voice", help="render: override the edge-tts voice")
    ap.add_argument("--rate", help="render: override the voice rate, e.g. +5%%")
    ap.add_argument("--bgm", help="render: music file path relative to repo root")
    ap.add_argument("--no-music", action="store_true", help="render: no background music")
    ap.add_argument("--suffix", default="", help="render: output file suffix, e.g. _nomusic")
    ap.add_argument("--no-qa", action="store_true", help="images: skip the automatic frame check")
    ap.add_argument("--no-talk", action="store_true", help="render: speaker close-ups without mouth movement")
    ap.add_argument("--motion", action="store_true", help="render: slow camera moves (overrides script.json)")
    a = ap.parse_args()
    if a.stage == "script":
        stage_script(a.slug, a.idea, a.minutes)
    elif a.stage == "show":
        print_script(json.loads((ep_dir(a.slug) / "script.json").read_text()))
    elif a.stage == "images":
        stage_images(a.slug, qa=not a.no_qa)
    else:
        if a.motion:
            _p = ep_dir(a.slug) / "script.json"; _d = json.loads(_p.read_text()); _d["camera_motion"] = True
            _p.write_text(json.dumps(_d, indent=2))
        stage_render(a.slug, {"mood": a.mood, "voice": a.voice, "rate": a.rate, "bgm": a.bgm,
                              "no_music": a.no_music, "suffix": a.suffix, "no_talk": a.no_talk})
