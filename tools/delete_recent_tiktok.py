#!/usr/bin/env python3
"""
Cleanly delete specified number of most recent videos from TikTok Studio.
Used to purge outdated test / silent BGM videos before re-uploading fresh master copies.
"""

import sys
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

STORAGE_DIR = Path(__file__).resolve().parent.parent / "storage"
SESSION_FILE = STORAGE_DIR / "tiktok_session.json"


def delete_recent_tiktok_videos(count: int = 4):
    if not SESSION_FILE.exists():
        print(f"Session file not found: {SESSION_FILE}")
        return False

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            storage_state=str(SESSION_FILE),
            viewport={"width": 1280, "height": 850},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        )
        page = ctx.new_page()

        deleted = 0
        for i in range(count):
            print(f"\n[TikTok Cleaner] Deleting video {i + 1}/{count}...")
            page.goto("https://www.tiktok.com/tiktokstudio/content", wait_until="domcontentloaded", timeout=30000)
            time.sleep(5)

            # Remove overlays / tooltips
            page.evaluate("""() => {
                document.querySelectorAll('.react-joyride__overlay, #react-joyride-portal, div[class*="tooltip"], div[class*="popover"]').forEach(el => el.remove());
            }""")
            time.sleep(1)

            # Locate top 3-dots action button
            target_btn = None
            for b in page.locator("button").all():
                box = b.bounding_box()
                if box and box["x"] > 1150 and 220 < box["y"] < 360:
                    target_btn = b
                    print(f"  Found 3-dots action button at ({box['x']:.0f}, {box['y']:.0f})")
                    break

            if not target_btn:
                print("  ⚠️ Top video 3-dots button not found")
                page.screenshot(path=str(STORAGE_DIR / f"tiktok_del_missing_{i}.png"))
                break

            target_btn.click()
            time.sleep(2.0)

            # Find Delete in dropdown
            del_item = page.locator(':text("Delete")').first
            if not del_item.is_visible(timeout=3000):
                print("  ⚠️ 'Delete' option not visible in dropdown menu")
                break

            print("  Clicking 'Delete' in dropdown...")
            del_item.click()
            time.sleep(2.0)

            # Confirm modal delete
            confirm_btn = page.locator(
                'div[role="dialog"] button:has-text("Delete"), div[class*="modal"] button:has-text("Delete"), button:has-text("Delete"):not([role="menuitem"])'
            ).last
            if confirm_btn.is_visible(timeout=3000):
                print("  Confirming deletion in modal dialog...")
                confirm_btn.click()
                time.sleep(4.0)
                deleted += 1
                print(f"  ✅ Video {i + 1} deleted successfully!")
            else:
                print("  ⚠️ Confirmation button not visible")
                page.screenshot(path=str(STORAGE_DIR / f"tiktok_del_confirm_fail_{i}.png"))
                break

        browser.close()
        print(f"\n[TikTok Cleaner] Finished. Successfully deleted {deleted}/{count} videos.")
        return deleted == count


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    delete_recent_tiktok_videos(count)
