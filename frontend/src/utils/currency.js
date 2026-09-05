// Supported currencies with locale-aware formatting
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

const CURRENCY_SYMBOLS = {
  USD: '$', EUR: '€', GBP: '£', INR: '₹', JPY: '¥',
  AUD: 'A$', CAD: 'C$', SGD: 'S$', AED: 'د.إ',
};

const CURRENCY_NAMES = {
  USD: 'US Dollar', EUR: 'Euro', GBP: 'British Pound', INR: 'Indian Rupee',
  JPY: 'Japanese Yen', AUD: 'Australian Dollar', CAD: 'Canadian Dollar',
  SGD: 'Singapore Dollar', AED: 'UAE Dirham',
};

// Format monetary value with currency symbol
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount);
  if (isNaN(num)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(num);
  } catch {
    return `${CURRENCY_SYMBOLS[currency] || currency} ${num.toFixed(2)}`;
  }
}

// Format as dual display: "₹83,000.00 (€1,000.00)"
export function formatDualCurrency(baseAmount, txnAmount, txnCurrency) {
  if (!txnCurrency || txnCurrency === 'INR') return formatCurrency(baseAmount, 'INR');
  return `${formatCurrency(baseAmount, 'INR')} (${formatCurrency(txnAmount, txnCurrency)})`;
}

// Convert base INR amount to transaction currency
export function convertFromBase(baseAmount, exchangeRate) {
  if (!exchangeRate || exchangeRate <= 0) return baseAmount;
  return Number((Number(baseAmount) * Number(exchangeRate)).toFixed(2));
}

// Convert transaction currency amount to base INR
export function convertToBase(txnAmount, exchangeRate) {
  if (!exchangeRate || exchangeRate <= 0) return txnAmount;
  return Number((Number(txnAmount) / Number(exchangeRate)).toFixed(2));
}

export { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES };
