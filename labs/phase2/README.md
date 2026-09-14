# Phase 2 · Real backend lab

URL Shortener as two comparable APIs: FastAPI and Rails 8.1 API-only, sharing
[`url-shortener/CONTRACT.md`](url-shortener/CONTRACT.md).

The services share one PostgreSQL server but use separate databases (`fastapi_lab`
and `rails_lab`). This keeps each framework's migrations independent while the
HTTP contract remains comparable.

## Run with Docker Compose

```bash
docker compose -f labs/phase2/docker-compose.yml up --build
```

| Service | Port |
|---|---|
| FastAPI | http://localhost:58000 |
| Rails | http://localhost:53000 |
| PostgreSQL | localhost:55432 |
| Redis | localhost:56379 |

Smoke:

```bash
curl -s http://localhost:58000/health
curl -s http://localhost:53000/health
curl -s http://localhost:58000/ready
curl -s -D- -X POST http://localhost:58000/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/article"}'
curl -s -D- -X POST http://localhost:53000/links \
  -H 'content-type: application/json' \
  -d '{"url":"https://example.com/article"}'
```

Copy [`./.env.example`](.env.example) if you want to inject `LAB_FAULTS=1`.
Do not commit real secrets. `SECRET_KEY_BASE` in Compose is a dummy for the lab.

If you previously started this lab with an older Compose file that used one
shared database, reset only this lab's volume before restarting:

```bash
docker compose -f labs/phase2/docker-compose.yml down -v
docker compose -f labs/phase2/docker-compose.yml up --build
```

## FastAPI without Docker

In-memory unit tests (no PostgreSQL/Redis):

```bash
cd labs/phase2/url-shortener/fastapi
uv sync --extra test
uv run pytest          # skips integration
uv run uvicorn app.main:app --reload
```

Integration (needs Compose env in the pytest process):

```bash
DATABASE_URL=postgresql://lab:lab@127.0.0.1:55432/fastapi_lab \
REDIS_URL=redis://127.0.0.1:56379/0 \
PHASE2_INTEGRATION=1 uv run pytest
```

## Rails

Needs PostgreSQL. This sandbox does not ship Ruby, so Rails tests are **not**
claimed passing here. On a machine with Rails:

```bash
cd labs/phase2/url-shortener/rails
bin/rails db:prepare
bin/rails test
```

Solid Queue runs inside Puma when `SOLID_QUEUE_IN_PUMA=true` (Compose production).

## Benchmark (educational)

The harness is GET-only by default and is **not** a production ranking:

```bash
python3 labs/phase2/bench/http_bench.py http://localhost:58000/health --requests 200 --concurrency 20
python3 labs/phase2/bench/http_bench.py http://localhost:53000/health --requests 200 --concurrency 20
```

Numbers change with laptop, Docker Desktop, cold cache, and GIL vs Puma threads.
See [`RELIABILITY.md`](RELIABILITY.md) for when timeouts, retries, breakers, and
bulkheads help — and when they make p99 worse.

## Observability

Structured JSON logs on FastAPI (`msg`, `path`, `status`, `ms`, `request_id`).
Rails tags `request_id` on STDOUT.

This lab does **not** vendor OpenTelemetry. To see traces locally, run an OTLP
collector (Jaeger all-in-one) and add `opentelemetry-instrumentation-fastapi`
yourself; without an exporter the code is a structured-log stand-in so the
lesson is still visible in `docker compose logs fastapi`.

## What this environment cannot run

- Docker / Compose (not installed in the App Builder sandbox).
- Ruby / `bin/rails test`.
- Live wrk/k6 numbers. The bench script is ready; results must be captured on
  a host that actually starts the containers.
