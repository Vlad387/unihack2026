# Nightlife consultation seed

## Citizen help chatbot evaluation

`chat_eval.json` is a UTF-8 JSON array of **40 synthetic Romanian conversations**
for “Ce facem cu viața de noapte din centru?”. It is evaluation input, never citizen
participation, a report to submit, or a vote. All names, addresses and numbers in
the cases are explicitly fictional; `0000000000` is a dummy, not a contact number.

Each object has:

| Field | Meaning |
| --- | --- |
| `id` | Unique stable case ID, e.g. `chat-phrase-01` |
| `page` | Current frontend path, passed as `ChatContext.page` |
| `messages` | 1–4 message objects, each with `role` (`user` / `assistant`) and `text` (1–1000 characters); chronological, ending with the user request to evaluate |
| `expected_action` | Exact `ChatReply.action.type`: `none`, `answer`, `vote`, `map`, `proposal`, or `report` |
| `expected_report_kind` | Present only for report cases: `abuse`, `personal_data`, or `bug`; matches `ChatReply.report.kind` |

The full contract also allows report kind `other`; this fixture focuses on the
three requested report categories. The contract was read from Rares's PR #54;
it is not redefined by this dataset.

The ID prefix identifies the evaluation slice: `how` (10 explanations, action
`none`), `phrase` (10 opinion drafts, `answer`), `nav` (6 navigation requests:
2 each for `vote` / `map` / `proposal`), `report` (8: 3 abuse, 2 personal data,
3 bugs), and `trap` (6, action `none`). Ages and roles appear naturally in the
messages; they are not demographic labels or representative population samples.
An assistant message in a multi-message case is fixed fictional history, not
the evaluated agent's output. Evaluate only its next reply. No case requires
a live proposal, particular camp names, a statement ID, or an organizer token.

Expected actions describe the next UI suggestion, **never automatic submission**.
An explanation alone uses `none`; a requested opinion draft uses `answer`.
Reporting content already displayed uses `report`. A user volunteering their own
dummy phone number (`chat-trap-05`) instead needs privacy guidance: `none`, no
outbound call and no invented abuse report.

### Evaluation handoff to Bordos

Call `assist(messages, context)` with the exact question above and each case's
page. Use empty optional context (no round/proposal, `camp_names=[]`) consistently;
record any different context in the results. Validate replies against `ChatReply`.
Do not send any action or report to the API. See `CHAT_EVAL_NUMBERS.md` for the
scoring rubric, quota/latency accounting and current measurement status.

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
