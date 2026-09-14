# Roadmap

Status after this pass. `[x]` shipped, `[~]` partial / environment-blocked, `[ ]` later.

## Phase 1 — Active learning

- [x] Code Lab editor with reasonable syntax highlighting (Rails / FastAPI)
- [x] Exercises per scenario with visible + hidden source-inspection tests
- [x] Honest limitation: the browser never executes student snippets
- [x] Persistent progress (`not-started` / `in-progress` / `mastered`) in Zustand + localStorage
- [x] Next-exercise recommendation, frequent misses, retry failed
- [x] Scenario briefing: objectives, prereqs, concept checklist, challenge, hints, reflection, success
- [x] Keyboard tabs, focus-visible, skip link, aria labels, ES/EN, responsive layout

## Phase 2 — Real backend

- [x] FastAPI + Rails share CONTRACT.md (flat `{url}`, `{error}` envelope, 201/422/409/302/404)
- [x] Collision-safe generator with retries, then 409
- [x] Redis cache-aside, fail-open, timeouts, bulkhead, breaker (FastAPI); Rails tiny RESP client
- [x] Idempotency-Key on POST /links
- [x] Analytics off the create path
- [x] FastAPI unit tests (in-memory) + reliability tests
- [x] Rails request tests written (need PostgreSQL + Ruby to execute)
- [x] Compose healthchecks, `.env.example`, dummy `SECRET_KEY_BASE`
- [x] Educational HTTP bench script
- [~] Docker Compose end-to-end — **blocked here** (no Docker in this sandbox)
- [~] Rails `bin/rails test` — **blocked here** (no Ruby)
- [~] Live benchmark numbers — **blocked here** (no running containers)
- [ ] Shared live contract test against `:58000` and `:53000` (script ready: `url-shortener/contract_test.py`)

## Phase 3 — Production-shaped lab

- [x] Structured logs + request ID (FastAPI); Rails log tags
- [x] `/health` vs `/ready`
- [x] Injectable faults behind `LAB_FAULTS=1`
- [x] Timeouts, retries, idempotency, breaker, bulkhead + educational copy
- [x] Cost profiles small/medium/large in Stress (relative units)
- [~] OpenTelemetry — documented as optional; no vendor SDK vendored
- [ ] Render/Fly/Railway live deploy (see `labs/phase2/render.yaml` sketch)

## Explicit non-goals

- No auth/DB on the TanStack studio (progress stays in the browser).
- No executing arbitrary student code in the browser or on the server.
- No invented production benchmarks.
