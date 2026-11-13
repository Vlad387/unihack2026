# Pitch fixture and API/UI handoff

## Rares: loader input

Load `seed/statements.json` and `seed/votes.json` together. Both are flat JSON
arrays matching the current shared `Statement` and `Vote` fields. All authors
and voters are `seed-001` … `seed-050` and must remain demo-only.

Statement `seed-statement-017` is manually curated from response `seed-017`,
with author `seed-017`. This same-number relationship is the source mapping.
Keep these statement IDs when inserting rows, and associate the row with its
source response through the API's normal response relation. Votes reference
these exact IDs. There are no duplicate (participant, statement) pairs and no
self-votes; clustering/bridges infer authorship support.

For a deterministic offline pitch, bypass live intake for these curated rows.
Do NOT feed responses through Gemini and then assume its random output IDs
match the votes. If the loader regenerates DB IDs, remap every vote with an
explicit source-ID mapping. Do not regenerate these votes at server startup.
The unvoted pairs are deliberately missing, distinct from explicit pass votes.

Baseline here: 50 statements, 737 votes, two camps (35/15), four bridges.
Run `uv run python -m app.clustering.evaluate` inside backend/ to verify the
loaded fixture's expected behavior locally. The report is synthetic-only.

## Rares: stable identity belongs in the API

Keep cluster() pure. Maximum shared membership is a useful continuity heuristic,
but require ONE-TO-ONE matches with positive overlap and deterministic tie-breaks.
An independent greedy choice for each new camp can assign the same old ID twice
when a camp splits. A maximum-weight assignment avoids that collision.

For splits, only one child can inherit an old ID. For merges, only one parent
can survive; create/retire other IDs explicitly. Update BOTH Camp.id and every
Point.camp_id. Handle noise separately; never turn noise into a named camp just
because it overlaps a previous one.

IMPORTANT: frontend/src/lib/colors.ts chooses colors by camp ARRAY ORDER, not
by a persistent ID palette. Preserve the previous order for matched camps (and
append new camps), or coordinate a persistent palette with Vladut. Reusing IDs
alone cannot guarantee the same colors. Relative order also shifts color slots
when an earlier camp retires: a persistent ID-to-color mapping or reserved
color slots is needed for that case. Preserve names as appropriate too.

Proposal tradeoffs refer to the camps at generation time. If those camps retire
after a split/merge, screen 4 still needs the proposal round's name/color
snapshot; looking up only current camps can still fall back to "Tabără".
ID matching also does not stop genuine membership changes or map rotation:
our one-vote perturbation report includes a worst 32/50 best-matched retention.

## PR #20 review note

The first-map readiness wait is useful, but I reproduced a timeout status bug
on its current head ec10911. After a wait timeout, run_round stores str(e), which
is an empty string for TimeoutError. _round_status then treats it as no error
and returns idle/error=None instead of failed. Give timeouts a nonempty error
message (or fall back to the exception type) and add a timeout regression test
before relying on the organizer's retry/error UI. PR #20 has since merged; this
edge case still needs the API owner's follow-up.

## Vladut (coordinate through Rares)

Screen 4 is wired in PR #19. The remaining camp-label/color issue is identity
continuity, array ordering and historical proposal legends as described above.
Clustering output remains pure; the API owner should coordinate that mapping.
No frontend data shape was changed by this fixture work.

## Bordos: low-priority naming

A network-based naming agent can summarize members' own approved statements,
outside clustering/. Keep ID assignment separate from labels. Match names to
stable API IDs, and retain the proposal round's labels for historical tradeoffs.
Neutral numbered names remain available; no naming agent is required for the
fixture or the pitch measurements.

## Scope and coverage

PITCH_NUMBERS.md and pitch_metrics.json include quality, warm latency and
one-vote stability with clear limits. All five required fictional contexts are
present (10 each); that is fixture coverage, not a real representation audit.
No new package, schema or clustering algorithm change is needed for these files.
