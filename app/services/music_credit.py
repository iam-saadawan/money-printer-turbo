"""
Attribution lines for background music that requires credit.

Most tracks in resource/songs/ were downloaded from Audionautix (Jason Shaw) by
tools/setup_real_bgm.py and tools/expand_master_bgm.py under CC BY 4.0, which requires
a credit line wherever the video is published.
"""

from pathlib import Path

# resource/songs filenames that come from Audionautix (see setup_real_bgm.py / expand_master_bgm.py).
AUDIONAUTIX_TRACKS = {
    "theme_deep_space_mystery.mp3", "theme_black_hole_dread.mp3", "theme_alien_signal_mystery.mp3",
    "theme_cosmic_cataclysm.mp3", "theme_silent_universe_void.mp3", "theme_quantum_anomaly.mp3",
    "theme_dark_mystery.mp3", "theme_martian_solitude.mp3", "theme_the_visitors.mp3",
    "theme_interstellar_voyage.mp3", "theme_antarctic_abyss.mp3", "theme_hostile_cosmos.mp3",
    "theme_cosmic_horror.mp3", "theme_high_tension_pulse.mp3", "theme_destination_unknown.mp3",
    "theme_view_from_earth.mp3", "theme_intense_suspense.mp3",
}

YOUTUBE_CREDIT = "Music by Jason Shaw (audionautix.com), licensed under CC BY 4.0 (creativecommons.org/licenses/by/4.0/)"
SHORT_CREDIT = "🎵 Jason Shaw, audionautix.com (CC BY 4.0)"


def needs_credit(bgm_file: str) -> bool:
    return Path(bgm_file or "").name in AUDIONAUTIX_TRACKS


def add_youtube_credit(description: str, bgm_file: str) -> str:
    """Append the full credit to a YouTube description when the track requires it."""
    if not needs_credit(bgm_file):
        return description
    return f"{description.rstrip()}\n\n{YOUTUBE_CREDIT}"


def add_short_credit(caption: str, bgm_file: str, max_len: int = 150) -> str:
    """Append the short credit to a length-limited caption (TikTok), trimming the caption to fit."""
    if not needs_credit(bgm_file):
        return caption[:max_len]
    room = max_len - len(SHORT_CREDIT) - 1
    return f"{caption[:room].rstrip()} {SHORT_CREDIT}"
