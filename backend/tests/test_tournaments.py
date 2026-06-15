import pytest

from backend.routes.tournaments import (
    TournamentFieldError,
    coerce_tournament_fields,
    parse_tournament_date,
)


def test_coerce_tournament_fields_converts_present_numeric_fields():
    result = coerce_tournament_fields({
        "entry_fee": "125.50",
        "flight_cost": 900,
        "sponsorship_allocated": "",
        "prize_tax_rate": "30",
        "duration_days": "7",
    })

    assert result == {
        "entry_fee": 125.5,
        "flight_cost": 900.0,
        "sponsorship_allocated": 0.0,
        "prize_tax_rate": 30.0,
        "duration_days": 7,
    }


def test_coerce_tournament_fields_keeps_partial_update_semantics():
    result = coerce_tournament_fields({
        "name": "World Open",
        "misc_cost": "40",
    })

    assert result == {
        "misc_cost": 40.0,
        "name": "World Open",
    }


def test_coerce_tournament_fields_rejects_negative_money():
    with pytest.raises(TournamentFieldError, match="entry_fee"):
        coerce_tournament_fields({"entry_fee": "-1"})


@pytest.mark.parametrize("value", ["nan", "inf", "-inf"])
def test_coerce_tournament_fields_rejects_non_finite_money(value):
    with pytest.raises(TournamentFieldError, match="entry_fee must be a finite number"):
        coerce_tournament_fields({"entry_fee": value})


@pytest.mark.parametrize("rate", [0, 100, "30.5"])
def test_coerce_tournament_fields_accepts_valid_prize_tax_rate(rate):
    result = coerce_tournament_fields({"prize_tax_rate": rate})

    assert result["prize_tax_rate"] == float(rate)


@pytest.mark.parametrize("rate", [-1, 100.01, "nan", "inf", "-inf"])
def test_coerce_tournament_fields_rejects_out_of_range_prize_tax_rate(rate):
    with pytest.raises(
        TournamentFieldError,
        match="prize_tax_rate must be between 0 and 100",
    ):
        coerce_tournament_fields({"prize_tax_rate": rate})


def test_coerce_tournament_fields_rejects_non_numeric_prize_tax_rate():
    with pytest.raises(TournamentFieldError, match="prize_tax_rate must be a number"):
        coerce_tournament_fields({"prize_tax_rate": "not-a-rate"})


def test_coerce_tournament_fields_coerces_prize_round_values():
    result = coerce_tournament_fields({
        "prize_rounds": {"r1": "500", "qf": 2500, "w": None},
    })

    assert result["prize_rounds"] == {"r1": 500.0, "qf": 2500.0}


def test_coerce_tournament_fields_rejects_negative_prize_round():
    with pytest.raises(TournamentFieldError, match="prize_rounds.r1"):
        coerce_tournament_fields({"prize_rounds": {"r1": "-25"}})


def test_coerce_tournament_fields_rejects_non_finite_prize_round():
    with pytest.raises(
        TournamentFieldError,
        match=r"prize_rounds\.r1 must be a finite number",
    ):
        coerce_tournament_fields({"prize_rounds": {"r1": "nan"}})


def test_coerce_tournament_fields_rejects_unknown_prize_round():
    with pytest.raises(TournamentFieldError, match="invalid prize round"):
        coerce_tournament_fields({"prize_rounds": {"bronze": 100}})


def test_coerce_tournament_fields_rejects_invalid_duration_days():
    with pytest.raises(TournamentFieldError, match="duration_days"):
        coerce_tournament_fields({"duration_days": "0"})

    with pytest.raises(TournamentFieldError, match="duration_days"):
        coerce_tournament_fields({"duration_days": "-2"})


def test_coerce_tournament_fields_passes_non_money_fields_through():
    result = coerce_tournament_fields({
        "location": "Toronto",
        "country": "Canada",
        "currency": "CAD",
        "subsidy_by": "Federation",
        "subsidy_covers": "flights",
    })

    assert result == {
        "location": "Toronto",
        "country": "Canada",
        "currency": "CAD",
        "subsidy_by": "Federation",
        "subsidy_covers": "flights",
    }


def test_parse_tournament_date_accepts_iso_date():
    result = parse_tournament_date("start_date", "2026-01-15")

    assert result.year == 2026
    assert result.month == 1
    assert result.day == 15


def test_parse_tournament_date_rejects_invalid_date():
    with pytest.raises(TournamentFieldError, match="start_date"):
        parse_tournament_date("start_date", "not-a-date")


def test_coerce_prize_rounds_returns_empty_for_none():
    result = coerce_tournament_fields({"prize_rounds": None})
    assert result["prize_rounds"] == {}


def test_coerce_prize_rounds_rejects_non_dict_value():
    with pytest.raises(TournamentFieldError, match="prize_rounds must be an object"):
        coerce_tournament_fields({"prize_rounds": "r1:500"})
