#!/usr/bin/env python3
"""
Story writer for "Another You" episodes (free: Groq openai/gpt-oss-120b).

Pipeline, so logic holes are caught before the user reviews the script:
  1. BIBLE   - premise, cast roles (who each cast member plays, when they first appear on screen),
               fixed location descriptions (keeps backgrounds consistent), props and their state changes,
               and a chronological event outline.
  2. CRITIC  - a strict continuity editor reviews the bible (cause and effect, setups/payoffs, ages, timeline);
               the bible is revised until clean (max 2 rounds).
  3. BEATS   - narration (flowing storytelling) + one frame per beat, built from the bible.
  4. CHECKS  - deterministic code checks (introductions, edits, digits, fragment-style narration, length...)
               + the critic again on the full script; fixed by revision (max 2 rounds).
The result is a script.json for tools/stick_story.py, plus bible.json and review.md for the human review.
"""

import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.config import config  # noqa: E402

WRITER_MODEL = "gemini-3.8-flash"  # free tier (Flash only); Groq "openai/gpt-oss-120b" is the fallback
GEMINI_FALLBACKS = ["gemini-3.8-flash", "gemini-3-flash-preview", "gemini-flash-latest"]  # tried in order when busy
SECONDS_PER_WORD = 0.305  # en-US-AndrewMultilingualNeural at +5%, measured on the_wallet
CAST_IDS = ["you", "crush", "bestie", "rival", "mentor", "pet"]

CAST_GUIDE = """Recurring cast (ids). They are actors: each episode gives them a role. Identity = head features.
- you: the hero = the viewer ("you"). Boy/young man, short messy black hair.
- crush: girl/young woman, long auburn ponytail.
- bestie: boy/young man, curly brown hair, big round glasses. Loyal, impulsive.
- rival: man with slicked black hair and a curled mustache. Smug.
- mentor: bald old man with a long white beard and round glasses. Can play any old man (a grandpa, a stranger,
  or the hero grown old).
- pet: small white cartoon dog with floppy black ears. Cannot talk.
Characters outside the cast (shopkeepers, crowds, a doctor...) are background people: they never need setup,
but they cannot be important speaking characters for more than a beat or two."""

STYLE_EXAMPLE = """Good narration (flowing, conversational, inner thoughts, sentences that carry you along):
"You reach down and pull out a brown leather wallet, and the first thing you notice is how thick it is."
"You open it, and your stomach drops. There's three thousand dollars in there. In cash."
"And the worst part is, he's not wrong. The bus is empty, nobody saw a thing, and nobody would ever know."
"And right in the middle of that very serious moment, your stomach growls. Loudly. Arthur bursts out laughing
and puts the kettle on."
BAD narration (never write like this): "A brown leather wallet. Thick." "Arthur looks tired." "You check. Four twelve.\""""

BIBLE_PROMPT = """You are the head writer of "Another You", a channel of 2D cartoon stories told in SECOND PERSON:
the viewer IS the hero ("you"). Stories are made up but GROUNDED: realistic cause and effect, concrete details
(exact amounts, times, places), every payoff set up earlier, no coincidences that solve the problem, no plot holes.
Told CHRONOLOGICALLY (no flashbacks, no intercut timelines). Emotional or funny, with a satisfying ending.

{cast}

Write the STORY BIBLE for this idea: {idea}
Target length: about {minutes} minutes of narration.

Return JSON only:
{{
 "title": "...",
 "logline": "one sentence",
 "mood": "emotional|comedy|suspense|epic|romance",
 "roles": {{"<cast id>": {{"role": "who they are in this story", "mentioned_as": ["phrases the narration uses
   for them, e.g. 'your best friend', 'Arthur' - no pronouns"], "outfit": "outfit in this story (or 'default')",
   "first_on_screen": "the event where they first appear ON SCREEN (before they say or do anything)"}}}},
 "locations": {{"<location id>": "fixed visual description used every time we return there: place, time of day,
   lighting, key furniture/props, background people (or 'nobody else')"}},
 "props": [{{"name": "...", "notes": "state changes, e.g. 'sold before the story starts - never visible'"}}],
 "outline": ["event 1", "event 2", "... chronological, every event caused by an earlier one"]
}}
Use 3 to 7 locations. Only cast members that matter. Every cast member that speaks or acts must have a
first_on_screen event BEFORE that moment."""

