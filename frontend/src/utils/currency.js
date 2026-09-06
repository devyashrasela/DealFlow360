import { exchangeRateApi } from '../api/exchangeRateApi.js';

// Supported currencies with locale-aware formatting
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

export const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ',
};

export const CURRENCY_NAMES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee',
  JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar', AED: 'UAE Dirham',
};

// Hackathon fast global state
export let GLOBAL_CURRENCY = localStorage.getItem('dealflow_currency') || 'USD';

export function setGlobalCurrency(currency) {
  if (SUPPORTED_CURRENCIES.includes(currency)) {
    GLOBAL_CURRENCY = currency;
    localStorage.setItem('dealflow_currency', currency);
    window.dispatchEvent(new Event('currency_changed'));
  }
}

// Fallback rates if API fails (Base INR)
// i.e. 1 INR = X Target Currency
let LIVE_RATES = {
  INR: 1,
  USD: 0.012,
  EUR: 0.011,
  GBP: 0.0094,
  JPY: 1.81,
  AUD: 0.018,
  CAD: 0.016,
  SGD: 0.016,
  AED: 0.044,
};

// Initialize rates from the backend database silently
export async function initializeCurrencyRates() {
  try {
    const rates = await exchangeRateApi.getCachedRates();
    if (rates && Array.isArray(rates)) {
      const newRates = { INR: 1 };
      rates.forEach(r => {
        if (r.base_currency === 'INR' && r.target_currency) {
          newRates[r.target_currency] = parseFloat(r.rate);
        }
      });
      LIVE_RATES = { ...LIVE_RATES, ...newRates };
    }
  } catch (error) {
    console.error('Failed to load live exchange rates, using offline fallback', error);
  }
}
// Start initialization immediately
initializeCurrencyRates();

// Format a number as a currency string using the global currency state
export function formatCurrency(amount, currency = GLOBAL_CURRENCY) {
  const num = Number(amount);
  if (isNaN(num)) return '—';

  // The database and all mock metrics are primarily stored in USD.
  // LIVE_RATES holds rates relative to INR (e.g., 1 INR = 0.012 USD).
  // Step 1: Convert USD to INR (System Base)
  const usdToInrRate = LIVE_RATES.USD || 0.012;
  const valueInInr = num / usdToInrRate;

  // Step 2: Convert INR to Target View Currency
  const targetRate = LIVE_RATES[currency] || 1;
  const convertedAmount = valueInInr * targetRate;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(convertedAmount);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] || currency} ${convertedAmount.toFixed(2)}`;
  }
}

// Format as dual display
export function formatDualCurrency(baseAmount, txnAmount, txnCurrency) {
  if (!txnCurrency || txnCurrency === GLOBAL_CURRENCY) return formatCurrency(baseAmount);
  return `${formatCurrency(baseAmount)} (${formatCurrency(txnAmount, txnCurrency)})`;
}

// Convert base amount to transaction currency
export function convertFromBase(baseAmount, exchangeRate) {
  if (!exchangeRate || exchangeRate <= 0) return baseAmount;
  return Number((Number(baseAmount) * Number(exchangeRate)).toFixed(2));
}

// Convert transaction currency amount to base
export function convertToBase(txnAmount, exchangeRate) {
  if (!exchangeRate || exchangeRate <= 0) return txnAmount;
  return Number((Number(txnAmount) / Number(exchangeRate)).toFixed(2));
}
