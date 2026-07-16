"""Shared-secret bearer auth for the API-to-brain hop (security finding H1).

The brain has exactly one legitimate caller: gm-ai's API, over a private network.
This is that single hop. It is not a user-facing auth system and deliberately has
no users, sessions, scopes, or token rotation - a second caller is a design change,
not a configuration one.

Fail-closed by construction. `assert_auth_configured()` runs when the service is
imported, so a brain with no secret does not boot rather than booting open. The
opt-out is explicit (`BRAIN_ALLOW_INSECURE=1`) and belongs to local development and
the test suite; it lives here rather than in `config` so the research CLIs and the
sim/ scripts can import config without needing a token.
"""

from __future__ import annotations

import hmac

from fastapi import HTTPException, Request

import config

# Liveness probes run before an orchestrator can be trusted to hold a secret, and
# the payload is deliberately non-sensitive. Exact-match, so no path that merely
# starts with /health can slip the check. Everything else is authenticated.
_EXEMPT_PATHS = frozenset({"/health"})


def assert_auth_configured() -> None:
    """Refuse to serve unauthenticated. Called at service import, not request time.

    A brain reachable with no token is finding H1. Discovering that on the first
    request is too late, so this is a boot failure in the shape of the API's own
    assert-auth-env check.
    """
    secret = config.BRAIN_SHARED_SECRET

    if config.HARDENED and not secret:
        raise RuntimeError(
            "BRAIN_SHARED_SECRET is unset. The brain refuses to serve "
            "unauthenticated: generate a secret with `openssl rand -hex 32`, or "
            "set BRAIN_ALLOW_INSECURE=1 for local development and tests.")

    if secret is None:
        return

    # Starlette latin-1-decodes headers and require_auth re-encodes UTF-8, and that
    # round-trip is not identity outside ASCII: a non-ASCII secret would reject the
    # correct token, silently and totally, with nothing in the logs to explain it.
    # Cheaper to refuse at boot than to debug a 401 that cannot succeed.
    if not secret.isascii():
        raise RuntimeError(
            "BRAIN_SHARED_SECRET contains non-ASCII characters, which can never "
            "authenticate. Use `openssl rand -hex 32`.")

    if len(secret) < 32:
        raise RuntimeError(
            f"BRAIN_SHARED_SECRET is {len(secret)} characters; 32+ required. "
            "Generate one with `openssl rand -hex 32`.")


def require_auth(request: Request) -> None:
    """Reject any request not carrying the shared secret as a bearer token.

    Compared with `hmac.compare_digest` over BYTES: the str form raises TypeError
    on a non-ASCII token, and Starlette latin-1-decodes headers, so a str compare
    turns `Authorization: Bearer <non-ascii>` into a 500 and a logged traceback on
    an unauthenticated path. Bytes make a hostile token a plain 401.
    """
    if request.url.path in _EXEMPT_PATHS:
        return

    secret = config.BRAIN_SHARED_SECRET
    if secret is None:
        return          # BRAIN_ALLOW_INSECURE only; assert_auth_configured gates this

    header = request.headers.get("authorization", "")
    scheme, _, token = header.partition(" ")
    if scheme.lower() != "bearer" or not hmac.compare_digest(
        token.encode("utf-8", "surrogateescape"), secret.encode("utf-8")
    ):
        raise HTTPException(401, "unauthorized")
