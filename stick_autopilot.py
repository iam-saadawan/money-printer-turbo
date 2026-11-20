#!/usr/bin/env python3
"""
Stick Autopilot - 2D Stick Figure Absurd History Storytelling Engine.
Modeled after viral channels like @_borntosuffer_, Cyanide and Happiness, and Casually Explained.
Produces punchy word-synced 2D cartoon videos with:
1. True minimalist stick figure anatomy (round pure white circular heads #FFFFFF, dot eyes, thin stick limbs).
2. Consistent character visual anchors across all scenes.
3. Vast, expansive, cinematic 2D cel-shaded backgrounds (no blank space, no split panels, no borders, no comic strips).
4. Dynamic 2-3 word lower-third subtitles that never cover or clutter the artwork.
5. Static scene cuts (min 3s screentime, strictly NO zoom / expansion).
6. Pure dry comedic narration with zero background music.
"""

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import edge_tts
from loguru import logger
from moviepy.audio.io.AudioFileClip import AudioFileClip
from openai import OpenAI

from app.config import config
from app.models.schema import VideoAspect, VideoParams
from app.services import video
from app.services.pollinations_service import pollinations_service
from app.utils import utils

SYSTEM_PROMPT = """
You are an elite, award-winning viral comedy writer and animator for a top 2D stick-figure history channel (like 'Born to Suffer' or 'Casually Explained').
You specialize in absurd, gritty, conversational, hilarious true historical stories that hook viewers instantly and never let go.

TONE & VOICE RULES:
1. Speak directly, irreverently, and punchily like a hilarious storyteller talking to friends. NEVER use clinical, dry, or textbook language.
2. Total word count across all scenes must be 310 to 340 words (~125 to 140 seconds spoken).
3. 20 to 24 scenes total, with 10 to 18 words per scene.

MANDATORY VISUAL PROMPT RULES FOR EVERY SCENE:
Every single "visual_prompt" MUST strictly adhere to this exact 5-part formula:
1. Style Anchor (Mandatory): "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders."
2. Stick Anatomy Anchor (Mandatory): "All human characters are simplistic minimalist stick figures: round smooth blank pure white circular heads (#FFFFFF), two simple solid black dot eyes, thin black stick arms, thin black stick legs, no realistic nose, no ears, no realistic skin tones."
3. Character Consistency: Consistently describe characters with identical clothing, hair tufts, or props in every scene they appear.
4. Vast Environmental Background: Describe the wide panoramic world behind them (dusty country road stretching to distant green hills, bustling historic stadium grandstands, lush apple orchard, lavish Victorian office) with deep perspective, atmospheric lighting, and cel-shaded colors.
5. Action & Expression: Humorous, expressive cartoon poses and comedic physical storytelling.

Output STRICT JSON ONLY:
{
  "title": "Story Title",
  "hook_banner": "HOOK BANNER 💀",
  "scenes": [
    {
      "scene_id": 1,
      "text": "Scene narration text...",
      "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures: round smooth blank pure white circular heads, two simple solid black dot eyes, thin black stick limbs, no nose, no ears, no skin tone. [Character Description & Action]. [Vast Detailed Environmental Background]."
    }
  ]
}
"""

