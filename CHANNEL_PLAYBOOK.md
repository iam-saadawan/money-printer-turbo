# Channel Playbook — Cosmic Vault & Another You

> **Last updated:** 2026-11-04 · **Owner:** Saad · Entry point for agents: [`CONTENT_START_HERE.md`](CONTENT_START_HERE.md)
> **Read this first** before writing, producing or uploading anything for either channel. It is the "what good
> looks like" document. Technical how-to lives in [`AGENT_HANDOFF_NOTES.md`](AGENT_HANDOFF_NOTES.md) (Cosmic Vault
> pipeline + bugs) and [`STICK_CHANNEL_GUIDE.md`](STICK_CHANNEL_GUIDE.md) (Another You pipeline + bugs).

---

## 0. Ground rules for both channels

1. **Retention beats volume.** The algorithm promotes videos people *finish and rewatch*. One strong video a day
   beats four weak ones; weak videos teach the platform the channel isn't worth recommending.
2. **The first 2 seconds decide everything.** Open on the most intriguing line and image of the video — never a
   slow intro, never "Today we're going to talk about…".
3. **Story, not information.** Even facts are told as a story: a person, a moment, a question, a payoff.
4. **Narration = a person talking to a friend.** Flowing conversational sentences (12–30 words), feelings and
   reactions, the occasional short punch line. Never a list of 3–5 word fragments ("A brown wallet. Thick.") —
   the user rejected that style as "reading off something".
5. **Every visual matches what is being said at that moment.** Random or generic visuals kill trust and retention.
6. **Proper logic, no plot holes.** Cause and effect, setups before payoffs, numbers that add up, nobody appearing
   out of nowhere. The owner checks this hard (see §3.3).
7. **Free tools only for now** (Groq, Gemini free tier, edge-tts, Pollinations pollen already paid). Ask before
   anything that costs money. Pollen balance ~5.4 at last check (klein = 0.005/image).
8. **Copyright:** no popular music, no film/TV clips. Music only from licensed sources with a `LICENSES.txt`;
   Audionautix tracks need the CC BY credit (`app/services/music_credit.py`).
9. **Uploads are done by the owner (or Antigravity) for now** — no scheduled automation yet. Agents prepare the
   video + title + description + hashtags and say where the file is.

---

## 1. Cosmic Vault

| | |
|---|---|
| YouTube | Cosmic Vault — `UCL-FleoIZDlRqsbdDxZIn9Q` (session: `storage/youtube_session.json`, the default) |
| TikTok | `@cosmicvault8` (session: `storage/tiktok_session.json`, the default) |
| Catalog | ~50–76 shorts live (see `AGENT_HANDOFF_NOTES.md` §1); very few views/subscribers |
| Pipeline | `tools/produce_and_upload_cosmic_*.py` (headless batch) — see handoff notes |

### 1.1 Why it isn't growing (owner's diagnosis, agreed)
- **Boring scripts** — lecture-style facts, no tension, no payoff.
- **Flat narration** — no energy, no emotion.
- **Visuals unrelated to the script** — stock-footage keyword search returns generic or wrong clips.
- **Too much volume** (4/day) of weak videos.

### 1.2 New direction: broaden to "unexplained mysteries" (decided 2026-10-11)
The channel is a **vault of the unexplained**, not only space. Keep one clear theme so the algorithm knows who to
show it to:
- **Space:** strange signals, impossible objects, missing stars, rogue planets, black holes.
- **Earth & ocean:** deep-sea anomalies, unexplained sounds, places that shouldn't exist.
- **Unsolved history & human mysteries:** Dyatlov Pass, the Voynich manuscript, disappearances, lost expeditions.
- **Science edge cases:** things science still can't explain.
Pick topics with a **real, specific hook** (a date, a number, a name, a recording) — not vague "the universe is big".
Before planning a relaunch, **pull YouTube Studio + TikTok analytics** for the existing catalog: which topics and
videos held viewers longest? Make more of those, drop the rest.

### 1.3 Script structure (45–75 s)
1. **Hook (0–3 s):** the strangest true detail, as a statement or question. *"In 1977, a telescope in Ohio picked up
   a signal so strong the astronomer wrote one word next to it: Wow."*
2. **Context (3–15 s):** who, where, when — told as a moment, through a person's eyes.
3. **Escalation (15–45 s):** each line adds a stranger detail or a failed explanation. Keep an open question alive.
4. **Best theories (45–60 s):** 2–3 real explanations, honestly weighed. Never invent facts.
5. **Payoff/loop (last 5 s):** the unresolved question that makes people comment or rewatch.
Facts must be accurate — a wrong fact in the comments kills credibility. Note sources while writing.

