import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Receipt, Search, Filter } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { listInvoices } from '../../../api/invoiceApi';

export const InvoiceListPage = () => {
  const { providerSlug } = useParams();
  const [invoices, setInvoices] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [providerSlug]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await listInvoices();
      setInvoices(res.data || []);
      setKpis(res.kpis);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft': return <Badge variant="default">Draft</Badge>;
      case 'issued': return <Badge variant="info">Issued</Badge>;
      case 'paid': return <Badge variant="success">Paid</Badge>;
      case 'void': return <Badge variant="danger">Void</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Invoices</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">Financial ledger, pending payments, and credit notes.</p>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Total Outstanding</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">${(kpis.total_outstanding || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium text-red-600">Overdue Amount</p>
            <p className="text-2xl font-bold text-red-600 mt-1">${(kpis.total_overdue || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Unapplied Credits</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">${(kpis.unapplied_credits || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Data Grid */}
      <div className="bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
        <div className="p-4 border-b border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative max-w-sm w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search invoices..." 
              className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#2E3141] bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice Number</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Balance Due</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-neutral-400">Loading...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-neutral-400">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-neutral-400" />
                        <span className="font-medium text-[#111826]">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {inv.customer_account?.buyer_organization?.legal_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 capitalize">
                      {(inv.invoice_type || '').replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(inv.status)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ${Number(inv.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-red-600">
                      ${Number(inv.balance_due || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/${providerSlug || 'default'}/invoices/${inv.id}`}
                        className="text-sm font-medium text-[#724B66] hover:text-[#2E3141] transition-colors"
                      >
                        View Details →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
