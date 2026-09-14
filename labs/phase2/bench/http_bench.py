#!/usr/bin/env python3
"""Small dependency-free HTTP benchmark for equivalent Rails/FastAPI endpoints.

Educational only: same laptop, same payload, same concurrency — still not a
universal ranking. Docker Desktop, GIL vs Puma, cold vs warm Redis, and
thermal throttling all move p99 more than framework slogans.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import statistics
import time
import urllib.request


def request(url: str, method: str, body: bytes | None) -> tuple[float, bool]:
    started = time.perf_counter()
    try:
        req = urllib.request.Request(url, data=body, method=method)
        if body is not None:
            req.add_header("content-type", "application/json")
        with urllib.request.urlopen(req, timeout=10) as response:
            ok = 200 <= response.status < 400
    except Exception:
        ok = False
    return (time.perf_counter() - started) * 1000, ok


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    index = min(len(ordered) - 1, round((len(ordered) - 1) * fraction))
    return ordered[index]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("--requests", type=int, default=200)
    parser.add_argument("--concurrency", type=int, default=20)
    parser.add_argument("--method", default="GET")
    parser.add_argument("--json", dest="json_body", default=None, help='JSON body, e.g. {"url":"https://example.com"}')
    args = parser.parse_args()
    body = None if args.json_body is None else json.dumps(json.loads(args.json_body)).encode()
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        results = list(pool.map(lambda _: request(args.url, args.method, body), range(args.requests)))
    elapsed = time.perf_counter() - started
    latencies = [latency for latency, _ in results]
    errors = sum(not ok for _, ok in results)
    print("educational bench — not a production ranking")
    print(f"url={args.url} method={args.method}")
    print(f"requests={args.requests} concurrency={args.concurrency} errors={errors}")
    print(f"p50={percentile(latencies, 0.50):.2f}ms p95={percentile(latencies, 0.95):.2f}ms p99={percentile(latencies, 0.99):.2f}ms")
    print(f"mean={statistics.mean(latencies):.2f}ms throughput={args.requests / elapsed:.2f} req/s")
    print("results vary with machine, cache warmth, and Docker; compare both stacks on the same host.")


if __name__ == "__main__":
    main()
