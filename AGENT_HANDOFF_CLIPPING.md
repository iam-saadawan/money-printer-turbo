# Agent handoff: Side Quest clipping (paid campaigns)

> Written 2026-11-18 by the agent that ran this lane. Read it fully before touching anything.
> Owner: Saad. Project root: `/Users/saad/MoneyPrinterTurbo`. Timezone: **AWST (UTC+8)**. The Mac clock is AWST.
> The companion doc for the cartoon channel is `AGENT_HANDOFF_ANOTHER_YOU.md`. The Second Brain mirror is `~/Second Brain/brain/references/`.

## 1. What this lane is
**Side Quest** is a faceless gaming-clips account. It makes money by posting clips for **Content Rewards (Whop) clipping
campaigns**, which pay per 1K views once approved. Saad says "make me money", which means: make campaign-compliant edits,
post them spaced out, and submit each one to its campaign within 30 minutes.

| Account | Handle / ID | Login (already saved, no sign-in needed) |
|---|---|---|
| TikTok | `@sidequestclips.gg` | `storage/tiktok_session.json` (Playwright cookies) |
| YouTube | "Side Quest Clips", channel `UCL-FleoIZDlRqsbdDxZIn9Q` (unverified → daily upload cap) | `storage/youtube_session.json` (refreshed 2026-11-18). Backup: `storage/youtube_session.backup.json` |
| Content Rewards | contentrewards.com (Saad's account) | Signed in inside the **built-in Claude browser** |
| TikTok Studio / YouTube Studio | same accounts | Also signed in inside the **built-in Claude browser** (YouTube signed in 2026-11-18) |

**You do not need to ask Saad to sign in** while these keep working. When a login expires:
- **YouTube:** run `.venv/bin/python tools/youtube_reverify.py` (opens a visible window with the saved session; Saad clicks through
  "Verify it's you" and closes it; the session saves automatically).
- **TikTok:** `.venv/bin/python tiktok_login.py` (writes the default session).
- Never type passwords, codes or CAPTCHAs yourself. Those are Saad's.

## 2. Hard rules (Saad's)
1. **Free tools only.** Flag any cost first.
2. **Post only on Saad's go-ahead in the current session.** He gave a standing "upload after every hour or whatever you say" for the
   GTA edits. Verify every post afterwards (open TikTok Studio / YouTube Studio and check status).
3. **Never dump uploads.** TikTok: **at most 1 post per 3–4 h** (5 posts in 10 min once got ~0 views). YouTube: upload, then set
   **scheduled publish times ~3 h apart**. Studio only allows scheduling from *tomorrow*.
4. **Submit to Content Rewards within 30 MINUTES of posting**, from a linked account, or the clip can never be submitted.
5. Licensed or campaign-provided audio only. Put the campaign's required caption text and `#ad` in every post.
6. **Saad must join each brand's Whop and send analytics** in their support chat before payouts. Remind him; you can't do it.
7. Use the **built-in Claude browser** (`mcp__Claude_Browser__*`) for Studio and Content Rewards work. He dislikes extra
   Chrome windows. The exception is the uploader, which must run its own visible window (see §5).
8. Never repeat API keys. Never put Saad's email in external requests.

## 3. Campaigns joined (contentrewards.com/c/discover)
| Campaign | Pay | Key rules |
|---|---|---|
| **GTA 6 Clipping – Tokyo Girl** (Placements), id `40046522-56d9-45ad-9198-faea8eca90c6` | $0.70/1K, $2 min, $35 max, TikTok + IG | Song "Tokyo Girl" by Passive = **only audio** (no game dialogue). Caption must include `Song: Tokyo Girl by @Passive` + `#ad`. ≥60% Tier-1 views, ≥1% engagement. Brief: docs.google.com/document/d/1MouSmbi_618SmahnpcNKQOsveIZxBAR88z8piK_l63w |
| Call of Duty Warzone S1 (Clipping Culture) | $2/1K, TikTok + IG | CoD logo + "Season 1 out now" on screen, tag @callofduty, `#Ad` |
| Call of Duty MW4 DMZ (Clipping Culture) | $2/1K, TikTok + IG | Free-trial line on screen, @callofduty, `#Ad` |
| IShowSpeed x Expedia | $1/1K, TikTok + IG + YT | Tag @IShowSpeed @Expedia, `#Ad` |
| Marlon | (diamond sponsor) | Off-brand. Ignore unless Saad asks |

All captions and post links so far: `storage/clips/batch2_captions.md`. Append to it after every post.

## 4. Current state (2026-11-18 ~18:00 AWST)
**TikTok @sidequestclips.gg, GTA edits:**

| Edit | Posted (AWST) | Views @12:30 | Content Rewards |
|---|---|---|---|
| gta6_tomorrow | Nov 18 00:56 | 206 | submitted |
| gta6_vice_city | 03:13 | 233 | submitted |
| gta6_jason_lucia | 06:15 | 218 | submitted |
| gta6_trailer1 | 09:16 | 233 | submitted |
| gta6_leonida_man | 12:17 | — | **missed**: stuck "Content under review" for more than 30 min (robbery/mask shots probably flagged) |

**Still to do (Nov 19, GTA 6 launch day; US unlock ≈ 13:00 AWST):**
- ~13:30 AWST: post `gta6_its_out.mp4`, caption `13 years later... GTA 6 is finally here. Song: Tokyo Girl by @Passive #ad #gta6 #gtavi #gta6release #fyp`
- ~17:00 AWST: post `gta6_sick_day.mp4`, caption `Not coming back till 100%. Song: Tokyo Girl by @Passive #ad #gta6 #gtavi #gamer #fyp`
- Submit each one within 30 min. Saad wanted a reminder first, and the Mac must be awake (see §6).

**YouTube Side Quest Clips:** `GTA 6 comes out TOMORROW` is public. Scheduled for Nov 19 (AWST): trailer1 00:00, Vice City
03:00, Jason & Lucia 06:00, Leonida Man 09:00. Video IDs: tomorrow u2fIgP-jbSo, vice e6Ty9Sr6FOU, jason g7p_TRJaIRc,
leonida lHdBgfhY2P8, trailer1 Qm2alW-3DL0. YouTube doesn't pay for this campaign (TikTok/IG only); it's extra reach.

## 5. Tools and how to use them
| Task | Command / file |
|---|---|
| Make GTA edits | `storage/clips/gta6/make_edits.py [name]`. Official Rockstar trailers in `src/` (launch `rz1B4B2yBZY.mp4`, T2 `VQRLujxTm3c.mp4`, T1 `QdBZY2fkU-0.mp4`), song `src/tokyo_girl.mp3` (24.7 s). Cuts on the beat grid `CUTS`; layout = blurred fill + 16:9 shot + bold text band; output 1080x1920, 22.8 s, −14 LUFS. Add an entry to `EDITS` (15 shots `(src, start_sec)` + 2 text lines). **QA every edit**: pull one frame per shot (avoid logos, black frames, ESRB cards, old "2025/2026" date cards; Trailer 2 contact-sheet indices after ~85 s are 10 s early). |
| Generic clips | `tools/clipper.py` / `tools/clipper_pro.py` (1080x1920 60 fps, captions) |
| Post to TikTok | `.venv/bin/python storage/clips/gta6/post_one.py <mp4> "<caption>"` (headless works for TikTok) |
| Timed posts | background Bash: `sleep 10800; …post_one.py …`. You get notified when it finishes, then submit to Content Rewards |
| Post to YouTube | `storage/clips/gta6/yt_upload.py <name…>`. Runs **headed** (`headless=False`). Headless triggers Google's "Verify it's you", which blocks the upload. Edit the `V` list for new clips. |
| Schedule YouTube | `storage/clips/gta6/yt_schedule.py "videoId|Nov 19, 2026|3:00 AM" …`. The date field ignores typed input; it defaults to tomorrow. The time field works. Verify in the Studio Content list after. |
| Keep the Mac awake | background `caffeinate -ims -t <seconds>` (screen may sleep; **lid must stay open**). Saad sleeps in the same room, so no screen light. |
| Uploader code | `app/services/tiktok_uploader.py`, `app/services/youtube_uploader.py` (sessions via `session_path=`) |

**Content Rewards submit flow (built-in browser):**
1. Open the campaign page → click the orange **Submit clip** (≈ x717, y522 in an 800-wide pane).
2. If the new post appears as a card, it's preselected. If the dialog says "No new clips yet", sync can take 5+ minutes. Get the
   link from TikTok Studio (`tiktok.com/tiktokstudio/content`, first `a[href*="/video/"]`) and type it into **Paste a link**,
   or wait and reopen.
3. Click the **label text** of "I've read the requirements…" once. Don't use `form_input` on it: that desyncs React and the box
   resets on submit. The Submit button turns orange when it registers.
4. Click **Submit clip**. Confirm the dialog says **"Clip submitted"**. "We couldn't read that" means TikTok is still processing
   or reviewing; retry every few minutes until the 30-minute mark.

## 6. Gotchas learned
- TikTok "Content under review / Only me" right after posting is normal, but it can outlast the 30-minute window. Avoid violent
  shots (robbery, guns, masks) in campaign edits.
- zsh: `rm -f x_*.jpg && …` fails when nothing matches (no-match error stops the chain). Use `(N)` or plain `;`.
- Built-in browser: don't emulate a wider viewport with `resize_window`, because clicks land in the wrong place. Use the native size.
- ffmpeg here has no `drawtext`. Use PIL text images (`tools/clipper._text_img`). `-vsync` isn't supported: use `-fps_mode`.
- Campaign videos must not contain talking or dialogue (GTA). The song must be the main audio.
- Earlier Side Quest posts got ~2–3 views. The GTA launch-week edits got ~200+, so trending topics matter.

## 7. Skills / MCP connectors useful here
- **Built-in browser** `mcp__Claude_Browser__*` (navigate, find, computer, javascript_tool, get_page_text). Already signed in.
  Skill: `anthropic-skills:built-in-browser`.
- **Claude in Chrome** `mcp__claude-in-chrome__*`: only if Saad asks for his real Chrome.
- **Background Bash + task notifications** for timers. `ScheduleWakeup` / `/loop` only for external polling.
- `mcp__scheduled-tasks__*` exists for recurring jobs (not used yet; ask Saad first).
- `WebSearch` for campaign briefs and facts. `SendUserFile` to send previews to Saad's phone.
- Not needed here: cartoon-3d-short (that's the Another You lane).

## 8. Finding more campaigns (streamer clips ARE allowed in many)
- **The GTA 6 Tokyo Girl brief bans other creators' videos and talking.** Streamer clips can't be used for that campaign,
  but that rule is specific to it.
- **Streamer clipping campaigns** pay you to clip *their* streams, so streamer footage is the whole point. Browse
  **contentrewards.com/c/discover** ("All campaigns", scroll). On 2026-11-19 the gaming/streamer ones included:
  Stream House LA Clipping ($0.50–2/1K), Douxds x Manë Clipping ($1.50–2/1K), WatchMeWin Clipping ($0.50–0.80/1K),
  Daimon X Syndicate ($2/1K), HardcoreSMP Minecraft Clipping ($2/1K), Roblox Content Rewards ($1/1K), Jake Paul MVP x PFL
  Interview ($0.50/1K), and GATTOUZ × GTA VI × 1WIN ($0.35/1K; a betting sponsor, so ask Saad before touching it).
- Open each brief: footage source (they usually give a Drive folder or VOD links), required tags, banned content, platforms.
  Check the remaining budget, since nearly-spent budgets pay little.
- **Joining a campaign means accepting its terms. Ask Saad first.** Then he may need to join that brand's Whop for approval.

### Stream House LA (joined 2026-11-19 00:20 AWST, Saad's go-ahead)
- It is a **reality show on CWETV** (influencers in a house), not gaming streams. Footage: Dropbox folder (EP1 5.5 GB, EP2 MASTER 18.9 GB),
  linked on the campaign page. New episodes Mondays 6 PM (US); clip the current episode.
- **Needs a dedicated streamer/entertainment account** (or an existing entertainment page with 2K+ followers). Side Quest
  (gaming, few followers) does not qualify. Bio: one line about Stream LA + tag @streamhousela. Warm up 24 h before the first post.
- Every clip: 9:16, clean on-screen title (creator name first), CTA on screen + in the caption (rotate: "Watch Streamhouse LA on CWETV"...),
  tag the cast member, hashtags `#streamhouselacwe #streamhousela #cwetv #chickenwrapentertainment`, no watermarks, US/UK/CA audience.
- **A story on IG and TikTok for every clip** (IG: cwenetwork.com/buy?campaign=motionclipping; TikTok: their QR code).
- Pay: TikTok/IG $2/1K, YT $0.50/1K. Paid to Whop balance 4 days after approval. Docs: requirements 1IMvyOM2qIdCaGpOTCO95kk46HkghBM9pqrCz2EE3UgU,
  strategy 1NFNw6TZ91CNBRB0SAT2GfyIbiBxjJisdWsu4CAB3zVo (Google Docs, export?format=txt works).

## 9. Saad's standing instruction (2026-11-19): GTA 6 streamer and gameplay clips from YouTube
- Find GTA 6 streamer moments and high-quality (4K, no-commentary) gameplay **on YouTube, not only via Whop**. Make edited
  9:16 clips and upload them to Side Quest for reach.
- Credit the creator on screen and in the caption. Edit the footage (hook title, captions, zooms, cuts); never post raw re-uploads.
  Skip graphic, gun-heavy or robbery moments.
- **Do not submit these to the Tokyo Girl campaign** (its brief bans other creators' videos). Paid posts stay the official-footage edits.
- Downloads with yt-dlp are OK. Say the size first if it's over 2 GB, and delete the sources after cutting.
- Same spacing rules (TikTok 1 per 3–4 h; YouTube scheduled ~3 h apart). Show Saad the first clip of a new batch.
- Risk: copyright claims on reposted streams. Crediting and editing reduce it but don't remove it.

## 9. GTA 6 streamer clips (added 2026-11-19, Saad's new direction)
- Folder `storage/clips/gta6_streams/`: `make_stream_clips.py` (CLIPS dict: src, segs `(start, end, zoom_from, zoom_to[, src][, crop])`,
  facecam crop `cam`, gameplay crop `game`, title, credit) → 9:16 with hook title, facecam panel, zoompan, karaoke subs
  (current word yellow), credit; slurs muted, profanity starred; auto loudness fix. `post_both.py <name>` posts TikTok
  (headless) + YouTube (headed, Public) and then **deletes** the clip, its build files and any source no unposted clip
  uses (Saad: "always delete the remaining useless videos"). `post_at.sh "YYYY-MM-DD HH:MM" <name>` = timed post.
- Finding moments: Twitch top clips `yt-dlp --flat-playlist "https://www.twitch.tv/<user>/clips?filter=clips&range=7d"`,
  then per clip `--print "%(categories.0)s"` to keep only "Grand Theft Auto VI" (1080p60 available). For YouTube VODs
  transcribe with faster-whisper (`small`) and pick lines; `heatmap` (most replayed) only exists on older videos.
  (Twitch GQL and using saved YouTube cookies in yt-dlp were blocked by the permission classifier; don't retry.)
- Streamers: Lacy streams GTA 6 on Twitch (+ edited videos on YouTube "Lacy"). Jynxzi streams GTA 6 on **YouTube**
  (was live 2026-11-19 ~02:00 AWST, video k3esjgmbphQ; clip it once the VOD is up). Marlon has barely played GTA 6.
- Rules used: skip nudity, sex talk, guns/robbery, animal harm, drugs; credit "🎥 <creator>" in caption + on screen.
- Campaigns found (NOT joined, Saad decides): Reach "GTA 6" group on Content Rewards: Lacy GTA VI Marathon pool $12.5K
  (min 750K approved views, #LACY + name in caption, Lacy main focus), Clix pool $5K (min 400K, #Clix), YourRAGE pool $5K;
  Eneba $2.50–3/1K (promo videos → ne.ba/clip code CLIP). Saad IS joined to Reach "Marlon Clipping" ($2.50/1K) but it only
  accepts the supplied Marlon trip footage (Drive folder on the campaign page), not GTA clips.
- Stream House LA was cancelled by Saad (2026-11-19): no account, all its media trashed.

## 10. Posting now runs on the HP laptop (2026-11-19, Saad approved)
- **HP:** `ssh saad@192.168.1.109` (key login from the Mac; never type its password, Saad runs any `sudo` himself with `ssh -t`). Details: Second Brain `brain/references/hp-linux-home-server.md`.
- **Folder:** `~/sidequest` on the HP holds:
  - `.venv` (Playwright 1.62 + Chromium, loguru, current yt-dlp) and `app/services/{tiktok,youtube}_uploader.py`, copies of the Mac files. `app/config` is a stub.
  - `storage/` with the TikTok and YouTube session JSONs (chmod 600) and `clips/<name>.mp4`.
  - `posts.json` (captions per clip), `queue.json` (jobs) and `runner.py`.
- **How it runs:** cron starts `runner.py` every 5 min. Each run posts at most ONE due job, guarded by a flock lock. TikTok jobs wait if the last TikTok post was under 3.5 h ago. A failed job gets one retry 20 min later. A clip is deleted from the HP once it's posted on both platforms. YouTube runs headed on the HP's desktop (DISPLAY=:0).
- **Logs:** `logs/runner.log` and `logs/results.jsonl`. Check with `ssh saad@192.168.1.109 'cd sidequest && .venv/bin/python runner.py --status'`.
- **To queue a new clip:** render it on the Mac, `scp` it to `sidequest/clips/`, add its captions to `posts.json`, then add jobs to `queue.json`. Times are Perth local. Post when the US is awake: **Perth 07:00–12:00**.
- **Still on the Mac:** rendering, Content Rewards submissions (built-in browser), Studio checks, logging links in batch2_captions.md. The runner can't submit paid posts, so Tokyo Girl posts need someone at the Mac within 30 min.
- **2026-11-19 lesson:** YouTube Shorts are also getting almost nothing (0–10 views each on the Nov 19 posts), not just TikTok. The plan Saad OK'd:
  - Join streamer clipping campaigns so viral clips pay (Saad picks).
  - Add Instagram Reels (Saad creates the account).
  - TikTok max 3/day, at least 4 h apart, after a 24–48 h rest.
  - Strong first-second hook plus a pinned question comment.
- **Queue as of 23:50 Nov 19:**
  - YT: kai_shower Nov 20 07:30, lucia_ready Nov 20 10:00.
  - TT: jynxzi_rock Nov 21 07:30, lucia_ready Nov 21 11:30, kai_shower Nov 22 07:30.

## 11. Campaigns joined 2026-11-20 + Instagram (Saad: "join all the campaigns that can make me money")
- **Joined:** Dasgasd3m x Ruckus ($2/1K), KreekCraft ($1/1K, overlay required), Dylan Page marathon ($1/1K), AsianJeff ($1/1K, ends Nov 26), Kai Cenat $10K pool, Lacy $12.5K pool. Plus Tokyo Girl from before.
- **Rules:** one file per campaign, with an index table, in `storage/clips/campaigns/` (README.md). Each post goes to ONE campaign; submit within 30 min. Clip the streamer the campaign pays for, with its hashtag.
- **Skipped on purpose:** GATTOUZ × 1WIN (betting), BenDaDonnn × Puffco (vape brand), TOMO (budget almost gone). Ask Saad before joining those.
- **Instagram:** @sidequest_clips_ (Saad made it and logged in, built-in browser).
  - Profile set up 2026-11-20: Side Quest hood logo, bio.
  - Switched to a Creator account (category Gaming video creator) so Insights work.
- **Instagram uploader:** `app/services/instagram_uploader.py` (Playwright, `storage/instagram_session.json`), session saved by `instagram_login.py` (Saad logs in; the script saves once the `sessionid` cookie appears). Copies are on the HP.
- **Runner:** `runner.py` on the HP takes platform `"ig"`. A clip is deleted only after every platform in its posts.json `platforms` list (default tt, yt, ig) is done.
- **To do:**
  - First IG Reel posted 2026-11-20 00:34 from the HP: https://www.instagram.com/reel/Df7hL8fBF9a/ (checked live).
  - Connect the IG account in Content Rewards.
  - New IG account: 1 reel/day for the first week.

## 12. Telegram Jarvis + Cortex HQ dashboard (2026-11-20)
- **Jarvis:** `~/cortex-bots/bots/sidequest/jarvis.py` on the HP (systemd user service `sidequest-jarvis`, linger on). Telegram alerts for uploads, battery under 30% or charger unplugged, and a 21:00 views report. Commands: /status /stats /queue /battery.
- **Dashboard:** http://192.168.1.109:8090 (`cortex-bots/hq/`). After every campaign submission or payout, update `hq/data/earnings.json`. Add notable work to `hq/data/activity.json`.
- **Views:** collected every 2 h by `bots/sidequest/sq_stats.py`.
- **Fixed:** uploaders used `Meta+A`, which does nothing on Linux, so YouTube titles kept the filename. Now `ControlOrMeta+A`.
