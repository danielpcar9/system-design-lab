# Reliability patterns in this lab

Educational, not a vendor ranking. Each pattern is implemented in a small form
in FastAPI (`app/reliability.py`, `app/faults.py`, `app/main.py`) and sketched
in Rails (`lib/lab_faults.rb`, `lib/lab_cache.rb`, `ApplicationJob`).

| Pattern | Helps when | Hurts when |
|---|---|---|
| **Timeouts** | A dependency hangs and would hold a worker forever | The budget is tighter than healthy p99 (you fail good work) |
| **Retries + backoff** | Idempotent writes hitting UniqueViolation or a 50ms blip | You retry a 500 from a saturated SQL primary (amplifies the outage) |
| **Idempotency-Key** | The client retries POST /links after a timeout | You key on the URL and block two legitimate shorts of the same article |
| **Circuit breaker** | Redis is dying and every GET waits for `socket_timeout` | You open on a single timeout and skip a healthy cache for 10s |
| **Bulkhead** | A celebrity-code stampede would exhaust the SQL pool with Redis waits | The limit is smaller than steady-state cache hits |

## Cache-aside + fail-open

`GET /r/:code` must still 302 if Redis times out. Fail-closed is for
authorization and money, not for a cache of public redirects.

## Fault injection

```bash
LAB_FAULTS=1 LAB_ENV=lab LAB_FAULT_REDIS=1
```

Never set `LAB_FAULTS=1` in a production deploy. Compose defaults are off.

## Cost profiles

The studio Stress tab (`small` / `medium` / `large`) scales a **relative** mix
of PostgreSQL, Redis, workers, and API. It is not a cloud invoice. Real spend
needs your provider's price sheet and a measured RPS, not the slider.
