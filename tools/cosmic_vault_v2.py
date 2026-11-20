#!/usr/bin/env python3
"""
Cosmic Vault V2 — High-Retention Shorts Pipeline
==================================================
Major upgrades over the previous batch scripts:

1. GEMINI 3.8 FLASH for script writing (replaces Groq which was bad at storytelling)
   - Falls back to Groq if Gemini hits rate limits
2. NASA VIDEO LIBRARY as primary footage source (free, public domain, no API key)
   - Real space/science footage instead of generic Pexels/Pixabay stock
   - Falls back to Pexels when NASA has no results for non-space topics
3. EXPANDED CONTENT NICHES — not just space anymore:
   - Unexplained mysteries (ocean, earth, disappearances)
   - Dark psychology & human behavior
   - Bizarre history
   - Science edge cases
4. COMMENT-FORCING endings instead of abrupt loop connectors
5. PATTERN-INTERRUPT hooks (paradoxical statements, not dates/names)

Usage:
    .venv/bin/python tools/cosmic_vault_v2.py                    # produce + upload all
    .venv/bin/python tools/cosmic_vault_v2.py --dry-run          # generate scripts only, don't render
    .venv/bin/python tools/cosmic_vault_v2.py --skip-upload      # render but don't upload
    .venv/bin/python tools/cosmic_vault_v2.py --topic "custom topic here"  # one-off custom topic
"""

import asyncio
import json
import math
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
import urllib.parse
from pathlib import Path
from typing import List, Tuple, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from loguru import logger

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

STATUS_FILE = PROJECT_ROOT / "storage" / "cosmic_v2_status.json"
NASA_CACHE_DIR = PROJECT_ROOT / "storage" / "cache_nasa_videos"

# ---------------------------------------------------------------------------
# CONTENT TOPICS — Expanded beyond space into high-retention niches
# Each topic has a niche tag so visual sourcing knows whether to use NASA or Pexels
# ---------------------------------------------------------------------------

BATCH_TOPICS = [
    {
        "id": "v2_bermuda_triangle",
        "niche": "ocean_mystery",
        "topic": "The Bermuda Triangle: over 75 aircraft and hundreds of ships have vanished in a patch of ocean between Miami and Puerto Rico. Some were found with no crew aboard. No distress calls. The US Navy lost an entire squadron of five bombers in 1945 — Flight 19 — and the rescue plane sent after them also disappeared.",
        "video_source": "pexels",  # fallback for non-space
        "nasa_queries": ["ocean satellite view", "hurricane atlantic", "earth ocean night"],
    },
    {
        "id": "v2_zone_of_silence",
        "niche": "earth_mystery",
        "topic": "The Zone of Silence in Mexico: a patch of desert where radio signals die. Compasses spin. Meteorites fall there at an abnormally high rate. It sits on the same latitude as the Bermuda Triangle and the Egyptian pyramids. The Mexican government built a research station there but never published findings.",
        "video_source": "pexels",
        "nasa_queries": ["desert satellite earth", "meteor impact", "earth magnetic field visualization"],
    },
    {
        "id": "v2_ocean_bloop",
        "niche": "ocean_mystery",
        "topic": "The Bloop: in 1997 NOAA underwater microphones detected an ultra-low frequency sound so powerful it was picked up by sensors 5000 kilometers apart. It did not match any known geological or biological source. It came from the deep South Pacific near Point Nemo — the most remote spot on Earth — the farthest point from any human civilization.",
        "video_source": "pexels",
        "nasa_queries": ["deep ocean underwater", "earth pacific ocean satellite", "underwater volcanic activity"],
    },
    {
        "id": "v2_kola_borehole",
        "niche": "earth_mystery",
        "topic": "The Kola Superdeep Borehole: Soviet scientists spent twenty years drilling twelve kilometers into the Earth crust. At twelve thousand meters the drill bits began melting at three hundred degrees. Then they lowered microphones into the abyss and recorded sounds that terrified the research team. Screaming echoes coming from inside the rock. The project was abruptly abandoned in 1992 and the hole was welded shut with a steel cap that remains locked today.",
        "video_source": "pexels",
        "nasa_queries": ["earth interior crust", "siberia satellite arctic", "volcanic magma heat"],
    },
    {
        "id": "v2_silurian_hypothesis",
        "niche": "science_mystery",
        "topic": "The Silurian Hypothesis: in 2018 NASA scientists asked a terrifying question. If an advanced industrial civilization existed on Earth fifty million years before humans would we even know? In just a few million years all of our concrete skyscrapers plastics and satellites will be ground into a paper-thin layer of rock only centimeters thick. Are we really the first intelligent civilization on this planet or just the latest?",
        "video_source": "pexels",
        "nasa_queries": ["earth history ancient", "planet earth evolution satellite", "meteor crater impact"],
    },
    {
        "id": "v2_lake_vostok",
        "niche": "earth_mystery",
        "topic": "Lake Vostok: sealed beneath four kilometers of Antarctic ice sheet lies a giant liquid lake untouched for fifteen million years. In 2001 satellite radar detected a massive magnetic anomaly at the bottom of the dark lake over one hundred kilometers long. When drillers finally broke through the ice they discovered living organisms with DNA that matches nothing known in any biological database on Earth.",
        "video_source": "pexels",
        "nasa_queries": ["antarctica ice satellite", "glacier ice shelf", "earth magnetic field space"],
    },
]

