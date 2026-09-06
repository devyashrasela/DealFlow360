import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { 
  Users, UserPlus, Building2, Search, X, Check, Copy, CheckCircle2 
} from 'lucide-react';

export function CustomersListPage() {
  const { activeOrg } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'customer_portal',
    customer_organization_id: '', // Empty means create new
    new_customer_legal_name: '',
    new_customer_slug: ''
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/customers');
      setCustomers(res || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteLoading(true);

    try {
      const payload = {
        email: inviteForm.email,
        role: inviteForm.role,
      };

      if (inviteForm.customer_organization_id) {
        payload.customer_organization_id = inviteForm.customer_organization_id;
      } else {
        if (!inviteForm.new_customer_legal_name || !inviteForm.new_customer_slug) {
          throw new Error('Please provide legal name and slug for the new customer organization');
        }
        payload.new_customer_legal_name = inviteForm.new_customer_legal_name;
        payload.new_customer_slug = inviteForm.new_customer_slug;
      }

      const res = await apiClient.post('/auth/invitations', payload);
      
      const inviteUrl = `${window.location.origin}/invite/accept?token=${res.raw_token}`;
      setGeneratedLink(inviteUrl);
      
      // Refresh list to show newly created orgs if any
      fetchCustomers();
      
    } catch (err) {
      setInviteError(err.message || 'Failed to generate invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetInviteForm = () => {
    setInviteForm({
      email: '',
      role: 'customer_portal',
      customer_organization_id: '',
      new_customer_legal_name: '',
      new_customer_slug: ''
    });
    setGeneratedLink('');
    setInviteError('');
    setIsInviteModalOpen(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.buyer_organization?.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.buyer_organization?.trading_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-[#724B66]" />
            Customers
          </h1>
          <p className="text-neutral-500 mt-2">Manage customer accounts and invite new buyers.</p>
        </div>
        
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#724B66] text-white font-semibold rounded-xl hover:bg-[#5e3d54] active:bg-[#4d3245] transition shadow-md cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Invite New Customer
        </button>
      </div>

      <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="px-6 py-4">Customer Organization</th>
                <th className="px-6 py-4">Account Number</th>
                <th className="px-6 py-4">Pricing Tier</th>
                <th className="px-6 py-4">Sales Rep</th>
                <th className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-6 h-6 border-2 border-[#724B66]/30 border-t-[#724B66] rounded-full animate-spin" />
                      Loading customers...
                    </div>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Building2 className="w-8 h-8 text-neutral-300 mb-2" />
                      <p className="font-medium text-neutral-600">No customers found</p>
                      <p className="text-xs">Invite a new customer to get started.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition group cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#724B66]/10 flex items-center justify-center border border-[#724B66]/20 text-[#724B66]">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-semibold text-neutral-900">{c.buyer_organization?.legal_name}</div>
                          {c.buyer_organization?.trading_name && (
                            <div className="text-xs text-neutral-500">{c.buyer_organization.trading_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-neutral-600">
                      {c.account_number}
                    </td>
                    <td className="px-6 py-4 capitalize text-neutral-600">
                      {c.pricing_tier}
                    </td>
                    <td className="px-6 py-4 text-neutral-600">
                      {c.assigned_sales_rep?.full_name || <span className="text-neutral-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={resetInviteForm} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#724B66]/10 flex items-center justify-center text-[#724B66]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Invite Customer</h2>
                  <p className="text-xs text-neutral-500 font-medium">Generate an invite link for a customer</p>
                </div>
              </div>
              <button onClick={resetInviteForm} className="p-2 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 rounded-full transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {!generatedLink ? (
                <form id="invite-form" onSubmit={handleInviteSubmit} className="space-y-5">
                  {inviteError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                      {inviteError}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                      placeholder="customer@example.com"
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-neutral-700 mb-1.5">Customer Organization</label>
                    <select
                      value={inviteForm.customer_organization_id}
                      onChange={(e) => setInviteForm({...inviteForm, customer_organization_id: e.target.value})}
                      className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                    >
                      <option value="">-- Create New Organization --</option>
                      {customers.map(c => (
                        <option key={c.buyer_organization_id} value={c.buyer_organization_id}>
                          {c.buyer_organization?.legal_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!inviteForm.customer_organization_id && (
                    <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-neutral-600 mb-1.5">Legal Name</label>
                        <input
                          type="text"
                          required
                          value={inviteForm.new_customer_legal_name}
                          onChange={(e) => setInviteForm({...inviteForm, new_customer_legal_name: e.target.value})}
                          placeholder="e.g. Acme Corporation"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-neutral-600 mb-1.5">URL Slug</label>
                        <input
                          type="text"
                          required
                          value={inviteForm.new_customer_slug}
                          onChange={(e) => setInviteForm({...inviteForm, new_customer_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                          placeholder="e.g. acme-corp"
                          className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                        />
                      </div>
                    </div>
                  )}
                </form>
              ) : (
                <div className="text-center py-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 border border-emerald-200 shadow-sm">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-neutral-900 mb-2">Invitation Link Generated!</h3>
                  <p className="text-sm text-neutral-500 mb-6">
                    Copy the link below and send it to your customer to allow them to register.
                  </p>
                  
                  <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 p-2 rounded-lg shadow-inner">
                    <input 
                      type="text" 
                      readOnly 
                      value={generatedLink}
                      className="flex-1 bg-transparent border-none text-sm font-mono text-neutral-600 focus:outline-none px-2"
                    />
                    <button 
                      onClick={copyToClipboard}
                      className="px-4 py-2 bg-white border border-neutral-200 hover:bg-neutral-50 rounded-md text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-neutral-600" />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-3 bg-neutral-50/50">
              {generatedLink ? (
                <button
                  type="button"
                  onClick={resetInviteForm}
                  className="px-5 py-2.5 rounded-xl bg-neutral-900 text-white font-semibold text-sm transition cursor-pointer"
                >
                  Done
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={resetInviteForm}
                    className="px-4 py-2.5 text-sm font-semibold text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    form="invite-form"
                    type="submit"
                    disabled={inviteLoading}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] active:bg-[#4d3245] text-white font-semibold text-sm transition disabled:opacity-50 shadow-md cursor-pointer"
                  >
                    {inviteLoading ? 'Generating...' : 'Generate Invite Link'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
