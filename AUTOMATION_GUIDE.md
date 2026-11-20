# The Cosmic Vault — Autonomous Video Pipeline & Operating Guide

> **Current Status:** Phase 1 Fully Operational & Verified (Live on YouTube Shorts)  
> **Brand / Channel:** The Cosmic Vault (`@cosmicvault-y9t`)  
> **Google Account:** `cosmicvault80@gmail.com`  
> **Upload-Post Profile:** `Cosmic_Vault`  
> **Last Updated:** 2026-09-07  

---

## 1. What This System Does

This pipeline is a **100% hands-off, automated short-form video production and publishing engine**. It eliminates all manual prompting, video editing, voice recording, subtitle burning, and manual uploading.

```
┌─────────────────────────┐
│ 1. Topic & Script Gen   │  Groq (qwen/qwen3.8-27b) generates 160-180 word script
│                         │  with a 3-second hook & seamless infinite loop.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. Visual Keyword Plan  │  Generates 16-20 diverse, scene-by-scene search terms
│                         │  (e.g., telescopes, foggy forests, deep space nebulas).
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. Voiceover & Audio    │  Microsoft Edge-TTS (en-US-ChristopherNeural)
│                         │  renders natural, cinematic documentary voiceover.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 4. Footage Download     │  Pexels & Pixabay APIs download matching HD vertical (9:16)
│                         │  video clips, cut to 3 seconds per scene.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 5. FFmpeg Assembly      │  Stitches clips, syncs subtitles at 70% safe-zone height,
│                         │  and mixes dynamic background music.
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 6. YouTube Auto-Upload  │  Upload-Post API publishes video directly to YouTube Shorts
│                         │  with optimized title, description, and hashtags.
└─────────────────────────┘
```

---

## 2. Key Files in This Repository

