#!/usr/bin/env python3
"""
Automatic frame check for stick-story episodes (free: Groq qwen/qwen3.8-27b, which accepts images).

Each frame is compared against its beat: are exactly the expected cast members there, does each one
look right (hair/outfit), are there duplicates, double heads or swapped outfits, and is anything there
that the beat says must not be. Used by tools/stick_story.py after every generated frame.

Usage (check an existing episode without regenerating anything):
    .venv/bin/python tools/frame_qa.py --slug the_wallet
    .venv/bin/python tools/frame_qa.py --slug the_wallet --frames 9 12
"""

import argparse
import base64
import io
import json
import re
import sys
import time
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import config  # noqa: E402

QA_MODEL = "qwen/qwen3.8-27b"

# What each cast member must look like in a frame (kept short: the vision model reads every word).
LOOKS = {
    "you": "a boy with SHORT MESSY BLACK HAIR, blue t-shirt, grey jeans",
    "crush": "a girl with a long AUBURN/BROWN PONYTAIL, green sweater, dark blue skirt",
    "bestie": "a boy with CURLY BROWN HAIR and BIG ROUND GLASSES, orange hoodie, brown shorts",
    "rival": "a man with SLICKED BLACK HAIR and a CURLED MUSTACHE, purple suit",
    "mentor": "a BALD old man with a LONG WHITE BEARD and round glasses, brown cardigan, often a cane",
    "pet": "a small white cartoon dog with floppy black ears and a red collar",
    "nadia": "a woman with a short BLACK BOB haircut and a BLACK HEADSET, red jacket",
    "brick": "a very BIG broad man with a GREY BEANIE and stubble beard, green hoodie",
    "eleanor": "an elegant older woman with SILVER HAIR IN A BUN and a pearl necklace, black dress",
}

PROMPT = """You are a continuity checker for a 2D cartoon. Compare the image to the scene description.

SCENE DESCRIPTION:
{scene}

MAIN CHARACTERS THAT MUST APPEAR (each exactly once). Identify them by HEAD features (hair, beard,
glasses); their clothes may differ if the description gives them a different outfit (apron, suit, coat):
{expected}

MAJOR problems (any one fails the frame):
- a main character is missing, or appears twice (including a look-alike copy)
- a person has two heads, extra limbs, or is merged with another person
- two main characters swapped head features or outfits (e.g. the bald old man has the boy's black hair)
- something the description explicitly says must NOT be there is clearly visible
- the key action is done by the wrong person (e.g. the boy holds the money that the old man should offer)
MINOR problems (do NOT fail the frame): pose or gaze direction, small accessories, background people or
props that differ from the description, shop open/closed details, exact outfit details, art style.

Reply with JSON only: {{"pass": true/false, "major": ["short problem", ...], "minor": ["short problem", ...]}}
"pass" is false only if "major" is not empty."""


def _b64(path: Path) -> str:
    im = Image.open(path).convert("RGB")
    im.thumbnail((1024, 1024))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    return base64.b64encode(buf.getvalue()).decode()


def check_frame(path: Path, description: str, characters: list[str]) -> dict:
    expected = "\n".join(f"- {LOOKS.get(c, c)}" for c in dict.fromkeys(characters)) or "- (none)"
    body = {
        "model": QA_MODEL,
        "max_tokens": 600,
        "temperature": 0.1,
        "messages": [{"role": "user", "content": [
            {"type": "text", "text": PROMPT.format(scene=description, expected=expected)},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{_b64(path)}"}},
        ]}],
    }
    headers = {"Authorization": f"Bearer {config.app.get('groq_api_key')}"}
    err = "rate limited on every attempt"
    for attempt in range(4):
        try:
            r = requests.post("https://api.groq.com/openai/v1/chat/completions", json=body, headers=headers, timeout=120)
            if r.status_code == 429:  # free-tier rate limit: wait and retry
                time.sleep(15 * (attempt + 1))
                continue
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"]
            m = re.search(r"\{.*\}", text, re.S)
            res = json.loads(m.group(0)) if m else {"pass": False, "problems": ["unparseable QA reply"]}
            res["problems"] = [str(p) for p in res.get("major", res.get("problems", []))]
            res["minor"] = [str(p) for p in res.get("minor", [])]
            res["pass"] = not res["problems"]
            return res
        except Exception as e:  # noqa: BLE001
            err = str(e)
            time.sleep(5)
    return {"pass": True, "problems": [], "qa_error": f"QA unavailable ({err[:80]}) - frame not checked"}


def beat_description(beats: list[dict], i: int) -> str:
    """Full description of what frame i should show (edits inherit the last new scene)."""
    b = beats[i]
    if b["type"] == "new":
        return b["scene"]
    base = next((beats[j]["scene"] for j in range(i - 1, -1, -1) if beats[j]["type"] == "new"), "")
    return f"{base}\nCHANGE IN THIS FRAME: {b['change']}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug", required=True)
    ap.add_argument("--frames", nargs="*", type=int, help="1-based frame numbers (default: all)")
    ap.add_argument("--dir", default="frames", help="subfolder holding the images (e.g. _rejected)")
    a = ap.parse_args()
    d = ROOT / "storage" / "stick_episodes" / a.slug
    beats = json.loads((d / "script.json").read_text())["beats"]
    nums = a.frames or range(1, len(beats) + 1)
    for n in nums:
        img = d / a.dir / f"{n:02d}.jpg"
        if not img.exists():
            continue
        res = check_frame(img, beat_description(beats, n - 1), beats[n - 1]["characters"])
        print(f"{n:02d} {'PASS' if res['pass'] else 'FAIL'} {'; '.join(res['problems'])} {res.get('qa_error', '')}")


if __name__ == "__main__":
    main()
