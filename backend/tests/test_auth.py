"""
Network-free tests for Supabase JWT verification.

We generate an EC P-256 keypair locally, sign tokens with it (ES256 — the
Supabase asymmetric default), and verify them with the public key. The JWKS
network lookup is bypassed by injecting ``get_key`` into ``verify_token``.
"""

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import ec

from backend.utils import auth
from backend.utils.auth import AuthError, decode_token, verify_token


@pytest.fixture(scope="module")
def keys():
    private_key = ec.generate_private_key(ec.SECP256R1())
    return private_key, private_key.public_key()


def make_token(private_key, *, sub="user-123", email="a@b.com",
               aud="authenticated", exp_delta=timedelta(hours=1), include_sub=True):
    now = datetime.now(timezone.utc)
    payload = {
        "email": email,
        "aud": aud,
        "iat": now,
        "exp": now + exp_delta,
    }
    if include_sub:
        payload["sub"] = sub
    return jwt.encode(payload, private_key, algorithm="ES256")


def test_valid_token_decodes(keys):
    private_key, public_key = keys
    token = make_token(private_key)
    claims = decode_token(token, public_key)
    assert claims["sub"] == "user-123"
    assert claims["email"] == "a@b.com"


def test_verify_token_returns_identity(keys):
    private_key, public_key = keys
    token = make_token(private_key, sub="abc", email="x@y.com")
    identity = verify_token(token, get_key=lambda _t: public_key)
    assert identity["user_id"] == "abc"
    assert identity["email"] == "x@y.com"
    assert identity["claims"]["aud"] == "authenticated"


def test_missing_token_rejected(keys):
    _, public_key = keys
    for empty in (None, ""):
        with pytest.raises(AuthError) as exc:
            verify_token(empty, get_key=lambda _t: public_key)
        assert exc.value.message == "missing token"
        assert exc.value.status == 401


def test_expired_token_rejected(keys):
    private_key, public_key = keys
    token = make_token(private_key, exp_delta=timedelta(hours=-1))
    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=lambda _t: public_key)
    assert exc.value.message == "token expired"


def test_tampered_signature_rejected(keys):
    private_key, _ = keys
    token = make_token(private_key)
    other_public = ec.generate_private_key(ec.SECP256R1()).public_key()
    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=lambda _t: other_public)
    assert exc.value.message == "invalid token"


def test_wrong_audience_rejected(keys):
    private_key, public_key = keys
    token = make_token(private_key, aud="anon")
    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=lambda _t: public_key)
    assert exc.value.message == "invalid token"


def test_missing_sub_claim_rejected(keys):
    private_key, public_key = keys
    token = make_token(private_key, include_sub=False)
    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=lambda _t: public_key)
    # 'require' enforces presence, so decode fails before our explicit check
    assert exc.value.message == "invalid token"


def test_empty_sub_rejected(keys):
    private_key, public_key = keys
    token = make_token(private_key, sub="")
    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=lambda _t: public_key)
    assert exc.value.message == "token missing sub"


def test_key_lookup_failure_rejected(keys):
    private_key, _ = keys
    token = make_token(private_key)

    def boom(_t):
        raise ValueError("no matching kid")

    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=boom)
    assert exc.value.message == "invalid token"


def test_jwks_connection_failure_returns_503(keys):
    private_key, _ = keys
    token = make_token(private_key)

    def unreachable(_t):
        raise jwt.PyJWKClientConnectionError("cannot reach JWKS endpoint")

    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=unreachable)
    # Upstream outage, not a bad token — must not be mapped to 401.
    assert exc.value.status == 503
    assert exc.value.message == "auth key service unavailable"


def test_auth_error_from_get_key_is_reraised(keys):
    private_key, _ = keys
    token = make_token(private_key)

    def boom(_t):
        raise AuthError("custom", status=403)

    with pytest.raises(AuthError) as exc:
        verify_token(token, get_key=boom)
    # Original AuthError (and its status) survives — not remapped to 401/invalid.
    assert exc.value.message == "custom"
    assert exc.value.status == 403


def test_jwks_url_explicit_override(monkeypatch):
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://example.com/jwks.json")
    assert auth._jwks_url() == "https://example.com/jwks.json"


def test_jwks_url_derived_from_supabase_url(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWKS_URL", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://abc.supabase.co/")
    assert auth._jwks_url() == "https://abc.supabase.co/auth/v1/.well-known/jwks.json"


def test_jwks_url_missing_config_raises(monkeypatch):
    monkeypatch.delenv("SUPABASE_JWKS_URL", raising=False)
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    with pytest.raises(RuntimeError):
        auth._jwks_url()


def test_resolve_signing_key_uses_jwks_client(monkeypatch):
    sentinel = object()

    class FakeSigningKey:
        key = sentinel

    class FakeClient:
        def __init__(self, url):
            self.url = url

        def get_signing_key_from_jwt(self, token):
            return FakeSigningKey()

    monkeypatch.setattr(auth, "PyJWKClient", FakeClient)
    monkeypatch.setattr(auth, "_jwk_client", None)
    monkeypatch.setenv("SUPABASE_JWKS_URL", "https://example.com/jwks.json")

    assert auth._resolve_signing_key("any.token.here") is sentinel
    # client is cached after first use
    assert isinstance(auth._jwk_client, FakeClient)
