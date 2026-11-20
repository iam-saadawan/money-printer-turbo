"""High-quality vertical clip renderer (Side Quest v2).

Why: the first Jynxzi batch looked soft (small facecam crop blown up 2-3x, 30 fps, 5 Mbit cap, YouTube auto-caption
timings). This renderer keeps the source sharp (crop is DOWN-scaled where possible), keeps 60 fps, encodes at high
bitrate, normalises loudness, transcribes the cut with faster-whisper for exact word timings, and supports jump cuts
(several segments) and punch-in zooms.

Usage:
  .venv/bin/python tools/clipper_pro.py --src storage/clips/speed_expedia/src.mp4 \
      --seg 87.8-97.2 --seg 141.0-180.0 --crop 480,0,1280,1080 --punch 167.6-171.5 \
      --title "Speed told a fan he's going to Japan 😭" --credit "IShowSpeed x Expedia stream" --out out.mp4
Times are in source seconds. --crop x,y,w,h is the source region shown (keep w >= 1080 for sharpness).
--mode trailer: full 16:9 frame, big, centred (for official trailers); no captions unless --captions.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from clipper import _text_img, _caption_track  # noqa: E402

W, H = 1080, 1920


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-3000:])
        raise SystemExit(f"failed: {cmd[0]}")
    return r


def probe(src):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate",
               "-of", "csv=p=0", str(src)]).stdout.strip().split(",")
    num, den = out[2].split("/")
    return int(out[0]), int(out[1]), round(int(num) / int(den))


def transcribe(audio: Path, model_size: str) -> list[dict]:
    from faster_whisper import WhisperModel
    m = WhisperModel(model_size, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(str(audio), language="en", word_timestamps=True, vad_filter=False, condition_on_previous_text=False)
    words = []
    for s in segs:
        for w in s.words or []:
            t = w.word.strip()
            if t:
                words.append({"w": t, "s": round(w.start, 2), "e": round(w.end, 2)})
    return words


BLEEP = {"fuck", "fucking", "shit", "bitch", "nigga", "damn"}


def clean(words):
    # whisper splits numbers ("$10", ",000"): glue fragments that start with , or . + digit onto the previous word
    merged = []
    for w in words:
        if merged and len(w["w"]) > 1 and ((w["w"][0] in ",." and w["w"][1].isdigit()) or w["w"][0] == "-"):
            merged[-1]["w"] += w["w"]; merged[-1]["e"] = w["e"]
        else:
            merged.append(dict(w))
    words = merged
    for w in words:
        core = "".join(c for c in w["w"].lower() if c.isalpha())
        if core in BLEEP or core.startswith("fuck"):
            w["w"] = "****"
    return words


def no_emoji(t: str) -> str:
    return "".join(c for c in t if ord(c) < 0x2000 or c in "’‘“”—–…").strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--seg", action="append", required=True, help="start-end in source seconds (repeatable)")
    ap.add_argument("--crop", help="x,y,w,h source region (default: full frame)")
    ap.add_argument("--punch", action="append", default=[], help="start-end (source s) to zoom in 15%%")
    ap.add_argument("--title", default="")
    ap.add_argument("--credit", default="")
    ap.add_argument("--out", required=True)
    ap.add_argument("--mode", choices=["clip", "trailer"], default="clip")
    ap.add_argument("--captions", action="store_true", help="force captions in trailer mode")
    ap.add_argument("--no-captions", action="store_true")
    ap.add_argument("--onscreen", default="", help="extra line under the video (e.g. required campaign text)")
    ap.add_argument("--logo", help="PNG watermark, top-right of the video")
    ap.add_argument("--whisper", default="small")
    ap.add_argument("--yt-subs", help="YouTube json3 captions of the source, used to fill gaps whisper skipped")
    ap.add_argument("--yt-offset", type=float, default=0.0, help="source-file time 0 = this time in the YouTube video")
    a = ap.parse_args()

    src = Path(a.src).resolve()
    out = Path(a.out).resolve()
    work = out.parent / f"_{out.stem}"
    work.mkdir(parents=True, exist_ok=True)
    sw, sh, fps = probe(src)
    fps = 60 if fps >= 50 else 30
    segs = [tuple(float(v) for v in s.split("-")) for s in a.seg]

    # 1. cut + join segments (frame-accurate re-encode at high quality) -> base.mp4
    parts = []
    for i, (s, e) in enumerate(segs):
        p = work / f"part{i}.mp4"
        run(["ffmpeg", "-y", "-ss", f"{s:.3f}", "-i", str(src), "-t", f"{e - s:.3f}", "-r", str(fps),
             "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-c:a", "pcm_s16le", "-ar", "48000", str(p).replace(".mp4", ".mkv")])
        parts.append(str(p).replace(".mp4", ".mkv"))
    lst = work / "parts.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts))
    base = work / "base.mkv"
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(base)])
    dur = sum(e - s for s, e in segs)

    # source time -> output time (for punch-ins)
    def to_out(t):
        acc = 0.0
        for s, e in segs:
            if s <= t <= e:
                return acc + t - s
            acc += e - s
        return None

    # 2. captions from whisper on the joined audio
    want_caps = (a.mode == "clip" and not a.no_captions) or a.captions
    words = []
    if want_caps:
        wav = work / "audio.wav"
        run(["ffmpeg", "-y", "-i", str(base), "-vn", "-ac", "1", "-ar", "16000", str(wav)])
        cache = work / "words.json"
        if cache.exists():
            words = json.loads(cache.read_text())
        else:
            words = clean(transcribe(wav, a.whisper))
            if a.yt_subs:
                from clipper import _json3_words
                yt = _json3_words(Path(a.yt_subs))
                fill, acc = [], 0.0
                for s0, e0 in segs:
                    for w in yt:
                        t = w["s"] - a.yt_offset
                        if s0 <= t < e0:
                            ot = acc + t - s0
                            near = any(abs(x["s"] - ot) < 1.2 for x in words)
                            if not near:
                                fill.append({"w": w["w"].replace(">>", "").strip(), "s": round(ot, 2),
                                             "e": round(acc + min(w["e"] - a.yt_offset, e0) - s0, 2)})
                    acc += e0 - s0
                fill = [f for f in fill if f["w"]]
                if fill:
                    print(f"filled {len(fill)} words from YouTube captions")
                words = clean(sorted(words + fill, key=lambda x: x["s"]))
            cache.write_text(json.dumps(words))
    cap_list = _caption_track(words, dur, work / "caps")

    # 3. overlays: title, credit, on-screen line
    title_img = _text_img(no_emoji(a.title).upper(), 74, 980, stroke=9) if a.title else Image.new("RGBA", (10, 10))
    tc = Image.new("RGBA", (W, 420), (0, 0, 0, 0))
    # required campaign line goes UNDER THE TITLE (top of screen): the bottom ~350 px is covered by TikTok's UI
    on_h = 0
    if a.onscreen:
        on = _text_img(a.onscreen.upper(), 40, 1020, fill=(255, 230, 0), stroke=6)
        on_h = on.height + 4
        tc.alpha_composite(on, ((W - on.width) // 2, 414 - on.height))
    tc.alpha_composite(title_img, ((W - title_img.width) // 2, max(0, 410 - on_h - title_img.height)))
    tc.save(work / "title.png")
    cr = _text_img(a.credit, 40, 1000, fill=(225, 225, 225), stroke=5) if a.credit else Image.new("RGBA", (10, 10))
    cc = Image.new("RGBA", (W, 200), (0, 0, 0, 0))
    cc.alpha_composite(cr, ((W - cr.width) // 2, 0))
    cc.save(work / "credit.png")

    # 4. layout
    if a.crop:
        cx, cy, cw, ch = (int(v) for v in a.crop.split(","))
    else:
        cx, cy, cw, ch = 0, 0, sw, sh
    vh = int(W * ch / cw) // 2 * 2
    vy = 430 if vh <= 1100 else max(300, (H - vh) // 2)
    zoom_expr = "1"
    if a.punch:
        terms = []
        for p in a.punch:
            ps, pe = (float(v) for v in p.split("-"))
            os_, oe = to_out(ps), to_out(pe)
            if os_ is not None and oe is not None:
                terms.append(f"between(t,{os_:.2f},{oe:.2f})")
        if terms:
            zoom_expr = f"(1+0.15*({'+'.join(terms)}))"
    main = (f"[b]crop={cw}:{ch}:{cx}:{cy},scale=w='trunc({W}*{zoom_expr}/2)*2':h=-2:eval=frame:flags=lanczos,"
            f"crop={W}:{vh}:(iw-{W})/2:(ih-{vh})/2[main]")
    vf = (f"[0:v]split=2[a][b];"
          f"[a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},gblur=sigma=40,eq=brightness=-0.32:saturation=1.2[bg];"
          f"{main};[bg][main]overlay=0:{vy}[v0];"
          f"[v0][1:v]overlay=0:{vy - 430}[v1];"
          f"[v1][2:v]overlay=0:{min(H - 200, vy + vh + (230 if want_caps else 20))}[v2];"
          f"[3:v]format=rgba[cap];[v2][cap]overlay=40:{vy + vh + 10}:shortest=0[v3]")
    inputs = ["-i", str(base), "-loop", "1", "-i", str(work / "title.png"), "-loop", "1", "-i", str(work / "credit.png"),
              "-f", "concat", "-safe", "0", "-i", str(cap_list)]
    if a.logo:
        inputs += ["-loop", "1", "-i", a.logo]
        vf += f";[4:v]scale=230:-1[lg];[v3][lg]overlay={W - 255}:{vy + 25}[v]"
    else:
        vf += ";[v3]null[v]"
    af = "loudnorm=I=-14:TP=-1.5:LRA=11"
    run(["ffmpeg", "-y", *inputs, "-filter_complex", vf, "-map", "[v]", "-map", "0:a", "-af", af,
         "-t", f"{dur:.3f}", "-r", str(fps), "-c:v", "libx264", "-preset", "slow", "-crf", "17",
         "-maxrate", "16M", "-bufsize", "32M", "-profile:v", "high", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", str(out)])
    print(f"done: {out} ({dur:.1f}s, {fps} fps)")


if __name__ == "__main__":
    main()