# ---------------------------------------------------------------------------
# GEMINI SCRIPT WRITER — dramatically better storytelling than Groq
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the best short-form video scriptwriter on the internet. You write scripts that make people physically unable to swipe away. Your scripts feel like someone whispering a terrifying secret to a friend at 2am.

You output STRICT JSON ONLY with these exact keys:
{
  "subject": "Compelling clickable title",
  "hook": "First 5-8 words — the scroll-stopping opening",
  "script": "Full 130-150 word voiceover script",
  "sentences": ["Each sentence of the script as a separate array entry IN ORDER"],
  "visual_terms": ["One specific stock-footage/NASA search term per sentence IN MATCHING ORDER"],
  "youtube_title": "Title under 70 chars ending with #shorts",
  "youtube_description": "2-sentence mystery hook with hashtags",
  "youtube_tags": ["shorts", "mystery", "unexplained", "viral", "fyp"],
  "tiktok_caption": "Hook question + hashtags under 150 chars",
  "comment_prompt": "A specific question to end the video that forces viewers to comment"
}

ABSOLUTE RULES FOR THE SCRIPT:
1. LENGTH: Exactly 130-150 words. Count them. Not 100. Not 200. Between 130 and 150.
2. ZERO COMMAS. None. Not one. Every clause gets its own sentence ending in a period. This is a technical requirement — commas break the subtitle system.
3. HOOK (first 3 seconds): A paradoxical or shocking statement. NEVER start with a year or a name. Start with what makes this terrifying or impossible.
   BAD: "In 1997 NOAA detected a sound." 
   GOOD: "Something screamed from the bottom of the ocean. And it was louder than anything alive."
4. STORYTELLING not lecturing. You are telling a scary story to a friend. Use "you" and "imagine". Make them feel it.
   BAD: "Scientists discovered that the signal originated from..."
   GOOD: "You're listening to the recording right now. That low rumble? Nobody knows what made it."
5. ESCALATION: Every 3-4 sentences must introduce something stranger or scarier than the last thing you said.
6. ENDING: End with a direct question that FORCES viewers to comment. Not a vague "Which is why..." but a real question:
   "So what do YOU think is down there?" or "Would you have opened that door?"
