# 2D Stick Animation — Master Channel Plan & Technical Architecture

## 1. Executive Summary & Vision

This blueprint establishes a fully autonomous, viral 2D animated historical comedy storytelling engine for YouTube Shorts and TikTok, built as a standalone brand alongside *The Cosmic Vault*. 

The channel is directly modeled after the visual aesthetic, comedic timing, and narrative pacing of top creators like **[@_borntosuffer_](https://www.tiktok.com/@_borntosuffer_)**, **Cyanide & Happiness**, and **Casually Explained**. It pairs ultra-simplistic stick figure characters with rich, vast, cel-shaded historical environments and deadpan, irreverent voiceover narration.

---

## 2. Visual Anatomy & Character Design Rules

### 2.1 The Stick Figure Anatomy Standard
To maintain instant readability and comedic punch, all characters must strictly follow these anatomical rules:
* **Head**: Perfectly round, smooth, blank pure white circular head (`#FFFFFF`) with a bold black outline (`#000000`).
* **Face**: Two simple solid black dot eyes and a single clean line mouth (smiling, frowning, or a simple open oval for speaking/screaming).
* **Negative Constraints**: Strictly **NO** realistic noses, ears, teeth, skin-tone shading, or photorealistic wrinkles.
* **Limbs**: Thin, clean black stick arms and stick legs.
* **Attire**: Simplistic, flat solid-color period-appropriate attire (e.g., singlets, suits, postal vests, bowler hats) that instantly identifies the character's role.

### 2.2 Persistent Character Registry (Character Consistency)
Inconsistency in AI image generation occurs when character prompts change between scenes. We enforce character consistency across all scenes using **Verbatim Character Anchors**:

| Historical Figure | Role / Scene Context | Persistent Prompt Anchor |
|---|---|---|
| **Fred Lorz** | Protagonist Runner | `Fred Lorz, the protagonist minimalist stick figure: round pure white circle head, simple black dot eyes, spiky black hair tufts, wearing a vintage bright red running tank top and white athletic shorts, thin stick limbs` |
| **James Sullivan** | Corrupt Race Director | `James Sullivan, the villainous race director stick figure: round pure white circle head, narrow black dot eyes, pencil mustache, wearing a formal Victorian black tuxedo suit, crisp white dress shirt, black bowtie, and tall black top hat, thin stick limbs` |
| **Felix Carvajal** | Cuban Mailman Runner | `Felix Carvajal, the plucky Cuban mailman stick figure: round pure white circle head, bushy black mustache, wearing a vintage blue postal cap, white collared shirt, and rough-cut knee-length grey trousers, thin stick limbs` |
| **Thomas Hicks** | Doped Champion | `Thomas Hicks, the hallucinating runner stick figure: round pure white circle head, wide dizzy spiral eyes, disheveled hair, wearing an American running singlet and white shorts, thin trembling stick limbs` |
| **Len Taunyane** | Barefoot Runner | `Len Taunyane, the barefoot stick figure runner: round pure white circle head, dot eyes, wide panicked mouth, wearing a sleeveless athletic shirt and shorts, running barefoot with thin stick legs` |

---

## 3. Environment & World-Building Guidelines

### 3.1 Vast, Expansive 2D Backgrounds
The comedic charm of `@_borntosuffer_` stems from the contrast between **simplistic minimalist stick figures** and a **vast, beautifully rendered cinematic world**:
* **Perspective**: Wide-angle panoramic perspective with deep horizon lines, atmospheric lighting, and clean cel-shaded colors.
* **Environment Depth**: Fully drawn scenery (e.g., bustling stadium grandstands packed with thousands of Victorian spectators, desolate Missouri dirt roads stretching to rolling hills, lush apple orchards, lavish mahogany offices).
* **Zero Blank Space**: Never use plain white or void backgrounds. The world must always feel alive and grounded.

### 3.2 Strict Negative Prompt Guardrails
To prevent AI models from generating split comic strips, garbled letters, or caricature faces, every single scene prompt enforces:
```
Single full cinematic frame, strictly NO comic panels, NO split screen, NO speech bubbles, NO text, NO watermarks, NO borders.
```

---

## 4. Subtitle & Typography Standards

### 4.1 The 2–3 Word Dynamic Subtitle System
Large blocks of text covering the artwork destroy retention. Subtitles must be snappy, modern, and non-intrusive:
* **Word Limit**: Strictly **2 to 3 words per subtitle cue**.
* **Timing**: Proportional time interpolation weighted by character length (`split_srt_into_short_cues`), ensuring subtitles stay tightly synchronized with Edge-TTS voiceover.
* **Screen Placement**: Vertical position locked to **78.0% height** (lower-third safe zone). This leaves the characters, faces, and backgrounds 100% visible.
* **Styling**:
  * Font: `MicrosoftYaHeiBold.ttc`
  * Size: `56pt`
  * Fill Color: Vibrant Cartoon Yellow (`#FFF200`)
  * Stroke: Deep Black (`#000000`) with width `2.8`

---

## 5. Scriptwriting & Audio Architecture

### 5.1 Comedy Script Structure
* **Duration**: 125 to 140 seconds (~2.2 minutes), meeting monetization requirements for TikTok Creator Rewards and YouTube Shorts.
* **Word Count**: 310 to 340 words total across 20 to 24 scenes (10 to 18 words per scene).
* **Tone**: Fast, conversational, hilarious, and irreverent. Speak like a friend recounting the most chaotic story imaginable. Never use academic or textbook phrasing.
* **Scene Screentime**: Minimum **3.0 seconds** per scene to allow the visual joke and environment to land.
* **Cuts**: 100% static scene cuts. Strictly **NO zoom, pan, or expansion animations** (per user requirement).
* **Audio**: Clean, dry voiceover (`en-US-AndrewMultilingualNeural` at `+15%` rate) with **zero background music**.

---

## 6. Technical Pipeline & Tooling

```mermaid
graph TD
    A[Topic / Historical Event] --> B[Groq LLM / Curated Script]
    B --> C[Edge-TTS Voiceover Engine]
    C --> D[Audio File .mp3]
    C --> E[Raw SubMaker Cues]
    E --> F[split_srt_into_short_cues 2-3 Words]
    B --> G[Pollinations FLUX 2D Engine]
    G --> H[1080x1920 Static Scene Illustrations]
    H --> I[FFmpeg Static Clip Generator 30fps]
    D & F & I --> J[MoviePy / FFmpeg Video Compositor]
    J --> K[Final MP4 Video with Lower-Third Subtitles]
```

### Core Code Modules:
* **Production Engine**: [`stick_autopilot.py`](file:///Users/saad/MoneyPrinterTurbo/stick_autopilot.py)
* **Image Generation**: [`app/services/pollinations_service.py`](file:///Users/saad/MoneyPrinterTurbo/app/services/pollinations_service.py)
* **Video Compositing**: [`app/services/video.py`](file:///Users/saad/MoneyPrinterTurbo/app/services/video.py)

---

## 7. Upcoming Content Production Queue

1. **The 1904 Olympic Marathon Was Pure Chaos** *(Pilot Episode - Ready)*
   * *Synopsis*: Cars driving down dirt roads, an athlete napping in an apple orchard, and a runner winning gold while hallucinating on rat poison.
2. **The Great Emu War of 1932**
   * *Synopsis*: The Australian military deployed machine guns against twenty thousand birds and suffered an embarrassing, total defeat.
3. **The Dancing Plague of 1518**
   * *Synopsis*: Hundreds of people in medieval Strasbourg danced uncontrollably in the streets until collapsing from sheer exhaustion.
4. **The War of the Stray Dog (1925)**
   * *Synopsis*: Greece and Bulgaria went to war, deployed artillery, and lost dozens of soldiers because a Greek dog crossed the border chasing a ball.
5. **The Boston Great Molasses Flood of 1919**
   * *Synopsis*: A two-million-gallon wave of boiling molasses moved at thirty-five miles per hour through the streets of Boston.
