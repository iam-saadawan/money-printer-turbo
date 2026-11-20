# Content Agent — START HERE

> **2026-11-18: new agents start with `AGENT_HANDOFF_CLIPPING.md` (Side Quest) or `AGENT_HANDOFF_ANOTHER_YOU.md` (cartoon channel).**
> **Last updated:** 2026-11-15. Read this first, then the doc for the channel you're working on.
> Saad's Second Brain mirrors this: `~/Second Brain/brain/references/2026-11-04_CONTENT-CHANNELS-HANDOFF.md`,
> `clients/content_channels/` (rules, preferences, profile, history), `directives/another_you_episode.md`,
> `skills/SKILL_BIBLE_2d_story_animation.md`.

## 1. Current status
| Channel | Status | Next |
|---|---|---|
| **Another You** (2D stick-figure "You" stories) — YT `UCJgTIuV9xpqGY_hqmmZwZ-Q`, TikTok `@another.you98` | **The Lantern Job, 6 parts, COMPLETE and live** (links in `LANTERN_JOB_SERIES.md`). The Wallet also live. | Ask Saad for the next story/series (he likes multi-part, any genre, grounded logic). |
| **Cosmic Vault** (space/mystery facts) — YT `@cosmicvault-y9t`, TikTok `@cosmicvault8` | ~76 videos/platform, low views | Approved relaunch as "unexplained mysteries" (better scripts, energetic narration, matching visuals, 1–2/day) — not started; review analytics first. See `CHANNEL_PLAYBOOK.md`, `AGENT_HANDOFF_NOTES.md`. |

Pollinations balance ≈ **2.8 free pollen** — runs only `flux.2-klein-4b` (0.005/img). Free APIs only.

## 2. Non-negotiables
1. Script approval before spending pollen. Upload only when Saad says "upload"; verify in YouTube Studio afterwards.
2. **Watch every render at 1 frame / 1.5 s before sending.** Never say "fixed" for something you haven't looked at.
3. Sequential part numbers (no "4A/4B"). Shorts ≤ 178 s; longer → regular video with `is_short=False`.
4. Licensed music only; Another You default = no music. Voice `en-US-AndrewMultilingualNeural` +10%.
5. No CAPTCHAs, no account creation, no passwords, no API keys in chat.

## 3. Which pipeline
| Use | Tool | Notes |
|---|---|---|
| **Another You episodes (standard)** | `tools/layered_story.py` (assets / sheet / render) + `tools/layered_render.py` | Script written as Python: copy `storage/stick_episodes/lantern_p6/build_script.py`. See `STICK_CHANNEL_GUIDE.md` §15. |
| Old full-scene method (Parts 1–3) | `tools/stick_story.py` | Kept for reference; frames broke too often. |
| Cosmic Vault batches | `tools/produce_and_upload_cosmic_*.py`, WebUI | Keep the `music_credit` calls. |

### Layered workflow
```bash
python3 storage/stick_episodes/<slug>/build_script.py           # -> script.json
.venv/bin/python tools/layered_story.py assets --slug <slug>    # generates only missing images; rerun after timeouts
.venv/bin/python tools/layered_story.py sheet  --slug <slug>    # _sheet_{plates,poses,inserts,frames}.jpg -> LOOK
.venv/bin/python tools/layered_story.py render --slug <slug>    # -> storage/stick_episodes/<slug>/<slug>.mp4
```
Review: `ffmpeg -i <video> -vf "fps=2/3,crop=1080:612:0:654,scale=270:-1,tile=8x5" -frames:v 1 sheet.jpg` per minute.

### Uploading (only on request)
```python
YouTubeUploader(session_path="storage/sessions/anotheryou_youtube_session.json").upload_video(
    video_path=v, title="...", description="...", tags=[...], headless=True, is_short=True)
TikTokUploader(session_path="storage/sessions/anotheryou_tiktok_session.json").upload_video(
    video_path=v, caption="... ≤150 chars + #heist #storytime #animation #fyp #stickfigure", tags=[...],
    headless=True, accept_content_checks=True)
```

## 4. The quality gate (Saad rejected two finale versions for these)
Characters introduced before acting and arriving where they act · people appear IN doors · they face what they act on
· outfit fixed per scene (close-ups too) · shared table/space, no duplicated furniture · interactions are real
two-person frames · every named object on screen · white cartoon hands · max 2 people per klein image · no image held
> ~3 s · no garbled text · linear story, no timers/flashbacks to decode · every character's choice explained.

## 5. Doc map
- `STICK_CHANNEL_GUIDE.md` — Another You pipeline, cast, klein behaviour, all lessons (§15 layered method)
- `LANTERN_JOB_SERIES.md` — series bible, part status + links, Part 4–6 lessons
- `CHANNEL_PLAYBOOK.md` — content strategy for both channels
- `AGENT_HANDOFF_NOTES.md` — Cosmic Vault engine, bugs, batch scripts

## 6. Side Quest (gaming clips) — the ex-Cosmic Vault accounts (2026-11-15)
- Cosmic Vault was rebranded for clipping. TikTok: **Side Quest @sidequestclips.gg** (name, photo, bio done). YouTube
  `UCL-FleoIZDlRqsbdDxZIn9Q`: new avatar + banner live; name change to "Side Quest Clips" blocked for 24 h by YouTube
  (Saad will retry); old Shorts still public (bulk → Private needs "Verify it's you"). Brand files: `storage/sidequest_brand/`.