7. VISUAL_TERMS must be real searchable queries that would return actual footage on Pexels/Pixabay/NASA. One per sentence. Same count as sentences array.
8. Write numbers as words (not digits).
9. Vary sentence length: mix 4-7 word punches with 15-20 word flowing descriptive sentences. Never all short. Never all long.
"""


def generate_script_gemini(topic: str, retries: int = 3) -> Optional[dict]:
    """Generate a viral script using Gemini 3.8 Flash."""
    try:
        import google.generativeai as genai
    except ImportError:
        logger.warning("google-generativeai not installed, skipping Gemini")
        return None

    api_key = config.app.get("gemini_api_key", "")
    if not api_key:
        logger.warning("No gemini_api_key in config.toml")
        return None

    genai.configure(api_key=api_key)

    # Try models in order of capability and quota availability
    models_to_try = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-pro"]

    for model_name in models_to_try:
        for attempt in range(retries):
            try:
                logger.info(f"[Gemini {model_name}] Generating script (attempt {attempt+1}/{retries})...")
                model = genai.GenerativeModel(model_name)
                resp = model.generate_content(
                    f"{SYSTEM_PROMPT.strip()}\n\nTopic: {topic}",
                    generation_config=genai.GenerationConfig(
                        temperature=0.8,
                        max_output_tokens=8192,
                        response_mime_type="application/json",
                    ),
                )
                text = resp.text.strip()

                # Strip markdown fences if present
                if text.startswith("```"):
                    text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

                data = json.loads(text)

                # Validate required fields
                if not data.get("script") or not data.get("sentences"):
                    logger.warning(f"Missing required fields, retrying...")
                    continue

                # Sanitize commas from script
                data["script"] = sanitize_script(data["script"])
                data["sentences"] = [sanitize_script(s) for s in data["sentences"]]

                word_count = len(data["script"].split())
                logger.success(f"[Gemini {model_name}] Script generated: {word_count} words, {len(data['sentences'])} sentences")
                return data

            except Exception as e:
                err_str = str(e)
                logger.warning(f"[Gemini {model_name}] Attempt {attempt+1} failed: {err_str[:120]}")
                if "429" in err_str or "quota" in err_str.lower():
                    # Move to next model immediately on quota error
                    break
                time.sleep(2 * (attempt + 1))  # backoff

    return None


def generate_script_groq(topic: str) -> Optional[dict]:
    """Fallback: generate script using Groq (lower quality but reliable)."""
    from openai import OpenAI

    api_key = config.app.get("groq_api_key")
    if not api_key:
        return None

    client = OpenAI(base_url="https://api.groq.com/openai/v1", api_key=api_key)

    models = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
    for model_name in models:
        try:
            logger.info(f"[Groq {model_name}] Generating script (fallback)...")
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
            data = json.loads(response.choices[0].message.content)
            if data.get("script"):
                data["script"] = sanitize_script(data["script"])
                if "sentences" in data:
                    data["sentences"] = [sanitize_script(s) for s in data["sentences"]]
                return data
        except Exception as e:
            logger.warning(f"[Groq {model_name}] Failed: {e}")
            time.sleep(3)

    return None


def generate_script(topic: str) -> dict:
    """Generate script — Gemini first, Groq fallback."""
    result = generate_script_gemini(topic)
    if result:
        return result

    logger.warning("Gemini failed, falling back to Groq...")
    result = generate_script_groq(topic)
    if result:
        return result

    raise RuntimeError(f"All script generators failed for topic: {topic[:50]}...")


# ---------------------------------------------------------------------------
# NASA VIDEO LIBRARY — free public domain footage
# ---------------------------------------------------------------------------

def search_nasa_videos(query: str, max_results: int = 8) -> List[dict]:
    """Search NASA Image and Video Library for downloadable video clips.
    
    Returns list of dicts with keys: nasa_id, title, preview_url, download_url
    No API key required — completely public.
    """
    encoded_q = urllib.parse.quote(query)
    url = f"https://images-api.nasa.gov/search?q={encoded_q}&media_type=video&page_size={max_results}"

    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.loads(resp.read().decode())
    except Exception as e:
        logger.warning(f"NASA API search failed for '{query}': {e}")
        return []

    results = []
    items = data.get("collection", {}).get("items", [])
    for item in items:
        item_data = item.get("data", [{}])[0]
        nasa_id = item_data.get("nasa_id", "")
        title = item_data.get("title", "")
        
        # Skip talking heads, briefings, tutorials, split comparisons
        title_lower = title.lower()
        if any(bad in title_lower for bad in [
            "tutorial", "briefing", "interview", "press", "panel",
            "conference", "how to", "webinar", "comparison", "graphic", "logo"
        ]):
            continue

        # Get preview thumbnail
        links = item.get("links", [])
        preview = links[0].get("href", "") if links else ""

        results.append({
            "nasa_id": nasa_id,
            "title": title,
            "preview_url": preview,
        })

    return results


def download_nasa_video(nasa_id: str, output_dir: str, prefer_size: str = "medium") -> Optional[str]:
    """Download a NASA video clip by its ID.
    
    prefer_size: 'orig', 'large', 'medium', 'mobile', 'small'
    Returns path to downloaded .mp4 or None.
    """
    asset_url = f"https://images-api.nasa.gov/asset/{urllib.parse.quote(nasa_id)}"
    
    try:
        with urllib.request.urlopen(asset_url, timeout=15) as resp:
            asset_data = json.loads(resp.read().decode())
    except Exception as e:
        logger.warning(f"NASA asset lookup failed for '{nasa_id}': {e}")
        return None

    # Find .mp4 links, prefer requested size
    mp4_links = []
    items = asset_data.get("collection", {}).get("items", [])
    for item in items:
        href = item.get("href", "")
        if href.endswith(".mp4"):
            mp4_links.append(href)

    if not mp4_links:
        return None

    # Pick the preferred size - prefer small/mobile/medium to avoid huge 500MB downloads
    chosen = None
    for pref in ["small", "mobile", "medium", "large", "orig"]:
        for link in mp4_links:
            if f"~{pref}" in link:
                chosen = link
                break
        if chosen:
            break
    if not chosen:
        chosen = mp4_links[0]

    # Download
    out_path = os.path.join(output_dir, f"nasa_{nasa_id.replace('/', '_')}.mp4")
    if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
        return out_path

    try:
        # Properly encode URL to handle spaces and special characters
        encoded_url = urllib.parse.quote(chosen, safe=":/%?=&~")
        logger.info(f"Downloading NASA video: {encoded_url}")
        urllib.request.urlretrieve(encoded_url, out_path)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
            logger.success(f"NASA clip downloaded: {out_path} ({os.path.getsize(out_path)//1024}KB)")
            return out_path
    except Exception as e:
        logger.warning(f"NASA download failed: {e}")

    return None


def fetch_nasa_clips_for_topic(
    visual_terms: List[str],
    nasa_queries: List[str],
    output_dir: str,
    max_clips: int = 8,
) -> List[str]:
    """Fetch NASA video clips matching visual terms. Returns list of local file paths."""
    os.makedirs(output_dir, exist_ok=True)
    clips = []
    seen_ids = set()

    # Combine NASA-specific queries with visual terms
    all_queries = list(nasa_queries) + visual_terms[:6]
    
    for query in all_queries:
        if len(clips) >= max_clips:
            break

        results = search_nasa_videos(query, max_results=3)
        for result in results:
            if len(clips) >= max_clips:
                break
            nasa_id = result["nasa_id"]
            if nasa_id in seen_ids:
                continue
            seen_ids.add(nasa_id)

            path = download_nasa_video(nasa_id, output_dir, prefer_size="medium")
            if path:
                clips.append(path)

    logger.info(f"Fetched {len(clips)} NASA clips for this topic")
    return clips


# ---------------------------------------------------------------------------
# UTILITY FUNCTIONS (carried over from existing pipeline)
# ---------------------------------------------------------------------------

def sanitize_script(script_text: str) -> str:
    """Remove commas to guarantee Edge-TTS subtitle sync."""
    sanitized = script_text.replace(",", "")
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    return sanitized


def split_srt_into_short_cues(srt_content: str, max_words_per_cue: int = 3) -> str:
    """Split long SRT sentences into punchy 2-3 word subtitle cues."""
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
    """Convert a vertical image into a 1080x1920 MP4 clip via FFmpeg."""
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
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(output_mp4) and os.path.getsize(output_mp4) > 10000
    except Exception as e:
        logger.error(f"FFmpeg hero clip conversion failed: {e}")
        return False


def convert_nasa_to_vertical(input_mp4: str, output_mp4: str, max_duration: float = 3.0) -> bool:
    """Convert a horizontal NASA clip to vertical 1080x1920 (crop center, limit duration)."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", "00:00:01",
        "-t", str(max_duration),
        "-i", input_mp4,
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", "30",
        "-crf", "20",
        "-preset", "ultrafast",
        "-an",  # strip audio from NASA clips
        output_mp4,
    ]
    try:
        subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return os.path.exists(output_mp4) and os.path.getsize(output_mp4) > 5000
    except Exception as e:
        logger.warning(f"NASA vertical conversion failed for {input_mp4}: {e}")
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
    except Exception:
        return 60.0


