import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealHealthApi } from '../api/dealHealthApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { AdvancedFilter } from '../components/ui/AdvancedFilter.jsx';
import { useAdvancedFilter } from '../hooks/useAdvancedFilter.js';
import { AlertCircle, Clock, Truck } from 'lucide-react';

export function DealHealthDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stalled'); // 'stalled', 'discount', 'slippage'

  const HEALTH_FILTER_SCHEMA = [
    { key: 'margin_leak', label: 'Margin Leak (%)', type: 'number', getValue: (alert) => {
        return alert.metadata?.leak_percent || alert.metadata?.margin_drop || 0;
    }},
    { key: 'delay_days', label: 'Stalled Days', type: 'number', getValue: (alert) => {
        return alert.metadata?.stalled_days || 0;
    }}
  ];

  const filterProps = useAdvancedFilter(alerts, HEALTH_FILTER_SCHEMA);

  const filteredAlerts = filterProps.filteredData.filter(a => 
    !searchQuery || 
    (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.quotation?.quotation_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (a.quotation?.customer_account?.buyer_organization?.legal_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate streams
  const stalledDeals = filteredAlerts.filter(a => a.anomaly_type === 'stalled_deal');
  const discountLeaks = filteredAlerts.filter(a => a.anomaly_type === 'discount_anomaly');
  const slippageRisks = filteredAlerts.filter(a => a.anomaly_type === 'delivery_slippage');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await dealHealthApi.getAlerts();
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      await dealHealthApi.scan();
      await loadAlerts();
    } catch (err) {
      console.error('Scan failed', err);
    } finally {
      setScanning(false);
    }
  };

  const handleNudge = async (alertId) => {
    try {
      await dealHealthApi.sendNudge(alertId);
      loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEscalate = async (alertId) => {
    try {
      await dealHealthApi.escalate(alertId);
      loadAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center pb-4 border-b border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Health & Anomaly Dashboard</h1>
          <p className="text-sm text-gray-500">Algorithmic detection for stalled pipeline, margin anomalies, and delivery slippage.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            placeholder="Search alerts..." 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#724B66]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <AdvancedFilter schema={HEALTH_FILTER_SCHEMA} filterProps={filterProps} />
          <Button onClick={handleScan} disabled={scanning} size="md">
            {scanning ? 'Scanning...' : 'Run Diagnostic Scan'}
          </Button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-neutral-200/60 overflow-x-auto mb-6">
        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'stalled' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('stalled')}
        >
          <div className="flex items-center space-x-2">
            <Clock size={18}/>
            <span>Stalled Deals</span>
            {stalledDeals.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'stalled' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {stalledDeals.length}
              </span>
            )}
          </div>
          {activeTab === 'stalled' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'discount' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('discount')}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle size={18}/>
            <span>Margin Leaks</span>
            {discountLeaks.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'discount' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {discountLeaks.length}
              </span>
            )}
          </div>
          {activeTab === 'discount' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>

        <button 
          className={`pb-3 px-1 mr-8 font-medium text-sm transition-colors relative shrink-0 ${activeTab === 'slippage' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('slippage')}
        >
          <div className="flex items-center space-x-2">
            <Truck size={18}/>
            <span>Delivery Slippage</span>
            {slippageRisks.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full ${activeTab === 'slippage' ? 'bg-[#724B66]/10 text-[#724B66]' : 'bg-neutral-100 text-neutral-600'}`}>
                {slippageRisks.length}
              </span>
            )}
          </div>
          {activeTab === 'slippage' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
      </div>

      {/* Tab Content */}
      <Card className="bg-white shadow-sm border border-gray-200">
            {activeTab === 'stalled' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 font-semibold text-gray-600 bg-gray-50/50">
                      <th className="p-4">Quotation #</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Sales Rep</th>
                      <th className="p-4">Deal Value</th>
                      <th className="p-4">Stage</th>
                      <th className="p-4">Days Inactive</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stalledDeals.map(alert => (
                      <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="p-4 font-medium text-gray-900">
                          <Link to={`/quotations/${alert.quotation_id}`} className="hover:text-[#724B66] transition-colors">
                            {alert.quotation?.quotation_number || alert.title}
                          </Link>
                        </td>
                        <td className="p-4 text-gray-700">
                          {alert.quotation?.customer_account?.buyer_organization?.legal_name || '—'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {alert.quotation?.assigned_sales_rep?.full_name || '—'}
                        </td>
                        <td className="p-4 font-medium text-gray-700">
                          ${Number(alert.quotation?.grand_total || alert.quotation?.gross_total || 0).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <Badge status={alert.diagnostic_payload?.stage || alert.quotation?.stage} dot={false}>
                            {(alert.diagnostic_payload?.stage || alert.quotation?.stage)?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-700 font-medium">{alert.diagnostic_payload?.days_stale ?? 0} days</td>
                        <td className="p-4">
                          <Badge status={alert.resolution_status === 'active' ? 'warning' : 'healthy'}>
                            {alert.resolution_status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-row justify-end gap-2">
                            <Button variant="primary" size="sm" onClick={() => handleNudge(alert.id)} disabled={alert.resolution_status !== 'active'}>
                              Nudge
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleEscalate(alert.id)} disabled={alert.resolution_status !== 'active'} className="!text-rose-700 !bg-rose-50 !border-rose-200 hover:!bg-rose-100 disabled:!bg-transparent disabled:!border-gray-200 disabled:!text-gray-400">
                              Escalate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {stalledDeals.length === 0 && (
                      <tr><td colSpan="8" className="p-12 text-center text-gray-400">No stalled deals detected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'discount' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 font-semibold text-gray-600 bg-gray-50/50">
                      <th className="p-4">Quotation #</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Sales Rep</th>
                      <th className="p-4">Deal Value</th>
                      <th className="p-4 text-right">Applied %</th>
                      <th className="p-4 text-right">Threshold %</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {discountLeaks.map(alert => (
                      <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="p-4 font-medium text-gray-900">
                          <Link to={`/quotations/${alert.quotation_id}`} className="hover:text-[#724B66] transition-colors">
                            {alert.quotation?.quotation_number || alert.title}
                          </Link>
                        </td>
                        <td className="p-4 text-gray-700">
                          {alert.quotation?.customer_account?.buyer_organization?.legal_name || '—'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {alert.quotation?.assigned_sales_rep?.full_name || '—'}
                        </td>
                        <td className="p-4 font-medium text-gray-700">
                          ${Number(alert.quotation?.grand_total || alert.quotation?.gross_total || 0).toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-gray-900 font-semibold">{alert.diagnostic_payload?.applied}%</td>
                        <td className="p-4 text-right text-gray-500">{alert.diagnostic_payload?.threshold}% <span className="text-[10px] uppercase text-gray-400">({alert.diagnostic_payload?.fallback})</span></td>
                        <td className="p-4">
                          <Badge status={alert.resolution_status === 'active' ? 'warning' : 'healthy'}>
                            {alert.resolution_status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-row justify-end gap-2">
                            <Button variant="primary" size="sm" onClick={() => handleEscalate(alert.id)} disabled={alert.resolution_status !== 'active'}>
                              Route to Finance
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {discountLeaks.length === 0 && (
                      <tr><td colSpan="8" className="p-12 text-center text-gray-400">No discount anomalies detected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'slippage' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 font-semibold text-gray-600 bg-gray-50/50">
                      <th className="p-4">Order #</th>
                      <th className="p-4">Bottleneck Location</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Promised Delivery</th>
                      <th className="p-4">Fulfillment Status</th>
                      <th className="p-4">Slippage Window</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slippageRisks.map(alert => (
                      <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                        <td className="p-4 font-medium text-gray-900">
                          <Link to="/fulfillment" className="hover:text-[#724B66] transition-colors">
                            {alert.fulfillment_order?.fulfillment_number || alert.title}
                          </Link>
                        </td>
                        <td className="p-4 text-gray-700">
                          {alert.fulfillment_order?.warehouse?.name || alert.fulfillment_order?.warehouse?.code || 'Main Warehouse'}
                        </td>
                        <td className="p-4 text-gray-700">
                          {alert.fulfillment_order?.quotation?.customer_account?.buyer_organization?.legal_name || '—'}
                        </td>
                        <td className="p-4 text-gray-600">
                          {alert.fulfillment_order?.estimated_delivery_date ? new Date(alert.fulfillment_order.estimated_delivery_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="p-4">
                          <Badge status={alert.diagnostic_payload?.fulfillment_status || alert.fulfillment_order?.status}>
                            {alert.diagnostic_payload?.fulfillment_status || alert.fulfillment_order?.status || 'Pending'}
                          </Badge>
                        </td>
                        <td className="p-4 text-gray-700 font-medium">Within {alert.diagnostic_payload?.slippage_window_hours || 48} hrs</td>
                        <td className="p-4">
                          <Badge status={alert.resolution_status === 'active' ? 'warning' : 'healthy'}>
                            {alert.resolution_status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex flex-row justify-end gap-2">
                            <Button variant="primary" size="sm" onClick={() => handleNudge(alert.id)} disabled={alert.resolution_status !== 'active'}>
                              Notify Ops
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {slippageRisks.length === 0 && (
                      <tr><td colSpan="8" className="p-12 text-center text-gray-400">No slippage risks detected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
    </div>
  );
}
