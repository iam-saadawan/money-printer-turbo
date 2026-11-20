#!/usr/bin/env python3
import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app.services.youtube_uploader import DEFAULT_SESSION_FILE as YT_SESSION, USER_AGENT
from app.services.tiktok_uploader import DEFAULT_SESSION_FILE as TT_SESSION

ARTIFACTS_DIR = Path("/Users/saad/.gemini/antigravity-ide/brain/1a60183a-1247-43cd-b54e-516033807f26/.tempmediaStorage")
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def verify_youtube():
    print("Verifying YouTube Studio...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(
            storage_state=str(YT_SESSION),
            viewport={"width": 1280, "height": 850},
            user_agent=USER_AGENT,
        )
        page = context.new_page()
        page.goto("https://studio.youtube.com", wait_until="domcontentloaded", timeout=45000)
        time.sleep(5)
        # Navigate to content / shorts tab if possible
        content_btn = page.locator("a#destination-content, [aria-label*='Content' i]").first
        if content_btn.is_visible(timeout=5000):
            content_btn.click()
            time.sleep(4)
        
        out_path = ARTIFACTS_DIR / "youtube_verify_3pack.png"
        page.screenshot(path=str(out_path))
        print(f"Saved YouTube screenshot: {out_path}")
        browser.close()
        return str(out_path)

def verify_tiktok():
    print("Verifying TikTok Studio...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox"]
        )
        context = browser.new_context(
            storage_state=str(TT_SESSION),
            viewport={"width": 1280, "height": 850},
            user_agent=USER_AGENT,
        )
        page = context.new_page()
        page.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=45000)
        time.sleep(6)
        
        out_path = ARTIFACTS_DIR / "tiktok_verify_3pack.png"
        page.screenshot(path=str(out_path))
        print(f"Saved TikTok screenshot: {out_path}")
        browser.close()
        return str(out_path)

if __name__ == "__main__":
    verify_youtube()
    verify_tiktok()
