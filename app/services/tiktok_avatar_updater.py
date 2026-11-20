"""
TikTok Profile Picture Updater for The Cosmic Vault.
Uses Playwright with the same persistent session cookies as tiktok_uploader.py
(storage/tiktok_session.json) to navigate to the TikTok profile edit page and
upload a new avatar.

This is new, unverified automation against a UI TikTok can change without
notice, and account-settings pages tend to be more bot-sensitive than the
upload page. Screenshots are captured at each major step to storage/ for
visual confirmation.
"""

import os
import time
from pathlib import Path
from typing import Optional

from loguru import logger
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
DEFAULT_SESSION_FILE = STORAGE_DIR / "tiktok_session.json"
ERROR_SCREENSHOT = STORAGE_DIR / "tiktok_avatar_error.png"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/128.0.0.0 Safari/537.36"
)


class TikTokAvatarUpdater:
    def __init__(self, session_path: Optional[str] = None):
        self.session_path = Path(session_path) if session_path else DEFAULT_SESSION_FILE

    def is_configured(self) -> bool:
        return self.session_path.exists()

    def update_avatar(self, image_path: str, headless: bool = False) -> dict:
        if not self.is_configured():
            msg = f"TikTok session file not found at '{self.session_path}'."
            logger.error(msg)
            return {"success": False, "error": msg}

        abs_image_path = os.path.abspath(image_path)
        if not os.path.exists(abs_image_path):
            msg = f"Image file not found: {abs_image_path}"
            logger.error(msg)
            return {"success": False, "error": msg}

        logger.info(f"Starting TikTok profile picture update using: {abs_image_path}")

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
                # 1. Go to TikTok home, then to the account's own profile via the
                # nav "Profile" link (avoids needing to know the @username).
                logger.info("Navigating to TikTok...")
                page.goto("https://www.tiktok.com/", wait_until="domcontentloaded", timeout=45000)
                time.sleep(3)

                profile_link = page.locator("a[href*='/profile'], [data-e2e='nav-profile']").first
                if profile_link.is_visible(timeout=8000):
                    profile_link.click()
                    time.sleep(3)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_avatar_step1_profile.png"))

                # 2. Open the edit-profile panel.
                edit_btn = page.get_by_text("Edit profile", exact=False).first
                if edit_btn.is_visible(timeout=8000):
                    edit_btn.click()
                    time.sleep(2)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_avatar_step2_edit_profile.png"))

                # 3. Set the file directly on the hidden avatar file input rather
                # than trying to click the small camera/edit overlay icon.
                file_input = page.locator("input[type='file']").first
                file_input.wait_for(state="attached", timeout=15000)
                file_input.set_input_files(abs_image_path)
                logger.info("Image file attached to profile photo input.")
                time.sleep(4)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_avatar_step3_file_attached.png"))

                # 4. Confirm the crop dialog - its button is specifically labeled
                # "Apply" (not "Save"/"Confirm"/"Done" - trying those first caused
                # this to misfire against the wrong element in testing).
                apply_btn = page.get_by_role("button", name="Apply", exact=False).first
                apply_btn.wait_for(state="visible", timeout=8000)
                apply_btn.click()
                logger.info("Clicked 'Apply' in the crop dialog.")
                time.sleep(3)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_avatar_step4_after_confirm.png"))

                # 5. Save the edit-profile panel itself.
                save_btn = page.get_by_role("button", name="Save", exact=False).first
                save_btn.wait_for(state="visible", timeout=8000)
                saved = False
                if save_btn.is_enabled():
                    save_btn.click()
                    logger.info("Clicked panel-level 'Save'.")
                    saved = True
                else:
                    logger.warning("Save button is disabled - the photo may not have staged correctly.")

                # IMPORTANT: TikTok's save is asynchronous and noticeably slow to
                # persist server-side - closing the browser too soon after the
                # click can abort the in-flight request even though the button
                # click succeeded. Confirmed by testing: <5s was not enough,
                # 12s reliably was. Reload in the SAME session to verify.
                time.sleep(12)
                page.reload(wait_until="domcontentloaded", timeout=30000)
                time.sleep(4)
                page.screenshot(path=str(STORAGE_DIR / "tiktok_avatar_step5_saved.png"))
                logger.success("TikTok profile picture update flow completed - verify via screenshot.")

                browser.close()
                return {
                    "success": saved,
                    "screenshot": str(STORAGE_DIR / "tiktok_avatar_step5_saved.png"),
                }

            except Exception as e:
                logger.error(f"TikTok avatar update automation failed: {e}")
                try:
                    page.screenshot(path=str(ERROR_SCREENSHOT))
                except Exception:
                    pass
                browser.close()
                return {"success": False, "error": str(e), "screenshot": str(ERROR_SCREENSHOT)}


tiktok_avatar_updater = TikTokAvatarUpdater()
