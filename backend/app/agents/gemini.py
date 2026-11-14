"""Shared Gemini plumbing for all agents: client, model names, prompt loading, errors."""

import logging
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

log = logging.getLogger(__name__)

PROMPTS = Path(__file__).parent / "prompts"

# Free tier quotas are per model and per day; Flash's (~20/day) ran out during testing,
# and the team decided to stay on the free tier, so every agent uses Flash-Lite.
# gemini-2.5-* and Pro are not available on our key. Every name can be overridden in .env.
INTAKE_MODEL = os.getenv("GEMINI_INTAKE_MODEL", "gemini-3.5-flash-lite")
MEDIATE_MODEL = os.getenv("GEMINI_MEDIATE_MODEL", "gemini-3.5-flash-lite")
CRITIC_MODEL = os.getenv("GEMINI_CRITIC_MODEL", "gemini-3.5-flash-lite")
NAMING_MODEL = os.getenv("GEMINI_NAMING_MODEL", "gemini-3.5-flash-lite")
PROXY_MODEL = os.getenv("GEMINI_PROXY_MODEL", "gemini-3.5-flash-lite")
# used once when the agent's own model answers 429 (daily quota exhausted)
FALLBACK_MODEL = os.getenv("GEMINI_FALLBACK_MODEL", "gemini-3.1-flash-lite")

QUOTA_EXHAUSTED = 429


class AgentError(RuntimeError):
    """Gemini failed or returned unusable output. The caller must keep the input and retry later."""


@cache
def client() -> genai.Client:
    # 5xx "high demand" usually passes in seconds: retry with backoff. 429 is not
    # retried here: a daily quota won't recover in seconds, generate() switches model.
    return genai.Client(
        http_options=types.HttpOptions(
            retry_options=types.HttpRetryOptions(
                attempts=4, initial_delay=2, http_status_codes=[500, 502, 503, 504]
            )
        )
    )


def load_prompt(name: str) -> str:
    return (PROMPTS / f"{name}.md").read_text(encoding="utf-8")


def _call(
    model: str,
    system: str,
    contents: list[types.Part | str],
    schema: type[BaseModel],
    thinking: Literal["low", "high"],
) -> types.GenerateContentResponse:
    return client().models.generate_content(
        model=model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system,
            response_mime_type="application/json",
            response_schema=schema,
            thinking_config=types.ThinkingConfig(thinking_level=thinking),
        ),
    )


def generate[T: BaseModel](
    model: str,
    system: str,
    contents: list[types.Part | str],
    schema: type[T],
    thinking: Literal["low", "high"] = "high",
) -> T:
    try:
        try:
            response = _call(model, system, contents, schema, thinking)
        except genai.errors.APIError as e:
            if e.code != QUOTA_EXHAUSTED or model == FALLBACK_MODEL:
                raise
            log.warning("%s quota exhausted, falling back to %s", model, FALLBACK_MODEL)
            model = FALLBACK_MODEL
            response = _call(model, system, contents, schema, thinking)
    except genai.errors.APIError as e:
        raise AgentError(f"Gemini {model} failed: {e.code} {e.message}") from e

    if not isinstance(response.parsed, schema):
        raise AgentError(
            f"Gemini {model} returned no valid {schema.__name__}: {response.text!r}"
        )
    return response.parsed
