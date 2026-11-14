"""Why is (or isn't) a statement a bridge? Read-only check of the live map's data.

Counts votes per camp INDEPENDENTLY of clustering.bridges(), so sparse voting can be
told apart from a bridge bug. No Gemini calls, no DB writes.

Usage, from backend/ (uses DATABASE_URL from the repo-root .env):
    uv run python -m app.api.diagnose_bridges            # every bridge candidate
    uv run python -m app.api.diagnose_bridges s-123abc   # specific statement ids
"""

import math
import sys

from pydantic import BaseModel

from app.api.camp_ids import load_previous, stabilize
from app.api.live import load_inputs
from app.clustering import bridges, cluster
from app.schemas import Camp, Statement, Vote

# mirrors the documented rule in clustering/README.md (>= 70% of members endorse)
THRESHOLD = 0.7


class CampCounts(BaseModel):
    camp: str
    size: int
    agree: int
    disagree: int
    pass_: int
    missing: int
    # the author counts as support unless they voted explicitly (clustering's rule)
    author_support: int
    endorsed: int
    needed: int

    @property
    def ok(self) -> bool:
        return self.endorsed >= self.needed


def breakdown(
    statement: Statement, votes: list[Vote], camps: list[Camp]
) -> list[CampCounts]:
    cast = {v.participant_id: v.value for v in votes if v.statement_id == statement.id}
    rows = []
    for camp in camps:
        members = set(camp.member_ids)
        values = [cast.get(m) for m in members]
        agree = values.count("agree")
        author = int(statement.author_id in members and statement.author_id not in cast)
        rows.append(
            CampCounts(
                camp=f"{camp.name} ({camp.id})",
                size=len(members),
                agree=agree,
                disagree=values.count("disagree"),
                pass_=values.count("pass"),
                # every member is in exactly one column: the columns add up to size
                missing=values.count(None) - author,
                author_support=author,
                endorsed=agree + author,
                needed=math.ceil(len(members) * THRESHOLD),
            )
        )
    return rows


def report(statement: Statement, votes: list[Vote], camps: list[Camp]) -> str:
    lines = [f"\n{statement.id}  [author {statement.author_id}]  {statement.text}"]
    lines.append(
        f"  {'camp':<34}{'size':>5}{'agree':>7}{'disagr':>7}{'pass':>6}"
        f"{'missing':>8}{'author':>7}{'endorsed/needed':>17}"
    )
    for r in breakdown(statement, votes, camps):
        mark = "✅" if r.ok else "❌"
        lines.append(
            f"  {r.camp[:33]:<34}{r.size:>5}{r.agree:>7}{r.disagree:>7}{r.pass_:>6}"
            f"{r.missing:>8}{r.author_support:>7}{f'{r.endorsed}/{r.needed} {mark}':>17}"
        )
    return "\n".join(lines)


def main(ids: list[str]) -> None:
    statements, votes = load_inputs()
    result = stabilize(cluster(statements, votes), load_previous())
    camps = result.camps
    noise = sum(1 for p in result.points if p.camp_id is None)
    print(
        f"{len(statements)} approved statements, {len(votes)} votes, "
        f"{len(result.points)} participants: {len(camps)} camps + {noise} noise"
    )
    for c in camps:
        print(f"  {c.name} ({c.id}): {c.size} members")
    found = bridges(votes, camps)
    print(f"bridges() returns {len(found)}: {[s.id for s in found]}")
    if len(camps) < 2:
        print("Fewer than 2 camps: bridges() always returns [] by design.")
        return

    if ids:
        chosen = [s for s in statements if s.id in ids]
        missing = set(ids) - {s.id for s in chosen}
        if missing:
            print(f"not found among approved statements: {sorted(missing)}")
    else:
        # bridges() only considers statements seen (written or voted on) in every camp
        seen = [{s.id for s in c.statements} for c in camps]
        chosen = [s for s in statements if all(s.id in ids_ for ids_ in seen)]
        print(f"{len(chosen)} candidates (seen in every camp):")
    for s in chosen:
        print(report(s, votes, camps))


if __name__ == "__main__":
    main(sys.argv[1:])
