"""A small in-process rate limiter.

The app calls a paid model on every turn, so a public deployment needs some floor of
protection against one client burning the whole API budget. This is deliberately simple:
a fixed window per client IP, held in memory.

Limitations worth knowing before you rely on it:
- In-memory, so each server instance counts separately. Fine for one instance, which is
  what the free tiers give you; not a substitute for a real gateway if you scale out.
- Keyed on client IP, which behind a proxy means trusting X-Forwarded-For.

For anything more serious, put a real rate limiter or an auth layer in front.
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, key: str) -> tuple[bool, int]:
        """Record a hit. Returns (allowed, seconds_until_retry)."""
        now = time.monotonic()
        cutoff = now - self.window

        with self._lock:
            hits = self._hits[key]
            hits[:] = [t for t in hits if t > cutoff]

            if len(hits) >= self.limit:
                retry_after = max(1, int(self.window - (now - hits[0])) + 1)
                return False, retry_after

            hits.append(now)

            # Opportunistic cleanup so idle clients don't accumulate forever.
            if len(self._hits) > 2048:
                for k in [k for k, v in self._hits.items() if not v or v[-1] <= cutoff]:
                    del self._hits[k]

            return True, 0


def client_key(request) -> str:
    """Best-effort client identity. Behind a proxy, the first X-Forwarded-For hop."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    return request.client.host if request.client else "unknown"
