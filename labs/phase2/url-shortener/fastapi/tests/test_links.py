import pytest
from fastapi.testclient import TestClient

from app.main import app, links_by_code


@pytest.fixture(autouse=True)
def clean_store():
    links_by_code.clear()
    yield
    links_by_code.clear()


client = TestClient(app)


def test_create_link_returns_201_and_contract():
    response = client.post("/links", json={"url": "https://example.com/article"})

    assert response.status_code == 201
    assert response.json() == {"code": "abc123", "url": "https://example.com/article"}


def test_invalid_url_returns_422():
    response = client.post("/links", json={"url": "not-a-url"})

    assert response.status_code == 422


def test_duplicate_code_returns_409():
    payload = {"url": "https://example.com/article"}
    assert client.post("/links", json=payload).status_code == 201

    response = client.post("/links", json={"url": "https://example.com/other"})

    assert response.status_code == 409
