# The Cosmic Vault — HP Laptop Automation & Setup Guide

This guide details how to set up, deploy, and run the 100% autonomous **YouTube Shorts & TikTok** generation pipeline on your **HP laptop** (`192.168.1.209` running Ubuntu / Linux).

---

## 1. Quick Transfer from Mac to HP Laptop

From your Mac terminal in `/Users/saad/MoneyPrinterTurbo`, run:

```bash
./deploy_to_laptop.sh
```

This will:
1. Verify network connectivity to `saad@192.168.1.209`.
2. Package a clean, lightweight production archive (`MoneyPrinterTurbo-bundle.tar.gz`) containing:
   - Complete pipeline source code (`app/`, `webui/`, `autopilot.py`, etc.)
   - All API keys and settings pre-configured (`config.toml`)
   - Your active, authenticated TikTok session (`storage/tiktok_session.json` — no need to log in again!)
   - All 6 Content-ID-immune, phone-audible cosmic audio tracks (`resource/songs/`)
   - Fast Linux installer (`setup_linux.sh`)
3. Securely transfer the bundle directly to `saad@192.168.1.209:~/`.

---

## 2. Setting Up on the HP Laptop (3 Commands)

SSH into your HP laptop from your Mac terminal:

```bash
ssh saad@192.168.1.209
```

Once logged into your HP laptop, run:

```bash
# 1. Extract the bundle
mkdir -p ~/MoneyPrinterTurbo && tar -xzf ~/MoneyPrinterTurbo-bundle.tar.gz -C ~/MoneyPrinterTurbo

# 2. Navigate to directory
cd ~/MoneyPrinterTurbo

# 3. Run the automated Linux installer
./setup_linux.sh
```

### What `./setup_linux.sh` does automatically:
- Installs system packages (`ffmpeg`, `curl`, `git`) via `apt`.
- Installs `uv` (fast Python environment manager).
- Builds the Linux virtual environment (`uv sync`).
- Installs Playwright Chromium and all Linux browser libraries (`uv run playwright install chromium --with-deps`).
- Validates that `config.toml` and `storage/tiktok_session.json` are in place.

---

## 3. Testing Video Generation & Publishing

On the HP laptop, run a test to generate and cross-post 1 video:

```bash
uv run python autopilot.py --count 1
```

To run without uploading (rendering only):
```bash
uv run python autopilot.py --count 1 --no-upload
```

---

## 4. 24/7 Automation (Cron Scheduling)

To have your HP laptop autonomously create and publish 3 viral videos every day without you touching anything:

1. Open crontab on your HP laptop:
   ```bash
   crontab -e
   ```

2. Paste this line at the bottom (publishes 1 video at **9:00 AM**, 1 at **2:00 PM**, and 1 at **7:00 PM** daily):
   ```cron
   0 9,14,19 * * * cd /home/saad/MoneyPrinterTurbo && /home/saad/.local/bin/uv run python autopilot.py --count 1 >> /home/saad/MoneyPrinterTurbo/storage/cron.log 2>&1
   ```

3. Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

## 5. Key Architecture & Settings

- **Narrator Voice:** `en-US-AndrewMultilingualNeural` at **1.25x speed** (punchy, high-retention cadence).
- **Clip Transitions:** Every **2.0 seconds** for fast, dynamic visual pacing.
- **Background Music:** 100% royalty-free, Content-ID-immune ambient music tuned with 220–660 Hz mid-range harmonics audible on mobile phone speakers (`bgm_volume = 0.28`).
- **Platforms:**
  - **YouTube Shorts:** Auto-published via Upload-Post free tier API.
  - **TikTok:** Auto-published via Playwright session uploader (`storage/tiktok_session.json`) at $0 cost.
