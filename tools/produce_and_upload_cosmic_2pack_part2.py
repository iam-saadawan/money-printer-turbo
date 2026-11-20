#!/usr/bin/env python3
"""
The Cosmic Vault - 2 New High-Retention Shorts Production & Publishing (Part 2)
Produces 2 brand-new cosmic mystery shorts with:
1. Distinct hero thumbnail covers prepended as Clip #1 (Frame 0.0s - 2.5s)
   so TikTok and YouTube Shorts show vibrant, unique covers instead of dark void duplicates.
2. High-definition 1080x1920 Pexels & Pixabay B-roll with dynamic visual flow.
3. Comma-sanitized scripts to guarantee 100% flawless subtitle alignment (solves §2a gotcha).
4. Punchy, modern 2-3 word subtitle cues positioned perfectly in the mobile safe zone (78.0%).
5. Crisp Edge-TTS voiceover and cinematic orchestral/electronic BGM.
6. Direct autonomous upload to YouTube Shorts and TikTok Studio via Playwright sessions.
"""

import asyncio
import json
import math
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import List, Tuple

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from loguru import logger
from openai import OpenAI

from app.config import config
from app.models.schema import (
    MaterialInfo,
    VideoAspect,
    VideoConcatMode,
    VideoFitMode,
    VideoParams,
)
from app.services import task as tm
from app.services.pollinations_service import pollinations_service
from app.services.tiktok_uploader import tiktok_uploader
from app.services.youtube_uploader import youtube_uploader
from app.utils import utils

STATUS_FILE = PROJECT_ROOT / "storage" / "cosmic_2pack_part2_status.json"

BATCH_CONCEPTS = [
    {
        "id": "cosmic_blc1_signal",
        "topic": "BLC1: In 2020, the Parkes radio telescope in Australia intercepted a mysterious 982-megahertz radio beam that shifted in frequency exactly like an alien transmitter coming directly from Proxima Centauri.",
        "hero_image": str(PROJECT_ROOT / "storage" / "hero_thumb_blc1_signal.jpg"),
        "bgm_file": "theme_alien_signal_mystery.mp3",
        "default_title": "The Signal From Our Nearest Star #shorts",
        "video_source": "pexels",
    },
    {
        "id": "cosmic_saturn_hexagon",
        "topic": "Saturn's Hexagon: A colossal six-sided geometric storm spinning at Saturn's north pole wider than two Earths that has raged for centuries with physics unable to explain why nature formed a polygon.",
        "hero_image": str(PROJECT_ROOT / "storage" / "hero_thumb_saturn_hexagon.jpg"),
        "bgm_file": "theme_hostile_cosmos.mp3",
        "default_title": "The Impossible Shape On Saturn #shorts",
        "video_source": "pixabay",
    },
]

