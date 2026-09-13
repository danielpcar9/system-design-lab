# Equivalent benchmark

The benchmark intentionally knows nothing about Rails or FastAPI. Point it at the same endpoint on both implementations.

```bash
python3 labs/phase2/bench/http_bench.py http://localhost:58000/health --requests 200 --concurrency 20
```

Report p50, p95, p99, errors, and throughput. Do not compare runs unless the payload, endpoint, database state, cache state, concurrency, and hardware are the same.
