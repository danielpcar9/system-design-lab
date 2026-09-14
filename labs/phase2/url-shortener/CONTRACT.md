# Phase 2 · URL Shortener contract

Both implementations (`fastapi/` and `rails/`) must satisfy this surface. The
studio Code Lab inspects source; this folder is the real HTTP path.

## `POST /links`

Request (canonical):

```json
{ "url": "https://example.com/article" }
```

Rails also accepts `{ "link": { "url": "..." } }` so a generated scaffold still
works. FastAPI rejects unknown fields (`extra=forbid`).

Success: `201 Created`

```json
{ "code": "<7-char code>", "url": "https://example.com/article" }
```

Codes use the unambiguous alphabet `23456789abcdefghjkmnpqrstuvwxyz`. The
generator retries on unique-index collisions (max 5) and then returns 409.

| Case | Status | Body |
|---|---|---|
| Valid URL | 201 | `{ "code", "url" }` |
| Missing / invalid / non-HTTP URL | 422 | `{ "error": "..." }` |
| Exhausted code collisions | 409 | `{ "error": "code already exists" }` |
| Same `Idempotency-Key` replayed | 201 | original `{ "code", "url" }` |

Same URL without an idempotency key may mint a **new** code. Collision is on
`code`, not `url`.

## `GET /r/:code`

Success: `302 Found` with `Location: <url>`.

Unknown code: `404` `{ "error": "link not found" }`.

Redirect path is cache-aside:

1. Redis `GET link:<code>` (50–200ms timeout, bulkhead, circuit breaker).
2. On miss, PostgreSQL `SELECT`.
3. `SETEX` 300 seconds.
4. Redis errors **fail open** to SQL. A Redis outage must not 500 the 302.

Analytics jobs are not on the create path. Rails enqueues `RecordClick` on
redirect only.

## Health

| Path | Meaning |
|---|---|
| `GET /health` | Process is up. `{ "status": "ok", "storage": "postgres\|memory", "cache": "redis\|none" }` |
| `GET /ready` | PostgreSQL ping. Redis is not required (fail-open). `503` if SQL is down. |

Every response includes `X-Request-Id` (FastAPI). Rails tags logs with
`request_id`.

## Faults (lab only)

Off unless `LAB_FAULTS=1` **and** `LAB_ENV` is `lab`/`development`/`test`.

| Variable | Effect |
|---|---|
| `LAB_FAULT_DELAY_MS` | Sleep before handling |
| `LAB_FAULT_POSTGRES` | `/ready` 503, writes 503 |
| `LAB_FAULT_REDIS` | Skip cache, still 302 from SQL |
| `LAB_FAULT_WORKER` | Skip enqueue |

Never enable these in a real production deploy.

## Indexes

- `links.code` unique (PK on FastAPI, unique index on Rails).
- `idempotency_keys.key` unique (FastAPI when PostgreSQL is on).

## Learning checkpoints

1. Validate at the HTTP boundary.
2. Keep uniqueness in the database constraint.
3. Make collision an explicit 409 after retries.
4. Keep analytics off create.
5. Fail open on Redis.
6. Add a request test before changing the implementation.
