#!/usr/bin/env python3
"""Live contract check against both lab servers.

Skipped unless PHASE2_CONTRACT=1. Does not invent numbers; it only asserts
status codes and JSON keys against running Compose services.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

if not os.getenv("PHASE2_CONTRACT"):
    print("set PHASE2_CONTRACT=1 and start docker compose to run this check")
    sys.exit(0)

TARGETS = [
    os.getenv("FASTAPI_URL", "http://127.0.0.1:58000"),
    os.getenv("RAILS_URL", "http://127.0.0.1:53000"),
]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file, code, msg, headers, newurl):
        return None


def request(method: str, url: str, body: dict | None = None, follow: bool = True):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    if body is not None:
        req.add_header("content-type", "application/json")
    opener = urllib.request.build_opener(
        urllib.request.HTTPRedirectHandler() if follow else NoRedirect()
    )
    try:
        with opener.open(req, timeout=5) as response:
            raw = response.read()
            parsed = json.loads(raw) if raw and "application/json" in response.headers.get("content-type", "") else None
            return response.status, dict(response.headers), parsed
    except urllib.error.HTTPError as error:
        raw = error.read()
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = None
        return error.code, dict(error.headers), parsed


def check(base: str) -> None:
    status, _, health = request("GET", f"{base}/health")
    assert status == 200, (base, health)
    assert health and health.get("status") == "ok"

    status, _, created = request("POST", f"{base}/links", {"url": "https://example.com/contract"})
    assert status == 201, (base, created)
    assert created and created.get("code") and created.get("url")

    status, _, error = request("POST", f"{base}/links", {"url": "not-a-url"})
    assert status == 422, (base, error)
    assert error and error.get("error")

    code = created["code"]
    req = urllib.request.Request(f"{base}/r/{code}", method="GET")
    try:
        urllib.request.build_opener(NoRedirect()).open(req, timeout=5)
        raise AssertionError(f"{base} did not return a redirect error")
    except urllib.error.HTTPError as err:
        assert err.code == 302, (base, err.code)
        assert err.headers.get("Location") == "https://example.com/contract"

    print(f"ok {base}")


def main() -> int:
    failed = 0
    for target in TARGETS:
        try:
            check(target)
        except Exception as error:
            failed += 1
            print(f"FAIL {target}: {error}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
