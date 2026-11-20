# Cosmic Vault — Agent Handoff Notes

> **Last session:** 2026-10-10
> **Scope:** Autonomous production and dual-platform upload of 3 new cosmic mystery shorts (Oumuamua, CMB Cold Spot, PSR B1257+12), bringing total live catalog to 49 videos, and automated local storage cleanup.
> **Read this before touching `tools/produce_and_upload_cosmic_batch.py`, `tools/produce_and_upload_cosmic_batch_2.py`, `tools/produce_and_upload_cosmic_batch_3.py`, `tools/produce_and_upload_cosmic_2pack.py`, `tools/produce_and_upload_cosmic_2pack_part2.py`, `tools/produce_and_upload_cosmic_2pack_part3.py`, `tools/produce_and_upload_cosmic_2pack_part4.py`, `tools/produce_and_upload_cosmic_2pack_part5.py`, `tools/produce_and_upload_cosmic_3pack.py`, `tools/produce_and_upload_cosmic_3pack_part2.py`, `tools/produce_and_upload_cosmic_3pack_part3.py`, `tools/produce_and_upload_cosmic_3pack_part4.py`, `tools/produce_and_upload_cosmic_3pack_part5.py`, `tools/produce_and_upload_cosmic_3pack_part6.py`, the avatar updaters, or running a new dashboard batch — it explains several non-obvious bugs that will resurface if you don't know about them.**

> **Music credit (2026-10-03):** most `resource/songs/` tracks are Audionautix (Jason Shaw), CC BY 4.0 — a credit is legally required. `app/services/music_credit.py` adds it (`add_youtube_credit`, `add_short_credit`); wired into `tools/produce_and_upload_cosmic_2pack_part4.py`, `tools/produce_and_upload_cosmic_3pack_part4.py`, `tools/produce_and_upload_cosmic_3pack_part5.py`, and `tools/produce_and_upload_cosmic_3pack_part6.py`. **Every new batch script copied from it must keep those two calls.** Videos uploaded before this date have no credit.

> **NEW CONTENT AGENT? Start at [`CONTENT_START_HERE.md`](CONTENT_START_HERE.md)** (status of both channels, rules, pipelines, quality gate).

> **Another You:** "The Lantern Job" (6 parts) COMPLETE and live (2026-10-31) → [`LANTERN_JOB_SERIES.md`](LANTERN_JOB_SERIES.md). Cosmic Vault (~76 videos): "unexplained mysteries" relaunch approved, not started.

> **Content strategy for BOTH channels:** [`CHANNEL_PLAYBOOK.md`](CHANNEL_PLAYBOOK.md) — read it before writing or producing anything. Cosmic Vault is broadening to "unexplained mysteries" with storytelling scripts, energetic narration, matching visuals (NASA imagery first) and 1–2 uploads/day.

> **Second channel "Another You"** (2D stick-figure stories) is documented in [`STICK_CHANNEL_GUIDE.md`](STICK_CHANNEL_GUIDE.md). Its logins are separate: `storage/sessions/anotheryou_*_session.json` — the default `storage/*_session.json` files remain Cosmic Vault's.

---

## 1. Current live state

**YouTube + TikTok — 49 videos live** (all under the Cosmic Vault brand, `@cosmicvault8` on TikTok, `@cosmicvault-y9t` on YouTube):

