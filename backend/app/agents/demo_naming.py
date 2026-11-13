"""Live check of name_camps (one Gemini call) on the hand-made seed camps.

uv run python -m app.agents.demo_naming

The camps get placeholder names first ("Tabăra 1"), like the real clustering gives.
agents/ may not import clustering/, so the real camps are not used here.
"""

import time

from app.agents import name_camps
from app.agents.demo_mediate import seed_camps


def main() -> None:
    camps = [
        c.model_copy(update={"name": f"Tabăra {i}", "description": ""})
        for i, c in enumerate(seed_camps(), start=1)
    ]
    start = time.perf_counter()
    named = name_camps(camps)
    print(f"name_camps: {(time.perf_counter() - start) * 1000:.0f} ms\n")
    for before, after in zip(camps, named):
        print(
            f"{before.name} ({after.size} oameni) -> {after.name}\n   {after.description}"
        )


if __name__ == "__main__":
    main()
