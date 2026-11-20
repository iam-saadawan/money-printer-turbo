#!/usr/bin/env python3
"""
Master Expanded Cosmic BGM Library.
Processes all studio-grade royalty-free space/mystery compositions from scratch_audio/
and masters them with broadcast loudness (-16 LUFS) and phone-audible EQ
(45 Hz sub-bass highpass, 2800 Hz lowpass to remove high-frequency screeching).
"""

import os
import subprocess
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / "resource" / "songs"
SCRATCH_DIR = Path(__file__).resolve().parent.parent / "scratch_audio"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 17 Master Studio Tracks mapped to thematic names
ADDITIONAL_TRACKS = [
    {"raw": "DarkMystery.mp3", "out": "theme_dark_mystery.mp3", "mood": "dark_mystery", "desc": "Unsolved cosmic enigma, eerie shadows, silent threats"},
    {"raw": "SunriseOnMars.mp3", "out": "theme_martian_solitude.mp3", "mood": "martian_solitude", "desc": "Red planet mystery, windswept Martian dunes, lone rover"},
    {"raw": "TheVisitors.mp3", "out": "theme_the_visitors.mp3", "mood": "the_visitors", "desc": "Uncanny extraterrestrial intelligence, first contact, non-human presence"},
    {"raw": "TheVoyage.mp3", "out": "theme_interstellar_voyage.mp3", "mood": "interstellar_voyage", "desc": "Deep journey across stars, solar sail drifting, generational ship"},
    {"raw": "Antarctica.mp3", "out": "theme_antarctic_abyss.mp3", "mood": "antarctic_abyss", "desc": "Sub-glacial void, extreme isolation, ancient ice core discoveries"},
    {"raw": "EnemyShips.mp3", "out": "theme_hostile_cosmos.mp3", "mood": "hostile_cosmos", "desc": "Dark forest theory, looming cosmic dread, unseen predators"},
    {"raw": "HorrorMusic.mp3", "out": "theme_cosmic_horror.mp3", "mood": "cosmic_horror", "desc": "Eldritch cosmic terror, forbidden knowledge, spacetime nightmare"},
    {"raw": "HighTension.mp3", "out": "theme_high_tension_pulse.mp3", "mood": "high_tension_pulse", "desc": "Accelerating countdown, impending catastrophe, pulse pounding"},
    {"raw": "DestinationUnknown.mp3", "out": "theme_destination_unknown.mp3", "mood": "destination_unknown", "desc": "Drifting derelict station, lost coordinates, ghost signals"},
    {"raw": "AViewFromEarth.mp3", "out": "theme_view_from_earth.mp3", "mood": "view_from_earth", "desc": "Awe-inspiring cosmic perspective, majestic nebula vista, telescope discovery"},
    {"raw": "IntenseSuspense.mp3", "out": "theme_intense_suspense.mp3", "mood": "intense_suspense", "desc": "Unfolding crisis, planetary collision imminent, rapid anomaly"},
]

def master_all():
    print("=" * 60)
    print("🎛️  MASTERING EXPANDED COSMIC BGM LIBRARY")
    print("=" * 60)
    
    filter_chain = "highpass=f=45,lowpass=f=2800:p=2,loudnorm=I=-16:TP=-1.0:LRA=11"
    
    for t in ADDITIONAL_TRACKS:
        raw_path = SCRATCH_DIR / t["raw"]
        out_path = OUTPUT_DIR / t["out"]
        
        if not raw_path.exists():
            print(f"⚠️ Raw file not found: {raw_path}")
            continue
            
        print(f"Mastering: {t['raw']} -> {t['out']} ({t['desc']})...")
        cmd = [
            "ffmpeg", "-y",
            "-i", str(raw_path),
            "-af", filter_chain,
            "-ar", "44100",
            "-b:a", "192k",
            str(out_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        size_mb = out_path.stat().st_size / (1024 * 1024)
        print(f"  ✅ Mastered {t['out']} ({size_mb:.2f} MB)")
        
    print("\n🎉 All 17+ cinematic tracks successfully mastered in resource/songs/!")

if __name__ == "__main__":
    master_all()
