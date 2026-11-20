#!/usr/bin/env python3
"""
The Cosmic Vault - 100% Autonomous YouTube Shorts Pipeline
Generates viral, psychological space mystery shorts with seamless infinite loops
and auto-publishes them directly to YouTube Shorts via Upload-Post.

Usage:
  uv run python autopilot.py --count 1    # Generate & publish 1 video right now
  uv run python autopilot.py --count 4    # Generate & publish a 4-video batch
"""

import argparse
import json
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from loguru import logger
from openai import OpenAI

from app.config import config
from app.models.schema import VideoParams
from app.services import task as tm
from app.services.tiktok_uploader import tiktok_uploader
from app.services.upload_post import upload_post_service
from app.services.youtube_uploader import youtube_uploader
from app.utils import utils

# Curated pool of high-retention, high-intrigue cosmic concepts
VIRAL_COSMIC_TOPICS = [
    "The Silurian Hypothesis: Did an advanced industrial civilization inhabit Earth millions of years before humans?",
    "The Boötes Void: The terrifying 330-million light-year empty space",
    "The Perseus Black Hole Sound: The horrific 57-octave acoustic wave echoing through the galaxy",
    "False Vacuum Decay: The cosmic bubble capable of erasing reality at the speed of light",
    "The Zoo Hypothesis: Are advanced extraterrestrial civilizations deliberately observing Earth in silence?",
    "The Fermi Paradox and the Great Filter: Why the universe is dead silent",
    "The Great Attractor: The mysterious mass pulling the Milky Way across the universe",
    "Strange Matter and Strangelets: The theoretical substance that could convert the universe",
    "The Dark Forest Theory: Why civilizations in the cosmos must stay silent to survive",
    "Rogue Planets: Frozen orphan worlds wandering alone through interstellar darkness",
    "The Cold Spot in the Cosmic Microwave Background: Is it a collision with a parallel universe?",
    "Magnetars: Dead stars with magnetic fields so powerful they dissolve atoms from thousands of miles away",
    "The Wow! Signal: The unrepeated transmission from deep space that was never explained",
    "The Kugelblitz: Creating a black hole made entirely out of concentrated light",
    "KIC 8462852 (Tabby's Star): The star that inexplicably dims by 22 percent",
]

SYSTEM_PROMPT = """
You are an elite, award-winning creative director for viral YouTube Shorts and TikTok channels specializing in high-adrenaline cosmic mysteries, psychological suspense, and existential dread.

You output STRICT JSON ONLY with the following exact keys:
{
  "subject": "Compelling Title for YouTube #shorts",
  "hook": "First 5-8 words that immediately create urgent curiosity and stop the scroll",
  "script": "Full spoken voiceover script with short, punchy, high-intensity sentences",
  "theme_mood": "Pick one exact mood: black_hole_dread, silent_void, alien_mystery, cosmic_cataclysm, or quantum_anomaly",
  "visual_terms": ["25 to 35 specific, cinematic search terms for Pexels footage"],
  "youtube_title": "Clickable Title for YouTube Shorts (under 80 chars) with #shorts",
  "youtube_description": "2-sentence curiosity description with #shorts #space #mystery tags",
  "youtube_tags": ["shorts", "space", "mystery", "universe", "science"]
}

CRITICAL SCRIPT & RETENTION RULES:
1. SCRIPT LENGTH: Exactly 155 to 175 words (at 1.25x speech rate, this generates 62 to 68 seconds of spoken audio). This is mandatory to meet the 60-second monetization requirement for TikTok Creator Rewards and YouTube Shorts!
2. FAST, PUNCHY RHYTHM: Short sentences ONLY (maximum 8 to 12 words per sentence). Eliminate all slow, academic grammar. Every single line must hit like a drumbeat.
3. SCROLL-STOPPING HOOK: The first 3 seconds must hit with an immediate pattern interrupt (e.g. "Everything you know about physics just collapsed.", "Astronomers detected an impossible signal that is speeding toward us."). Never use greetings or filler.
4. MICRO-TWISTS EVERY 15 SECONDS: Introduce escalating stakes, unsettling facts, and cosmic tension that constantly reignite curiosity.
5. SEAMLESS INFINITE LOOP (MANDATORY): The very last words of the script MUST be an incomplete phrase (such as 'Which is...', 'And that is...', 'Leading directly to...', 'Which explains...') that seamlessly and grammatically connects directly back into the opening hook sentence when the video loops!
6. DYNAMIC VISUALS: Provide 25 to 35 distinct, cinematic search terms changing every 2 seconds (e.g. 'deep space galaxy zoom in', 'satellite dish array night sky', 'black hole gravity lensing', 'silhouette looking at starry sky', 'glowing radioactive element', 'abstract digital data glitch', 'astronaut falling into dark void', 'earth atmosphere sunrise from orbit').
"""

