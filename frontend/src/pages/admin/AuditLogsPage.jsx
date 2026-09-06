import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, CheckCircle2, Shield, Calendar, Search, Filter } from 'lucide-react';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { apiClient } from '../../api/client.js';

export function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const data = await apiClient.get('/admin/audit-logs');
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLogs = () => {
    return logs.filter(log => {
      // Event Filter
      if (eventTypeFilter !== 'all' && log.event_type !== eventTypeFilter) return false;
      
      // Date Filter
      if (dateFilter !== 'all') {
        const logDate = new Date(log.timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - logDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (dateFilter === '7d' && diffDays > 7) return false;
        if (dateFilter === '30d' && diffDays > 30) return false;
      }
      
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          (log.actor || '').toLowerCase().includes(query) ||
          (log.target_display || '').toLowerCase().includes(query) ||
          (log.details || '').toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  };

  const filteredLogs = getFilteredLogs();

  const getEventIcon = (eventType) => {
    if (eventType === 'Deal Health Anomaly') return <Activity className="w-4 h-4 text-amber-600" />;
    if (eventType === 'Approval Action') return <ShieldAlert className="w-4 h-4 text-[#724B66]" />;
    return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  };

  if (loading) {
    return <div className="p-8">Loading audit logs...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#724B66]" />
            <h1 className="text-2xl font-bold text-gray-900">System Audit Logs</h1>
          </div>
          <p className="text-sm text-gray-500 mt-1">Unified immutable ledger of system anomalies and governance actions.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-[#724B66]"
            />
          </div>
          
          <select 
            value={eventTypeFilter}
            onChange={(e) => setEventTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#724B66]"
          >
            <option value="all">All Event Types</option>
            <option value="Approval Action">Approval Actions</option>
            <option value="Deal Health Anomaly">Deal Health Anomalies</option>
          </select>

          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#724B66]"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 font-semibold text-gray-600 bg-gray-50/50">
                <th className="p-4">Timestamp</th>
                <th className="p-4">Event Type</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Target</th>
                <th className="p-4">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                  <td className="p-4 text-gray-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString(undefined, {
                      year: 'numeric', month: 'short', day: 'numeric', 
                      hour: '2-digit', minute:'2-digit', second:'2-digit'
                    })}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getEventIcon(log.event_type)}
                      <span className="font-medium text-gray-900">{log.event_type}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700">
                    {log.actor}
                  </td>
                  <td className="p-4 font-medium text-gray-900">
                    {log.target_link ? (
                      <Link to={log.target_link} className="hover:text-[#724B66] transition-colors">
                        {log.target_display}
                      </Link>
                    ) : (
                      log.target_display
                    )}
                  </td>
                  <td className="p-4 text-gray-600 max-w-lg truncate" title={log.details}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-400">
                    No matching audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