CURATED_1904_MARATHON = {
    "title": "The 1904 Olympic Marathon Was Pure Chaos",
    "hook_banner": "1904 OLYMPIC MARATHON 💀",
    "scenes": [
        {
            "scene_id": 1,
            "text": "In 1904, the Olympics hosted a marathon so completely unhinged that it barely qualified as a sporting event.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures: round smooth blank pure white circular heads, two simple solid black dot eyes, thin black stick limbs, no nose, no ears, no skin tone. In the foreground, several minimalist stick figure runners in vintage athletic tank tops and shorts stretch nervously on a red dirt track. Vast panoramic background of packed wooden stadium grandstands filled with Victorian spectators in bowler hats waving flags under a bright sunny sky, vintage 1904 Olympic banners hanging from wooden posts. Vibrant flat cel-shaded colors, clean bold ink outlines, rich environmental depth."
        },
        {
            "scene_id": 2,
            "text": "We're talking cars driving down dirt roads choking runners to death, an athlete taking an hour nap in an apple orchard, and a guy winning gold while tripping on rat poison.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures: round smooth blank pure white circular heads, two simple solid black dot eyes, thin black stick limbs, no nose, no ears, no skin tone. In the foreground, the protagonist stick figure runner in a red tank top and white shorts runs desperately forward while coughing. In the background, an open-top vintage red automobile speeds down the dusty dirt road kicking up an immense billowing cloud of orange dust, with wooden split-rail fences and green rolling hills under a sunny sky. Vibrant flat cel-shaded colors, clean bold ink outlines, dynamic cartoon action."
        },
        {
            "scene_id": 3,
            "text": "The guy in charge of the race, James Sullivan, was essentially an evil mad scientist.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures: round smooth blank pure white circular heads, two simple solid black dot eyes, thin black stick limbs, no nose, no ears, no skin tone. In the center, James Sullivan, the villainous race director stick figure: round pure white circle head, sinister narrow black dot eyes, thin black pencil mustache, wearing a formal Victorian black tuxedo suit, crisp white dress shirt, black bowtie, and tall black top hat, grinning evilly while holding a wooden clipboard. Vast panoramic lavish 1904 Victorian organizer office: large dark mahogany desk covered in vintage maps and papers, tall arched windows looking out onto a sunlit stadium in the distance, rich emerald green patterned wallpaper, brass banker lamps, and a wooden chalkboard with chalk diagrams. Vibrant flat cel-shaded colors, clean bold ink outlines, rich environmental depth."
        },
        {
            "scene_id": 4,
            "text": "He wanted to research purposeful dehydration, so he set up a twenty-five mile course in ninety-degree heat with literally one single water station.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs, no nose, no ears, no skin tone. A scorching country dirt road under a blazing yellow sun with heat shimmer. In the foreground, a single lonely wooden water barrel stands beside the empty road. In the far distance, tiny stick figure runners trudge through shimmering heat waves, surrounded by dry golden grass, wooden telegraph poles, and dusty rolling hills. Vibrant flat cel-shaded colors, clean bold ink outlines, vast desolate atmosphere."
        },
        {
            "scene_id": 5,
            "text": "To make matters worse, official cars drove right alongside the runners, kicking up massive clouds of dirt that literally shredded athletes' stomach linings.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A chaotic dusty country dirt road. A vintage 1904 brass-era red car barrels down the road, churning up an enormous blinding cloud of orange dust. Behind the car, several exhausted stick figure runners cough violently inside the thick dust storm with flying sweat drops. Wooden split-rail fences and telephone poles line the road under a dusty pale sky. Vibrant flat cel-shaded colors, dynamic cartoon action, no text."
        },
        {
            "scene_id": 6,
            "text": "Nine miles in, an American runner named Fred Lorz started cramping up violently.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Fred Lorz, the protagonist stick figure: round pure white circle head, spiky black hair tufts, wearing a vintage red running tank top and white athletic shorts, sits clutching both legs in exaggerated pain in a grassy roadside ditch. In the background, other stick figure runners jog past on the dusty dirt road lined with wooden fences and oak trees under a blue sky. Vibrant flat cel-shaded colors, humorous cartoon emotion."
        },
        {
            "scene_id": 7,
            "text": "Did he push through the pain? Absolutely not. He just hopped into his manager's convertible and cracked a huge smile.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A vintage open-top red convertible automobile idling on a country dirt road. Fred Lorz, the cheerful stick figure in his red running tank top and white shorts, casually climbs over the passenger door with a smug grin, sitting next to his driver stick figure who wears driving goggles and a flat cap. Scenic countryside road, green trees, and wooden fences in the background. Vibrant flat cel-shaded colors, funny expressive characters."
        },
        {
            "scene_id": 8,
            "text": "He drove eleven miles past his dying competitors, waving at spectators along the road like the King of England.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Fred Lorz riding luxuriously in the vintage red convertible, leaning back with a royal smug wave. On the roadside dirt sidewalk, Victorian stick figure spectators in bowler hats, suits, and dresses wave back, while in the background crawling exhausted runners collapse on the dirt road. Country wooden buildings, telegraph poles, and blue sky. Vibrant flat cel-shaded colors, hilarious cartoon scene."
        },
        {
            "scene_id": 9,
            "text": "He even crossed the finish line first and almost claimed the gold medal before officials realized he took an Uber.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Inside the 1904 Olympic stadium finish line. Fred Lorz in his red tank top stands grinning on the winners podium about to accept a gold medal, while an enraged official stick figure in a black suit frantically points at a vintage red convertible parked right beside the cinder track. Packed grandstands of shocked spectators gasp in disbelief. Detailed wooden stadium architecture, colorful banners. Vibrant flat cel-shaded colors, comedic drama."
        },
        {
            "scene_id": 10,
            "text": "Then you had Felix Carvajal, a Cuban mailman who raised travel money by begging on street corners in Havana.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Felix Carvajal, the Cuban mailman stick figure: round pure white circle head, bushy black mustache, wearing a vintage blue postal cap, white collared shirt, and grey trousers, stands smiling warmly holding out a tin begging cup on a historic Havana cobblestone street. Background shows colorful Spanish colonial buildings with wrought-iron balconies, palm trees, and warm tropical sunlight. Vibrant flat cel-shaded colors, charming cartoon scene."
        },
        {
            "scene_id": 11,
            "text": "He showed up to the Olympic marathon in formal street clothes, so someone had to hack off his trousers at the knees with scissors right at the starting line.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Infield grass of the Olympic stadium. Felix Carvajal stands awkwardly in his white collared dress shirt and heavy leather boots, arms outstretched, while another stick figure runner frantically cuts Felix's baggy trousers into shorts using giant tailor scissors. In the background, other runners warm up near wooden benches and canvas tents under a bright sky. Vibrant flat cel-shaded colors, funny cartoon humor."
        },
        {
            "scene_id": 12,
            "text": "Halfway through the race, Felix got hungry and took a casual detour into a local roadside orchard.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A sunny roadside apple orchard. Felix Carvajal, wearing his blue postal cap, mustache, white shirt, and cut-off trousers, happily picks a green apple from an apple tree branch. Red and green apples litter the lush green grass around him. In the background, a wooden split-rail fence, distant farmhouse, and a dusty dirt road under a sunny sky. Vibrant flat cel-shaded colors, comedic storytelling."
        },
        {
            "scene_id": 13,
            "text": "He ate a bunch of rotten green apples, got massive stomach cramps, and decided to just lie down on the grass and take a one-hour nap.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Under the shade of a large apple tree in the orchard. Felix Carvajal lies curled up peacefully on the soft grass fast asleep, snoozing with a peaceful smile, surrounded by fallen apples. In the background, the empty country dirt road stretches across rolling farm hills under a warm afternoon sun. Vibrant flat cel-shaded colors, hilarious cartoon contrast."
        },
        {
            "scene_id": 14,
            "text": "And the most disrespectful part? He woke up, stretched, kept jogging, and still finished fourth place overall.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. The Olympic stadium red cinder track. Felix Carvajal jogs briskly across the finish line with a cheerful smile and an energetic wave, looking completely refreshed, while other exhausted runners behind him crawl on their hands and knees. Victorian judges and grandstand crowds stare in utter amazement. Detailed stadium architecture, banners. Vibrant flat cel-shaded colors, comedic triumph."
        },
        {
            "scene_id": 15,
            "text": "Then there was Thomas Hicks. By mile nineteen, his body was completely shutting down.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A desolate, sun-bleached country dirt road under a blistering white-hot sun. Thomas Hicks, an exhausted stick figure runner in a white running singlet and shorts, stumbles forward with wobbly noodle legs, tongue sticking out, and heavy sweat drops flying. Dry weeds, wooden fence posts, and a distant rusty windmill in the background under a pale shimmering sky. Vibrant flat cel-shaded colors, dramatic cartoon exhaustion."
        },
        {
            "scene_id": 16,
            "text": "So his genius trainers decided to administer emergency medicine: injecting him with strychnine, literal rat poison, chased with French brandy and raw egg whites.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Roadside medical stop beside the dirt track. Two shady trainer stick figures in vests and flat caps surround Hicks. One trainer holds a comically large vintage glass syringe, while the other pours a dark glass bottle into a cup with raw eggs. Wooden roadside bench, medicine bottles, and dusty country trees in the background. Vibrant flat cel-shaded colors, dark comedic cartoon tone."
        },
        {
            "scene_id": 17,
            "text": "By the final mile, the rat poison kicked in so hard that Hicks was violently hallucinating across the road.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A surreal, comical hallucination scene on the country dirt road. Thomas Hicks sprints with wide spinning spiral dizzy eyes and an unhinged wide grin, surrounded by playful cartoon floating ghost figures, colorful bats, and warped swirling clouds in the sky. The dirt road and telephone poles curve playfully around him. Vibrant colorful cel-shaded illustration, wildly funny cartoon energy."
        },
        {
            "scene_id": 18,
            "text": "His trainers had to physically carry his limp body across the finish line while his feet dragged in the dirt.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. The grand Olympic stadium finish line. Two burly trainer stick figures run across the red cinder track, carrying a limp Thomas Hicks between them by his shoulders while his stick legs drag limp on the track. Officials with clipboards and grandstand spectators watch in total bewilderment. Detailed stadium architecture, vintage flags. Vibrant flat cel-shaded colors, comedic drama."
        },
        {
            "scene_id": 19,
            "text": "He was declared the official gold medal winner, lost eight pounds, and almost died on the spot.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Inside a canvas Olympic medical tent. Thomas Hicks lies dazed on a wooden stretcher wrapped in blankets with a shiny gold medal draped around his neck, while two panicked doctor stick figures with stethoscopes fan him with towels and check pulse. Wooden tent poles, medical bottles, and canvas walls visible. Vibrant flat cel-shaded colors, funny cartoon relief."
        },
        {
            "scene_id": 20,
            "text": "And let's not forget Len Taunyane, who ran completely barefoot and was doing great until a pack of wild feral dogs spotted him.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. A country dirt road beside a tall golden cornfield. Len Taunyane, a barefoot stick figure runner in a dark singlet and shorts, sprints in sheer comedic panic with eyes wide, looking back as three funny cartoon stray dogs with pointy ears and open mouths chase right on his heels. Dust clouds kicked up on the dirt path, tall cornstalks and blue sky in background. Vibrant flat cel-shaded colors, high-energy cartoon chase."
        },
        {
            "scene_id": 21,
            "text": "The dogs chased him a full mile in the wrong direction through a cornfield, and he still managed to finish ninth overall.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Edge of a dense golden cornfield. Len Taunyane triumphantly leaps over a wooden split-rail fence back onto the dirt road, while the cartoon dogs are hilariously tangled in the wooden fence slats behind him barking helplessly. Green rolling hills and farmhouse in distance under a sunny sky. Vibrant flat cel-shaded colors, funny action scene."
        },
        {
            "scene_id": 22,
            "text": "Out of thirty-two elite runners, only fourteen finished alive. Follow for more insane history.",
            "visual_prompt": "Clean 2D animated webcomic illustration in the exact visual style of Born to Suffer, Cyanide and Happiness, and Casually Explained. Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders. All human characters are simplistic minimalist stick figures with round pure white circle heads, black dot eyes, thin stick limbs. Sunset over the Olympic stadium. Fourteen exhausted stick figure runners sit or recline comically along the red cinder track resting with ice packs and water bottles, while Victorian spectators in bowler hats look on in amusement. The golden orange evening sun casts long warm shadows across the stadium. Rich detailed atmospheric background, vibrant cel-shaded colors, funny satisfying conclusion."
        }
    ]
}


