"""Live check of critic on saved mediate proposals (calls Gemini once per case).

uv run python -m app.agents.demo_critic

Uses proposals mediate really produced on the seed camps (see demo_mediate), so the
check costs no mediate quota. "flawed" has the known issue: a gives_up line with a
detail that is not in the proposal text.
"""

import time

from app.agents import critic
from app.agents.demo_mediate import seed_camps
from app.schemas import CampTradeoff, Proposal

TEXT = (
    "Propunem ca muzica pe terase să înceteze obligatoriu la ora 23:00, iar terasele "
    "să se închidă la ora 23:00 în timpul săptămânii și la ora 24:00 în weekend, "
    "diferențiind restaurantele de cluburi. Activitatea în interior poate continua până "
    "la ora 01:00 în weekend, doar cu izolare fonică și măsurători riguroase de zgomot. "
    "Primăria va asigura curățenia dimineața, iluminat public sporit și curse de noapte "
    "pentru autobuze până la 01:30. Finanțarea transportului și patrulelor se va face "
    "din taxele de autorizare ale localurilor, fără taxe noi pentru cetățeni."
)
GOOD = [
    ("c1", "Oprirea muzicii exterioare la 23:00 și controale stricte de zgomot.",
     "Acceptă terase până la 24:00 în weekend și interior până la 01:00."),
    ("c2", "Păstrează activitatea în interior în weekend până la 01:00.",
     "Renunță la muzica pe terase după 23:00 și plătește taxele de autorizare."),
    ("c3", "Autobuze de noapte până la 01:30 și iluminat public sporit.",
     "Acceptă că centrul rămâne aglomerat până la 01:00 în weekend."),
]  # fmt: skip
FLAWED_C3 = (
    "c3",
    "Autobuze de noapte până la 01:30 și străzi mai sigure.",
    "Acceptă că autobuzele de noapte vor circula doar pe arterele principale.",
)
ONE_SIDED = (
    "Toate localurile din centru închid la ora 22:00, în fiecare zi, fără excepții. "
    "Muzica este interzisă complet, inclusiv în interior."
)


def _proposal(text: str, rows: list[tuple[str, str, str]]) -> Proposal:
    tradeoffs = [CampTradeoff(camp_id=c, gains=g, gives_up=u) for c, g, u in rows]
    return Proposal(id="p-demo", round=2, text=text, tradeoffs=tradeoffs)


def main() -> None:
    camps = seed_camps()
    cases = {
        "good": _proposal(TEXT, GOOD),
        "flawed": _proposal(TEXT, GOOD[:2] + [FLAWED_C3]),
        "one-sided": _proposal(ONE_SIDED, GOOD),
    }
    for name, proposal in cases.items():
        start = time.perf_counter()
        v = critic(proposal, camps)
        ms = (time.perf_counter() - start) * 1000
        print(f"\n[{name}] {ms:.0f} ms  faithful={v.faithful} balanced={v.balanced} "
              f"feasible={v.feasible}\n  {v.notes}")  # fmt: skip


if __name__ == "__main__":
    main()
