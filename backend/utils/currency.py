"""
Currency conversion utilities.
FX rates always fetched server-side. Never expose the API key to the client.
Direct Python port of server/utils/currency.js.
"""

import os
import time
import requests

CACHE_TTL = 3600  # 1 hour

_rate_cache: dict[str, dict] = {}
_cache_timestamps: dict[str, float] = {}


def fetch_rates(base: str) -> dict:
    key = base.upper()
    now = time.time()

    if key in _rate_cache and now - _cache_timestamps.get(key, 0) < CACHE_TTL:
        return _rate_cache[key]

    api_key = os.environ.get("OPEN_EXCHANGE_RATES_KEY")
    if not api_key:
        raise RuntimeError("OPEN_EXCHANGE_RATES_KEY is not set")

    resp = requests.get(
        f"https://openexchangerates.org/api/latest.json",
        params={"app_id": api_key, "base": key},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()
    rates = data["rates"]

    _rate_cache[key] = rates
    _cache_timestamps[key] = now
    return rates


def convert(amount: float | None, from_: str, to: str, rates: dict) -> float | None:
    if amount is None:
        return None
    if from_.upper() == to.upper():
        return amount

    from_rate = rates.get(from_.upper())
    to_rate = rates.get(to.upper())

    if from_rate is None or to_rate is None:
        return None

    return (amount / from_rate) * to_rate


def format_money(amount: float | None, currency: str) -> str:
    if amount is None:
        return f"— {currency.upper()}"
    # Basic formatting — frontend handles locale-specific display
    return f"{amount:,.0f} {currency.upper()}"
