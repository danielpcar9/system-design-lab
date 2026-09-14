"""URL Shortener lab — FastAPI.

HTTP contract lives in labs/phase2/url-shortener/CONTRACT.md.
The browser studio never executes student snippets; this app is the real HTTP path.
"""

from __future__ import annotations

import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any
from urllib.parse import urlparse

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.telemetry import setup_telemetry

from app.codes import MAX_CODE_TRIES, generate_code
from app.faults import delay as fault_delay
from app.faults import postgres_down, redis_down, worker_down
from app.reliability import Bulkhead, CircuitBreaker

DATABASE_URL = os.getenv("DATABASE_URL")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")
REDIS_URL = os.getenv("REDIS_URL")
CACHE_TTL = 300
REDIS_TIMEOUT = 0.05
POSTGRES_TIMEOUT = 2

log = logging.getLogger("sdl.shortener")
if not log.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(handler)
    log.setLevel(logging.INFO)
    log.propagate = False


def _log(level: str, msg: str, **fields: Any) -> None:
    payload = {"level": level, "msg": msg, **fields}
    log.info(json.dumps(payload, default=str))


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
idempotency_store: dict[str, Link] = {}
redis_breaker = CircuitBreaker(fail_max=5, reset_timeout=10.0)
redis_bulkhead = Bulkhead(limit=8)
_redis = None


def _database_url() -> str:
    return (DATABASE_URL or "").replace("postgresql+psycopg://", "postgresql://", 1)


def _db_connection():
    if postgres_down():
        raise RuntimeError("injected postgres fault")
    import psycopg

    return psycopg.connect(
        _database_url(),
        connect_timeout=POSTGRES_TIMEOUT,
        options=f"-c statement_timeout=2000 -c search_path={DB_SCHEMA},public",
    )


def _redis_client():
    global _redis
    if not REDIS_URL or redis_down() or not redis_breaker.allow():
        return None
    if _redis is None:
        import redis

        _redis = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_timeout=REDIS_TIMEOUT,
            socket_connect_timeout=REDIS_TIMEOUT,
        )
    return _redis


