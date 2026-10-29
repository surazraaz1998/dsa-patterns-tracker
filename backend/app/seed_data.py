"""
Syncs the curriculum in `content/*.json` (one file per track) into the database.

Idempotent and non-destructive: topics are matched by slug and questions by
(topic, title), so re-running never touches user progress for content that
still exists. Topics/questions removed from the JSON are deleted.

Usage:
    python -m app.seed_data
"""

import json
import logging
import os

from app.content_loader import load_tracks
from app.db import SessionLocal, init_db
from app.models import Pattern, Problem, User

logger = logging.getLogger("dsa_patterns_tracker")


def _problem_fields(item: dict) -> dict:
    url = item.get("url") or ""
    slug = url.rstrip("/").split("/")[-1] if "leetcode.com/problems/" in url else url
    return {
        "leetcode_slug": slug or None,
        "leetcode_number": item.get("leetcode_number"),
        "tier": int(item.get("tier", 1)),
        "guide_hints_json": json.dumps(item.get("hints", []), ensure_ascii=False),
        "guide_explanation": item.get("explanation") or None,
        "guide_python": item.get("python") or None,
        "guide_javascript": item.get("javascript") or None,
        "guide_answer_md": item.get("answer_md") or None,
    }


def _seed_admin(db) -> None:
    """Optional admin account, only when ADMIN_EMAIL and ADMIN_PASSWORD are set."""
    from app.routes.auth import hash_password

    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    if not email or not password:
        return
    if db.query(User).filter(User.email == email).first():
        return
    db.add(User(
        username="Admin",
        email=email,
        password_hash=hash_password(password),
        avatar_url="https://api.dicebear.com/7.x/bottts/svg?seed=Admin",
        auth_provider="email",
    ))
    db.commit()
    logger.info("Created admin user %s", email)


def _remove_duplicate_problems(db) -> None:
    """Clean up rows left by the old seeder, which bulk-deleted patterns without
    cascading on SQLite: orphaned problems were re-attached when pattern ids were
    reused, so one topic could end up with thousands of copies of each question.

    Keeps one row per (pattern, title), preferring the one users have progress on,
    and moves progress from the copies onto it.
    """
    pattern_ids = {pid for (pid,) in db.query(Pattern.id).all()}
    groups: dict[tuple, list] = {}
    for problem in db.query(Problem).order_by(Problem.id).all():
        if problem.pattern_id not in pattern_ids:
            db.delete(problem)
            continue
        groups.setdefault((problem.pattern_id, problem.title), []).append(problem)

    removed = 0
    for rows in groups.values():
        if len(rows) == 1:
            continue
        keeper = next((p for p in rows if p.user_progress), rows[0])
        users_on_keeper = {e.user_id for e in keeper.user_progress}
        for dup in rows:
            if dup is keeper:
                continue
            for entry in list(dup.user_progress):
                if entry.user_id not in users_on_keeper:
                    entry.problem_id = keeper.id
                    users_on_keeper.add(entry.user_id)
            db.flush()
            db.expire(dup, ["user_progress"])
            db.delete(dup)
            removed += 1
    db.flush()
    db.expire_all()  # pattern.problems collections still hold the deleted rows
    if removed:
        logger.info("Removed %d duplicate problem rows", removed)


def seed() -> None:
    init_db()
    db = SessionLocal()
    try:
        _seed_admin(db)
        _remove_duplicate_problems(db)

        tracks = load_tracks()
        seen_slugs: set[str] = set()

        for track in tracks:
            track_id = track["track"]["id"]
            for order, topic in enumerate(track["topics"], start=1):
                seen_slugs.add(topic["slug"])
                pattern = db.query(Pattern).filter_by(slug=topic["slug"]).first()
                if not pattern:
                    pattern = Pattern(slug=topic["slug"])
                    db.add(pattern)
                pattern.name = topic["name"]
                pattern.description = topic.get("description", "")
                pattern.revision_note_md = topic.get("revision_note_md", "")
                pattern.display_order = order
                pattern.track_category = track_id
                lesson = topic.get("lesson")
                pattern.lesson_json = json.dumps(lesson, ensure_ascii=False) if lesson else None
                db.flush()

                existing = {p.title: p for p in pattern.problems}
                wanted_titles = set()
                for item_order, item in enumerate(topic.get("items", []), start=1):
                    wanted_titles.add(item["title"])
                    problem = existing.get(item["title"])
                    if not problem:
                        problem = Problem(pattern_id=pattern.id, title=item["title"])
                        db.add(problem)
                    for key, value in _problem_fields(item).items():
                        setattr(problem, key, value)
                    problem.display_order = item_order

                for title, problem in existing.items():
                    if title not in wanted_titles:
                        db.delete(problem)

        # Topics that no longer exist in any content file
        if seen_slugs:
            for stale in db.query(Pattern).filter(~Pattern.slug.in_(seen_slugs)).all():
                db.delete(stale)

        db.commit()
        logger.info("Curriculum synced: %d tracks, %d topics", len(tracks), len(seen_slugs))
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