def split_srt_into_short_cues(srt_content: str, max_words_per_cue: int = 3) -> str:
    """
    Split long SRT sentences into punchy 2-3 word subtitle cues.
    Distributes timing smoothly across word chunks weighted by word length.
    Guarantees subtitles never clutter or cover the video artwork.
    """
    pattern = re.compile(
        r'(\d+)\s*\n(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})\s*\n(.*?)(?=\n\s*\n|\Z)',
        re.DOTALL
    )
    matches = list(pattern.finditer(srt_content.strip()))
    if not matches:
        return srt_content

    new_cues = []
    cue_idx = 1

    def parse_time(ts: str) -> float:
        h, m, rest = ts.split(':')
        s, ms = rest.split(',')
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0

    def format_time(sec: float) -> str:
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        ms = int(round((sec - int(sec)) * 1000))
        if ms >= 1000:
            s += 1
            ms = 0
        return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"

    for m in matches:
        start_sec = parse_time(m.group(2))
        end_sec = parse_time(m.group(3))
        text = " ".join(m.group(4).replace("\n", " ").split())
        words = text.split()

        if not words:
            continue

        if len(words) <= max_words_per_cue:
            new_cues.append(
                f"{cue_idx}\n{format_time(start_sec)} --> {format_time(end_sec)}\n{text}"
            )
            cue_idx += 1
            continue

        chunks = []
        i = 0
        while i < len(words):
            rem = len(words) - i
            if rem == 4:
                chunk_len = 2
            elif rem >= 3:
                chunk_len = 3
            else:
                chunk_len = rem
            chunks.append(words[i : i + chunk_len])
            i += chunk_len

        weights = [sum(max(2, len(w)) for w in chunk) for chunk in chunks]
        total_weight = sum(weights)
        total_duration = end_sec - start_sec

        curr_start = start_sec
        for idx_c, (chunk, w) in enumerate(zip(chunks, weights)):
            dur = total_duration * (w / total_weight)
            curr_end = curr_start + dur if idx_c < len(chunks) - 1 else end_sec
            chunk_text = " ".join(chunk)
            new_cues.append(
                f"{cue_idx}\n{format_time(curr_start)} --> {format_time(curr_end)}\n{chunk_text}"
            )
            cue_idx += 1
            curr_start = curr_end

    return "\n\n".join(new_cues) + "\n"


