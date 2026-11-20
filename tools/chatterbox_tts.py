"""Expressive free narration with Chatterbox (MIT). Clones the timbre of a short reference wav (we use our Kokoro voice)
and lets us turn up the delivery: exaggeration 0.5 = neutral, 0.7-0.9 = enthusiastic storyteller.
Usage: .venv-cb/bin/python tools/chatterbox_tts.py --ref ref.wav --text "..." --out out.wav [--exag 0.75 --cfg 0.35]"""
import argparse
import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

_m = None
def model():
    global _m
    if _m is None:
        dev = "mps" if torch.backends.mps.is_available() else "cpu"
        _m = ChatterboxTTS.from_pretrained(device=dev)
    return _m

def tts(text, out, ref=None, exag=0.75, cfg=0.35, temp=0.8):
    m = model()
    wav = m.generate(text, audio_prompt_path=ref, exaggeration=exag, cfg_weight=cfg, temperature=temp)
    ta.save(str(out), wav.cpu(), m.sr)
    return wav.shape[-1] / m.sr

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--text", required=True); ap.add_argument("--out", required=True); ap.add_argument("--ref")
    ap.add_argument("--exag", type=float, default=0.75); ap.add_argument("--cfg", type=float, default=0.35)
    a = ap.parse_args(); print(round(tts(a.text, a.out, a.ref, a.exag, a.cfg), 2))
