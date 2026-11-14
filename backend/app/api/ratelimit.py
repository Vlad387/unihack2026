"""In-memory sliding-window rate limits for the endpoints that cost a Gemini call.

At the venue, everyone on the same Wi-Fi shares one public IP, so per-IP limits stay
generous; the global limits are what protect the daily Gemini quota.
shortcut: in-memory, per process: fine for the single API instance we run; move to a
shared store (e.g. Redis) if the API ever runs on several instances.
"""

import os
import time
from collections import deque

from fastapi import HTTPException, Request

# Behind Azure App Service the real client IP is in X-Forwarded-For. Only trust it there:
# without a proxy in front, any client could send a fake one to dodge the limit.
TRUST_FORWARDED = os.environ.get("TRUST_X_FORWARDED_FOR") == "1"
MAX_KEYS = 10_000
WINDOW_S = 60.0


class RateLimit:
    def __init__(self, per_minute: int) -> None:
        self.per_minute = per_minute
        self._hits: dict[str, deque[float]] = {}

    def full(self, key: str) -> bool:
        """Read-only: checking never adds a key, so refused requests cost no memory."""
        window = self._hits.get(key)
        if window is None:
            return False
        now = time.monotonic()
        while window and now - window[0] > WINDOW_S:
            window.popleft()
        if not window:
            del self._hits[key]
            return False
        return len(window) >= self.per_minute

    def hit(self, key: str) -> None:
        now = time.monotonic()
        if len(self._hits) > MAX_KEYS:  # bound memory: forget keys idle for a minute
            self._hits = {
                k: w for k, w in self._hits.items() if w and now - w[-1] < WINDOW_S
            }
        self._hits.setdefault(key, deque()).append(now)

    def reset(self) -> None:
        self._hits.clear()


_ALL: list[RateLimit] = []


def limit(per_minute: int) -> RateLimit:
    lim = RateLimit(per_minute)
    _ALL.append(lim)
    return lim


def reset_all() -> None:
    for lim in _ALL:
        lim.reset()


def client_ip(request: Request) -> str:
    if TRUST_FORWARDED:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # the proxy appends the real client last; Azure adds ":port" to IPv4
            ip = forwarded.split(",")[-1].strip()
            return ip.rsplit(":", 1)[0] if ip.count(":") == 1 else ip
    return request.client.host if request.client else "unknown"


def enforce(*checks: tuple[RateLimit, str]) -> None:
    """All limits must allow it; only then is the request counted everywhere. So a refused
    request neither uses up another limit (e.g. the global quota) nor adds a key."""
    if any(lim.full(key) for lim, key in checks):
        raise HTTPException(429, "too many requests, wait a minute")
    for lim, key in checks:
        lim.hit(key)
