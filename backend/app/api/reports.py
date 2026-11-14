"""Citizens' reports (sent only after they confirm a draft) and the organizer's list."""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy import select

from app import db
from app.api.auth import require_organizer
from app.api.models import ReportRow
from app.schemas import Report, ReportIn

router = APIRouter(tags=["reports"])


@router.post("/reports", status_code=status.HTTP_201_CREATED, response_model=Report)
def create_report(report: ReportIn) -> Report:
    with db.SessionLocal() as s:
        row = ReportRow(id=f"rep-{uuid.uuid4().hex[:12]}", **report.model_dump())
        s.add(row)
        s.commit()
        s.refresh(row)
        return row.to_schema()


@router.get(
    "/reports",
    response_model=list[Report],
    dependencies=[Depends(require_organizer)],
)
def list_reports() -> list[Report]:
    with db.SessionLocal() as s:
        rows = s.scalars(
            select(ReportRow).order_by(ReportRow.created_at.desc()).limit(200)
        )
        return [r.to_schema() for r in rows]
