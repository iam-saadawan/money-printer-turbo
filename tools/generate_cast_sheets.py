#!/usr/bin/env python3
"""
Generate character reference sheets for the recurring stick-figure cast.

Each sheet shows the character full-body (front / side / back) plus a row of
expression close-ups. Sheets are later passed to flux.2-klein-4b as reference
images so every scene keeps the same characters.

Usage:
    .venv/bin/python tools/generate_cast_sheets.py              # all missing sheets
    .venv/bin/python tools/generate_cast_sheets.py --only you   # regenerate one
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from stick_consistency_test import KLEIN, ROOT, gen_text_to_image  # noqa: E402

OUT = ROOT / "storage" / "stick_cast"

BASE_STYLE = (
    "minimalist 2D stick figure character: perfectly round pure white circle head with a bold "
    "black outline, simple black dot eyes, thin black stick arms and legs"
)

# Signature features live on the head, because outfits change per genre.
CAST = {
    "you": {
        "role": "the hero",
        "look": "short messy black hair that is clearly visible in EVERY view including the front view, "
                "two dot eyes, simple line mouth; default outfit: plain blue t-shirt and grey jeans, "
                "white sneakers",
        "seed": 2101,
    },
    "crush": {
        "role": "the love interest",
        "look": "long auburn brown ponytail tied with a yellow hair tie, dot eyes with small "
                "eyelashes, gentle smile; default outfit: green sweater and a dark blue skirt",
        "seed": 1102,
    },
    "bestie": {
        "role": "the best friend",
        "look": "big round black-rimmed glasses, short curly brown hair, wide toothy grin; default "
                "outfit: bright orange hoodie and brown shorts",
        "seed": 1103,
    },
    "rival": {
        "role": "the rival / villain",
        "look": "slicked-back black hair, sharp angry slanted eyebrows and a thin pointy curled black "
                "mustache that are clearly visible in EVERY view and every close-up, smug smirk; "
                "default outfit: dark purple suit with a black tie",
        "seed": 2104,
    },
    "mentor": {
        "role": "the old mentor",
        "look": "bald head with a long fluffy white beard and bushy white eyebrows, small round "
                "spectacles; default outfit: brown cardigan and grey trousers, holding a wooden cane",
        "seed": 1105,
    },
    "pet": {
        "role": "the pet dog",
        "look": "a minimalist four-legged stick figure dog: round pure white head with a bold black "
                "outline, one floppy black ear and one pointy ear, dot eyes, black dot nose, thin "
                "black stick legs, short wagging line tail, red collar with a gold tag",
        "seed": 1106,
        "quadruped": True,
    },
    # --- "The Lantern Job" series (2026-10) ---
    "nadia": {
        "role": "the hacker",
        "look": "sleek short black bob haircut with straight bangs that is clearly visible in EVERY view, "
                "black headset with a small microphone over her head, dot eyes with small eyelashes, "
                "confident half smile; outfit: bright red zip-up jacket, black jeans, black sneakers",
        "seed": 3101,
    },
    "brick": {
        "role": "the gentle giant driver",
        "look": "a much bigger, taller and wider stick figure with a broad body and thick limbs, grey knit "
                "beanie hat that is clearly visible in EVERY view, short stubble beard drawn as dots on the "
                "lower face, small kind dot eyes, shy smile; outfit: dark green hoodie, dark cargo pants, boots",
        "seed": 3102,
    },
    "eleanor": {
        "role": "the elegant museum director",
        "look": "silver grey hair pulled up into a neat tall bun that is clearly visible in EVERY view, thin "
                "elegant eyebrows, dot eyes, cool polite smile, pearl necklace; outfit: long elegant black "
                "dress, black heels",
        "seed": 3103,
    },
}


def sheet_prompt(name: str, c: dict) -> str:
    body = c["look"] if c.get("quadruped") else f"{BASE_STYLE}, {c['look']}"
    return (
        f"Character design reference sheet for {c['role']}, one single character. "
        f"Top row: the same character full body three times, front view, side view, back view. "
        f"Bottom row: five head-and-shoulders close-ups of the same character, each with a complete face, "
        f"showing expressions: happy, sad, angry, scared, shocked. Character: {body}. "
        f"Plain clean white background, flat 2D cartoon style, thick clean black outlines, flat "
        f"colors, consistent proportions in every view, no text, no labels, no captions"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=list(CAST), help="regenerate a single character")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    names = [args.only] if args.only else list(CAST)
    for name in names:
        path = OUT / f"{name}.jpg"
        if path.exists() and not args.only:
            print(f"  skip {name} (exists)")
            continue
        if not gen_text_to_image(sheet_prompt(name, CAST[name]), path, KLEIN, 1536, 1536,
                                 seed=CAST[name]["seed"]):
            print(f"  !! failed: {name}")


if __name__ == "__main__":
    main()
