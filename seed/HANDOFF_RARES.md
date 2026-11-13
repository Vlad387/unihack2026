# Eidrien → Rares: unblock data science

> UPDATE 2026-11-14: Your DATA_TIPS.md supersedes the embedding dependency below.
> B now clusters votes directly, with no embedding requirement. See
> backend/app/clustering/README.md and run the demo from backend/.
> PR #11 contains clustering + bridges; API startup warms UMAP automatically.
> Please include app/clustering in shared pytest discovery (pyproject.toml).
> The remaining text records the original handoff, not outstanding blockers.

Read `RULES.md` and `PLAN.md` first. Work on `rares`; integrate through a PR into
`dev`. Eidrien owns `backend/app/clustering/` and `seed/`; Rares owns shared
schemas, dependencies, database, API and infrastructure.

## Read Eidrien's work

After Eidrien has committed and pushed the seed files:

```sh
git fetch origin
git show origin/eidrien:seed/README.md
git show origin/eidrien:seed/responses.json
git show origin/eidrien:seed/HANDOFF_RARES.md
```

These commands inspect the branch without switching your checkout or merging it.
If a file is missing, it has not been pushed yet; ask Eidrien to publish it.

Delivered locally by Eidrien:
- `seed/responses.json`: 50 synthetic Romanian answers about city-centre nightlife.
- `seed/validate.py`: dependency-free dataset validation.
- `seed/README.md`: format, usage, and limitations.

Each response has `id`, `group`, and `text`. Groups are fictional speaker context,
not opinion clusters or ground truth. Seed responses are not extracted statements
and are not votes. Intake must produce shared `Statement` models from their text.
Never count synthetic demo participants as real citizen participation.

## What Eidrien needs from you

### 1. Publish the backend foundation

Complete your initial setup from RULES.md section 6: Python 3.12 uv project,
shared Pydantic v2 models, initial stubs, FastAPI `/health`, and Postgres/pgvector
Compose service. Merge the working foundation into `dev` and tell Eidrien to
pull `origin dev` on `eidrien`, then run `uv sync` inside `backend/`.

Declare the planned dependencies in your `backend/pyproject.toml`, including
`google-genai`, `python-dotenv`, `numpy`, `scikit-learn`, and `umap-learn`, plus
Ruff and pytest for development. Use sklearn's HDBSCAN; no separate hdbscan
package is requested. Commit the lockfile produced by uv.

### 2. Make the shared contract sufficient for clustering

Choose the final field names and concrete types in `app/schemas.py`; the items
below are required information, not a request to create competing schemas.
Coordinate with Bordos before finalizing intake output. Preserve the agreed
public function signatures:

```python
cluster(statements, votes) -> ClusterResult
bridges(votes, camps) -> list[Statement]
```

The shared models must make it possible to determine:
- `Statement`: stable statement ID, text, and participant/author ID. One citizen
  can produce several statements; the map still needs one point per participant.
- `Vote`: participant ID, statement ID, and explicit agree/disagree/unknown
  semantics. Missing vote is distinct from disagreement or an unknown vote.
- `Camp`: stable identity for a result, short name/description, participant
  membership, and access to the actual candidate Statement models needed by
  `bridges(votes, camps)`.
- `ClusterResult`: camps and finite x/y coordinates linked to participant IDs,
  including a defined representation for unassigned/noise participants.

Important contract gap: `bridges` receives no standalone statements argument.
It cannot return `list[Statement]` from vote IDs and membership alone. Ensure its
inputs carry the candidate statements through the shared models, or agree on a
contract change with the team BEFORE implementation. Do not solve this with a
database query, global lookup, or an import from agents inside clustering.

Also document:
- Concrete collection types accepted by both functions.
- Whether camps may overlap and how duplicate votes are handled before calling B.
- How to represent empty inputs, a single participant, and all-noise results.
- The coordinate range expected by the API/UI. Coordinate data shapes go through
  you; do not ask Eidrien to negotiate an independent frontend contract.
- How simulated proxy content is identified and excluded from real vote support.

Keep choices small; examples or tests using actual shared models are sufficient.
Do not invent confidence scores, thresholds, or mandatory clusters just to fill
out the schema. A tiny dataset may not support meaningful camps.

### 3. Wire persistence and orchestration on the API side

Keep responses and votes in the backend; pass shared models into B's functions.
B's clustering module must not access the DB, FastAPI, or the agents module.
Coordinate the intake → clustering pipeline with Bordos. Agree how Gemini
embedding calls fit the documented pure-function boundary; do not add hidden
network calls or change signatures without recording the agreed approach.

For live integration, emit `map_updated` and `bridges_updated` with the shared
contract consumed by the frontend. Define when recomputation runs and prevent
older background results from overwriting a newer consultation state.

## Acceptance checklist

- Backend dependencies install with `uv sync` on Python 3.12.
- Shared models can express a participant with multiple statements, votes from
  multiple camps, unknown/missing votes, and unassigned map points.
- A small example demonstrates that bridges can return real Statement objects
  using ONLY their declared inputs.
- `/health` and the Compose DB work; required Ruff/pytest checks pass.
- Foundation is merged into `dev`; tell Eidrien the commit and schema examples.

Eidrien then implements clustering, bridges, seed-based checks and evaluation
inside the folders owned by B. Do not implement B's algorithm beyond the initial
stubs explicitly assigned to you in RULES.md.