SYSTEM_PROMPT = """
You are an elite storyteller for viral YouTube Shorts and TikTok, specializing in true, strange mysteries told the way a gripping podcast host tells them around a fire — not the way a professor lectures a classroom. Your only job is to make a viewer physically unable to look away.

You output STRICT JSON ONLY with the following exact keys:
{
  "subject": "Compelling Title for YouTube #shorts",
  "hook": "First 5-8 words that immediately create urgent curiosity and stop the scroll",
  "script": "Full spoken voiceover script, written as a story being told to a friend",
  "theme_mood": "Pick one exact mood: black_hole_dread, silent_void, alien_mystery, cosmic_cataclysm, or quantum_anomaly",
  "sentences": ["The script split into its individual sentences, IN ORDER, exactly as they appear in 'script'"],
  "visual_terms": ["One specific, cinematic stock-footage search term PER ENTRY IN 'sentences', in the SAME ORDER, each depicting what that exact sentence is describing"],
  "youtube_title": "Clickable Title for YouTube Shorts (under 80 chars) with #shorts",
  "youtube_description": "2-sentence curiosity description with #shorts #space #mystery tags",
  "youtube_tags": ["shorts", "space", "mystery", "universe", "science"]
}

CRITICAL SCRIPT & RETENTION RULES:
1. SCRIPT LENGTH: Exactly 130 to 150 words (at 1.15x speech rate, this generates roughly 55-65 seconds of spoken audio).
2. TELL A STORY, NOT A LECTURE: NEVER write like a documentary narrator reciting facts ("Scientists observed...", "Researchers concluded..."). Put the listener INSIDE the moment: what did someone SEE, FEEL, DO? Use plain, everyday words.
3. WRITE HOW A PERSON ACTUALLY TALKS: Spoken narration. Vary sentence length naturally.
4. NO COMMAS IN SCRIPT (CRITICAL ENGINE REQUIREMENT): Avoid mid-sentence comma clauses, appositives, and comma lists. Use short standalone sentences ending in periods. Comma clauses break the automated subtitle synchronization system!
5. SCROLL-STOPPING HOOK: The first 3 seconds must hit with an immediate pattern interrupt — a shocking claim, a specific number, or a direct question.
6. GROUND IN CONCRETE DETAIL EARLY: A specific year, measurement, or named place in the first 20 words.
7. MICRO-TWISTS EVERY 10-15 SECONDS: Introduce escalating stakes or an unsettling fact.
8. SEAMLESS INFINITE LOOP (MANDATORY): The very last words of the script MUST be an incomplete connector phrase (such as 'Which is...', 'And that is...', 'Leading directly to...', 'Which explains...') that seamlessly connects directly back into the opening hook sentence when the video loops!
9. SENTENCE/VISUAL ALIGNMENT: 'sentences' must be the exact same text as 'script', split one sentence per array entry. 'visual_terms' MUST have exactly the same number of entries as 'sentences', in matching order.
10. VISUAL TERMS MUST BE REAL, FINDABLE STOCK FOOTAGE: Real stock queries against Pexels/Pixabay (e.g. 'radio telescope dish night', 'saturn planet rings', 'astronomer looking at screen', 'cosmic gas cloud swirl'). No unfilmable or gory requests.
"""


def load_status() -> dict:
    if STATUS_FILE.exists():
        try:
            with open(STATUS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_status(data: dict):
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


def sanitize_script(script_text: str) -> str:
    """
    Sanitize script text by removing mid-sentence commas to guarantee
    edge-tts word cues align perfectly with subtitle generation (solves §2a gotcha).
    """
    sanitized = script_text.replace(",", "")
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized


def generate_video_concept(topic: str) -> dict:
    """Generate script and visual terms using Groq LLM with fallback."""
    api_key = config.app.get("groq_api_key")
    if not api_key:
        raise ValueError("groq_api_key not found in config.toml")

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
    )

    models_to_try = [
        config.app.get("groq_model_name", "qwen/qwen3.8-27b"),
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]
    seen = set()
    models_to_try = [m for m in models_to_try if not (m in seen or seen.add(m))]

    last_error = None
    for model_name in models_to_try:
        try:
            logger.info(f"Generating viral concept for topic: '{topic[:40]}...' (Model: {model_name})")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT.strip()},
                    {"role": "user", "content": f"Topic: {topic}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.75,
                max_tokens=1000,
            )
            content = response.choices[0].message.content
            data = json.loads(content)

            # Sanitize script to remove mid-sentence commas
            if "script" in data:
                data["script"] = sanitize_script(data["script"])
            if "sentences" in data and isinstance(data["sentences"], list):
                data["sentences"] = [sanitize_script(s) for s in data["sentences"]]

            return data
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Trying fallback...")
            last_error = e
            time.sleep(3.0)

    raise RuntimeError(f"All Groq models failed for topic '{topic}': {last_error}")


