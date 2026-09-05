import React, { useState, useEffect } from 'react';
import { exchangeRateApi } from '../../api/exchangeRateApi.js';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { RefreshCw, DollarSign, Activity } from 'lucide-react';
import { CURRENCY_NAMES } from '../../utils/currency.js';

export function ExchangeRatesPage() {
  const [rates, setRates] = useState({});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const targetCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'SGD', 'AED'];

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  const fetchRates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await exchangeRateApi.getCachedRates();
      setRates(res.rates || res || {});
      
      try {
        const histRes = await exchangeRateApi.getRateHistory('USD');
        setHistory(Array.isArray(histRes) ? histRes.slice(0, 20) : (histRes.history || []).slice(0, 20));
      } catch (histErr) {
        console.error(histErr);
      }
    } catch (err) {
      setError(err.message || 'Failed to load exchange rates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleRefreshRates = async () => {
    setRefreshing(true);
    try {
      await exchangeRateApi.refreshRates();
      showFeedback('Exchange rates refreshed successfully.');
      await fetchRates();
    } catch (err) {
      alert(err.message || 'Error refreshing rates');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Exchange Rates</h1>
          <p className="text-[#2E3141]/70 mt-1">Manage system-wide currency exchange rates relative to INR.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="primary" 
            onClick={handleRefreshRates} 
            disabled={refreshing}
            icon={RefreshCw}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Rates'}
          </Button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-lg text-sm">{error}</div>}

      <div className="flex-1 overflow-auto space-y-6">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center text-[#2E3141]/50 gap-2">
            <RefreshCw className="animate-spin" size={24} />
            <span className="text-sm">Loading rates...</span>
          </div>
        ) : (
          <>
            <Card title="Current Exchange Rates (Base: INR)">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm mt-2">
                  <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                    <tr>
                      <th className="p-4">Target Currency</th>
                      <th className="p-4">Currency Name</th>
                      <th className="p-4 text-right">Rate (INR → X)</th>
                      <th className="p-4 text-center">Last Fetched</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/60">
                    {targetCurrencies.map(currency => (
                      <tr key={currency} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-4 font-bold text-[#111826]">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-[#724B66]" />
                            <span>{currency}</span>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-neutral-600">{CURRENCY_NAMES[currency] || currency}</td>
                        <td className="p-4 text-right font-mono font-semibold text-[#111826]">
                          {rates[currency] ? Number(rates[currency]).toFixed(4) : '—'}
                        </td>
                        <td className="p-4 text-center text-xs text-[#2E3141]/70">
                          {rates.lastUpdated ? new Date(rates.lastUpdated).toLocaleString() : 'Just now'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {history.length > 0 && (
              <Card title="Rate Change History (Recent)" subtitle="Last 20 updates for reference currency">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm mt-2">
                    <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                      <tr>
                        <th className="p-4">Date</th>
                        <th className="p-4">Currency</th>
                        <th className="p-4 text-right">Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200/60">
                      {history.map((entry, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50/50">
                          <td className="p-4 text-[#2E3141]/70 text-xs">
                            {new Date(entry.timestamp || entry.date).toLocaleString()}
                          </td>
                          <td className="p-4 font-bold text-[#111826]">{entry.currency}</td>
                          <td className="p-4 text-right font-mono">{Number(entry.rate).toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
