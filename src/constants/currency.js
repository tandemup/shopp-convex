// ./constants/currency.js

export const CURRENCIES = {
  EUR: {
    code: "EUR",
    symbol: "€",
    locale: "es-ES",
  },
  USD: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    locale: "en-GB",
  },
};

export const DEFAULT_CURRENCY = { ...CURRENCIES.EUR };
