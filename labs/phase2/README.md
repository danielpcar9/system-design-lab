# Phase 2 · Real backend lab

This folder turns the URL Shortener scenario into a real backend exercise.

Start infrastructure:

```bash
docker compose -f labs/phase2/docker-compose.yml up -d
```

Run the FastAPI starter:

```bash
cd labs/phase2/url-shortener/fastapi
uv sync --extra test
uv run pytest
uv run uvicorn app.main:app --reload
```

The FastAPI starter intentionally uses an in-memory store. Replace it in the next exercise with PostgreSQL, then add Redis for `GET /{code}` and measure the difference between a cold and warm cache.

The Rails folder contains the contract and implementation checkpoints. Keep Rails and FastAPI aligned through the shared contract rather than comparing framework slogans.
