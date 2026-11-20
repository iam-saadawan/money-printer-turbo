"""
YouTube Channel Profile Picture Updater for The Cosmic Vault.
Uses Playwright with the same persistent session cookies as youtube_uploader.py
(storage/youtube_session.json) to navigate YouTube Studio's channel
customization page and upload a new channel picture.

This is new, unverified automation against a UI Google can change without
notice. Screenshots are captured at each major step to storage/ for visual
confirmation.
"""

import os
import time
from pathlib import Path
from typing import Optional

from loguru import logger
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
DEFAULT_SESSION_FILE = STORAGE_DIR / "youtube_session.json"
ERROR_SCREENSHOT = STORAGE_DIR / "youtube_avatar_error.png"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


class YouTubeAvatarUpdater:
    def __init__(self, session_path: Optional[str] = None):
        self.session_path = Path(session_path) if session_path else DEFAULT_SESSION_FILE

    def is_configured(self) -> bool:
        return self.session_path.exists()

    def update_avatar(self, image_path: str, headless: bool = False) -> dict:
        if not self.is_configured():
            msg = f"YouTube session file not found at '{self.session_path}'."
            logger.error(msg)
            return {"success": False, "error": msg}

        abs_image_path = os.path.abspath(image_path)
        if not os.path.exists(abs_image_path):
            msg = f"Image file not found: {abs_image_path}"
            logger.error(msg)
            return {"success": False, "error": msg}

        logger.info(f"Starting YouTube channel picture update using: {abs_image_path}")

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
            )
            context = browser.new_context(
                storage_state=str(self.session_path),
                viewport={"width": 1280, "height": 850},
                user_agent=USER_AGENT,
            )
            page = context.new_page()

            try:
                # 1. Land on the known-working Studio home first (the "channel/UC/..."
                # placeholder trick only resolves for the upload URL, not customization -
                # it 404s there), then navigate via the real left-nav link so the actual
                # channel ID gets resolved by the app itself.
                logger.info("Navigating to YouTube Studio home...")
                page.goto("https://studio.youtube.com", wait_until="domcontentloaded", timeout=45000)
                time.sleep(4)
                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step0_home.png"))

                # YouTube intermittently shows an "unsupported browser" interstitial
                # for Playwright's Chromium build - skip past it when present.
                skip_link = page.get_by_text("SKIP TO YOUTUBE STUDIO", exact=False).first
                try:
                    if skip_link.is_visible(timeout=5000):
                        skip_link.click()
                        time.sleep(4)
                except Exception:
                    pass

                logger.info("Clicking 'Customization' in the left nav...")
                customization_link = page.locator(
                    "a[href*='/editing'], #menu-item-1 a, ytcp-navigation-drawer a:has-text('Customization')"
                ).first
                if customization_link.is_visible(timeout=8000):
                    customization_link.click()
                else:
                    page.get_by_text("Customization", exact=False).first.click()
                time.sleep(4)
                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step1_customization.png"))

                # Make sure we're on the "Basic info" sub-tab (where the picture lives).
                basic_tab = page.get_by_text("Basic info", exact=False).first
                try:
                    if basic_tab.is_visible(timeout=4000):
                        basic_tab.click()
                        time.sleep(2)
                except Exception:
                    pass

                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step2_basic_tab.png"))

                # 2. IMPORTANT: this page has an "Upload" button for the Banner image
                # AND a separate one for the Picture (avatar), in that DOM order.
                # A bare `input[type='file']`.first grabs the Banner's input, not the
                # Picture's - confirmed by hand: it silently set the channel BANNER
                # instead of the avatar on the first version of this script. If a
                # banner is already set, its button reads "Change"/"Remove" instead
                # of "Upload", which would make Picture's button the only "Upload" -
                # but do not rely on the count being 1: always defensively clear any
                # existing Banner first, so exactly two "Upload" buttons exist in a
                # known order (Banner=0, Picture=1) and we can target Picture's
                # reliably via nth(1).
                remove_banner_btn = page.get_by_role("button", name="Remove", exact=False).first
                try:
                    if remove_banner_btn.is_visible(timeout=4000):
                        remove_banner_btn.click()
                        time.sleep(1)
                        confirm_remove = page.get_by_role("button", name="Remove", exact=False).first
                        if confirm_remove.is_visible(timeout=3000):
                            confirm_remove.click()
                            time.sleep(1)
                        logger.info("Cleared existing banner image so Picture's Upload button is unambiguous.")
                except Exception:
                    pass

                upload_buttons = page.get_by_role("button", name="Upload", exact=False)
                btn_count = upload_buttons.count()
                logger.info(f"Found {btn_count} 'Upload' button(s) on the page.")
                picture_upload_btn = upload_buttons.nth(1) if btn_count >= 2 else upload_buttons.first

                with page.expect_file_chooser() as fc_info:
                    picture_upload_btn.click()
                fc_info.value.set_files(abs_image_path)
                logger.info("Image file attached to the Picture (avatar) input.")
                time.sleep(4)
                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step3_file_attached.png"))

                # 3. A crop/preview dialog usually appears - confirm it.
                for label in ["Select", "Done", "Save", "Apply"]:
                    btn = page.get_by_role("button", name=label, exact=False).first
                    try:
                        if btn.is_visible(timeout=4000):
                            btn.click()
                            logger.info(f"Clicked '{label}' in crop/confirm dialog.")
                            time.sleep(2)
                            break
                    except Exception:
                        continue

                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step4_after_confirm.png"))

                # 4. Publish the change on the customization page itself - must happen
                # in this same browser session; unsaved edits are lost on reload.
                publish_btn = page.get_by_role("button", name="Publish", exact=False).first
                publish_btn.wait_for(state="visible", timeout=10000)
                published = False
                if publish_btn.is_enabled():
                    publish_btn.click()
                    time.sleep(5)
                    published = True
                    logger.success("Clicked page-level 'Publish' to save the new channel picture.")
                else:
                    logger.warning("Publish button is disabled - the picture may not have staged correctly.")

                page.screenshot(path=str(STORAGE_DIR / "youtube_avatar_step5_published.png"))

                browser.close()
                return {
                    "success": published,
                    "screenshot": str(STORAGE_DIR / "youtube_avatar_step5_published.png"),
                }

            except Exception as e:
                logger.error(f"YouTube avatar update automation failed: {e}")
                try:
                    page.screenshot(path=str(ERROR_SCREENSHOT))
                except Exception:
                    pass
                browser.close()
                return {"success": False, "error": str(e), "screenshot": str(ERROR_SCREENSHOT)}


youtube_avatar_updater = YouTubeAvatarUpdater()
