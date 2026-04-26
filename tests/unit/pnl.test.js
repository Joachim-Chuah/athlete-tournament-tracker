import { describe, it, expect } from "vitest";
import { calculatePnL, calculateRunway } from "../../src/server/utils/pnl.js";

const BASE = {
  prize_rounds: { r1: 500, qf: 4800, sf: 9000, w: 25000 },
  entry_fee: 250,
  flight_cost: 1200,
  accommodation_total: 1400,
  daily_spending_cap: 150,
  duration_days: 7,
  coaching_cost: 600,
  misc_cost: 200,
  subsidy_amount: 0,
  subsidy_covers: null,
  sponsorship_allocated: 500,
};

describe("calculatePnL", () => {
  it("calculates three scenarios (worst/realistic/best)", () => {
    const result = calculatePnL(BASE);
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0].scenario).toBe("worst");
    expect(result.scenarios[2].scenario).toBe("best");
  });

  it("worst case uses the lowest available round", () => {
    const result = calculatePnL(BASE);
    expect(result.scenarios[0].round).toBe("r1");
    expect(result.scenarios[0].prize_money).toBe(500);
  });

  it("best case uses the highest available round", () => {
    const result = calculatePnL(BASE);
    expect(result.scenarios[2].round).toBe("w");
    expect(result.scenarios[2].prize_money).toBe(25000);
  });

  it("net result = prize + sponsorship - expenses", () => {
    const result = calculatePnL(BASE);
    const expenses = 1200 + 1400 + 150 * 7 + 600 + 200 + 250; // 4700
    const income = 500 + 500; // prize r1 + sponsorship
    expect(result.scenarios[0].net_result).toBe(income - expenses);
  });

  it("identifies profitable scenarios correctly", () => {
    const result = calculatePnL(BASE);
    expect(result.scenarios[0].profitable).toBe(false); // R1 = loss
    expect(result.scenarios[2].profitable).toBe(true);  // Win = profit
  });

  it("calculates break-even round", () => {
    const result = calculatePnL(BASE);
    // total_expenses = 4700, sponsorship = 500, so need prize >= 4200
    // QF = 4800 → profitable
    expect(result.break_even_round).toBe("qf");
  });

  it("subtracts flight subsidy from flights line only", () => {
    const t = { ...BASE, subsidy_amount: 600, subsidy_covers: "flights" };
    const result = calculatePnL(t);
    // flights reduced by 600 → 600 cheaper
    const base_result = calculatePnL(BASE);
    expect(result.scenarios[0].net_result).toBe(base_result.scenarios[0].net_result + 600);
  });

  it("adds flat stipend as income, not expense reduction", () => {
    const t = { ...BASE, subsidy_amount: 1000, subsidy_covers: "flat_stipend" };
    const result = calculatePnL(t);
    const base_result = calculatePnL(BASE);
    expect(result.scenarios[0].net_result).toBe(base_result.scenarios[0].net_result + 1000);
  });

  it("full_expenses subsidy reduces total expenses", () => {
    const t = { ...BASE, subsidy_amount: 2000, subsidy_covers: "full_expenses" };
    const result = calculatePnL(t);
    const base_result = calculatePnL(BASE);
    expect(result.total_expenses).toBe(Math.max(0, base_result.total_expenses - 2000));
  });

  it("returns empty scenarios when no prize_rounds provided", () => {
    const result = calculatePnL({ ...BASE, prize_rounds: {} });
    expect(result.scenarios).toHaveLength(0);
    expect(result.break_even_round).toBeNull();
  });

  it("total_expenses is never negative", () => {
    const t = { ...BASE, subsidy_amount: 999999, subsidy_covers: "full_expenses" };
    const result = calculatePnL(t);
    expect(result.total_expenses).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateRunway", () => {
  it("returns number of tournaments athlete can afford", () => {
    expect(calculateRunway(10000, 2000)).toBe(5);
  });

  it("floors partial tournaments", () => {
    expect(calculateRunway(5000, 3000)).toBe(1);
  });

  it("returns null when avg_net_spend is 0 (profitable)", () => {
    expect(calculateRunway(10000, 0)).toBeNull();
  });

  it("returns null when avg_net_spend is negative (profitable)", () => {
    expect(calculateRunway(10000, -500)).toBeNull();
  });
});