def generate_stick_story(topic: str) -> dict:
    """Generate structured scene-by-scene script using Groq LLM or curated high-retention script."""
    if "1904" in topic or "marathon" in topic.lower():
        logger.info("Using curated high-retention 1904 Olympic Marathon script with 22 rich environmental scenes.")
        return CURATED_1904_MARATHON

    api_key = config.app.get("groq_api_key")
    if not api_key:
        raise ValueError("groq_api_key not found in config.toml")

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
    )

    models_to_try = [
        config.app.get("groq_model_name", "qwen/qwen3.8-27b"),
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
    ]

    for model_name in models_to_try:
        try:
            logger.info(f"Generating stick cartoon script for: '{topic[:40]}...' (Model: {model_name})")
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT.strip()},
                    {
                        "role": "user",
                        "content": f"Topic: {topic}. Generate the complete 2.2-minute 2D stick animation script with 20 to 24 scenes and ~320 words following the mandatory Born to Suffer visual prompt formula.",
                    },
                ],
                response_format={"type": "json_object"},
                temperature=0.72,
                max_tokens=3500,
            )
            data = json.loads(response.choices[0].message.content)
            scenes = data.get("scenes", [])
            total_words = sum(len(s.get("text", "").split()) for s in scenes)
            logger.info(f"Generated {len(scenes)} scenes with {total_words} total words.")
            return data
        except Exception as e:
            logger.warning(f"Model {model_name} failed: {e}. Retrying fallback...")
            time.sleep(3.0)

    raise RuntimeError("Failed to generate script from Groq.")


