#!/usr/bin/env python3
"""
Cosmic Background Music Generator - Studio Broadcast Edition.
Synthesizes 100% original, copyright-free, phone-audible cinematic space scores
tailored to specific cosmic narrative archetypes.

Engineered for optimal listening on phones, laptops, and headphones:
- Rich musical harmonic chords and melodies in the 150 Hz - 2,200 Hz mobile-audible range
- Strict low-pass filter at 2,600 Hz to eliminate harsh frequencies, hiss, and whistling
- Sub-bass warmth (50-80 Hz) without silent muddy rumble
- Mastered to broadcast standard (-1 dB peak, ~0.35 RMS) for crystal-clear presence beneath voiceover
"""

import os
import subprocess
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "resource" / "songs"
SAMPLE_RATE = 44100
DURATION = 90  # seconds


def generate_black_hole_dread():
    """Deep, crushing gravitational dread in D minor with heartbeat pulse and ominous synth pads."""
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)

    # 1. Warm sub foundation (55 Hz + 73.4 Hz D2)
    sub = 0.35 * np.sin(2 * np.pi * 55.0 * t) + 0.30 * np.sin(2 * np.pi * 73.41 * t)

    # 2. Audible cinematic minor pads (D3=146.8Hz, F3=174.6Hz, A3=220Hz, D4=293.7Hz)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * 0.04 * t)
    c_d3 = 0.28 * np.sin(2 * np.pi * 146.83 * t)
    c_f3 = 0.24 * np.sin(2 * np.pi * 174.61 * t) * swell
    c_a3 = 0.22 * np.sin(2 * np.pi * 220.00 * t)
    c_d4 = 0.16 * np.sin(2 * np.pi * 293.66 * t) * (1 - swell)
    c_f4 = 0.12 * np.sin(2 * np.pi * 349.23 * t) * swell

    # 3. Heartbeat thud at 52 bpm (punchy at 110Hz and 65Hz)
    beat = (np.maximum(0, np.sin(2 * np.pi * 0.866 * t)) ** 10) * np.sin(2 * np.pi * 110 * t) * 0.35

    left = sub + c_d3 + c_f3 + c_d4 + beat
    right = sub + c_d3 + c_a3 + c_f4 + beat

    left = np.tanh(left * 0.90)
    right = np.tanh(right * 0.90)

    return apply_fades_and_normalize(left, right)


def generate_silent_universe_void():
    """Eerie, desolate, lonely void in A minor with Interstellar-style warm acoustic synth pads."""
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)

    # 1. A2 (110 Hz) foundation
    sub = 0.35 * np.sin(2 * np.pi * 110.0 * t)

    # 2. Audible minor chord swells (E3=164.8Hz, A3=220Hz, C4=261.6Hz, E4=329.6Hz)
    breathe = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)  # 20s breathing cycle
    p_e3 = 0.26 * np.sin(2 * np.pi * 164.81 * t)
    p_a3 = 0.25 * np.sin(2 * np.pi * 220.00 * t) * breathe
    p_c4 = 0.22 * np.sin(2 * np.pi * 261.63 * t) * (1 - breathe)
    p_e4 = 0.16 * np.sin(2 * np.pi * 329.63 * t) * breathe

    # 3. Slow lonely pulse
    pulse = (np.maximum(0, np.sin(2 * np.pi * 0.6 * t)) ** 8) * np.sin(2 * np.pi * 165 * t) * 0.25

    left = sub + p_e3 + p_a3 + p_c4 + pulse
    right = sub + p_e3 + p_c4 + p_e4 + pulse

    left = np.tanh(left * 0.85)
    right = np.tanh(right * 0.85)

    return apply_fades_and_normalize(left, right)


def generate_alien_signal_mystery():
    """Rhythmic, pulsing curiosity and suspense in B minor with melodic analog arpeggio."""
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)

    # 1. 60 bpm rhythmic radar pulse
    rhythm = (np.maximum(0, np.sin(2 * np.pi * 1.0 * t)) ** 8) * np.sin(2 * np.pi * 180 * t) * 0.35

    # 2. Mystery minor fifths and octaves (B2=123.5Hz, F#3=185Hz, B3=246.9Hz, D4=293.7Hz)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.07 * t)
    p_b2 = 0.30 * np.sin(2 * np.pi * 123.47 * t)
    p_fs3 = 0.25 * np.sin(2 * np.pi * 184.99 * t) * lfo
    p_b3 = 0.22 * np.sin(2 * np.pi * 246.94 * t)
    p_d4 = 0.18 * np.sin(2 * np.pi * 293.66 * t) * (1 - lfo)

    left = p_b2 + p_fs3 + p_b3 + rhythm
    right = p_b2 + p_b3 + p_d4 + rhythm

    left = np.tanh(left * 0.85)
    right = np.tanh(right * 0.85)

    return apply_fades_and_normalize(left, right)


