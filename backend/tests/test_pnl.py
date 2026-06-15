"""
Unit tests for backend/utils/pnl.py — single source of truth for P&L calculations.
Every subsidy type, edge case, and scenario must be covered here.
"""

import pytest
from backend.utils.pnl import calculate_pnl, calculate_runway, ROUND_ORDER

# ---------------------------------------------------------------------------
# Shared fixture — a realistic tournament with all fields populated
# ---------------------------------------------------------------------------

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

# total expenses = 1200 + 1400 + (150×7) + 600 + 200 + 250 = 4700
# total income base (no subsidy) = 500 sponsorship


# ---------------------------------------------------------------------------
# Scenarios
# ---------------------------------------------------------------------------

class TestScenarios:
    def test_always_returns_three_scenarios(self):
        result = calculate_pnl(BASE)
        assert len(result["scenarios"]) == 3

    def test_scenario_order(self):
        scenarios = [s["scenario"] for s in calculate_pnl(BASE)["scenarios"]]
        assert scenarios == ["worst", "realistic", "best"]

    def test_worst_case_uses_lowest_available_round(self):
        s = calculate_pnl(BASE)["scenarios"][0]
        assert s["round"] == "r1"
        assert s["prize_money"] == 500

    def test_best_case_uses_highest_available_round(self):
        s = calculate_pnl(BASE)["scenarios"][2]
        assert s["round"] == "w"
        assert s["prize_money"] == 25000

    def test_realistic_case_uses_middle_round(self):
        # available rounds: r1, qf, sf, w — middle index = 1 → qf
        s = calculate_pnl(BASE)["scenarios"][1]
        assert s["round"] == "qf"

    def test_net_result_formula(self):
        # net = prize + sponsorship - expenses
        s = calculate_pnl(BASE)["scenarios"][0]
        assert s["net_result"] == 500 + 500 - 4700

    def test_profitable_flag_true_when_positive(self):
        assert calculate_pnl(BASE)["scenarios"][2]["profitable"] is True

    def test_profitable_flag_false_when_negative(self):
        assert calculate_pnl(BASE)["scenarios"][0]["profitable"] is False

    def test_profitable_flag_true_at_exactly_zero(self):
        # craft a tournament where winner prize exactly covers expenses
        t = {**BASE, "prize_rounds": {"w": 4200}, "sponsorship_allocated": 500}
        # expenses = 4700, income_base = 500, need prize = 4200 to break even
        s = calculate_pnl(t)["scenarios"][0]
        assert s["net_result"] == 0
        assert s["profitable"] is True


# ---------------------------------------------------------------------------
# Prize tax withholding
# ---------------------------------------------------------------------------

class TestPrizeTax:
    def test_zero_rate_preserves_existing_results(self):
        without_tax_field = calculate_pnl(BASE)
        with_zero_tax = calculate_pnl({**BASE, "prize_tax_rate": 0})

        assert with_zero_tax == without_tax_field

    def test_thirty_percent_rate_returns_post_tax_prize_and_net(self):
        result = calculate_pnl({**BASE, "prize_tax_rate": 30})
        best = result["scenarios"][2]

        assert best["prize_money"] == 25000
        assert best["prize_money_after_tax"] == pytest.approx(17500)
        assert best["net_result"] == pytest.approx(17500 + 500 - 4700)

    def test_tax_can_flip_realistic_scenario_from_profit_to_loss(self):
        tournament = {
            **BASE,
            "prize_rounds": {"r1": 0, "qf": 5000, "w": 10000},
            "prize_tax_rate": 30,
        }

        realistic = calculate_pnl(tournament)["scenarios"][1]

        assert realistic["round"] == "qf"
        assert realistic["prize_money_after_tax"] == pytest.approx(3500)
        assert realistic["net_result"] == pytest.approx(-700)
        assert realistic["profitable"] is False


# ---------------------------------------------------------------------------
# Break-even round
# ---------------------------------------------------------------------------

