"""AI agents (owner: Bordos, role A). Pure functions: no DB, no FastAPI, no imports from clustering/.

STUBS: fake data with the contract signatures so api/ and frontend/ can be built in parallel.
Bordos replaces the bodies, never the signatures.
"""

import uuid

from app.schemas import Camp, CampTradeoff, Proposal, ProxyOpinion, Statement, Verdict


def intake(text: str | None, audio: bytes | None) -> list[Statement]:
    if not text and not audio:
        return []
    source = (
        text
        or "Răspuns audio (transcriere simulată): zgomotul de noapte ne deranjează."
    )
    parts = [p.strip() for p in source.replace("!", ".").split(".") if p.strip()]
    return [Statement(id=f"s-{uuid.uuid4().hex[:8]}", text=p + ".") for p in parts[:3]]


def mediate(
    camps: list[Camp],
    bridges: list[Statement],
    critiques: list[str],
    proxies: list[ProxyOpinion],
) -> Proposal:
    return Proposal(
        id=f"p-{uuid.uuid4().hex[:8]}",
        # the API sets the real round number
        round=1,
        text=(
            "Terasele închid la 00:00 în zilele lucrătoare și la 02:00 în weekend, "
            "cu autobuze de noapte și patrule în weekend."
        ),
        tradeoffs=[
            CampTradeoff(
                camp_id=c.id,
                gains="Program clar și previzibil.",
                gives_up="Renunță la o parte din ce și-a dorit inițial.",
            )
            for c in camps
        ],
    )


def critic(proposal: Proposal, camps: list[Camp]) -> Verdict:
    return Verdict(
        faithful=True,
        balanced=len(proposal.tradeoffs) == len(camps),
        feasible=True,
        notes="Verdict simulat (stub): propunerea pare echilibrată.",
    )
