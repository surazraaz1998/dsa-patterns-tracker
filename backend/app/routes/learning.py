"""Roadmap checkboxes and quiz scores for signed-in users (guests keep them in the browser)."""

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import LearningState
from app.routes.auth import get_current_user_from_header

logger = logging.getLogger("dsa_patterns_tracker")
router = APIRouter(prefix="/learning", tags=["learning"])

ALLOWED_PREFIXES = ("roadmap:", "quiz:")


class LearningUpdate(BaseModel):
    entries: dict[str, Any] = Field(..., max_length=500)


def _require_user(authorization: Optional[str], db: Session):
    user = get_current_user_from_header(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Sign in to sync your learning progress")
    return user


@router.get("")
def get_learning_state(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    user = _require_user(authorization, db)
    rows = db.query(LearningState).filter(LearningState.user_id == user.id).all()
    return {"entries": {row.key: json.loads(row.value_json) for row in rows}}


@router.put("")
def update_learning_state(
    req: LearningUpdate,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    """Upsert entries; a null value deletes the key."""
    user = _require_user(authorization, db)
    for key in req.entries:
        if len(key) > 200 or not key.startswith(ALLOWED_PREFIXES):
            raise HTTPException(status_code=400, detail=f"Invalid key: {key[:50]}")

    existing = {
        row.key: row
        for row in db.query(LearningState).filter(
            LearningState.user_id == user.id, LearningState.key.in_(list(req.entries))
        )
    }
    for key, value in req.entries.items():
        row = existing.get(key)
        if value is None:
            if row:
                db.delete(row)
            continue
        if row:
            row.value_json = json.dumps(value)
        else:
            db.add(LearningState(user_id=user.id, key=key, value_json=json.dumps(value)))
    db.commit()
    return get_learning_state(authorization, db)