| # | Title | Source | Notes |
|---|---|---|---|
| 1-6 | Wow! Signal, The Bloop, Tabby's Star, Tunguska, Ball Lightning, Fermi Paradox | `tools/produce_and_upload_cosmic_batch.py` | Videos 1-2 have old choppy narration (left live per user decision); 3-6 use the fixed storytelling prompt |
| 7-9 | Dyatlov Pass, Taos Hum, Voynich Manuscript | WebUI dashboard (`webui.sh`) | See §4 below |
| 10-15 | Moon Ringing Like a Bell, The Vela Incident, Patomsky Crater, Ghost Cosmonauts, Rogue Planet CFBDSIR 2149, FRB 121102 | `tools/produce_and_upload_cosmic_batch_2.py` | Batch 2: Comma sanitization, custom hero covers, 2-3 word yellow cues |
| 16-21 | The Eltanin Antenna, The Carrington Event, The Hessdalen Lights, The Galactic Center Burster, The Methuselah Star, The Marfa Lights | `tools/produce_and_upload_cosmic_batch_3.py` | Batch 3: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues |
| 22-23 | The Black Knight Satellite, Hoag's Object (The Impossible Galaxy) | `tools/produce_and_upload_cosmic_2pack.py` | 2-Pack Part 1: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues |
| 24-25 | The BLC1 Signal (Proxima Centauri), Saturn's Hexagon Storm | `tools/produce_and_upload_cosmic_2pack_part2.py` | 2-Pack Part 2: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues |
| 26-28 | The Star That Never Stops (S5-HVS1), Titan's Islands?, The Ghost Galaxy That Broke Physics (Dragonfly 44) | `tools/produce_and_upload_cosmic_3pack.py` | 3-Pack: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags (#fyp, #spacetok, #trending, #shorts) |
| 29-31 | The Universe Has A Hole In It (Boötes Void), The Planet Made of Diamond (55 Cancri e), This Star Eats 6 Planets (Stephenson 2-18) | `tools/produce_and_upload_cosmic_3pack_part2.py` | 3-Pack Part 2: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, automated post-upload cleanup |
| 32-34 | This Blue Planet Rains Glass Sideways (HD 189733b), Black Hole Swallows 11 Solar Systems (TON 618), The Diamond Planet That Should Not Exist (PSR J1719-1438) | `tools/produce_and_upload_cosmic_3pack_part3.py` | 3-Pack Part 3: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, automated post-upload cleanup |
| 35-36 | The Star Aiming At Earth (WR 104), Colder Than Space? The Boomerang Nebula | `tools/produce_and_upload_cosmic_2pack_part3.py` | 2-Pack Part 3: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, automated post-upload cleanup |
| 37-38 | We Are Falling Into This Unseen Trap (The Great Attractor), Burning Ice Planet (Gliese 436b) | `tools/produce_and_upload_cosmic_2pack_part4.py` | 2-Pack Part 4: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, automated post-upload cleanup |
| 39-40 | Iron Rains From The Sky (WASP-76b), This Planet Is Darker Than Black (TrES-2b) | `tools/produce_and_upload_cosmic_2pack_part5.py` | 2-Pack Part 5: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, automated post-upload cleanup |
| 41-43 | The Star That Died Twice (iPTF14hls), Planet Being Eaten Alive (WASP-12b), This Planet Has Rings 200x Bigger Than Saturn (J1407b) | `tools/produce_and_upload_cosmic_3pack_part4.py` | 3-Pack Part 4: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, Audionautix CC BY 4.0 music attribution, automated post-upload cleanup |
| 44-46 | Planet Survived Inside a Star (Kepler-70b), The Universe Is Lying To Us (Hercules Great Wall), The Planet With A Boiling Frozen Ocean (GJ 1214b) | `tools/produce_and_upload_cosmic_3pack_part5.py` | 3-Pack Part 5: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, Audionautix CC BY 4.0 music attribution, robust scroll viewport click handling, automated post-upload cleanup |
| 47-49 | The Alien Rock That Baffled NASA (Oumuamua), The Hole in the Sky (CMB Cold Spot), 3 Ghost Planets Orbiting A Dead Star (PSR B1257+12) | `tools/produce_and_upload_cosmic_3pack_part6.py` | 3-Pack Part 6: Comma sanitization, custom hero covers, Pexels/Pixabay rotation, 2-3 word yellow cues, viral hashtags, Audionautix CC BY 4.0 music attribution, automated post-upload cleanup |

**Profile picture:** live on both platforms — a black hole/accretion disk logo (`storage/cosmic_vault_avatar.jpg`, 1024x1024 — Pollinations FLUX caps out there regardless of requested size; note neither platform needs more than that anyway).

**Disk:** Automated post-upload cleanup in `tools/produce_and_upload_cosmic_3pack_part5.py` and local purge of raw audio dumps/tar bundles kept `storage/` at **2.4 MB** with **44 GB free disk space** available.

**CPU & Battery:** On 2026-10-01, two runaway zombie extension host processes (`PID 16802` and `PID 60665`) that had been continuously pegging 200% CPU and leaking 8.2 GB of RAM were terminated, eliminating the background battery drain on the MacBook.

