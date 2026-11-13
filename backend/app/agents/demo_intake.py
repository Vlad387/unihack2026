"""Live check of intake on seed answers (calls Gemini, costs a few requests).

uv run python -m app.agents.demo_intake            # first 5 seed answers
uv run python -m app.agents.demo_intake 12 seed-009 # specific count / ids
"""

import json
import sys
import time
from pathlib import Path

from app.agents import intake

SEED = Path(__file__).resolve().parents[3] / "seed" / "responses.json"


def main(args: list[str]) -> None:
    seed = json.loads(SEED.read_text(encoding="utf-8"))
    ids = [a for a in args if a.startswith("seed-")]
    count = next((int(a) for a in args if a.isdigit()), 5)
    chosen = [r for r in seed if r["id"] in ids] if ids else seed[:count]

    for r in chosen:
        start = time.perf_counter()
        statements = intake(r["text"], None)
        ms = (time.perf_counter() - start) * 1000
        print(f"\n[{r['id']} / {r['group']}] {ms:.0f} ms\n  IN : {r['text']}")
        for s in statements:
            print(f"  OUT: {s.text}" + (f"   <-- FLAG {s.flag}" if s.flag else ""))


if __name__ == "__main__":
    main(sys.argv[1:])
