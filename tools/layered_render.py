"""
Render stage of the layered pipeline (see tools/layered_story.py).

Every output frame is composed in code: background plate -> characters (green-screen cutouts) with shadows, depth
scaling, walking and breathing -> camera crop (wide / medium / close-up) or a full-frame insert. Shot timing comes
from edge-tts word timings, pose changes land on the narrated word, and a location change crossfades.
"""

import asyncio
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

import stick_story as ss
from layered_story import ROOT, cutout, ep_dir

FPS = 30
OUT_W = 1080
XFADE = 8  # frames of crossfade when the location changes
# colour grade applied to characters so they sit in the plate's light
TINT = {"hideout_night": (0.72, 0.72, 0.86), "warehouse_ext_night": (0.7, 0.7, 0.85), "basement": (0.8, 0.82, 0.92),
        "alley": (1.0, 0.94, 0.86), "apartment": (1.0, 0.93, 0.84), "stairs": (0.92, 0.9, 0.84)}


def _tokens(text: str) -> list[str]:
    return [w for w in text.split() if any(ch.isalnum() for ch in w)]


class Assets:
    def __init__(self, d: Path):
        self.d = d
        self.plates, self.figs, self.inserts = {}, {}, {}

    def plate(self, lid: str) -> Image.Image:
        if lid not in self.plates:
            self.plates[lid] = Image.open(self.d / "plates" / f"{lid}.jpg").convert("RGB").resize((1920, 1088), Image.LANCZOS)
        return self.plates[lid]

    def fig(self, pid: str) -> Image.Image:
        if pid not in self.figs:
            self.figs[pid] = cutout(self.d / "poses" / f"{pid}.jpg", self.d / "cutouts" / f"{pid}.png")
        return self.figs[pid]

    def frame(self, fid: str) -> Image.Image:
        if fid not in self.inserts:
            self.inserts[fid] = Image.open(self.d / "frames" / f"{fid}.jpg").convert("RGB").resize((1920, 1088), Image.LANCZOS)
        return self.inserts[fid]

    def insert(self, iid: str) -> Image.Image:
        if iid not in self.inserts:
            self.inserts[iid] = Image.open(self.d / "inserts" / f"{iid}.jpg").convert("RGB").resize((1920, 1088), Image.LANCZOS)
        return self.inserts[iid]


def _tint(im: Image.Image, t: tuple | None) -> Image.Image:
    if not t:
        return im
    r, g, b, a = im.split()
    r, g, b = (ch.point(lambda v, k=k: int(v * k)) for ch, k in zip((r, g, b), t))
    return Image.merge("RGBA", (r, g, b, a))


def _ease(k: float) -> float:
    k = max(0.0, min(1.0, k))
    return k * k * (3 - 2 * k)


def _placement(actor: list, poses: dict) -> tuple[float, float, float]:
    """(x_px, floor_y_px, height_px) on the 1920x1088 plate for an actor [pose, x, depth, ...]."""
    pid, x, depth = actor[0], actor[1], actor[2]
    desc = poses[pid]["pose"]
    h = 1088 * (0.40 + 0.32 * depth)
    if "sitting" in desc or "crouching" in desc:
        h *= 0.74
    return x * 1920, 1088 * (0.70 + 0.25 * depth), h


