import pytest
from google import genai

from app.agents import AgentError, gemini, intake
from app.agents.intake_agent import _audio_mime


def test_empty_and_blank_input_skip_gemini(fake_gemini: list[dict]) -> None:
    assert intake(None, None) == []
    assert intake("   ", None) == []
    assert fake_gemini == []


def test_statements_get_unique_ids_and_no_author(fake_gemini: list[dict]) -> None:
    result = intake("Terasele să închidă la 23. Vrem autobuze de noapte.", None)
    assert [s.text for s in result] == [
        "Terasele să închidă la 23.",
        "Vrem autobuze de noapte.",
    ]
    assert len({s.id for s in result}) == 2
    assert all(s.author_id is None and s.flag is None for s in result)
    assert "Intake agent" in fake_gemini[0]["system"]


def test_flags_are_mapped_and_blank_items_dropped(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fake(model, system, contents, schema, **_):
        return schema(
            statements=[
                {"text": "Sunați-mă la 0712.", "flag": "personal_data"},
                {"text": "  ", "flag": "none"},
            ]
        )

    monkeypatch.setattr("app.agents.intake_agent.generate", fake)
    [statement] = intake("x", None)
    assert statement.flag == "personal_data"


def test_audio_is_sent_as_inline_part(fake_gemini: list[dict]) -> None:
    webm = b"\x1a\x45\xdf\xa3" + b"\x00" * 20
    intake(None, webm)
    [part] = fake_gemini[0]["contents"]
    assert part.inline_data.mime_type == "audio/webm"
    assert part.inline_data.data == webm


@pytest.mark.parametrize(
    ("header", "mime"),
    [
        (b"\x00\x00\x00\x1cftypM4A ", "audio/mp4"),
        (b"OggS\x00\x02", "audio/ogg"),
        (b"RIFF\x24\x00\x00\x00WAVE", "audio/wav"),
        (b"ID3\x04\x00", "audio/mpeg"),
        (b"unknown!", "audio/webm"),
    ],
)
def test_audio_mime_sniffing(header: bytes, mime: str) -> None:
    assert _audio_mime(header) == mime


def test_gemini_failure_raises_agent_error(monkeypatch: pytest.MonkeyPatch) -> None:
    class Down:
        class models:
            @staticmethod
            def generate_content(**_: object) -> None:
                raise genai.errors.APIError(503, {"error": {"message": "overloaded"}})

    # real generate() (not the autouse fake) on top of a client that always fails
    monkeypatch.setattr("app.agents.intake_agent.generate", gemini.generate)
    monkeypatch.setattr(gemini, "client", lambda: Down)
    with pytest.raises(AgentError, match="503"):
        intake("Vreau liniște noaptea.", None)
