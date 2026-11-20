#!/usr/bin/env python3
"""
Character-consistency test for the 2D stick channel.

Approach A: Pollinations `flux` (FLUX.1 Schnell) draws empty backgrounds, and
            the stick figures are drawn in code on top (100% consistent).
Approach B: Pollinations `flux.2-klein-4b` draws a character sheet per lead,
            then every scene is generated with those sheets as references.

Usage:
    .venv/bin/python tools/stick_consistency_test.py --approach a
    .venv/bin/python tools/stick_consistency_test.py --approach b
    .venv/bin/python tools/stick_consistency_test.py --approach compare
"""

import argparse
import base64
import math
import sys
import time
import urllib.parse
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import config  # noqa: E402

OUT = ROOT / "storage" / "stick_test"
W, H = 1080, 1920
API = "https://gen.pollinations.ai"
KLEIN = "black-forest-labs/flux.2-klein-4b"

STYLE = (
    "2D cel-shaded cartoon illustration, flat vibrant colors, clean bold outlines, "
    "wide cinematic vertical composition, single full frame, no text, no comic panels, "
    "no borders, no watermark"
)

CHARACTERS = {
    "fred": {
        "anchor": (
            "Fred, a minimalist stick figure: perfectly round pure white circle head with black "
            "outline, two black dot eyes, simple line mouth, spiky black hair tufts, wearing a "
            "bright red running tank top and white athletic shorts, thin black stick arms and legs"
        ),
        "shirt": (220, 38, 38), "pants": (245, 245, 245), "hair": "spiky", "hat": None,
        "mustache": False, "tux": False,
    },
    "james": {
        "anchor": (
            "James, a minimalist stick figure: perfectly round pure white circle head with black "
            "outline, two black dot eyes, thin pencil mustache, wearing a tall black top hat, a "
            "black Victorian tuxedo jacket with white shirt and black bowtie, black trousers, thin "
            "black stick arms and legs"
        ),
        "shirt": (25, 25, 30), "pants": (25, 25, 30), "hair": None, "hat": "tophat",
        "mustache": True, "tux": True,
    },
}

# Each scene: background (no people) for A, full scene description for B,
# and character placements: (name, pose, mouth, x_fraction, height_px, facing)
SCENES = [
    {
        "id": "1_start",
        "bg": "1904 St. Louis Olympic stadium, dusty dirt running track with a chalk starting line "
              "in the foreground, wooden grandstands far behind packed with tiny distant spectators, "
              "hot hazy summer sky, empty foreground, no people in the foreground",
        "scene": "James points angrily at Fred at the dusty starting line of the 1904 St. Louis "
                 "Olympic stadium, wooden grandstands far behind packed with tiny distant spectators, "
                 "hot hazy summer sky",
        "chars": [("james", "point", "open", 0.30, 620, 1), ("fred", "stand", "smile", 0.70, 560, -1)],
    },
    {
        "id": "2_road",
        "bg": "long dusty Missouri dirt country road stretching to rolling green hills, a vintage 1904 "
              "open-top automobile parked at the side of the road, golden fields, afternoon sun, "
              "no people",
        "scene": "Fred runs exhausted down a long dusty Missouri dirt country road stretching to "
                 "rolling green hills, a vintage 1904 open-top automobile parked at the roadside, "
                 "golden fields, afternoon sun",
        "chars": [("fred", "run", "open", 0.50, 600, 1)],
    },
    {
        "id": "3_office",
        "bg": "lavish Victorian mahogany office interior, large wooden desk with papers, tall "
              "bookshelves, oil lamps, big window showing a city, warm lighting, no people",
        "scene": "James stands furious in his lavish Victorian mahogany office, large wooden desk "
                 "with papers, tall bookshelves, oil lamps, big window showing a city, warm lighting",
        "chars": [("james", "point", "open", 0.50, 680, 1)],
    },
    {
        "id": "4_finish",
        "bg": "Olympic stadium finish line with a white ribbon banner across a dirt track, wooden "
              "grandstands with a tiny distant cheering crowd, bright sunny sky, empty foreground",
        "scene": "Fred celebrates with both arms raised at the finish line of a dusty Olympic "
                 "stadium track while James stands beside him looking suspicious, white ribbon "
                 "banner, wooden grandstands with a tiny distant cheering crowd, bright sunny sky",
        "chars": [("fred", "cheer", "smile", 0.35, 600, 1), ("james", "stand", "flat", 0.70, 620, -1)],
    },
]


