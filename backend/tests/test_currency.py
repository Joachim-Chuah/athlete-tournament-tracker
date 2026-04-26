import pytest
from backend.utils.currency import convert, format_money

RATES = {"USD": 1, "EUR": 0.92, "GBP": 0.79, "NGN": 1520}


def test_same_currency_returns_same():
    assert convert(100, "USD", "USD", RATES) == 100


def test_usd_to_eur():
    result = convert(100, "USD", "EUR", RATES)
    assert result == pytest.approx(92, rel=0.01)


def test_eur_to_gbp():
    result = convert(100, "EUR", "GBP", RATES)
    assert result == pytest.approx(85.87, rel=0.01)


def test_unknown_from_returns_none():
    assert convert(100, "XYZ", "USD", RATES) is None


def test_unknown_to_returns_none():
    assert convert(100, "USD", "XYZ", RATES) is None


def test_none_amount_returns_none():
    assert convert(None, "USD", "EUR", RATES) is None


def test_zero_returns_zero():
    assert convert(0, "USD", "EUR", RATES) == 0


def test_empty_rates_returns_none():
    assert convert(100, "USD", "EUR", {}) is None


def test_format_money_includes_currency():
    result = format_money(4800, "USD")
    assert "USD" in result
    assert "4,800" in result


def test_format_money_none_returns_dash():
    assert format_money(None, "USD") == "— USD"


def test_format_money_uppercases_currency():
    result = format_money(100, "usd")
    assert "USD" in result
