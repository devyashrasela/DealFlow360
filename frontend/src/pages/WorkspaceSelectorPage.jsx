import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { OrgCard } from '../components/OrgCard.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import icn from '../assets/icon.png';
import {
  Plus, Building2, Globe,
  X, ArrowRight, AlertCircle
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
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4 py-12 sm:px-6 lg:px-8">

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8 text-center flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 mb-2">
          <img src={icn} alt="Logo" className="h-10 w-auto" />
          <h1 className="text-3xl font-bold tracking-tight text-[#111826]">
            DealFlow<span className="italic text-[#724B66]">360</span>
          </h1>
        </div>
        {user && (
          <p className="text-sm text-neutral-500 mt-1 font-medium">
            Logged in as <span className="text-[#111826] font-semibold">{user.full_name || user.email}</span>
          </p>
        )}
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-lg shadow-xl" noPadding>
        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xl font-bold text-[#111826] tracking-tight">Your Workspaces</h2>
              {memberships.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#724B66] bg-[#724B66]/10 border border-[#724B66]/20 px-2.5 py-1 rounded-full">
                  {memberships.length} org{memberships.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-neutral-500 text-sm">Select a workspace to continue</p>
          </div>

          {/* Search bar if multiple memberships */}
          {memberships.length > 2 && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-[#111826] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
              />
            </div>
          )}

          {/* Membership Cards List */}
          <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
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
              <div className="text-center py-10 bg-neutral-50 rounded-xl border border-neutral-200 px-6">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#724B66]/10 border border-[#724B66]/20 flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-[#724B66]" />
                </div>
                <p className="text-[#111826] font-semibold text-sm">
                  No workspaces yet
                </p>
                <p className="text-neutral-500 text-xs mt-1 max-w-[280px] mx-auto">
                  Create your first organization to start managing deals, quotations, and customers.
                </p>
              </div>
            )}
          </div>

          {/* Create Organization Button */}
          <div className="mt-6 pt-5 border-t border-neutral-100">
            <button
              onClick={() => setIsModalOpen(true)}
              className="w-full group flex items-center justify-center gap-2 py-3 px-4 border border-dashed border-neutral-300 rounded-xl text-sm font-semibold text-neutral-600 hover:text-[#724B66] hover:border-[#724B66]/50 hover:bg-[#724B66]/5 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5 group-hover:scale-110 transition-transform" />
              <span>Create New Workspace</span>
            </button>
          </div>
        </div>
      </Card>

      {/* ── CREATE WORKSPACE MODAL ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-150" noPadding>
            
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#724B66]/10 border border-[#724B66]/20 flex items-center justify-center text-[#724B66]">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#111826]">Create Workspace</h3>
                  <p className="text-xs text-neutral-500">Set up your organization</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-[#111826] p-1.5 rounded-lg hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Legal Name */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Organization Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies Inc."
                  value={formData.legal_name}
                  onChange={handleLegalNameChange}
                  className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-[#111826] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                />
              </div>

              {/* Trading Name & Slug */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Tech"
                    value={formData.trading_name}
                    onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                    className="w-full bg-white border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-[#111826] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1.5">
                    URL Slug <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="acme-tech"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: slugify(e.target.value) })}
                    className="w-full bg-neutral-50 border border-neutral-300 rounded-xl px-3.5 py-2.5 text-sm text-[#111826] placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] font-mono transition"
                  />
                </div>
              </div>

              {/* Live URL Preview */}
              <div className="text-[11px] font-mono text-neutral-500 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200 flex items-center gap-2 mt-1">
                <Globe className="w-3.5 h-3.5 text-[#724B66] shrink-0" />
                <span className="truncate">dealflow360.com/{formData.slug || 'your-slug'}/dashboard</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 mt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  loading={loading}
                >
                  <span>{loading ? 'Creating...' : 'Create Workspace'}</span>
                  {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>

            </form>
          </Card>
        </div>
      )}

    </div>
  );
}