def api_key() -> str:
    key = (config.app.get("pollinations_api_key") or "").strip()
    if not key:
        sys.exit("pollinations_api_key is not set in config.toml")
    return key


def headers() -> dict:
    return {"Authorization": f"Bearer {api_key()}"}


# ---------------------------------------------------------------- Pollinations

def gen_text_to_image(prompt: str, out: Path, model: str, width: int, height: int, seed: int) -> bool:
    url = (
        f"{API}/image/{urllib.parse.quote(prompt)}"
        f"?model={model}&width={width}&height={height}&seed={seed}&nologo=true"
    )
    for attempt in range(1, 4):
        try:
            print(f"  [{model}] {out.name} (attempt {attempt})")
            r = requests.get(url, headers=headers(), timeout=180)
            if r.status_code == 200 and len(r.content) > 5000:
                out.write_bytes(r.content)
                return True
            print(f"    status {r.status_code}: {r.text[:200]}")
            if r.status_code in (401, 402, 403):
                return False
        except requests.RequestException as e:
            print(f"    error: {e}")
        time.sleep(4)
    return False


def gen_with_references(prompt: str, refs: list[Path], out: Path, size: str) -> bool:
    images = [
        {"image_url": "data:image/jpeg;base64," + base64.b64encode(p.read_bytes()).decode()}
        for p in refs
    ]
    body = {"model": KLEIN, "prompt": prompt, "image": images, "size": size,
            "response_format": "b64_json"}
    for attempt in range(1, 4):
        try:
            print(f"  [klein+refs] {out.name} (attempt {attempt}, {len(refs)} refs)")
            r = requests.post(f"{API}/v1/images/edits", json=body, headers=headers(), timeout=240)
            if r.status_code == 200:
                data = r.json()["data"][0]
                if data.get("b64_json"):
                    out.write_bytes(base64.b64decode(data["b64_json"]))
                else:
                    out.write_bytes(requests.get(data["url"], timeout=120).content)
                return True
            print(f"    status {r.status_code}: {r.text[:300]}")
            if r.status_code in (401, 402, 403):
                return False
        except (requests.RequestException, KeyError, ValueError) as e:
            print(f"    error: {e}")
        time.sleep(4)
    return False


def fit_cover(path: Path, width: int = W, height: int = H) -> Image.Image:
    img = Image.open(path).convert("RGB")
    scale = max(width / img.width, height / img.height)
    img = img.resize((math.ceil(img.width * scale), math.ceil(img.height * scale)), Image.LANCZOS)
    left, top = (img.width - width) // 2, (img.height - height) // 2
    return img.crop((left, top, left + width, top + height))


# ---------------------------------------------------------- code stick figures