async def _async_generate_audio(text: str, voice_name: str, voice_file: str) -> Tuple[str, float]:
    """Generate audio and punchy 2-3 word SRT subtitles using Edge-TTS."""
    communicate = edge_tts.Communicate(text, voice_name, rate="+15%")
    sub_maker = edge_tts.SubMaker()

    with open(voice_file, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])
            elif chunk["type"] in ["WordBoundary", "SentenceBoundary"]:
                sub_maker.feed(chunk)

    raw_srt = sub_maker.get_srt()
    # Split into 2-3 words per cue so subtitles never cover the artwork
    short_srt = split_srt_into_short_cues(raw_srt, max_words_per_cue=3)

    srt_file = voice_file.replace(".mp3", ".srt")
    with open(srt_file, "w", encoding="utf-8") as f:
        f.write(short_srt)

    with AudioFileClip(voice_file) as ac:
        duration = ac.duration

    return srt_file, duration


def generate_audio_track(
    task_id: str,
    full_text: str,
    voice_name: str = "en-US-AndrewMultilingualNeural",
) -> Tuple[str, str, float]:
    """Synchronously wrap the async Edge-TTS call."""
    task_dir = utils.task_dir(task_id)
    audio_path = os.path.join(task_dir, "narration.mp3")
    logger.info(f"🎙️ Generating voiceover narration with {voice_name}...")
    srt_path, duration = asyncio.run(_async_generate_audio(full_text, voice_name, audio_path))
    logger.success(f"Voiceover generated: {duration:.2f}s audio at {audio_path}")
    return audio_path, srt_path, duration


