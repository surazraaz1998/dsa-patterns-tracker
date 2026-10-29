import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import json

from app.content_loader import load_roadmap, track_summaries
from app.db import get_db
from app.models import Pattern

logger = logging.getLogger("dsa_patterns_tracker")

router = APIRouter(prefix="/patterns", tags=["patterns"])
tracks_router = APIRouter(prefix="/tracks", tags=["tracks"])
roadmap_router = APIRouter(prefix="/roadmap", tags=["roadmap"])


@roadmap_router.get("")
def get_roadmap():
    """The week-by-week study plan from content/roadmap.json."""
    return load_roadmap()


def _lesson(pattern: Pattern) -> Optional[dict]:
    if not pattern.lesson_json:
        return None
    try:
        return json.loads(pattern.lesson_json)
    except ValueError:
        logger.warning("Invalid lesson JSON for pattern %s", pattern.slug)
        return None


@tracks_router.get("")
def list_tracks():
    """Interview tracks, generated from the files in content/."""
    return track_summaries()


def _build_pattern_summary(pattern: Pattern) -> dict:
    return {
        "slug": pattern.slug,
        "name": pattern.name,
        "description": pattern.description,
        "track_category": getattr(pattern, "track_category", "dsa"),
        "problem_count": len(pattern.problems),
        "lesson_status": (_lesson(pattern) or {}).get("status"),
        "lesson_week": (_lesson(pattern) or {}).get("week"),
    }


def _build_pattern_detail(pattern: Pattern) -> dict:
    problems_by_tier: dict[int, list] = {}
    for problem in sorted(pattern.problems, key=lambda p: (p.tier, p.display_order)):
        problems_by_tier.setdefault(problem.tier, []).append(
            {
                "id": problem.id,
                "title": problem.title,
                "leetcode_url": problem.leetcode_url,
                "leetcode_number": problem.leetcode_number,
                "guide": problem.guide,
            }
        )

    return {
        "slug": pattern.slug,
        "name": pattern.name,
        "description": pattern.description,
        "track_category": getattr(pattern, "track_category", "dsa"),
        "revision_note_md": pattern.revision_note_md,
        "lesson": _lesson(pattern),
        "problems_by_tier": problems_by_tier,
    }


@router.get("")
def list_patterns(track: Optional[str] = Query(None), db: Session = Depends(get_db)):
    track_str = track if isinstance(track, str) else None
    try:
        query = db.query(Pattern)
        if track_str:
            query = query.filter(Pattern.track_category == track_str)
        patterns = query.order_by(Pattern.display_order).all()
        if not patterns:
            # Re-seed database if empty
            from app.seed_data import seed
            seed()
            patterns = query.order_by(Pattern.display_order).all()
        return [_build_pattern_summary(pattern) for pattern in patterns]
    except Exception as exc:
        logger.error("Failed to list patterns: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to fetch patterns")


@router.get("/{slug}")
def get_pattern(slug: str, db: Session = Depends(get_db)):
    try:
        pattern = db.query(Pattern).filter_by(slug=slug).first()
        if not pattern:
            raise HTTPException(status_code=404, detail="Pattern not found")
        return _build_pattern_detail(pattern)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Failed to fetch pattern detail: %s", exc)
        raise HTTPException(status_code=500, detail="Unable to fetch pattern detail")