CRITIC_PROMPT = """You are a ruthless continuity editor. Find REAL problems only:
- a character speaks, acts, or is referred to as present before they were ever shown on screen
- cause and effect that doesn't add up, coincidences that solve the problem, unexplained knowledge
- payoffs that were never set up, setups that never pay off
- ages, dates, money, distances or timelines that don't add up
- props that reappear after being gone, or change without reason
- a character in two places at once, or a location that contradicts its description
- non-chronological storytelling, confusing jumps, missing steps between events
- (for scripts) narration written as choppy 3-5 word fragments instead of flowing storytelling
Return JSON only: {{"issues": ["specific problem + how to fix it", ...]}} (empty list if none).

{content}"""

BEATS_PROMPT = """Turn this story bible into the final beat-by-beat script for a 2D cartoon in second person.

BIBLE:
{bible}

{cast}

{style}

Each beat = ONE on-screen frame + the narration spoken while it is shown.
- "new": a new shot. Fields: "location" (a location id from the bible), "scene": who is where doing what, each
  character's facial expression, camera framing (wide / medium / close-up). Do NOT repeat the location
  description, it is added automatically.
- "edit": the SAME shot as the previous beat where ONLY a facial expression or a small hand gesture changes.
  Field "change": e.g. "only YOU's face changes: he now looks shocked". Anything bigger (moving, standing up,
  new object, new person, different place) must be a "new" beat.
- "characters": the cast ids VISIBLE in the frame (max 3). An edit keeps exactly the previous frame's characters.

Narration rules:
- Second person, flowing conversational storytelling, sentences mostly 12-30 words, with feelings and inner
  thoughts; a sentence may continue across two beats. Never strings of short fragments.
- First beat = a scroll-stopping hook. Last beat = the emotional/funny payoff line.
- Write ALL numbers as words ("six hundred and twelve dollars", "four twelve"), never digits.
- Never use cast ids as names; use the role names / "your best friend" etc.
- A character may only speak or act in a beat where they are visible, and only after their first on-screen beat.
- Total narration {words_min}-{words_max} words, {beats_min}-{beats_max} beats, about 35% edits.

Return JSON only:
{{"title": "...", "mood": "...", "beats": [{{"type": "new", "location": "...", "characters": ["you"], "scene": "...",
 "narration": "..."}}, {{"type": "edit", "characters": ["you"], "change": "...", "narration": "..."}}]}}"""

REVISE_PROMPT = """Revise this {what} to fix EVERY issue listed. Keep everything that is not affected.
Return the complete revised JSON in the same format, JSON only.

ISSUES:
{issues}

{what_upper}:
{content}"""


def _client():
    from openai import OpenAI

    return OpenAI(base_url="https://api.groq.com/openai/v1", api_key=config.app.get("groq_api_key"))


def _gemini_json(prompt: str, max_tokens: int, temperature: float, model: str = WRITER_MODEL) -> dict:
    import requests

    body = {"contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens,
                                 "responseMimeType": "application/json"}}
    r = requests.post(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                      json=body, headers={"x-goog-api-key": config.app.get("gemini_api_key")}, timeout=180)
    if not r.ok:
        raise RuntimeError(f"{r.status_code} {r.text[:150]}")
    return json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])


def _groq_json(prompt: str, max_tokens: int, temperature: float) -> dict:
    resp = _client().chat.completions.create(
        model="openai/gpt-oss-120b", messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"}, temperature=temperature, max_tokens=min(max_tokens, 12000),
        extra_body={"reasoning_effort": "medium"})
    return json.loads(resp.choices[0].message.content)


def llm_json(prompt: str, max_tokens: int = 16000, temperature: float = 0.7) -> dict:
    """Gemini Flash (free tier) first; on repeated failure fall back to Groq gpt-oss-120b."""
    last = None
    for attempt in range(6):
        try:
            if attempt < 4 and WRITER_MODEL.startswith("gemini"):  # rotate models instead of waiting on a busy one
                return _gemini_json(prompt, max_tokens, temperature, GEMINI_FALLBACKS[attempt % len(GEMINI_FALLBACKS)])
            return _groq_json(prompt, max_tokens, temperature)
        except Exception as e:  # noqa: BLE001
            last = e
            busy = any(x in str(e) for x in ("429", "503", "rate", "timed out", "Timeout"))
            wait = 8 if busy else 3
            print(f"    llm retry in {wait}s ({str(e)[:90]})", flush=True)
            time.sleep(wait)
    raise RuntimeError(f"writer LLM failed: {last}")


