# Data science tips (Eidrien, role B)

Written by Rares (D) after checking `origin/eidrien` on 2026-11-14. Edit freely.

## Status

- Seed ✅ (50 responses, `validate.py` passes, merged in PR #3).
- `cluster()` / `bridges()` are **still Rares's stubs**. This is now the main missing piece of the core flow.
- Your environment works: UMAP(2D) + sklearn HDBSCAN on 50×768 fake points found 3 camps on Linux, and also with the Intel-Mac versions (numba 0.62.1, llvmlite 0.45.1, numpy 2.3.5).
- On an **Intel Mac**: `uv sync` works after PR #7 is merged.

Start: `git pull origin dev`, then `cd backend && uv sync && uv run pytest`.

## What `cluster(statements, votes)` receives from the API

- Only **approved** statements (no `flag`), each with `author_id` set.
- At most **one** vote per (participant, statement); the latest wins.
- `Statement.embedding` is **None for now** (the embeddings decision is still open, see `AI_TIPS.md`).
- Rules and worked examples: top of `app/schemas.py` and `tests/test_contract.py`. A `ClusterResult` validator rejects overlapping camps, unknown camp ids and wrong sizes.

## You don't have to wait for embeddings

Cluster participants on their **votes**, the way Polis does it, with no network call:
- Build a participant × statement matrix: agree = 1, disagree = -1, pass/missing = 0.
- Run UMAP(2D) on it, then HDBSCAN.

Authors can count as "agree" on their own statements. Add text embeddings later if they help.

## Speed matters: `cluster()` now runs live

The live worker calls `cluster()` + `bridges()` after **every** answer or vote batch and pushes the map over the WebSocket. Keep it under ~1–2 s for 60 participants.
- numba compiles on the first UMAP call (~50 s here). Do one tiny warm-up fit at import time, or use `UMAP(..., low_memory=True)` with small `n_epochs`.
- Use a fixed `random_state`, so the map doesn't jump between updates.
- With very few participants, return everyone as noise (`camps=[]`); the stub does this below 3.

## Must-do in your output

- One `Point` per participant, finite `x, y` (about [-1, 1]), `camp_id=None` for noise.
- Fill `Camp.statements` with every statement a member wrote **or voted on**. `bridges(votes, camps)` reads its candidates from there; there's no other way to get the text.
- Leave `Point.text` as None. The API fills it.
- `size == len(member_ids)`.
- `bridges`: high agreement measured **inside every camp**; return `[]` with fewer than 2 camps.

Packages: ask Rares. Map shape or colors: ask Rares, who checks with Vladut.
