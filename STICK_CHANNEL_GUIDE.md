# 2D Stick Story Channel — Agent Guide

> **STATUS 2026-11-04: "The Lantern Job" (6 parts) is COMPLETE and live. Start at [`CONTENT_START_HERE.md`](CONTENT_START_HERE.md). From Part 4 on, episodes use the LAYERED pipeline — see §15 below; §§5–13 describe the older full-scene method (`tools/stick_story.py`).**

> Content strategy (what good episodes look like, packaging, cadence): [`CHANNEL_PLAYBOOK.md`](CHANNEL_PLAYBOOK.md).

> **Last updated:** 2026-10-03
> **Status:** pipeline works end to end; test episode `old_man_bench` (71s) and first real episode `the_wallet` (2:10, 27 frames, ~0.2 pollen incl. 14 regenerations) rendered. Not uploaded yet — the new channel's TikTok/YouTube accounts don't exist yet.
> **Read this before touching** `tools/stick_story.py`, `tools/generate_cast_sheets.py`, `tools/cast_panels.py`, `tools/edit_cast_sheet.py`, `tools/stick_consistency_test.py`, or anything in `storage/stick_cast/` / `storage/stick_episodes/`.
> **Channel name: "Another You"** — YouTube channel `UCJgTIuV9xpqGY_hqmmZwZ-Q`, session `storage/sessions/anotheryou_youtube_session.json` (verified 2026-10-11 it opens Another You, while `storage/youtube_session.json` opens Cosmic Vault `UCL-FleoIZDlRqsbdDxZIn9Q`). TikTok `@another.you98`, session `storage/sessions/anotheryou_tiktok_session.json` (verified; default `storage/tiktok_session.json` = `@cosmicvault8`).
> This is a **separate channel from Cosmic Vault** (see `AGENT_HANDOFF_NOTES.md` for that one). `stick_autopilot.py` + `2D_ANIMATION_PLAN.md` are the OLD approach (text-only flux, absurd-history comedy) — the user rejected that direction; don't build on them.

---

## 1. What the user wants (non-negotiable, learned the hard way)

- **Look = the @_borntosuffer_ TikTok** (reference: `https://www.tiktok.com/@_borntosuffer_/video/7670184004531883286`):
  flat 2D hand-drawn ink cartoon, thick black outlines, flat muted colors, characters with round plain
  white heads + dot eyes, **richly detailed backgrounds** full of props and small white-headed background
  people. **Landscape 16:9 picture centered in a vertical 9:16 video**, dark blurred copy above/below,
  white title text on top, yellow 2-3 word subtitles below. Mostly still frames with small changes.
- **Never put "IMAX", "cinematic", "feature film", "high budget", lens mm, "volumetric light" etc. in image
  prompts.** Klein then renders 3D Pixar-style dolls / realistic humans — the user hated it (`_v1_3d/`).
