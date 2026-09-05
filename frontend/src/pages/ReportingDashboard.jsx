import React, { useState, useEffect } from 'react';
import { reportingApi } from '../api/reportingApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';

export function ReportingDashboard() {
  const [kpis, setKpis] = useState(null);
  const [pipelineByStage, setPipelineByStage] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pipeline');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [kpiData, pipelineData, revenueData] = await Promise.all([
        reportingApi.getKpis(),
        reportingApi.getPipelineByStage(),
        reportingApi.getRevenueByMonth(),
      ]);
      setKpis(kpiData);
      setPipelineByStage(pipelineData);
      setRevenueByMonth(revenueData);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !kpis) return <div className="p-8">Loading reports...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Performance & Governance Reports</h1>
          <p className="text-sm text-gray-500">Audit quotation throughput, discount leakage, and operational bottlenecks</p>
        </div>
        <div className="space-x-2">
          <Button variant="secondary">Export to PDF</Button>
          <Button variant="secondary">Export to XLS</Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="bg-white py-3 px-4">
        <div className="flex space-x-4 items-center">
          <span className="text-sm font-semibold text-gray-700">Filters:</span>
          <select className="border border-gray-300 rounded p-1 text-sm bg-gray-50"><option>Period: All Time</option></select>
          <select className="border border-gray-300 rounded p-1 text-sm bg-gray-50"><option>Sales Team: All</option></select>
          <select className="border border-gray-300 rounded p-1 text-sm bg-gray-50"><option>Category: All</option></select>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-l-4 border-l-blue-500">
          <p className="text-sm text-gray-500 font-medium">Total Pipeline Value</p>
          <p className="text-2xl font-bold text-gray-900">${kpis.total_pipeline_value.toLocaleString()}</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-purple-500">
          <p className="text-sm text-gray-500 font-medium">Active MRR</p>
          <p className="text-2xl font-bold text-gray-900">${kpis.active_mrr.toLocaleString()}</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-green-500">
          <p className="text-sm text-gray-500 font-medium">Avg Margin %</p>
          <p className="text-2xl font-bold text-gray-900">{kpis.average_margin_percentage}%</p>
        </Card>
        <Card className="bg-white border-l-4 border-l-orange-500">
          <p className="text-sm text-gray-500 font-medium">Slippage Rate</p>
          <p className="text-2xl font-bold text-gray-900">{kpis.slippage_rate_percentage}%</p>
        </Card>
      </div>

      {/* Matrix Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pipeline' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pipeline By Stage
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revenue' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Confirmed Revenue By Month
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="pt-4">
        {activeTab === 'pipeline' && (
          <Card className="bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                  <th className="p-3">Stage</th>
                  <th className="p-3 text-right">Deal Count</th>
                  <th className="p-3 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody>
                {pipelineByStage.map(row => (
                  <tr key={row.stage} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 capitalize font-medium text-gray-900">{row.stage.replace('_', ' ')}</td>
                    <td className="p-3 text-right">{row.count}</td>
                    <td className="p-3 text-right">${Number(row.total_value).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {activeTab === 'revenue' && (
          <Card className="bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                  <th className="p-3">Month (YYYY-MM)</th>
                  <th className="p-3 text-right">Confirmed Revenue</th>
                </tr>
              </thead>
              <tbody>
                {revenueByMonth.map(row => (
                  <tr key={row.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{row.month}</td>
                    <td className="p-3 text-right text-green-700 font-bold">${Number(row.revenue).toLocaleString()}</td>
                  </tr>
                ))}
                {revenueByMonth.length === 0 && (
                  <tr><td colSpan="2" className="p-4 text-center text-gray-500">No revenue data found for last 12 months.</td></tr>
                )}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
