#!/usr/bin/env python3
"""
Side Quest clipper: long YouTube/Twitch gaming streams -> vertical 9:16 clips with a hook title, word-by-word captions
and a streamer credit.

Stages:
    fetch <url>                      download the video (<=1080p) + YouTube auto-captions with word timings, and write
                                     transcript.txt ([mm:ss] lines) so the best moments can be picked by reading it
    cut <id> --start S --end E --title "..." --credit "@streamer" [--face x,y,w,h] [--zoom 1.15] [--name clip01]
                                     render one clip. --face = facecam box in the SOURCE (pixels) -> facecam on top,
                                     gameplay below; without it the 16:9 picture sits in the middle over a blurred copy
    words <id> --start S --end E     print the transcript words in a range (check exact cut points)

Usage:
    .venv/bin/python tools/clipper.py fetch https://www.youtube.com/watch?v=pXsnpT1gnUs
    .venv/bin/python tools/clipper.py cut pXsnpT1gnUs --start 612.4 --end 655 --title "JYNXZI'S FIRST COP STOP" --credit "@Jynxzi"
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
CLIPS = ROOT / "storage" / "clips"
FONT = str(ROOT / "resource" / "fonts" / "BeVietnamPro-Bold.ttf")
W, H, FPS = 1080, 1920, 30


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def _fmt(t: float) -> str:
    return f"{int(t // 60):02d}:{int(t % 60):02d}"


# ---------------------------------------------------------------------- fetch

def _json3_words(path: Path) -> list[dict]:
    """YouTube json3 auto-captions -> [{'w': word, 's': start, 'e': end}] (seconds)."""
    data = json.loads(path.read_text())
    words = []
    for ev in data.get("events", []):
        t0 = ev.get("tStartMs", 0) / 1000
        dur = ev.get("dDurationMs", 0) / 1000
        segs = [s for s in ev.get("segs", []) if s.get("utf8", "").strip()]
        for i, s in enumerate(segs):
            st = t0 + s.get("tOffsetMs", 0) / 1000
            nxt = t0 + segs[i + 1].get("tOffsetMs", 0) / 1000 if i + 1 < len(segs) else t0 + dur
            words.append({"w": s["utf8"].strip(), "s": round(st, 2), "e": round(max(st + 0.1, min(nxt, st + 1.2)), 2)})
    words.sort(key=lambda x: x["s"])
    # YouTube blanks swear words as "[ __ ]" (sometimes split into tokens) -> show "****"
    out = []
    for w in words:
        t = w["w"]
        if re.fullmatch(r"\[?\W*_+\W*\]?", t) or (t == "]" and out and out[-1]["w"] == "****"):
            if t == "]":
                continue
            if out and out[-1]["w"] == "[":
                out[-1]["w"] = "****"
                continue
            w["w"] = "****"
        elif t == "[":
            pass
        out.append(w)
    return [w for w in out if w["w"] not in ("[", "]")]


def stage_fetch(url: str) -> str:
    vid = re.search(r"(?:v=|youtu\.be/|shorts/|videos/)([\w-]{6,})", url)
    vid = vid.group(1) if vid else re.sub(r"\W", "_", url)[-20:]
    d = CLIPS / vid
    d.mkdir(parents=True, exist_ok=True)
    src = d / "source.mp4"
    if not src.exists():
        print("downloading video...", flush=True)
        _run(["yt-dlp", "-f", "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/b",
              "--merge-output-format", "mp4", "-o", str(src), url])
    if not list(d.glob("*.json3")):
        print("downloading captions...", flush=True)
        subprocess.run(["yt-dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "en.*,en", "--sub-format",
                        "json3", "-o", str(d / "subs"), url], capture_output=True)
    info = subprocess.run(["yt-dlp", "--skip-download", "--print", "%(title)s|%(channel)s|%(duration)s", url],
                          capture_output=True, text=True).stdout.strip()
    (d / "info.txt").write_text(info + "\n" + url + "\n")
    caps = sorted(d.glob("*.json3"))
    if caps:
        words = _json3_words(caps[0])
        (d / "words.json").write_text(json.dumps(words))
        lines, cur, t0 = [], [], None
        for w in words:
            t0 = w["s"] if t0 is None else t0
            cur.append(w["w"])
            if len(cur) >= 14 or w["w"].endswith((".", "?", "!")):
                lines.append(f"[{_fmt(t0)} {t0:.1f}] {' '.join(cur)}")
                cur, t0 = [], None
        if cur:
            lines.append(f"[{_fmt(t0)} {t0:.1f}] {' '.join(cur)}")
        (d / "transcript.txt").write_text("\n".join(lines))
        print(f"transcript: {len(words)} words -> {d / 'transcript.txt'}")
    else:
        print("!! no captions available for this video")
    print(f"id: {vid}  ({info})")
    return vid


# ---------------------------------------------------------------------- render

def _text_img(text: str, size: int, max_w: int, fill=(255, 255, 255), stroke=8, highlight: int | None = None,
              hl_fill=(255, 230, 0)) -> Image.Image:
    """Bold outlined text, wrapped to max_w, transparent background. highlight = index of the word drawn yellow."""
    font = ImageFont.truetype(FONT, size)
    d0 = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
    words = text.split()
    lines, cur = [], []
    for i, w in enumerate(words):
        test = " ".join(x for _, x in cur + [(i, w)])
        if cur and d0.textlength(test, font=font) > max_w:
            lines.append(cur)
            cur = []
        cur.append((i, w))
    if cur:
        lines.append(cur)
    lh = int(size * 1.18)
    img = Image.new("RGBA", (max_w + 2 * stroke + 20, lh * len(lines) + 2 * stroke + 10), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for li, line in enumerate(lines):
        line_txt = " ".join(w for _, w in line)
        x = (img.width - d.textlength(line_txt, font=font)) / 2
        y = stroke + li * lh
        for i, w in line:
            col = hl_fill if i == highlight else fill
            d.text((x, y), w, font=font, fill=col, stroke_width=stroke, stroke_fill=(0, 0, 0))
            x += d.textlength(w + " ", font=font)
    return img


def _caption_track(words: list[dict], dur: float, out_dir: Path) -> Path:
    """PNG sequence (concat demuxer) of 1-3 word groups; the word being spoken is yellow."""
    out_dir.mkdir(exist_ok=True)
    for f in out_dir.glob("*.png"):
        f.unlink()
    blank = out_dir / "blank.png"
    Image.new("RGBA", (1000, 300), (0, 0, 0, 0)).save(blank)
    groups, cur = [], []
    for w in words:
        cur.append(w)
        if len(cur) == 3 or w["w"].endswith((".", "?", "!", ",")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    entries, t, n = [], 0.0, 0
    for g in groups:
        text = " ".join(x["w"] for x in g).upper()
        for k, w in enumerate(g):
            s = max(w["s"], t)
            e = g[k + 1]["s"] if k + 1 < len(g) else min(w["e"] + 0.25, dur)
            if s > t + 0.02:
                entries.append((blank, s - t))
            if e - s < 0.04:
                continue
            img = _text_img(text, 82, 900, highlight=k)
            canvas = Image.new("RGBA", (1000, 300), (0, 0, 0, 0))
            canvas.alpha_composite(img.crop((0, 0, min(img.width, 1000), min(img.height, 300))),
                                   (max(0, (1000 - img.width) // 2), 0))
            p = out_dir / f"c{n:04d}.png"
            canvas.save(p)
            n += 1
            entries.append((p, e - s))
            t = e
    if dur > t:
        entries.append((blank, dur - t))
    lst = out_dir / "list.txt"
    lines = []
    for p, d in entries:
        lines += [f"file '{p}'", f"duration {d:.3f}"]
    lines.append(f"file '{entries[-1][0]}'")
    lst.write_text("\n".join(lines) + "\n")
    return lst


def stage_cut(vid: str, start: float, end: float, title: str, credit: str, face: str | None, zoom: float,
              name: str, game_x: int | None = None) -> Path:
    d = CLIPS / vid
    src = d / "source.mp4"
    work = d / f"_{name}"
    work.mkdir(exist_ok=True)
    dur = end - start
    words = [w for w in json.loads((d / "words.json").read_text()) if start <= w["s"] < end] if (d / "words.json").exists() else []
    for w in words:
        w["s"], w["e"] = round(w["s"] - start, 2), round(min(w["e"], end) - start, 2)
    cap_list = _caption_track(words, dur, work / "caps")
    # title (top) and credit (under the picture)
    title_img = _text_img(title.upper(), 76, 960, stroke=9)
    t_canvas = Image.new("RGBA", (W, 420), (0, 0, 0, 0))
    t_canvas.alpha_composite(title_img, ((W - title_img.width) // 2, max(0, 400 - title_img.height)))
    t_canvas.save(work / "title.png")
    cr = _text_img(credit, 44, 900, fill=(220, 220, 220), stroke=5)
    c_canvas = Image.new("RGBA", (W, 90), (0, 0, 0, 0))
    c_canvas.alpha_composite(cr, ((W - cr.width) // 2, 0))
    c_canvas.save(work / "credit.png")

    cap_y_override = None
    if face:
        # split layout: gameplay on top, facecam big underneath, captions across the seam, credit at the bottom
        fx, fy, fw, fh = (int(v) for v in face.split(","))
        top = 300
        face_h = int(W * fh / fw) // 2 * 2
        game_h = (H - top - face_h - 110) // 2 * 2
        sw, sh = (int(v) for v in subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0",
             str(src)], capture_output=True, text=True).stdout.strip().split(","))
        crop_w = min(sw, int(sh * W / game_h)) // 2 * 2
        gx = game_x if game_x is not None else (sw - crop_w) // 2
        gx = max(0, min(sw - crop_w, gx))
        vf = (f"[0:v]split=3[a][b][c];"
              f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=30,eq=brightness=-0.3[bg];"
              f"[b]crop={crop_w}:{sh}:{gx}:0,scale={W}:{game_h}[game];"
              f"[c]crop={fw}:{fh}:{fx}:{fy},scale={W}:{face_h}[face];"
              f"[bg][game]overlay=0:{top}[t1];[t1][face]overlay=0:{top + game_h}[v0]")
        pic_bottom = top + game_h + face_h
        cap_y_override = top + game_h - 150
    else:
        ph = int(W * 9 / 16 * zoom)
        vf = (f"[0:v]split=2[a][b];"
              f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=30,eq=brightness=-0.25[bg];"
              f"[b]scale=-2:{ph},crop={W}:{ph}[main];[bg][main]overlay=0:{(H - ph) // 2 - 60}[v0]")
        pic_bottom = (H - ph) // 2 - 60 + ph
    cap_y = cap_y_override if cap_y_override is not None else min(H - 330, pic_bottom + 70)
    vf += (f";[v0][1:v]overlay=0:{-120 if face else 20}[v1];[v1][2:v]overlay=0:{min(H - 80, pic_bottom + 12)}[v2];"
           f"[3:v]format=rgba[cap];[v2][cap]overlay=40:{cap_y}:shortest=0[v]")
    out = d / f"{name}.mp4"
    _run(["ffmpeg", "-y", "-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src),
          "-loop", "1", "-i", str(work / "title.png"), "-loop", "1", "-i", str(work / "credit.png"),
          "-f", "concat", "-safe", "0", "-i", str(cap_list),
          "-filter_complex", vf, "-map", "[v]", "-map", "0:a?", "-t", f"{dur:.3f}", "-r", str(FPS),
          "-c:v", "libx264", "-preset", "medium", "-crf", "23", "-maxrate", "5M", "-bufsize", "10M", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
          "-movflags", "+faststart", str(out)])
    print(f"done: {out} ({dur:.1f}s)")
    return out


def stage_words(vid: str, start: float, end: float) -> None:
    for w in json.loads((CLIPS / vid / "words.json").read_text()):
        if start <= w["s"] < end:
            print(f"{w['s']:8.2f} {w['w']}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("stage", choices=["fetch", "cut", "words"])
    ap.add_argument("target")
    ap.add_argument("--start", type=float)
    ap.add_argument("--end", type=float)
    ap.add_argument("--title", default="")
    ap.add_argument("--credit", default="")
    ap.add_argument("--face")
    ap.add_argument("--zoom", type=float, default=1.15)
    ap.add_argument("--name", default="clip01")
    ap.add_argument("--game-x", type=int, help="split layout: left edge of the gameplay crop in source pixels")
    a = ap.parse_args()
    if a.stage == "fetch":
        stage_fetch(a.target)
    elif a.stage == "cut":
        stage_cut(a.target, a.start, a.end, a.title, a.credit, a.face, a.zoom, a.name, a.game_x)
    else:
        stage_words(a.target, a.start, a.end)
