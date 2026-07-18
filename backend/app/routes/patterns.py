import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Pattern
from app.seed_data import PATTERN, PROBLEMS

logger = logging.getLogger("dsa_patterns_tracker")

router = APIRouter(prefix="/patterns", tags=["patterns"])


def _build_pattern_summary(pattern: Pattern) -> dict:
    return {
        "slug": pattern.slug,
        "name": pattern.name,
        "description": pattern.description,
        "problem_count": len(pattern.problems),
    }


def _build_pattern_detail(pattern: Pattern) -> dict:
    problems_by_tier: dict[int, list] = {}
    for problem in sorted(pattern.problems, key=lambda p: (p.tier, p.display_order)):
        problems_by_tier.setdefault(problem.tier, []).append(
            {
                "title": problem.title,
                "leetcode_url": problem.leetcode_url,
                "leetcode_number": problem.leetcode_number,
            }
        )

    return {
        "slug": pattern.slug,
        "name": pattern.name,
        "description": pattern.description,
        "revision_note_md": pattern.revision_note_md,
        "problems_by_tier": problems_by_tier,
    }


def _fallback_patterns_payload() -> list[dict]:
    return [
        {
            "slug": PATTERN["slug"],
            "name": PATTERN["name"],
            "description": PATTERN["description"],
            "problem_count": len(PROBLEMS),
        }
    ]


def _fallback_pattern_detail_payload() -> dict:
    problems_by_tier: dict[int, list] = {}
    for title, slug, number, tier in PROBLEMS:
        problems_by_tier.setdefault(tier, []).append(
            {
                "title": title,
                "leetcode_url": f"https://leetcode.com/problems/{slug}/",
                "leetcode_number": number,
            }
        )

    return {
        "slug": PATTERN["slug"],
        "name": PATTERN["name"],
        "description": PATTERN["description"],
        "revision_note_md": PATTERN["revision_note_md"],
        "problems_by_tier": problems_by_tier,
    }


@router.get("")
def list_patterns(db: Session = Depends(get_db)):
    try:
        patterns = db.query(Pattern).order_by(Pattern.display_order).all()
        return [_build_pattern_summary(pattern) for pattern in patterns]
    except Exception as exc:
        logger.warning("Falling back to seed data for pattern list: %s", exc)
        return _fallback_patterns_payload()


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
        logger.warning("Falling back to seed data for pattern detail: %s", exc)
        if slug != PATTERN["slug"]:
            raise HTTPException(status_code=404, detail="Pattern not found")
        return _fallback_pattern_detail_payload()
