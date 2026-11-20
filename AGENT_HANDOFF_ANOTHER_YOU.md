# Agent handoff: Another You (cartoon true-story shorts)

> Written 2026-11-18. Project root: `/Users/saad/MoneyPrinterTurbo`. Timezone AWST (UTC+8). Clipping lane: `AGENT_HANDOFF_CLIPPING.md`.
> Deeper history is in `CONTENT_START_HERE.md`, `STICK_CHANNEL_GUIDE.md` and `~/Second Brain/clients/content_channels/`.

## 1. Channel and logins (already saved, no sign-in needed)
| Platform | ID | Session file |
|---|---|---|
| YouTube | channel `UCJgTIuV9xpqGY_hqmmZwZ-Q` ("Another You") | `storage/sessions/anotheryou_youtube_session.json` |
| TikTok | `@another.you98` | `storage/sessions/anotheryou_tiktok_session.json` |

If a session expires: `tools/youtube_reverify.py storage/sessions/anotheryou_youtube_session.json` (Saad verifies in the window),
or `youtube_login.py --channel anotheryou` / `tiktok_login.py --channel anotheryou`. Never enter passwords yourself.

## 2. Format (what Saad approved)
- **~60 s vertical true-story shorts, RicksClips3000 formula:** paradox hook as fact → setting → escalation (doubters) → "Wait…?" →
  **"You see,"** (real mechanism + everyday analogy) → ironic payoff on the last word. ~3.7 words/s, no dead air. Facts must
  be real and sourced at the top of `SCRIPT.md`. Never copy the reference channel's scripts or say its name.
- **Look = style B (chosen 2026-11-18):** painted backgrounds from Pollinations klein plus our flat toon characters (bean heads, ink
  outlines) drawn on top. 2.5D camera: slow push-ins and ease-out punch-ins on key words, kicks, flashes, light shafts,
  dust, and 6-frame dissolves between places. **Characters and props big and filling the frame.** Saad hated the 3D look
  (empty, blocky, boring camera).
- **Voices:** Chatterbox **#8 HYPE narrator** (ref `storage/voice_tests/k_am_puck.wav`, exag 0.9, cfg 0.35) and **#7 for
  character lines** (ref `k_am_fenrir.wav`, exag 0.8). Run with `.venv-cb/bin/python`. Write years as words; use "..." and "!" for delivery.
- **Music:** Audionautix (Jason Shaw) CC BY 4.0. Credit is mandatory: `app/services/music_credit.py` (YOUTUBE_CREDIT / SHORT_CREDIT).
- **Captions:** one bold word at a time, lower middle (kept since Saad hasn't objected).

## 3. Pipeline (copy `rat_tails` as the template)
1. `storage/stick_episodes/<ep>/SCRIPT.md`: facts + sources, the script split into lines (V8/V7), and the scene list. **Show Saad and
   wait for approval.**
2. `voice/gen_cb.py`: 2 Chatterbox takes per line (~1.5 min per take). Then `voice/assemble_cb.py` picks takes by whisper match,
   chains lines with short gaps, and writes `voice.wav`, `words.json` and **`remotion_shorts/src/videos/<ep>/timing.ts`**.
3. `bg/gen_bg.py`: one klein background per scene, 1080x1920, seed 23. Prompt ends with "stylized cartoon toon render, thin black
   ink outlines…, empty scene with no people and no animals, no text". Copy to `remotion_shorts/public/<ep>/`. Make a grid
   overlay to find coordinates for floors, desks and grates.
4. `remotion_shorts/src/videos/rat/` is the engine:
   - `Rat.tsx` runs the canvas, camera, dissolves and grade.
   - `draw.ts` has `char()` for toon characters (from `../ghost/toon`), `rat()`, `tails()`, `coin()`, `burst()`, `qmark()`, `stink()`.
   - `plan.ts` holds the shots, keyed to words with `S(id)` / `Wd(id, word)`. Each shot has a bg, cams, kicks, flashes and `draw()`.
   - Desk occluders: redraw the bg clipped to a polygon so characters stand behind furniture.
   - Register the composition in `src/Root.tsx`.
5. Draft render: `npx remotion render src/index.ts <Comp> out/<ep>/draft.mp4 --scale=0.4` (~35 s). **Check frames at every key
   word.** Final render: `--codec h264 --crf 16` → `out/<ep>/<ep>_raw.mp4`.
6. `storage/stick_episodes/<ep>/finish.py`: synthesized SFX keyed to words, ducked music, loudnorm −14, captions → `<ep>.mp4`. Make
   a 720p preview and send it with `SendUserFile`. **Upload only when Saad says "upload".**
7. Upload: `storage/stick_episodes/rat_tails/upload.py yt|tt` (pattern). YouTube must run **headed** if Google asks "Verify it's
   you". Afterwards confirm: YouTube via `youtube.com/channel/<id>/shorts`, TikTok via TikTok Studio. TikTok "under review /
   Only me" is normal at first.
8. Post at most 1 per platform every 3–4 h. Update the memory, `CONTENT_START_HERE.md` and the Second Brain history.

## 4. Episodes
| Episode | Style | YouTube | TikTok |
|---|---|---|---|
| The Gold in the Jar (Nobel medals) | old 3D | live (Shorts tab) | — |
| The Army Made of Air (Ghost Army) | old 3D | youtube.com/shorts/eFPTaP49P8w | tiktok.com/@another.you98/video/7709180150541389076 |
| **Rat Tails** (1902 Hanoi rat bounty) | **B** | youtube.com/shorts/Y5psL7U2VhM | tiktok.com/@another.you98/video/7709428746834480404 (was under review at upload; check it went public) |

Next ideas: **Pump Handle** (John Snow, cholera 1854), **Square Windows** (de Havilland Comet crashes).

## 5. Skills / MCP connectors
- Skill **`cartoon-3d-short`** (`~/.claude/skills/cartoon-3d-short`): the story formula, sound and QA rules, and the old 3D engine
  (`src/videos/bridge|gold|ghost`). Its toon character code (`ghost/toon.ts`) is reused by style B.
- Remotion pins: React 18, fiber 8, postprocessing 2.16, three 0.169. Newer versions render blank.
- Built-in browser `mcp__Claude_Browser__*` for Studio checks (signed in to Side Quest YouTube; Another You uses the
  Playwright session files above).
- `SendUserFile` for previews. Background Bash for long renders/TTS (you get notified when they finish).

## 6. Saad's preferences (short)
Direct, impatient with repeated mistakes. Give short honest updates. Show the script before spending credits. Review frames
before sending anything. No 3D/Pixar look. Clarity beats density. Free tools only.
