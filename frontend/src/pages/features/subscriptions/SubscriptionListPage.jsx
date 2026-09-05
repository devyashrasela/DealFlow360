import React, { useState, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Repeat, Search, Filter, X } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { listSubscriptions } from '../../../api/subscriptionApi';

export const SubscriptionListPage = () => {
  const { providerSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';

  const [subscriptions, setSubscriptions] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const s = searchParams.get('status');
    if (s) {
      setStatusFilter(s);
    } else {
      setStatusFilter('all');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchSubscriptions();
  }, [providerSlug]);

  const fetchSubscriptions = async () => {
    setIsLoading(true);
    try {
      // In a real scenario we'd pass providerSlug to filter
      const res = await listSubscriptions();
      setSubscriptions(res.data || []);
      setKpis(res.kpis);
    } catch (err) {
      console.error('Failed to fetch subscriptions', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge status="active" title="Active • Recurring billing contract in good standing">Active</Badge>;
      case 'pending_cancellation':
        return <Badge status="pending_cancellation" title="Pending Cancel • Scheduled to terminate at period end">Pending Cancel</Badge>;
      case 'cancelled':
        return <Badge status="cancelled" title="Cancelled • Subscription contract terminated">Cancelled</Badge>;
      case 'pending_proration':
        return <Badge status="pending_proration" title="Pending Proration • Calculating mid-cycle delta">Pending Proration</Badge>;
      default:
        return <Badge status={status}>{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Subscriptions</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">Manage active contracts, billing schedules, and MRR.</p>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Active Subscriptions</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">{kpis.active_subscriptions}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Total MRR</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">${(kpis.total_mrr || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Renewals (30 Days)</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">{kpis.renewals_next_30_days}</p>
          </div>
        </div>
      )}

      {/* Interactive Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'All Subscriptions', value: 'all' },
          { label: 'Active', value: 'active' },
          { label: 'Pending Cancel', value: 'pending_cancellation' },
          { label: 'Cancelled', value: 'cancelled' },
          { label: 'Pending Proration', value: 'pending_proration' },
        ].map((pill) => (
          <button
            key={pill.value}
            onClick={() => {
              setStatusFilter(pill.value);
              const nextParams = new URLSearchParams(searchParams);
              if (pill.value === 'all') {
                nextParams.delete('status');
              } else {
                nextParams.set('status', pill.value);
              }
              setSearchParams(nextParams);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === pill.value
                ? 'bg-[#724B66] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
        {statusFilter !== 'all' && (
          <button
            onClick={() => {
              setStatusFilter('all');
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('status');
              setSearchParams(nextParams);
            }}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 ml-2"
          >
            <X className="w-3.5 h-3.5" /> Clear filter
          </button>
        )}
      </div>

      {/* Data Grid */}
      <div className="bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
        <div className="p-4 border-b border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search subscriptions..." 
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition-all"
            />
          </div>
          {statusFilter !== 'all' && (
            <div className="text-xs text-neutral-500 font-medium">
              Showing <span className="font-semibold text-[#724B66]">{statusFilter}</span> contracts ({
                subscriptions.filter((s) => s.status === statusFilter).length
              })
            </div>
          )}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
              <tr>
                <th className="px-6 py-4 font-semibold">Subscription Code</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">MRR</th>
                <th className="px-6 py-4 font-semibold">Next Invoice</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-neutral-400">Loading...</td>
                </tr>
              ) : (() => {
                const filtered = subscriptions.filter((sub) => {
                  const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
                  const q = searchQuery.toLowerCase().trim();
                  const matchesSearch =
                    !q ||
                    sub.subscription_code?.toLowerCase().includes(q) ||
                    sub.customer_account?.buyer_organization?.legal_name?.toLowerCase().includes(q);
                  return matchesStatus && matchesSearch;
                });

                if (filtered.length === 0) {
                  return (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-neutral-400">
                        {statusFilter !== 'all'
                          ? `No ${statusFilter} subscriptions found.`
                          : 'No subscriptions found.'}
                      </td>
                    </tr>
                  );
                }

                return filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-neutral-400" />
                        <span className="font-medium text-[#111826]">{sub.subscription_code}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {sub.customer_account?.buyer_organization?.legal_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(sub.status)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ${Number(sub.mrr_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-neutral-500">
                      {sub.next_invoice_date ? new Date(sub.next_invoice_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={providerSlug ? `/${providerSlug}/subscriptions/${sub.id}` : `/subscriptions/${sub.id}`}
                        className="text-sm font-medium text-[#724B66] hover:text-[#2E3141] transition-colors"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
