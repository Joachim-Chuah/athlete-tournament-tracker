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
        "duration_days": "7",
    })

    assert result == {
        "entry_fee": 125.5,
        "flight_cost": 900.0,
        "sponsorship_allocated": 0.0,
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


def test_coerce_tournament_fields_coerces_prize_round_values():
    result = coerce_tournament_fields({
        "prize_rounds": {"r1": "500", "qf": 2500, "w": None},
    })

    assert result["prize_rounds"] == {"r1": 500.0, "qf": 2500.0}


def test_coerce_tournament_fields_rejects_negative_prize_round():
    with pytest.raises(TournamentFieldError, match="prize_rounds.r1"):
        coerce_tournament_fields({"prize_rounds": {"r1": "-25"}})


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