def split_srt_into_short_cues(srt_content: str, max_words_per_cue: int = 3) -> str:
    """
    Split long SRT sentences into punchy 2-3 word subtitle cues.
    Guarantees subtitles never clutter or cover the video artwork.
    """
    pattern = re.compile(
        r'(\d+)\s*\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\s*\n(.*?)(?=\n\s*\n|\Z)',
        re.DOTALL,
    )
    matches = list(pattern.finditer(srt_content.strip()))
    if not matches:
        return srt_content

    new_cues = []
    cue_idx = 1

    def parse_time(ts: str) -> float:
        h, m, rest = ts.split(":")
        s, ms = rest.split(",")
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    def format_time(sec: float) -> str:
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        ms = int(round((sec - int(sec)) * 1000))
        if ms >= 1000:
            s += 1
            ms = 0
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    for m in matches:
        start_sec = parse_time(m.group(2))
        end_sec = parse_time(m.group(3))
        text = " ".join(m.group(4).replace("\n", " ").split())
        words = text.split()

        if not words:
            continue

        if len(words) <= max_words_per_cue:
            new_cues.append(
                f"{cue_idx}\n{format_time(start_sec)} --> {format_time(end_sec)}\n{text}"
            )
            cue_idx += 1
            continue

        chunks = []
        i = 0
        while i < len(words):
            rem = len(words) - i
            if rem == 4:
                chunk_len = 2
            elif rem >= 3:
                chunk_len = 3
            else:
                chunk_len = rem
            chunks.append(words[i : i + chunk_len])
            i += chunk_len

        weights = [sum(max(2, len(w)) for w in chunk) for chunk in chunks]
        total_weight = sum(weights)
        total_duration = max(0.1, end_sec - start_sec)

        curr_start = start_sec
        for idx_c, (chunk, w) in enumerate(zip(chunks, weights)):
            dur = total_duration * (w / total_weight)
            curr_end = curr_start + dur if idx_c < len(chunks) - 1 else end_sec
            chunk_text = " ".join(chunk)
            new_cues.append(
                f"{cue_idx}\n{format_time(curr_start)} --> {format_time(curr_end)}\n{chunk_text}"
            )
            cue_idx += 1
            curr_start = curr_end

    return "\n\n".join(new_cues) + "\n"


def convert_image_to_hero_clip(img_path: str, output_mp4: str, duration: float = 2.5) -> bool:
    """
    Convert a vertical hero image into a crystal-clear 1080x1920 MP4 clip via FFmpeg.
    Uses high-bitrate libx264 encoding with slow preset and crf 17.
    """
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", img_path,
        "-c:v", "libx264",
        "-t", str(duration),
        "-pix_fmt", "yuv420p",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
        "-r", "30",
        "-crf", "17",
        "-preset", "slow",
        output_mp4,
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(output_mp4) and os.path.getsize(output_mp4) > 10000
    except Exception as e:
        logger.error(f"FFmpeg hero clip conversion failed for {img_path}: {e}")
        return False


