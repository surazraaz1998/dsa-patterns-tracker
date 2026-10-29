import os
import tempfile

# Must run before any `app` import: point tests at a throwaway SQLite DB so they
# never touch the DATABASE_URL configured in backend/.env.
_db_file = os.path.join(tempfile.mkdtemp(prefix="algotrack-tests-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_db_file}"
os.environ["JWT_SECRET"] = "test-secret"
os.environ.pop("ANTHROPIC_API_KEY", None)
os.environ.pop("ANTHROPIC_AUTH_TOKEN", None)

import pytest  # noqa: E402

from app.db import Base, engine  # noqa: E402
from app.main import _REQUEST_HISTORY  # noqa: E402
from app.seed_data import seed  # noqa: E402


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed()
    _REQUEST_HISTORY.clear()
    yield
