"""Collision-safe short-code generator.

Unambiguous alphabet (no 0/O, 1/l/I). Tests monkeypatch `generate_code`.
"""

from __future__ import annotations

import secrets

ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"
CODE_LENGTH = 7
MAX_CODE_TRIES = 5


def generate_code(length: int = CODE_LENGTH) -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(length))