**config.toml:** `pollinations_api_key` is back to its real value (was temporarily blanked mid-session to stop the WebUI's auto "hero video clip" feature — see §3). Don't blank it without restoring it afterward; the batch script (`tools/produce_and_upload_cosmic_batch.py`) does its own temporary blank/restore internally around just the materials-download stage, which is fine and self-contained.

---

## 2. Bugs found this session (will bite you again if you don't know about them)

### 2a. Subtitle generation silently breaks on comma-dense sentences
**Symptom:** a rendered video has zero subtitles, no error shown to the user — only a WARNING buried in logs: `edge cues still have unmatched text after aggregation` followed by `failed, sub_items len: 1, script_lines len: N`.

**Root cause:** `app/services/voice.py` (`_build_subtitle_items_from_edge_cues`, `create_subtitle`) tries to align edge-tts's word-boundary cues against `script_lines` produced by `app/utils/utils.py:split_string_by_punctuations`, which splits on **every comma**. A sentence like `"In 1991, a man in Taos, New Mexico, started..."` (comma-heavy, especially a mid-sentence appositive like `", New Mexico,"`) throws the alignment off enough that it fails for the **entire script**, not just that sentence — confirmed reproducible, not a transient network glitch.

**Fix that works:** rewrite the script with minimal/no commas (short standalone sentences with periods instead of comma clauses). Confirmed twice this session: the exact same script with commas stripped out generated subtitles successfully on the first try both times.

**Action for next agent:** when generating scripts for the WebUI dashboard path, either (a) post-process the LLM's script to strip non-essential commas before pasting into the Video Script field, or (b) add an explicit rule to whatever prompt generates the script: *"avoid mid-sentence comma clauses, especially around place names or appositives — prefer short standalone sentences over comma-joined ones."* This is a real engine bug in `app/services/voice.py`, not something specific to our prompt — worth fixing at the source if you have time (look at `_match_script_line` / `_build_subtitle_items_from_edge_cues` around line 1950-2130 of `app/services/voice.py`).

### 2b. Pollinations auto-adds Ken Burns motion clips you may not want
**Symptom:** background footage includes slow-zoom AI-generated clips mixed into otherwise-static stock footage, without you asking for it.

**Root cause:** whenever `pollinations_api_key` is set AND `match_materials_to_script` / "Match Visuals to Script Order" is on, `app/services/material.py`'s `_download_videos_by_script_order` automatically calls `pollinations_service.generate_hero_video_clips()`, which generates up to 4 AI stills and converts them to **zoom/pan motion clips** (not static images). This fires from both the WebUI dashboard and `tools/produce_and_upload_cosmic_batch.py` alike — it's an engine-level default, not opt-in.

**If you want static-only AI stills** (2s, no motion) instead: don't rely on the engine's built-in feature. `tools/produce_and_upload_cosmic_batch.py` already does this correctly — it blanks `pollinations_api_key` during the materials-download stage (so the built-in motion-clip feature never fires), then separately calls `pollinations_service.generate_image()` + its own `convert_image_to_hero_clip()` (static encode, no zoompan) after materials finish, via the `generate_extra_background_stills()` helper it defines locally.

**If using the raw WebUI dashboard** and you don't want motion clips: blank `pollinations_api_key` in `config.toml` before submitting, OR just don't set a Pollinations key at all for that session. There's no per-request toggle in the Settings UI for this (checked — `webui/Main.py` has zero references to `pollinations_api_key`, it's config-file-only).

### 2c. Groq `qwen/qwen3.8-27b` has a hard output-token cap
The account's on-demand tier caps this model at **1000 output tokens/request** (`Limit 1000, Requested 1800` error at higher settings). If you expand the LLM output schema (e.g. add more fields like `sentences[]`), watch for `json_validate_failed` / rate-limit errors and dial `max_tokens` back down. Current setting in `tools/produce_and_upload_cosmic_batch.py`'s `generate_video_concept()`: `max_tokens=1000`.

### 2d. Coverr's API is currently broken server-side
`search_videos_coverr` in `app/services/material.py` returns `coverr video search returned an unsupported response` for every query — not our bug, their API. Both `coverr`-assigned videos in the original 6-video batch failed until reassigned to `pexels`/`pixabay`. Don't route new videos through `coverr` until this is independently verified fixed.

