#!/usr/bin/env python3
"""Small dependency-free HTTP benchmark for equivalent Rails/FastAPI endpoints."""

import argparse
import concurrent.futures
import statistics
import time
import urllib.request


def request(url: str) -> tuple[float, bool]:
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
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
    args = parser.parse_args()
    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        results = list(pool.map(lambda _: request(args.url), range(args.requests)))
    elapsed = time.perf_counter() - started
    latencies = [latency for latency, _ in results]
    errors = sum(not ok for _, ok in results)
    print(f"url={args.url}")
    print(f"requests={args.requests} concurrency={args.concurrency} errors={errors}")
    print(f"p50={percentile(latencies, 0.50):.2f}ms p95={percentile(latencies, 0.95):.2f}ms p99={percentile(latencies, 0.99):.2f}ms")
    print(f"mean={statistics.mean(latencies):.2f}ms throughput={args.requests / elapsed:.2f} req/s")


if __name__ == "__main__":
    main()
