import { ExchangeRate, ExchangeRateHistory } from '../models/index.js';
import { Op } from 'sequelize';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

export const fetchAndCacheRates = async () => {
  try {
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/INR`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rates. Status: ${response.status}`);
    }
    
    const data = await response.json();
    const rates = data.rates;
    const now = new Date();
    
    for (const currency of SUPPORTED_CURRENCIES) {
      if (rates[currency] !== undefined) {
        const rate = rates[currency];
        
        await ExchangeRate.upsert({
          base_currency: 'INR',
          target_currency: currency,
          rate: rate,
          fetched_at: now,
          source: 'exchangerate-api'
        });
        
        await ExchangeRateHistory.create({
          base_currency: 'INR',
          target_currency: currency,
          rate: rate,
          recorded_at: now
        });
      }
    }
    
    return await getAllCachedRates();
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return cached rates with a warning
    return await getAllCachedRates();
  }
};

export const getRate = async (targetCurrency) => {
  if (targetCurrency === 'INR') return 1.0;
  const rateRecord = await ExchangeRate.findOne({
    where: { base_currency: 'INR', target_currency: targetCurrency }
  });
  if (!rateRecord) throw new Error(`Rate not found for ${targetCurrency}`);
  return parseFloat(rateRecord.rate);
};

export const convertAmount = async (amount, fromCurrency, toCurrency) => {
  if (fromCurrency === toCurrency) return parseFloat(amount);
  
  const fromRate = await getRate(fromCurrency);
  const toRate = await getRate(toCurrency);
  
  // amount in INR = amount / fromRate
  // amount in toCurrency = amount in INR * toRate
  const amountInBase = amount / fromRate;
  const convertedAmount = amountInBase * toRate;
  
  return convertedAmount;
};

export const getAllCachedRates = async () => {
  return await ExchangeRate.findAll({ where: { base_currency: 'INR' } });
};

export const getRateHistory = async (targetCurrency, startDate, endDate) => {
  return await ExchangeRateHistory.findAll({
    where: {
      base_currency: 'INR',
      target_currency: targetCurrency,
      recorded_at: {
        [Op.between]: [startDate, endDate]
      }
    },
    order: [['recorded_at', 'ASC']]
  });
};
