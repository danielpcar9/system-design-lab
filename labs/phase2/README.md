# Phase 2 · Real backend lab

URL Shortener as two comparable APIs: FastAPI and Rails 8.1 API-only, sharing
[`url-shortener/CONTRACT.md`](url-shortener/CONTRACT.md).

If the infrastructure feels unfamiliar, start with
[`LEARNING_GUIDE.md`](LEARNING_GUIDE.md). It explains the request flow and the
tradeoffs behind PostgreSQL, Redis, Solid Queue, Docker, OpenTelemetry, and
Jaeger before asking you to change the code.

The services share one PostgreSQL server but use separate databases
(`fastapi_lab`, `rails_lab`, and `rails_queue_lab`). This keeps each framework's
migrations independent and gives Solid Queue its own database while the HTTP
contract remains comparable.

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
| Jaeger UI | http://localhost:16686 |

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

Compose also starts Jaeger with OTLP HTTP and gRPC enabled. The APIs export
traces only because Compose explicitly sets the OTEL variables; local unit
tests and normal non-OTEL runs remain no-op. Open the Jaeger UI at
`http://localhost:16686`, select `url-shortener-fastapi` or
`url-shortener-rails`, then make a request to `/health`, `/links`, or `/r/:code`.

To verify traces through Jaeger's API after making a request:

```bash
curl -s 'http://localhost:16686/api/services'
curl -s 'http://localhost:16686/api/traces?service=url-shortener-fastapi&limit=5'
```

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
Rails `db:prepare` loads `db/queue_schema.rb` into the dedicated
`rails_queue_lab` database during container boot.

## Benchmark (educational)

The harness is GET-only by default and is **not** a production ranking:

```bash
python3 labs/phase2/bench/http_bench.py http://localhost:58000/health --requests 200 --concurrency 20
python3 labs/phase2/bench/http_bench.py http://localhost:53000/health --requests 200 --concurrency 20
```

Numbers change with laptop, Docker Desktop, cold cache, and GIL vs Puma threads.
See [`RELIABILITY.md`](RELIABILITY.md) for when timeouts, retries, breakers, and
bulkheads help — and when they make p99 worse.

## Reproducible Render deployment

`render.yaml` is a Blueprint. The live Render pair has already been used to
pass the shared HTTP contract on FastAPI and Rails. Lab faults stay off there
(`LAB_ENV=production`, `LAB_FAULTS=0`) and OTEL exporters stay disabled unless
you attach a collector. Jaeger remains a Compose-only classroom.

The free-tier Blueprint provisions one PostgreSQL database shared by Rails,
FastAPI, and Solid Queue, plus Redis and both web services. Separate
PostgreSQL schemas (`fastapi`, `rails`, and `solid_queue`) prevent table-name
collisions while keeping the deployment within Render's one-free-Postgres
limit. For a higher-isolation production profile, provision separate databases
and point `QUEUE_DATABASE_URL` to the queue database. In the Render dashboard:

1. Create a new Blueprint from this repository and select `labs/phase2/render.yaml`.
2. Review the generated resources and choose plans appropriate for your account.
3. Sync the Blueprint and wait for both `/health` endpoints to become ready.
4. Confirm `LAB_ENV=production` and `LAB_FAULTS=0`; never enable lab faults there.
5. Configure an external OTLP endpoint only if you have one. Leave the OTEL
   exporter disabled otherwise; the app remains functional without a collector.
6. Run the contract test against the deployed URLs using `FASTAPI_URL` and
   `RAILS_URL` environment variables.

The Blueprint is the reproducible artifact; `DATABASE_URL`,
`QUEUE_DATABASE_URL`, `REDIS_URL`, and `SECRET_KEY_BASE` are injected by
Render rather than committed.


## Observability

Structured JSON logs on FastAPI (`msg`, `path`, `status`, `ms`, `request_id`).
Rails tags `request_id` on STDOUT.

The SDK integrations are included but exporters remain configurable. Compose
enables OTLP and sends spans to Jaeger; production defaults to no exporter
until you configure a collector. Without an exporter, structured logs remain a
useful low-cost stand-in in `docker compose logs fastapi`.

## What this environment cannot run

- Docker / Compose (not installed in the App Builder sandbox).
- Ruby / `bin/rails test`.
- Live wrk/k6 numbers. The bench script is ready; results must be captured on
  a host that actually starts the containers.
