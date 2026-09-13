import os

import pytest
from fastapi.testclient import TestClient

if not os.getenv("PHASE2_INTEGRATION"):
    pytest.skip("set PHASE2_INTEGRATION=1 with Docker Compose to run integration tests", allow_module_level=True)

from app.main import app  # noqa: E402


client = TestClient(app)


def test_postgres_and_redis_path_is_available():
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok", "storage": "postgres", "cache": "redis"}


def test_redirect_path_returns_302_after_create():
    created = client.post("/links", json={"url": "https://example.com/integration"})
    assert created.status_code == 201

    redirected = client.get("/r/abc123", follow_redirects=False)

    assert redirected.status_code == 302
    assert redirected.headers["location"] == "https://example.com/integration"
