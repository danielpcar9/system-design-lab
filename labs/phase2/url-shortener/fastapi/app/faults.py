"""Injectable lab faults. Off unless LAB_FAULTS=1. Never default-on in production."""

from __future__ import annotations

import os
import time


def _enabled() -> bool:
    if os.getenv("LAB_FAULTS") != "1":
        return False
    env = (os.getenv("LAB_ENV") or os.getenv("APP_ENV") or os.getenv("RAILS_ENV") or "lab").lower()
    if env in {"production", "prod"}:
        return False
    return env in {"lab", "development", "dev", "test"}


def delay() -> None:
    if not _enabled():
        return
    ms = int(os.getenv("LAB_FAULT_DELAY_MS") or "0")
    if ms > 0:
        time.sleep(ms / 1000.0)


def postgres_down() -> bool:
    return _enabled() and os.getenv("LAB_FAULT_POSTGRES") == "1"


def redis_down() -> bool:
    return _enabled() and os.getenv("LAB_FAULT_REDIS") == "1"


def worker_down() -> bool:
    return _enabled() and os.getenv("LAB_FAULT_WORKER") == "1"


def external_down() -> bool:
    return _enabled() and os.getenv("LAB_FAULT_EXTERNAL") == "1"
