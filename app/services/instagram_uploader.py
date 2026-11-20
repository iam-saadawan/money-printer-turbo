"""Instagram Reels uploader (Playwright, saved session from storage/instagram_session.json).
Create the session once with instagram_login.py. Returns {"success", "url", "error"} like the other uploaders."""
import os
import re
import time
from pathlib import Path
from typing import Optional

from loguru import logger
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).resolve().parent.parent.parent / "storage"
DEFAULT_SESSION_FILE = STORAGE_DIR / "instagram_session.json"
ERROR_SCREENSHOT = STORAGE_DIR / "instagram_last_error.png"
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")


class InstagramUploader:
    def __init__(self, session_path: Optional[str] = None):
        self.session_path = Path(session_path) if session_path else DEFAULT_SESSION_FILE

    def is_configured(self) -> bool:
        return self.session_path.exists()

    @staticmethod
    def _click_text(scope, text, timeout=15000):
        btn = scope.get_by_role("button", name=text, exact=True)
        if not btn.count():
            btn = scope.locator(f"div[role=button]:text-is('{text}'), button:text-is('{text}')")
        btn.first.wait_for(state="visible", timeout=timeout)
        btn.first.click()

    def upload_video(self, video_path: str, caption: str, headless: bool = True) -> dict:
        if not self.is_configured():
            return {"success": False, "error": f"No Instagram session at {self.session_path}; run instagram_login.py"}
        video = os.path.abspath(video_path)
        if not os.path.exists(video):
            return {"success": False, "error": f"Video not found: {video}"}

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=headless, args=["--disable-blink-features=AutomationControlled", "--no-sandbox"])
            ctx = browser.new_context(storage_state=str(self.session_path), viewport={"width": 1280, "height": 850}, user_agent=USER_AGENT)
            page = ctx.new_page()
            try:
                page.goto("https://www.instagram.com/", wait_until="domcontentloaded", timeout=45000)
                time.sleep(5)
                if "/accounts/login" in page.url:
                    raise RuntimeError("Instagram session expired: run instagram_login.py again")
                for txt in ("Not now", "Not Now"):  # notification / save-login popups
                    b = page.get_by_role("button", name=txt)
                    if b.count() and b.first.is_visible():
                        b.first.click(); time.sleep(1)

                # 1. Open "Create" -> "Post" and attach the video
                page.locator("svg[aria-label='New post'], svg[aria-label='Create']").first.click()
                time.sleep(2)
                post_opt = page.locator("span:text-is('Post') >> visible=true")  # Create menu: Post / Live video / Ad
                if post_opt.count():
                    post_opt.first.click(); time.sleep(3)
                page.locator("input[type=file][accept*='video']").first.set_input_files(video)
                logger.info("Instagram: video attached")
                time.sleep(6)

                dlg = page.locator("div[role=dialog]").last
                ok = dlg.get_by_role("button", name="OK")  # "Video posts are now shared as reels"
                if ok.count() and ok.first.is_visible():
                    ok.first.click(); time.sleep(2)

                # 2. Crop: pick original ratio if offered, then Next, Next (edit screen)
                try:
                    page.locator("svg[aria-label='Select crop'], svg[aria-label='Select Crop']").first.click(timeout=5000)
                    time.sleep(1)
                    orig = page.locator("div[role=button]:has-text('Original'), span:text-is('Original')")
                    if orig.count():
                        orig.first.click(); time.sleep(1)
                except Exception:  # noqa: BLE001
                    pass
                self._click_text(page, "Next"); time.sleep(3)
                self._click_text(page, "Next"); time.sleep(3)

                # 3. Caption
                cap = page.locator("div[aria-label='Write a caption...'][contenteditable=true], div[role=textbox][contenteditable=true]").first
                cap.click(); time.sleep(0.5)
                page.keyboard.insert_text(caption[:2150])
                time.sleep(1)
                logger.info("Instagram: caption entered")

                # 4. Share and wait for the confirmation
                self._click_text(page, "Share")
                page.locator("text=/(reel|post) has been shared|Your reel has been shared|Post shared/i").first.wait_for(timeout=300000)
                logger.success("Instagram: reel shared")
                time.sleep(3)

                # 5. Find the new reel's link on the profile
                url = ""
                try:
                    page.goto("https://www.instagram.com/", wait_until="domcontentloaded"); time.sleep(3)
                    prof = page.locator("a[href^='/'][role=link]:has(img[alt*='profile picture'])").first.get_attribute("href") or ""
                    page.goto(f"https://www.instagram.com{prof}reels/", wait_until="domcontentloaded"); time.sleep(6)
                    href = page.locator("a[href*='/reel/']").first.get_attribute("href") or ""
                    m = re.search(r"/reel/([\w-]+)", href)
                    url = f"https://www.instagram.com/reel/{m.group(1)}/" if m else ""
                except Exception as e:  # noqa: BLE001
                    logger.warning(f"Instagram: shared, but could not read the reel link: {e}")
                return {"success": True, "url": url}
            except Exception as e:  # noqa: BLE001
                try:
                    page.screenshot(path=str(ERROR_SCREENSHOT))
                except Exception:  # noqa: BLE001
                    pass
                logger.error(f"Instagram upload failed: {e}")
                return {"success": False, "error": f"{type(e).__name__}: {e}"}
            finally:
                browser.close()
