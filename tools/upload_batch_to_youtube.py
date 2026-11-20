#!/usr/bin/env python3
"""
Upload the 4 Master Cosmic Vault Videos to YouTube Shorts.
Uses persistent session state from storage/youtube_session.json.
"""

import sys
import time
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.youtube_uploader import youtube_uploader

BATCH = [
    {
        "video_path": "storage/tasks/f76361ed-ea4c-42cd-99b3-2bbf665070f0/final-1.mp4",
        "title": "The Black Hole Sound That Should Not Exist #shorts",
        "description": "NASA recorded sound waves emitting from the supermassive black hole at the center of the Perseus galaxy cluster. A cosmic frequency 57 octaves below middle C.\n\n#shorts #space #blackhole #mystery #universe #science",
        "tags": ["shorts", "space", "blackhole", "mystery", "astronomy", "universe"],
    },
    {
        "video_path": "storage/tasks/a19169ee-8c11-4e85-b42e-50637967866d/final-1.mp4",
        "title": "Invisible Planets Are Hunting Earth #shorts",
        "description": "Trillions of rogue worlds wander aimlessly through interstellar darkness. Completely invisible until their gravitational pull bends spacetime.\n\n#shorts #space #rogueplanet #mystery #cosmos #astronomy",
        "tags": ["shorts", "space", "rogueplanet", "mystery", "darkmatter", "universe"],
    },
    {
        "video_path": "storage/tasks/1df0cbd2-7dc4-477a-b5cc-ffd726e56795/final-1.mp4",
        "title": "The Empty Space That Shouldn't Exist #shorts",
        "description": "The Boötes Void is 330 million light-years of pure nothingness. Standard cosmological models cannot explain how such a gigantic void formed.\n\n#shorts #space #boötesvoid #mystery #universe #cosmology",
        "tags": ["shorts", "space", "boötesvoid", "mystery", "void", "astronomy"],
    },
    {
        "video_path": "storage/tasks/9c338366-1f4a-4450-b672-f4b90753757d/final-1.mp4",
        "title": "The Signal That Never Repeated #shorts",
        "description": "72 seconds of high-powered radio transmission from the constellation Sagittarius in 1977. The Wow! signal remains the greatest unsolved enigma in astronomy.\n\n#shorts #space #wowsignal #alien #mystery #seti",
        "tags": ["shorts", "space", "wowsignal", "seti", "mystery", "aliens"],
    },
]


def main():
    print("=" * 65)
    print("🚀 THE COSMIC VAULT — BATCH YOUTUBE SHORTS UPLOAD")
    print("=" * 65)

    if not youtube_uploader.is_configured():
        print(f"\n❌ YouTube session not found at: {youtube_uploader.session_path}")
        print("Please complete login and ensure storage/youtube_session.json exists.\n")
        sys.exit(1)

    print(f"✅ Found YouTube session: {youtube_uploader.session_path}")
    print(f"Ready to upload {len(BATCH)} videos...\n")

    results = []
    for i, item in enumerate(BATCH, start=1):
        print(f"\n[{i}/{len(BATCH)}] Uploading: '{item['title']}'")
        print(f"File: {item['video_path']}")

        # Upload with 1 retry
        res = youtube_uploader.upload_video(
            video_path=item["video_path"],
            title=item["title"],
            description=item["description"],
            tags=item["tags"],
            headless=True,
        )

        if res.get("success"):
            print(f"  🎉 SUCCESS! Video uploaded.")
            if res.get("url"):
                print(f"  🔗 URL: {res['url']}")
            results.append({"title": item["title"], "success": True, "url": res.get("url", "")})
        else:
            print(f"  ❌ FAILED: {res.get('error')}")
            results.append({"title": item["title"], "success": False, "error": res.get("error")})

        if i < len(BATCH):
            print("⏳ Cooldown 15s between uploads to protect channel standing...")
            time.sleep(15)

    print("\n" + "=" * 65)
    print("📊 BATCH UPLOAD SUMMARY:")
    for r in results:
        status = "✅ Published" if r["success"] else f"❌ Error: {r.get('error')}"
        print(f" - {r['title']}: {status}")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()
