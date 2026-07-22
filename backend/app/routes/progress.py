import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Problem, UserProgress
from app.routes.auth import get_current_user_from_header

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/progress", tags=["progress"])


class UpdateProgressRequest(BaseModel):
    problem_id: Optional[int] = None
    problem_title: Optional[str] = None
    status: str  # 'solved' | 'attempted' | 'not_started'


@router.get("")
def get_user_progress(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user_from_header(authorization, db)
    if not user:
        return {"progress": {}}

    entries = db.query(UserProgress).filter(UserProgress.user_id == user.id).all()
    progress_map = {}
    for entry in entries:
        problem = db.query(Problem).filter(Problem.id == entry.problem_id).first()
        if problem:
            progress_map[problem.title] = entry.status

    return {"progress": progress_map}


@router.post("")
def update_user_progress(
    req: UpdateProgressRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required to save progress")

    problem = None
    if req.problem_id:
        problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    elif req.problem_title:
        problem = db.query(Problem).filter(Problem.title == req.problem_title).first()

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    entry = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.problem_id == problem.id
    ).first()

    if entry:
        entry.status = req.status
    else:
        entry = UserProgress(
            user_id=user.id,
            problem_id=problem.id,
            status=req.status
        )
        db.add(entry)

    db.commit()

    # Get updated total solved count
    solved_count = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.status == "solved"
    ).count()

    return {
        "status": req.status,
        "problem_title": problem.title,
        "total_solved_count": solved_count
    }
