#!/usr/bin/env python3
"""
Edit an existing cast sheet with flux.2-klein-4b instead of regenerating it.
The previous version is kept in storage/stick_cast/_history/.

Usage:
    .venv/bin/python tools/edit_cast_sheet.py rival "add the mustache to the full-body views"
"""

import shutil
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from stick_consistency_test import ROOT, gen_with_references  # noqa: E402

CAST_DIR = ROOT / "storage" / "stick_cast"


def edit_sheet(name: str, instruction: str) -> bool:
    sheet = CAST_DIR / f"{name}.jpg"
    if not sheet.exists():
        sys.exit(f"no sheet for {name}")
    history = CAST_DIR / "_history"
    history.mkdir(exist_ok=True)
    backup = history / f"{name}_{time.strftime('%Y%m%d_%H%M%S')}.jpg"
    shutil.copy2(sheet, backup)

    prompt = (
        f"Edit this character reference sheet. {instruction} "
        f"Keep everything else exactly the same: same layout, same art style, same colors, same "
        f"outfit, same plain white background, no text, no labels."
    )
    tmp = CAST_DIR / f"{name}_edit_tmp.jpg"
    if gen_with_references(prompt, [backup], tmp, "1536x1536"):
        tmp.replace(sheet)
        return True
    tmp.unlink(missing_ok=True)
    return False


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    ok = edit_sheet(sys.argv[1], sys.argv[2])
    print("done" if ok else "failed")
