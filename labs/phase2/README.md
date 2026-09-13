# Phase 2 · Real backend lab

This folder turns the URL Shortener scenario into a real backend exercise.

Start infrastructure and the FastAPI service:

```bash
docker compose -f labs/phase2/docker-compose.yml up -d
```

FastAPI is available at `http://localhost:58000` and uses PostgreSQL as the source of truth plus Redis as a five-minute cache for redirects. Rails is available at `http://localhost:53000` and uses PostgreSQL plus Solid Queue in production mode.

Run the FastAPI starter:

```bash
cd labs/phase2/url-shortener/fastapi
uv sync --extra test
uv run pytest
uv run uvicorn app.main:app --reload
```

Run the integration checks against Compose:

```bash
PHASE2_INTEGRATION=1 uv run pytest
```

The FastAPI app keeps an in-memory fallback for fast unit tests, but Compose exercises the PostgreSQL + Redis path. The next exercise is to replace the deterministic code generator with a collision-safe strategy.

The Rails folder contains the contract and implementation checkpoints. Keep Rails and FastAPI aligned through the shared contract rather than comparing framework slogans.

The Rails app is generated with Rails 8.1.3.1 in API-only mode. Its queue schema is installed and `RecordClick` is enqueued through Solid Queue in production.
