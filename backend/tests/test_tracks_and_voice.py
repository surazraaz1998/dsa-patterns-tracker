from fastapi.testclient import TestClient

from app.main import app


def test_tracks_come_from_content_files():
    with TestClient(app) as client:
        tracks = client.get("/tracks").json()
        ids = [t["id"] for t in tracks]
        assert ids[0] == "dsa"
        assert {"system-design", "lld", "agentic-ai", "frontend", "cs-fundamentals", "behavioral"} <= set(ids)

        for track in tracks:
            patterns = client.get(f"/patterns?track={track['id']}").json()
            assert len(patterns) == track["topic_count"]


def test_theory_questions_have_written_answers():
    with TestClient(app) as client:
        detail = client.get("/patterns/operating-systems").json()
        first = detail["problems_by_tier"]["1"][0]
        assert first["guide"]["answer_md"]


def test_edith_is_disabled_by_default():
    with TestClient(app) as client:
        assert client.get("/voice/status").json()["enabled"] is False
        assert client.post("/voice/chat", json={"messages": [{"role": "user", "content": "hi"}]}).status_code == 404


def test_voice_status_and_auth(monkeypatch):
    from app.routes import voice

    monkeypatch.setattr(voice, "EDITH_ENABLED", True)
    with TestClient(app) as client:
        assert client.get("/voice/status").json()["ai_enabled"] is False
        res = client.post("/voice/chat", json={"messages": [{"role": "user", "content": "hi"}]})
        assert res.status_code == 401

        token = client.post("/auth/email-auth", json={"email": "voice@example.com", "password": "password123"}).json()["token"]
        res = client.post(
            "/voice/chat",
            json={"mode": "teach", "topic_slug": "two-pointers", "messages": [{"role": "user", "content": "hi"}]},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 503


class _FakeStream:
    def __init__(self, chunks):
        self._chunks = chunks

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    @property
    def text_stream(self):
        async def gen():
            for c in self._chunks:
                yield c
        return gen()

    async def get_final_message(self):
        class _Msg:
            stop_reason = "end_turn"
        return _Msg()


class _FakeClient:
    def __init__(self):
        self.calls = []
        outer = self

        class _Messages:
            def stream(self, **kwargs):
                outer.calls.append(kwargs)
                return _FakeStream(["Dekho, ", "two pointer simple hai. ", "Samjha?"])

        class _Beta:
            messages = _Messages()

        self.beta = _Beta()


def test_voice_chat_streams_reply_with_topic_context(monkeypatch):
    from app.routes import voice

    fake = _FakeClient()
    monkeypatch.setattr(voice, "EDITH_ENABLED", True)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr(voice, "_client", fake)

    with TestClient(app) as client:
        token = client.post("/auth/email-auth", json={"email": "voice2@example.com", "password": "password123"}).json()["token"]
        res = client.post(
            "/voice/chat",
            json={
                "mode": "test",
                "language": "hinglish",
                "topic_slug": "two-pointers",
                "messages": [
                    {"role": "assistant", "content": "dangling"},  # leading assistant turn must be dropped
                    {"role": "user", "content": "start my test"},
                ],
            },
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.text == "Dekho, two pointer simple hai. Samjha?"

    call = fake.calls[0]
    assert call["model"] == voice.EDITH_MODEL
    assert call["messages"] == [{"role": "user", "content": "start my test"}]
    system = call["system"][0]["text"]
    assert "MODE: TEST" in system and "Two Pointers" in system and "Hinglish" in system