class TestBreakEven:
    def test_break_even_identifies_first_profitable_round(self):
        # expenses=4700, sponsorship=500 → need prize >= 4200 → qf (4800) qualifies
        assert calculate_pnl(BASE)["break_even_round"] == "qf"

    def test_break_even_none_when_no_round_covers_expenses(self):
        t = {**BASE, "prize_rounds": {"r1": 100, "w": 200}, "sponsorship_allocated": 0}
        assert calculate_pnl(t)["break_even_round"] is None

    def test_break_even_is_r1_when_r1_already_covers_costs(self):
        cheap = {**BASE, "flight_cost": 0, "accommodation_total": 0, "coaching_cost": 0,
                 "misc_cost": 0, "entry_fee": 0, "daily_spending_cap": 0, "sponsorship_allocated": 0}
        assert calculate_pnl(cheap)["break_even_round"] == "r1"

    def test_tax_moves_break_even_to_a_later_round(self):
        tournament = {
            **BASE,
            "prize_rounds": {"r1": 1000, "qf": 4800, "sf": 7000, "w": 10000},
            "prize_tax_rate": 30,
        }

        assert calculate_pnl(tournament)["break_even_round"] == "sf"


# ---------------------------------------------------------------------------
# Total expenses
# ---------------------------------------------------------------------------

class TestExpenses:
    def test_total_expenses_baseline(self):
        result = calculate_pnl(BASE)
        assert result["total_expenses"] == 4700

    def test_daily_total_is_cap_times_days(self):
        t = {**BASE, "daily_spending_cap": 200, "duration_days": 5,
             "flight_cost": 0, "accommodation_total": 0, "coaching_cost": 0,
             "misc_cost": 0, "entry_fee": 0}
        assert calculate_pnl(t)["total_expenses"] == 1000

    def test_total_expenses_never_negative(self):
        t = {**BASE, "subsidy_amount": 999_999, "subsidy_covers": "full_expenses"}
        assert calculate_pnl(t)["total_expenses"] >= 0

    def test_zero_costs_gives_zero_expenses(self):
        t = {**BASE, "flight_cost": 0, "accommodation_total": 0, "coaching_cost": 0,
             "misc_cost": 0, "entry_fee": 0, "daily_spending_cap": 0}
        assert calculate_pnl(t)["total_expenses"] == 0


# ---------------------------------------------------------------------------
# Subsidy logic — each type tested independently
# ---------------------------------------------------------------------------

class TestSubsidyFlights:
    def test_reduces_flight_line_by_subsidy_amount(self):
        t = {**BASE, "subsidy_amount": 600, "subsidy_covers": "flights"}
        base_net = calculate_pnl(BASE)["scenarios"][0]["net_result"]
        subsidised_net = calculate_pnl(t)["scenarios"][0]["net_result"]
        assert subsidised_net == base_net + 600

    def test_flight_subsidy_cannot_make_flights_negative(self):
        t = {**BASE, "subsidy_amount": 9999, "subsidy_covers": "flights"}
        result = calculate_pnl(t)
        assert result["total_expenses"] >= 0


class TestSubsidyAccommodation:
    def test_reduces_accommodation_line_by_subsidy_amount(self):
        t = {**BASE, "subsidy_amount": 700, "subsidy_covers": "accommodation"}
        base_net = calculate_pnl(BASE)["scenarios"][0]["net_result"]
        subsidised_net = calculate_pnl(t)["scenarios"][0]["net_result"]
        assert subsidised_net == base_net + 700

    def test_accommodation_subsidy_cannot_make_line_negative(self):
        t = {**BASE, "subsidy_amount": 9999, "subsidy_covers": "accommodation"}
        assert calculate_pnl(t)["total_expenses"] >= 0