def generate_hero_thumbnail(concept: dict, output_path: str) -> bool:
    """Generate a hero thumbnail cover using Pollinations AI."""
    title = concept.get("subject", "Unexplained Mystery")
    prompt = (
        f"{title}. Cinematic dramatic vertical hero cover art. "
        f"Dark atmospheric moody lighting. 9:16 composition. "
        f"Hyper detailed. No text. No watermark. No letters."
    )
    try:
        ok = pollinations_service.generate_image(
            prompt=prompt, output_path=output_path, width=1080, height=1920
        )
        return ok and os.path.exists(output_path)
    except Exception as e:
        logger.warning(f"Hero thumbnail generation failed: {e}")
        return False


# ---------------------------------------------------------------------------
# MAIN PRODUCTION PIPELINE
# ---------------------------------------------------------------------------

def produce_video(item: dict, existing_concept: dict = None) -> Tuple[str, dict]:
    """Produce one complete Cosmic Vault V2 video."""
    topic = item["topic"]
    video_source = item.get("video_source", "pexels")
    nasa_queries = item.get("nasa_queries", [])
    niche = item.get("niche", "space")

    logger.info(f"\n{'='*70}\nPRODUCING: {topic[:60]}...\n{'='*70}")

    # 1. GENERATE SCRIPT (Gemini first, Groq fallback)
    if existing_concept and existing_concept.get("script"):
        concept = existing_concept
        logger.info(f"Reusing existing concept: '{concept.get('subject')}'")
    else:
        concept = generate_script(topic)

    script_text = concept.get("script", "").strip()
    visual_terms = concept.get("visual_terms", [])
    sentences = concept.get("sentences", [])

    logger.info(f"Subject: {concept.get('subject')}")
    logger.info(f"Hook: {concept.get('hook')}")
    logger.info(f"Script: {len(script_text.split())} words, {len(sentences)} sentences")

    # 2. CREATE TASK
    task_id = utils.get_uuid()
    task_dir = utils.task_dir(task_id)

    # 3. FETCH NASA CLIPS (for space/science niches)
    nasa_clips = []
    vertical_nasa_clips = []
    if nasa_queries or niche in ("space", "ocean_mystery", "earth_mystery"):
        nasa_cache = str(NASA_CACHE_DIR / item["id"])
        nasa_clips = fetch_nasa_clips_for_topic(
            visual_terms=visual_terms,
            nasa_queries=nasa_queries,
            output_dir=nasa_cache,
            max_clips=6,
        )
        # Convert NASA clips to vertical format
        for idx, clip in enumerate(nasa_clips):
            vert_path = os.path.join(task_dir, f"nasa_vert_{idx:02d}.mp4")
            if convert_nasa_to_vertical(clip, vert_path, max_duration=3.0):
                vertical_nasa_clips.append(vert_path)

    logger.info(f"NASA clips available: {len(vertical_nasa_clips)}")

    # 4. ALSO FETCH PEXELS/PIXABAY as supplement
    terms_str = ", ".join(visual_terms) if isinstance(visual_terms, list) else str(visual_terms)

    params = VideoParams(
        video_subject=concept.get("subject", "Unexplained Mystery"),
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
        bgm_volume=0.22,
        subtitle_enabled=True,
        font_name="MicrosoftYaHeiBold.ttc",
        subtitle_position="custom",
        custom_position=78.0,
        font_size=56,
        text_fore_color="#FFF200",
        stroke_color="#000000",
        stroke_width=2.8,
        n_threads=4,
    )

    # Blank pollinations key during materials to prevent auto-generated zoompan clips
    orig_pol_key = config.app.get("pollinations_api_key", "")
    config.app["pollinations_api_key"] = ""
    try:
        logger.info(f"Running materials stage (task {task_id})...")
        mat_result = tm.start(
            task_id=task_id,
            params=params,
            stop_at="materials",
            allow_server_file_input=True,
        )
        stock_clips = mat_result.get("materials", []) if mat_result else []
    finally:
        config.app["pollinations_api_key"] = orig_pol_key

    audio_file = os.path.join(task_dir, "audio.mp3")
    subtitle_file = os.path.join(task_dir, "subtitle.srt")

    if not os.path.exists(audio_file) or not os.path.exists(subtitle_file):
        raise RuntimeError(f"Audio or subtitle missing in {task_dir}")

    audio_duration = get_audio_duration_seconds(audio_file)
    logger.info(f"Audio duration: {audio_duration:.2f}s")

    # 5. TRANSFORM SUBTITLES to punchy 2-3 word cues
    with open(subtitle_file, "r", encoding="utf-8") as f:
        raw_srt = f.read()
    short_srt = split_srt_into_short_cues(raw_srt, max_words_per_cue=3)
    with open(subtitle_file, "w", encoding="utf-8") as f:
        f.write(short_srt)
    logger.success("Subtitles transformed to 2-3 word cues")

    # 6. GENERATE HERO THUMBNAIL
    hero_img = os.path.join(task_dir, "hero_thumb.jpg")
    hero_clip = os.path.join(task_dir, "000_hero_thumb.mp4")
    if generate_hero_thumbnail(concept, hero_img):
        convert_image_to_hero_clip(hero_img, hero_clip, duration=2.5)
    else:
        logger.warning("Hero thumbnail failed — will start with footage directly")
        hero_clip = None

    # 7. ASSEMBLE MATERIALS — NASA clips first (real footage), then stock fills gaps
    ordered_materials = []
    if hero_clip and os.path.exists(hero_clip):
        ordered_materials.append(hero_clip)

    # Interleave NASA and stock clips
    stock_clips_clean = [v for v in stock_clips if os.path.exists(v)]
    if vertical_nasa_clips and stock_clips_clean:
        # Alternate: NASA, stock, NASA, stock...
        ni, si = 0, 0
        while ni < len(vertical_nasa_clips) or si < len(stock_clips_clean):
            if ni < len(vertical_nasa_clips):
                ordered_materials.append(vertical_nasa_clips[ni])
                ni += 1
            if si < len(stock_clips_clean):
                ordered_materials.append(stock_clips_clean[si])
                si += 1
    elif vertical_nasa_clips:
        ordered_materials.extend(vertical_nasa_clips)
    else:
        ordered_materials.extend(stock_clips_clean)

    logger.info(
        f"Total materials: {len(ordered_materials)} clips "
        f"({1 if hero_clip else 0} hero + {len(vertical_nasa_clips)} NASA + {len(stock_clips_clean)} stock)"
    )

    # 8. RENDER FINAL VIDEO
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
    out_dir = PROJECT_ROOT / "storage" / "rendered_v2"
    out_dir.mkdir(parents=True, exist_ok=True)
    saved_copy = str(out_dir / f"{item['id']}.mp4")
    shutil.copy2(final_mp4, saved_copy)
    size_mb = os.path.getsize(saved_copy) / (1024 * 1024)
    logger.success(f"🎉 VIDEO READY: {saved_copy} ({size_mb:.2f} MB, {audio_duration:.1f}s)")

    return saved_copy, concept


