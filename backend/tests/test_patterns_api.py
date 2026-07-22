from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_list_patterns_dsa_track():
    response = client.get("/patterns?track=dsa")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 3
    slugs = [p["slug"] for p in data]
    assert "two-pointers" in slugs or "two-pointer" in slugs
    assert "fast-and-slow-pointers" in slugs
    assert "sliding-window" in slugs


def test_pattern_detail_includes_problem_guides():
    response = client.get("/patterns/two-pointers")
    if response.status_code == 404:
        response = client.get("/patterns/two-pointer")
    assert response.status_code == 200
    data = response.json()
    assert "problems_by_tier" in data
    assert 1 in data["problems_by_tier"] or "1" in data["problems_by_tier"]
    
    tier_one_problems = data["problems_by_tier"].get(1) or data["problems_by_tier"].get("1")
    assert len(tier_one_problems) > 0
    problem = tier_one_problems[0]
    assert "guide" in problem
    assert "hints" in problem["guide"]
    assert "explanation" in problem["guide"]
    assert "python" in problem["guide"]
    assert "javascript" in problem["guide"]
