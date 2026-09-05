import express from 'express';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';
import {
  fetchAndCacheRates,
  getRate,
  convertAmount,
  getAllCachedRates,
  getRateHistory
} from '../services/exchangeRate.service.js';

const router = express.Router();

router.use(authenticate);
router.use(resolveOrgContext);

// GET /api/exchange-rates/
router.get('/', async (req, res, next) => {
  try {
    const rates = await getAllCachedRates();
    res.json(rates);
  } catch (error) {
    next(error);
  }
});

// POST /api/exchange-rates/refresh
router.post('/refresh', requireRoles(['admin']), async (req, res, next) => {
  try {
    const rates = await fetchAndCacheRates();
    res.json({ message: 'Exchange rates refreshed successfully', rates });
  } catch (error) {
    next(error);
  }
});

// GET /api/exchange-rates/convert
router.get('/convert', async (req, res, next) => {
  try {
    const { amount, from, to } = req.query;
    
    if (!amount || !from || !to) {
      return res.status(400).json({ error: 'amount, from, and to query parameters are required' });
    }
    
    const converted = await convertAmount(amount, from, to);
    res.json({
      amount: parseFloat(amount),
      from,
      to,
      converted
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/exchange-rates/history
router.get('/history', async (req, res, next) => {
  try {
    const { currency, startDate, endDate } = req.query;
    
    if (!currency || !startDate || !endDate) {
      return res.status(400).json({ error: 'currency, startDate, and endDate query parameters are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const history = await getRateHistory(currency, start, end);
    res.json(history);
  } catch (error) {
    next(error);
  }
});

export default router;
