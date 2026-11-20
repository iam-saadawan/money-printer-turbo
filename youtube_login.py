#!/usr/bin/env python3
"""
YouTube Studio One-Time Login Helper for The Cosmic Vault.
Launches a browser window to allow manual login to Google / YouTube Studio.
Once logged in, exports the authenticated session state to storage/youtube_session.json
so all future YouTube Shorts uploads run 100% autonomously without API limits or subscriptions.
"""

import os
import sys
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).parent / "storage"
SESSION_FILE = STORAGE_DIR / "youtube_session.json"

# `--channel <name>` saves to storage/sessions/<name>_youtube_session.json so a second channel
# never overwrites the default (Cosmic Vault) session. Pass the same path to the uploader's session_path.
if "--channel" in sys.argv:
    _channel = sys.argv[sys.argv.index("--channel") + 1]
    SESSION_FILE = STORAGE_DIR / "sessions" / f"{_channel}_youtube_session.json"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


def main():
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 65)
    print("🔐 THE COSMIC VAULT — YOUTUBE STUDIO ONE-TIME SESSION SETUP")
    print("=" * 65)
    print("Launching Chromium browser window...")
    print("1. Log in to your Google / YouTube Studio account.")
    print("2. Once logged in, confirm you can see your YouTube Studio dashboard.")
    print("3. Return here and press ENTER to save your persistent session.")
    print("=" * 65 + "\n")

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        context = browser.new_context(
            viewport={"width": 1280, "height": 850},
            user_agent=USER_AGENT,
        )

        page = context.new_page()

        print("🌐 Opening https://studio.youtube.com ...")
        page.goto("https://studio.youtube.com", wait_until="domcontentloaded")

        input("\n👉 Press [ENTER] in this terminal AFTER you have successfully logged in... ")

        print("\n⏳ Verifying login and saving session state...")
        time.sleep(2)

        # Save cookies & localStorage state
        context.storage_state(path=str(SESSION_FILE))
        print(f"✅ Persistent session saved to: {SESSION_FILE}")

        # Check title
        try:
            print(f"Channel dashboard title: {page.title()}")
        except Exception:
            pass

        browser.close()

    print("\n🎉 Setup complete! YouTube autonomous uploads are now fully unlocked.\n")


if __name__ == "__main__":
    main()
