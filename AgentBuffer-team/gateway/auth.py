"""JWT verification for Supabase tokens.

Supabase projects created in 2025+ sign user JWTs with ES256 (asymmetric ECDSA)
and publish the public key at `/auth/v1/.well-known/jwks.json`. We use PyJWT's
`PyJWKClient` for verification — it handles JWKS fetching, key caching, kid
matching, and ES256 signature verification.

For older HS256-signed projects, fall back to the legacy shared secret if
SUPABASE_JWT_SECRET is set. With neither configured, fall back to a fixed
demo org_id so local development without a real Supabase project still works.
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Annotated

import jwt as pyjwt
from fastapi import Depends, HTTPException, Request

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", "stub-secret")
JWKS_URL = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json" if SUPABASE_URL else ""


def _extract_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token")
    return auth.removeprefix("Bearer ").strip()


@lru_cache(maxsize=1)
def _jwks_client() -> "pyjwt.PyJWKClient | None":
    if not JWKS_URL:
        return None
    return pyjwt.PyJWKClient(JWKS_URL, cache_keys=True, lifespan=3600)


def _decode_with_jwks(token: str) -> dict:
    """Verify a Supabase ES256 JWT using the published JWKS."""
    client = _jwks_client()
    if client is None:
        raise pyjwt.InvalidTokenError("JWKS not configured")
    signing_key = client.get_signing_key_from_jwt(token).key
    return pyjwt.decode(
        token,
        signing_key,
        algorithms=["ES256", "RS256"],
        options={"verify_aud": False},
    )


def _decode_with_secret(token: str) -> dict:
    """Verify a legacy HS256 JWT using SUPABASE_JWT_SECRET."""
    return pyjwt.decode(
        token,
        SUPABASE_JWT_SECRET,
        algorithms=["HS256"],
        options={"verify_aud": False},
    )


def get_org_id(request: Request) -> str:
    """Extract org_id from a Supabase JWT.

    Tries JWKS verification first (modern projects). If the token's `alg` is
    HS256 we fall back to the legacy secret. With neither configured, returns
    a fixed demo org_id so the gateway stays usable for local dev.
    """
    token = _extract_token(request)

    # Stub mode — no real Supabase backing.
    if SUPABASE_JWT_SECRET == "stub-secret" and not JWKS_URL:
        return "org-demo-001"

    # Sniff the alg without verification to pick the right path.
    try:
        header = pyjwt.get_unverified_header(token)
    except pyjwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail=f"Malformed token: {exc}") from exc
    alg = header.get("alg", "")

    payload: dict | None = None
    last_err: Exception | None = None

    if alg in ("ES256", "RS256", "EdDSA") and JWKS_URL:
        try:
            payload = _decode_with_jwks(token)
        except Exception as exc:
            last_err = exc
            logger.warning("JWKS decode failed (alg=%s): %s", alg, exc)

    if payload is None and alg == "HS256" and SUPABASE_JWT_SECRET and SUPABASE_JWT_SECRET != "stub-secret":
        try:
            payload = _decode_with_secret(token)
        except Exception as exc:
            last_err = exc
            logger.warning("HS256 decode failed: %s", exc)

    if payload is None:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token (alg={alg}): {last_err}",
        )

    org_id: str | None = (payload.get("app_metadata") or {}).get("org_id")
    if not org_id:
        raise HTTPException(
            status_code=403,
            detail=(
                "Token has no app_metadata.org_id — enable the Custom Access Token Hook "
                "in Supabase Dashboard, then sign out and back in to refresh the JWT."
            ),
        )
    return org_id


OrgId = Annotated[str, Depends(get_org_id)]
