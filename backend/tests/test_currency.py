"""
Unit tests for backend/utils/currency.py
Covers conversion logic, edge cases, and formatting.
fetch_rates() is not tested here as it requires a live API key.
"""

import pytest
from backend.utils.currency import convert, format_money

# ---------------------------------------------------------------------------
# Shared rate table
# ---------------------------------------------------------------------------

RATES = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79, "NGN": 1520.0, "JPY": 149.5}


# ---------------------------------------------------------------------------
# convert()
# ---------------------------------------------------------------------------

class TestConvert:
    def test_same_currency_returns_identical_amount(self):
        assert convert(100, "USD", "USD", RATES) == 100

    def test_same_currency_case_insensitive(self):
        assert convert(100, "usd", "USD", RATES) == 100
        assert convert(100, "USD", "usd", RATES) == 100

    def test_usd_to_eur(self):
        assert convert(100, "USD", "EUR", RATES) == pytest.approx(92.0, rel=0.01)

    def test_eur_to_usd(self):
        assert convert(92, "EUR", "USD", RATES) == pytest.approx(100.0, rel=0.01)

    def test_eur_to_gbp(self):
        assert convert(100, "EUR", "GBP", RATES) == pytest.approx(85.87, rel=0.01)

    def test_usd_to_ngn(self):
        assert convert(1, "USD", "NGN", RATES) == pytest.approx(1520.0, rel=0.01)

    def test_gbp_to_jpy(self):
        result = convert(100, "GBP", "JPY", RATES)
        assert result == pytest.approx(100 / 0.79 * 149.5, rel=0.01)

    def test_unknown_from_currency_returns_none(self):
        assert convert(100, "XYZ", "USD", RATES) is None

    def test_unknown_to_currency_returns_none(self):
        assert convert(100, "USD", "XYZ", RATES) is None

    def test_both_unknown_returns_none(self):
        assert convert(100, "AAA", "BBB", RATES) is None

    def test_none_amount_returns_none(self):
        assert convert(None, "USD", "EUR", RATES) is None

    def test_zero_amount_returns_zero(self):
        assert convert(0, "USD", "EUR", RATES) == 0

    def test_empty_rates_dict_returns_none(self):
        assert convert(100, "USD", "EUR", {}) is None

    def test_negative_amount_converts_correctly(self):
        result = convert(-100, "USD", "EUR", RATES)
        assert result == pytest.approx(-92.0, rel=0.01)

    def test_large_amount_precision(self):
        result = convert(1_000_000, "USD", "EUR", RATES)
        assert result == pytest.approx(920_000.0, rel=0.01)

    def test_fractional_amount(self):
        result = convert(0.5, "USD", "EUR", RATES)
        assert result == pytest.approx(0.46, rel=0.01)


# ---------------------------------------------------------------------------
# format_money()
# ---------------------------------------------------------------------------

class TestFormatMoney:
    def test_always_includes_currency_code(self):
        assert "USD" in format_money(4800, "USD")

    def test_includes_formatted_number(self):
        assert "4,800" in format_money(4800, "USD")

    def test_none_amount_returns_dash_placeholder(self):
        assert format_money(None, "USD") == "— USD"

    def test_lowercase_currency_is_uppercased(self):
        result = format_money(100, "usd")
        assert "USD" in result
        assert "usd" not in result

    def test_zero_amount_formats_correctly(self):
        result = format_money(0, "EUR")
        assert "EUR" in result
        assert "0" in result

    def test_large_amounts_use_comma_separator(self):
        result = format_money(1_000_000, "USD")
        assert "1,000,000" in result

    def test_ngn_currency_code_preserved(self):
        result = format_money(7_200_000, "NGN")
        assert "NGN" in result
