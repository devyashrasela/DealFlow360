import React, { useState, useEffect } from 'react';
import { dealHealthApi } from '../api/dealHealthApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export function DealHealthDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // Separate streams
  const stalledDeals = alerts.filter(a => a.anomaly_type === 'stalled_deal');
  const discountLeaks = alerts.filter(a => a.anomaly_type === 'discount_anomaly');
  const slippageRisks = alerts.filter(a => a.anomaly_type === 'delivery_slippage');

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await dealHealthApi.getAlerts();
      setAlerts(data);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deal Health & Anomaly Dashboard</h1>
          <p className="text-sm text-gray-500">Real-time algorithmic detection for stalled pipeline, margin anomalies, and delivery slippage</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} size="lg">
          {scanning ? 'Scanning...' : 'Run Diagnostic Scan'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-yellow-400 bg-white">
          <p className="text-sm text-gray-500 font-medium">Stalled Quotations</p>
          <p className="text-3xl font-bold text-gray-900">{stalledDeals.length}</p>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-white">
          <p className="text-sm text-gray-500 font-medium">Discount Anomalies</p>
          <p className="text-3xl font-bold text-gray-900">{discountLeaks.length}</p>
        </Card>
        <Card className="border-l-4 border-l-orange-500 bg-white">
          <p className="text-sm text-gray-500 font-medium">Delivery Slippage Risks</p>
          <p className="text-3xl font-bold text-gray-900">{slippageRisks.length}</p>
        </Card>
      </div>

      {/* Stream A: Stalled Deals */}
      <Card title="Stream A: Stalled Deals Queue" className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                <th className="p-3">Title</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Days Inactive</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stalledDeals.map(alert => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{alert.title}</td>
                  <td className="p-3"><Badge color="gray">{alert.diagnostic_payload?.stage}</Badge></td>
                  <td className="p-3 text-red-600 font-medium">{alert.diagnostic_payload?.days_stale} days</td>
                  <td className="p-3 capitalize">{alert.resolution_status}</td>
                  <td className="p-3 text-right space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleNudge(alert.id)} disabled={alert.resolution_status !== 'active'}>
                      Send Nudge
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleEscalate(alert.id)} disabled={alert.resolution_status !== 'active'}>
                      Escalate
                    </Button>
                  </td>
                </tr>
              ))}
              {stalledDeals.length === 0 && (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No stalled deals detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stream B: Discount Anomaly */}
      <Card title="Stream B: Discount Anomaly & Margin Leak Feed" className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                <th className="p-3">Quotation Line Alert</th>
                <th className="p-3 text-right">Applied %</th>
                <th className="p-3 text-right">Threshold %</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {discountLeaks.map(alert => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{alert.title}</td>
                  <td className="p-3 text-right text-red-600 font-bold">{alert.diagnostic_payload?.applied}%</td>
                  <td className="p-3 text-right text-gray-500">{alert.diagnostic_payload?.threshold}% ({alert.diagnostic_payload?.fallback})</td>
                  <td className="p-3 capitalize">{alert.resolution_status}</td>
                  <td className="p-3 text-right space-x-2">
                    <Button variant="danger" size="sm" onClick={() => handleEscalate(alert.id)} disabled={alert.resolution_status !== 'active'}>
                      Route to Finance
                    </Button>
                  </td>
                </tr>
              ))}
              {discountLeaks.length === 0 && (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No discount anomalies detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Stream C: Delivery Slippage */}
      <Card title="Stream C: Delivery Promise Slippage Feed" className="bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                <th className="p-3">Fulfillment Risk</th>
                <th className="p-3">Fulfillment Status</th>
                <th className="p-3">Slippage Window</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slippageRisks.map(alert => (
                <tr key={alert.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="p-3 font-medium text-gray-900">{alert.title}</td>
                  <td className="p-3 capitalize">{alert.diagnostic_payload?.fulfillment_status}</td>
                  <td className="p-3 text-orange-600 font-medium">Within {alert.diagnostic_payload?.slippage_window_hours} hrs</td>
                  <td className="p-3 capitalize">{alert.resolution_status}</td>
                  <td className="p-3 text-right space-x-2">
                    <Button variant="secondary" size="sm" onClick={() => handleNudge(alert.id)} disabled={alert.resolution_status !== 'active'}>
                      Notify Ops
                    </Button>
                  </td>
                </tr>
              ))}
              {slippageRisks.length === 0 && (
                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No slippage risks detected.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
