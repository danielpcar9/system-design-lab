"""Tiny educational reliability primitives — not a production library."""

from __future__ import annotations

import threading
import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


class CircuitBreaker:
    def __init__(self, fail_max: int = 5, reset_timeout: float = 10.0) -> None:
        self.fail_max = fail_max
        self.reset_timeout = reset_timeout
        self.failures = 0
        self.opened_at = 0.0
        self._lock = threading.Lock()

    def allow(self) -> bool:
        with self._lock:
            if self.opened_at == 0:
                return True
            if time.monotonic() - self.opened_at >= self.reset_timeout:
                self.opened_at = 0.0
                self.failures = 0
                return True
            return False

    def success(self) -> None:
        with self._lock:
            self.failures = 0
            self.opened_at = 0.0

    def fail(self) -> None:
        with self._lock:
            self.failures += 1
            if self.failures >= self.fail_max:
                self.opened_at = time.monotonic()


class Bulkhead:
    def __init__(self, limit: int = 8) -> None:
        self._sem = threading.BoundedSemaphore(limit)

    def run(self, fn: Callable[[], T], fallback: T) -> T:
        if not self._sem.acquire(blocking=False):
            return fallback
        try:
            return fn()
        finally:
            self._sem.release()


def retry(fn: Callable[[], T], attempts: int, retry_on: tuple[type[BaseException], ...]) -> T:
    last: BaseException | None = None
    for attempt in range(attempts):
        try:
            return fn()
        except retry_on as error:
            last = error
            if attempt < attempts - 1:
                time.sleep(min(0.05 * (2**attempt), 0.2))
    assert last is not None
    raise last
