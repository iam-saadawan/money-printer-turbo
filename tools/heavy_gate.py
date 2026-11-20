"""One heavy job at a time on this Mac (16 GB RAM), shared by every agent.

Usage:  python3 tools/heavy_gate.py "<who: what>" -- <command> [args...]
  e.g.  python3 tools/heavy_gate.py "another-you: blender render" -- blender -b scene.blend -a
        python3 tools/heavy_gate.py --status

Heavy = renders (Remotion, Blender, ffmpeg 2K encodes), TTS/whisper models, batch downloads, browser uploaders.
The gate waits until (1) no other heavy job holds the lock and (2) at least MIN_FREE % of memory is free, then runs the
command and releases the lock when it ends (also if it crashes). Stale locks from dead processes are cleared.
"""
import json, os, subprocess, sys, time
from pathlib import Path

LOCK = Path.home() / "MoneyPrinterTurbo" / ".heavy_job.lock"
MIN_FREE = 35  # % of RAM that must be free before a heavy job starts


def free_pct() -> int:
    try:
        out = subprocess.run(["memory_pressure"], capture_output=True, text=True).stdout
        line = [l for l in out.splitlines() if "free percentage" in l][-1]
        return int(line.split(":")[1].strip().rstrip("%"))
    except Exception:
        return 100


def holder():
    if not LOCK.exists():
        return None
    try:
        d = json.loads(LOCK.read_text())
        os.kill(d["pid"], 0)  # still alive?
        return d
    except Exception:
        LOCK.unlink(missing_ok=True)  # stale
        return None


def main():
    if sys.argv[1:2] == ["--status"]:
        h = holder()
        print(f"free RAM {free_pct()}% | lock: {json.dumps(h) if h else 'free'}")
        return
    if "--" not in sys.argv:
        sys.exit(__doc__)
    i = sys.argv.index("--")
    who, cmd = " ".join(sys.argv[1:i]) or "unknown", sys.argv[i + 1:]
    waited = 0
    while True:
        h = holder()
        fp = free_pct()
        if h is None and fp >= MIN_FREE:
            break
        if waited % 60 == 0:
            why = f"busy: {h['who']} (pid {h['pid']}, since {h['since']})" if h else f"only {fp}% RAM free"
            print(f"[heavy_gate] waiting - {why}", flush=True)
        time.sleep(10); waited += 10
    p = subprocess.Popen(cmd)
    LOCK.write_text(json.dumps({"who": who, "pid": p.pid, "since": time.strftime("%H:%M:%S"), "cmd": " ".join(cmd)[:200]}))
    try:
        rc = p.wait()
    finally:
        LOCK.unlink(missing_ok=True)
    sys.exit(rc)


if __name__ == "__main__":
    main()