- Tool: `tools/clipper.py` (fetch → read `transcript.txt` → cut). Split layout with `--face x,y,w,h --game-x X`.
  Pick moments by reading the transcript; skip sexual jokes (TikTok removes them); credit the streamer on screen + caption.
- **YouTube uploads must run with `headless=False`** — headless sessions now trigger Google's "Verify it's you".
  The uploader now waits for "Upload complete" before closing (long clips used to get stuck at "Uploading 44%").
- First batch live 2026-11-15: 5 Jynxzi GTA RP clips (`storage/clips/pXsnpT1gnUs/`) on YouTube + TikTok.
- Money: comes from paid clipping campaigns (Whop / streamer Discords), not platform payouts at this size.

## 7. Side Quest v2 — campaign clips (2026-11-15)
- Joined on Content Rewards (contentrewards.com, Saad's account): CoD Warzone S1 + CoD MW4 DMZ (Clipping Culture, $2/1K,
  TikTok+IG, #Ad + @callofduty, no added music/AI voice, logo for Warzone), IShowSpeed x Expedia (Reach, $1/1K, also
  YouTube; footage = stream 11.6.26 from 2:56:29), GTA 6 "Tokyo Girl" (Placements, $0.70/1K, song must be main audio,
  60% Tier-1 audience, send analytics via their Whop), Marlon (diamonds/Botswana sponsor — off-brand, lowest priority).
  All campaigns pay only Tier-1/2 viewers (PK/IN/BD unpaid) — check Side Quest's audience countries.
- Renderer: `tools/clipper_pro.py` (sharp crops, 60 fps, CRF 17, loudnorm, whisper captions with YouTube-caption gap fill,
  jump cuts `--seg`, punch-ins, `--mode trailer`, `--logo`, `--onscreen` = required campaign line placed UNDER THE TITLE
  (bottom ~350 px is covered by TikTok UI)). Official footage: MediaSilo review links -> grab the signed cloudfront URL
  from the <video> element and curl it.
- Batch 2 (not uploaded yet): `storage/clips/{speed_expedia,cod_warzone,cod_dmz}/`; captions in `storage/clips/batch2_captions.md`.
  Cadence advice given: 3/day TikTok, 2/day Shorts, US evening times.

## 8. Another You goes 3D (Blender 5.3, free)
- Kit: `tools/blender3d/kit.py` (procedural cast you/sam/driver/man/mira with knees/elbows/hair, poses, walk/turn, doors,
  taxi, van, streetlights, phones with image screens, camera helpers). Characters ~2 m tall: standing eyes ~1.65 m above
  root, seated head ~1.3 m above floor — aim close-ups there.
- Episode layout (copy `storage/stick_episodes/phone_p1/`): `episode.py` (shots + narration) -> `make_audio.py`
  (edge-tts, man = ChristopherNeural -12Hz) -> `make_tex.py` (phone screens/signs) -> `sets.py` + `shots.py` ->
  `run_shot.py -- <shot> --stills a,b` (check stills!) -> `render_all.sh` -> `assemble.py` (rain, synthesized SFX,
  captions, title/end cards).
- Lessons: camera fill light must sit inside the set (it was above the taxi roof -> black shots); phone in hand needs
  rot (0,180°,0) and offset (0,-0.06,-0.09) so the screen is upright and in front of the palm; check every shot's still
  for cameras inside heads/props before the full render (~4.5 s/frame per process).
- Series THE PHONE (3 parts, script v2 approved 2026-11-15 after v1 was rejected for missing logic/frames).

## 9. Another You v3: cartoon-3d-short style (Three.js + Remotion), 2026-11-16
- First episode: **THE GOLD IN THE JAR** — live on YT Shorts + TikTok (16 Nov 2026). Source: `remotion_shorts/src/videos/gold/`
  (goldstory.ts = shots/camera/DOF, goldstage.ts = staging + auto-aim camera, goldworld.ts = sets/props/fx), sound+captions:
  `storage/stick_episodes/gold_jar/finish.py`. Render: `npx remotion render src/index.ts GoldShort out/gold_raw.mp4 --gl=angle
  --browser-executable="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --concurrency=3` (~4 min for 80 s).
- Framing check before every render: `node_modules/.bin/esbuild scripts/framecheck.ts --bundle --platform=node --outfile=out/framecheck.cjs && node out/framecheck.cjs`.
- Saad's notes from v1: rich backgrounds + clouds in every outdoor shot, nobody cut off / off-centre, doors open onto real rooms,
  the ending must SHOW how it works. Story style = RicksClips-type (clever person, real fact, "You see...", payoff).
- Voice: Kokoro `am_puck` speed 1.24 (`tools/kokoro_tts.py`, `.venv-tts`). Music: Audionautix CC-BY → credit line in captions.
- Uploader fixes: YouTube opens the upload dialog by URL if the Create menu fails; TikTok uses the hidden file input, hides the
  onboarding tour overlay, and waits up to 10 min for big files.
