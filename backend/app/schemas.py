"""THE shared contract between agents/, clustering/, api/ and frontend/src/lib/types.ts.

Change a model only via Rares + a message on the group chat, then update types.ts.
Worked examples of every rule below: tests/test_contract.py.

Contract rules (the API guarantees these before calling agents/ or clustering/):
- All collections are plain `list`s. Empty lists are valid input everywhere.
- intake(text, audio) returns new Statements with unique ids, author_id=None and `flag`
  set when moderation is needed. The API then sets author_id to the participant id.
- cluster(statements, votes) receives only approved (unflagged) statements and at most
  ONE vote per (participant_id, statement_id): the latest one wins, older ones are dropped.
- A participant may author several statements; the map still has ONE Point per participant.
- Vote semantics: "agree", "disagree", "pass" (= "nu știu", unknown). A missing vote is
  simply no Vote object; it is never the same as "pass" or "disagree".
- Camps never overlap. A participant outside every camp is noise: Point.camp_id is None.
  No camps at all (empty input, one participant, all noise) is ClusterResult(camps=[], ...).
- Coordinates are finite floats in any range (the map auto-scales); roughly [-1, 1]
  is recommended so the layout is stable between recomputations.
- Simulated proxy content is a ProxyOpinion, never a Statement or Vote, so it can never
  enter clustering, bridges or SupportRound counts.
- Seed/demo participants (ids starting with "seed-") are never counted as real citizens.
"""

from typing import Literal, Self

from pydantic import BaseModel, Field, FiniteFloat, model_validator

VoteValue = Literal["agree", "disagree", "pass"]
ModerationReason = Literal["abuse", "personal_data", "off_topic"]


class Statement(BaseModel):
    id: str
    text: str
    author_id: str | None = None
    # set by intake(); flagged statements go to the moderation queue, not to voting
    flag: ModerationReason | None = None
    # PROPOSAL, pending A+B agreement: the API computes this before cluster(), so
    # clustering stays a pure function with no hidden network call. Not sent to the UI.
    embedding: list[float] | None = Field(default=None, exclude=True)


class Vote(BaseModel):
    participant_id: str
    statement_id: str
    value: VoteValue


class Point(BaseModel):
    participant_id: str
    x: FiniteFloat
    y: FiniteFloat
    # None = noise / not assigned to any camp
    camp_id: str | None = None
    # what this participant said (approved statements), shown on hover in the UI.
    # Filled by the API after cluster(); clustering leaves it None.
    text: str | None = None


class Camp(BaseModel):
    id: str
    name: str
    description: str
    size: int
    member_ids: list[str] = Field(default_factory=list)
    # Every statement a member authored OR voted on. A bridge needs votes from every
    # camp, so every bridge candidate is guaranteed to be here: this is how
    # bridges(votes, camps) returns real Statements using only its inputs.
    # A camp's own arguments (for mediate/critic): s.author_id in member_ids.
    # Internal: not sent to the UI.
    statements: list[Statement] = Field(default_factory=list, exclude=True)


class ClusterResult(BaseModel):
    camps: list[Camp]
    points: list[Point]

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        camp_ids = {c.id for c in self.camps}
        if len(camp_ids) != len(self.camps):
            raise ValueError("duplicate camp id")
        seen: set[str] = set()
        for c in self.camps:
            if seen & set(c.member_ids):
                raise ValueError(f"camp {c.id} overlaps another camp")
            seen |= set(c.member_ids)
            if c.size != len(c.member_ids):
                raise ValueError(f"camp {c.id}: size must equal len(member_ids)")
        point_ids = [p.participant_id for p in self.points]
        if len(set(point_ids)) != len(point_ids):
            raise ValueError("more than one point per participant")
        for p in self.points:
            if p.camp_id is not None and p.camp_id not in camp_ids:
                raise ValueError(
                    f"point {p.participant_id} has unknown camp {p.camp_id}"
                )
            if (p.camp_id is not None) != (p.participant_id in seen):
                raise ValueError(
                    f"point {p.participant_id} disagrees with camp membership"
                )
        return self


class CampTradeoff(BaseModel):
    camp_id: str
    gains: str
    gives_up: str


class Proposal(BaseModel):
    id: str
    round: int
    text: str
    tradeoffs: list[CampTradeoff]


class Verdict(BaseModel):
    faithful: bool
    balanced: bool
    feasible: bool
    notes: str


class ProxyOpinion(BaseModel):
    """Simulated view of a group that did not participate. Never counted in votes."""

    group: str
    text: str
    simulated: Literal[True] = True


class SupportRound(BaseModel):
    """Real citizen votes only: simulated proxy votes are never counted here."""

    round: int
    agree: int
    total: int


class Consultation(BaseModel):
    id: str
    question: str
    context: str
    # share of real "agree" votes (0-1) a proposal needs to pass
    threshold: float = Field(ge=0, le=1)


class ModerationItem(BaseModel):
    statement: Statement
    reason: ModerationReason


# WebSocket events, sent as JSON {"type": ..., "data": ...}
class MapUpdated(BaseModel):
    type: Literal["map_updated"] = "map_updated"
    data: ClusterResult


class BridgesUpdated(BaseModel):
    type: Literal["bridges_updated"] = "bridges_updated"
    data: list[Statement]


class ProposalPublished(BaseModel):
    type: Literal["proposal_published"] = "proposal_published"
    data: Proposal


class SupportUpdated(BaseModel):
    type: Literal["support_updated"] = "support_updated"
    data: list[SupportRound]


ConsultationEvent = MapUpdated | BridgesUpdated | ProposalPublished | SupportUpdated
