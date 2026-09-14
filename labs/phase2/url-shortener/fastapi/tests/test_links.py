from fastapi.testclient import TestClient

from app.main import app, idempotency_store, links_by_code


def _client():
    links_by_code.clear()
    idempotency_store.clear()
    return TestClient(app)


def test_create_link_returns_201_and_contract():
    client = _client()
    response = client.post("/links", json={"url": "https://example.com/article"})

    assert response.status_code == 201
    body = response.json()
    assert body["url"] == "https://example.com/article"
    assert isinstance(body["code"], str) and len(body["code"]) >= 5
    assert "error" not in body
    assert "x-request-id" in response.headers


def test_invalid_url_returns_422_error_envelope():
    client = _client()
    response = client.post("/links", json={"url": "not-a-url"})

    assert response.status_code == 422
    assert response.json() == {"error": "url must be an absolute HTTP(S) URL"}


def test_javascript_url_returns_422():
    client = _client()
    response = client.post("/links", json={"url": "javascript:alert(1)"})
    assert response.status_code == 422
    assert response.json()["error"]


def test_duplicate_code_returns_409(monkeypatch):
    client = _client()
    monkeypatch.setattr("app.main.generate_code", lambda: "abc123")
    payload = {"url": "https://example.com/article"}
    assert client.post("/links", json=payload).status_code == 201

    response = client.post("/links", json={"url": "https://example.com/other"})

    assert response.status_code == 409
    assert response.json() == {"error": "code already exists"}


def test_retries_then_succeeds_on_collision(monkeypatch):
    client = _client()
    codes = iter(["abc123", "abc123", "xyz789"])
    monkeypatch.setattr("app.main.generate_code", lambda: next(codes))
    assert client.post("/links", json={"url": "https://example.com/a"}).status_code == 201

    response = client.post("/links", json={"url": "https://example.com/b"})
    assert response.status_code == 201
    assert response.json()["code"] == "xyz789"


def test_redirect_returns_302_for_known_link():
    client = _client()
    created = client.post("/links", json={"url": "https://example.com/article"})
    code = created.json()["code"]

    response = client.get(f"/r/{code}", follow_redirects=False)

    assert response.status_code == 302
    assert response.headers["location"] == "https://example.com/article"


def test_unknown_code_returns_404_error_envelope():
    client = _client()
    response = client.get("/r/missing", follow_redirects=False)
    assert response.status_code == 404
    assert response.json() == {"error": "link not found"}


def test_health_and_ready():
    client = _client()
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["status"] == "ok"
    assert health.json()["storage"] == "memory"
    ready = client.get("/ready")
    assert ready.status_code == 200
    assert ready.json()["status"] == "ready"
