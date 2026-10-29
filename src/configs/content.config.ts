export const BOT_NAME = "Botify Booster";

export const CONTACT_URL = "https://t.me/botify";

export const BOOST_PAYMENT_CURRENCIES = ["BTC", "SOL", "ETH"] as const;

/**
 * Unit price in USD (e.g., 0.9 for $0.90 per boost).
 * Set to `null` when pricing is un configured.
 */
export const BOOST_PRICE_PER_UNIT_USD: number = 0.9;

export const MIN_BOOST_QUANTITY = 10;
export const MAX_BOOST_QUANTITY = 10_000;

/** 10-minute payment window in milliseconds. */
export const BOOST_INVOICE_TTL_MS = 10 * 60 * 1000;