class TestSubsidyFullExpenses:
    def test_reduces_total_expenses_by_subsidy_amount(self):
        t = {**BASE, "subsidy_amount": 2000, "subsidy_covers": "full_expenses"}
        base_expenses = calculate_pnl(BASE)["total_expenses"]
        assert calculate_pnl(t)["total_expenses"] == max(0, base_expenses - 2000)

    def test_full_expenses_does_not_count_as_income(self):
        t = {**BASE, "subsidy_amount": 2000, "subsidy_covers": "full_expenses"}
        assert calculate_pnl(t)["total_income_base"] == BASE["sponsorship_allocated"]


class TestSubsidyFlatStipend:
    def test_flat_stipend_added_as_income_not_expense_reduction(self):
        t = {**BASE, "subsidy_amount": 1000, "subsidy_covers": "flat_stipend"}
        base_net = calculate_pnl(BASE)["scenarios"][0]["net_result"]
        assert calculate_pnl(t)["scenarios"][0]["net_result"] == base_net + 1000

    def test_flat_stipend_does_not_reduce_expenses(self):
        t = {**BASE, "subsidy_amount": 1000, "subsidy_covers": "flat_stipend"}
        base_expenses = calculate_pnl(BASE)["total_expenses"]
        assert calculate_pnl(t)["total_expenses"] == base_expenses

    def test_flat_stipend_appears_in_total_income_base(self):
        t = {**BASE, "subsidy_amount": 1000, "subsidy_covers": "flat_stipend"}
        assert calculate_pnl(t)["total_income_base"] == 500 + 1000


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------

class TestEdgeCases:
    def test_empty_prize_rounds_returns_empty_scenarios(self):
        result = calculate_pnl({**BASE, "prize_rounds": {}})
        assert result["scenarios"] == []
        assert result["break_even_round"] is None

    def test_none_prize_rounds_returns_empty_scenarios(self):
        result = calculate_pnl({**BASE, "prize_rounds": None})
        assert result["scenarios"] == []

    def test_single_round_all_three_scenarios_use_same_round(self):
        t = {**BASE, "prize_rounds": {"w": 50000}}
        result = calculate_pnl(t)
        assert len(result["scenarios"]) == 3
        assert all(s["round"] == "w" for s in result["scenarios"])

    def test_missing_fields_default_to_zero(self):
        minimal = {"prize_rounds": {"w": 10000}}
        result = calculate_pnl(minimal)
        assert result["total_expenses"] == 0
        assert result["scenarios"][0]["net_result"] == 10000

    def test_none_values_treated_as_zero(self):
        t = {**BASE, "flight_cost": None, "coaching_cost": None}
        result = calculate_pnl(t)
        assert result["total_expenses"] == 4700 - 1200 - 600

    def test_sponsorship_adds_to_every_scenario(self):
        no_sponsor = calculate_pnl({**BASE, "sponsorship_allocated": 0})
        with_sponsor = calculate_pnl({**BASE, "sponsorship_allocated": 1000})
        for i in range(3):
            diff = with_sponsor["scenarios"][i]["net_result"] - no_sponsor["scenarios"][i]["net_result"]
            assert diff == 1000

    def test_round_order_constant_is_correct(self):
        assert ROUND_ORDER == ["r1", "r2", "r3", "qf", "sf", "f", "w"]


# ---------------------------------------------------------------------------
# Runway calculator
# ---------------------------------------------------------------------------

class TestRunway:
    def test_basic_runway_calculation(self):
        assert calculate_runway(10_000, 2_000) == 5

    def test_floors_partial_tournaments(self):
        assert calculate_runway(5_000, 3_000) == 1

    def test_zero_spend_returns_none(self):
        assert calculate_runway(10_000, 0) is None

    def test_negative_spend_returns_none(self):
        assert calculate_runway(10_000, -500) is None

    def test_zero_savings_returns_zero(self):
        assert calculate_runway(0, 1_000) == 0

    def test_large_savings(self):
        assert calculate_runway(1_000_000, 5_000) == 200
