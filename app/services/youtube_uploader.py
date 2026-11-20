"""
YouTube Autonomous Shorts Upload Service for The Cosmic Vault.
Uses Playwright with persistent session cookies from storage/youtube_session.json.
Completely zero-cost, zero-subscription, unlimited replacement for Upload-Post YouTube tier.
"""

import os
import time
import random
from pathlib import Path
from typing import Optional, List
from loguru import logger
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

from app.config import config

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
DEFAULT_SESSION_FILE = STORAGE_DIR / "youtube_session.json"
ERROR_SCREENSHOT = STORAGE_DIR / "youtube_last_error.png"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


class YouTubeUploader:
    def __init__(self, session_path: Optional[str] = None):
        self.session_path = Path(session_path) if session_path else DEFAULT_SESSION_FILE

    def is_configured(self) -> bool:
        """Check if YouTube session cookies file exists."""
        return self.session_path.exists()

    def upload_video(
        self,
        video_path: str,
        title: str,
        description: str = "",
        tags: Optional[List[str]] = None,
        headless: bool = True,
        is_short: bool = True,
    ) -> dict:
        """
        Upload a video to YouTube Studio using Playwright session automation.
        
        Args:
            video_path: Absolute or relative path to the MP4 video.
            title: Title for YouTube Shorts (under 100 chars, includes #shorts).
            description: Description for the video.
            tags: List of hashtag strings.
            headless: Whether to run Chromium headlessly.
            
        Returns:
            dict with 'success', 'url', and optional 'error'.
        """
        if not self.is_configured():
            msg = (
                f"YouTube session file not found at '{self.session_path}'. "
                "Run `uv run python youtube_login.py` once to log in and save your session."
            )
            logger.error(msg)
            return {"success": False, "error": msg}

        abs_video_path = os.path.abspath(video_path)
        if not os.path.exists(abs_video_path):
            msg = f"Video file not found: {abs_video_path}"
            logger.error(msg)
            return {"success": False, "error": msg}

        # Format title & tags
        clean_title = title[:100]
        if is_short and "#shorts" not in clean_title.lower():  # videos over 3 min are not Shorts: pass is_short=False
            clean_title = f"{clean_title[:90]} #shorts".strip()

        logger.info(f"Starting YouTube Studio upload for: {abs_video_path}")
        logger.info(f"Title: {clean_title}")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=headless,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ],
            )

            context = browser.new_context(
                storage_state=str(self.session_path),
                viewport={"width": 1280, "height": 850},
                user_agent=USER_AGENT,
            )

            page = context.new_page()

            try:
                # 1. Navigate to YouTube Studio upload interface
                logger.info("Navigating to YouTube Studio upload dialog...")
                page.goto("https://studio.youtube.com", wait_until="domcontentloaded", timeout=45000)
                time.sleep(4)

                # Click Create button or navigate to upload directly
                create_btn = page.locator("#create-icon, button:has-text('Create'), [aria-label*='Create' i]").first
                if create_btn.is_visible(timeout=5000):
                    create_btn.click()
                    time.sleep(1.5)
                    upload_opt = page.locator("tp-yt-paper-item").filter(has_text="Upload videos").first
                    if upload_opt.is_visible(timeout=4000):
                        upload_opt.click()
                    else:
                        page.get_by_text("Upload videos", exact=False).first.click()
                else:
                    page.goto("https://studio.youtube.com/channel/UC/videos/upload?d=pt", wait_until="domcontentloaded", timeout=30000)

                time.sleep(3)

                # 2. Attach video file (fallback: open the upload dialog by URL when the Create menu changed)
                file_input = page.locator("input[type='file']").first
                try:
                    file_input.wait_for(state="attached", timeout=8000)
                except Exception:
                    import re as _re
                    m = _re.search(r"/channel/(UC[\w-]+)", page.url)
                    if not m:
                        page.goto("https://studio.youtube.com", wait_until="domcontentloaded", timeout=45000)
                        time.sleep(3)
                        m = _re.search(r"/channel/(UC[\w-]+)", page.url)
                    cid = m.group(1) if m else "UC"
                    logger.info(f"Create menu did not open the upload dialog; opening it by URL for channel {cid}")
                    page.goto(f"https://studio.youtube.com/channel/{cid}/videos/upload?d=ud", wait_until="domcontentloaded", timeout=45000)
                    time.sleep(4)
                    file_input = page.locator("input[type='file']").first
                file_input.set_input_files(abs_video_path)

                logger.info("Video file attached, waiting for upload dialog...")
                time.sleep(6)

                # 3. Enter Title in the textbox
                title_box = page.locator("#textbox[aria-label*='title' i], #title-textarea #textbox, [aria-label*='Add a title' i]").first
                if title_box.is_visible(timeout=20000):
                    try:
                        title_box.scroll_into_view_if_needed()
                        title_box.click(force=True)
                    except Exception:
                        title_box.focus()
                    time.sleep(0.5)
                    page.keyboard.press("ControlOrMeta+A")  # Meta+A does nothing on the Linux HP
                    page.keyboard.press("Backspace")
                    time.sleep(0.3)
                    page.keyboard.type(clean_title, delay=15)
                    logger.info("Title entered successfully.")

                # Enter Description if available
                if description:
                    try:
                        desc_box = page.locator("#description-textarea #textbox, #textbox[aria-label*='description' i]").first
                        if desc_box.is_visible(timeout=3000):
                            desc_box.scroll_into_view_if_needed()
                            desc_box.click(force=True)
                            time.sleep(0.3)
                            page.keyboard.type(description, delay=10)
                            logger.info("Description entered.")
                    except Exception:
                        pass

                # 4. Set "Not made for kids" (required by YouTube)
                time.sleep(1)
                not_kids = page.locator("tp-yt-paper-radio-button[name='VIDEO_MADE_FOR_KIDS_NOT_MFK'], tp-yt-paper-radio-button:has-text('No, it\\'s not made for kids')").first
                if not_kids.is_visible(timeout=5000):
                    not_kids.click()
                    logger.info("Selected 'Not made for kids'.")

                # 5. Click Next through Video elements & Checks tabs
                for step in range(3):
                    time.sleep(2)
                    next_btn = page.locator("#next-button, button:has-text('Next')").first
                    if next_btn.is_visible(timeout=6000):
                        next_btn.click()
                        logger.info(f"Advanced through wizard step {step + 1}...")

                # 6. Visibility: Select 'Public'
                time.sleep(2)
                public_radio = page.locator("tp-yt-paper-radio-button[name='PUBLIC'], tp-yt-paper-radio-button:has-text('Public')").first
                if public_radio.is_visible(timeout=6000):
                    public_radio.click()
                    logger.info("Selected 'Public' visibility.")
                    # first public upload on a channel shows a "Remember that anyone can see public videos" notice
                    # whose backdrop blocks the Publish button
                    try:
                        got_it = page.get_by_role("button", name="Got it")
                        if got_it.is_visible(timeout=3000):
                            got_it.click()
                            logger.info("Dismissed the public-videos notice.")
                    except Exception:
                        pass

                # Extract Video URL link if shown
                video_url = ""
                try:
                    link_el = page.locator("a.ytcp-video-info, a[href*='youtu.be']").first
                    if link_el.is_visible(timeout=3000):
                        video_url = link_el.get_attribute("href") or ""
                except Exception:
                    pass

                # Wait until the file has finished uploading: closing the browser earlier left long clips stuck at
                # "Uploading 44%" in Studio even though Publish had been clicked.
                deadline = time.time() + 900
                while time.time() < deadline:
                    try:
                        progress = page.locator("ytcp-video-upload-progress").first.inner_text(timeout=3000)
                    except Exception:
                        progress = ""
                    if progress and "Uploading" not in progress:
                        logger.info(f"Upload finished: {progress.strip()[:60]}")
                        break
                    time.sleep(3)

                # 7. Click Save / Publish button
                time.sleep(1)
                done_btn = page.locator("#done-button, button:has-text('Publish'), button:has-text('Save')").first
                if done_btn.is_visible(timeout=6000):
                    done_btn.click()
                    logger.info("Clicked Publish button!")

                # Wait for publish confirmation
                time.sleep(8)
                if not video_url:
                    try:
                        modal_link = page.locator("a[href*='youtu.be'], a.ytcp-video-info").first
                        if modal_link.is_visible(timeout=4000):
                            video_url = modal_link.get_attribute("href") or ""
                    except Exception:
                        pass
                page.screenshot(path=str(STORAGE_DIR / "youtube_last_published.png"))
                logger.success(f"✅ Video published to YouTube Studio: {video_url or clean_title}")

                browser.close()
                return {"success": True, "url": video_url, "title": clean_title}

            except Exception as e:
                logger.error(f"YouTube Studio automation failed: {e}")
                try:
                    page.screenshot(path=str(ERROR_SCREENSHOT))
                except Exception:
                    pass
                browser.close()
                return {"success": False, "error": str(e)}


# Singleton instance
youtube_uploader = YouTubeUploader()