- **Stories:** second-person "You" stories, mostly made-up, any genre (love, sci-fi, medieval, history).
  Must be **grounded and logically airtight** ("proper logic, no BS"): realistic cause and effect,
  concrete details, every payoff set up earlier. **Every character must be shown on screen before they speak or act** — the user rejected a script where a best friend suddenly talked in a scene that had only shown the hero. **Tell it chronologically** — a non-linear version with
  two intercut timelines completely confused the user. No slapstick filler; every step of the story
  shown (don't skip from "cut hand" to "bandage" — show her noticing and reacting).
- **Narration must sound like storytelling**, not headlines: flowing conversational sentences (12-30 words) with
  connecting words, inner thoughts and feelings; sentences may run across beats. The user rejected a script of
  3-5 word fragments ("A brown leather wallet. Thick.") as "reading off something". See `the_wallet/script.json`
  (v2 narration) for the right style.
- **Recurring cast** of 6 (sheets below). Characters change outfits per story; identity lives in the head.
- Test videos ~70s now; real episodes will be 2+ minutes once the user is happy.
- The user is **budget-sensitive** (Pollinations pollen). Always state cost before spending.

## 2. Budget / provider

- Images: **Pollinations `black-forest-labs/flux.2-klein-4b`** — 0.005 pollen/image flat, accepts up to
  10 reference images (no extra charge), supports editing. It was the cheapest model that can use
  character sheets. The old `model=flux` (FLUX.1 Schnell, 0.002) is text-only — can't keep characters consistent.
- Balance at last check: **~5.47 pollen** (started ~6). The API key can't read its own balance
  (403 `account:usage`), so track spend manually. The keyless free endpoint returns "Queue full" — unusable.
- Reference images are sent as base64 data URIs via `POST https://gen.pollinations.ai/v1/images/edits`
  (`gen_with_references()` in `tools/stick_consistency_test.py`). Text-only generation uses
  `GET /image/{prompt}` (`gen_text_to_image()`).
- Script writing: Groq (`groq_api_key` in config.toml). `openai/gpt-oss-120b` is tried first;
  `qwen/qwen3.8-27b` is capped at 1000 output tokens on this account.
- Voice: edge-tts (free). Music: local mp3 files (free).

## 3. Files

| Path | What |
|---|---|
| `tools/stick_story.py` | **The pipeline.** Stages `script` → `images` → `render` (+ `show`). Resumable: existing frames are skipped. |
| `tools/generate_cast_sheets.py` | Generates base character sheets (`CAST` dict = looks + seeds). `--only <name>` regenerates one. |
| `tools/cast_panels.py` | `split` cuts every sheet into figure panels (`storage/stick_cast/panels/`, with `_index_*.jpg`); `assemble` rebuilds a clean sheet from chosen panels. Free. |
| `tools/edit_cast_sheet.py` | Edits a whole sheet with klein. **Don't use on busy sheets** — it wrecked 2 of 3 sheets. Kept for reference. |
| `tools/stick_consistency_test.py` | The original A/B test (code-drawn figures vs klein+sheets); also hosts the Pollinations helpers the other tools import. |
| `storage/stick_cast/{you,crush,bestie,rival,mentor,pet}.jpg` | **Approved cast sheets** — the references used for every scene. `_history/` = older/failed versions. |
| `storage/stick_episodes/<slug>/` | Per episode: `script.json`, `frames/NN.jpg` (raw 1344x768), `composed/` (vertical), `narration.mp3`, `subtitles.srt`, final `<slug>*.mp4`, `contact_sheet.jpg`, `_rejected/`. |
| `resource/music/<mood>/` | Mood music library (see §6). |

## 4. The cast

| id | Look (signature features on the head) | Notes |
|---|---|---|
| `you` | short messy black hair, blue tee, grey jeans | the hero = the viewer. Front view was rebuilt (`panels/you_front_new.png`). |
| `crush` | long auburn ponytail with yellow tie, eyelashes, green sweater, navy skirt | best sheet |
| `bestie` | curly brown hair, big round glasses, orange hoodie | |
| `rival` | slicked hair, angry eyebrows, curled mustache, purple suit | front view rebuilt |
| `mentor` | bald, long white beard, round glasses, brown cardigan, cane | doubles as "old YOU" in `old_man_bench` |
| `pet` | stick dog, floppy black ears, red collar + gold tag | **stands upright on 2 legs** — 2 attempts at four legs failed; user hasn't decided yet |

To fix one bad figure on a sheet: split → regenerate only that figure as a single-figure image with the good
panels as references (~0.005) → assemble. Never edit the whole sheet in one call.

Per-story costumes (planned, not built yet): edit the base sheet once per episode ("same character, now in a
medieval tunic"), save it, use it as that episode's reference.

## 5. Running an episode

```bash
.venv/bin/python tools/stick_story.py script --slug my_story --idea "..."   # Groq; prints beats
.venv/bin/python tools/stick_story.py show   --slug my_story                  # re-print
.venv/bin/python tools/stick_story.py images --slug my_story                  # ~0.005 pollen per frame
.venv/bin/python tools/stick_story.py render --slug my_story [--mood X] [--voice V] [--rate +5%] [--bgm path] [--no-music] [--suffix _v2]
```

**Always show the user the script (and a free narration preview) before generating images**, then a
contact sheet of the frames before rendering.

### script.json format
```json
{
  "title": "...", "mood": "emotional",
  "style": "<image style string>", "frame_size": "1344x768", "layout": "letterbox",
  "title_text": "Line one\nline two",
  "voice": "...", "rate": "+10%", "bgm": "path or none", "bgm_volume": 0.15,   // all optional overrides
  "beats": [
    {"type": "new",  "narration": "...", "characters": ["you","pet"], "scene": "full frame description"},
    {"type": "edit", "narration": "...", "characters": ["you","pet"], "change": "only what changes"}
  ]
}
```
- `new` = fresh image with the listed characters' sheets as references.
- `edit` = previous frame + sheets, changed by `change`; then `stabilize()` keeps the old pixels wherever
  nothing changed (skipped when >60% of the frame changed).
- `characters` on an edit = everyone still visible, not only who changes.
- Frame cuts land on the exact word: edge-tts `WordBoundary` timings are matched to beat word counts.
  Write numbers as words ("four twelve", "forty seven") so counts match; a mismatch falls back to
  proportional timing (logged).
- Subtitles are built directly from word timings (2-3 words/cue), not from the old SRT splitter.

The `old_man_bench/script.json` is the reference example of a good script (hand-written, Groq's attempt was rejected).

## 6. Voice + music by mood

`MOODS` in `stick_story.py` maps mood → voice/rate/volume. Music is a random `.mp3` from
`resource/music/<mood>/`; an empty folder = no music. Precedence: CLI flag > script.json field > mood default.

| mood | voice | music folder status |
|---|---|---|
| emotional | en-US-AndrewMultilingualNeural +5% (user: most natural storytelling) | **empty — needs tracks** |
| comedy | en-US-AndrewMultilingualNeural +10% | empty (Born to Suffer often uses none) |
| suspense | en-US-ChristopherNeural +0% | empty |
| epic | en-GB-RyanNeural +5% | empty |
| romance | en-US-JennyNeural +5% | empty |

**Copyright:** do NOT copy tracks from `resource/songs/` into these folders. Most of them were downloaded from
Audionautix (Jason Shaw) by `tools/setup_real_bgm.py` / `tools/expand_master_bgm.py` under **CC BY 4.0, which
requires a credit line** ("Music by Jason Shaw, audionautix.com, CC BY 4.0") in every video description —
Cosmic Vault uploads currently don't include it. Only use tracks whose license allows monetized use with no
attribution (YouTube Audio Library tracks marked "no attribution required", Pixabay Music), or generate
original music. Keep a `LICENSES.txt` per folder noting source + license of each track.
The user must download royalty-free tracks themselves (YouTube Audio Library / Pixabay Music). Never use
popular songs or film scores (mute/demonetization). `video.generate_video` doesn't trim override music, so
`stage_render` trims + fades it to the narration length first — keep that or the audio runs past the video.

## 7. Klein behavior — rules baked in from testing

1. **Edits only for tiny changes** (expression, a hand moving). Adding objects or big pose changes fails
   (hair tie became a blob person; "ears perk up" put cat ears on YOU). Make those `new` beats.
   If an edit is about one character, say "only X changes, Y stays exactly the same".
2. **Don't send a sheet for a heavily altered character.** Old CRUSH + mentor sheets → mentor grew her
   ponytail. Describe the old woman in text and send only the mentor sheet.
3. Spell out each character's expression for the moment; klein defaults to the sheet's neutral/sad face.
4. Say "exactly two people and one dog" / "each named character appears only once" — duplicates happen.
5. Say every background person has a round plain white head (otherwise skin-tone heads appear).
6. With two cast sheets in one frame, klein sometimes **swaps outfits** or draws a **double head**. Spell out
   each person's hair + clothing colors in the scene ("MENTOR, the BALD old man in a BROWN cardigan; YOU, MESSY
   BLACK HAIR, BLUE t-shirt") and add "exactly two people, each with exactly one head".
7. The global style asks for background people; for scenes that must be empty (e.g. "nobody saw"), say
   "ZERO background people, no passengers, no heads" explicitly or klein fills the seats.
8. Props the narration says are gone must be explicitly excluded ("There is NO guitar anywhere").
9. **Inspect every frame** (contact sheet) before rendering. Typical rate: 4-5 bad frames out of 17.
   Move bad ones to `_rejected/`, adjust the beat text, rerun `images` (only missing frames regenerate).

## 8. Publishing status (2026-10-11)
- Avatar: `storage/stick_brand/avatar_final.jpg` (navy, hero bust; made by `you_bust.png` cut-out + code
  composition — the user rejected AI-scene avatars and abstract logos). Set on YouTube ✅. TikTok ❌ — TikTok
  showed a slider CAPTCHA to the automated browser; agents must not solve CAPTCHAs → user sets it by hand.
- "The Wallet" (`the_wallet_final.mp4`, Andrew voice) published on YouTube: https://youtube.com/shorts/92L0gHc6o-w
- TikTok: published to `@another.you98`, public ("Everyone") after TikTok's review (shown as "Only me" +
  "Content under review" for the first minutes). The user approved turning on automatic content checks;
  `TikTokUploader.upload_video(..., accept_content_checks=True)` handles that one-time modal (default False =
  Cancel). Uploader fixes: no longer touches an unreadable privacy dropdown; no longer doubles hashtags already
  in the caption (the first post has doubled hashtags).

## 9. Quality tooling (2026-10-11)
- **`tools/frame_qa.py`** — free vision check (Groq `qwen/qwen3.8-27b` accepts images). Major problems fail a frame
  (missing/duplicate main character, double heads, swapped hair/outfits, forbidden things visible, key action by
  the wrong person); minor ones (pose, gaze, accessories, background) don't. Validated: caught 7/7 frames rejected by
  hand on `the_wallet`, ~70% of good frames pass first time. `stage_images` runs it after every frame, needs two failed
  looks before regenerating, retries up to `MAX_QA_RETRIES=2` with the problems as "AVOID" notes, logs to
  `frames/qa.json`, and prints frames still failing. `--no-qa` skips it. Standalone: `frame_qa.py --slug X [--frames ..]`.
- **`tools/story_writer.py`** — bible → continuity critic → beats → code checks + critic → revise. Its
  **`code_checks()` is the valuable part** (deterministic): beat/word counts, edits can't add characters, digits in
  narration, choppy-narration detector, mention-before-on-screen warning, and the **"nobody materializes in an
  ongoing scene" rule** (catches the original `the_wallet` friend bug). Use it to check ANY script, including
  hand-written ones. The free Groq `gpt-oss-120b` writer itself is **not good enough** (test `_rejected_wrong_text_groq`:
  incoherent plot, characters out of nowhere, 3:52 long) — scripts are written by the agent in a Claude Code session
  for now, then checked with `code_checks` and reviewed by the user.
  2026-10-12: free **Gemini** now works (key in `config.toml` `gemini_api_key`, `AQ.` format, project on Free tier;
  Flash models only — `gemini-3.8-flash`, `gemini-3-flash-preview`, `gemini-flash-latest`; Pro = 429). The writer uses
  it with model rotation + Groq fallback. Tested the same comedy idea: Gemini's *critic* finds real plot holes, but
  the free tier hits 429/503 constantly, returns broken JSON, took 17+ min and the script still had ~9 logic issues
  after 2 revision rounds (`_rejected_wrong_text_gemini`). **Verdict: free LLMs can't write publishable scripts here.**
- **Camera motion** — `script.json` `"camera_motion": true` (or `render --motion`): letterbox layout only; each shot
  (a new beat + its edits) gets one continuous slow move from `CAMERA_MOVES` (push-in, pull-out, pan right, pan left),
  so edits inside a shot don't jump. ~0.5s render time per second of video.

## 10. "The Lantern Job" series cast (2026-10-18)
5-part heist series (outline approved in chat; Money Heist style, YOU = art restorer in the crew).
- New sheets: `nadia.jpg` (hacker, black bob + headset, red jacket), `brick.jpg` (big driver, grey beanie + stubble,
  green hoodie), `eleanor.jpg` (director, silver bun, pearls, black dress). Generated with `generate_cast_sheets.py`
  (entries added to `CAST`); Nadia/Brick front views + faces regenerated one figure at a time and re-assembled.
- Costume sheets (outfit front + side, plus the base character's expression heads): `you_restorer.jpg`,
  `you_heist.jpg`, `bestie_guard.jpg` (Leo), `crush_investigator.jpg` (Lena), `rival_heist.jpg` (Victor).
  Walter = `mentor.jpg`, Victor daytime = `rival.jpg`.
- Overview: `storage/stick_cast/lantern_job_cast.jpg`. Cost ~0.09 pollen.
- TODO for production: `stick_story.py` needs per-beat sheet selection (e.g. `"sheets": {"you": "you_heist"}`) and
  `CAST` descriptions for nadia/brick/eleanor + costume variants, and `frame_qa.LOOKS` entries for them.

## 11. Lessons from producing Lantern Job Part 1 (2026-10-18) — ~64 klein images (~0.32 pollen) for 25 frames
- **Edits now get ONLY the previous frame** (no cast sheets): with sheets, klein swapped hair/beards between characters.
- **Costume sheets must show ONE full figure.** A front+side sheet made klein draw the character twice ("two Lenas");
  Lena's stacked double-head close-ups did the same, so `crush_investigator.jpg` is now the front figure only.
- **Say who changes by position and look** in edits ("the boy on the RIGHT with glasses…; the boy on the LEFT stays"),
  otherwise the expression/gesture lands on the wrong person.
- Spell out every person's head + outfit + position in multi-character scenes, plus "EXACTLY N people, nobody else",
  and "NO background people" for rooms that must be empty — the style's background-people rule fills empty rooms.
- **Ghost/duplicate figure fix:** an edit "REMOVE the second figure …, replace with an empty chair" on the frame worked
  first time; then regenerate dependent edit frames from the cleaned frame.
- **`frame_qa` misses duplicates/merged characters often** (passed two Lenas, a Nadia/Brick merge, swapped faces).
  It's a first filter only — **always review the contact sheet by eye** before rendering.

## 12. Denser animation (Part 2, 2026-10-19) — 42 frames + 12 talking frames, ~82 images (~0.41 pollen)
- **More frames:** the same narration split into ~40 beats; every reaction/expression change gets its own edit
  frame (picture changes every 3-5 s).
- **Talking mouths:** a beat with `"speaker": "<cast id>"` gets `frames/NN_talk.jpg` (mouth wide open), cleaned by
  `keep_largest_change()` (keeps only the biggest changed region = the speaker's mouth, restores everything else, so
  listeners' mouths don't move). At render, the talk version is overlaid only while words are spoken (word
  timings; only inside quotes if the beat has quotes). Demo: `storage/stick_episodes/_talk_demo/`.
- **Edits now reference the shot's ORIGINAL new frame**, not the previous edit — chained edits drifted (Victor
  gradually turned into the hero).
- **Target edits by position + clothes**, not hair: the hero and Victor both have black hair, so "the boy with messy
  black hair" put the hero's expression on Victor. Use "the boy on the RIGHT in the BLUE T-SHIRT … the man on the LEFT
  in the PURPLE SUIT keeps his MUSTACHE", and say whose hands stay empty when a prop appears.

## 13. Talking mouths — the version that works (2026-10-19)
- Full-frame "open X's mouth" edits are UNRELIABLE: klein edited the wrong character (Victor's face/hair changed while
  Walter spoke; the hero turned into Leo), and `keep_largest_change()` then kept the wrong region. Don't use them.
- **Working method:** a beat needs `"speaker"` AND `"speaker_box": [l, t, r, b]` (fractions around the speaker's head,
  marked by the reviewer from the frame). `make_talk_frame()` sends only a square crop around that head to klein and
  pastes back a feathered ellipse over the head — nothing else in the frame can change. Rejected if >25% of the crop
  changed. Optional `"talk_note"` (e.g. "keeps his curled MUSTACHE above the open mouth" for Victor).
- **Never list features to keep in the talk prompt** ("keep glasses, beard…") — klein ADDED glasses and a beard to Lena.
- **Mouths move only for quoted dialogue.** Paraphrased speech ("he complains…", "you tell the crew…") is narration:
  no `speaker`.
- A static wide-open mouth on a listener also reads as talking — give listeners closed-mouth expressions.
- Always check rendered dialogue scenes zoomed in at 2-4 fps before sending.

## 14. Open items / next steps

- ~~Separate login sessions~~ **DONE 2026-10-11:** `youtube_login.py --channel <name>` / `tiktok_login.py --channel <name>` save to `storage/sessions/<name>_{youtube,tiktok}_session.json`; pass that path as `session_path=` to `YouTubeUploader` / `TikTokUploader` / the avatar updaters. Default (no flag) is still Cosmic Vault. Original note: `youtube_login.py` / `tiktok_login.py` and the uploaders
  use `storage/youtube_session.json` / `storage/tiktok_session.json` — the SAME files Cosmic Vault uses.
  Logging the new channel in will overwrite Cosmic Vault's session and break its uploads. Parameterize the
  session path per channel **before** the user logs into the new accounts. The user creates the accounts
  themselves (agents must not create accounts).
- Mood music library (user downloads tracks).
- Pet four-legs decision; per-episode costume sheets.
- Automatic frame QA (vision model) so the user doesn't have to spot bad frames.
- Groq script quality is weak for this format — improve `SCRIPT_SYSTEM` with the rules in §1, or have the
  agent write scripts; always do a logic check (ages, timeline, every clue set up before it pays off).
- Full-length (2+ min) version of `old_man_bench` with every story beat (25-beat outline was drafted in chat;
  user approved the idea, wants it after the test is judged).


## 15. The layered pipeline (standard since Part 4, 2026-10-28)

**Why:** the free pollen only runs klein-4b, and klein asked for a whole multi-character scene breaks faces, duplicates
people and changes the room every frame. It is reliable for ONE subject per image, so every picture now holds one thing
and the code composites + animates them.

**Files:** `tools/layered_story.py` (stages `assets`, `sheet`, `render`), `tools/layered_render.py` (compositor).
Episode script = Python `storage/stick_episodes/<slug>/build_script.py` → `script.json`. Template:
`storage/stick_episodes/lantern_p6/build_script.py` (newest, uses every feature).

**Asset kinds (folder per kind inside the episode):**
- `locations` → `plates/` — empty background, 1920×1088. `"EDIT:<loc>:<change>"` = variant of another plate (night,
  door open). `"COPY:<slug>"` = reuse from another episode.
- `poses` → `poses/` — one character on pure green from their cast sheet (`char`, `costume`, `pose`, `bust`).
  `{"copy": slug}` reuses (chains are followed). Minor characters without sheets: `{"char": None, "desc": ...}`.
  Keyed out by `cutout()` (border flood-fill + despill), cached in `cutouts/`.
- `inserts` → `inserts/` — object close-ups; the prompt forces white cartoon hands.
- `frames` → `frames/` — REAL two-character images for interactions, drawn INTO the plate (`loc`, `chars`,
  `pose_refs` for minor characters, `desc`). Max 2 characters — klein merges 3.

**Shot fields:** `narration`, `cam` (`wide` | `medium:<x 0-1>` | `close:<actor idx>` | `insert:<id>` | `frame:<id>`),
`loc`, `actors` = `[pose, x, depth 0-1, facing, optional [walk_x0, walk_x1]]`, `then` = `[word_idx, actor_idx,
new_pose]` (pose swaps on the narrated word), `speaker`, `fx` (`punch`, `shake`), `sfx` (`ring`, `click`, `door`),
`timer_static`. Script-level: `split_after_shot` (render `--part A|B`, titles via `part_titles`), `countdown`
(`draw: False` = ticking only).

**Renderer behaviour:** depth scaling + shadows, walking bob/tilt, breathing, 0.15 s pose crossfade, close-ups crop
tall figures to head+chest over a blurred zoomed plate, crossfade only between wide/medium shots of different places,
tint per location (night/basement), synthesized sfx + ticking clock, edge-tts word timings drive every cut, letterbox
title + 2–3 word yellow subtitles via MoneyPrinterTurbo `generate_video`.

**Lessons (Parts 4–6) — check every episode:**
- People enter through a door that faces the camera (plate + `EDIT` open-door variant), never out of a wall.
- Outfit fixed per scene; don't reuse a bust from another episode if the outfit differs.
- If a pose includes its chair/armchair, the plate must not have one there. Two people at a table = same table.
- Characters face what they act on (side-view poses: "seen in SIDE VIEW facing LEFT"); say "Do NOT draw any door,
  wall or frame" in pose prompts.
- Every action (hand-off, swap, arrest) as a `frame`; everyone arrives on screen before acting.
- No image held > ~3 s; split long lines into more shots. No garbled text (crop or regenerate).
- Story: linear, plan stated up front, one complication per set-piece, every choice explained. No flashback hooks
  or on-screen timers (finale v2 was rejected for exactly that).
- Review the render at 1 frame / 1.5 s before sending.
- Costs: Part 4 ≈ 0.5 pollen (17 plates, 52 poses, 23 inserts); Part 6 v3 ≈ 0.15 (mostly reused).
