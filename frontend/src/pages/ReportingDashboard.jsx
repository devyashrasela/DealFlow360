import React, { useState, useEffect } from 'react';
import { reportingApi } from '../api/reportingApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Download, FileText, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Document Title Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 38);
      doc.text('DealFlow360 — Sales Performance & Governance Report', pageWidth / 2, 14, { align: 'center' });

      // Subtitle with active filters
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const filterSummary = `Generated: ${new Date().toLocaleString()} | Period: ${period.replace(/_/g, ' ')} | Category: ${category || 'All'} | Stage: ${approvalStatus ? approvalStatus.replace(/_/g, ' ') : 'All Stages'}`;
      doc.text(filterSummary, pageWidth / 2, 19, { align: 'center' });

      let currentY = 25;

      const tablesConfig = [
        {
          title: 'Sales Rep & Discount Discipline Matrix',
          headers: [['Sales Rep', 'Team', 'Deals Closed', 'Net Revenue', 'Avg Discount Given', 'Quotes Flagged (Risk)', 'Realized Margin %']],
          rows: repDiscipline.length > 0 ? repDiscipline.map(r => [
            r.sales_rep || 'N/A',
            r.team || 'N/A',
            String(r.deals_closed ?? 0),
            `$${Number(r.net_revenue || 0).toLocaleString()}`,
            `${r.avg_discount_percentage ?? 0}%`,
            String(r.quotes_flagged ?? 0),
            `${r.realized_margin_percentage ?? 0}%`
          ]) : [['No representative records found.', '', '', '', '', '', '']]
        },
        {
          title: 'Product & Category Performance Matrix',
          headers: [['Product Name', 'SKU', 'Category', 'Units Sold', 'Gross Revenue', 'Total Discount Given', 'Avg Discount %', 'Realized Margin %']],
          rows: productPerformance.length > 0 ? productPerformance.map(p => [
            p.product_name || 'N/A',
            p.sku || 'N/A',
            p.category ? p.category.charAt(0).toUpperCase() + p.category.slice(1) : 'N/A',
            String(p.units_sold ?? 0),
            `$${Number(p.gross_revenue || 0).toLocaleString()}`,
            `$${Number(p.total_discount_given || 0).toLocaleString()}`,
            `${p.avg_discount_percentage ?? 0}%`,
            `${p.realized_gross_margin_percentage ?? 0}%`
          ]) : [['No product sales records found.', '', '', '', '', '', '', '']]
        },
        {
          title: 'Quotation Pipeline By Stage',
          headers: [['Pipeline Stage', 'Quotation Count', 'Total Pipeline Value']],
          rows: pipelineByStage.length > 0 ? pipelineByStage.map(row => [
            row.stage ? row.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'N/A',
            String(row.count ?? 0),
            `$${parseFloat(row.total_value || 0).toLocaleString()}`
          ]) : [['No pipeline records found.', '', '']]
        },
        {
          title: 'Confirmed Revenue By Month',
          headers: [['Month', 'Confirmed Revenue']],
          rows: revenueByMonth.length > 0 ? revenueByMonth.map(row => [
            row.month || 'N/A',
            `$${parseFloat(row.revenue || 0).toLocaleString()}`
          ]) : [['No monthly revenue records found.', '']]
        }
      ];

      tablesConfig.forEach((t) => {
        // Check if title + minimum table height will fit on current page
        const estimatedTableHeight = (t.rows.length + 1) * 7 + 10;
        if (currentY + Math.min(estimatedTableHeight, 35) > pageHeight - 15) {
          doc.addPage();
          currentY = 16;
        }

        // Table Title: Center-aligned, bold, 14pt
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(17, 24, 38);
        doc.text(t.title, pageWidth / 2, currentY, { align: 'center' });
        currentY += 4;

        // Render Table with uniform margins (left: 14, right: 14) so all 4 tables have the exact same width
        autoTable(doc, {
          startY: currentY,
          head: t.headers,
          body: t.rows,
          margin: { left: 14, right: 14 },
          theme: 'grid',
          styles: {
            font: 'helvetica',
            fontSize: 9,
            textColor: [30, 41, 59],
            cellPadding: 2.2,
            overflow: 'linebreak',
            valign: 'middle'
          },
          headStyles: {
            font: 'helvetica',
            fontStyle: 'bold',
            fontSize: 9.5,
            fillColor: [114, 75, 102], // DealFlow360 brand purple #724B66
            textColor: [255, 255, 255],
            halign: 'center',
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252],
          },
        });

        currentY = doc.lastAutoTable.finalY + 9;
      });

      // Add page numbering footer across all pages
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
        doc.text('DealFlow360 Intelligence — Confidential', 14, pageHeight - 6, { align: 'left' });
      }

      const fileName = `DealFlow360_Reports_${period}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(`Error generating PDF export: ${err.message}`);
    }
  };

  const handleExportXLSX = () => {
    try {
      const wb = XLSX.utils.book_new();

      const sheets = [
        {
          sheetName: 'Sales Rep Discipline',
          title: 'Sales Rep & Discount Discipline Matrix',
          headers: ['Sales Rep', 'Team', 'Deals Closed', 'Net Revenue ($)', 'Avg Discount Given (%)', 'Quotes Flagged (Risk)', 'Realized Margin (%)'],
          rows: repDiscipline.map(r => [
            r.sales_rep || 'N/A',
            r.team || 'N/A',
            Number(r.deals_closed || 0),
            Number(r.net_revenue || 0),
            Number(r.avg_discount_percentage || 0),
            Number(r.quotes_flagged || 0),
            Number(r.realized_margin_percentage || 0)
          ])
        },
        {
          sheetName: 'Product Performance',
          title: 'Product & Category Performance Matrix',
          headers: ['Product Name', 'SKU', 'Category', 'Units Sold', 'Gross Revenue ($)', 'Total Discount Given ($)', 'Avg Discount (%)', 'Realized Margin (%)'],
          rows: productPerformance.map(p => [
            p.product_name || 'N/A',
            p.sku || 'N/A',
            p.category || 'N/A',
            Number(p.units_sold || 0),
            Number(p.gross_revenue || 0),
            Number(p.total_discount_given || 0),
            Number(p.avg_discount_percentage || 0),
            Number(p.realized_gross_margin_percentage || 0)
          ])
        },
        {
          sheetName: 'Pipeline By Stage',
          title: 'Quotation Pipeline By Stage',
          headers: ['Pipeline Stage', 'Quotation Count', 'Total Pipeline Value ($)'],
          rows: pipelineByStage.map(row => [
            row.stage ? row.stage.replace(/_/g, ' ') : 'N/A',
            Number(row.count || 0),
            Number(row.total_value || 0)
          ])
        },
        {
          sheetName: 'Monthly Revenue',
          title: 'Confirmed Revenue By Month',
          headers: ['Month', 'Confirmed Revenue ($)'],
          rows: revenueByMonth.map(row => [
            row.month || 'N/A',
            Number(row.revenue || 0)
          ])
        }
      ];

      sheets.forEach(({ sheetName, title, headers, rows }) => {
        // Row 1: Title heading, Row 2: blank, Row 3: headers, Row 4+: rows
        const wsData = [
          [title],
          [],
          headers,
          ...rows
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Compute sensible column widths
        const colWidths = headers.map((h, i) => {
          const maxValLen = rows.reduce((max, r) => Math.max(max, String(r[i] ?? '').length), 0);
          return { wch: Math.max(h.length, maxValLen) + 4 };
        });
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const fileName = `DealFlow360_Reports_${period}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error('Failed to export XLSX:', err);
      alert(`Error generating XLSX export: ${err.message}`);
    }
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
          <Button variant="secondary" onClick={handleExportXLSX} className="flex items-center gap-1.5 text-xs">
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
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${approvalStatus === statusKey
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
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'rep_discipline'
              ? 'border-[#724B66] text-[#724B66]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Sales Rep & Discount Discipline
          </button>
          <button
            onClick={() => setActiveTab('product_performance')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'product_performance'
              ? 'border-[#724B66] text-[#724B66]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Product & Category Performance
          </button>
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'pipeline'
              ? 'border-[#724B66] text-[#724B66]'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Pipeline By Stage
          </button>
          <button
            onClick={() => setActiveTab('revenue')}
            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'revenue'
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
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${rep.quotes_flagged > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
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