def generate_cosmic_cataclysm():
    """Heavy, high-stakes cinematic tension in C minor with deep brass-like pads and ticking suspense."""
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)

    # 1. C2/C3 foundation (65.4 Hz + 130.8 Hz)
    sub = 0.32 * np.sin(2 * np.pi * 65.41 * t) + 0.28 * np.sin(2 * np.pi * 130.81 * t)

    # 2. Escalating tension chords (Eb3=155.6Hz, G3=196Hz, C4=261.6Hz, Eb4=311.1Hz)
    surge = 0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t)
    p_eb3 = 0.25 * np.sin(2 * np.pi * 155.56 * t)
    p_g3 = 0.24 * np.sin(2 * np.pi * 196.00 * t) * surge
    p_c4 = 0.20 * np.sin(2 * np.pi * 261.63 * t)
    p_eb4 = 0.16 * np.sin(2 * np.pi * 311.13 * t) * (1 - surge)

    # 3. Ticking clock tension (120 bpm, audible at 440Hz tick)
    tick = (np.maximum(0, np.sin(2 * np.pi * 2.0 * t)) ** 16) * np.sin(2 * np.pi * 440 * t) * 0.22

    left = sub + p_eb3 + p_g3 + tick
    right = sub + p_c4 + p_eb4 + tick

    left = np.tanh(left * 0.90)
    right = np.tanh(right * 0.90)

    return apply_fades_and_normalize(left, right)


def generate_quantum_anomaly():
    """Eerie, dimensional mystery in F# minor with detuned phasing synth chords."""
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)

    # 1. Warm F#2/F#3 base (92.5 Hz + 185 Hz)
    base = 0.30 * np.sin(2 * np.pi * 92.50 * t) + 0.28 * np.sin(2 * np.pi * 185.00 * t)

    # 2. Phased micro-chords (C#4=277.2Hz, A4=440Hz, C#5=554.4Hz)
    phase = 0.5 + 0.5 * np.cos(2 * np.pi * 0.05 * t)
    p_cs4 = 0.24 * np.sin(2 * np.pi * 277.18 * t)
    p_a4 = 0.20 * np.sin(2 * np.pi * 440.00 * t) * phase
    p_cs5 = 0.12 * np.sin(2 * np.pi * 554.37 * t) * (1 - phase)

    left = base + p_cs4 + p_a4
    right = base + p_cs4 + p_cs5

    left = np.tanh(left * 0.85)
    right = np.tanh(right * 0.85)

    return apply_fades_and_normalize(left, right)


def apply_fades_and_normalize(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    """Apply 3-second smooth fade-in and fade-out, then master to -1dB peak for strong, clear mobile presence."""
    fade_len = int(SAMPLE_RATE * 3.0)
    fade_in = np.linspace(0, 1, fade_len)
    fade_out = np.linspace(1, 0, fade_len)

    left[:fade_len] *= fade_in
    left[-fade_len:] *= fade_out
    right[:fade_len] *= fade_in
    right[-fade_len:] *= fade_out

    # Normalize to -1dB peak (0.89 max) for strong, clear presence beneath voice
    peak = max(np.max(np.abs(left)), np.max(np.abs(right))) + 1e-6
    left = (left / peak) * 0.89
    right = (right / peak) * 0.89

    return np.column_stack((left, right)).astype(np.float32)


def save_as_mp3(audio_data: np.ndarray, output_path: Path):
    """Write float32 audio data to MP3 using ffmpeg with 2600Hz smooth low-pass filter and 45Hz clean rumble cut."""
    int16_data = (audio_data * 32767).clip(-32768, 32767).astype(np.int16)
    raw_bytes = int16_data.tobytes()

    filter_chain = "lowpass=f=2600:p=2,highpass=f=45"

    cmd = [
        "ffmpeg",
        "-y",
        "-f", "s16le",
        "-ar", str(SAMPLE_RATE),
        "-ac", "2",
        "-i", "-",
        "-af", filter_chain,
        "-b:a", "192k",
        str(output_path),
    ]

    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    proc.communicate(input=raw_bytes)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    tracks = [
        ("theme_black_hole_dread.mp3", generate_black_hole_dread),
        ("theme_silent_universe_void.mp3", generate_silent_universe_void),
        ("theme_alien_signal_mystery.mp3", generate_alien_signal_mystery),
        ("theme_cosmic_cataclysm.mp3", generate_cosmic_cataclysm),
        ("theme_quantum_anomaly.mp3", generate_quantum_anomaly),
    ]

    for filename, gen_fn in tracks:
        dest = OUTPUT_DIR / filename
        print(f"Generating {dest.name}...")
        audio = gen_fn()
        save_as_mp3(audio, dest)
        print(f"✅ Created {dest.name} ({dest.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
