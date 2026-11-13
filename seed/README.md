# Nightlife consultation seed

Question: **Ce facem cu viața de noapte din centru?**

`responses.json` contains 50 synthetic Romanian responses, with 10 each from
residents, bar owners, students, elderly people, and tourists. All people and
situations are fictional; these are demo inputs, never real participation or votes.
The equal group sizes are a demo design, not a population estimate.

Each record has a stable `id`, a contextual `group`, and raw citizen `text`.
Groups describe the speaker context, not expected opinion clusters: each group
includes disagreement, compromise, and uncertainty. Do not use these labels as
clustering features or ground truth. Feed `text` to intake and use the resulting
shared Pydantic models for clustering once the backend contract is available.

Themes include opening hours, terrace noise, soundproofing, enforcement, night
transport, safety, cleaning, accessibility, and cultural events. Some answers
contain multiple arguments intentionally, to exercise intake splitting.

Validate without installing dependencies:

```sh
python3 seed/validate.py
```

## Vote-based live demo

From `backend/`, run `uv run python -m app.clustering.demo`. It reads these 50
answers, creates clearly synthetic demo policy votes, and prints camps, sizes,
noise, bridges and five-run timings for 50/60 participants. The vote-based
algorithm does not need Gemini embeddings. Startup performs a tiny UMAP warm-up;
timing output measures live calls after warm-up, not cold startup.

## Persistent pitch fixture (for Rares's loader)

Use `statements.json` + `votes.json` together: 50 curated atomic statements with
stable IDs and 737 simulated votes from all 50 seed participants. Statement
`seed-statement-NNN` is curated from response `seed-NNN`, whose ID is also its
author. The arrays match the current shared Statement/Vote schemas. Preserve IDs
or explicitly remap vote references; live intake creates different statement IDs.

Votes include agree/disagree/pass and missing pairs, with mixed preferences and
exceptions. All records are fictional/demo-only, never real-voter totals. The
baseline produces two camps and four bridges on the recorded local environment.
Demographic context groups are NOT clustering features or ground truth.

`build_votes.py` regenerates the constructed fixture deterministically;
`python3 seed/build_votes.py --check` verifies it without modifying files.
The earlier `app.clustering.demo` is only a simpler developer smoke fixture;
use `uv run python -m app.clustering.evaluate` for THESE persisted pitch files.

See `PITCH_NUMBERS.md` for measured results/limits and `HANDOFF_PITCH.md` for loader,
stable camp IDs, frontend colors, historical proposal labels and the PR #20
review note. `pitch_metrics.json` contains reproducible fingerprints and all
20 one-vote perturbation trials. No live Gemini calls are used in this evaluation.


## Data checkpoint follow-up

`DATA_CHECKPOINT.md` covers 3–5-person bridge thresholds, Rares's PR #33
diagnostic command for the real zero-bridge case, and the pure display-alignment
helper that the API owner can wire in. `PITCH_SLIDE.md` is the final slide copy.
`layout_metrics.json` records the standalone 20-trial SYNTHETIC display experiment;
it does not claim improved membership stability or an active frontend fix.
