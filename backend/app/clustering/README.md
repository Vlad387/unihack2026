# Opinion clustering and bridges

Both public functions use the shared Pydantic contract without DB, HTTP, Gemini
calls, global state, or imports from agents. No dependencies or schemas changed.

## Clustering

Supply approved statements with precomputed, finite, nonzero embeddings of one
consistent dimension/model. Every participant gets one point. Missing embeddings
are allowed: participants with no usable stance evidence remain noise at (0, 0).
Malformed embeddings, duplicate statements/votes and unknown vote references raise
ValueError rather than silently corrupting results.

An authored statement implies agreement; an explicit vote overrides that stance.
Agree = +1, disagree = -1, pass and missing = no directional evidence. Normalized
statement vectors are summed with these signs for each participant, normalized,
and concatenated with the normalized statement-stance vector. This gives semantic
content and direct voting patterns equal block weight. Several answers from one
participant still produce one feature vector.

shortcut: negating an embedding approximates disagreement, not the language model's
semantic opposite; calibrate against real voting data before reporting quality.
The algorithm cannot distinguish missing/pass geometrically, though bridges retain
those semantics. Authorship is assumed to express endorsement after intake.

UMAP projects evidenced participants into two dimensions with sorted inputs, seed
42, random initialization, at most 10 neighbors and the legacy compatibility
layout explicitly selected. HDBSCAN finds camps on that layout with min_samples=3,
min_cluster_size between 3 and 5, and no forced single cluster. Fewer than six
evidenced participants, or identical feature vectors, yield no camps. Noise is
preserved; the result does not force three camps or assign every participant.
Coordinates are centered/scaled into [-1, 1]. Identical input is reproducible;
adding participants may change the layout and camp membership/IDs.

Camp IDs hash sorted membership. Names are neutral Romanian numbered labels;
descriptions quote one authored argument, not an AI-generated consensus summary.
Camp.statements includes statements members authored or voted on for bridge lookup.

## Bridges

At least 70% of ALL members in EACH of at least two nonempty, nonoverlapping camps
must explicitly agree. Pass and absent votes do not supply support. Noise votes
do not count for a camp. Candidates must exist in every camp's internal statements
and be unflagged. This is a demo policy, not measured consensus about the seed.

## Verification

From backend/:

```sh
uv run pytest tests app/clustering
uv run ruff check .
uv run ruff format --check app/clustering tests/test_stubs.py
```

Tests use all 50 seed texts with clearly SYNTHETIC embeddings, unrelated to text
meaning or demographic labels. The fixture recovers three deliberately separated
geometric groups; this verifies plumbing, not Gemini quality or actual city opinion
camps. Bridge replay votes/memberships are also synthetic. No real clustering
quality, Gemini latency or cost measurements have been produced.

The existing pytest config discovers tests/ only; include app/clustering explicitly
until Rares includes it in shared test discovery. The old stub pipeline test now
expects noise without embeddings rather than fabricated camps.

## API handoff

Rares/Bordos must agree and implement Gemini embedding generation and persistence,
using Statement.embedding before calling cluster. That field is still marked as
a proposal in schemas.py, and Rares's inspected API does not populate it. Until
then the API safely gets unassigned points, not real opinion camps. The input must
contain the latest vote per pair and approved statements from one consultation.