def _draw_actor(canvas: Image.Image, A: Assets, pid: str, x: float, floor: float, h: float, t: float, walking: bool,
                phase: float, tint: tuple | None, alpha: float = 1.0) -> None:
    fig = A.fig(pid)
    breathe = 1 + 0.010 * math.sin(2 * math.pi * (0.45 * t + phase))
    bob = abs(math.sin(2 * math.pi * 1.7 * t)) * h * 0.018 if walking else 0
    fh = max(2, int(h * breathe))
    fw = max(2, int(fig.width * h / fig.height))
    im = _tint(fig.resize((fw, fh), Image.BILINEAR), tint)
    if walking:
        im = im.rotate(1.6 * math.sin(2 * math.pi * 1.7 * t), resample=Image.BILINEAR, expand=True)
    if alpha < 1:
        im.putalpha(im.split()[3].point(lambda v: int(v * alpha)))
    sh = Image.new("RGBA", (int(fw * 0.9) + 20, 40), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse([10, 8, sh.width - 10, 32], fill=(0, 0, 0, int(85 * alpha)))
    sh = sh.filter(ImageFilter.GaussianBlur(5))
    canvas.alpha_composite(sh, (int(x - sh.width / 2), int(floor - 20)))
    canvas.alpha_composite(im, (int(x - im.width / 2), int(floor - im.height - bob)))


def _view(rect: tuple, zoom: float) -> tuple:
    """Shrink a (x0, y0, x1, y1) view around its centre by zoom (>1 = closer), kept inside the plate."""
    x0, y0, x1, y1 = rect
    w, h = (x1 - x0) / zoom, (y1 - y0) / zoom
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    cx = min(max(cx, w / 2), 1920 - w / 2)
    cy = min(max(cy, h / 2), 1088 - h / 2)
    return (cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2)


def render_frame(shot: dict, si: int, t: float, dur: float, word_t: list[float], data: dict, A: Assets,
                 out_size: tuple) -> Image.Image:
    cam = shot["cam"]
    k = t / max(dur, 0.01)
    punch = 1 + 0.12 * _ease(t / 0.22) if shot.get("fx") == "punch" else 1.0
    if shot.get("fx") == "shake" and t < 0.45:
        punch = 1.03 + 0.02 * math.sin(t * 90)  # quick zoom jitter reads as an impact
    drift = [1.0 + 0.05 * k, 1.05 - 0.05 * k][si % 2]
    if cam.startswith(("insert:", "frame:")):
        kind, key = cam.split(":", 1)
        img = A.insert(key) if kind == "insert" else A.frame(key)
        v = _view((0, 0, 1920, 1088), drift * punch * 1.02)
        return img.crop(tuple(int(c) for c in v)).resize(out_size, Image.BILINEAR)

    lid = shot["loc"]
    tint = TINT.get(lid)
    poses = data["poses"]
    # current pose of every actor (pose changes land on the narrated word, with a short crossfade)
    actors = []
    for ai, a in enumerate(shot["actors"]):
        cur, prev, since = a[0], None, 99.0
        for w, idx, newp in shot.get("then", []):
            if idx == ai and w < len(word_t) and t >= word_t[w]:
                prev, cur, since = cur, newp, t - word_t[w]
        actors.append((ai, a, cur, prev, since))

    if cam.startswith("close:"):
        ai = int(cam.split(":")[1])
        _, a, cur, prev, since = actors[ai]
        x, floor, h = _placement(a, poses)
        plate = A.plate(lid)
        bw, bh = 1920 / 3.2, 1088 / 3.2
        bx = min(max(x - bw / 2, 0), 1920 - bw)
        by = min(max(floor - h * 0.85, 0), 1088 - bh)
        v = _view((bx, by, bx + bw, by + bh), drift * 0.98)
        bg = plate.crop(tuple(int(c) for c in v)).resize(out_size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(5))
        bg = ImageEnhance.Brightness(bg).enhance(0.8).convert("RGBA")
        for pid, al in ((cur, 1.0),) if prev is None or since > 0.15 else ((prev, 1 - since / 0.15), (cur, since / 0.15)):
            fig = A.fig(pid)
            # full-body figure in a close-up (klein sometimes draws "busts" full length too): keep head and chest
            if not poses[pid].get("bust") or fig.height > 1.25 * fig.width:
                fig = fig.crop((0, 0, fig.width, int(min(fig.height, max(fig.height * 0.48, fig.width * 1.15)))))
            fh = int(out_size[1] * 0.95 * punch * (1 + 0.008 * math.sin(2 * math.pi * 0.45 * t)))
            fw = int(fig.width * fh / fig.height)
            im = _tint(fig.resize((fw, fh), Image.BILINEAR), tint)
            if al < 1:
                im.putalpha(im.split()[3].point(lambda p, al=al: int(p * al)))
            cx = out_size[0] * (0.42 if a[1] < 0.5 else 0.58)
            bg.alpha_composite(im, (int(cx - fw / 2), out_size[1] - fh + int(out_size[1] * 0.04)))
        return bg.convert("RGB")

    canvas = A.plate(lid).convert("RGBA")
    for ai, a, cur, prev, since in sorted(actors, key=lambda e: e[1][2]):
        x, floor, h = _placement([cur] + a[1:], poses)
        walking = len(a) > 4 and a[4]
        if walking:
            x0, x1 = a[4]
            x = 1920 * (x0 + (x1 - x0) * _ease(k * 1.15))
            walking = k * 1.15 < 1
        if prev is not None and since < 0.15:
            _draw_actor(canvas, A, prev, x, floor, h, t, walking, ai * 0.37, tint, 1 - since / 0.15)
            _draw_actor(canvas, A, cur, x, floor, h, t, walking, ai * 0.37, tint, since / 0.15)
        else:
            _draw_actor(canvas, A, cur, x, floor, h, t, walking, ai * 0.37, tint)
    if cam.startswith("medium:"):
        cx = float(cam.split(":")[1]) * 1920
        places = [_placement(a, poses) for a in shot["actors"]] or [(cx, 1088 * 0.85, 400)]
        vh = min(1088, max(1088 * 0.52, max(h for _, _, h in places) * 1.3))  # whole figure, head to shoes
        vw = vh * 1920 / 1088
        bottom = min(1088, max(f for _, f, _ in places) + 1088 * 0.06)
        v = _view((cx - vw / 2, bottom - vh, cx + vw / 2, bottom), drift * punch)
    else:
        v = _view((0, 0, 1920, 1088), drift * punch)
    return canvas.crop(tuple(int(c) for c in v)).convert("RGB").resize(out_size, Image.BILINEAR)


SFX = {
    "ring": "0.35*sin(2*PI*(880+440*gt(mod(t,0.1),0.05))*t)*lt(mod(t,1.4),0.7)",
    "click": "0.6*(random(0)*2-1)*exp(-90*t)",
    "door": "0.8*sin(2*PI*70*t)*exp(-9*t)+0.3*(random(0)*2-1)*exp(-40*t)",
}
SFX_DUR = {"ring": 2.2, "click": 0.15, "door": 0.7}


def stage_render(slug: str, part: str = "all") -> None:
    from app.models.schema import VideoAspect, VideoParams
    from app.services import video

    d = ep_dir(slug)
    data = json.loads((d / "script.json").read_text())
    for pid, pz in data["poses"].items():  # poses reused from another episode: take their description from there
        while pz.get("copy"):  # follow reuse chains (v3 -> v2 -> v1 ...)
            pz = json.loads((ep_dir(pz["copy"]) / "script.json").read_text())["poses"][pid]
        pz = dict(pz)
        if pz.get("desc") and not pz.get("pose"):  # text-only extras
            pz["pose"] = pz["desc"]
        data["poses"][pid] = pz
    shots = data["shots"]
    k = data.get("split_after_shot", len(shots))
    tag = {"A": "A", "B": "B"}.get(part.upper(), "")
    if tag == "A":
        shots = shots[:k]
    elif tag == "B":
        shots = shots[k:]
    name = f"{slug}{tag}"
    # a split episode can carry its own on-screen title per half (e.g. A = "Part 4: ...", B = "Part 5: ...")
    title = data.get("part_titles", {}).get(tag) or data["title_text"].replace(f"Part {data['part']}:", f"Part {data['part']}{tag}:")

    mp3 = d / f"narration_{name}.mp3"
    words = asyncio.run(ss._tts(" ".join(s["narration"] for s in shots), mp3, data["voice"], data["rate"]))
    total = ss._probe_duration(mp3)
    counts = [len(_tokens(s["narration"])) for s in shots]
    if sum(counts) != len(words):
        raise SystemExit(f"word count mismatch {sum(counts)} vs {len(words)}")
    starts, wt, idx = [], [], 0
    for c in counts:
        starts.append(words[idx]["start"])
        wt.append([w["start"] for w in words[idx:idx + c]])
        idx += c
    starts[0] = 0.0
    ends = starts[1:] + [total]
    print(f"  {name}: {len(shots)} shots, narration {total:.1f}s")

    A = Assets(d)
    bg_path = d / f"_letterbox_{name}.jpg"
    first_plate = next(s["loc"] for s in shots if s.get("loc"))
    pic_y, pic_h = ss.compose_letterbox(d / "plates" / f"{first_plate}.jpg", bg_path, title, with_picture=False)
    out_size = (OUT_W, pic_h)
    raw = d / f"raw_{name}.mp4"
    proc = subprocess.Popen(
        ["ffmpeg", "-y", "-loop", "1", "-i", str(bg_path), "-f", "rawvideo", "-pix_fmt", "rgb24", "-s",
         f"{out_size[0]}x{out_size[1]}", "-r", str(FPS), "-i", "-", "-filter_complex",
         f"[0:v][1:v]overlay=0:{pic_y}:shortest=1[v]", "-map", "[v]", "-r", str(FPS), "-c:v", "libx264",
         "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", str(raw)],
        stdin=subprocess.PIPE, stderr=subprocess.DEVNULL)
    nframes = int(round(total * FPS))
    si, prev_frame, last_loc, fade_from, fade_left = 0, None, None, None, 0
    # on-screen countdown: runs in real time from the start of the "start" shot to the end of the "end" shot
    cd = data.get("countdown")
    cd_t0 = cd_t1 = 0.0
    if cd:
        i0 = next((i for i, x in enumerate(shots) if x.get("countdown") == "start"), None)
        i1 = next((i for i, x in enumerate(shots) if x.get("countdown") == "end"), None)
        if i0 is None or i1 is None:
            cd = None
        else:
            cd_t0, cd_t1 = starts[i0], ends[i1]
    for f in range(nframes):
        t = f / FPS
        while si + 1 < len(shots) and t >= starts[si + 1]:
            si += 1
            loc = shots[si].get("loc") or shots[si]["cam"]
            if last_loc is not None and loc != last_loc and \
                    all(shots[j]["cam"].split(":")[0] in ("wide", "medium") for j in (si - 1, si)):
                fade_from, fade_left = prev_frame, XFADE
            last_loc = loc
        if last_loc is None:
            last_loc = shots[0].get("loc") or shots[0]["cam"]
        s = shots[si]
        frame = render_frame(s, si, t - starts[si], ends[si] - starts[si], [w - starts[si] for w in wt[si]], data, A,
                             out_size)
        if fade_left and fade_from is not None:
            frame = Image.blend(fade_from, frame, 1 - fade_left / (XFADE + 1))
            fade_left -= 1
        tv = s.get("timer_static")
        if cd and cd.get("draw", True) and cd_t0 <= t < cd_t1:  # draw=False: ticking only, shots carry their own clock
            tv = int(math.ceil(cd["from"] - (cd["from"] - cd["to"]) * (t - cd_t0) / (cd_t1 - cd_t0)))
        if tv is not None:
            badge = Image.open(ss._timer_png(tv)).convert("RGBA")
            frame = frame.convert("RGBA")
            frame.alpha_composite(badge, (out_size[0] - badge.width - 28, 22))
            frame = frame.convert("RGB")
        prev_frame = frame
        proc.stdin.write(frame.tobytes())
        if f % 300 == 0:
            print(f"    frame {f}/{nframes}", flush=True)
    proc.stdin.close()
    proc.wait()

    # sound effects mixed under the narration
    voice = mp3
    if cd:
        ticks, voice = d / f"ticks_{name}.wav", d / f"narration_{name}_ticks.mp3"
        ss.ticking_track(ticks, cd_t0, cd_t1, total)
        subprocess.run(["ffmpeg", "-y", "-i", str(mp3), "-i", str(ticks), "-filter_complex",
                        "[1:a]volume=0.25[t];[0:a][t]amix=inputs=2:duration=first:normalize=0[a]", "-map", "[a]",
                        "-b:a", "192k", str(voice)], check=True, capture_output=True)
    mp3 = voice
    hits = [(starts[i], s["sfx"]) for i, s in enumerate(shots) if s.get("sfx")]
    if hits:
        inputs, labels = ["-i", str(mp3)], []
        for n, (at, kind) in enumerate(hits, 1):
            inputs += ["-f", "lavfi", "-i", f"aevalsrc='{SFX[kind]}':s=24000:d={SFX_DUR[kind]}"]
            labels.append(f"[{n}:a]adelay={int(at * 1000)}:all=1,volume=0.5[s{n}]")
        mix = ";".join(labels) + ";" + "[0:a]" + "".join(f"[s{n}]" for n in range(1, len(hits) + 1)) + \
            f"amix=inputs={len(hits) + 1}:duration=first:normalize=0[a]"
        voice = d / f"narration_{name}_sfx.mp3"
        subprocess.run(["ffmpeg", "-y", *inputs, "-filter_complex", mix, "-map", "[a]", "-b:a", "192k", str(voice)],
                       check=True, capture_output=True)

    cues, i = [], 0
    while i < len(words):
        n = 2 if len(words) - i == 4 else min(3, len(words) - i)
        group = words[i:i + n]
        end = words[i + n]["start"] if i + n < len(words) else group[-1]["end"]
        cues.append((group[0]["start"], end, " ".join(w["text"] for w in group)))
        i += n
    srt = d / f"subtitles_{name}.srt"
    srt.write_text("\n\n".join(f"{c}\n{ss._fmt(a)} --> {ss._fmt(b)}\n{txt}" for c, (a, b, txt) in enumerate(cues, 1)) + "\n")
    params = VideoParams(
        video_subject=data["title"], video_aspect=VideoAspect.portrait, subtitle_enabled=True,
        subtitle_position="custom", custom_position=78.0, font_name="MicrosoftYaHeiBold.ttc", font_size=56,
        text_fore_color="#FFF200", stroke_color="#000000", stroke_width=2.8, bgm_type="", bgm_volume=0.0)
    final = d / f"{name}.mp4"
    video.generate_video(video_path=str(raw), audio_path=str(voice), subtitle_path=str(srt), output_file=str(final),
                         params=params)
    print(f"done: {final} ({ss._probe_duration(final):.1f}s)")
