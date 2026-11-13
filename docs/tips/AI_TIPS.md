# AI agents tips (Bordos, role A)

Written by Rares (D) after checking `origin/bordos` on 2026-11-14. Edit freely.

## Status

Your real `intake` looks good and follows the contract: unique ids, `author_id=None`, flags mapped, no DB/FastAPI, and `AgentError` on failure.

Checked by merging `dev` + `bordos` + `rares` (PR #7) in a scratch copy:
- no merge conflicts
- `ruff check` / `ruff format --check` ✅
- `pytest`: 26 passed
- the API starts and `/health/db` is ok

**Not checked:** a live Gemini call (Rares has no key yet). Run `uv run python -m app.agents.demo_intake` yourself before the PR.

👉 **Open your PR into `dev`.** Nobody can use the real intake until it's merged.

## How the API calls your functions (PR #7)

- `POST /responses` stores the raw answer, **then** the live worker calls `intake(text, audio)` in a thread, up to 8 answers in parallel.
- If `intake` raises (`AgentError` or anything else), the answer stays in the DB as `failed` and is retried every 15 s, up to 5 attempts. So raising is the right behavior; don't return `[]` on errors, or the answer is silently lost.
- The API sets `author_id` after you return. Statements with a `flag` go to moderation, never to voting or the map.
- Audio arrives as raw bytes with no content type, so your `_audio_mime` sniffing is exactly what's needed.

## Tests: keep Gemini fake

Your `tests/conftest.py` autouse fixture patches `intake_agent.generate`. Rares's `tests/test_api.py` calls the real `intake` through the API, so it **relies on that fixture** to stay offline. When you add `mediate` and `critic`, patch their `generate` too, or the API tests will start calling Gemini.

## Open decisions (reply in the group)

1. **Embeddings:** proposal is that the API fills `Statement.embedding` before `cluster()`, so clustering stays pure. Who writes `embed(texts) -> list[list[float]]`: you in `agents/`, or Rares in `api/`? Which model and **dimension**? Rares needs the dimension for the pgvector column.
2. `mediate` still gets the round number from the API (your stub sets `round=1`; the API will overwrite it).

## Next

`mediate` (Pro → Flash on your key, per your `gemini.py`), then `critic`. Same signatures, prompts in `agents/prompts/*.md`. A camp's own arguments: `[s for s in camp.statements if s.author_id in camp.member_ids]`.
