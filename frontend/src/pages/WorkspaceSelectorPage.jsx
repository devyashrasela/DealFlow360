import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { OrgCard } from '../components/OrgCard.jsx';
import {
  Plus, Building2, Globe,
  X, ArrowRight, CheckCircle2, AlertCircle
} from 'lucide-react';

export function WorkspaceSelectorPage() {
  const { memberships, switchWorkspace, createWorkspace, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    legal_name: '',
    trading_name: '',
    slug: '',
    organization_type: 'provider',
    default_currency: 'USD'
  });

  // Auto-open modal if URL contains ?create=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('create') === 'true') {
      setIsModalOpen(true);
    }
  }, [location.search]);

  // Helper to generate a URL-safe slug from a string
  const slugify = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleLegalNameChange = (e) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      legal_name: name,
      trading_name: prev.trading_name === prev.legal_name || !prev.trading_name ? name : prev.trading_name,
      slug: slugify(name)
    }));
  };

  const handleSelect = (membership) => {
    const org = membership.organization;
    if (!org) return navigate('/');
    switchWorkspace(membership.organization_id);
    if (org.organization_type === 'provider') {
      navigate(`/${org.slug}/dashboard`);
    } else {
      navigate('/portal');
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.legal_name.trim()) {
      setError('Legal name is required');
      return;
    }

    if (!formData.slug.trim()) {
      setError('Workspace slug is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        legal_name: formData.legal_name.trim(),
        trading_name: formData.trading_name.trim() || formData.legal_name.trim(),
        slug: formData.slug.trim().toLowerCase(),
        organization_type: formData.organization_type,
        default_currency: formData.default_currency,
      };

      const result = await createWorkspace(payload);
      const newOrg = result.organization;

      setIsModalOpen(false);

      // Route user directly into their new workspace
      if (newOrg.organization_type === 'provider') {
        navigate(`/${newOrg.slug}/dashboard`);
      } else {
        navigate('/portal');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to create workspace');
    } finally {
      setLoading(false);
    }
  };

  const filteredMemberships = memberships.filter(m => {
    const name = m.organization?.trading_name || m.organization?.legal_name || '';
    const slug = m.organization?.slug || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase()) || slug.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#111826] flex flex-col items-center justify-center p-4 py-12 sm:px-6 lg:px-8">

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          DealFlow<span className="italic text-[#724B66]">360</span>
        </h1>
        {user && (
          <p className="text-xs text-neutral-400 mt-1 font-medium">
            Logged in as <span className="text-white">{user.full_name || user.email}</span>
          </p>
        )}
      </div>

      {/* Main Card */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Your Workspaces</h2>
            {memberships.length > 0 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
                {memberships.length} org{memberships.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-xs">Select a workspace to continue</p>
        </div>

        {/* Search bar if multiple memberships */}
        {memberships.length > 2 && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1b2230] border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#724B66] transition"
            />
          </div>
        )}

        {/* Membership Cards List */}
        <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1">
          {filteredMemberships.map((m) => (
            <OrgCard
              key={m.id}
              org={m.organization}
              role={m.role}
              onSelect={() => handleSelect(m)}
            />
          ))}

          {/* Empty state */}
          {memberships.length === 0 && (
            <div className="text-center py-10 bg-[#1b2230] rounded-xl border border-neutral-800 px-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#724B66]/15 border border-[#724B66]/25 flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-[#724B66]" />
              </div>
              <p className="text-neutral-200 font-semibold text-sm">
                No workspaces yet
              </p>
              <p className="text-neutral-500 text-xs mt-1 max-w-[280px] mx-auto">
                Create your first organization to start managing deals, quotations, and customers.
              </p>
            </div>
          )}
        </div>

        {/* Create Organization Button */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full group flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-[#724B66]/50 rounded-xl text-sm font-semibold text-[#724B66] hover:text-white hover:border-[#724B66] hover:bg-[#724B66] transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
            <span>Create New Workspace</span>
          </button>
        </div>
      </div>

      {/* ── CREATE WORKSPACE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#1F2430] border border-neutral-700 text-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">

            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#724B66]/20 border border-[#724B66]/40 flex items-center justify-center text-[#724B66]">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Create Workspace</h3>
                  <p className="text-xs text-neutral-400">Set up your organization</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Legal Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1">
                  Organization Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies Inc."
                  value={formData.legal_name}
                  onChange={handleLegalNameChange}
                  className="w-full bg-[#111826] border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#724B66] transition"
                />
              </div>

              {/* Trading Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech"
                    value={formData.trading_name}
                    onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                    className="w-full bg-[#111826] border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#724B66] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-300 mb-1">
                    URL Slug <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="acme-tech"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                    className="w-full bg-[#111826] border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#724B66] font-mono text-xs transition"
                  />
                </div>
              </div>

              {/* Live URL Preview */}
              <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/60 p-2 rounded-lg border border-neutral-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#724B66] shrink-0" />
                <span className="truncate">dealflow360.com/{formData.slug || 'your-slug'}/dashboard</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-neutral-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#724B66] hover:bg-[#5e3d54] active:bg-[#4d3245] text-white font-semibold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Creating...' : 'Create Workspace'}</span>
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
