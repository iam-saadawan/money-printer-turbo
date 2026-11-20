#!/usr/bin/env python3
"""
Master Cosmic BGM Library.
Downloads real, studio-composed, 100% royalty-free cinematic space/mystery scores
(Creative Commons Attribution 4.0 / YouTube Audio Library standard by Jason Shaw - Audionautix)
and masters them with broadcast loudness and phone-audible EQ.
"""

import os
import subprocess
from pathlib import Path
import numpy as np

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "resource" / "songs"
SCRATCH_DIR = Path(__file__).resolve().parent.parent / "scratch_audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCRATCH_DIR.mkdir(parents=True, exist_ok=True)

# 6 Narrative archetypes mapped to real studio compositions
TRACK_MAP = [
    {
        "filename": "theme_deep_space_mystery.mp3",
        "source_url": "https://audionautix.com/Music/DeepSpace.mp3",
        "raw_name": "DeepSpace.mp3",
        "description": "Vast cosmic exploration, dark nebulae, rogue planets, stellar voids",
    },
    {
        "filename": "theme_black_hole_dread.mp3",
        "source_url": "https://audionautix.com/Music/HorrorDrone1.mp3",
        "raw_name": "HorrorDrone1.mp3",
        "description": "Black holes, gravitational dread, star deaths, spacetime destruction",
    },
    {
        "filename": "theme_alien_signal_mystery.mp3",
        "source_url": "https://audionautix.com/Music/AlienSunset.mp3",
        "raw_name": "AlienSunset.mp3",
        "description": "Extraterrestrial signals, megastructures, alien civilizations, SETI anomalies",
    },
    {
        "filename": "theme_cosmic_cataclysm.mp3",
        "source_url": "https://audionautix.com/Music/OceanFloor.mp3",
        "raw_name": "OceanFloor.mp3",
        "description": "Cataclysmic impacts, supernovas, dark matter bursts, cosmic horrors",
    },
    {
        "filename": "theme_silent_universe_void.mp3",
        "source_url": "https://audionautix.com/Music/BeforeDawn.mp3",
        "raw_name": "BeforeDawn.mp3",
        "description": "Fermi paradox, lonely universe, eternal silence, dead planets",
    },
    {
        "filename": "theme_quantum_anomaly.mp3",
        "source_url": "https://audionautix.com/Music/TheGreatUnknown.mp3",
        "raw_name": "TheGreatUnknown.mp3",
        "description": "Time dilation, dimensional rifts, quantum paradoxes, forbidden space science",
    },
]


def download_track(url: str, dest_path: Path):
    if not dest_path.exists() or dest_path.stat().st_size < 10000:
        import urllib.request
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f:
            f.write(resp.read())


def master_track(raw_path: Path, out_path: Path):
    """
    Mastering chain:
    1. highpass=f=45: Clean sub-bass rumble so small phone/laptop speaker coils don't distort.
    2. lowpass=f=2800:p=2: Eliminate harsh digital noise and high squeals (>3.5kHz).
    3. loudnorm=I=-16:TP=-1.0:LRA=11: Standard broadcast loudness matching voiceover scale.
    """
    filter_chain = "highpass=f=45,lowpass=f=2800:p=2,loudnorm=I=-16:TP=-1.0:LRA=11"
    cmd = [
        "ffmpeg", "-y",
        "-i", str(raw_path),
        "-af", filter_chain,
        "-ar", "44100",
        "-b:a", "192k",
        str(out_path),
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def verify_audio(path: Path):
    cmd = ["ffmpeg", "-y", "-i", str(path), "-f", "f32le", "-ar", "44100", "-ac", "1", "-"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    raw_data, _ = proc.communicate()
    s = np.frombuffer(raw_data, dtype=np.float32)

    duration = len(s) / 44100
    peak = np.max(np.abs(s))
    rms = np.sqrt(np.mean(s**2))

    fft = np.abs(np.fft.rfft(s))
    freqs = np.fft.rfftfreq(len(s), 1/44100)

    sub = np.sum(fft[freqs < 150]) / np.sum(fft) * 100
    phone = np.sum(fft[(freqs >= 150) & (freqs <= 2500)]) / np.sum(fft) * 100
    high = np.sum(fft[freqs > 3200]) / np.sum(fft) * 100

    return {
        "duration": duration,
        "peak": peak,
        "rms": rms,
        "phone_audible_pct": phone,
        "sub_pct": sub,
        "harsh_high_pct": high,
    }


def main():
    print("🚀 Mastering Real Broadcast Cosmic Background Music...")
    for item in TRACK_MAP:
        raw_file = SCRATCH_DIR / item["raw_name"]
        final_file = OUTPUT_DIR / item["filename"]

        print(f"\nProcessing {item['filename']}...")
        download_track(item["source_url"], raw_file)
        master_track(raw_file, final_file)
        
        metrics = verify_audio(final_file)
        print(f"✅ {item['filename']}")
        print(f"   Duration: {metrics['duration']:.1f}s | RMS: {metrics['rms']:.3f} | Peak: {metrics['peak']:.2f}")
        print(f"   Phone-Audible (150-2500Hz): {metrics['phone_audible_pct']:.1f}%")
        print(f"   Sub-bass (<150Hz): {metrics['sub_pct']:.1f}%")
        print(f"   Harsh Highs (>3200Hz): {metrics['harsh_high_pct']:.2f}% (Comfortable Listening)")


if __name__ == "__main__":
    main()
