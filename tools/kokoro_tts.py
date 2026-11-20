"""Free local narration with Kokoro (Apache-2.0). Usage:
  .venv-tts/bin/python tools/kokoro_tts.py --voice am_michael --speed 1.1 --text "..." --out out.wav"""
import argparse
from pathlib import Path

import soundfile as sf
from kokoro_onnx import Kokoro

M = Path(__file__).resolve().parent.parent / "models" / "kokoro"
_k = None


def tts(text, out, voice="am_michael", speed=1.1, lang="en-us"):
    global _k
    if _k is None:
        _k = Kokoro(str(M / "kokoro-v1.0.fp16.onnx"), str(M / "voices-v1.0.bin"))
    samples, sr = _k.create(text, voice=voice, speed=speed, lang=lang)
    sf.write(str(out), samples, sr)
    return len(samples) / sr


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--voice", default="am_michael")
    ap.add_argument("--speed", type=float, default=1.1)
    a = ap.parse_args()
    print(round(tts(a.text, a.out, a.voice, a.speed), 2))
