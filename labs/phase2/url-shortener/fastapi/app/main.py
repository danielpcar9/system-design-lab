import json
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_URL = os.getenv("REDIS_URL")


class LinkIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    url: str = Field(min_length=1, max_length=2_048)

    @field_validator("url")
    @classmethod
    def must_be_http_url(cls, value: str) -> str:
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("url must be an absolute HTTP(S) URL")
        return value


class LinkOut(BaseModel):
    code: str
    url: str


@dataclass
class Link:
    code: str
    url: str


links_by_code: dict[str, Link] = {}


def _database_url() -> str:
    return (DATABASE_URL or "").replace("postgresql+psycopg://", "postgresql://", 1)


def _db_connection():
    import psycopg

    return psycopg.connect(_database_url())


def _redis_client():
    if not REDIS_URL:
        return None
    import redis

    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


def init_db() -> None:
    if not DATABASE_URL:
        return
    with _db_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS links (
              code VARCHAR(32) PRIMARY KEY,
              url TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.commit()


def save_link(link: Link) -> None:
    if not DATABASE_URL:
        if link.code in links_by_code:
            raise ValueError("code already exists")
        links_by_code[link.code] = link
        return
    try:
        with _db_connection() as connection:
            connection.execute("INSERT INTO links (code, url) VALUES (%s, %s)", (link.code, link.url))
            connection.commit()
    except Exception as error:
        if error.__class__.__name__ == "UniqueViolation":
            raise ValueError("code already exists") from error
        raise


def find_link(code: str) -> Link | None:
    cache = _redis_client()
    if cache:
        cached = cache.get(f"link:{code}")
        if cached:
            payload = json.loads(cached)
            return Link(**payload)
    if DATABASE_URL:
        with _db_connection() as connection:
            row = connection.execute("SELECT code, url FROM links WHERE code = %s", (code,)).fetchone()
            link = Link(code=row[0], url=row[1]) if row else None
    else:
        link = links_by_code.get(code)
    if link and cache:
        cache.setex(f"link:{code}", 300, json.dumps({"code": link.code, "url": link.url}))
    return link


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="URL Shortener Phase 2 Lab", lifespan=lifespan)


@app.post("/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(payload: LinkIn) -> Link:
    # Exercise: replace this deterministic code with an injected generator.
    link = Link(code="abc123", url=payload.url)
    try:
        save_link(link)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    return link


@app.get("/r/{code}")
def redirect_link(code: str) -> RedirectResponse:
    link = find_link(code)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="link not found")
    return RedirectResponse(link.url, status_code=status.HTTP_302_FOUND)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "storage": "postgres" if DATABASE_URL else "memory", "cache": "redis" if REDIS_URL else "none"}
