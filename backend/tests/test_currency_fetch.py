"""
Tests for fetch_rates() in backend/utils/currency.py
Uses unittest.mock to avoid real HTTP requests and env-var requirements.
"""

import time
from unittest.mock import MagicMock, patch

import pytest

import backend.utils.currency as currency_mod
from backend.utils.currency import fetch_rates


@pytest.fixture(autouse=True)
def clear_cache():
    """Reset the module-level rate cache before each test."""
    currency_mod._rate_cache.clear()
    currency_mod._cache_timestamps.clear()
    yield
    currency_mod._rate_cache.clear()
    currency_mod._cache_timestamps.clear()


# ---------------------------------------------------------------------------
# Missing API key
# ---------------------------------------------------------------------------

class TestFetchRatesMissingKey:
    def test_raises_runtime_error_when_key_not_set(self, monkeypatch):
        monkeypatch.delenv("OPEN_EXCHANGE_RATES_KEY", raising=False)
        with pytest.raises(RuntimeError, match="OPEN_EXCHANGE_RATES_KEY"):
            fetch_rates("USD")


# ---------------------------------------------------------------------------
# HTTP errors
# ---------------------------------------------------------------------------

class TestFetchRatesHttpErrors:
    def test_raises_on_http_error(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = Exception("404 Not Found")
        with patch("backend.utils.currency.requests.get", return_value=mock_resp):
            with pytest.raises(Exception):
                fetch_rates("USD")

    def test_raises_on_connection_error(self, monkeypatch):
        import requests as req
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        with patch("backend.utils.currency.requests.get",
                   side_effect=req.exceptions.ConnectionError("unreachable")):
            with pytest.raises(req.exceptions.ConnectionError):
                fetch_rates("USD")


# ---------------------------------------------------------------------------
# Successful fetch
# ---------------------------------------------------------------------------

class TestFetchRatesSuccess:
    MOCK_RATES = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79}

    def _mock_get(self, rates=None):
        rates = rates or self.MOCK_RATES
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {"rates": rates}
        return mock_resp

    def test_returns_rates_dict(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        with patch("backend.utils.currency.requests.get", return_value=self._mock_get()):
            result = fetch_rates("USD")
        assert result == self.MOCK_RATES

    def test_passes_api_key_and_base_to_request(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "my-key")
        mock_get = MagicMock(return_value=self._mock_get())
        with patch("backend.utils.currency.requests.get", mock_get):
            fetch_rates("EUR")
        call_kwargs = mock_get.call_args
        params = call_kwargs[1]["params"]
        assert params["app_id"] == "my-key"
        assert params["base"] == "EUR"

    def test_normalises_base_to_uppercase(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        mock_get = MagicMock(return_value=self._mock_get())
        with patch("backend.utils.currency.requests.get", mock_get):
            fetch_rates("usd")
        assert mock_get.call_args[1]["params"]["base"] == "USD"


# ---------------------------------------------------------------------------
# Caching
# ---------------------------------------------------------------------------

class TestFetchRatesCaching:
    MOCK_RATES = {"USD": 1.0, "EUR": 0.92}

    def _mock_get(self):
        mock_resp = MagicMock()
        mock_resp.raise_for_status.return_value = None
        mock_resp.json.return_value = {"rates": self.MOCK_RATES}
        return mock_resp

    def test_second_call_uses_cache(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        mock_get = MagicMock(return_value=self._mock_get())
        with patch("backend.utils.currency.requests.get", mock_get):
            fetch_rates("USD")
            fetch_rates("USD")
        assert mock_get.call_count == 1

    def test_expired_cache_refetches(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        mock_get = MagicMock(return_value=self._mock_get())
        with patch("backend.utils.currency.requests.get", mock_get):
            fetch_rates("USD")
            # Expire the cache entry
            currency_mod._cache_timestamps["USD"] = time.time() - currency_mod.CACHE_TTL - 1
            fetch_rates("USD")
        assert mock_get.call_count == 2

    def test_different_base_currencies_cached_separately(self, monkeypatch):
        monkeypatch.setenv("OPEN_EXCHANGE_RATES_KEY", "test-key")
        mock_get = MagicMock(return_value=self._mock_get())
        with patch("backend.utils.currency.requests.get", mock_get):
            fetch_rates("USD")
            fetch_rates("EUR")
        assert mock_get.call_count == 2