### 2e. Pixabay has thin coverage for specific human-scenario search terms
For "a man washing dishes / talking to a plumber" style narrow human-action terms, Pixabay returned **0 results for ~7 of 12 search terms** in one test (vs. Pexels which reliably returns 10-20+ results per term for the same kind of query). The engine's fallback (looping existing clips to fill remaining duration) kept the video functional, but with more repetition than intended. **Prefer Pexels for anything involving specific human actions/scenarios; Pixabay seems fine for nature/space/object-only terms** (not rigorously tested, just an observation from this session).

---

## 3. What changed in `tools/produce_and_upload_cosmic_batch.py`

This is the "headless batch" pipeline (as opposed to the WebUI dashboard path — see §4). Changes made this session, in order:

1. **Background footage provider rotation** — `video_source` was hardcoded to `"pexels"` for every video despite Pixabay/Coverr keys being configured and unused. Now each entry in `BATCH_CONCEPTS` has its own `"video_source"` field (rotated across pexels/pixabay; coverr avoided per §2d).
2. **`SYSTEM_PROMPT` rewritten for storytelling tone.** The original produced dry, lecture-style, jargon-heavy narration ("Scientists observed...", "the data indicates..."). Now explicitly demands plain-English, story-first narration ("put the listener inside the moment"), bans documentary-narrator phrasing, and requires natural varied sentence length (mixing 4-7 word punches with 12-20 word flowing sentences) — the original attempt at "punchy" over-corrected into pure 3-5 word fragments that sounded robotic; this was caught and fixed mid-session.
3. **`sentences` + `visual_terms` alignment.** The LLM now outputs a `sentences[]` array (the script split one-per-entry, in order) alongside `visual_terms[]` with **exactly one term per sentence, in matching order** — this is what actually keeps background footage in sync with narration (previously `visual_terms` was just a loose 20-30 item pool with no ordering guarantee against the script, so what showed on screen had no real connection to what was being said). Also added a rule against unfilmable/impossible visual terms (e.g. "missing eye socket" won't return real stock footage and makes sync worse, not better).
4. **`generate_extra_background_stills()`** — new function, generates 3-4 unique Pollinations AI **static** stills (2s each, no motion) per video, interleaved evenly among the stock clips. This is deliberately separate from the engine's built-in motion-clip feature (see §2b) — the user explicitly wants static images, not zoom/pan clips.
5. **Subtitle styling** brought in line with the proven high-retention spec from `2D_ANIMATION_PLAN.md`: `#FFF200` yellow fill (was white), position `78.0%` (was `75.0`), stroke width `2.8` (was `2.5`), font size `56` (was `58`).
6. **Voice rate** dropped from `1.25x` to `1.15x` for more natural, less rushed delivery.
7. **`max_tokens`** raised then had to be brought back down to `1000` (see §2c).

**Known limitation left as-is:** videos 1-2 of the original 6-video batch (Wow Signal, The Bloop) still have the old choppy narration — the user explicitly said to leave them live rather than delete/redo.

---

## 4. WebUI dashboard workflow (new this session)

The user asked to use the actual MoneyPrinterTurbo dashboard (`webui.sh` → Streamlit app) instead of the headless batch script, to produce 3 more videos. Process used, repeatable for future runs:

1. Generate script + `sentences`/`visual_terms` headlessly using the *same* tuned Groq prompt from `tools/produce_and_upload_cosmic_batch.py` (import `generate_video_concept` from it, or copy the `SYSTEM_PROMPT`) — the dashboard's own built-in script generation is a **different, more generic prompt** that does not have the storytelling-tone/sentence-alignment fixes from §3. Don't rely on the dashboard's "Generate Script & Keywords with AI" button for Cosmic Vault content.
2. Launch the dashboard: `.claude/launch.json` has a `mpt-webui` entry (`sh webui.sh`, port 8501) — use `preview_start` with `name: "mpt-webui"`, not raw Bash, to keep it visible/manageable. It auto-picks the next free port if 8501 is busy (watch the logs for the actual port, e.g. it moved to 8502 once this session after a restart).
3. Paste into the UI: **Video Subject**, **Video Script** (full script text — watch the comma bug, §2a), **Video Keywords** (comma-joined `visual_terms`, same order as sentences). Select **Video Source** manually per video for rotation.
4. Configure once per server session (persists to `config.toml` `[ui]` section across fresh page loads, but resets if the server restarts): Voice = `en-US-AndrewMultilingualNeural-Male`, Speed = `1.1x` (closest dropdown option to 1.15), Max Clip Duration = `2`, subtitle Position `78.0`, Color `#FFF200`, Font Size `56`, Outline Width `2.80`. **"Match Visuals to Script Order" is on by default — leave it on.**
5. Click **Generate Video**, watch `preview_logs` for the `generate_subtitle` step specifically — if you see the "unmatched text" warning, the video will have **zero subtitles** and you should stop, fix the script (§2a), and resubmit rather than let it finish and re-render.
6. Once rendered, publish using the **existing Playwright uploaders** (`app/services/youtube_uploader.py`, `app/services/tiktok_uploader.py`) directly — a small throwaway script works fine, see the pattern already established in `tools/upload_cosmic_vault_5.py`. The dashboard *does* have `upload_post.com` (YouTube) and a native TikTok publish path wired into `config.toml` (`upload_post_enabled`, `tiktok_upload_enabled`) but this was not exercised this session — the Playwright uploaders are the proven, working path.

**Known limitation:** the dashboard's own subtitle pipeline does not apply the punchy 2-3-word caption chunking (`split_srt_into_short_cues`) that `tools/produce_and_upload_cosmic_batch.py` does — it burns in full-sentence cues instead. That post-processing function only exists in the standalone script. If you want short-chunk captions via the dashboard path, you'd need to either post-process `subtitle.srt` before the final render step (not currently exposed as a UI action — would need code changes) or stick to the headless batch script for anything where caption chunking matters.

---

## 5. Profile picture automation (new this session)

Two new files, both following the exact pattern of the existing video uploaders (Playwright + `storage_state` session reuse):

- **`app/services/youtube_avatar_updater.py`** — `YouTubeAvatarUpdater.update_avatar(image_path, headless=True)`. **Non-obvious gotcha already fixed in the code:** the customization page has **two** file inputs / "Upload" buttons — one for the channel **Banner**, one for the **Picture** — and a naive `input[type='file']` selector grabs the Banner's input first. The fixed version defensively clears any existing banner first (so both buttons read "Upload", in known DOM order Banner=0/Picture=1) and targets `nth(1)`. Also handles YouTube's occasional "unsupported browser" interstitial (click "SKIP TO YOUTUBE STUDIO"). Publish must happen in the **same Playwright session** as the upload — reloading a fresh page loses unsaved edits.
- **`app/services/tiktok_avatar_updater.py`** — `TikTokAvatarUpdater.update_avatar(image_path, headless=True)`. Only one file input here, no ambiguity. **Non-obvious gotcha:** the Save button click succeeds but the change is **asynchronous server-side** — closing the browser under ~5s after clicking Save can abort the in-flight request even though the click registered. Fixed version waits 12s then reloads in the same session to verify before returning success.

Both were manually verified working end-to-end this session (screenshots confirmed the new avatar live on both platforms).

---

## 6. Status/tracking files on disk

- `storage/cosmic_3pack_part6_status.json` — per-video production and upload status for 3-pack Part 6 (`cosmic_oumuamua`, `cosmic_cmb_cold_spot`, `cosmic_pulsar_planets`). Produced via `tools/produce_and_upload_cosmic_3pack_part6.py`.
- `storage/cosmic_3pack_part5_status.json` — per-video production and upload status for 3-pack Part 5 (`cosmic_kepler_70b`, `cosmic_hercules_wall`, `cosmic_gj_1214b`). Produced via `tools/produce_and_upload_cosmic_3pack_part5.py`.
- `storage/cosmic_3pack_part4_status.json` — per-video production and upload status for 3-pack Part 4 (`cosmic_zombie_star`, `cosmic_wasp_12b`, `cosmic_j1407b`). Produced via `tools/produce_and_upload_cosmic_3pack_part4.py`.
- `storage/cosmic_2pack_part5_status.json` — per-video production and upload status for 2-pack Part 5 (`cosmic_wasp_76b`, `cosmic_tres_2b`). Produced via `tools/produce_and_upload_cosmic_2pack_part5.py`.
- `storage/cosmic_2pack_part4_status.json` — per-video production and upload status for 2-pack Part 4 (`cosmic_great_attractor`, `cosmic_gliese_436b`). Produced via `tools/produce_and_upload_cosmic_2pack_part4.py`.
- `storage/cosmic_2pack_part3_status.json` — per-video production and upload status for 2-pack Part 3 (`cosmic_wr104_death_star`, `cosmic_boomerang_nebula`). Produced via `tools/produce_and_upload_cosmic_2pack_part3.py`.
- `storage/cosmic_3pack_part3_status.json` — per-video production and upload status for 3-pack Part 3 (`cosmic_glass_rain_planet`, `cosmic_ton_618`, `cosmic_pulsar_diamond`). Produced via `tools/produce_and_upload_cosmic_3pack_part3.py`.
- `storage/cosmic_3pack_part2_status.json` — per-video production and upload status for 3-pack Part 2 (`cosmic_bootes_void`, `cosmic_55_cancri_e`, `cosmic_stephenson_2_18`). Produced via `tools/produce_and_upload_cosmic_3pack_part2.py`.
- `storage/cosmic_3pack_status.json` — per-video production and upload status for 3-pack with viral hashtags (`cosmic_s5_hvs1_star`, `cosmic_titan_magic_islands`, `cosmic_dragonfly_44`). Produced via `tools/produce_and_upload_cosmic_3pack.py`.
- `storage/cosmic_2pack_part2_status.json` — per-video production and upload status for 2-pack Part 2 (`cosmic_blc1_signal`, `cosmic_saturn_hexagon`). Produced via `tools/produce_and_upload_cosmic_2pack_part2.py`.
- `storage/cosmic_2pack_status.json` — per-video production and upload status for 2-pack (`cosmic_black_knight`, `cosmic_hoags_object`). Produced via `tools/produce_and_upload_cosmic_2pack.py`.
- `storage/cosmic_batch_3_status.json` — per-video production and upload status for Batch 3 (`cosmic_eltanin_antenna`, `cosmic_carrington_event`, `cosmic_hessdalen_lights`, `cosmic_galactic_burster`, `cosmic_methuselah_star`, `cosmic_marfa_lights`). Produced via `tools/produce_and_upload_cosmic_batch_3.py`.
- `storage/cosmic_batch_2_status.json` — per-video production and upload status for Batch 2 (`cosmic_moon_bell`, `cosmic_vela_incident`, `cosmic_patomsky_crater`, `cosmic_ghost_cosmonauts`, `cosmic_rogue_planet`, `cosmic_frb_repeater`). Produced via `tools/produce_and_upload_cosmic_batch_2.py`.
- `storage/cosmic_batch_6_status.json` — per-video upload status for the original 6-video headless batch (keys: `cosmic_wow_signal`, `cosmic_the_bloop`, `cosmic_tabbys_star`, `cosmic_tunguska`, `cosmic_ball_lightning`, `cosmic_fermi_paradox`).
- `storage/dashboard_3_upload_status.json` — per-video upload status for the 3 WebUI-dashboard videos (`dyatlov_pass`, `taos_hum`, `voynich_manuscript`).
- `storage/upload_cosmic_5_status.json`, `storage/cosmic_batch_5_new_status.json` — older pre-existing batches from before this session, already fully uploaded (10 videos, task folders already cleared from disk per §1).

---

## 7. Suggested next steps (not done this session, worth considering)

- Fix the comma-splitting bug at the source (`app/services/voice.py` / `app/utils/utils.py:split_string_by_punctuations`) rather than working around it per-script — would remove an entire class of silent failures for any future content.
- Decide whether to redo/delete the 2 old choppy-narration videos (Wow Signal, The Bloop) — user explicitly deferred this decision, still pending.
- If continuing to use the WebUI dashboard path regularly, consider wiring the short-chunk subtitle post-processing (`split_srt_into_short_cues`) into the dashboard's own pipeline so it's not exclusive to the headless script.
- Monitor Coverr's API — currently broken, may recover; re-test before routing videos through it again.
- `storage/cache_videos` and `storage/tasks` will keep growing with normal use — no automated cleanup exists; re-run the manual cleanup from §1 periodically.
