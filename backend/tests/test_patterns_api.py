from fastapi.testclient import TestClient

from app.main import app
from app.routes import patterns as patterns_routes


client = TestClient(app)


class BrokenDb:
    def query(self, *args, **kwargs):
        raise RuntimeError("db unavailable")


def test_health_check():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_patterns_fallback_to_seed_data_when_db_is_unavailable():
    response = patterns_routes.list_patterns(db=BrokenDb())
    assert response[0]["slug"] == "two-pointer"
    assert response[0]["problem_count"] > 0


def test_pattern_detail_includes_problem_guides_from_seed_data():
    response = patterns_routes.get_pattern("two-pointer", db=BrokenDb())
    tier_one = response["problems_by_tier"][1][0]
    assert tier_one["title"] == "Two Sum II - Input Array Is Sorted"
    assert tier_one["guide"]["hints"]
    assert tier_one["guide"]["explanation"]
    assert tier_one["guide"]["python"]
    assert tier_one["guide"]["javascript"]