| File | Purpose | Notes |
|---|---|---|
| [`autopilot.py`](file:///Users/saad/MoneyPrinterTurbo/autopilot.py) | **The Master Autopilot Script** | Generates scripts, compiles video, and auto-publishes to YouTube Shorts & TikTok. |
| [`tiktok_login.py`](file:///Users/saad/MoneyPrinterTurbo/tiktok_login.py) | **TikTok One-Time Login Helper** | Interactive browser login that exports persistent session to `storage/tiktok_session.json`. |
| [`app/services/tiktok_uploader.py`](file:///Users/saad/MoneyPrinterTurbo/app/services/tiktok_uploader.py) | **Autonomous TikTok Uploader** | Headless Playwright engine that posts videos, captions, and tags for $0. |
| [`test_tiktok_upload.py`](file:///Users/saad/MoneyPrinterTurbo/test_tiktok_upload.py) | **TikTok Upload Tester** | Tests upload using an existing MP4 without re-rendering a new video. |
| [`config.toml`](file:///Users/saad/MoneyPrinterTurbo/config.toml) | **Global Pipeline Configuration** | API keys (Groq, Pexels, Pixabay, Upload-Post), subtitle positioning, TikTok toggle. |
| [`webui.sh`](file:///Users/saad/MoneyPrinterTurbo/webui.sh) | **Dashboard Launcher** | Starts the Streamlit visual dashboard on [http://127.0.0.1:8501](http://127.0.0.1:8501). |
| [`storage/tasks/`](file:///Users/saad/MoneyPrinterTurbo/storage/tasks/) | **Task Artifact Storage** | Stores generated scripts, SRT subtitles, MP3 voiceovers, and final MP4 videos. |

---

## 3. Core Technical Upgrades & Solved Flaws

### A. Subtitle Safe Zone (70% Height Anchor)
* **Problem:** Default `subtitle_position = "bottom"` placed captions at 95% height, directly behind YouTube's mobile interface (channel handle, subscribe button, sound name, and title).
* **Fix in [`config.toml`](file:///Users/saad/MoneyPrinterTurbo/config.toml) & [`autopilot.py`](file:///Users/saad/MoneyPrinterTurbo/autopilot.py):**
  ```toml
  subtitle_position = "custom"
  custom_position = 70.0
  ```
* **Result:** Captions now sit in the universal short-form safe zone — fully visible, centered, and unobstructed on both YouTube Shorts and TikTok.

### B. The 60-Second+ Monetization Rule
* **Rule:** TikTok Creator Rewards pays ~$0.50 to $1.00 RPM, but strictly requires videos to be **at least 61 seconds**. YouTube Shorts pays ad revenue on any video under 60 seconds (up to 3 minutes).
* **Fix in [`autopilot.py`](file:///Users/saad/MoneyPrinterTurbo/autopilot.py):**
  * Script length tuned to **160–180 words**.
  * Spoken duration ranges from **62 to 74 seconds**.
  * Every generated video qualifies for **BOTH** YouTube Shorts and TikTok Creator Rewards.

### C. The Seamless Infinite Loop ♾️
* **Formula:** The script ends with an incomplete connector phrase (e.g. *"Which is..."*, *"And that is..."*) that grammatically flows into the first words of the opening hook sentence.
* **Result:** When YouTube or TikTok loops the video, the viewer experiences one continuous, unbroken sentence, driving average percentage viewed (APV) above 100%.

### D. Beat-by-Beat Visual Variation
* **Rule:** Instead of broad queries like `"space"`, the engine generates 16–20 specific scene queries (e.g. `metallic asteroid surface`, `astronomer silhouette`, `radar tracking screen`, `dark void nebula`).
* Cuts occur every **3 seconds** to maintain relentless visual engagement.

---

## 4. Operational Commands

### 1. Generate & Publish 1 Video Right Now:
```bash
cd /Users/saad/MoneyPrinterTurbo
uv run python autopilot.py --count 1
```

### 2. Generate & Publish a Daily Batch (e.g., 4 Videos):
```bash
cd /Users/saad/MoneyPrinterTurbo
uv run python autopilot.py --count 4
```

### 3. Generate on a Specific Topic:
```bash
cd /Users/saad/MoneyPrinterTurbo
uv run python autopilot.py --topic "The Great Filter: Why is the universe completely silent?"
```

### 4. Open the Visual WebUI Dashboard:
```bash
cd /Users/saad/MoneyPrinterTurbo
./webui.sh
```
Access in your browser at: **[http://127.0.0.1:8501](http://127.0.0.1:8501)**

---

## 5. Automated Scheduling via Cron

To automatically produce and publish **1 video every 4 hours** during peak viewing times (9 AM, 1 PM, 5 PM, 9 PM) without opening a terminal:

Open crontab:
```bash
crontab -e
```

Add this schedule:
```cron
0 9,13,17,21 * * * cd /Users/saad/MoneyPrinterTurbo && uv run python autopilot.py --count 1 >> /tmp/cosmic-vault.log 2>&1
```

---

## 6. Live Production Proof

| Video Title | Duration | YouTube URL | Status |
|---|---|---|---|
| **The Dark Forest Theory** | 42s (prototype) | [Watch on YouTube](https://www.youtube.com/watch?v=85q0JdDgfpE) | ✅ Live |
| **Oumuamua: The Object That Broke Physics** | 73.3s (60s+ Safe Zone) | [Watch on YouTube](https://www.youtube.com/watch?v=o7jfYaH4XcU) | ✅ Live |

---

## 7. Scaling Roadmap (HP Laptop & TikTok)

1. **Current State:** Running cleanly on MacBook via `autopilot.py` at 1–5 videos/day for YouTube Shorts.
2. **Next Milestone:**
   * Clone/sync `/Users/saad/MoneyPrinterTurbo` to HP Linux Mint laptop (`192.168.1.209`).
   * Add local session uploader for TikTok to avoid third-party API subscription costs.
   * Pipe execution logs and upload alerts to the **Cortex Multi-Agent Dashboard** (`localhost:7777` + Telegram).
   * Launch Channel #2 (AI Automations & Tech) to cross-promote Saad's B2B AI Chatbot agency.
