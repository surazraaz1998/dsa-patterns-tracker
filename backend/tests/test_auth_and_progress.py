import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db import Base, engine
from app.seed_data import seed


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed()


def test_user_registration_and_login():
    """Verify new user registration, login, and auth/me."""
    import uuid
    uid = uuid.uuid4().hex[:6]
    username = f"user_{uid}"
    email = f"user_{uid}@example.com"

    with TestClient(app) as client:
        # Register
        reg_resp = client.post("/auth/register", json={
            "username": username,
            "email": email,
            "password": "password123"
        })
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        token = reg_data["token"]
        assert reg_data["user"]["username"] == username

        # Fetch me
        me_resp = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_resp.status_code == 200
        assert me_resp.json()["username"] == username


def test_github_auth():
    """Verify GitHub OAuth route creates user session."""
    with TestClient(app) as client:
        response = client.post("/auth/github", json={
            "github_username": "surazraaz1998",
            "email": "suraz@example.com",
            "avatar_url": "https://github.com/surazraaz1998.png"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["user"]["username"] == "surazraaz1998"
        assert data["user"]["auth_provider"] == "github"


def test_user_progress_tracking():
    """Verify marking problem as solved updates counter."""
    import uuid
    email = f"track_{uuid.uuid4().hex[:6]}@example.com"
    with TestClient(app) as client:
        reg_resp = client.post("/auth/email-auth", json={"email": email})
        token = reg_resp.json()["token"]

        # Get patterns to find problem ID
        patterns_resp = client.get("/patterns?track=dsa")
        assert patterns_resp.status_code == 200
        pattern_slug = patterns_resp.json()[0]["slug"]

        detail_resp = client.get(f"/patterns/{pattern_slug}")
        assert detail_resp.status_code == 200
        problems_by_tier = detail_resp.json()["problems_by_tier"]

        # Pick tier 1 problem
        prob = problems_by_tier["1"][0]
        prob_id = prob.get("id", 1)

        # Update progress to solved
        prog_resp = client.post(
            "/progress",
            json={"problem_id": prob_id, "status": "solved"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert prog_resp.status_code == 200
        assert prog_resp.json()["status"] == "solved"
        assert prog_resp.json()["total_solved_count"] >= 1


def test_auto_sync_and_submitted_code():
    """Verify auto-syncing submitted code and updating profile."""
    import uuid
    email = f"sync_{uuid.uuid4().hex[:6]}@example.com"
    with TestClient(app) as client:
        reg_resp = client.post("/auth/email-auth", json={"email": email})
        token = reg_resp.json()["token"]

        # Update Profile
        prof_resp = client.put(
            "/auth/profile",
            json={"leetcode_username": "suraz_leetcode"},
            headers={"Authorization": f"Bearer {token}"}
        )
        assert prof_resp.status_code == 200
        assert prof_resp.json()["leetcode_username"] == "suraz_leetcode"

        # Auto sync code submission
        sync_resp = client.post(
            "/progress/auto-sync",
            json={
                "problem_title": "Two Sum II",
                "status": "solved",
                "submitted_code": "def twoSum(nums, target): return [1, 2]",
                "submitted_language": "python"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        assert sync_resp.status_code == 200
        assert sync_resp.json()["status"] == "success"

        # Check progress details
        prog_resp = client.get("/progress", headers={"Authorization": f"Bearer {token}"})
        assert prog_resp.status_code == 200
        progress = prog_resp.json()["progress"]
        assert any("Two Sum" in title for title in progress.keys())


def test_unified_email_auth():
    """Verify unified email auth registers new user and logs in existing user."""
    import uuid
    email = f"auto_{uuid.uuid4().hex[:6]}@example.com"
    with TestClient(app) as client:
        # First call: Auto-registers
        res1 = client.post("/auth/email-auth", json={"email": email})
        assert res1.status_code == 200
        data1 = res1.json()
        assert "token" in data1
        assert data1["user"]["email"] == email

        # Second call: Auto-logs in
        res2 = client.post("/auth/email-auth", json={"email": email})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["user"]["id"] == data1["user"]["id"]


def test_google_auth():
    """Verify Google OAuth route creates user session."""
    import uuid
    email = f"google_{uuid.uuid4().hex[:6]}@gmail.com"
    with TestClient(app) as client:
        url_res = client.get("/auth/google/url")
        assert url_res.status_code == 200
        assert "url" in url_res.json()

        auth_res = client.post("/auth/google", json={
            "email": email,
            "name": "Google User",
            "avatar_url": "https://lh3.googleusercontent.com/a/photo.jpg"
        })
        assert auth_res.status_code == 200
        data = auth_res.json()
        assert data["user"]["email"] == email
        assert data["user"]["auth_provider"] == "google"