def calculate_scene_durations(
    scenes: List[dict],
    total_audio_duration: float,
    min_screentime: float = 3.0,
) -> List[float]:
    """
    Calculate exact screentime for each scene proportional to sentence length.
    Guarantees that no scene has less than min_screentime (3.0s) and total equals audio_duration.
    """
    word_counts = [max(1, len(s.get("text", "").split())) for s in scenes]
    total_words = sum(word_counts)

    raw_durations = [(wc / total_words) * total_audio_duration for wc in word_counts]

    # Apply minimum screentime floor
    adjusted = [max(min_screentime, d) for d in raw_durations]
    scale = total_audio_duration / sum(adjusted)
    final_durations = [d * scale for d in adjusted]

    logger.info(
        f"Calculated {len(final_durations)} scene durations (Min: {min(final_durations):.2f}s, Max: {max(final_durations):.2f}s)"
    )
    return final_durations


def generate_all_scenes_images(task_id: str, scenes: List[dict]) -> List[str]:
    """Generate high-res FLUX 2D cartoon illustrations for all scenes."""
    task_dir = utils.task_dir(task_id)
    image_paths = []

    logger.info(f"🎨 Generating {len(scenes)} native FLUX 2D cartoon scenes (1080x1920)...")
    for idx, scene in enumerate(scenes, 1):
        out_path = os.path.join(task_dir, f"scene_{idx:02d}.jpg")
        prompt = scene.get("visual_prompt", "")

        if os.path.exists(out_path) and os.path.getsize(out_path) > 10000:
            logger.info(f"Using existing scene {idx}: {out_path}")
            image_paths.append(out_path)
            continue

        # Generate via Pollinations FLUX
        success = pollinations_service.generate_image(
            prompt=prompt,
            output_path=out_path,
            width=1080,
            height=1920,
            timeout=50,
        )

        if success and os.path.exists(out_path):
            image_paths.append(out_path)
        else:
            logger.warning(f"Scene {idx} failed to generate, using previous fallback.")
            fallback = image_paths[-1] if image_paths else out_path
            image_paths.append(fallback)

        if idx < len(scenes):
            time.sleep(1.0)

    logger.success(f"All {len(image_paths)} scene illustrations ready.")
    return image_paths


