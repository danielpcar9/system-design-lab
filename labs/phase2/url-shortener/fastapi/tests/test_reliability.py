from fastapi.testclient import TestClient

from app.main import app, idempotency_store, links_by_code, redis_breaker
from app.reliability import CircuitBreaker


def _client():
    links_by_code.clear()
    idempotency_store.clear()
    redis_breaker.failures = 0
    redis_breaker.opened_at = 0.0
    return TestClient(app)


class BoomRedis:
    def get(self, *_args, **_kwargs):
        raise TimeoutError("redis down")

    def setex(self, *_args, **_kwargs):
        raise TimeoutError("redis down")


def test_redis_timeout_still_redirects(monkeypatch):
    client = _client()
    created = client.post("/links", json={"url": "https://example.com/cached"})
    code = created.json()["code"]
    monkeypatch.setattr("app.main._redis_client", lambda: BoomRedis())

    response = client.get(f"/r/{code}", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/cached"


def test_idempotency_key_replays_the_same_code():
    client = _client()
    headers = {"Idempotency-Key": "create-1"}
    first = client.post("/links", json={"url": "https://example.com/once"}, headers=headers)
    second = client.post("/links", json={"url": "https://example.com/once"}, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert first.json()["code"] == second.json()["code"]


def test_injected_postgres_fault_makes_ready_503(monkeypatch):
    client = _client()
    monkeypatch.setenv("LAB_FAULTS", "1")
    monkeypatch.setenv("LAB_ENV", "lab")
    monkeypatch.setenv("LAB_FAULT_POSTGRES", "1")

    response = client.get("/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "not-ready"


def test_circuit_breaker_opens_after_failures():
    breaker = CircuitBreaker(fail_max=2, reset_timeout=30)
    assert breaker.allow()
    breaker.fail()
    assert breaker.allow()
    breaker.fail()
    assert breaker.allow() is False
    breaker.success()
    assert breaker.allow()
