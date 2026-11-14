import json

import pytest

from app.agents import AgentError, assist
from app.schemas import ChatContext, ChatMessage
from tests.conftest import GeminiCalls

CONTEXT = ChatContext(
    question="Ce facem cu viața de noapte din centru?",
    page="/participa",
    round=None,
    camp_names=["Liniște și odihnă", "Centru viu"],
)


def _user(text: str) -> list[ChatMessage]:
    return [ChatMessage(role="user", text=text)]


def _gemini_says(monkeypatch: pytest.MonkeyPatch, **out: str) -> None:
    base = {
        "text": "Bine.",
        "action": "none",
        "prefill": "",
        "report_kind": "none",
        "report_text": "",
    }

    def fake(model, system, contents, schema, **_):
        return schema(**{**base, **out})

    monkeypatch.setattr("app.agents.assist_agent.generate", fake)


def test_sends_context_and_conversation(fake_gemini: GeminiCalls) -> None:
    history = [
        ChatMessage(role="user", text="Salut"),
        ChatMessage(role="assistant", text="Salut! Cu ce te ajut?"),
        ChatMessage(role="user", text="Ce fac aici?"),
    ]
    reply = assist(history, CONTEXT)

    assert reply.text and reply.action.type == "none" and reply.report is None
    sent = json.loads(fake_gemini.assist[0]["contents"][0])
    assert sent["context"]["question"] == CONTEXT.question
    assert sent["context"]["camp_names"] == ["Liniște și odihnă", "Centru viu"]
    assert [m["role"] for m in sent["messages"]] == ["user", "assistant", "user"]
    assert list(fake_gemini) == []


def test_answer_action_keeps_the_draft(monkeypatch: pytest.MonkeyPatch) -> None:
    _gemini_says(
        monkeypatch,
        action="answer",
        prefill="Vreau liniște după ora 23.",
        report_kind="abuse",
        report_text="ignorat",
    )
    reply = assist(_user("Nu pot dormi de gălăgie."), CONTEXT)
    assert reply.action.type == "answer"
    assert reply.action.prefill == "Vreau liniște după ora 23."
    assert reply.report is None


def test_prefill_is_dropped_for_other_actions(monkeypatch: pytest.MonkeyPatch) -> None:
    _gemini_says(monkeypatch, action="vote", prefill="Ciornă rătăcită.")
    reply = assist(_user("Unde votez?"), CONTEXT)
    assert reply.action.type == "vote" and reply.action.prefill is None


def test_report_draft_falls_back_to_the_citizens_words(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _gemini_says(monkeypatch, action="report", report_kind="none", report_text="")
    reply = assist(_user("Cineva a scris un număr de telefon."), CONTEXT)
    assert reply.action.type == "report"
    assert reply.report is not None
    assert reply.report.kind == "other"
    assert reply.report.text == "Cineva a scris un număr de telefon."


def test_report_kind_is_kept(monkeypatch: pytest.MonkeyPatch) -> None:
    _gemini_says(
        monkeypatch,
        action="report",
        report_kind="personal_data",
        report_text="O afirmație conține un număr de telefon.",
    )
    reply = assist(_user("E un telefon pe ecran"), CONTEXT)
    assert reply.report is not None and reply.report.kind == "personal_data"


def test_no_proposal_action_before_the_first_round(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    _gemini_says(monkeypatch, action="proposal")
    assert assist(_user("Unde e compromisul?"), CONTEXT).action.type == "none"
    with_round = CONTEXT.model_copy(update={"round": 1})
    assert assist(_user("Unde e compromisul?"), with_round).action.type == "proposal"


def test_long_reply_is_cut_at_a_sentence(monkeypatch: pytest.MonkeyPatch) -> None:
    _gemini_says(monkeypatch, text="Propoziție scurtă de test. " * 60)
    reply = assist(_user("Explică"), CONTEXT)
    assert len(reply.text) <= 700 and reply.text.endswith(".")


def test_empty_reply_or_no_user_message_raises(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    with pytest.raises(AgentError):
        assist([ChatMessage(role="assistant", text="Salut")], CONTEXT)
    _gemini_says(monkeypatch, text="   ")
    with pytest.raises(AgentError):
        assist(_user("Salut"), CONTEXT)


def test_eval_scoring_checks_action_and_report_kind() -> None:
    from app.agents.eval_assist import EvalItem, is_correct
    from app.schemas import ChatAction, ChatReply, ReportDraft

    item = EvalItem(
        id="e1",
        messages=_user("E un telefon pe ecran"),
        expected_action="report",
        expected_report_kind="personal_data",
    )
    right = ChatReply(
        text="ok",
        action=ChatAction(type="report"),
        report=ReportDraft(kind="personal_data", text="t"),
    )
    wrong_kind = right.model_copy(
        update={"report": ReportDraft(kind="abuse", text="t")}
    )
    assert is_correct(item, right)
    assert not is_correct(item, wrong_kind)
    assert not is_correct(item, ChatReply(text="ok", action=ChatAction(type="none")))