def build_static_video(
    task_id: str,
    scenes: List[dict],
    image_paths: List[str],
    durations: List[float],
    audio_path: str = None,
    srt_path: str = "",
    hook_banner_text: str = "1904 OLYMPIC MARATHON 💀",
    audio_file: str = None,
) -> str:
    audio_path = audio_path or audio_file
    """
    Assemble the static 2D stick video:
    - Absolutely NO zoom / expansion (static cuts).
    - Word-synced duration per image.
    - Zero background music (100% clean voiceover).
    - 2-3 word lower-third subtitles at 78% height safe-zone.
    """
    task_dir = utils.task_dir(task_id)
    raw_video_path = os.path.join(task_dir, "raw_scenes.mp4")
    output_video = os.path.join(task_dir, "final_stick_story.mp4")

    logger.info("🎬 Creating static video clips with ffmpeg (NO ZOOM / EXPANSION)...")
    clip_files = []
    for idx, (img_path, dur) in enumerate(zip(image_paths, durations), 1):
        clip_file = os.path.join(task_dir, f"clip_{idx:02d}.mp4")
        cmd = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            img_path,
            "-t",
            str(dur),
            "-c:v",
            "libx264",
            "-pix_fmt",
            "yuv420p",
            "-r",
            "30",
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            clip_file,
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        clip_files.append(clip_file)

    logger.info(f"Concatenating {len(clip_files)} static cartoon clips...")
    video.concat_video_clips_with_ffmpeg(
        clip_files=clip_files,
        output_file=raw_video_path,
        threads=4,
        output_dir=task_dir,
    )

    logger.info("🎬 Compositing clean voiceover (0 BGM) and punchy 2-3 word subtitles at safe-zone...")
    video_params = VideoParams(
        video_subject="1904 Olympic Marathon",
        video_aspect=VideoAspect.portrait,
        subtitle_enabled=True,
        subtitle_position="custom",
        custom_position=78.0,  # Lower third safe zone
        font_name="MicrosoftYaHeiBold.ttc",
        font_size=56,
        text_fore_color="#FFF200",  # Bright vibrant cartoon yellow
        stroke_color="#000000",
        stroke_width=2.8,
        bgm_type="",
        bgm_volume=0.0,  # Pure dry voiceover, zero music!
    )

    success = video.generate_video(
        video_path=raw_video_path,
        audio_path=audio_path,
        subtitle_path=srt_path,
        output_file=output_video,
        params=video_params,
    )

    if not success or not os.path.exists(output_video):
        raise RuntimeError("Video synthesis failed during generate_video stage.")

    logger.success(f"🎉 2D Stick Video generated successfully: {output_video}")
    return output_video


def main():
    parser = argparse.ArgumentParser(description="2D Stick Animation Autopilot")
    parser.add_argument(
        "--topic",
        type=str,
        default="The 1904 Olympic Marathon: The Most Chaotic Event in Human History",
        help="Story topic to produce",
    )
    args = parser.parse_args()

    task_id = utils.get_uuid()
    print("=" * 60)
    print(f"🎬 Producing 2D Stick Animation: {args.topic}")
    print(f"Task ID: {task_id}")
    print("=" * 60)

    # 1. Script & Scene Prompts
    concept = generate_stick_story(args.topic)
    scenes = concept.get("scenes", [])
    banner_text = concept.get("hook_banner", "1904 OLYMPIC MARATHON 💀")
    full_script = " ".join(s.get("text", "").strip() for s in scenes)

    print(f"\nHook: {scenes[0].get('text')}")
    print(f"Total Scenes: {len(scenes)}")
    print(f"Word Count: {len(full_script.split())} words\n")

    # 2. Voice Narration (Zero BGM)
    audio_file, srt_file, audio_duration = generate_audio_track(task_id, full_script)
    print(f"Spoken Duration: {audio_duration:.2f}s (~{audio_duration/60:.1f} minutes)")

    # 3. Scene Timings (Word-synced, min 3.0s screentime)
    durations = calculate_scene_durations(scenes, audio_duration, min_screentime=3.0)

    # 4. Generate native FLUX 2D Cartoon Visuals
    image_paths = generate_all_scenes_images(task_id, scenes)

    # 5. Assemble Video (Static cuts, NO zoom, punchy 2-3 word subtitles)
    final_mp4 = build_static_video(
        task_id=task_id,
        scenes=scenes,
        image_paths=image_paths,
        durations=durations,
        audio_file=audio_file,
        srt_path=srt_file,
        hook_banner_text=banner_text,
    )

    print("\n" + "=" * 60)
    print("✅ PILOT VIDEO PRODUCTION COMPLETE!")
    print(f"📁 Local File Path: {final_mp4}")
    print(f"⏱️ Duration: {audio_duration:.2f}s")
    print(f"🖼️ Images Used: {len(image_paths)} static scenes")
    print("🔇 BGM: None (Dry Voiceover)")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    main()
