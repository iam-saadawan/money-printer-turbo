"""Open YouTube Studio in a visible window using an existing saved session so the user can pass Google's
'Verify it's you' check themselves. The refreshed session is saved every 10 s and when the window closes.
Usage: .venv/bin/python tools/youtube_reverify.py [session_json]"""
import sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
SESSION = Path(sys.argv[1] if len(sys.argv) > 1 else "/Users/saad/MoneyPrinterTurbo/storage/youtube_session.json")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
with sync_playwright() as p:
    b = p.chromium.launch(headless=False, args=["--disable-blink-features=AutomationControlled"])
    c = b.new_context(storage_state=str(SESSION), viewport={"width": 1280, "height": 850}, user_agent=UA)
    pg = c.new_page(); pg.goto("https://studio.youtube.com", wait_until="domcontentloaded")
    print("Window open — verify in it, then close the window.", flush=True)
    try:
        while b.is_connected() and c.pages:
            c.storage_state(path=str(SESSION)); time.sleep(10)
    except Exception:
        pass
    print("Saved", SESSION, flush=True)