### 1.4 Narration
- Energetic, curious storyteller — like telling a friend something unbelievable. Vary pace; pause before reveals.
- Free voices: try `en-US-AndrewMultilingualNeural` (+5–10%) or `en-US-BrianMultilingualNeural`; compare.
  A paid expressive voice (e.g. ElevenLabs) is the biggest upgrade once there is income.
- Watch the subtitle comma bug (handoff notes §2a): avoid comma-heavy sentences.

### 1.5 Visuals
- **Real imagery first:** NASA / JWST / Hubble images and footage are public domain and free to monetize; use the
  actual object being talked about. (ESA material is usually CC BY-SA — credit required.)
- For things with no real image: AI images (Pollinations klein, ~0.005 each) in **one consistent style**, one per
  sentence, matching the sentence.
- Avoid generic stock footage unless it literally shows what is being said.
- Text on screen: big, 2–3 word captions (existing yellow style), one short title card for the hook.

### 1.6 Packaging
- **Title:** curiosity + specifics, under ~60 chars: *"The Signal That Lasted 72 Seconds"*, *"This Star Shouldn't Exist"*.
- **Description:** 1–2 sentence hook + 5–8 relevant hashtags + music credit line if an Audionautix track was used.
- **TikTok caption:** hook question + hashtags (`#mystery #unexplained #space #fyp …`), ≤150 chars incl. credit.
- **Cadence:** 1–2 per day, at consistent times.

---

## 2. Another You

| | |
|---|---|
| YouTube | Another You — `UCJgTIuV9xpqGY_hqmmZwZ-Q` (session: `storage/sessions/anotheryou_youtube_session.json`) |
| TikTok | `@another.you98` (session: `storage/sessions/anotheryou_tiktok_session.json`) |
| Avatar | `storage/stick_brand/avatar_final.jpg` (navy, hero bust) — set on YouTube and TikTok (TikTok set manually by owner) |
| Live | "The Wallet" (2:35) — YouTube https://youtube.com/shorts/92L0gHc6o-w (261 views at 1 week) · TikTok (5 views) |
| Live | "The Lantern Job — Part 1: The Offer" (2:59), 2026-10-18 — YouTube https://youtube.com/shorts/HOxfqjEjGbI (81 views day 1) · TikTok (756 views, 36 likes day 1) |
| Live | "The Lantern Job — Part 2: The Plan" (2:57), 2026-10-19 — YouTube https://youtube.com/shorts/knXZ4HQe8d0 · TikTok `@another.you98` |
| Live | "The Lantern Job" Parts 3–6 (2026-10-27 → 10-31) — **series COMPLETE**; links in `LANTERN_JOB_SERIES.md`. Part 6 (3:51) is a regular YouTube video |
| Pipeline | **Layered** `tools/layered_story.py` (standard since Part 4) — see `STICK_CHANNEL_GUIDE.md` §15. Old: `tools/stick_story.py` |
| Next | Pick the next story/series with Saad |

**Current series:** "The Lantern Job" — see [`LANTERN_JOB_SERIES.md`](LANTERN_JOB_SERIES.md).

### 2.1 What the channel is
Second-person **"You" stories**: the viewer IS the hero. Mostly made-up but **grounded** stories in any genre —
love, comedy, sci-fi, medieval, history, drama. A recurring cast of 6 stick characters acts different roles each
episode (`you`, `crush`, `bestie`, `rival`, `mentor`, `pet`), so viewers recognize them like a sitcom troupe.

### 2.2 The look (reference: @_borntosuffer_ TikTok)
- Flat 2D hand-drawn ink cartoon, thick black outlines, flat colors, round white heads with dot eyes.
- **Richly detailed backgrounds** with props and small white-headed background people.
- **Landscape 16:9 picture centered in a vertical video**, dark blurred background, white title on top, yellow
  2–3 word subtitles below.
- Mostly still frames with small expression/gesture changes cut on the narrator's words, plus a slow camera move per
  shot (`camera_motion`).
- **Never** use "IMAX / cinematic / feature film / high budget" in image prompts — it turns everything 3D.

### 2.3 Story rules (non-negotiable)
- **Chronological.** No flashbacks, no intercut timelines — a non-linear version completely confused the owner.
- **Grounded logic:** realistic cause and effect, concrete details (exact amounts, times), no coincidence solves the
  problem, every payoff set up earlier, ages/timelines/money add up.