def critic(content: dict, label: str) -> list[str]:
    res = llm_json(CRITIC_PROMPT.format(content=f"{label}:\n{json.dumps(content, indent=1)}"), max_tokens=4000, temperature=0.2)
    return [str(i) for i in res.get("issues", [])]


def revise(content: dict, issues: list[str], what: str) -> dict:
    return llm_json(REVISE_PROMPT.format(what=what, what_upper=what.upper(), issues="\n".join(f"- {i}" for i in issues),
                                         content=json.dumps(content, indent=1)), temperature=0.5)


def _sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?])\s+|\s*\"\s*", text) if len(s.split()) > 0]


def code_checks(script: dict, bible: dict, words_range: tuple[int, int], beats_range: tuple[int, int]) -> list[str]:
    beats = script.get("beats") or []
    issues = []
    if not beats_range[0] <= len(beats) <= beats_range[1]:
        issues.append(f"Script has {len(beats)} beats; it needs {beats_range[0]}-{beats_range[1]}.")
    words = sum(len(b.get("narration", "").split()) for b in beats)
    if not words_range[0] <= words <= words_range[1]:
        issues.append(f"Narration has {words} words; it needs {words_range[0]}-{words_range[1]}.")
    if beats and beats[0].get("type") != "new":
        issues.append("Beat 1 must be a 'new' beat.")
    locations = bible.get("locations", {})
    roles = bible.get("roles", {})
    seen: set[str] = set()
    prev_chars: list[str] = []
    scene_chars: set[str] = set()
    cur_loc = None
    for i, b in enumerate(beats, 1):
        chars = list(dict.fromkeys(b.get("characters") or []))
        nar = b.get("narration", "")
        if any(c not in CAST_IDS for c in chars):
            issues.append(f"Beat {i}: unknown character ids {chars}.")
        if len(chars) > 3:
            issues.append(f"Beat {i}: {len(chars)} characters visible, max 3.")
        if b.get("type") == "new":
            if b.get("location") not in locations:
                issues.append(f"Beat {i}: location '{b.get('location')}' is not in the bible.")
            if not b.get("scene"):
                issues.append(f"Beat {i}: missing scene.")
        elif b.get("type") == "edit":
            if not b.get("change"):
                issues.append(f"Beat {i}: missing change.")
            if sorted(chars) != sorted(prev_chars):
                issues.append(f"Beat {i}: an edit must keep exactly the previous frame's characters {prev_chars}; "
                              f"make it a 'new' beat or fix the list.")
        else:
            issues.append(f"Beat {i}: type must be 'new' or 'edit'.")
        if re.search(r"\d", nar):
            issues.append(f"Beat {i}: write numbers as words, no digits: \"{nar[:60]}\".")
        # nobody materializes in a scene that already started without them (the "The Wallet" friend bug):
        # a character new to this location's ongoing scene needs an entrance in the narration
        loc = b.get("location") if b.get("type") == "new" else cur_loc
        if i > 1 and loc == cur_loc:
            for c in chars:
                if c not in scene_chars and c != "you":
                    entrance = any(w in nar.lower() for w in ("walk", "arriv", "enter", "join", "show up", "shows up",
                                                               "comes in", "came in", "appear", "steps in", "runs in", "sits down next"))
                    if not entrance:
                        issues.append(f"Beat {i}: {c} is suddenly in the ongoing scene at '{loc}' without being shown "
                                      f"before or arriving. Show {c} from the scene's first beat, or narrate the entrance.")
            scene_chars.update(chars)
        else:
            scene_chars = set(chars)
        cur_loc = loc
        seen.update(chars)
        for cid, role in roles.items():
            if cid in seen or cid not in CAST_IDS:
                continue
            for phrase in role.get("mentioned_as", []):
                if len(phrase) > 3 and phrase.lower() not in ("you", "your") and phrase.lower() in nar.lower():
                    issues.append(f"Beat {i} (check): narration mentions '{phrase}' ({cid}) before they appear on "
                                  f"screen - fine only if they are not present/acting (e.g. a name on a card).")
                    break
        prev_chars = chars
    sents = [s for b in beats for s in _sentences(b.get("narration", ""))]
    if sents:
        short = sum(len(s.split()) < 6 for s in sents) / len(sents)
        avg = sum(len(s.split()) for s in sents) / len(sents)
        if short > 0.3 or avg < 10:
            issues.append(f"Narration is too choppy ({short:.0%} of sentences under 6 words, average {avg:.1f} words). "
                          f"Rewrite as flowing storytelling sentences of 12-30 words.")
    return issues