# 17-Track Master Cosmic Audio Catalog categorized by narrative archetypes
BGM_ARCHETYPES = {
    "black_hole_dread": [
        "theme_black_hole_dread.mp3",
        "theme_cosmic_horror.mp3",
        "theme_dark_mystery.mp3",
    ],
    "alien_mystery": [
        "theme_alien_signal_mystery.mp3",
        "theme_the_visitors.mp3",
        "theme_destination_unknown.mp3",
    ],
    "quantum_anomaly": [
        "theme_quantum_anomaly.mp3",
        "theme_high_tension_pulse.mp3",
        "theme_dark_mystery.mp3",
    ],
    "cosmic_cataclysm": [
        "theme_cosmic_cataclysm.mp3",
        "theme_intense_suspense.mp3",
        "theme_hostile_cosmos.mp3",
    ],
    "deep_space_mystery": [
        "theme_deep_space_mystery.mp3",
        "theme_interstellar_voyage.mp3",
        "theme_view_from_earth.mp3",
    ],
    "silent_void": [
        "theme_silent_universe_void.mp3",
        "theme_antarctic_abyss.mp3",
        "theme_martian_solitude.mp3",
    ],
    "hostile_cosmos": [
        "theme_hostile_cosmos.mp3",
        "theme_dark_mystery.mp3",
        "theme_the_visitors.mp3",
    ],
    "planetary_mystery": [
        "theme_martian_solitude.mp3",
        "theme_antarctic_abyss.mp3",
        "theme_view_from_earth.mp3",
    ],
}

ALL_MASTERED_BGM = [
    "theme_deep_space_mystery.mp3",
    "theme_black_hole_dread.mp3",
    "theme_alien_signal_mystery.mp3",
    "theme_cosmic_cataclysm.mp3",
    "theme_silent_universe_void.mp3",
    "theme_quantum_anomaly.mp3",
    "theme_dark_mystery.mp3",
    "theme_martian_solitude.mp3",
    "theme_the_visitors.mp3",
    "theme_interstellar_voyage.mp3",
    "theme_antarctic_abyss.mp3",
    "theme_hostile_cosmos.mp3",
    "theme_cosmic_horror.mp3",
    "theme_high_tension_pulse.mp3",
    "theme_destination_unknown.mp3",
    "theme_view_from_earth.mp3",
    "theme_intense_suspense.mp3",
]

BGM_HISTORY_FILE = Path(__file__).resolve().parent / "storage" / "recent_bgm.json"


