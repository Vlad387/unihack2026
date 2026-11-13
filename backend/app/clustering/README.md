# Data science status

The shared contract from Rares is available in `app/schemas.py`.
`bridges(votes, camps)` is implemented; `cluster()` is still the original demo
stub and must not be treated as measured opinion clustering.

Bridge rule: at least 70% of ALL members in EACH of at least two nonempty,
nonoverlapping camps must explicitly agree. Unknown/pass and absent votes do
not supply support. Noise participants do not vote on behalf of a camp.
Candidates must exist in every camp's internal statements collection and be
unflagged. Duplicate votes and inconsistent memberships are rejected instead
of silently counting them twice. The API must supply the latest vote per pair.
This threshold is a demo policy, not a measured finding about the seed data.

Run from `backend/`:

```sh
uv run pytest tests app/clustering/test_bridges.py
uv run ruff check .
uv run ruff format --check app/clustering
```

The seed replay uses the 50 real seed texts with explicitly synthetic test
memberships and votes. It verifies plumbing, not observed consensus or cluster
quality. The existing pytest configuration discovers `tests/` by default, so
include the clustering test path explicitly until Rares adds it to discovery.

## Remaining integration decisions

- `Statement.embedding` is marked PROPOSAL in schemas.py. Confirm that the API
  supplies Gemini embeddings before calling cluster; B will keep cluster pure.
- Define how participant features combine authored statements and votes before
  implementing UMAP/HDBSCAN. Never derive camps from demographic seed groups.
- API persistence, response/vote routes and WebSocket orchestration still need
  to connect the pipeline; `/health` alone does not verify those features.
