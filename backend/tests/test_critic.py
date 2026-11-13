import json

import pytest

from app.agents import AgentError, critic
from app.schemas import Camp, CampTradeoff, Proposal, Statement
from tests.conftest import GeminiCalls


def _camp(cid: str, name: str, author: str, text: str) -> Camp:
    return Camp(
        id=cid,
        name=name,
        description="",
        size=1,
        member_ids=[author],
        statements=[Statement(id=f"s-{cid}", text=text, author_id=author)],
    )


QUIET = _camp("c1", "Liniște", "ana", "Terasele să închidă la 22.")
LIVELY = _camp("c2", "Centru viu", "bogdan", "Cluburile până la 3.")


def _proposal(camp_ids: list[str]) -> Proposal:
    return Proposal(
        id="p-1",
        round=1,
        text="Terasele închid la 23, interiorul la 02 în weekend.",
        tradeoffs=[
            CampTradeoff(camp_id=c, gains="Câștigă.", gives_up="Cedează.")
            for c in camp_ids
        ],
    )


def test_returns_verdict_and_sends_proposal_with_camp_names(
    fake_gemini: GeminiCalls,
) -> None:
    verdict = critic(_proposal(["c1", "c2"]), [QUIET, LIVELY])
    assert verdict.balanced and verdict.notes

    sent = json.loads(fake_gemini.critic[-1]["contents"][0])
    assert sent["proposal"]["text"].startswith("Terasele închid la 23")
    # citizens read the notes, so the model sees camp names, not ids
    assert [t["camp"] for t in sent["proposal"]["tradeoffs"]] == [
        "Liniște",
        "Centru viu",
    ]
    assert sent["camps"][0]["arguments"] == ["Terasele să închidă la 22."]
    assert "Critic agent" in fake_gemini.critic[-1]["system"]


def test_camp_without_tradeoff_is_never_balanced(fake_gemini: GeminiCalls) -> None:
    verdict = critic(_proposal(["c1"]), [QUIET, LIVELY])
    assert verdict.balanced is False
    assert "Centru viu" in verdict.notes


def test_no_camps_is_an_error(fake_gemini: GeminiCalls) -> None:
    with pytest.raises(AgentError, match="at least one camp"):
        critic(_proposal([]), [])
    assert fake_gemini.critic == []
