#!/usr/bin/env python3
"""
The Cosmic Vault - Upload 5 Master Videos to YouTube Shorts and TikTok.
Uploads 5 rendered videos sequentially with cooldown periods and records results.
"""

import json
import os
import sys
import time
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from loguru import logger
from app.services.youtube_uploader import youtube_uploader
from app.services.tiktok_uploader import tiktok_uploader

STATUS_FILE = PROJECT_ROOT / "storage" / "upload_cosmic_5_status.json"

VIDEOS = [
    {
        "task_id": "edc34c2d-d514-496e-ab92-e4204335fc18",
        "video_path": "storage/tasks/edc34c2d-d514-496e-ab92-e4204335fc18/final-1.mp4",
        "title": "The Alien Ghost in Our Rocks #shorts",
        "caption": "The Alien Ghost in Our Rocks: Did an advanced industrial civilization inhabit Earth millions of years before humans? #shorts #space #silurianhypothesis #mystery",
        "description": "Geologists found an anomaly ten million years old in deep rock cores. Did an advanced industrial civilization inhabit Earth millions of years before humans?\n\n#shorts #space #mystery #silurianhypothesis #universe #science #cosmicvault",
        "tags": ["shorts", "space", "mystery", "silurianhypothesis", "universe", "science"],
    },
    {
        "task_id": "3daa8684-6e1f-4cc5-babe-ec92e2d8b493",
        "video_path": "storage/tasks/3daa8684-6e1f-4cc5-babe-ec92e2d8b493/final-1.mp4",
        "title": "The 330 Million Light-Year Void of Nothing #shorts",
        "caption": "The 330 Million Light-Year Void of Nothing: Why standard physics cannot explain the Boötes Void #shorts #space #boötesvoid #mystery",
        "description": "The Boötes Void is 330 million light-years of pure darkness. Standard physics cannot explain why this gigantic hole in the cosmos exists.\n\n#shorts #space #boötesvoid #mystery #universe #cosmology #cosmicvault",
        "tags": ["shorts", "space", "mystery", "boötesvoid", "universe", "astronomy"],
    },
    {
        "task_id": "aa42456d-b443-4463-bc6d-85520f036ff0",
        "video_path": "storage/tasks/aa42456d-b443-4463-bc6d-85520f036ff0/final-1.mp4",
        "title": "The Black Hole Sound That Broke Physics #shorts",
        "caption": "The Black Hole Sound That Broke Physics: A 57-octave infrasound wave shaking the Perseus galaxy #shorts #space #blackhole #mystery",
        "description": "A supermassive black hole in the Perseus cluster is emitting a 57-octave acoustic frequency. A cosmic sound wave that bends spacetime.\n\n#shorts #space #blackhole #mystery #universe #science #cosmicvault",
        "tags": ["shorts", "space", "mystery", "blackhole", "universe", "science"],
    },
    {
        "task_id": "bd5dae59-6221-4764-818a-e1e91c7e25dc",
        "video_path": "storage/tasks/bd5dae59-6221-4764-818a-e1e91c7e25dc/final-1.mp4",
        "title": "Reality Is A Lying Bubble #shorts",
        "caption": "Reality Is A Lying Bubble: False Vacuum Decay could erase physics at lightspeed #shorts #space #physics #mystery",
        "description": "False Vacuum Decay: our entire universe could be sitting inside a temporary metastable bubble. One quantum fluctuation could rewrite physics at lightspeed.\n\n#shorts #space #physics #mystery #universe #science #cosmicvault",
        "tags": ["shorts", "space", "physics", "mystery", "universe", "science"],
    },
    {
        "task_id": "f4c43b9c-0487-431e-99cf-2283adca718a",
        "video_path": "storage/tasks/f4c43b9c-0487-431e-99cf-2283adca718a/final-1.mp4",
        "title": "The Silent Watchers: Why The Cosmos Is Quiet #shorts",
        "caption": "The Silent Watchers: The Zoo Hypothesis and why advanced extraterrestrials refuse to contact us #shorts #space #alien #mystery",
        "description": "The Zoo Hypothesis suggests super-advanced civilizations are watching Earth right now in total silence. We are the experiment.\n\n#shorts #space #alien #mystery #fermiparadox #universe #cosmicvault",
        "tags": ["shorts", "space", "alien", "mystery", "fermiparadox", "universe"],
    },
]


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