def load_bgm_history() -> list:
    try:
        if BGM_HISTORY_FILE.exists():
            with open(BGM_HISTORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def record_bgm_usage(song: str):
    try:
        history = load_bgm_history()
        history.append(song)
        history = history[-25:]
        BGM_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(BGM_HISTORY_FILE, "w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
    except Exception:
        pass


def select_bgm_for_story(topic: str, concept: dict) -> str:
    """
    Intelligently select a fresh, diverse background music track matching the narrative mood.
    Uses persistent history tracking to guarantee no music repeats across consecutive videos.
    """
    history = load_bgm_history()
    recent_tracks = set(history[-8:])

    text = f"{topic} {concept.get('subject', '')} {concept.get('hook', '')} {concept.get('script', '')}".lower()
    explicit_mood = str(concept.get("theme_mood", "")).lower().strip()

    # Determine best narrative archetype
    if explicit_mood in BGM_ARCHETYPES:
        archetype = explicit_mood
    elif any(k in text for k in ["black hole", "singularity", "event horizon", "crush", "swallow", "gravity monster", "kugelblitz"]):
        archetype = "black_hole_dread"
    elif any(k in text for k in ["signal", "wow!", "tabby", "megastructure", "dyson", "transmission", "alien", "seti"]):
        archetype = "alien_mystery"
    elif any(k in text for k in ["cold spot", "parallel universe", "multiverse", "dimension", "glitch", "quantum"]):
        archetype = "quantum_anomaly"
    elif any(k in text for k in ["rogue planet", "magnetar", "strangelet", "supernova", "asteroid", "destroy", "collision", "cataclysm"]):
        archetype = "cosmic_cataclysm"
    elif any(k in text for k in ["dark forest", "hostile", "hunter", "predator", "invasion", "unseen threat"]):
        archetype = "hostile_cosmos"
    elif any(k in text for k in ["mars", "moon", "surface", "rover", "planet", "martian", "dunes"]):
        archetype = "planetary_mystery"
    elif any(k in text for k in ["fermi", "great filter", "silent", "void", "boötes", "empty", "dead silent", "alone"]):
        archetype = "silent_void"
    else:
        archetype = "deep_space_mystery"

    candidates = BGM_ARCHETYPES.get(archetype, BGM_ARCHETYPES["deep_space_mystery"])
    fresh_candidates = [t for t in candidates if t not in recent_tracks]

    if fresh_candidates:
        chosen = fresh_candidates[0]
    else:
        # If all tracks in this archetype were used recently, rotate to another fresh cosmic track
        all_fresh = [t for t in ALL_MASTERED_BGM if t not in recent_tracks]
        if all_fresh:
            chosen = all_fresh[0]
        else:
            chosen = candidates[0]

    record_bgm_usage(chosen)
    logger.info(f"🎶 Fresh BGM selected: '{chosen}' (Archetype: {archetype}, History size: {len(history)})")
    return chosen


def generate_video_concept(topic: str) -> dict:
    """Generate script and visual terms using Groq LLM with rate-limit protection and fallback."""
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
        "qwen/qwen3.6-27b",
    ]
    # Deduplicate while preserving order
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
                max_tokens=900,
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return data
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Trying fallback model...")
            last_error = e
            time.sleep(5.0)

    raise RuntimeError(f"All Groq models failed for topic '{topic}': {last_error}")


def create_and_render_video(
    concept: dict,
    auto_upload: bool = True,
    upload_youtube: bool = True,
    upload_tiktok: bool = True,
) -> dict:
    """Run the video generation pipeline and publish to YouTube and/or TikTok."""
    task_id = utils.get_uuid()
    logger.info(f"Starting video production task: {task_id}")

    script_text = concept["script"].strip()
    visual_terms = concept.get("visual_terms", [])
    if isinstance(visual_terms, list):
        search_terms = ", ".join(visual_terms)
    else:
        search_terms = str(visual_terms)

    # Intelligently select thematic background music matching the story
    matched_bgm = select_bgm_for_story(concept.get("subject", ""), concept)
    logger.info(f"🎶 Auto-matched story BGM: '{matched_bgm}'")

    # Build params matching our proven viral configuration
    video_params = {
        "video_subject": concept.get("subject", "Cosmic Mystery"),
        "video_script": script_text,
        "video_terms": search_terms,
        "video_aspect": "9:16",
        "video_fit_mode": "cover",
        "video_concat_mode": "sequential",
        "video_clip_duration": 2,
        "match_materials_to_script": True,
        "video_source": "pexels",
        "video_language": "en-US",
        "voice_name": "en-US-AndrewMultilingualNeural",
        "voice_volume": 1.0,
        "voice_rate": 1.25,
        "bgm_type": "random",
        "bgm_file": matched_bgm,
        "bgm_volume": 0.32,
        "subtitle_enabled": True,
        "font_name": "MicrosoftYaHeiBold.ttc",
        "subtitle_position": "custom",
        "custom_position": 70.0,
        "text_fore_color": "#FFFFFF",
        "stroke_color": "#000000",
        "stroke_width": 2.0,
        "font_size": 60,
    }

    # Execute pipeline via MoneyPrinterTurbo task manager
    params_obj = VideoParams(**video_params)
    result = tm.start(
        task_id=task_id,
        params=params_obj,
        stop_at="video",
        allow_server_file_input=True,
    )

    if not result or result.get("state") == tm.const.TASK_STATE_FAILED:
        error_msg = result.get("error") if result else "Unknown rendering failure"
        logger.error(f"Task {task_id} failed: {error_msg}")
        return {"success": False, "task_id": task_id, "error": error_msg}

    final_videos = result.get("videos", [])
    if not final_videos or not os.path.exists(final_videos[0]):
        return {"success": False, "task_id": task_id, "error": "Output video file missing"}

    video_path = final_videos[0]
    logger.success(f"Video rendered successfully: {video_path}")

    video_title = concept.get("youtube_title", concept.get("subject", "Cosmic Mystery #shorts"))
    video_tags = concept.get("youtube_tags", ["shorts", "space", "mystery"])

    # 1. YouTube Shorts Upload
    youtube_result = None
    if auto_upload and upload_youtube:
        if youtube_uploader.is_configured():
            logger.info(f"Publishing to YouTube Shorts via direct browser session: '{video_title}'...")
            youtube_result = youtube_uploader.upload_video(
                video_path=video_path,
                title=video_title,
                description=concept.get("youtube_description", script_text[:200] + " #shorts #space"),
                tags=video_tags,
                headless=True,
            )
            logger.info(f"Direct YouTube Studio upload response: {youtube_result}")
        elif upload_post_service.is_configured():
            yt_desc = concept.get("youtube_description", script_text[:200] + " #shorts #space")
            logger.info(f"Publishing to YouTube Shorts via Upload-Post: '{video_title}'...")
            youtube_extra = {
                "youtube_title": video_title[:100],
                "youtube_description": yt_desc,
                "tags": video_tags,
                "privacyStatus": "public",
            }

            try:
                youtube_result = upload_post_service.upload_video(
                    video_path=video_path,
                    title=video_title,
                    platforms=["youtube"],
                    youtube_extra=youtube_extra,
                )
                logger.info(f"Upload-Post YouTube response: {youtube_result}")
            except Exception as e:
                logger.warning(f"Upload-Post YouTube upload failed: {e}. (Direct upload is available via youtube_login.py)")

    # 2. TikTok Upload via Free Playwright Uploader
    tiktok_result = None
    if auto_upload and upload_tiktok and tiktok_uploader.is_configured():
        logger.info(f"Publishing to TikTok via session uploader: '{video_title}'...")
        tiktok_result = tiktok_uploader.upload_video(
            video_path=video_path,
            caption=video_title,
            tags=video_tags,
            headless=True,
        )
        logger.info(f"TikTok upload response: {tiktok_result}")
    elif auto_upload and upload_tiktok and not tiktok_uploader.is_configured():
        logger.warning(
            "TikTok uploader not configured. Run `uv run python tiktok_login.py` once to enable TikTok auto-posting."
        )

    return {
        "success": True,
        "task_id": task_id,
        "video_path": video_path,
        "title": video_title,
        "youtube_result": youtube_result,
        "tiktok_result": tiktok_result,
    }


def main():
    parser = argparse.ArgumentParser(description="The Cosmic Vault - Autonomous Shorts Pipeline")
    parser.add_argument("--count", type=int, default=1, help="Number of videos to generate and publish")
    parser.add_argument("--topic", type=str, default="", help="Optional specific topic to generate")
    parser.add_argument("--no-upload", action="store_true", help="Generate video only without publishing")
    parser.add_argument("--no-youtube", action="store_true", help="Skip YouTube upload")
    parser.add_argument("--no-tiktok", action="store_true", help="Skip TikTok upload")
    args = parser.parse_args()

    auto_upload = not args.no_upload
    upload_youtube = not args.no_youtube
    upload_tiktok = not args.no_tiktok
    topics_to_run = []

    if args.topic:
        topics_to_run = [args.topic]
    else:
        sample_size = min(args.count, len(VIRAL_COSMIC_TOPICS))
        topics_to_run = VIRAL_COSMIC_TOPICS[:sample_size]

    logger.info(f"🚀 Launching Autopilot: {len(topics_to_run)} video(s) queued for production")
    results = []

    for idx, topic in enumerate(topics_to_run, 1):
        print(f"\n========================================================")
        print(f"🎬 Producing Video {idx}/{len(topics_to_run)}: {topic}")
        print(f"========================================================")

        try:
            concept = generate_video_concept(topic)
            print(f"Hook: {concept.get('hook')}")
            print(f"Loop Script Ending: {concept.get('script')[-40:]}")

            res = create_and_render_video(
                concept,
                auto_upload=auto_upload,
                upload_youtube=upload_youtube,
                upload_tiktok=upload_tiktok,
            )
            results.append(res)

            if res.get("success"):
                yt_res = res.get("youtube_result")
                if yt_res:
                    yt_url = yt_res.get("results", {}).get("youtube", {}).get("url")
                    if yt_url:
                        print(f"🌟 LIVE ON YOUTUBE: {yt_url}")
                tt_res = res.get("tiktok_result")
                if tt_res and tt_res.get("success"):
                    print(f"🌟 LIVE ON TIKTOK: {tt_res.get('message')}")
            if idx < len(topics_to_run):
                logger.info("Cooling down for 15 seconds before next video...")
                time.sleep(15)
        except Exception as e:
            logger.exception(f"Error producing video for topic '{topic}': {e}")
            results.append({"success": False, "topic": topic, "error": str(e)})

    # Summary
    print("\n" + "=" * 60)
    print("📊 AUTOPILOT RUN SUMMARY")
    print("=" * 60)
    for r in results:
        status = "✅ SUCCESS" if r.get("success") else "❌ FAILED"
        title = r.get("title") or r.get("topic") or "Untitled"
        print(f"{status} - {title}")
        if r.get("youtube_result"):
            yt = r["youtube_result"].get("results", {}).get("youtube", {})
            if yt.get("url"):
                print(f"   YouTube URL: {yt.get('url')}")
        if r.get("tiktok_result"):
            tt = r["tiktok_result"]
            tt_status = "Posted" if tt.get("success") else f"Failed ({tt.get('error')})"
            print(f"   TikTok Status: {tt_status}")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
