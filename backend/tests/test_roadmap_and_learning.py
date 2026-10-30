import re
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app


def test_roadmap_lessons_all_exist_and_weeks_1_to_16_are_complete():
    with TestClient(app) as client:
        roadmap = client.get("/roadmap").json()
        assert len(roadmap["blocks"]) == 12
        assert set(roadmap["playbook"]) == {"dsa", "hld", "lld"}

        for block in roadmap["blocks"]:
            for entry in block["items"]:
                for slug in entry["lessons"]:
                    detail = client.get(f"/patterns/{slug}")
                    assert detail.status_code == 200, slug
                    lesson = detail.json()["lesson"]
                    assert lesson, slug
                    if block["phase"] in (1, 2):
                        # Weeks 1-16 are full lessons with every section
                        assert lesson["status"] == "full", slug
                        for key in ("simple", "analogy", "concepts", "when_to_use", "dry_run", "template", "mistakes", "interview_tips", "quiz"):
                            assert lesson.get(key), (slug, key)
                        # the deep dive explains the topic in several detailed sections
                        assert len(lesson["concepts"]) >= 3, slug
                        for concept in lesson["concepts"]:
                            assert concept["title"] and len(concept["body"].split()) >= 60, (slug, concept["title"])
                        for q in lesson["quiz"]:
                            assert 0 <= q["answer"] < len(q["options"]), slug


def test_learning_state_requires_login_and_round_trips():
    with TestClient(app) as client:
        assert client.get("/learning").status_code == 401

        token = client.post("/auth/email-auth", json={"email": "learner@example.com", "password": "password123"}).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}

        res = client.put("/learning", json={"entries": {"roadmap:w01-dsa": True, "quiz:two-pointers": {"best": 2, "total": 3}}}, headers=headers)
        assert res.status_code == 200
        assert res.json()["entries"] == {"roadmap:w01-dsa": True, "quiz:two-pointers": {"best": 2, "total": 3}}

        client.put("/learning", json={"entries": {"roadmap:w01-dsa": None}}, headers=headers)
        assert client.get("/learning", headers=headers).json()["entries"] == {"quiz:two-pointers": {"best": 2, "total": 3}}

        assert client.put("/learning", json={"entries": {"evil:key": 1}}, headers=headers).status_code == 400

        # completed lessons sync too
        res = client.put("/learning", json={"entries": {"lesson:sorting": True}}, headers=headers)
        assert res.status_code == 200 and res.json()["entries"]["lesson:sorting"] is True

        # study days and revision schedule sync; oversized values are rejected
        days = ["2026-10-28", "2026-10-29"]
        res = client.put("/learning", json={"entries": {"activity:days": days, "revision:sorting": {"due": "2026-11-01", "step": 1}}}, headers=headers)
        assert res.status_code == 200 and res.json()["entries"]["activity:days"] == days
        assert client.put("/learning", json={"entries": {"activity:days": ["x" * 50] * 100}}, headers=headers).status_code == 400


# keys of DIAGRAMS in frontend/src/visuals/diagrams.ts (4-space-indented "'id': {" / "id: {" lines)
DIAGRAMS_TS = Path(__file__).resolve().parents[2] / "frontend" / "src" / "visuals" / "diagrams.ts"
DIAGRAM_IDS = set(re.findall(r"^    '?([a-z0-9-]+)'?: \{$", DIAGRAMS_TS.read_text(), re.M))
SORTING_VISUALS = {"bubble", "selection", "insertion", "shell", "merge", "quick", "heap", "counting", "radix", "bucket", "cyclic"}
# must match the visualisers registered in frontend/src/visuals (sorting.ts and structures.ts)
VISUALS = {
    "sorting": SORTING_VISUALS,
    "binary-search": {"classic", "lower-bound"},
    "two-pointers": {"two-sum-sorted", "container"},
    "sliding-window": {"longest-unique", "max-sum-k"},
    "linked-list": {"reverse", "middle"},
    "tree": {"preorder", "inorder", "postorder", "levelorder", "bst-search"},
    "graph": {"bfs", "dfs"},
    "dp": {"climbing-stairs", "house-robber", "coin-change", "lcs"},
    "diagram": DIAGRAM_IDS,
}


def test_lesson_videos_and_visuals_are_well_formed():
    with TestClient(app) as client:
        for track in client.get("/tracks").json():
            for summary in client.get("/patterns", params={"track": track["id"]}).json():
                lesson = client.get(f"/patterns/{summary['slug']}").json().get("lesson") or {}
                for concept in lesson.get("concepts") or []:
                    for video in concept.get("videos") or []:
                        assert len(video["id"]) == 11 and video["title"] and video["channel"], video
                        start, end = video.get("start", 0), video.get("end")
                        assert start >= 0 and (end is None or end > start), video
                    visual = concept.get("visual")
                    if visual:
                        known = VISUALS.get(visual["type"], set())
                        assert visual["algorithm"] in known, visual
                        assert set(visual.get("options", [])) <= known, visual

        # weeks 1-16: every deep-dive section has at least one clip
        for block in client.get("/roadmap").json()["blocks"]:
            if block["phase"] > 2:
                continue
            for entry in block["items"]:
                for slug in entry["lessons"]:
                    for concept in client.get(f"/patterns/{slug}").json()["lesson"]["concepts"]:
                        assert concept.get("videos"), (slug, concept["title"])

        sorting = client.get("/patterns/sorting").json()["lesson"]
        assert {c["visual"]["algorithm"] for c in sorting["concepts"] if c.get("visual")} == SORTING_VISUALS


def test_search_index_covers_topics_sections_and_problems():
    with TestClient(app) as client:
        items = client.get("/search-index").json()["items"]
        by_slug = {i["slug"]: i for i in items}
        assert len(items) >= 70
        sorting = by_slug["sorting"]
        assert sorting["track"] == "dsa" and sorting["status"] == "full"
        assert "Merge sort" in sorting["sections"] and "Sort Colors" in sorting["problems"]
        assert all({"slug", "track", "name", "sections", "problems"} <= set(i) for i in items)
