"""Reads the curriculum from `content/*.json` — one file per interview track."""

import json
import os
from functools import lru_cache
from pathlib import Path

_HERE = Path(__file__).resolve()
_CANDIDATES = [
    _HERE.parents[2] / "content",  # repo checkout: <repo>/content
    _HERE.parents[1] / "content",  # docker image: /app/content
]


def content_dir() -> Path:
    override = os.getenv("CONTENT_DIR")
    if override:
        return Path(override)
    for candidate in _CANDIDATES:
        if candidate.is_dir():
            return candidate
    raise FileNotFoundError("content/ directory not found (set CONTENT_DIR)")


ROADMAP_FILE = "roadmap.json"


@lru_cache(maxsize=1)
def load_roadmap() -> dict:
    with open(content_dir() / ROADMAP_FILE, encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=1)
def load_tracks() -> list[dict]:
    tracks = []
    for path in sorted(content_dir().glob("*.json")):
        if path.name == ROADMAP_FILE:
            continue
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        if "track" not in data or "topics" not in data:
            raise ValueError(f"{path.name}: expected top-level 'track' and 'topics' keys")
        tracks.append(data)
    tracks.sort(key=lambda t: t["track"].get("order", 99))
    return tracks


def track_summaries() -> list[dict]:
    return [
        {
            **{k: t["track"].get(k) for k in ("id", "name", "description", "icon", "badge")},
            "topic_count": len(t["topics"]),
            "question_count": sum(len(topic.get("items", [])) for topic in t["topics"]),
        }
        for t in load_tracks()
    ]
