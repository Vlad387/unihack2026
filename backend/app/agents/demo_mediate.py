"""Live check of mediate on hand-made camps from seed answers (calls Gemini).

uv run python -m app.agents.demo_mediate          # round 1
uv run python -m app.agents.demo_mediate 2        # round 2, with sample critiques

The camps are picked by hand until Eidrien's real cluster() is ready; raw seed
texts stand in for intake statements to save Gemini calls.
"""

import json
import sys
import time
from pathlib import Path

from app.agents import mediate
from app.schemas import Camp, Statement

SEED = Path(__file__).resolve().parents[3] / "seed" / "responses.json"

CAMPS = {
    ("c1", "Liniște pentru locuitori", "Vor program redus și zgomot controlat."): [
        "001", "003", "009", "031", "035", "042", "008", "038",
    ],
    ("c2", "Centru viu", "Susțin barurile deschise târziu și evenimentele."): [
        "011", "014", "021", "025", "041", "046", "026", "019",
    ],
    ("c3", "Siguranță și transport", "Pun accent pe drumul spre casă și pază."): [
        "022", "027", "033", "034", "036", "044", "018", "028",
    ],
}  # fmt: skip
BRIDGES = [
    "Muzica de pe terase nu ar trebui să se mai audă după ora 23.",
    "Centrul trebuie curățat dimineața după petreceri.",
    "Este nevoie de transport public noaptea.",
]
CRITIQUES = [
    "Ora 02:00 în weekend e prea târziu pentru cei cu copii mici.",
    "Cine plătește patrulele și autobuzele? Nu vrem taxe noi pentru toți.",
    "Localurile mici care închid devreme nu ar trebui tratate ca un club.",
]


def main(args: list[str]) -> None:
    texts = {r["id"]: r["text"] for r in json.loads(SEED.read_text(encoding="utf-8"))}
    camps = []
    for (cid, name, desc), ids in CAMPS.items():
        members = [f"seed-{i}" for i in ids]
        statements = [
            Statement(id=f"st-{m}", text=texts[m], author_id=m) for m in members
        ]
        camps.append(Camp(id=cid, name=name, description=desc, size=len(members),
                          member_ids=members, statements=statements))  # fmt: skip
    bridges = [Statement(id=f"b{i}", text=t) for i, t in enumerate(BRIDGES)]
    critiques = CRITIQUES if "2" in args else []

    start = time.perf_counter()
    p = mediate(camps, bridges, critiques, [])
    print(f"\nROUND {'2 (cu critici)' if critiques else 1}  "
          f"{(time.perf_counter() - start) * 1000:.0f} ms\n\n{p.text}\n")  # fmt: skip
    names = {c.id: c.name for c in camps}
    for t in p.tradeoffs:
        print(
            f"[{names[t.camp_id]}]\n  + câștigă: {t.gains}\n  - cedează: {t.gives_up}"
        )


if __name__ == "__main__":
    main(sys.argv[1:])
