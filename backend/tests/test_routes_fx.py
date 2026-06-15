"""
HTTP-level tests for GET /api/fx
"""

from unittest.mock import patch

import pytest

from backend.tests.conftest import FAKE_IDENTITY

RATES = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79}


def _get(client, auth_headers, params):
    return client.get("/api/fx", query_string=params, headers=auth_headers)


# ---------------------------------------------------------------------------
# Auth guard
# ---------------------------------------------------------------------------

class TestFxAuth:
    def test_no_token_returns_401(self, client):
        r = client.get("/api/fx?from=USD&to=EUR&amount=100")
        assert r.status_code == 401

    def test_bad_token_returns_401(self, client):
        r = client.get("/api/fx?from=USD&to=EUR&amount=100",
                       headers={"Authorization": "Bearer bad"})
        assert r.status_code == 401


# ---------------------------------------------------------------------------
# Input validation
# ---------------------------------------------------------------------------

class TestFxValidation:
    def test_missing_from_and_to_returns_400(self, client, mock_auth, auth_headers):
        r = _get(client, auth_headers, {"amount": "100"})
        assert r.status_code == 400
        assert "required" in r.get_json()["error"].lower()

    def test_missing_from_returns_400(self, client, mock_auth, auth_headers):
        r = _get(client, auth_headers, {"to": "EUR", "amount": "100"})
        assert r.status_code == 400

    def test_missing_to_returns_400(self, client, mock_auth, auth_headers):
        r = _get(client, auth_headers, {"from": "USD", "amount": "100"})
        assert r.status_code == 400

    def test_invalid_amount_returns_400(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "notanumber"})
        assert r.status_code == 400
        assert "number" in r.get_json()["error"].lower()

    def test_unknown_currency_returns_400(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "XYZ", "amount": "100"})
        assert r.status_code == 400
        assert "Unknown" in r.get_json()["error"]


# ---------------------------------------------------------------------------
# FX service failures
# ---------------------------------------------------------------------------

class TestFxServiceFailures:
    def test_missing_api_key_returns_503(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", side_effect=RuntimeError("key not set")):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "100"})
        assert r.status_code == 503
        assert "unavailable" in r.get_json()["error"].lower()

    def test_network_error_returns_503(self, client, mock_auth, auth_headers):
        import requests as req_lib
        with patch("backend.routes.fx.fetch_rates", side_effect=req_lib.exceptions.ConnectionError):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "100"})
        assert r.status_code == 503


# ---------------------------------------------------------------------------
# Successful conversion
# ---------------------------------------------------------------------------

class TestFxSuccess:
    def test_usd_to_eur_returns_200(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "100"})
        assert r.status_code == 200

    def test_response_includes_all_fields(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "100"})
        data = r.get_json()
        assert data["from"] == "USD"
        assert data["to"] == "EUR"
        assert data["amount"] == 100.0
        assert abs(data["converted"] - 92.0) < 0.01

    def test_currency_codes_uppercased(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "usd", "to": "eur", "amount": "50"})
        data = r.get_json()
        assert data["from"] == "USD"
        assert data["to"] == "EUR"

    def test_default_amount_is_one(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR"})
        assert r.status_code == 200
        data = r.get_json()
        assert data["amount"] == 1.0

    def test_rate_field_equals_converted_over_amount(self, client, mock_auth, auth_headers):
        with patch("backend.routes.fx.fetch_rates", return_value=RATES):
            r = _get(client, auth_headers, {"from": "USD", "to": "EUR", "amount": "200"})
        data = r.get_json()
        assert abs(data["rate"] - data["converted"] / data["amount"]) < 0.0001
