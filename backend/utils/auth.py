"""
Supabase JWT verification.

Tokens are signed asymmetrically (ES256/RS256). We fetch the project's public
keys from the Supabase JWKS endpoint and verify the signature, expiry, and
audience locally. The signing-key lookup is the only network seam — it is
injectable via ``get_key`` so the verification logic can be unit-tested offline.
"""

import os
import jwt
from jwt import PyJWKClient

ALGORITHMS = ("ES256", "RS256")
AUDIENCE = "authenticated"


class AuthError(Exception):
    """Raised when a request token is missing or invalid. Carries an HTTP status."""

    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.message = message
        self.status = status


def decode_token(token: str, signing_key, *, algorithms=ALGORITHMS) -> dict:
    """Verify signature, expiry, and audience against a known key. Pure — no network.

    Raises a jwt.PyJWTError subclass on any validation failure.
    """
    return jwt.decode(
        token,
        signing_key,
        algorithms=list(algorithms),
        audience=AUDIENCE,
        options={"require": ["sub", "exp"]},
    )


_jwk_client: PyJWKClient | None = None


def _jwks_url() -> str:
    url = os.environ.get("SUPABASE_JWKS_URL")
    if url:
        return url
    base = os.environ.get("SUPABASE_URL")
    if not base:
        raise RuntimeError("SUPABASE_URL (or SUPABASE_JWKS_URL) is not set")
    return f"{base.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _resolve_signing_key(token: str):
    """Look up the public key for a token's `kid` via the cached JWKS client."""
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(_jwks_url())
    return _jwk_client.get_signing_key_from_jwt(token).key


def verify_token(token: str | None, *, get_key=_resolve_signing_key) -> dict:
    """Verify a bearer token and return {"user_id", "email", "claims"}.

    Raises AuthError (with an HTTP status) on any problem.
    """
    if not token:
        raise AuthError("missing token")

    try:
        signing_key = get_key(token)
        claims = decode_token(token, signing_key)
    except AuthError:
        raise
    except jwt.ExpiredSignatureError as e:
        raise AuthError("token expired") from e
    except jwt.PyJWKClientConnectionError as e:
        # Can't reach the JWKS endpoint — an upstream outage, not a bad token.
        # 503 keeps the client from treating this as an expired session.
        raise AuthError("auth key service unavailable", status=503) from e
    except jwt.PyJWTError as e:
        raise AuthError("invalid token") from e
    except Exception as e:  # other key-resolution failures (e.g. unknown kid)
        raise AuthError("invalid token") from e

    sub = claims.get("sub")
    if not sub:
        raise AuthError("token missing sub")

    return {"user_id": sub, "email": claims.get("email"), "claims": claims}
