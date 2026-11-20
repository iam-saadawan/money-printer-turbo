#!/usr/bin/env python3
"""
TikTok One-Time Login Helper for The Cosmic Vault.
Launches a browser window to allow manual login to TikTok (via QR code, Google, or Email).
Once logged in, exports the authenticated session state to storage/tiktok_session.json
so all future uploads run 100% autonomously without repeating login.
"""

import os
import sys
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).parent / "storage"
SESSION_FILE = STORAGE_DIR / "tiktok_session.json"

# `--channel <name>` saves to storage/sessions/<name>_tiktok_session.json so a second channel
# never overwrites the default (Cosmic Vault) session. Pass the same path to the uploader's session_path.
if "--channel" in sys.argv:
    _channel = sys.argv[sys.argv.index("--channel") + 1]
    SESSION_FILE = STORAGE_DIR / "sessions" / f"{_channel}_tiktok_session.json"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


def main():
    SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)

    print("\n" + "=" * 65)
    print("🔐 THE COSMIC VAULT — TIKTOK ONE-TIME SESSION SETUP")
    print("=" * 65)
    print("Launching Chromium browser window...")
    print("1. Log in to your TikTok account (QR code, Google, or Email).")
    print("2. Once logged in, navigate to or confirm you can see your profile.")
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
            viewport={"width": 1280, "height": 800},
            user_agent=USER_AGENT,
        )

        page = context.new_page()
        
        # Navigate to TikTok login page
        print("🌐 Opening https://www.tiktok.com/login ...")
        page.goto("https://www.tiktok.com/login", wait_until="domcontentloaded")

        input("\n👉 Press [ENTER] in this terminal AFTER you have successfully logged in... ")

        print("\n⏳ Verifying login and saving session state...")

        # Export cookies and localStorage state
        context.storage_state(path=str(SESSION_FILE))

        # Check cookies
        cookies = context.cookies()
        has_session_id = any(c["name"] == "sessionid" for c in cookies)

        print(f"📁 Session saved to: {SESSION_FILE}")
        print(f"🍪 Total cookies saved: {len(cookies)}")

        if has_session_id:
            print("✅ 'sessionid' cookie found! Your TikTok session is fully authenticated.")
        else:
            print("⚠️ Note: 'sessionid' cookie not explicitly found, but session state was saved.")
            print("   You can test uploading with: uv run python test_tiktok_upload.py")

        browser.close()
        print("\n🎉 Setup complete! You can now run autonomous uploads.\n")


if __name__ == "__main__":
    main()