def get_audio_duration_seconds(audio_file: str) -> float:
    """Retrieve precise duration of an audio file via ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        audio_file,
    ]
    try:
        out = subprocess.check_output(cmd).decode().strip()
        return float(out)
    except Exception as e:
        logger.warning(f"ffprobe duration check failed: {e}")
        return 60.0


def generate_extra_background_stills(
    task_dir: str, visual_terms: list, count: int = 4, duration: float = 2.0
) -> List[str]:
    """
    Generate unique Pollinations AI STILL images (no zoom/pan motion)
    spread across the script's visual terms, and encode each as a plain static clip.
    """
    if not visual_terms:
        return []

    n = len(visual_terms)
    step = max(1, n // count)
    picks = [visual_terms[min(i * step, n - 1)] for i in range(count)]

    clips: List[str] = []
    for idx, term in enumerate(picks, start=1):
        img_path = os.path.join(task_dir, f"ai_still_{idx}.jpg")
        clip_path = os.path.join(task_dir, f"ai_still_{idx}.mp4")
        prompt = (
            f"{term}, hyperrealistic cinematic still, 8k resolution, photorealistic, "
            f"dramatic atmospheric volumetric lighting, vertical 9:16 composition"
        )
        try:
            if pollinations_service.generate_image(prompt=prompt, output_path=img_path) and os.path.exists(img_path):
                if convert_image_to_hero_clip(img_path, clip_path, duration=duration):
                    clips.append(clip_path)
                    logger.success(f"AI still clip #{idx} ready: {clip_path}")
        except Exception as e:
            logger.warning(f"Skipping AI still #{idx} ('{term}') after error: {e}")

    logger.info(f"Generated {len(clips)}/{count} extra AI background stills")
    return clips


def produce_cosmic_video(item: dict) -> Tuple[str, dict]:
    """
    Produce one complete Cosmic Vault video with custom hero cover, mixed
    stock-footage provider, unique AI still backgrounds, and 2-3 word subtitles.
    Returns (video_path, concept_dict).
    """
    topic = item["topic"]
    hero_image = item["hero_image"]
    bgm_file = item["bgm_file"]
    video_source = item.get("video_source", "pexels")

    logger.info(f"\n{'='*70}\nPRODUCING COSMIC SHORT: {topic}\n{'='*70}")

    # 1. Generate concept script & visual terms via Groq
    concept = generate_video_concept(topic)
    script_text = concept.get("script", "").strip()
    visual_terms = concept.get("visual_terms", [])
    terms_str = ", ".join(visual_terms) if isinstance(visual_terms, list) else str(visual_terms)

    logger.info(f"Subject: {concept.get('subject')}")
    logger.info(f"Hook: {concept.get('hook')}")
    logger.info(f"Script word count: {len(script_text.split())} words")
    logger.info(f"Stock footage provider for this video: {video_source}")

    task_id = utils.get_uuid()
    task_dir = utils.task_dir(task_id)

    params = VideoParams(
        video_subject=concept.get("subject", "The Cosmic Vault"),
        video_script=script_text,
        video_terms=terms_str,
        video_aspect=VideoAspect.portrait.value,
        video_fit_mode=VideoFitMode.cover,
        video_concat_mode=VideoConcatMode.sequential.value,
        match_materials_to_script=True,
        video_clip_duration=2,
        video_clip_speed=1.0,
        video_count=1,
        video_source=video_source,
        video_language="en-US",
        voice_name="en-US-AndrewMultilingualNeural",
        voice_volume=1.0,
        voice_rate=1.15,
        bgm_type="random",
        bgm_file=bgm_file,
        bgm_volume=0.28,
        subtitle_enabled=True,
        font_name="MicrosoftYaHeiBold.ttc",
        subtitle_position="custom",
        custom_position=78.0,
        font_size=56,
        text_fore_color="#FFF200",  # Vibrant cartoon yellow
        stroke_color="#000000",
        stroke_width=2.8,
        n_threads=4,
    )

    # Blank pollinations_api_key during materials stage to prevent built-in motion clips
    orig_pol_key = config.app.get("pollinations_api_key", "")
    config.app["pollinations_api_key"] = ""
    try:
        logger.info(f"Running pipeline stage 'materials' for task {task_id}...")
        mat_result = tm.start(
            task_id=task_id,
            params=params,
            stop_at="materials",
            allow_server_file_input=True,
        )

        if not mat_result or not mat_result.get("materials"):
            raise RuntimeError(f"Materials stage failed for task {task_id}")

        downloaded_videos = mat_result["materials"]
    finally:
        config.app["pollinations_api_key"] = orig_pol_key

    audio_file = os.path.join(task_dir, "audio.mp3")
    subtitle_file = os.path.join(task_dir, "subtitle.srt")

    if not os.path.exists(audio_file) or not os.path.exists(subtitle_file):
        raise RuntimeError(f"Audio or subtitle file missing in {task_dir}")

    audio_duration = get_audio_duration_seconds(audio_file)
    logger.info(f"Audio duration: {audio_duration:.2f}s")

    # Step B: Refactor subtitles to dynamic 2-3 word cues
    with open(subtitle_file, "r", encoding="utf-8") as f:
        raw_srt = f.read()

    short_srt = split_srt_into_short_cues(raw_srt, max_words_per_cue=3)
    with open(subtitle_file, "w", encoding="utf-8") as f:
        f.write(short_srt)
    logger.success(f"Subtitles transformed into punchy 2-3 word cues at {subtitle_file}")

    # Step C: Convert hero thumbnail image into 2.5s Clip #1
    hero_clip_path = os.path.join(task_dir, "000_hero_thumb.mp4")
    logger.info(f"Converting hero thumbnail {hero_image} to 2.5s clip...")
    if not convert_image_to_hero_clip(hero_image, hero_clip_path, duration=2.5):
        raise RuntimeError(f"Failed to convert hero thumbnail image {hero_image}")

    logger.success(f"Hero clip ready: {hero_clip_path} ({os.path.getsize(hero_clip_path)/1024:.1f} KB)")

    # Step D: Generate 3-4 unique static AI background stills (2s each, no motion)
    extra_stills = generate_extra_background_stills(task_dir, visual_terms, count=4, duration=2.0)

    # Step E: Interleave stills evenly among the stock clips, hero clip always first
    stock_clips = [v for v in downloaded_videos if os.path.exists(v)]
    ordered_materials = [hero_clip_path]
    if extra_stills and stock_clips:
        interval = max(1, len(stock_clips) // (len(extra_stills) + 1))
        stills_iter = iter(extra_stills)
        for idx, clip in enumerate(stock_clips, start=1):
            ordered_materials.append(clip)
            if idx % interval == 0:
                still = next(stills_iter, None)
                if still:
                    ordered_materials.append(still)
        ordered_materials.extend(list(stills_iter))
    else:
        ordered_materials.extend(stock_clips)
        ordered_materials.extend(extra_stills)

    logger.info(
        f"Total video materials ready for assembly: {len(ordered_materials)} clips "
        f"(1 hero cover + {len(stock_clips)} {video_source} stock + {len(extra_stills)} AI stills)"
    )

    # Step F: Combine videos and render final short
    final_video_paths, combined_paths, warnings = tm.generate_final_videos(
        task_id=task_id,
        params=params,
        downloaded_videos=ordered_materials,
        audio_file=audio_file,
        subtitle_path=subtitle_file,
        audio_duration=audio_duration,
    )

    if not final_video_paths or not os.path.exists(final_video_paths[0]):
        raise RuntimeError(f"Video assembly failed for task {task_id}")

    final_mp4 = final_video_paths[0]
    size_mb = os.path.getsize(final_mp4) / (1024 * 1024)
    logger.success(f"🎉 MASTER VIDEO CREATED: {final_mp4} ({size_mb:.2f} MB, {audio_duration:.1f}s)")

    return final_mp4, concept


def main():
    print("=" * 70)
    print("🚀 THE COSMIC VAULT — 2 BRAND-NEW SHORTS (PART 2)")
    print("   AUTOMATED PRODUCTION & DUAL-PLATFORM PUBLISHING (YOUTUBE & TIKTOK)")
    print("=" * 70)

    # 1. Verify uploaders
    yt_ok = youtube_uploader.is_configured()
    tt_ok = tiktok_uploader.is_configured()

    print(f"YouTube Studio Uploader: {'✅ Ready' if yt_ok else '❌ Session Missing'}")
    print(f"TikTok Studio Uploader:  {'✅ Ready' if tt_ok else '❌ Session Missing'}")

    if not yt_ok or not tt_ok:
        print("❌ Cannot proceed without active YouTube and TikTok sessions.")
        sys.exit(1)

    # 2. Generate any missing hero cover images
    for c in BATCH_CONCEPTS:
        if not os.path.exists(c["hero_image"]):
            print(f"🎨 Generating hero cover for '{c['id']}'...")
            prompt = (
                f"{c['default_title'].replace('#shorts', '').strip()}, cinematic hero cover art, "
                f"dramatic vertical 9:16 composition, high detail, moody atmospheric lighting, "
                f"no text, no watermark"
            )
            ok = pollinations_service.generate_image(
                prompt=prompt, output_path=c["hero_image"], width=1080, height=1920
            )
            if not ok or not os.path.exists(c["hero_image"]):
                print(f"❌ Failed to generate hero thumbnail: {c['hero_image']}")
                sys.exit(1)
        print(f"✅ Hero visual ready: {Path(c['hero_image']).name}")

    status_data = load_status()
    total = len(BATCH_CONCEPTS)

    for i, item in enumerate(BATCH_CONCEPTS, start=1):
        concept_id = item["id"]
        item_status = status_data.get(concept_id, {})

        print("\n" + "=" * 70)
        print(f"🎬 [{i}/{total}] BATCH ITEM: {item['topic']}")
        print("=" * 70)

        # Check if video was already rendered
        video_path = item_status.get("video_path")
        concept_meta = item_status.get("concept", {})

        if not video_path or not os.path.exists(video_path):
            print(f"⚙️ Producing new video for '{concept_id}'...")
            try:
                video_path, concept_meta = produce_cosmic_video(item)
                item_status["video_path"] = video_path
                item_status["concept"] = concept_meta
                item_status["rendered_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
                status_data[concept_id] = item_status
                save_status(status_data)
            except Exception as e:
                logger.exception(f"Failed to produce video for {concept_id}: {e}")
                item_status["error"] = str(e)
                status_data[concept_id] = item_status
                save_status(status_data)
                continue
        else:
            print(f"✅ Found existing rendered video: {video_path}")

        # Metadata preparation
        title = concept_meta.get("youtube_title", f"{concept_meta.get('subject', item['default_title'])} #shorts")
        if "#shorts" not in title.lower():
            title = f"{title} #shorts"

        desc = concept_meta.get(
            "youtube_description",
            f"{concept_meta.get('hook', '')}\n\n#shorts #space #mystery #universe #cosmicvault"
        )
        if "#shorts" not in desc.lower():
            desc += "\n\n#shorts #space #mystery #universe #cosmicvault"

        tags = concept_meta.get("youtube_tags", ["shorts", "space", "mystery", "universe", "cosmicvault"])

        caption = f"{title} {concept_meta.get('hook', '')} #shorts #space #mystery #universe #cosmicvault"
        if len(caption) > 150:
            caption = caption[:145] + " #shorts"

        # -----------------------------------------------------------------
        # Upload to YouTube Shorts
        # -----------------------------------------------------------------
        if item_status.get("youtube_success"):
            print(f"⏩ YouTube: Already uploaded! (URL: {item_status.get('youtube_url')})")
        else:
            print(f"\n📤 [YouTube {i}/{total}] Uploading '{title}' to YouTube Shorts...")
            yt_res = youtube_uploader.upload_video(
                video_path=video_path,
                title=title,
                description=desc,
                tags=tags,
                headless=True,
            )

            if yt_res.get("success"):
                yt_url = yt_res.get("url", "")
                print(f"  🎉 YouTube SUCCESS! URL: {yt_url}")
                item_status["youtube_success"] = True
                item_status["youtube_url"] = yt_url
                item_status["youtube_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            else:
                err = yt_res.get("error", "Unknown error")
                print(f"  ❌ YouTube FAILED: {err}")
                item_status["youtube_success"] = False
                item_status["youtube_error"] = err

            status_data[concept_id] = item_status
            save_status(status_data)

            print("⏳ Cooldown 15s before TikTok upload...")
            time.sleep(15)

        # -----------------------------------------------------------------
        # Upload to TikTok Studio
        # -----------------------------------------------------------------
        if item_status.get("tiktok_success"):
            print(f"⏩ TikTok: Already uploaded!")
        else:
            print(f"\n📤 [TikTok {i}/{total}] Uploading to TikTok Studio with hero cover...")
            tt_res = tiktok_uploader.upload_video(
                video_path=video_path,
                caption=caption,
                tags=tags,
                headless=True,
            )

            if tt_res.get("success"):
                print(f"  🎉 TikTok SUCCESS! {tt_res.get('message')}")
                item_status["tiktok_success"] = True
                item_status["tiktok_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            else:
                err = tt_res.get("error", "Unknown error")
                print(f"  ❌ TikTok FAILED: {err}")
                item_status["tiktok_success"] = False
                item_status["tiktok_error"] = err

            status_data[concept_id] = item_status
            save_status(status_data)

        # Safety cooldown before next video in batch
        if i < total:
            print("\n⏳ Cooldown 20s before proceeding to next video in batch...")
            time.sleep(20)

    # -----------------------------------------------------------------
    # Final Summary
    # -----------------------------------------------------------------
    print("\n" + "=" * 70)
    print("📊 COSMIC VAULT 2-PACK PART 2 COMPLETE — FINAL REPORT")
    print("=" * 70)
    for c in BATCH_CONCEPTS:
        cid = c["id"]
        st = status_data.get(cid, {})
        yt = "✅ Live" if st.get("youtube_success") else f"❌ {st.get('youtube_error', 'Pending')}"
        tt = "✅ Live" if st.get("tiktok_success") else f"❌ {st.get('tiktok_error', 'Pending')}"
        print(f"• {c['topic'][:45]}...")
        print(f"    YouTube: {yt}")
        print(f"    TikTok:  {tt}")
        if st.get("youtube_url"):
            print(f"    URL:     {st.get('youtube_url')}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
