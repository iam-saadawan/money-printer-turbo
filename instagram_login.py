#!/usr/bin/env python3
"""Instagram one-time login: opens a Chromium window, you log in yourself, and the session is saved to
storage/instagram_session.json as soon as Instagram sets its login cookie (no need to press anything).
Run on the Mac:  .venv/bin/python instagram_login.py
Then copy it to the HP:  scp storage/instagram_session.json saad@192.168.1.109:sidequest/storage/"""
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

SESSION_FILE = Path(__file__).parent / "storage" / "instagram_session.json"
USER_AGENT = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
              "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=False, args=["--disable-blink-features=AutomationControlled", "--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 1280, "height": 850}, user_agent=USER_AGENT)
    page = ctx.new_page()
    page.goto("https://www.instagram.com/accounts/login/")
    print("Log in to the Side Quest Instagram account in the window that opened (up to 10 minutes).", flush=True)
    for _ in range(300):
        if any(c["name"] == "sessionid" and c["value"] for c in ctx.cookies("https://www.instagram.com")):
            time.sleep(8)  # let Instagram finish setting its other cookies ("Save login info" etc.)
            SESSION_FILE.parent.mkdir(parents=True, exist_ok=True)
            ctx.storage_state(path=str(SESSION_FILE))
            SESSION_FILE.chmod(0o600)
            print(f"Saved Instagram session to {SESSION_FILE}", flush=True)
            break
        time.sleep(2)
    else:
        print("Timed out: no login detected. Run it again.", flush=True)
    browser.close()
