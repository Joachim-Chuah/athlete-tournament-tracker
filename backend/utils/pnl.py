"""
Single source of truth for all P&L calculations.
Direct Python port of server/utils/pnl.js.
All monetary values must be in the athlete's home currency before calling.
"""

ROUND_ORDER = ["r1", "r2", "r3", "qf", "sf", "f", "w"]


def calculate_pnl(tournament: dict) -> dict:
    prize_rounds = tournament.get("prize_rounds") or {}
    entry_fee = tournament.get("entry_fee") or 0
    flight_cost = tournament.get("flight_cost") or 0
    accommodation_total = tournament.get("accommodation_total") or 0
    daily_spending_cap = tournament.get("daily_spending_cap") or 0
    duration_days = tournament.get("duration_days") or 0
    coaching_cost = tournament.get("coaching_cost") or 0
    misc_cost = tournament.get("misc_cost") or 0
    subsidy_amount = tournament.get("subsidy_amount") or 0
    subsidy_covers = tournament.get("subsidy_covers")
    sponsorship_allocated = tournament.get("sponsorship_allocated") or 0
    prize_tax_rate = tournament.get("prize_tax_rate") or 0

    net_flights = (
        max(0, flight_cost - subsidy_amount)
        if subsidy_covers == "flights"
        else flight_cost
    )
    net_accommodation = (
        max(0, accommodation_total - subsidy_amount)
        if subsidy_covers == "accommodation"
        else accommodation_total
    )

    daily_total = daily_spending_cap * duration_days

    raw_expenses = (
        net_flights + net_accommodation + daily_total + coaching_cost + entry_fee + misc_cost
    )

    expense_reduction = 0
    subsidy_income = 0
    if subsidy_covers == "full_expenses":
        expense_reduction = subsidy_amount
    elif subsidy_covers == "flat_stipend":
        subsidy_income = subsidy_amount

    adjusted_expenses = max(0, raw_expenses - expense_reduction)
    total_income_base = sponsorship_allocated + subsidy_income

    available_rounds = [r for r in ROUND_ORDER if prize_rounds.get(r) is not None]

    if not available_rounds:
        return {
            "total_expenses": adjusted_expenses,
            "total_income_base": total_income_base,
            "scenarios": [],
            "break_even_round": None,
        }

    worst_round = available_rounds[0]
    best_round = available_rounds[-1]
    mid_index = (len(available_rounds) - 1) // 2
    realistic_round = available_rounds[mid_index]

    def make_scenario(scenario: str, round_key: str) -> dict:
        prize_money = prize_rounds.get(round_key) or 0
        prize_money_after_tax = prize_money * (1 - prize_tax_rate / 100)
        net_result = prize_money_after_tax + total_income_base - adjusted_expenses
        return {
            "scenario": scenario,
            "round": round_key,
            "prize_money": prize_money,
            "prize_money_after_tax": prize_money_after_tax,
            "net_result": net_result,
            "profitable": net_result >= 0,
        }

    scenarios = [
        make_scenario("worst", worst_round),
        make_scenario("realistic", realistic_round),
        make_scenario("best", best_round),
    ]

    break_even_round = next(
        (
            r for r in available_rounds
            if (
                (prize_rounds.get(r) or 0) * (1 - prize_tax_rate / 100)
                + total_income_base
                >= adjusted_expenses
            )
        ),
        None,
    )

    return {
        "total_expenses": adjusted_expenses,
        "total_income_base": total_income_base,
        "scenarios": scenarios,
        "break_even_round": break_even_round,
    }


def calculate_runway(savings_balance: float, avg_net_spend: float):
    if avg_net_spend <= 0:
        return None
    return int(savings_balance / avg_net_spend)
