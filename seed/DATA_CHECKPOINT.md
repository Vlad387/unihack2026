# Eidrien checkpoint: bridges, layout continuity and pitch

All experiments here are OFFLINE and SYNTHETIC. No Gemini requests or billing.
The clustering algorithm and public cluster()/bridges() signatures are unchanged.

## 1. Zero bridges with a small camp

The current rule requires 70% of ALL members in EVERY camp, including inferred
authorship support once, overridden by an explicit self-vote.

| Camp size | Endorsements needed | One fewer |
|---|---:|---:|
| 3 | 3 (100%) | 2/3 = 66.7%, fails |
| 4 | 3 (75%) | 2/4 = 50%, fails |
| 5 | 4 (80%) | 3/5 = 60%, fails |

New tests cover three camps at each size, exact passing boundaries, one missing
endorsement, pass, and disagreement. Existing author/self-vote regression tests
also pass. No rounding bug was found, and the threshold has NOT been lowered.
One small camp with sparse votes can legitimately block every candidate. That
means insufficient evidence for consensus, not necessarily an algorithm error.

Rares's independent diagnostic is now merged in PR #33. Vladut should run:

```sh
cd backend
uv run python -m app.api.diagnose_bridges
uv run python -m app.api.diagnose_bridges STATEMENT_ID
```

Send its per-camp size, agree/disagree/pass/missing, inferred-author support and
endorsed/needed counts for the real zero-bridge case. Rares's DB is empty, so the
real case is still UNVERIFIED. Do not generate/fill invented bridges for the demo.
If the team wants a lower threshold, that is a product-policy decision, not a bug fix;
the UI must label the actual support/coverage and not claim stronger consensus.

## 2. Layout continuity: ready for Rares to wire

`app.clustering.layout.align_layout(current, previous)` is a PURE helper taking
shared ClusterResult models. It aligns the fresh coordinates to common assigned
participants in the preceding frame using a rotation/reflection
and translation. Scale is not fitted, preventing cumulative map shrinkage. It never changes memberships, IDs, names, statements or text,
and does not mutate its inputs or keep global history. Fewer than three usable
non-collinear shared anchors means no adjustment.

Suggested API integration in Live.recompute(), after stable camp IDs and BEFORE
publishing the result (Rares owns this change):

```python
from app.clustering.layout import align_layout

result = align_layout(result, self.result)
```

Use the previous FULL map, not only the previous camps. Existing self.result is
enough for continuity inside one running API process. First startup is a no-op;
this does not persist point positions across restarts. The helper is NOT wired
into the API in Eidrien's change.

The existing UMAP API supports initial-coordinate arrays, so a previous-layout
initialization is possible. But previous positions must be explicitly passed
from the API: the current two-argument cluster() contract has no such input.
Agree a contract change with Rares before doing that. Do not hide previous
positions in a global variable or overload Statement.embedding with coordinates.
Warm-starting UMAP also changes the projected geometry used by HDBSCAN, so it
needs fresh membership/ARI evaluation, not just a prettier animation.

### Measured alignment experiment

Same 20 independent added-vote cases as pitch_metrics.json, same seed baseline:

| Metric | Before alignment | After alignment |
|---|---:|---:|
| Median RMS movement, raw coordinates | 0.611 | 0.259 |
| Median RMS movement, current D3 viewBox units | 244.8 | 139.8 |

19/20 viewBox trials improved or stayed equal; one worsened. Maximum alignment
cost was 0.22 ms on this Mac. See layout_metrics.json for every case.

ViewBox measurements reproduce frontend per-axis extents at 800x560 with 48-unit
padding; they are NOT physical phone pixels and exclude stack fan-out and CSS
animation. Dynamic autoscaling still contributes to movement. Vladut should
coordinate fixed/session-consistent viewport extents if residual jumps matter.

This is a PARTIAL display improvement, not a fix for genuine membership changes.
It deliberately leaves the baseline worst ARI ~0.500 and 32/50 retained members
unchanged. It cannot guarantee that a live sequence or another dataset improves.
Keep cluster() pure and leave the original pitch limitations visible.

Reproduce from backend/:

```sh
uv run python -m app.clustering.evaluate_layout --output ../seed/layout_metrics.json
uv run pytest
```

## 3. Loader: already ready

Rares should load statements.json and votes.json together, preserving the stable
seed-statement-NNN IDs and seed-NNN participant/author IDs. Use responses.json for
the corresponding source-response relationship. The 50 curated statements bypass
Gemini; 737 simulated votes yield two camps and four bridges locally. Never count
seed-* participants in real support totals. See HANDOFF_PITCH.md for details.

## 4. Final slide text

See PITCH_SLIDE.md for the Romanian slide copy and the synthetic-data speaker
note. The source measurements and limits remain in PITCH_NUMBERS.md.

## 5. Camp descriptions and representation

Bordos's naming agent is now merged. Rares should wire it for newly discovered
camps outside clustering/, preserving stable IDs and round-time labels. Naming is not a
clustering feature and must not fabricate population-wide consensus.

Fixture coverage is ten each from five fictional contexts. A real representation
audit needs the intended population and real participation metadata; it cannot
infer absent groups from this balanced synthetic fixture. That stretch is not
implemented, and no fairness/coverage claim about the city is made.

Reference for the alignment primitive:
https://docs.scipy.org/doc/scipy/reference/generated/scipy.linalg.orthogonal_procrustes.html
