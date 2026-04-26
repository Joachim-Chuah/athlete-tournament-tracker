/**
 * Single source of truth for all P&L calculations.
 * All monetary values must be in the athlete's home currency before calling these functions.
 */

const ROUND_ORDER = ["r1", "r2", "r3", "qf", "sf", "f", "w"];

/**
 * @param {object} tournament - Tournament record
 * @param {object} tournament.prize_rounds - Prize money per round in home currency
 * @param {number} tournament.entry_fee
 * @param {number} tournament.flight_cost
 * @param {number} tournament.accommodation_total
 * @param {number} tournament.daily_spending_cap
 * @param {number} tournament.duration_days
 * @param {number} tournament.coaching_cost
 * @param {number} tournament.misc_cost
 * @param {number} tournament.subsidy_amount
 * @param {string|null} tournament.subsidy_covers
 * @param {number} tournament.sponsorship_allocated
 * @returns {{ total_expenses: number, total_income_base: number, scenarios: Array, break_even_round: string|null }}
 */
function calculatePnL(tournament) {
  const {
    prize_rounds = {},
    entry_fee = 0,
    flight_cost = 0,
    accommodation_total = 0,
    daily_spending_cap = 0,
    duration_days = 0,
    coaching_cost = 0,
    misc_cost = 0,
    subsidy_amount = 0,
    subsidy_covers = null,
    sponsorship_allocated = 0,
  } = tournament;

  const netFlights = subsidy_covers === "flights"
    ? Math.max(0, flight_cost - subsidy_amount)
    : flight_cost;

  const netAccommodation = subsidy_covers === "accommodation"
    ? Math.max(0, accommodation_total - subsidy_amount)
    : accommodation_total;

  const daily_total = daily_spending_cap * duration_days;

  const raw_expenses =
    netFlights +
    netAccommodation +
    daily_total +
    coaching_cost +
    entry_fee +
    misc_cost;

  let expenseReduction = 0;
  let subsidyIncome = 0;

  if (subsidy_covers === "full_expenses") {
    expenseReduction = subsidy_amount;
  } else if (subsidy_covers === "flat_stipend") {
    subsidyIncome = subsidy_amount;
  }

  const adjusted_expenses = Math.max(0, raw_expenses - expenseReduction);
  const total_income_base = sponsorship_allocated + subsidyIncome;

  const available_rounds = ROUND_ORDER.filter(
    (r) => prize_rounds[r] !== undefined && prize_rounds[r] !== null
  );

  if (available_rounds.length === 0) {
    return {
      total_expenses: adjusted_expenses,
      total_income_base,
      scenarios: [],
      break_even_round: null,
    };
  }

  const worst_round = available_rounds[0];
  const best_round = available_rounds[available_rounds.length - 1];
  const mid_index = Math.floor((available_rounds.length - 1) / 2);
  const realistic_round = available_rounds[mid_index];

  const scenario_rounds = [
    { scenario: "worst", round: worst_round },
    { scenario: "realistic", round: realistic_round },
    { scenario: "best", round: best_round },
  ];

  const scenarios = scenario_rounds.map(({ scenario, round }) => {
    const prize_money = prize_rounds[round] ?? 0;
    const net_result = prize_money + total_income_base - adjusted_expenses;
    return {
      scenario,
      round,
      prize_money,
      net_result,
      profitable: net_result >= 0,
    };
  });

  const break_even_round = available_rounds.find((r) => {
    const prize = prize_rounds[r] ?? 0;
    return prize + total_income_base >= adjusted_expenses;
  }) ?? null;

  return {
    total_expenses: adjusted_expenses,
    total_income_base,
    scenarios,
    break_even_round,
  };
}

/**
 * Calculate how many more tournaments an athlete can afford before savings run dry.
 * @param {number} savings_balance
 * @param {number} avg_net_spend - Average net loss per tournament (positive = losing money)
 * @returns {number|null} - Number of tournaments remaining, or null if profitable on average
 */
function calculateRunway(savings_balance, avg_net_spend) {
  if (avg_net_spend <= 0) return null;
  return Math.floor(savings_balance / avg_net_spend);
}

module.exports = { calculatePnL, calculateRunway, ROUND_ORDER };
