import logging
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
import httpx

from app.db import get_db
from app.models import Problem, UserProgress, User
from app.routes.auth import get_current_user_from_header

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/progress", tags=["progress"])


class UpdateProgressRequest(BaseModel):
    problem_id: Optional[int] = None
    problem_title: Optional[str] = None
    status: str  # 'solved' | 'attempted' | 'not_started'
    submitted_code: Optional[str] = None
    submitted_language: Optional[str] = None


class AutoSyncRequest(BaseModel):
    problem_title: Optional[str] = None
    leetcode_slug: Optional[str] = None
    problem_id: Optional[int] = None
    status: str = "solved"
    submitted_code: Optional[str] = None
    submitted_language: Optional[str] = None


class SyncLeetCodeRequest(BaseModel):
    leetcode_username: Optional[str] = None


@router.get("")
def get_user_progress(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = get_current_user_from_header(authorization, db)
    if not user:
        return {"progress": {}}

    entries = db.query(UserProgress).filter(UserProgress.user_id == user.id).all()
    progress_map: dict[str, dict[str, Any]] = {}
    for entry in entries:
        problem = db.query(Problem).filter(Problem.id == entry.problem_id).first()
        if problem:
            progress_map[problem.title] = {
                "status": entry.status,
                "submitted_code": entry.submitted_code,
                "submitted_language": entry.submitted_language,
                "last_submitted_at": entry.last_submitted_at.isoformat() if entry.last_submitted_at else None,
            }

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

    now = datetime.now(timezone.utc)

    if entry:
        entry.status = req.status
        if req.submitted_code is not None:
            entry.submitted_code = req.submitted_code
            entry.last_submitted_at = now
        if req.submitted_language is not None:
            entry.submitted_language = req.submitted_language
    else:
        entry = UserProgress(
            user_id=user.id,
            problem_id=problem.id,
            status=req.status,
            submitted_code=req.submitted_code,
            submitted_language=req.submitted_language,
            last_submitted_at=now if req.submitted_code else None,
        )
        db.add(entry)

    db.commit()

    solved_count = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.status == "solved"
    ).count()

    return {
        "status": req.status,
        "problem_title": problem.title,
        "submitted_code": entry.submitted_code,
        "submitted_language": entry.submitted_language,
        "last_submitted_at": entry.last_submitted_at.isoformat() if entry.last_submitted_at else None,
        "total_solved_count": solved_count
    }


@router.post("/auto-sync")
def auto_sync_progress(
    req: AutoSyncRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required for auto-sync")

    problem = None
    if req.problem_id:
        problem = db.query(Problem).filter(Problem.id == req.problem_id).first()
    elif req.leetcode_slug:
        problem = db.query(Problem).filter(Problem.leetcode_slug == req.leetcode_slug).first()
    elif req.problem_title:
        problem = db.query(Problem).filter(Problem.title.ilike(f"%{req.problem_title}%")).first()

    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found in curriculum")

    entry = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.problem_id == problem.id
    ).first()

    now = datetime.now(timezone.utc)

    if entry:
        entry.status = req.status
        if req.submitted_code:
            entry.submitted_code = req.submitted_code
            entry.last_submitted_at = now
        if req.submitted_language:
            entry.submitted_language = req.submitted_language
    else:
        entry = UserProgress(
            user_id=user.id,
            problem_id=problem.id,
            status=req.status,
            submitted_code=req.submitted_code,
            submitted_language=req.submitted_language,
            last_submitted_at=now if req.submitted_code else None,
        )
        db.add(entry)

    db.commit()

    solved_count = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.status == "solved"
    ).count()

    return {
        "status": "success",
        "synced_problem": problem.title,
        "total_solved_count": solved_count
    }


@router.post("/sync-leetcode")
async def sync_leetcode_submissions(
    req: SyncLeetCodeRequest,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")

    target_handle = req.leetcode_username or getattr(user, "leetcode_username", None)
    if not target_handle:
        raise HTTPException(status_code=400, detail="LeetCode handle not specified. Please set your LeetCode username.")

    # Query LeetCode GraphQL public endpoint
    graphql_query = {
        "query": """
        query recentAcSubmissions($username: String!, $limit: Int!) {
          recentSubmissionList(username: $username, limit: $limit) {
            title
            titleSlug
            statusDisplay
            lang
            timestamp
          }
        }
        """,
        "variables": {"username": target_handle.strip(), "limit": 50}
    }

    synced_count = 0
    synced_titles = []
    processed_problem_ids = set()

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://leetcode.com/graphql", json=graphql_query)
            if resp.status_code == 200:
                data = resp.json()
                submissions = data.get("data", {}).get("recentSubmissionList", []) or []
                
                for sub in submissions:
                    if sub.get("statusDisplay") == "Accepted":
                        title_slug = sub.get("titleSlug")
                        title = sub.get("title")
                        lang = sub.get("lang")
                        ts = sub.get("timestamp")
                        
                        # Match problem in DB
                        problem = db.query(Problem).filter(
                            (Problem.leetcode_slug == title_slug) | (Problem.title.ilike(f"%{title}%"))
                        ).first()

                        if problem and problem.id not in processed_problem_ids:
                            processed_problem_ids.add(problem.id)

                            entry = db.query(UserProgress).filter(
                                UserProgress.user_id == user.id,
                                UserProgress.problem_id == problem.id
                            ).first()
                            
                            sub_dt = datetime.fromtimestamp(int(ts), tz=timezone.utc) if ts else datetime.now(timezone.utc)
                            
                            if not entry:
                                entry = UserProgress(
                                    user_id=user.id,
                                    problem_id=problem.id,
                                    status="solved",
                                    submitted_language=lang,
                                    last_submitted_at=sub_dt
                                )
                                db.add(entry)
                                synced_count += 1
                                synced_titles.append(problem.title)
                            elif entry.status != "solved":
                                entry.status = "solved"
                                if lang:
                                    entry.submitted_language = lang
                                entry.last_submitted_at = sub_dt
                                synced_count += 1
                                synced_titles.append(problem.title)
                
                db.commit()
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.error("LeetCode GraphQL fetch failed: %s", exc)
        raise HTTPException(status_code=502, detail=f"Failed to fetch LeetCode submissions: {exc}")

    # Also save leetcode_username on user if provided
    if req.leetcode_username:
        try:
            user.leetcode_username = req.leetcode_username.strip()
            db.commit()
        except Exception as exc:
            db.rollback()
            logger.warning("Could not update leetcode_username on user: %s", exc)

    total_solved = db.query(UserProgress).filter(
        UserProgress.user_id == user.id,
        UserProgress.status == "solved"
    ).count()

    return {
        "status": "success",
        "synced_count": synced_count,
        "synced_problems": synced_titles,
        "total_solved_count": total_solved
    }
