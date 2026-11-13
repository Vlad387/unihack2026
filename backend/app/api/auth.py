import hmac
import os
from typing import Annotated

from fastapi import Header, HTTPException


def require_organizer(
    x_organizer_token: Annotated[str | None, Header()] = None,
) -> None:
    """Organizer-only actions need the X-Organizer-Token header to match ORGANIZER_TOKEN.

    Unset ORGANIZER_TOKEN = local development, open. The server MUST set it.
    """
    expected = os.environ.get("ORGANIZER_TOKEN")
    if not expected:
        return
    # constant-time compare: response timing must not leak the token
    if not x_organizer_token or not hmac.compare_digest(x_organizer_token, expected):
        raise HTTPException(401, "organizer token required")
