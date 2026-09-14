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
    body = health.json()
    assert body["status"] == "ok"
    assert body["storage"] == "postgres"
    assert body["cache"] == "redis"
    ready = client.get("/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"


def test_redirect_path_returns_302_after_create():
    created = client.post("/links", json={"url": "https://example.com/integration"})
    assert created.status_code == 201
    code = created.json()["code"]

    redirected = client.get(f"/r/{code}", follow_redirects=False)

    assert redirected.status_code == 302
    assert redirected.headers["location"] == "https://example.com/integration"
