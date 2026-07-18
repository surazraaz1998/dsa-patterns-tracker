from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Pattern

router = APIRouter(prefix="/patterns", tags=["patterns"])


@router.get("")
def list_patterns(db: Session = Depends(get_db)):
    patterns = db.query(Pattern).order_by(Pattern.display_order).all()
    return [
        {
            "slug": p.slug,
            "name": p.name,
            "description": p.description,
            "problem_count": len(p.problems),
        }
        for p in patterns
    ]


@router.get("/{slug}")
def get_pattern(slug: str, db: Session = Depends(get_db)):
    pattern = db.query(Pattern).filter_by(slug=slug).first()
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")

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
