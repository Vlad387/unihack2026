"""Live check of proxy (one Gemini call) on the hand-made seed camps.

uv run python -m app.agents.demo_proxy                          # Gemini picks the groups
uv run python -m app.agents.demo_proxy "Părinți cu copii mici"  # organizer picks them
"""

import sys
import time

from app.agents import proxy
from app.agents.demo_mediate import seed_camps

QUESTION = "Ce facem cu viața de noapte din centru?"


def main() -> None:
    groups = sys.argv[1:]
    start = time.perf_counter()
    voices = proxy(QUESTION, seed_camps(), groups)
    print(f"proxy: {(time.perf_counter() - start) * 1000:.0f} ms\n")
    if not voices:
        print("Niciun grup lipsă găsit.")
    for v in voices:
        print(f"[SIMULAT] {v.group}\n   {v.text}\n")


if __name__ == "__main__":
    main()
