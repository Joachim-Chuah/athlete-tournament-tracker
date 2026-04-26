/**
 * Currency conversion utilities.
 * FX rates are always fetched server-side. Never call these from client components.
 */

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const rateCache = new Map();

/**
 * @param {string} base - Base currency code (e.g. "USD")
 * @returns {Promise<Record<string, number>>}
 */
async function fetchRates(base) {
  const cacheKey = base.toUpperCase();
  const cached = rateCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.rates;
  }

  const apiKey = process.env.OPEN_EXCHANGE_RATES_KEY;
  if (!apiKey) throw new Error("OPEN_EXCHANGE_RATES_KEY is not set");

  const res = await fetch(
    `https://openexchangerates.org/api/latest.json?app_id=${apiKey}&base=${cacheKey}`
  );

  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);

  const data = await res.json();
  rateCache.set(cacheKey, { rates: data.rates, timestamp: Date.now() });
  return data.rates;
}

/**
 * Convert an amount from one currency to another.
 * Returns null if either currency is unknown.
 * @param {number} amount
 * @param {string} from
 * @param {string} to
 * @param {Record<string, number>} rates - Rates relative to a common base
 * @returns {number|null}
 */
function convert(amount, from, to, rates) {
  if (amount === null || amount === undefined) return null;
  if (from === to) return amount;

  const fromRate = rates[from.toUpperCase()];
  const toRate = rates[to.toUpperCase()];

  if (!fromRate || !toRate) return null;

  return (amount / fromRate) * toRate;
}

/**
 * Format a monetary value with its currency code, always shown.
 * e.g. formatMoney(4800, "USD") → "$4,800 USD"
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
function formatMoney(amount, currency) {
  if (amount === null || amount === undefined) return `— ${currency}`;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(amount);
  return `${formatted} ${currency.toUpperCase()}`;
}

module.exports = { fetchRates, convert, formatMoney };