def compose_scenes(script: dict, bible: dict) -> dict:
    """Prepend the fixed location description to every new scene and add role outfits, so backgrounds
    and costumes stay identical whenever the story returns somewhere."""
    locs = bible.get("locations", {})
    roles = bible.get("roles", {})
    for b in script["beats"]:
        if b["type"] != "new":
            continue
        outfit = " ".join(
            f"{c.upper()} wears {roles[c]['outfit']}." for c in b["characters"]
            if c in roles and roles[c].get("outfit") and roles[c]["outfit"].lower() != "default")
        b["scene"] = f"{locs.get(b.get('location'), '')} {b['scene']} {outfit}".strip()
    return script


def write_story(idea: str, minutes: float = 2.5, log=print) -> tuple[dict, dict, list[str]]:
    words_target = int(minutes * 60 / SECONDS_PER_WORD)
    words_range = (int(words_target * 0.85), int(words_target * 1.1))
    beats_range = (max(12, words_target // 20), words_target // 12)

    log("  1/4 writing story bible")
    bible = llm_json(BIBLE_PROMPT.format(cast=CAST_GUIDE, idea=idea, minutes=minutes))
    for r in range(2):
        issues = critic(bible, "STORY BIBLE")
        log(f"  2/4 continuity review of bible, round {r + 1}: {len(issues)} issue(s)")
        for i in issues:
            log(f"      - {i[:160]}")
        if not issues:
            break
        bible = revise(bible, issues, "story bible")

    log("  3/4 writing beats")
    fmt = dict(bible=json.dumps(bible, indent=1), cast=CAST_GUIDE, style=STYLE_EXAMPLE, words_min=words_range[0],
               words_max=words_range[1], beats_min=beats_range[0], beats_max=beats_range[1])
    script = llm_json(BEATS_PROMPT.format(**fmt), max_tokens=24000)
    remaining: list[str] = []
    for r in range(3):
        issues = code_checks(script, bible, words_range, beats_range)
        if r < 2:
            issues += critic({"bible": bible, "script": script}, "STORY BIBLE + SCRIPT")
        log(f"  4/4 checks on script, round {r + 1}: {len(issues)} issue(s)")
        for i in issues:
            log(f"      - {i[:160]}")
        if not issues or r == 2:
            remaining = issues
            break
        script = revise(script, issues, "script")
    script = compose_scenes(script, bible)
    script["title"] = script.get("title") or bible.get("title", "")
    script["mood"] = script.get("mood") or bible.get("mood", "emotional")
    return script, bible, remaining


def review_markdown(script: dict, bible: dict, remaining: list[str]) -> str:
    words = sum(len(b["narration"].split()) for b in script["beats"])
    lines = [f"# {script['title']}", "", f"**Logline:** {bible.get('logline', '')}", "",
             f"**Mood:** {script.get('mood')} · **Beats:** {len(script['beats'])} · **Words:** {words} "
             f"(~{words * SECONDS_PER_WORD / 60:.1f} min)", "", "## Cast roles"]
    for cid, r in bible.get("roles", {}).items():
        lines.append(f"- **{cid}** — {r.get('role')} (first on screen: {r.get('first_on_screen')})")
    lines += ["", "## Script", ""]
    for i, b in enumerate(script["beats"], 1):
        tag = "🆕" if b["type"] == "new" else "✏️"
        lines.append(f"{i}. {tag} {b['narration']}  \n   _{b.get('scene') or b.get('change')}_ — {', '.join(b['characters'])}")
    if remaining:
        lines += ["", "## ⚠️ Unresolved automatic-check issues", *[f"- {i}" for i in remaining]]
    return "\n".join(lines) + "\n"
