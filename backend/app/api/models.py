"""Database tables. Only api/ touches these; agents/ and clustering/ get schemas.py models."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.schemas import Proposal, Statement


class ResponseRow(Base):
    """A citizen's raw answer, stored BEFORE intake runs so it is never lost."""

    __tablename__ = "responses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    participant_id: Mapped[str] = mapped_column(String, index=True)
    text: Mapped[str | None] = mapped_column(Text)
    audio: Mapped[bytes | None] = mapped_column(LargeBinary)
    neighborhood: Mapped[str | None] = mapped_column(String)
    age: Mapped[int | None]
    # pending -> done; failed answers are kept and retried by the live worker
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    attempts: Mapped[int] = mapped_column(default=0)
    error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class StatementRow(Base):
    __tablename__ = "statements"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    response_id: Mapped[str] = mapped_column(ForeignKey("responses.id"), index=True)
    author_id: Mapped[str] = mapped_column(String, index=True)
    text: Mapped[str] = mapped_column(Text)
    flag: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def to_schema(self) -> Statement:
        return Statement(
            id=self.id, text=self.text, author_id=self.author_id, flag=self.flag
        )


class VoteRow(Base):
    # composite key = one vote per (participant, statement): voting again overwrites
    __tablename__ = "votes"

    participant_id: Mapped[str] = mapped_column(String, primary_key=True)
    statement_id: Mapped[str] = mapped_column(
        ForeignKey("statements.id"), primary_key=True
    )
    value: Mapped[str] = mapped_column(String)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ProposalRow(Base):
    __tablename__ = "proposals"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    round: Mapped[int] = mapped_column(unique=True)
    # the full Proposal (text, tradeoffs, verdict) as produced by mediate + critic
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    def to_schema(self) -> Proposal:
        return Proposal.model_validate(self.data)


class ProposalVoteRow(Base):
    # composite key = one vote per (participant, proposal): voting again overwrites
    __tablename__ = "proposal_votes"

    participant_id: Mapped[str] = mapped_column(String, primary_key=True)
    proposal_id: Mapped[str] = mapped_column(
        ForeignKey("proposals.id"), primary_key=True
    )
    support: Mapped[bool]
    critique: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class MapStateRow(Base):
    """The last non-empty camps (id, name, members), so camp ids survive a restart."""

    __tablename__ = "map_state"

    id: Mapped[int] = mapped_column(primary_key=True)
    camps: Mapped[list] = mapped_column(JSON)
