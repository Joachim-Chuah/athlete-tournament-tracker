import { describe, it, expect } from "vitest";
import { convert, formatMoney } from "../../src/server/utils/currency.js";

const RATES = { USD: 1, EUR: 0.92, GBP: 0.79, NGN: 1520 };

describe("convert", () => {
  it("returns same amount when from === to", () => {
    expect(convert(100, "USD", "USD", RATES)).toBe(100);
  });

  it("converts USD to EUR correctly", () => {
    const result = convert(100, "USD", "EUR", RATES);
    expect(result).toBeCloseTo(92, 1);
  });

  it("converts EUR to GBP correctly", () => {
    const result = convert(100, "EUR", "GBP", RATES);
    expect(result).toBeCloseTo(85.87, 1);
  });

  it("returns null for unknown from currency", () => {
    expect(convert(100, "XYZ", "USD", RATES)).toBeNull();
  });

  it("returns null for unknown to currency", () => {
    expect(convert(100, "USD", "XYZ", RATES)).toBeNull();
  });

  it("returns null when amount is null", () => {
    expect(convert(null, "USD", "EUR", RATES)).toBeNull();
  });

  it("returns null when amount is undefined", () => {
    expect(convert(undefined, "USD", "EUR", RATES)).toBeNull();
  });

  it("handles zero correctly", () => {
    expect(convert(0, "USD", "EUR", RATES)).toBe(0);
  });

  it("handles empty rates object", () => {
    expect(convert(100, "USD", "EUR", {})).toBeNull();
  });
});

describe("formatMoney", () => {
  it("includes the currency code in the output", () => {
    const result = formatMoney(4800, "USD");
    expect(result).toContain("USD");
  });

  it("formats correctly for USD", () => {
    const result = formatMoney(4800, "USD");
    expect(result).toContain("4,800");
  });

  it("returns fallback when amount is null", () => {
    const result = formatMoney(null, "USD");
    expect(result).toBe("— USD");
  });

  it("returns fallback when amount is undefined", () => {
    const result = formatMoney(undefined, "EUR");
    expect(result).toBe("— EUR");
  });

  it("uppercases the currency code", () => {
    const result = formatMoney(100, "usd");
    expect(result).toContain("USD");
  });
});