- **Every character is on screen before they speak or act.** Nobody "was there all along" in a scene that started
  without them (the "The Wallet" best-friend mistake). A time skip or entrance must be narrated.
- **Show every step.** Don't jump from "the leash cuts your hand" to "she bandages it" — show her noticing, worrying,
  coming over.
- **Objects stay consistent** (a sold guitar never reappears; a hair tie stays on the wrist it was put on).
- Max 3 cast members per frame. Background people never need setup but can't carry the plot.

### 2.4 Narration
- Flowing second-person storytelling with inner thoughts: *"You open it, and your stomach drops. There's three
  thousand dollars in there. In cash."* Sentences may run across two frames.
- Numbers as words. Never cast ids as names ("your best friend", "Arthur").
- Voice: `en-US-AndrewMultilingualNeural` +5% (owner: most natural). No music by default; mood music only from a
  licensed `resource/music/<mood>/` library.

### 2.5 Story shapes that work
- **Moral choice with a warm payoff** ("The Wallet": find $3,000, return it, life changes).
- **One life in two minutes** (meet, grow old, loss — "The Bench at 4:12").
- **Grounded comedy of escalating mistakes** (a believable plan that keeps going wrong, earned twist).
- **"What would you do?" dilemmas** — invite comments.
- **Genre episodes with costumes** (medieval peasant, astronaut, 1920s) — costume sheets needed (planned).
Every episode: hook in the first line, a clear want + obstacle, rising stakes, an ending that pays off the setup.

### 2.6 Length, packaging, cadence
- **2–2.5 minutes** (Shorts allow 3 min; TikTok rewards >1 min). Test episodes ~70 s.
- **Title:** the dilemma in the viewer's words: *"You Found $3,000 on the Bus. Nobody Saw You."*
- **On-screen title:** the hook in 2 short lines (`title_text`).
- **Description:** the dilemma + "What would you do?" + `#shorts #story #animation #storytime #2danimation #stickfigure`.
- **TikTok caption:** the dilemma question + 4–5 hashtags (the uploader no longer doubles hashtags).
- **Cadence:** start with 1 per day.

### 2.7 How an episode gets made (current process)
1. **Script:** written by the agent in a Claude Code session (free LLMs failed the quality bar — see
   `STICK_CHANNEL_GUIDE.md` §9), then checked with `story_writer.code_checks()` (introductions, edits, digits,
   choppy narration, length). A free narration preview is made with edge-tts.
2. **Owner reviews the script** and approves or asks for changes. Nothing is generated before approval.
3. **Images:** `stick_story.py images` — klein + cast sheets, automatic frame check (`frame_qa.py`) regenerates bad
   frames (max 2 retries), flags the rest. Show the owner a contact sheet.
4. **Render:** `stick_story.py render` (Andrew voice, word-synced cuts, subtitles, camera motion).
5. **Upload:** owner or Antigravity, with the prepared title/description/caption.

---

## 3. Lessons learned (don't repeat these)

| Mistake | Rule |
|---|---|
| Choppy fragment narration | Flowing storytelling sentences |
| Best friend appeared mid-scene out of nowhere | Every character shown before acting; code check enforces it |
| Non-linear "old man is you" structure confused the owner | Tell stories in order |
| "IMAX/cinematic" prompts → 3D Pixar look, doll faces | Flat 2D ink style words only |
| Busy multi-figure sheet edits wrecked sheets | Fix one figure at a time, then reassemble |
| Two cast sheets for a heavily aged character → mixed hair | Describe aged characters in text, send one sheet |
| Stock footage unrelated to narration (Cosmic Vault) | Real NASA imagery or matching AI images per sentence |
| 4 weak uploads/day | 1–2 strong uploads/day |
| AI-scene and abstract-logo avatars ("not professional") | Hero bust, sticker outline, bold gradient |
| Free LLMs writing whole scripts | Agent writes, free tools check |

## 4. Metrics to watch (weekly)
- **Average view duration / % viewed** per video (the main signal) — what made people stay or leave?
- **Swipe-away rate** in the first 3 s (hook quality).
- **Views per topic/genre** → do more of the winners.
- **Comments** — dilemmas and mysteries should spark them; reply to early comments.
- Followers gained per video.
Pull these from YouTube Studio / TikTok Studio (logged-in sessions exist for both channels).
