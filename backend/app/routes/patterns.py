import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Pattern
from app.seed_data import PATTERN, PROBLEM_GUIDES, PROBLEMS, EXTRA_TRACKS_SEED

logger = logging.getLogger("dsa_patterns_tracker")

router = APIRouter(prefix="/patterns", tags=["patterns"])


def _build_pattern_summary(pattern: Pattern) -> dict:
    return {
        "slug": pattern.slug,
        "name": pattern.name,
        "description": pattern.description,
        "track_category": getattr(pattern, "track_category", "dsa"),
        "problem_count": len(pattern.problems),
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
        "problems_by_tier": problems_by_tier,
    }


def _fallback_patterns_payload(track: Optional[str] = "dsa") -> list[dict]:
    track_str = track if isinstance(track, str) else "dsa"
    if not track_str or track_str == "dsa":
        return [
            {
                "slug": PATTERN["slug"],
                "name": PATTERN["name"],
                "description": PATTERN["description"],
                "track_category": "dsa",
                "problem_count": len(PROBLEMS),
            }
        ]
    
    # Check extra tracks seed
    matching = [t for t in EXTRA_TRACKS_SEED if t["track_category"] == track_str]
    return [
        {
            "slug": p["slug"],
            "name": p["name"],
            "description": p["description"],
            "track_category": p["track_category"],
            "problem_count": sum(len(probs) for probs in p["problems_by_tier"].values()),
        }
        for p in matching
    ]


def _fallback_pattern_detail_payload(slug: str) -> dict:
    if slug == PATTERN["slug"]:
        problems_by_tier: dict[int, list] = {}
        idx = 1
        for title, s, number, tier in PROBLEMS:
            problems_by_tier.setdefault(tier, []).append(
                {
                    "id": idx,
                    "title": title,
                    "leetcode_url": f"https://leetcode.com/problems/{s}/",
                    "leetcode_number": number,
                    "guide": PROBLEM_GUIDES.get(
                        title,
                        {
                            "hints": ["Read the problem statement carefully and identify the core pattern."],
                            "explanation": "Use a structured approach to break the problem into smaller steps before coding the solution.",
                            "python": "# Add a Python solution here",
                            "javascript": "// Add a JavaScript solution here",
                        },
                    ),
                }
            )
            idx += 1

        return {
            "slug": PATTERN["slug"],
            "name": PATTERN["name"],
            "description": PATTERN["description"],
            "track_category": "dsa",
            "revision_note_md": PATTERN["revision_note_md"],
            "problems_by_tier": problems_by_tier,
        }

    # Search extra tracks
    for item in EXTRA_TRACKS_SEED:
        if item["slug"] == slug:
            return item

    raise HTTPException(status_code=404, detail="Pattern not found")


@router.get("")
def list_patterns(track: Optional[str] = Query(None), db: Session = Depends(get_db)):
    track_str = track if isinstance(track, str) else None
    try:
        query = db.query(Pattern)
        if track_str:
            query = query.filter(Pattern.track_category == track_str)
        patterns = query.order_by(Pattern.display_order).all()
        if not patterns:
            return _fallback_patterns_payload(track_str or "dsa")
        return [_build_pattern_summary(pattern) for pattern in patterns]
    except Exception as exc:
        logger.warning("Falling back to seed data for pattern list: %s", exc)
        return _fallback_patterns_payload(track_str or "dsa")



@router.get("/{slug}")
def get_pattern(slug: str, db: Session = Depends(get_db)):
    try:
        pattern = db.query(Pattern).filter_by(slug=slug).first()
        if not pattern:
            return _fallback_pattern_detail_payload(slug)
        return _build_pattern_detail(pattern)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Falling back to seed data for pattern detail: %s", exc)
        return _fallback_pattern_detail_payload(slug)

