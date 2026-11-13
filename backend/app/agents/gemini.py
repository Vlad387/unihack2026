"""Shared Gemini plumbing for all agents: client, model names, prompt loading, errors."""

import os
from functools import cache
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel

# .env lives in the repo root; loaded here too so agents work from scripts, not only via main.py
load_dotenv(Path(__file__).resolve().parents[3] / ".env")

PROMPTS = Path(__file__).parent / "prompts"

# gemini-2.5-* are closed to new keys and no Pro text model is available on our key,
# so every agent uses Flash; override per env var if a better model becomes available.
FLASH_MODEL = os.getenv("GEMINI_FLASH_MODEL", "gemini-3.5-flash")
PRO_MODEL = os.getenv("GEMINI_PRO_MODEL", FLASH_MODEL)


class AgentError(RuntimeError):
    """Gemini failed or returned unusable output. The caller must keep the input and retry later."""


@cache
def client() -> genai.Client:
    # Flash often answers 503 "high demand" for a few seconds: retry with backoff
    # (429/5xx only) before giving up and letting the API keep the answer for later.
    return genai.Client(
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(attempts=4, initial_delay=2)
        )
    )


def load_prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


def generate[T: BaseModel](
    model: str,
    system: str,
    contents: list[types.Part | str],
    schema: type[T],
    thinking: Literal["low", "high"] = "high",
) -> T:
    try:
        response = client().models.generate_content(
            model=model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system,
                response_mime_type="application/json",
                response_schema=schema,
                thinking_config=types.ThinkingConfig(thinking_level=thinking),
            ),
        )
    except genai.errors.APIError as e:
        raise AgentError(f"Gemini {model} failed: {e.code} {e.message}") from e

    if not isinstance(response.parsed, schema):
        raise AgentError(
            f"Gemini {model} returned no valid {schema.__name__}: {response.text!r}"
        )
    return response.parsed
