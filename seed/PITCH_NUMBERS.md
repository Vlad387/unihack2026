# CityMind pitch numbers — SYNTHETIC DATA ONLY

Measured locally on Apple Silicon on 14 November 2026. These results come from
constructed demo opinions and simulated votes, not a citizen consultation. They
show that the pipeline works on this fixture; they do not establish real-world
clustering accuracy, fairness, representation, or consensus.

## Fixture and baseline map

- 50 fictional participants, IDs `seed-001` through `seed-050`.
- 50 manually curated atomic statements, each linked to the same-numbered source
  response and author; these are not output from a live Gemini intake run.
- 737 simulated votes: 392 agree, 178 disagree, 167 pass; other pairs are missing.
- Baseline: **2 camps of 35 and 15**, no unassigned/noise participants.
- **4 bridges**, including cleaning, accessible pavements, safety/lighting, and
  targeted enforcement. At least 70% endorsement is required inside EVERY camp;
  authorship counts once unless overridden by an explicit vote.
- Mixed fictional voices: 10 residents, 10 bar owners, 10 students, 10 elderly
  people, 10 tourists. These contexts do not enter the clustering features.

The generator encodes three broad preference tendencies with exceptions,
uncertainty and sparse votes. The algorithm finds TWO camps; no target count is
forced. The fixture was designed for a legible pitch demo, not sampled from a
population. Equal context sizes are deliberate; this is not a representation audit.

## Quality

**Silhouette = 0.243** in the ORIGINAL participant-by-statement vote matrix,
using Euclidean distance and the assigned participants (50/50 here).

This is modest separation, not a percentage accuracy score. It compares
within-camp and between-camp distances; it is not evaluated on the 2D UMAP plot
and does not compare against demographic labels or planted preference labels.
If future data contains noise, the report excludes it from silhouette and
reports the excluded count explicitly.

Definition: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.silhouette_score.html

## Warm update latency

`cluster()` + `bridges()`, ten runs per size, milliseconds:

| Participants | Median | p95 | Maximum |
|---|---:|---:|---:|
| 50 | 7.732 | 8.636 | 9.133 |
| 60 | 8.767 | 8.994 | 9.018 |

The 60-person benchmark adds ten demo-only voters copying existing stances;
those load-test voters are NOT saved in votes.json. The 60-person result has
three camps and four bridges. Timing excludes Python import/Numba startup
warm-up, Gemini, database access, API requests and WebSocket delivery. These are
one-machine measurements, not a production latency guarantee.

## Stability when ONE vote is added

20 reproducible trials, each starting from the SAME baseline and adding one
previously missing agree/disagree vote. No existing vote is changed. Pass
additions are excluded from this experiment because they are zero-valued
no-ops in this matrix.

- 12/20 trials retain exactly the same membership after one-to-one label matching.
- Median adjusted Rand index (ARI): **1.000**.
- Worst ARI: **0.500**.
- Worst best-matched retention: **32/50 participants (64%)**.
- Trial maps have 2–3 camps and 0–1 noise participants.

ARI compares the partitions while ignoring arbitrary label names; 1 means the
same grouping. Noise is a label in ARI. Retention uses a maximum-overlap
one-to-one assignment and counts unchanged noise, never a change to/from noise.

**Do not pitch the camps as fully stable.** API ID matching can preserve names
and colors for continuing camps; it cannot undo genuine membership changes,
splits/merges, or changes in 2D layout.

Definition: https://scikit-learn.org/stable/modules/generated/sklearn.metrics.adjusted_rand_score.html

## Reproduce

From the repo root:

```sh
python3 seed/build_votes.py --check
```

From backend/:

```sh
uv run python -m app.clustering.evaluate --output ../seed/pitch_metrics.json
uv run pytest
```

`pitch_metrics.json` records dataset SHA-256 fingerprints, platform/Python/package
versions, every stability trial and unrounded silhouette. Re-running updates
machine-dependent timings. `build_votes.py` intentionally generates demo data;
never mix it into real-voter totals. The raw responses stay unchanged.

## Safe pitch wording

“On a synthetic 50-person nightlife consultation with mixed simulated votes,
CityMind found two camps and four points of common ground. Warm clustering and
bridge updates stayed below 10 ms on our demo Mac. We are still validating
clustering quality and stability on real participation.”