def init_db() -> None:
    if not DATABASE_URL:
        return
    with _db_connection() as connection:
        connection.execute(f'CREATE SCHEMA IF NOT EXISTS "{DB_SCHEMA}"')
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS links (
              code VARCHAR(32) PRIMARY KEY,
              url TEXT NOT NULL,
              created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS idempotency_keys (
              key VARCHAR(128) PRIMARY KEY,
              code VARCHAR(32) NOT NULL,
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
        name = error.__class__.__name__
        cause = getattr(error, "__cause__", None)
        cause_name = cause.__class__.__name__ if cause else ""
        if name in {"UniqueViolation", "IntegrityError"} or cause_name == "UniqueViolation":
            raise ValueError("code already exists") from error
        raise


def _cache_get(code: str) -> Link | None:
    def read() -> Link | None:
        cache = _redis_client()
        if not cache:
            return None
        cached = cache.get(f"link:{code}")
        redis_breaker.success()
        if not cached:
            return None
        payload = json.loads(cached)
        return Link(**payload)

    try:
        return redis_bulkhead.run(read, None)
    except Exception as error:
        redis_breaker.fail()
        _log("warn", "redis.get failed open", error=str(error), code=code)
        return None


def _cache_set(link: Link) -> None:
    def write() -> None:
        cache = _redis_client()
        if not cache:
            return
        cache.setex(f"link:{link.code}", CACHE_TTL, json.dumps({"code": link.code, "url": link.url}))
        redis_breaker.success()

    try:
        redis_bulkhead.run(write, None)
    except Exception as error:
        redis_breaker.fail()
        _log("warn", "redis.setex failed open", error=str(error), code=link.code)


def find_link(code: str) -> Link | None:
    cached = _cache_get(code)
    if cached:
        return cached
    if DATABASE_URL:
        with _db_connection() as connection:
            row = connection.execute("SELECT code, url FROM links WHERE code = %s", (code,)).fetchone()
            link = Link(code=row[0], url=row[1]) if row else None
    else:
        link = links_by_code.get(code)
    if link:
        _cache_set(link)
    return link


def _remember_idempotency(key: str, link: Link) -> None:
    idempotency_store[key] = link
    if not DATABASE_URL:
        return
    try:
        with _db_connection() as connection:
            connection.execute(
                "INSERT INTO idempotency_keys (key, code, url) VALUES (%s, %s, %s) ON CONFLICT (key) DO NOTHING",
                (key, link.code, link.url),
            )
            connection.commit()
    except Exception as error:
        _log("warn", "idempotency persist failed", error=str(error))


def _lookup_idempotency(key: str) -> Link | None:
    hit = idempotency_store.get(key)
    if hit:
        return hit
    if not DATABASE_URL:
        return None
    try:
        with _db_connection() as connection:
            row = connection.execute(
                "SELECT code, url FROM idempotency_keys WHERE key = %s",
                (key,),
            ).fetchone()
        if row:
            link = Link(code=row[0], url=row[1])
            idempotency_store[key] = link
            return link
    except Exception as error:
        _log("warn", "idempotency lookup failed", error=str(error))
    return None


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        init_db()
    except Exception as error:
        _log("error", "init_db failed", error=str(error))
    yield


app = FastAPI(title="URL Shortener Phase 2 Lab", lifespan=lifespan)
setup_telemetry(app)


@app.middleware("http")
async def request_context(request: Request, call_next):
    started = time.perf_counter()
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex[:16]
    request.state.request_id = request_id
    try:
        from opentelemetry import trace

        span = trace.get_current_span()
        if span.is_recording():
            span.set_attribute("app.request_id", request_id)
    except ImportError:
        pass
    fault_delay()
    response = await call_next(request)
    response.headers["x-request-id"] = request_id
    _log(
        "info",
        "http",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        ms=round((time.perf_counter() - started) * 1000, 2),
        request_id=request_id,
    )
    return response


def _error_body(message: str) -> dict[str, str]:
    return {"error": message}


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    detail = exc.detail if isinstance(exc.detail, str) else "invalid request"
    return JSONResponse(status_code=exc.status_code, content=_error_body(detail), headers=dict(exc.headers or {}))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    message = "invalid request"
    for err in exc.errors():
        if "url" in err.get("loc", ()):
            message = "url must be an absolute HTTP(S) URL"
            break
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=_error_body(message))


@app.post("/links", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
def create_link(payload: LinkIn, request: Request) -> Link:
    key = request.headers.get("idempotency-key")
    if key:
        existing = _lookup_idempotency(key)
        if existing:
            return existing
    last_error: ValueError | None = None
    for _ in range(MAX_CODE_TRIES):
        link = Link(code=generate_code(), url=payload.url)
        try:
            save_link(link)
            _cache_set(link)
            if key:
                _remember_idempotency(key, link)
            return link
        except ValueError as error:
            last_error = error
            continue
    raise StarletteHTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=str(last_error or "code already exists"),
    )


@app.get("/r/{code}")
def redirect_link(code: str) -> RedirectResponse:
    try:
        link = find_link(code)
    except Exception as error:
        _log("error", "redirect lookup failed", error=str(error), code=code)
        raise StarletteHTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="storage unavailable") from error
    if not link:
        raise StarletteHTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="link not found")
    if not worker_down():
        _log("info", "analytics.enqueue", event="redirect", code=code)
    return RedirectResponse(link.url, status_code=status.HTTP_302_FOUND)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "storage": "postgres" if DATABASE_URL else "memory",
        "cache": "redis" if REDIS_URL else "none",
    }


@app.get("/ready")
def ready():
    if postgres_down():
        return JSONResponse(status_code=503, content={"status": "not-ready", "error": "postgres"})
    if DATABASE_URL:
        try:
            with _db_connection() as connection:
                connection.execute("SELECT 1")
        except Exception as error:
            return JSONResponse(status_code=503, content={"status": "not-ready", "error": str(error)})
    return {"status": "ready", "storage": "postgres" if DATABASE_URL else "memory"}