def upload_video(video_path: str, concept: dict, item: dict, status: dict) -> dict:
    """Upload to both YouTube Shorts and TikTok."""
    title = concept.get("youtube_title", f"{concept.get('subject', 'Mystery')} #shorts")
    if "#shorts" not in title.lower():
        title = f"{title} #shorts"

    # YouTube description with hashtags
    yt_desc = concept.get("youtube_description", concept.get("hook", ""))
    comment_q = concept.get("comment_prompt", "What do you think?")
    yt_hashtags = "#shorts #mystery #unexplained #viral #fyp #trending #mindblowing"
    yt_desc = f"{yt_desc}\n\n{comment_q}\n\n{yt_hashtags}"

    tags = ["shorts", "mystery", "unexplained", "viral", "fyp", "trending", "mindblowing"]

    # TikTok caption
    tt_caption = concept.get("tiktok_caption", f"{title} {comment_q}")
    if len(tt_caption) > 150:
        tt_caption = tt_caption[:145] + " #fyp"

    # 1. YouTube
    if not status.get("youtube_success"):
        logger.info(f"📤 Uploading to YouTube: {title}")
        yt_res = youtube_uploader.upload_video(
            video_path=video_path, title=title, description=yt_desc,
            tags=tags, headless=True,
        )
        if yt_res.get("success"):
            status["youtube_success"] = True
            status["youtube_url"] = yt_res.get("url", "")
            status["youtube_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            logger.success(f"✅ YouTube: {status['youtube_url']}")
        else:
            status["youtube_success"] = False
            status["youtube_error"] = yt_res.get("error", "Unknown")
            logger.error(f"❌ YouTube failed: {status['youtube_error']}")
        time.sleep(15)

    # 2. TikTok
    if not status.get("tiktok_success"):
        logger.info(f"📤 Uploading to TikTok...")
        tt_res = tiktok_uploader.upload_video(
            video_path=video_path, caption=tt_caption, tags=tags, headless=True,
        )
        if tt_res.get("success"):
            status["tiktok_success"] = True
            status["tiktok_time"] = time.strftime("%Y-%m-%d %H:%M:%S")
            logger.success("✅ TikTok uploaded!")
        else:
            status["tiktok_success"] = False
            status["tiktok_error"] = tt_res.get("error", "Unknown")
            logger.error(f"❌ TikTok failed: {status['tiktok_error']}")

    return status


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def load_status() -> dict:
    if STATUS_FILE.exists():
        try:
            return json.load(open(STATUS_FILE, "r"))
        except Exception:
            pass
    return {}


def save_status(data: dict):
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Cosmic Vault V2 Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Generate scripts only, don't render")
    parser.add_argument("--skip-upload", action="store_true", help="Render but don't upload")
    parser.add_argument("--topic", type=str, help="Custom one-off topic")
    parser.add_argument("--id", type=str, help="Run only specific topic ID (e.g. v2_bermuda_triangle)")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of videos to process")
    args = parser.parse_args()

    print("=" * 70)
    print("🚀 COSMIC VAULT V2 — HIGH-RETENTION MYSTERY SHORTS")
    print("   Gemini 3.8 Flash + NASA Footage + Expanded Niches")
    print("=" * 70)

    # Build topic list
    if args.topic:
        topics = [{
            "id": f"custom_{int(time.time())}",
            "niche": "custom",
            "topic": args.topic,
            "video_source": "pexels",
            "nasa_queries": [],
        }]
    else:
        topics = BATCH_TOPICS
        if args.id:
            topics = [t for t in topics if t["id"] == args.id]
        if args.limit > 0:
            topics = topics[:args.limit]

    # Check uploader readiness
    if not args.dry_run and not args.skip_upload:
        yt_ok = youtube_uploader.is_configured()
        tt_ok = tiktok_uploader.is_configured()
        print(f"YouTube: {'✅' if yt_ok else '❌'}  |  TikTok: {'✅' if tt_ok else '❌'}")
        if not yt_ok or not tt_ok:
            print("⚠️  Upload sessions not ready. Use --skip-upload to render only.")

    status_data = load_status()

    for i, item in enumerate(topics, 1):
        cid = item["id"]
        item_status = status_data.get(cid, {})

        print(f"\n{'='*70}")
        print(f"🎬 [{i}/{len(topics)}] {item['topic'][:55]}...")
        print(f"   Niche: {item.get('niche', 'general')} | Source: {item.get('video_source', 'pexels')}")
        print(f"{'='*70}")

        # Skip if already fully done
        if item_status.get("youtube_success") and item_status.get("tiktok_success"):
            print("⏩ Already uploaded to both platforms. Skipping.")
            continue

        # Generate script
        if not item_status.get("concept"):
            concept = generate_script(item["topic"])
            item_status["concept"] = concept
            status_data[cid] = item_status
            save_status(status_data)
            print(f"\n📝 SCRIPT PREVIEW:")
            print(f"   Title: {concept.get('subject')}")
            print(f"   Hook: {concept.get('hook')}")
            print(f"   Words: {len(concept.get('script', '').split())}")
            print(f"   Comment prompt: {concept.get('comment_prompt', 'N/A')}")
            print(f"\n   Script:\n   {concept.get('script', '')[:200]}...")
        else:
            concept = item_status["concept"]
            print(f"   Reusing existing script: {concept.get('subject')}")

        if args.dry_run:
            print("   [DRY RUN] Skipping render.")
            continue

        # Produce video
        video_path = item_status.get("video_path")
        if not video_path or not os.path.exists(video_path):
            try:
                video_path, concept = produce_video(item, existing_concept=concept)
                item_status["video_path"] = video_path
                item_status["concept"] = concept
                item_status["rendered_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
                status_data[cid] = item_status
                save_status(status_data)
            except Exception as e:
                logger.exception(f"Production failed: {e}")
                item_status["error"] = str(e)
                status_data[cid] = item_status
                save_status(status_data)
                continue
        else:
            print(f"   ✅ Using existing video: {video_path}")

        # Upload
        if not args.skip_upload:
            item_status = upload_video(video_path, concept, item, item_status)
            status_data[cid] = item_status
            save_status(status_data)

            if i < len(topics):
                print("\n⏳ Cooldown 20s before next video...")
                time.sleep(20)

    # Cleanup
    print("\n🧹 Cleaning up task folders...")
    try:
        tasks_dir = PROJECT_ROOT / "storage" / "tasks"
        if tasks_dir.exists():
            for t in tasks_dir.iterdir():
                if t.is_dir():
                    shutil.rmtree(t, ignore_errors=True)
        print("✅ Cleanup done.")
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")

    # Summary
    print(f"\n{'='*70}")
    print("📊 COSMIC VAULT V2 — BATCH SUMMARY")
    print(f"{'='*70}")
    for item in topics:
        cid = item["id"]
        st = status_data.get(cid, {})
        concept = st.get("concept", {})
        yt = "✅" if st.get("youtube_success") else "❌"
        tt = "✅" if st.get("tiktok_success") else "❌"
        print(f"  {yt} YT  {tt} TT  | {concept.get('subject', item['topic'][:50])}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    main()
