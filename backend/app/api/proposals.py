"""Screen 4: proposal rounds (mediate + critic) and citizens' votes on them."""

import asyncio
import logging
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select

from app import db
from app.agents import critic, mediate
from app.api.auth import require_organizer
from app.api.live import live
from app.api.models import ProposalRow, ProposalVoteRow
from app.schemas import (
    Proposal,
    ProposalPublished,
    ProposalVote,
    SupportRound,
    SupportUpdated,
)

router = APIRouter(tags=["proposals"])
log = logging.getLogger(__name__)

# seed/demo participants are never counted as real citizens (schemas.py contract)
DEMO_PREFIX = "seed-"


class RoundStatus(BaseModel):
    state: Literal["idle", "running", "failed"]
    error: str | None = None


def _round_status() -> RoundStatus:
    if live.round_running:
        return RoundStatus(state="running")
    if live.round_error:
        return RoundStatus(state="failed", error=live.round_error)
    return RoundStatus(state="idle")


def latest_proposal() -> Proposal | None:
    with db.SessionLocal() as s:
        row = s.scalars(
            select(ProposalRow).order_by(ProposalRow.round.desc()).limit(1)
        ).first()
        return row.to_schema() if row else None


def previous_critiques() -> list[str]:
    latest = latest_proposal()
    if latest is None:
        return []
    with db.SessionLocal() as s:
        return list(
            s.scalars(
                select(ProposalVoteRow.critique)
                .where(ProposalVoteRow.proposal_id == latest.id)
                .where(ProposalVoteRow.critique.is_not(None))
                .where(ProposalVoteRow.participant_id.not_like(f"{DEMO_PREFIX}%"))
            )
        )


def save_proposal(proposal: Proposal) -> Proposal:
    with db.SessionLocal() as s:
        last = s.scalar(select(func.max(ProposalRow.round))) or 0
        # mediate() always says round 1: the API owns the round counter
        proposal = proposal.model_copy(update={"round": last + 1})
        s.add(
            ProposalRow(
                id=proposal.id,
                round=proposal.round,
                data=proposal.model_dump(mode="json"),
            )
        )
        s.commit()
        return proposal


def support_rounds() -> list[SupportRound]:
    with db.SessionLocal() as s:
        rounds = {
            p_id: SupportRound(round=r, agree=0, total=0)
            for p_id, r in s.execute(select(ProposalRow.id, ProposalRow.round))
        }
        votes = s.execute(
            select(ProposalVoteRow.proposal_id, ProposalVoteRow.support).where(
                ProposalVoteRow.participant_id.not_like(f"{DEMO_PREFIX}%")
            )
        )
        for p_id, support in votes:
            rounds[p_id].total += 1
            rounds[p_id].agree += int(support)
        return sorted(rounds.values(), key=lambda r: r.round)


async def publish_support() -> None:
    async with live.support_lock:
        await live.broadcast(
            SupportUpdated(data=await asyncio.to_thread(support_rounds))
        )


async def run_round() -> None:
    """mediate (25-60 s) -> critic -> save with the real round -> broadcast."""
    try:
        camps, common = live.result.camps, live.bridges
        critiques = await asyncio.to_thread(previous_critiques)
        proposal = await asyncio.to_thread(mediate, camps, common, critiques, [])
        try:
            verdict = await asyncio.to_thread(critic, proposal, camps)
        # the critic is a quality check: without it the proposal is still publishable
        except Exception:
            log.exception("critic failed, publishing without a verdict")
            verdict = None
        proposal = proposal.model_copy(update={"verdict": verdict})
        saved = await asyncio.to_thread(save_proposal, proposal)
        live.round_error = None
        await live.broadcast(ProposalPublished(data=saved))
        await publish_support()
    # Gemini down / no camps yet: nothing is half-saved, the organizer can retry
    except Exception as e:
        log.exception("proposal round failed")
        live.round_error = str(e)[:500]
    finally:
        live.round_running = False


@router.post(
    "/proposals",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=RoundStatus,
    dependencies=[Depends(require_organizer)],
)
async def start_round() -> RoundStatus:
    """Organizer: write the next compromise from the current map. Runs in the background."""
    if live.round_running:
        raise HTTPException(409, "a round is already being generated")
    live.round_running = True
    live.round_error = None
    live.track(asyncio.create_task(run_round()))
    return _round_status()


@router.get("/proposals/status", response_model=RoundStatus)
def round_status() -> RoundStatus:
    return _round_status()


@router.get("/proposal", response_model=Proposal | None)
def get_proposal() -> Proposal | None:
    """The current round's proposal, or null before the first round."""
    return latest_proposal()


@router.get("/support", response_model=list[SupportRound])
def get_support() -> list[SupportRound]:
    return support_rounds()


@router.post("/proposal-votes", status_code=status.HTTP_204_NO_CONTENT)
async def vote_on_proposal(vote: ProposalVote) -> Response:
    """Voting again overwrites. Only the current round is open."""
    latest = await asyncio.to_thread(latest_proposal)
    if latest is None or vote.proposal_id != latest.id:
        if await asyncio.to_thread(_proposal_exists, vote.proposal_id):
            raise HTTPException(409, "this round is closed")
        raise HTTPException(404, "proposal not found")
    critique = vote.critique.strip() if vote.critique else None
    await asyncio.to_thread(_save_vote, vote, critique or None)
    await publish_support()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _proposal_exists(proposal_id: str) -> bool:
    with db.SessionLocal() as s:
        return s.get(ProposalRow, proposal_id) is not None


def _save_vote(vote: ProposalVote, critique: str | None) -> None:
    with db.SessionLocal() as s:
        s.merge(
            ProposalVoteRow(
                participant_id=vote.participant_id,
                proposal_id=vote.proposal_id,
                support=vote.support,
                critique=critique,
            )
        )
        s.commit()
