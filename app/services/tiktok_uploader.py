"""
TikTok Autonomous Upload Service for The Cosmic Vault.
Uses Playwright with persistent session cookies from storage/tiktok_session.json.
Completely zero-cost, zero-subscription replacement for Upload-Post TikTok tier.
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
DEFAULT_SESSION_FILE = STORAGE_DIR / "tiktok_session.json"
ERROR_SCREENSHOT = STORAGE_DIR / "tiktok_last_error.png"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


class TikTokUploader:
    def __init__(self, session_path: Optional[str] = None):
        self.session_path = Path(session_path) if session_path else DEFAULT_SESSION_FILE

    def is_configured(self) -> bool:
        """Check if TikTok session cookies file exists."""
        return self.session_path.exists()

    def upload_video(
        self,
        video_path: str,
        caption: str,
        tags: Optional[List[str]] = None,
        headless: bool = True,
        accept_content_checks: bool = False,
    ) -> dict:
        """
        Upload a video to TikTok using Playwright session automation.
        
        Args:
            video_path: Absolute or relative path to the MP4 video.
            caption: Spoken title / hook / description for the video.
            tags: List of hashtag strings (e.g. ['space', 'mystery', 'universe']).
            headless: Whether to run Chromium headlessly.
            accept_content_checks: New accounts get a one-time "Turn on automatic content checks?"
                modal that blocks the caption box. True clicks "Turn on" (an account setting - only
                pass True when the account owner agreed); False clicks "Cancel".
            
        Returns:
            dict with 'success', 'message', and optional 'error'.
        """
        if not self.is_configured():
            msg = (
                f"TikTok session file not found at '{self.session_path}'. "
                "Run `uv run python tiktok_login.py` once to log in and save your session."
            )
            logger.error(msg)
            return {"success": False, "error": msg}

        abs_video_path = os.path.abspath(video_path)
        if not os.path.exists(abs_video_path):
            msg = f"Video file not found: {abs_video_path}"
            logger.error(msg)
            return {"success": False, "error": msg}

        # Format full caption with hashtags
        tag_str = ""
        if tags:
            # skip tags the caption already contains, so hashtags aren't doubled
            clean_tags = [t.lstrip("#") for t in tags if f"#{t.lstrip('#').lower()}" not in caption.lower()]
            tag_str = (" " + " ".join(f"#{t}" for t in clean_tags)) if clean_tags else ""
        full_text = f"{caption[:150]}{tag_str}".strip()

        logger.info(f"Starting TikTok upload for: {abs_video_path}")
        logger.info(f"Caption: {full_text}")

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
                # 1. Navigate to TikTok Studio upload page
                upload_url = "https://www.tiktok.com/tiktokstudio/upload?from=creator_center"
                logger.info(f"Navigating to {upload_url}...")
                page.goto(upload_url, wait_until="domcontentloaded", timeout=45000)
                time.sleep(random.uniform(3.0, 4.5))

                # Check if redirected to login
                if "login" in page.url.lower():
                    msg = "Session expired or invalid. TikTok redirected to login page. Please re-run tiktok_login.py."
                    logger.error(msg)
                    return {"success": False, "error": msg}

                # 2. Attach Video File (via 'Select video' button file-chooser or direct input[type=file])
                logger.info("Searching for file upload mechanism...")
                file_uploaded = False

                # Method A: Try Playwright expect_file_chooser on the 'Select video' button
                select_btn_selectors = [
                    'button:has-text("Select video")',
                    'div[role="button"]:has-text("Select video")',
                    'div:has-text("Select video")',
                    'button:has-text("Select files")',
                ]

                for sel in select_btn_selectors:
                    try:
                        btn = page.locator(sel).first
                        if btn.is_visible(timeout=2000):
                            logger.info(f"Found upload trigger button: '{sel}'. Activating file chooser...")
                            with page.expect_file_chooser(timeout=10000) as fc_info:
                                btn.click()
                            file_chooser = fc_info.value
                            file_chooser.set_files(abs_video_path)
                            logger.info("✅ File attached via file chooser!")
                            file_uploaded = True
                            break
                    except Exception as e:
                        logger.debug(f"File chooser check failed for {sel}: {e}")
                        continue

                # Method B: If file chooser wasn't triggered, search for input[type="file"] directly
                if not file_uploaded:
                    file_input = None
                    try:
                        page.wait_for_selector('input[type="file"]', timeout=5000, state="attached")
                        file_input = page.locator('input[type="file"]').first
                    except Exception:
                        pass

                    if not file_input:
                        for frame in page.frames:
                            try:
                                frame.wait_for_selector('input[type="file"]', timeout=3000, state="attached")
                                file_input = frame.locator('input[type="file"]').first
                                logger.info(f"Found upload input inside iframe: {frame.url}")
                                break
                            except Exception:
                                continue

                    if file_input:
                        logger.info("Attaching video file directly to input[type='file']...")
                        file_input.set_input_files(abs_video_path)
                        file_uploaded = True

                if not file_uploaded:
                    page.screenshot(path=str(ERROR_SCREENSHOT))
                    msg = f"Could not trigger video upload on TikTok. Screenshot saved to {ERROR_SCREENSHOT}."
                    logger.error(msg)
                    return {"success": False, "error": msg}

                # Step 1 Screenshot: File Attached
                time.sleep(3.0)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_step1_attached.png"))

                # One-time "Turn on automatic content checks?" modal on new accounts
                try:
                    if page.get_by_text("Turn on automatic content checks", exact=False).first.is_visible(timeout=4000):
                        choice = "Turn on" if accept_content_checks else "Cancel"
                        page.get_by_role("button", name=choice, exact=True).first.click()
                        logger.info(f"Content-checks modal: clicked '{choice}'.")
                        time.sleep(1.0)
                except Exception:
                    pass

                # Dismiss any overlay modals or tooltips if present (e.g. "Smart Split", "Got it")
                for dismiss_sel in ['button:has-text("Got it")', 'button:has-text("Dismiss")', 'div[aria-label="Close"]', 'svg[class*="close"]']:
                    try:
                        d_btn = page.locator(dismiss_sel).first
                        if d_btn.is_visible(timeout=1500):
                            d_btn.click()
                            time.sleep(0.5)
                    except Exception:
                        pass

                # remove onboarding tours (react-joyride) that cover the caption editor
                try:
                    page.keyboard.press("Escape")
                    page.add_style_tag(content="#react-joyride-portal, .react-joyride__overlay, .react-joyride__spotlight, .__floater { display: none !important; pointer-events: none !important; }")
                    page.evaluate("document.querySelectorAll('#react-joyride-portal, .react-joyride__overlay, .react-joyride__spotlight, [class*=\"joyride\"]').forEach(e => e.remove())")
                    time.sleep(0.5)
                except Exception:
                    pass

                # 4. Fill in the Caption / Description
                logger.info("Locating caption editor...")
                editor_target = None
                editor_selectors = [
                    'div[contenteditable="true"]',
                    'div.DraftEditor-root',
                    'div[data-placeholder]',
                    'div[class*="caption"] div[contenteditable="true"]',
                    'div[class*="editor"] div[contenteditable="true"]',
                    'div.notranslate[contenteditable="true"]',
                    'textarea',
                ]

                # Wait up to 30s for video upload processing to switch to the details view
                for _ in range(15):
                    for sel in editor_selectors:
                        try:
                            loc = page.locator(sel).first
                            if loc.is_visible(timeout=2000):
                                editor_target = loc
                                break
                        except Exception:
                            continue
                    if editor_target:
                        break
                    time.sleep(2)

                # Check inside frames if not visible
                if not editor_target:
                    for frame in page.frames:
                        for sel in editor_selectors:
                            try:
                                loc = frame.locator(sel).first
                                if loc.is_visible(timeout=2000):
                                    editor_target = loc
                                    break
                            except Exception:
                                continue
                        if editor_target:
                            break

                if editor_target:
                    logger.info("Entering caption and hashtags...")
                    editor_target.click()
                    time.sleep(0.5)

                    # Select all existing default text and delete it
                    page.keyboard.press("ControlOrMeta+A")  # Meta+A does nothing on the Linux HP
                    page.keyboard.press("Backspace")
                    time.sleep(0.3)

                    # Type full caption with human-like pace
                    page.keyboard.type(full_text, delay=random.randint(20, 35))
                    time.sleep(1.0)
                    # Press Escape twice and click outside to dismiss the hashtag autocomplete popup
                    page.keyboard.press("Escape")
                    time.sleep(0.3)
                    page.keyboard.press("Escape")
                    time.sleep(0.3)
                    try:
                        page.mouse.click(100, 100)
                    except Exception:
                        pass
                    time.sleep(0.5)
                else:
                    logger.warning("Could not find rich caption editor; proceeding with video upload...")

                # Step 2 Screenshot: Caption Entered
                page.screenshot(path=str(STORAGE_DIR / "tiktok_step2_caption.png"))

                # 4.5 Ensure Privacy is set to 'Public' / 'Everyone'
                logger.info("Verifying privacy setting...")
                # Remove joyride tour/tooltip overlays immediately
                page.evaluate("""() => {
                    document.querySelectorAll('#react-joyride-portal, .react-joyride__overlay').forEach(el => el.remove());
                    const c = document.querySelector('div.edss2sz6') || document.querySelector('.css-86gjln');
                    if (c) c.scrollTop = c.scrollHeight;
                    window.scrollTo(0, document.body.scrollHeight);
                }""")
                time.sleep(1.0)

                # Check current privacy setting
                privacy_state = page.evaluate("""() => {
                    const trigger = document.querySelector('div.Select__root button[role="combobox"]');
                    return trigger ? trigger.innerText.trim() : 'Unknown';
                }""")
                logger.info(f"Current TikTok post privacy: '{privacy_state}'")

                # An unreadable ('' / 'Unknown') dropdown is left alone: TikTok defaults to Everyone, and the
                # broad fallback selectors below once clicked "Only me" by mistake (2026-10-11).
                if privacy_state not in ("", "Unknown") and "Everyone" not in privacy_state and "Public" not in privacy_state:
                    logger.info("Setting privacy to 'Everyone'...")
                    page.evaluate("""() => {
                        const trigger = document.querySelector('div.Select__root button[role="combobox"]');
                        if (trigger) trigger.click();
                    }""")
                    time.sleep(1.0)
                    for opt_sel in ['div[role="option"]:has-text("Everyone")', 'div:has-text("Everyone")', 'span:has-text("Everyone")']:
                        try:
                            opt = page.locator(opt_sel).first
                            if opt.is_visible(timeout=1000):
                                opt.click()
                                logger.info(f"Selected 'Everyone' privacy via: {opt_sel}")
                                break
                        except Exception:
                            continue
                    time.sleep(0.5)

                # 5. Wait for Video to Finish Uploading and Post Button to Become Truly Ready
                logger.info("Waiting for video upload processing and Post button to activate (up to 120s)...")
                post_btn_ready = False
                post_btn = None

                for attempt in range(300):  # 300 iterations * 2s = 10 min (big files upload slowly)
                    # Dismiss any persistent popups like 'New editing features added [Got it]'
                    for dismiss_sel in ['button:has-text("Got it")', 'button:has-text("Dismiss")', 'button:has-text("Later")']:
                        try:
                            d_btn = page.locator(dismiss_sel).first
                            if d_btn.is_visible(timeout=300):
                                logger.info(f"Dismissing overlay popup: {dismiss_sel}")
                                d_btn.click()
                                time.sleep(0.5)
                        except Exception:
                            pass

                    # Scroll inner container and window to bottom
                    page.evaluate("""() => {
                        const c = document.querySelector('div.edss2sz6') || document.querySelector('.css-86gjln');
                        if (c) c.scrollTop = c.scrollHeight;
                        window.scrollTo(0, document.body.scrollHeight);
                    }""")

                    # Check if Post button is truly ready (TikTok sets aria-disabled="false" and cursor="pointer" when ready)
                    readiness = page.evaluate("""() => {
                        const b = document.querySelector('button[data-e2e="post_video_button"]');
                        if (!b) return { found: false, ready: false };
                        const style = window.getComputedStyle(b);
                        const ariaDisabled = b.getAttribute('aria-disabled');
                        const isPointer = style.cursor === 'pointer';
                        const notDisabled = ariaDisabled === 'false' || ariaDisabled === null;
                        return {
                            found: true,
                            ready: notDisabled && isPointer,
                            ariaDisabled: ariaDisabled,
                            cursor: style.cursor
                        };
                    }""")

                    if readiness.get("ready"):
                        logger.info(f"✅ Post button is truly ready! (aria-disabled={readiness.get('ariaDisabled')}, cursor={readiness.get('cursor')})")
                        post_btn_ready = True
                        post_btn = page.locator('button[data-e2e="post_video_button"]')
                        break
                    else:
                        if attempt % 5 == 0:
                            logger.info(f"Waiting for upload checks... (attempt {attempt+1}/300: aria-disabled={readiness.get('ariaDisabled')}, cursor={readiness.get('cursor')})")

                    time.sleep(2)

                # Step 3 Screenshot: Ready to Post
                page.screenshot(path=str(STORAGE_DIR / "tiktok_step3_ready_to_post.png"))

                if not post_btn_ready or not post_btn:
                    msg = "Post button not ready after waiting 120s. See storage/tiktok_step3_ready_to_post.png."
                    logger.error(msg)
                    return {"success": False, "error": msg}

                logger.info("Clicking Post button...")
                post_btn.scroll_into_view_if_needed()
                time.sleep(0.5)
                try:
                    post_btn.click()
                except Exception as e:
                    logger.warning(f"Standard click failed: {e}. Retrying with click(force=True)...")
                    post_btn.click(force=True)
                time.sleep(3.0)

                # Handle any confirmation dialogs (e.g. "Post now", "Publish anyway", "Continue")
                for confirm_sel in ['button:has-text("Post now")', 'button:has-text("Publish anyway")', 'button:has-text("Continue")']:
                    try:
                        c_btn = page.locator(confirm_sel).first
                        if c_btn.is_visible(timeout=1500):
                            logger.info(f"Clicking confirmation modal button: {confirm_sel}")
                            c_btn.click()
                            time.sleep(2.0)
                    except Exception:
                        pass

                # 7. Wait for Genuine Post Completion
                logger.info("Waiting for TikTok to confirm upload completion (up to 45s)...")
                real_success = False
                for _ in range(20):
                    time.sleep(2.5)
                    content = page.content().lower()
                    current_url = page.url.lower()

                    # These signals only appear AFTER clicking post
                    if (
                        "manage your posts" in content
                        or "upload another video" in content
                        or "your video has been published" in content
                        or "your video is being uploaded" in content
                        or "video published" in content
                        or "post scheduled" in content
                        or "tiktokstudio/content" in current_url
                    ):
                        real_success = True
                        break

                # Step 4 Screenshot: Final Result
                page.screenshot(path=str(STORAGE_DIR / "tiktok_step4_final.png"))

                if real_success:
                    logger.success("✅ Video successfully published to TikTok!")
                    # Give it 8 seconds in headed mode so user can see the success screen
                    if not headless:
                        time.sleep(8)
                    return {
                        "success": True,
                        "message": "Video posted to TikTok successfully",
                        "caption": full_text,
                    }
                else:
                    logger.warning("Upload may still be processing. Check storage/tiktok_step4_final.png.")
                    if not headless:
                        time.sleep(5)
                    return {
                        "success": False,
                        "error": "Timed out waiting for post confirmation modal. Screenshot saved to storage/tiktok_step4_final.png",
                    }

            except PlaywrightTimeoutError as e:
                page.screenshot(path=str(ERROR_SCREENSHOT))
                msg = f"Playwright timeout: {str(e)}"
                logger.error(msg)
                return {"success": False, "error": msg}
            except Exception as e:
                page.screenshot(path=str(ERROR_SCREENSHOT))
                msg = f"Unexpected TikTok upload failure: {str(e)}"
                logger.error(msg)
                return {"success": False, "error": msg}
            finally:
                context.close()
                browser.close()


# Singleton instance
tiktok_uploader = TikTokUploader()


def upload_to_tiktok(video_path: str, caption: str, tags: Optional[List[str]] = None, headless: bool = True) -> dict:
    """Convenience helper to upload video to TikTok."""
    return tiktok_uploader.upload_video(video_path=video_path, caption=caption, tags=tags, headless=headless)
