"""
Shared pytest fixtures for all backend tests.

Key design decisions:
- mock_settings patches get_settings() so no real .env file is needed.
  get_settings() uses lru_cache; we must call cache_clear() before patching.
  app.main calls get_settings() at import time for CORS setup — that is fine
  because the middleware just needs FRONTEND_URL as a string, and any value
  satisfies it. The patches that matter (for Supabase client creation inside
  route handlers) all happen at call time, not import time.
- mock_current_user overrides the get_current_user FastAPI dependency so no
  real Supabase JWT calls happen in any test.
- The TestClient wraps the FastAPI app with those overrides applied.
- Supabase client calls are mocked per-test with unittest.mock.patch.
"""
import os
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Set env vars before importing the app so that pydantic-settings
# can construct Settings without a real .env file on disk.
os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "fake-anon-key")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")

from app.config import get_settings  # noqa: E402 — must come after env setup
from app.dependencies import get_current_user  # noqa: E402
from app.main import app  # noqa: E402

TEST_USER_ID = "test-user-uuid-1234"
TEST_APP_ID = "app-uuid-5678"


@pytest.fixture(autouse=True)
def mock_settings():
    """
    Clear the lru_cache and patch get_settings() with a fake Settings object
    so no real .env file is required and no real Supabase connections are made.
    Restores the real settings (cache cleared) on teardown.
    """
    get_settings.cache_clear()

    fake_settings = MagicMock()
    fake_settings.SUPABASE_URL = "https://fake.supabase.co"
    fake_settings.SUPABASE_ANON_KEY = "fake-anon-key"
    fake_settings.SUPABASE_SERVICE_ROLE_KEY = "fake-service-role-key"
    fake_settings.FRONTEND_URL = "http://localhost:5173"

    with (
        patch("app.config.get_settings", return_value=fake_settings),
        patch("app.routers.applications.get_settings", return_value=fake_settings),
        patch("app.routers.files.get_settings", return_value=fake_settings),
        patch("app.routers.settings.get_settings", return_value=fake_settings),
        patch("app.routers.account.get_settings", return_value=fake_settings),
        patch("app.services.storage.get_settings", return_value=fake_settings),
        patch("app.services.scheduler.get_settings", return_value=fake_settings),
    ):
        yield fake_settings

    get_settings.cache_clear()


@pytest.fixture
def mock_current_user():
    """Return the fixed test user ID used for all dependency overrides."""
    return TEST_USER_ID


@pytest.fixture
def client(mock_current_user):
    """
    TestClient with get_current_user dependency overridden.
    The override returns the fixed test user ID without any HTTP call.
    APScheduler is patched out — it tries to attach to the event loop on
    startup which is already closed in the pytest-asyncio environment.
    """
    app.dependency_overrides[get_current_user] = lambda: mock_current_user
    with (
        patch("app.main.start_scheduler"),
        patch("app.main.stop_scheduler"),
    ):
        with TestClient(app) as c:
            yield c
    app.dependency_overrides.clear()