def draw_stick(layer: Image.Image, spec: dict, pose: str, mouth: str,
               cx: float, feet_y: float, size: float, facing: int) -> None:
    d = ImageDraw.Draw(layer)
    k = size
    lw = max(3, int(k * 0.022))
    black = (10, 10, 10, 255)

    def P(x, y):  # x right / y up, in units of figure height
        return (cx + x * k * facing, feet_y - y * k)

    def limb(a, b, color=black, width=lw):
        d.line([P(*a), P(*b)], fill=color, width=width)
        for pt in (a, b):
            x, y = P(*pt)
            r = width / 2
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)

    def poly(points, fill):
        d.polygon([P(*p) for p in points], fill=fill, outline=black, width=max(2, lw // 2))

    hip, neck = (0, 0.42), (0, 0.70)
    head_c, head_r = (0, 0.82), 0.115

    # shadow
    sx, sy = P(0, 0)
    d.ellipse([sx - k * 0.22, sy - k * 0.025, sx + k * 0.22, sy + k * 0.025], fill=(0, 0, 0, 70))

    # legs
    legs = {
        "stand": [((-0.07, 0.0)), ((0.07, 0.0))],
        "point": [((-0.08, 0.0)), ((0.08, 0.0))],
        "cheer": [((-0.10, 0.0)), ((0.10, 0.0))],
    }
    if pose == "run":
        knee_f, foot_f = (0.12, 0.22), (0.05, 0.02)
        knee_b, foot_b = (-0.08, 0.20), (-0.20, 0.10)
        for knee, foot in ((knee_b, foot_b), (knee_f, foot_f)):
            limb(hip, knee); limb(knee, foot)
            limb(hip, ((hip[0] + knee[0]) / 2 * 1.2, (hip[1] + knee[1]) / 2),
                 color=spec["pants"] + (255,), width=int(lw * 3.2))
    else:
        for foot in legs.get(pose, legs["stand"]):
            limb(hip, foot)
            pants_end = (foot[0] * (0.55 if not spec["tux"] else 1.0),
                         hip[1] - (hip[1] - foot[1]) * (0.45 if not spec["tux"] else 0.95))
            limb(hip, pants_end, color=spec["pants"] + (255,), width=int(lw * 3.2))

    # arms (drawn under torso for back arm, over for front)
    arms = {
        "stand": [((-0.13, 0.48)), ((0.13, 0.48))],
        "point": [((-0.12, 0.47)), ((0.30, 0.66))],
        "cheer": [((-0.18, 0.98)), ((0.18, 0.98))],
        "run":   [((-0.16, 0.56)), ((0.16, 0.62))],
    }
    elbows = {
        "stand": [(-0.09, 0.58), (0.09, 0.58)],
        "point": [(-0.09, 0.57), (0.16, 0.66)],
        "cheer": [(-0.14, 0.84), (0.14, 0.84)],
        "run":   [(-0.12, 0.62), (0.12, 0.54)],
    }
    shoulder = (0, 0.67)
    for elbow, hand in zip(elbows[pose], arms[pose]):
        limb(shoulder, elbow); limb(elbow, hand)

    # torso / clothing
    shirt = spec["shirt"] + (255,)
    lean = 0.04 if pose == "run" else 0.0
    poly([(-0.075 + lean, 0.70), (0.075 + lean, 0.70), (0.085, 0.42), (-0.085, 0.42)], shirt)
    if spec["tux"]:
        poly([(-0.03 + lean, 0.70), (0.03 + lean, 0.70), (0.0, 0.55)], (250, 250, 250, 255))
        bx, by = P(lean, 0.685)
        bw = k * 0.035
        d.polygon([(bx - bw, by - bw / 2), (bx, by), (bx - bw, by + bw / 2)], fill=black)
        d.polygon([(bx + bw, by - bw / 2), (bx, by), (bx + bw, by + bw / 2)], fill=black)
    else:  # tank top straps
        limb((-0.05 + lean, 0.70), (-0.05 + lean, 0.74), color=shirt, width=int(lw * 1.2))
        limb((0.05 + lean, 0.70), (0.05 + lean, 0.74), color=shirt, width=int(lw * 1.2))
    limb((lean, neck[1]), (lean, head_c[1] - head_r))

    # head
    hx, hy = P(head_c[0] + lean, head_c[1])
    r = head_r * k
    if spec["hair"] == "spiky":
        for i in range(-3, 4):
            ang = math.radians(90 + i * 22)
            base = (hx + math.cos(ang) * r * 0.85, hy - math.sin(ang) * r * 0.85)
            tip = (hx + math.cos(ang) * r * 1.45, hy - math.sin(ang) * r * 1.45)
            off = r * 0.22
            d.polygon([(base[0] - off * math.sin(ang), base[1] - off * math.cos(ang)),
                       tip,
                       (base[0] + off * math.sin(ang), base[1] + off * math.cos(ang))], fill=black)
    d.ellipse([hx - r, hy - r, hx + r, hy + r], fill=(255, 255, 255, 255), outline=black,
              width=max(3, int(lw * 0.9)))

    # face (looks toward facing direction)
    ex = r * 0.32
    er = r * 0.10
    fx = hx + r * 0.15 * facing
    for side in (-1, 1):
        d.ellipse([fx + side * ex - er, hy - r * 0.15 - er, fx + side * ex + er, hy - r * 0.15 + er],
                  fill=black)
    my = hy + r * 0.38
    if mouth == "smile":
        d.arc([fx - r * 0.35, my - r * 0.30, fx + r * 0.35, my + r * 0.12], 20, 160, fill=black,
              width=max(2, lw // 2))
    elif mouth == "open":
        d.ellipse([fx - r * 0.16, my - r * 0.14, fx + r * 0.16, my + r * 0.16], fill=black)
    else:
        d.line([(fx - r * 0.25, my), (fx + r * 0.25, my)], fill=black, width=max(2, lw // 2))
    if spec["mustache"]:
        d.line([(fx - r * 0.30, my - r * 0.14), (fx + r * 0.30, my - r * 0.14)], fill=black,
               width=max(3, int(lw * 0.8)))

    if spec["hat"] == "tophat":
        brim_y = hy - r * 0.78
        d.rectangle([hx - r * 1.05, brim_y - r * 0.14, hx + r * 1.05, brim_y], fill=black)
        d.rectangle([hx - r * 0.68, brim_y - r * 1.05, hx + r * 0.68, brim_y - r * 0.10], fill=black)
        d.rectangle([hx - r * 0.68, brim_y - r * 0.36, hx + r * 0.68, brim_y - r * 0.22],
                    fill=(150, 20, 20, 255))


def run_approach_a() -> None:
    out = OUT / "A_flux_plus_code"
    out.mkdir(parents=True, exist_ok=True)
    for i, s in enumerate(SCENES):
        bg_path = out / f"{s['id']}_bg.jpg"
        if not bg_path.exists():
            prompt = f"{s['bg']}. {STYLE}"
            if not gen_text_to_image(prompt, bg_path, "flux", W, H, seed=4200 + i):
                print(f"  !! background failed for {s['id']}")
                continue
        frame = fit_cover(bg_path).convert("RGBA")
        ss = 2  # supersample for smooth lines
        layer = Image.new("RGBA", (W * ss, H * ss), (0, 0, 0, 0))
        for name, pose, mouth, xf, size, facing in s["chars"]:
            draw_stick(layer, CHARACTERS[name], pose, mouth, xf * W * ss, H * 0.80 * ss,
                       size * ss, facing)
        layer = layer.resize((W, H), Image.LANCZOS)
        Image.alpha_composite(frame, layer).convert("RGB").save(out / f"{s['id']}.jpg", quality=92)
        print(f"  saved {s['id']}.jpg")


def run_approach_b() -> None:
    out = OUT / "B_klein_with_sheets"
    out.mkdir(parents=True, exist_ok=True)
    sheets = {}
    for i, (name, spec) in enumerate(CHARACTERS.items()):
        p = out / f"sheet_{name}.jpg"
        if not p.exists():
            prompt = (
                f"Character reference sheet of ONE single character shown three times: front view, "
                f"side view and back view, standing in a row, full body, on a plain white background. "
                f"{spec['anchor']}. Flat 2D cartoon style, thick clean black outlines, no text, no labels"
            )
            if not gen_text_to_image(prompt, p, KLEIN, 1536, 1024, seed=777 + i):
                sys.exit(f"sheet failed for {name}")
        sheets[name] = p

    for s in SCENES:
        p = out / f"{s['id']}.jpg"
        if p.exists():
            continue
        names = list(dict.fromkeys(c[0] for c in s["chars"]))
        ref_text = " ".join(
            f"{n.capitalize()} must look exactly like the character in reference image {idx + 1} "
            f"({CHARACTERS[n]['anchor']})."
            for idx, n in enumerate(names)
        )
        prompt = f"{s['scene']}. {ref_text} Characters are small stick figures in a vast detailed world. {STYLE}"
        if not gen_with_references(prompt, [sheets[n] for n in names], p, "1088x1920"):
            print(f"  !! scene failed for {s['id']}")


def build_comparison() -> None:
    rows = [("A: flux background + code characters", OUT / "A_flux_plus_code"),
            ("B: klein + character sheets", OUT / "B_klein_with_sheets")]
    tw, th, pad, label_h = 360, 640, 16, 60
    sheet_w = 540
    total_w = pad + sheet_w + pad + len(SCENES) * (tw + pad)
    total_h = pad + len(rows) * (label_h + th + pad)
    canvas = Image.new("RGB", (total_w, total_h), (24, 24, 28))
    d = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(str(ROOT / "resource/fonts/BeVietnamPro-Bold.ttf"), 30)
    y = pad
    for label, folder in rows:
        d.text((pad, y + 12), label, fill=(255, 242, 0), font=font)
        y += label_h
        sheet_files = sorted(folder.glob("sheet_*.jpg"))
        if sheet_files:
            sh = (th - pad) // max(1, len(sheet_files))
            for j, sf in enumerate(sheet_files):
                im = Image.open(sf).convert("RGB")
                im.thumbnail((sheet_w, sh))
                canvas.paste(im, (pad, y + j * (sh + pad)))
        else:
            d.text((pad + 20, y + th // 2), "(no sheets - characters\n drawn in code)",
                   fill=(160, 160, 160), font=font)
        x = pad + sheet_w + pad
        for s in SCENES:
            f = folder / f"{s['id']}.jpg"
            if f.exists():
                canvas.paste(fit_cover(f, tw, th), (x, y))
            x += tw + pad
        y += th + pad
    canvas.save(OUT / "comparison.jpg", quality=90)
    print(f"saved {OUT / 'comparison.jpg'}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--approach", choices=["a", "b", "compare"], required=True)
    args = ap.parse_args()
    {"a": run_approach_a, "b": run_approach_b, "compare": build_comparison}[args.approach]()
