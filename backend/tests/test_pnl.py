import pytest
from backend.utils.pnl import calculate_pnl, calculate_runway

BASE = {
    "prize_rounds": {"r1": 500, "qf": 4800, "sf": 9000, "w": 25000},
    "entry_fee": 250,
    "flight_cost": 1200,
    "accommodation_total": 1400,
    "daily_spending_cap": 150,
    "duration_days": 7,
    "coaching_cost": 600,
    "misc_cost": 200,
    "subsidy_amount": 0,
    "subsidy_covers": None,
    "sponsorship_allocated": 500,
}


def test_three_scenarios():
    result = calculate_pnl(BASE)
    assert len(result["scenarios"]) == 3
    scenarios = [s["scenario"] for s in result["scenarios"]]
    assert scenarios == ["worst", "realistic", "best"]


def test_worst_uses_lowest_round():
    result = calculate_pnl(BASE)
    assert result["scenarios"][0]["round"] == "r1"
    assert result["scenarios"][0]["prize_money"] == 500


def test_best_uses_highest_round():
    result = calculate_pnl(BASE)
    assert result["scenarios"][2]["round"] == "w"
    assert result["scenarios"][2]["prize_money"] == 25000


def test_net_result_calculation():
    result = calculate_pnl(BASE)
    expenses = 1200 + 1400 + 150 * 7 + 600 + 200 + 250  # 4700
    income = 500 + 500  # prize r1 + sponsorship
    assert result["scenarios"][0]["net_result"] == income - expenses


def test_profitable_flag():
    result = calculate_pnl(BASE)
    assert result["scenarios"][0]["profitable"] is False
    assert result["scenarios"][2]["profitable"] is True


def test_break_even_round():
    result = calculate_pnl(BASE)
    # total_expenses = 4700, sponsorship = 500, need prize >= 4200 → QF = 4800
    assert result["break_even_round"] == "qf"


def test_flight_subsidy():
    t = {**BASE, "subsidy_amount": 600, "subsidy_covers": "flights"}
    result = calculate_pnl(t)
    base_result = calculate_pnl(BASE)
    assert result["scenarios"][0]["net_result"] == base_result["scenarios"][0]["net_result"] + 600


def test_flat_stipend_adds_as_income():
    t = {**BASE, "subsidy_amount": 1000, "subsidy_covers": "flat_stipend"}
    result = calculate_pnl(t)
    base_result = calculate_pnl(BASE)
    assert result["scenarios"][0]["net_result"] == base_result["scenarios"][0]["net_result"] + 1000


def test_full_expenses_reduces_total():
    t = {**BASE, "subsidy_amount": 2000, "subsidy_covers": "full_expenses"}
    result = calculate_pnl(t)
    base_result = calculate_pnl(BASE)
    assert result["total_expenses"] == max(0, base_result["total_expenses"] - 2000)


def test_empty_prize_rounds():
    result = calculate_pnl({**BASE, "prize_rounds": {}})
    assert result["scenarios"] == []
    assert result["break_even_round"] is None


def test_total_expenses_never_negative():
    t = {**BASE, "subsidy_amount": 999999, "subsidy_covers": "full_expenses"}
    result = calculate_pnl(t)
    assert result["total_expenses"] >= 0


class TestRunway:
    def test_basic(self):
        assert calculate_runway(10000, 2000) == 5

    def test_floors_partial(self):
        assert calculate_runway(5000, 3000) == 1

    def test_zero_spend_returns_none(self):
        assert calculate_runway(10000, 0) is None

    def test_negative_spend_returns_none(self):
        assert calculate_runway(10000, -500) is None
