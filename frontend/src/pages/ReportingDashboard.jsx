import React, { useState, useEffect } from 'react';
import { reportingApi } from '../api/reportingApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Download, FileText, Filter } from 'lucide-react';

export function ReportingDashboard() {
  const [kpis, setKpis] = useState(null);
  const [repDiscipline, setRepDiscipline] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [pipelineByStage, setPipelineByStage] = useState([]);
  const [revenueByMonth, setRevenueByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('rep_discipline');

  // Filters state (REP15-01/02/03/04/05/06/07)
  const [period, setPeriod] = useState('all');
  const [category, setCategory] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');

  useEffect(() => {
    loadData();
  }, [period, category, approvalStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (period !== 'all') params.period = period;
      if (category) params.category = category;
      if (approvalStatus) params.approval_status = approvalStatus;

      const [kpiData, repData, prodData, pipelineData, revenueData] = await Promise.all([
        reportingApi.getKpis(params),
        reportingApi.getSalesRepDiscipline(params),
        reportingApi.getProductCategoryPerformance(params),
        reportingApi.getPipelineByStage(params),
        reportingApi.getRevenueByMonth(params),
      ]);
      setKpis(kpiData);
      setRepDiscipline(repData || []);
      setProductPerformance(prodData || []);
      setPipelineByStage(pipelineData || []);
      setRevenueByMonth(revenueData || []);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    let rows = [];
    let filename = 'report.csv';

    if (activeTab === 'rep_discipline') {
      filename = 'sales_rep_discipline_report.csv';
      rows = [
        ['Sales Rep', 'Team', 'Deals Closed', 'Net Revenue', 'Avg Discount Given %', 'Quotes Flagged', 'Realized Margin %'],
        ...repDiscipline.map(r => [r.sales_rep, r.team, r.deals_closed, r.net_revenue, r.avg_discount_percentage, r.quotes_flagged, r.realized_margin_percentage])
      ];
    } else if (activeTab === 'product_performance') {
      filename = 'product_category_performance_report.csv';
      rows = [
        ['Product Name', 'SKU', 'Category', 'Units Sold', 'Gross Revenue', 'Total Discount Given', 'Avg Discount %', 'Realized Gross Margin %'],
        ...productPerformance.map(p => [p.product_name, p.sku, p.category, p.units_sold, p.gross_revenue, p.total_discount_given, p.avg_discount_percentage, p.realized_gross_margin_percentage])
      ];
    } else if (activeTab === 'pipeline') {
      filename = 'pipeline_by_stage_report.csv';
      rows = [
        ['Stage', 'Deals Count', 'Total Value'],
        ...pipelineByStage.map(p => [p.stage, p.count, p.total_value])
      ];
    } else {
      filename = 'monthly_revenue_report.csv';
      rows = [
        ['Month', 'Revenue'],
        ...revenueByMonth.map(r => [r.month, r.revenue])
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading && !kpis) return <div className="p-8 text-neutral-500">Loading reports...</div>;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Performance & Governance Reports</h1>
          <p className="text-sm text-gray-500">Audit quotation throughput, discount leakage, and operational performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportPDF} className="flex items-center gap-1.5 text-xs">
            <FileText className="w-4 h-4" />
            Export to PDF
          </Button>
          <Button variant="secondary" onClick={handleExportCSV} className="flex items-center gap-1.5 text-xs">
            <Download className="w-4 h-4" />
            Export to XLS
          </Button>
        </div>
      </div>

      {/* Multi-Dimensional Filter Bar (REP15-01/02/03/04/05/06/07) */}
      <Card className="bg-white py-3 px-4 shadow-sm border border-neutral-200">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-semibold text-gray-700 flex items-center gap-1">
            <Filter className="w-4 h-4 text-neutral-400" />
            Filters:
          </span>
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#724B66]"
          >
            <option value="all">Period: All Time</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
          </select>

          <select 
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-xs bg-gray-50 focus:outline-none focus:ring-1 focus:ring-[#724B66]"
          >
            <option value="">Category: All</option>
            <option value="hardware">Hardware</option>
            <option value="services">Services</option>
            <option value="subscriptions">Subscriptions</option>
          </select>

          <div className="flex items-center gap-1.5 ml-auto">
            <span className="text-xs text-neutral-500 font-medium">Stage:</span>
            {['', 'pending_approval', 'approved', 'confirmed'].map((statusKey) => (
              <button
                key={statusKey}
                onClick={() => setApprovalStatus(statusKey)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  approvalStatus === statusKey
                    ? 'bg-[#724B66] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {statusKey === '' ? 'All Stages' : statusKey.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* KPI Cards (REP15-08/10) */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white border-l-4 border-l-emerald-600 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${(kpis.total_bookings || 0).toLocaleString()}</p>
          </Card>
          <Card className="bg-white border-l-4 border-l-rose-500 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Discount Leakage</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">${(kpis.total_discount_leakage || 0).toLocaleString()}</p>
          </Card>
          <Card className="bg-white border-l-4 border-l-blue-500 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Realized Margin %</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.average_margin_percentage || 0}%</p>
          </Card>
          <Card className="bg-white border-l-4 border-l-purple-500 shadow-sm">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Active MRR</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">${(kpis.active_mrr || 0).toLocaleString()}</p>
          </Card>
        </div>
      )}

      {/* Matrix Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          <button
            onClick={() => setActiveTab('rep_discipline')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rep_discipline' 
                ? 'border-[#724B66] text-[#724B66]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tab 1: Sales Rep & Discount Discipline
          </button>
          <button
            onClick={() => setActiveTab('product_performance')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'product_performance' 
                ? 'border-[#724B66] text-[#724B66]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Tab 2: Product & Category Performance
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pipeline' 
                ? 'border-[#724B66] text-[#724B66]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pipeline By Stage
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'revenue' 
                ? 'border-[#724B66] text-[#724B66]' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Confirmed Revenue By Month
          </button>
        </nav>
      </div>

      {/* Tab 1: Sales Rep & Discount Discipline Matrix (REP15-12/13/14/15) */}
      {activeTab === 'rep_discipline' && (
        <Card title="Sales Rep & Discount Discipline Matrix" className="bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 bg-gray-50">
                  <th className="p-3 font-semibold">Sales Rep</th>
                  <th className="p-3 font-semibold">Team</th>
                  <th className="p-3 font-semibold text-center">Deals Closed</th>
                  <th className="p-3 font-semibold text-right">Net Revenue</th>
                  <th className="p-3 font-semibold text-right">Avg Discount Given</th>
                  <th className="p-3 font-semibold text-center">Quotes Flagged (Risk)</th>
                  <th className="p-3 font-semibold text-right">Realized Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {repDiscipline.map((rep) => (
                  <tr key={rep.rep_id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-medium text-gray-900">{rep.sales_rep}</td>
                    <td className="p-3 text-gray-600">{rep.team}</td>
                    <td className="p-3 text-center font-semibold">{rep.deals_closed}</td>
                    <td className="p-3 text-right font-medium">${Number(rep.net_revenue).toLocaleString()}</td>
                    <td className="p-3 text-right text-rose-600 font-medium">{rep.avg_discount_percentage}%</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        rep.quotes_flagged > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {rep.quotes_flagged}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700">{rep.realized_margin_percentage}%</td>
                  </tr>
                ))}
                {repDiscipline.length === 0 && (
                  <tr><td colSpan="7" className="p-6 text-center text-gray-400">No representative records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Product & Category Performance Matrix (REP15-16/17/18) */}
      {activeTab === 'product_performance' && (
        <Card title="Product & Category Performance Matrix" className="bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 bg-gray-50">
                  <th className="p-3 font-semibold">Product Name</th>
                  <th className="p-3 font-semibold">SKU</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold text-center">Units Sold</th>
                  <th className="p-3 font-semibold text-right">Gross Revenue</th>
                  <th className="p-3 font-semibold text-right">Total Discount Given</th>
                  <th className="p-3 font-semibold text-right">Avg Discount %</th>
                  <th className="p-3 font-semibold text-right">Realized Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productPerformance.map((prod) => (
                  <tr key={prod.product_id} className="hover:bg-gray-50 transition">
                    <td className="p-3 font-medium text-gray-900">{prod.product_name}</td>
                    <td className="p-3 text-xs text-gray-500 font-mono">{prod.sku}</td>
                    <td className="p-3 capitalize text-xs text-gray-600">{prod.category}</td>
                    <td className="p-3 text-center font-semibold">{prod.units_sold}</td>
                    <td className="p-3 text-right font-medium">${Number(prod.gross_revenue).toLocaleString()}</td>
                    <td className="p-3 text-right text-rose-600 font-medium">${Number(prod.total_discount_given).toLocaleString()}</td>
                    <td className="p-3 text-right text-gray-600">{prod.avg_discount_percentage}%</td>
                    <td className="p-3 text-right font-bold text-emerald-700">{prod.realized_gross_margin_percentage}%</td>
                  </tr>
                ))}
                {productPerformance.length === 0 && (
                  <tr><td colSpan="8" className="p-6 text-center text-gray-400">No product sales records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Pipeline By Stage */}
      {activeTab === 'pipeline' && (
        <Card title="Quotation Pipeline By Stage" className="bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 bg-gray-50">
                <th className="p-3 font-semibold">Pipeline Stage</th>
                <th className="p-3 font-semibold text-center">Quotation Count</th>
                <th className="p-3 font-semibold text-right">Total Pipeline Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pipelineByStage.map(row => (
                <tr key={row.stage} className="hover:bg-gray-50 transition">
                  <td className="p-3 font-medium capitalize text-gray-900">{row.stage.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-center font-semibold">{row.count}</td>
                  <td className="p-3 text-right font-bold text-[#111826]">${parseFloat(row.total_value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Tab 4: Revenue By Month */}
      {activeTab === 'revenue' && (
        <Card title="Confirmed Revenue By Month" className="bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 bg-gray-50">
                <th className="p-3 font-semibold">Month</th>
                <th className="p-3 font-semibold text-right">Confirmed Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {revenueByMonth.map(row => (
                <tr key={row.month} className="hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{row.month}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">${parseFloat(row.revenue).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