def main():
    print("=" * 70)
    print("🚀 THE COSMIC VAULT — BATCH 5 VIDEO UPLOAD TO YOUTUBE & TIKTOK")
    print("=" * 70)

    # 1. Verify credentials and configuration
    yt_ok = youtube_uploader.is_configured()
    tt_ok = tiktok_uploader.is_configured()

    print(f"YouTube Uploader: {'✅ Ready' if yt_ok else '❌ Session Missing'}")
    print(f"TikTok Uploader:  {'✅ Ready' if tt_ok else '❌ Session Missing'}")

    if not yt_ok or not tt_ok:
        print("❌ Cannot proceed without both YouTube and TikTok sessions active.")
        sys.exit(1)

    # 2. Verify all video files exist
    for idx, v in enumerate(VIDEOS, 1):
        vpath = PROJECT_ROOT / v["video_path"]
        if not vpath.exists():
            print(f"❌ Missing video {idx}: {vpath}")
            sys.exit(1)
        print(f"✅ Video {idx} ready ({vpath.stat().st_size / (1024*1024):.1f} MB): {v['title']}")

    status_data = load_status()
    total = len(VIDEOS)

    for i, item in enumerate(VIDEOS, start=1):
        task_id = item["task_id"]
        vpath = str(PROJECT_ROOT / item["video_path"])
        item_status = status_data.get(task_id, {})

        print("\n" + "=" * 70)
        print(f"🎬 [{i}/{total}] PROCESSING: '{item['title']}'")
        print("=" * 70)

        # -------------------------------------------------------------
        # A. YouTube Upload
        # -------------------------------------------------------------
        if item_status.get("youtube_success"):
            print(f"⏩ YouTube: Already uploaded! (URL: {item_status.get('youtube_url')})")
        else:
            print(f"\n📤 [YouTube {i}/{total}] Uploading to YouTube Shorts...")
            yt_res = youtube_uploader.upload_video(
                video_path=vpath,
                title=item["title"],
                description=item["description"],
                tags=item["tags"],
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

            status_data[task_id] = item_status
            save_status(status_data)

            # Safety cooldown between platform uploads
            print("⏳ Cooldown 15s before TikTok upload...")
            time.sleep(15)

        # -------------------------------------------------------------
        # B. TikTok Upload
        # -------------------------------------------------------------
        if item_status.get("tiktok_success"):
            print(f"⏩ TikTok: Already uploaded!")
        else:
            print(f"\n📤 [TikTok {i}/{total}] Uploading to TikTok...")
            tt_res = tiktok_uploader.upload_video(
                video_path=vpath,
                caption=item["caption"],
                tags=item["tags"],
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

            status_data[task_id] = item_status
            save_status(status_data)

        # Safety cooldown before starting the next video
        if i < total:
            print("\n⏳ Cooldown 20s before proceeding to next video in batch...")
            time.sleep(20)

    # -------------------------------------------------------------
    # Final Summary Report
    # -------------------------------------------------------------
    print("\n" + "=" * 70)
    print("📊 COSMIC VAULT BATCH UPLOAD FINAL REPORT")
    print("=" * 70)

    all_done = True
    for i, item in enumerate(VIDEOS, start=1):
        st = status_data.get(item["task_id"], {})
        yt_str = f"✅ {st.get('youtube_url', 'Published')}" if st.get("youtube_success") else f"❌ {st.get('youtube_error')}"
        tt_str = "✅ Published" if st.get("tiktok_success") else f"❌ {st.get('tiktok_error')}"

        if not st.get("youtube_success") or not st.get("tiktok_success"):
            all_done = False

        print(f"\n[{i}/{total}] {item['title']}")
        print(f"   YouTube: {yt_str}")
        print(f"   TikTok:  {tt_str}")

    print("\n" + "=" * 70)
    if all_done:
        print("🎉 ALL 5 VIDEOS SUCCESSFULLY PUBLISHED TO BOTH PLATFORMS!")
    else:
        print("⚠️ Some uploads failed or require manual retry. Check details above.")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
