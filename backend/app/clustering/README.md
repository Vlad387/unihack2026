# Vote-based clustering and bridges

`cluster(statements, votes)` and `bridges(votes, camps)` implement Rares's
`docs/tips/DATA_TIPS.md` contract. Embeddings are NOT required or used. Neither
function accesses the network, DB, FastAPI, agents, or mutable application state.
No packages, schemas, API routes or shared configuration were changed for this
vote-based update.

## Clustering

Sorted participant x statement matrix: agree=1, disagree=-1, pass/missing=0.
Authorship supplies +1 unless an explicit vote overrides it. Every participant
appears once, even with several statements. Pass-only participants stay noise.
Duplicate statement/vote IDs, unknown vote references and flagged inputs raise
ValueError rather than silently changing results.

UMAP: 2D, random initialization, fixed random_state=42, at most 10 neighbors,
100 epochs, low_memory=True, legacy compatibility layout. HDBSCAN: min_samples=3,
min_cluster_size between 3 and 5, no forced single cluster. At least six active
participants are needed for two camps of three. Identical or uniformly distant
profiles (e.g. authorship-only identity matrices) have no camp evidence and stay
noise instead of being split by projection artifacts. Other HDBSCAN noise is
also preserved. Coordinates are centered/scaled to [-1,1]; unplaced points=(0,0).
Point.text remains None for the API to fill.

Camp IDs hash sorted membership; names are neutral Romanian numbered labels.
Descriptions explicitly label one authored argument as an example, not a
consensus summary.
Camp.statements contains every statement members authored OR voted on.

Sorted identical inputs give identical output. A fixed random seed does NOT
keep the map stationary when new votes/participants change its input.

## Warm-up and performance

Package import runs one tiny deterministic UMAP fit via warmup(), before the API
accepts traffic. It warms Numba in the SAME process that serves clustering.
Cold imports can take tens of seconds; start the API before the demo. A warm-up
in a separate process is not a replacement for this startup warm-up. No fitted
model or participant data is kept in global application state.

Measured on this Apple Silicon Mac after startup, five runs of cluster+bridges:
- 50 synthetic voters: median 0.015 s, maximum 0.016 s; camps 17/17/16, no noise.
- 60 synthetic voters: median 0.018 s, maximum 0.019 s; camps 20/20/20, no noise.
- Shared bridge: "Să păstrăm centrul curat."

These fixtures deliberately encode three voting patterns over six demo policy
statements and a shared bridge. They also include all 50 seed answer texts as
individual authored statements; the 60-person fixture adds 10 clearly synthetic
load-test answers. Patterns are unrelated to demographic groups or text meaning.
Timings are local, not a deployment guarantee. No real-vote quality/consensus,
Gemini cost, or latency is claimed. Sparse missing/pass votes are both zero in
the matrix and can affect inferred similarity; validate against real usage.

## Bridges

At least 70% of ALL members in EACH of at least two nonempty, nonoverlapping
camps must endorse a statement. Authorship supplies support unless an explicit
vote overrides it; a self-vote never counts twice. Other pass and missing votes
do not supply support;
noise votes do not count for a camp. Candidates must exist in every camp's
internal statements and be unflagged. This is a demo policy, not measured consensus.

## Verification

From backend/:

```sh
uv run pytest
uv run pytest tests app/clustering
uv run ruff check .
uv run python -m app.clustering.demo
```

Default pytest discovery includes tests/ and app/clustering, so the standard
pre-push command runs the clustering and bridge regression tests too.
The existing stub pipeline test was previously updated to expect noise rather
than fabricated camps; its uniform-vote fixture still contains no camp contrast.
