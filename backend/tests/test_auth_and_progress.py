import uuid

from fastapi.testclient import TestClient

from app.main import app
from app.seed_data import seed


def _email(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:6]}@example.com"


def _signup(client: TestClient, email: str, password: str = "password123") -> str:
    res = client.post("/auth/email-auth", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["token"]


def _first_problem_id(client: TestClient) -> int:
    slug = client.get("/patterns?track=dsa").json()[0]["slug"]
    return client.get(f"/patterns/{slug}").json()["problems_by_tier"]["1"][0]["id"]


def test_user_registration_and_login():
    uid = uuid.uuid4().hex[:6]
    username, email = f"user_{uid}", f"user_{uid}@example.com"
    with TestClient(app) as client:
        reg = client.post("/auth/register", json={"username": username, "email": email, "password": "password123"})
        assert reg.status_code == 200
        token = reg.json()["token"]

        me = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me.status_code == 200
        assert me.json()["username"] == username

        assert client.post("/auth/login", json={"username_or_email": email, "password": "password123"}).status_code == 200
        assert client.post("/auth/login", json={"username_or_email": email, "password": "wrong"}).status_code == 401


def test_unified_email_auth_requires_correct_password():
    email = _email("auto")
    with TestClient(app) as client:
        res1 = client.post("/auth/email-auth", json={"email": email, "password": "secret123"})
        assert res1.status_code == 200
        user_id = res1.json()["user"]["id"]

        res2 = client.post("/auth/email-auth", json={"email": email, "password": "secret123"})
        assert res2.status_code == 200
        assert res2.json()["user"]["id"] == user_id

        # Regression: an existing account must never be accessible with only the email.
        assert client.post("/auth/email-auth", json={"email": email}).status_code == 400
        assert client.post("/auth/email-auth", json={"email": email, "password": "nope"}).status_code == 401


def test_new_account_needs_reasonable_password():
    with TestClient(app) as client:
        assert client.post("/auth/email-auth", json={"email": _email("short"), "password": "123"}).status_code == 400


def test_forged_tokens_are_rejected():
    with TestClient(app) as client:
        for token in ("legacy_1", "token_1_abc", "a.b.c"):
            assert client.get("/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_oauth_requires_authorization_code():
    """Regression: OAuth endpoints used to trust a client-supplied username/email."""
    with TestClient(app) as client:
        gh = client.post("/auth/github", json={"github_username": "someone", "email": "victim@example.com"})
        assert gh.status_code == 400
        google = client.post("/auth/google", json={"email": "victim@example.com"})
        assert google.status_code == 400


def test_oauth_url_includes_state(monkeypatch):
    monkeypatch.setenv("GOOGLE_CLIENT_ID", "cid")
    with TestClient(app) as client:
        res = client.get("/auth/google/url", params={"redirect_uri": "http://localhost:5173", "state": "google.abc"})
        url = res.json()["url"]
        assert "state=google.abc" in url
        assert "redirect_uri=http%3A%2F%2Flocalhost%3A5173" in url


def test_user_progress_tracking():
    with TestClient(app) as client:
        token = _signup(client, _email("track"))
        prog = client.post(
            "/progress",
            json={"problem_id": _first_problem_id(client), "status": "solved"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert prog.status_code == 200
        assert prog.json()["total_solved_count"] == 1


def test_reseeding_keeps_user_progress():
    """Regression: seed() used to delete every DSA problem (and its progress) on each restart."""
    with TestClient(app) as client:
        token = _signup(client, _email("persist"))
        headers = {"Authorization": f"Bearer {token}"}
        client.post("/progress", json={"problem_id": _first_problem_id(client), "status": "solved"}, headers=headers)

        seed()

        progress = client.get("/progress", headers=headers).json()["progress"]
        assert len(progress) == 1
        assert client.get("/auth/me", headers=headers).json()["solved_count"] == 1


def test_auto_sync_and_submitted_code():
    with TestClient(app) as client:
        token = _signup(client, _email("sync"))
        headers = {"Authorization": f"Bearer {token}"}

        prof = client.put("/auth/profile", json={"leetcode_username": "suraz_leetcode"}, headers=headers)
        assert prof.status_code == 200
        assert prof.json()["leetcode_username"] == "suraz_leetcode"

        sync = client.post(
            "/progress/auto-sync",
            json={
                "problem_title": "Two Sum II",
                "status": "solved",
                "submitted_code": "def twoSum(nums, target): return [1, 2]",
                "submitted_language": "python",
            },
            headers=headers,
        )
        assert sync.status_code == 200

        progress = client.get("/progress", headers=headers).json()["progress"]
        assert any("Two Sum" in title for title in progress)


def test_seed_removes_duplicate_problems_and_keeps_progress():
    """Regression: the old seeder left thousands of duplicate rows per topic on SQLite."""
    from app.db import SessionLocal
    from app.models import Pattern, Problem, UserProgress

    with TestClient(app) as client:
        token = _signup(client, _email("dupes"))
        headers = {"Authorization": f"Bearer {token}"}
        user_id = client.get("/auth/me", headers=headers).json()["id"]

        db = SessionLocal()
        pattern = db.query(Pattern).filter_by(slug="two-pointers").first()
        original = sorted(pattern.problems, key=lambda p: p.id)[0]
        title = original.title
        copies = [Problem(pattern_id=pattern.id, title=original.title, tier=original.tier) for _ in range(3)]
        db.add_all(copies)
        db.flush()
        # progress recorded against a duplicate row must survive the cleanup
        db.add(UserProgress(user_id=user_id, problem_id=copies[1].id, status="solved"))
        db.commit()
        db.close()

        seed()

        detail = client.get("/patterns/two-pointers").json()
        titles = [p["title"] for tier in detail["problems_by_tier"].values() for p in tier]
        assert len(titles) == len(set(titles))
        assert client.get("/progress", headers=headers).json()["progress"][title]["status"] == "solved"
