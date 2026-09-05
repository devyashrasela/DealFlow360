import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { teamRolesApi } from '../../api/teamRolesApi';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  ShieldCheck,
  UserPlus,
  ArrowRightLeft,
  AlertTriangle,
  History,
  CheckCircle2,
  Lock,
  Search,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  Briefcase,
  UserX,
  RefreshCw,
  Building2,
  Sparkles,
  X,
  ChevronDown,
  Check,
} from 'lucide-react';

export function TeamRolesPage() {
  const { user: currentUser, activeOrg, activeRole } = useAuth();

  // Data states
  const [members, setMembers] = useState([]);
  const [customerContacts, setCustomerContacts] = useState([]);
  const [metrics, setMetrics] = useState({
    total_members: 0,
    admins_count: 0,
    sales_count: 0,
    ops_count: 0,
    customer_portal_count: 0,
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // UI tabs & filter
  const [activeTab, setActiveTab] = useState('all'); // all, internal, customers, suspended, audit, reference
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [targetRole, setTargetRole] = useState('sales_rep');
  const [changeReason, setChangeReason] = useState('');
  const [confirmStep, setConfirmStep] = useState(1); // 1 = form, 2 = confirm

  // Suspend / Remove Modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetMember, setStatusTargetMember] = useState(null);
  const [targetStatus, setTargetStatus] = useState('suspended'); // 'suspended', 'active', 'removed'
  const [statusReason, setStatusReason] = useState('');

  // Cross-Boundary Promote Modal
  const [isCrossBoundaryModalOpen, setIsCrossBoundaryModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cbTargetRole, setCbTargetRole] = useState('sales_rep');
  const [cbReason, setCbReason] = useState('');
  const [cbConfirmStep, setCbConfirmStep] = useState(1);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'sales_rep', full_name: '' });

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, auditRes] = await Promise.all([
        teamRolesApi.getMembers().catch((err) => {
          console.error(err);
          return { members: [], customerContacts: [], metrics: {} };
        }),
        teamRolesApi.getAuditLogs().catch((err) => {
          console.error(err);
          return { audit_logs: [] };
        }),
      ]);

      setMembers(membersRes.members || []);
      setCustomerContacts(membersRes.customerContacts || []);
      if (membersRes.metrics) {
        setMetrics(membersRes.metrics);
      }
      setAuditLogs(auditRes.audit_logs || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch team and role data');
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers: Change Role ---
  const handleOpenChangeRole = (member) => {
    setSelectedMember(member);
    // default to next role or current
    setTargetRole(member.role);
    setChangeReason('');
    setConfirmStep(1);
    setIsChangeRoleModalOpen(true);
  };

  const handleExecuteChangeRole = async () => {
    if (!changeReason.trim()) {
      alert('A written justification reason is mandatory.');
      return;
    }
    try {
      await teamRolesApi.changeMemberRole(selectedMember.id, {
        new_role: targetRole,
        reason: changeReason.trim(),
      });
      showFeedback(`Role for ${selectedMember.user?.full_name || 'member'} updated to ${targetRole}!`);
      setIsChangeRoleModalOpen(false);
      fetchData();
    } catch (err) {
      alert(`Role change failed: ${err.message}`);
    }
  };

  // --- Handlers: Member Status (Suspend / Reactivate / Remove) ---
  const handleOpenStatusModal = (member, status) => {
    setStatusTargetMember(member);
    setTargetStatus(status);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  const handleExecuteStatusUpdate = async () => {
    if (!statusReason.trim()) {
      alert('A written reason is required.');
      return;
    }
    try {
      await teamRolesApi.updateMemberStatus(statusTargetMember.id, {
        status: targetStatus,
        reason: statusReason.trim(),
      });
      showFeedback(`Member status updated to '${targetStatus}'!`);
      setIsStatusModalOpen(false);
      fetchData();
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  // --- Handlers: Cross-Boundary Customer Promotion ---
  const handleOpenCrossBoundary = (contact) => {
    setSelectedCustomer(contact);
    setCbTargetRole('sales_rep');
    setCbReason('');
    setCbConfirmStep(1);
    setIsCrossBoundaryModalOpen(true);
  };

  const handleExecuteCrossBoundary = async () => {
    if (!cbReason.trim()) {
      alert('A written justification reason is mandatory for cross-boundary promotion.');
      return;
    }
    try {
      await teamRolesApi.crossBoundaryPromote({
        customer_user_id: selectedCustomer.user_id,
        target_role: cbTargetRole,
        reason: cbReason.trim(),
      });
      showFeedback(
        `Customer contact '${selectedCustomer.user?.full_name}' promoted to internal '${cbTargetRole}'!`
      );
      setIsCrossBoundaryModalOpen(false);
      fetchData();
    } catch (err) {
      alert(`Cross-boundary promotion failed: ${err.message}`);
    }
  };

  // --- Handlers: Invite Member ---
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    try {
      await teamRolesApi.inviteMember(inviteForm);
      showFeedback(`Invitation sent to ${inviteForm.email}!`);
      setIsInviteModalOpen(false);
      setInviteForm({ email: '', role: 'sales_rep', full_name: '' });
      fetchData();
    } catch (err) {
      alert(`Invite failed: ${err.message}`);
    }
  };

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = (m.user?.full_name || '').toLowerCase().includes(q);
    const emailMatch = (m.user?.email || '').toLowerCase().includes(q);
    const roleMatch = (m.role || '').toLowerCase().includes(q);
    const empIdMatch = (m.employee_identifier || '').toLowerCase().includes(q);
    const matchesSearch = !q || nameMatch || emailMatch || roleMatch || empIdMatch;

    if (!matchesSearch) return false;
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (activeTab === 'internal') return m.role !== 'customer_portal' && m.status === 'active';
    if (activeTab === 'suspended') return m.status === 'suspended';
    return true;
  });

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'role_admin';
      case 'sales_manager':
        return 'role_sales_manager';
      case 'finance_ops':
        return 'role_finance_ops';
      case 'sales_rep':
        return 'role_sales_rep';
      case 'customer_portal':
        return 'role_customer_portal';
      default:
        return 'tag';
    }
  };

  const formatRoleName = (role) => {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'sales_manager':
        return 'Sales Manager';
      case 'finance_ops':
        return 'Finance / Operations';
      case 'sales_rep':
        return 'Sales Representative';
      case 'customer_portal':
        return 'Customer Portal';
      default:
        return role ? role.replace('_', ' ') : 'Unknown';
    }
  };

  const formatJoinedDate = (m) => {
    const raw = m?.createdAt || m?.created_at || m?.user?.createdAt || m?.user?.created_at;
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#111826]">
              Team & Roles
            </h1>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Manage team members, roles, permissions, and account access across your organization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            icon={RefreshCw}
            className={loading ? 'animate-spin' : ''}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={UserPlus}
            onClick={() => setIsInviteModalOpen(true)}
          >
            Invite Team Member
          </Button>
        </div>
      </div>

      {/* Feedback & Error Banners */}
      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Total Members</p>
          <p className="text-2xl font-bold text-[#111826] mt-1">{metrics.total_members || members.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Active in {activeOrg?.trading_name || 'Organization'}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-[#724B66]">Admins</p>
            {metrics.admins_count <= 1 && (
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                Sole Admin
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-[#724B66] mt-1">{metrics.admins_count}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Can assign all roles</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Commercial Team</p>
          <p className="text-2xl font-bold text-[#111826] mt-1">{metrics.sales_count}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Reps & Sales Managers</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Finance & Ops</p>
          <p className="text-2xl font-bold text-[#111826] mt-1">{metrics.ops_count}</p>
          <p className="text-[11px] text-neutral-400 mt-1">Billing & Fulfillment</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">Customer Contacts</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{customerContacts.length}</p>
          <p className="text-[11px] text-neutral-400 mt-1">External client contacts</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-neutral-200/80">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'internal'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Internal Team ({members.filter((m) => m.role !== 'customer_portal' && m.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'customers'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Customer Contacts ({customerContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 whitespace-nowrap ${
              activeTab === 'suspended'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Suspended ({members.filter((m) => m.status === 'suspended').length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Audit Trail ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('reference')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'reference'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Role & Permissions Matrix
          </button>
        </div>
      </div>

      {/* --- TAB 1, 2, 4: MEMBERS SEARCH TOOLBAR & TABLE --- */}
      {['all', 'internal', 'suspended'].includes(activeTab) && (
        <div className="space-y-4">
          {/* Polished Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/80 shadow-2xs">
            <div className="flex flex-1 items-center gap-3">
              {/* Search Bar with centered icon and clear button */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name, email, role, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-neutral-50 hover:bg-white focus:bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition-all text-neutral-900 placeholder:text-neutral-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 p-0.5 rounded-full"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Role Filter Dropdown */}
              <div className="relative shrink-0">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="appearance-none text-xs font-medium pl-3 pr-8 py-2 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-lg text-neutral-700 outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Administrator</option>
                  <option value="sales_manager">Sales Manager</option>
                  <option value="finance_ops">Finance / Operations</option>
                  <option value="sales_rep">Sales Representative</option>
                  <option value="customer_portal">Customer Portal</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Results Count */}
            <div className="text-xs text-neutral-500 font-medium px-1 shrink-0 text-right sm:text-left">
              Showing <span className="font-semibold text-neutral-800">{filteredMembers.length}</span> of {members.length} members
            </div>
          </div>

          {/* Members Table */}
          <Card noPadding className="border border-neutral-200/80 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-50/80 text-neutral-600 uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-200/80">
                    <th className="py-3.5 px-4 font-semibold">Member Name</th>
                    <th className="py-3.5 px-4 font-semibold">Email / Identifier</th>
                    <th className="py-3.5 px-4 font-semibold">Role</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 text-sm">
                  {filteredMembers.map((m) => {
                    const isCurrentAdmin = m.user_id === currentUser?.id;
                    const isLastAdmin = m.role === 'admin' && metrics.admins_count <= 1;

                    return (
                      <tr key={m.id} className="hover:bg-neutral-50/60 transition-colors">
                        {/* Member Name & Avatar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#724B66]/10 text-[#724B66] font-bold text-xs flex items-center justify-center border border-[#724B66]/20 shrink-0">
                              {(m.user?.full_name || m.user?.email || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-neutral-900 flex items-center gap-2">
                                <span className="truncate">{m.user?.full_name || 'Anonymous User'}</span>
                                {isCurrentAdmin && (
                                  <span className="text-[10px] font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200 shrink-0">
                                    You
                                  </span>
                                )}
                              </div>
                              {m.employee_identifier && (
                                <span className="text-[11px] text-neutral-400 font-mono block">
                                  ID: {m.employee_identifier}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">
                          {m.user?.email}
                        </td>

                        {/* Role Badge */}
                        <td className="py-3.5 px-4">
                          <Badge variant={getRoleBadgeVariant(m.role)} dot={false}>
                            {formatRoleName(m.role)}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <Badge
                            status={m.status}
                            title={
                              m.status === 'active'
                                ? 'Active • Authorized workspace team member'
                                : m.status === 'suspended'
                                ? 'Suspended • User access disabled by administrator'
                                : `Status: ${m.status}`
                            }
                          >
                            {m.status ? m.status.charAt(0).toUpperCase() + m.status.slice(1) : 'Unknown'}
                          </Badge>
                        </td>

                        {/* Joined Date (Properly formatted) */}
                        <td className="py-3.5 px-4 text-xs text-neutral-500 font-medium whitespace-nowrap">
                          {formatJoinedDate(m)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={ArrowRightLeft}
                              onClick={() => handleOpenChangeRole(m)}
                            >
                              Change Role
                            </Button>

                            {m.status === 'active' ? (
                              <button
                                type="button"
                                disabled={isCurrentAdmin || isLastAdmin}
                                title={isCurrentAdmin ? "Cannot suspend yourself" : isLastAdmin ? "Cannot suspend sole administrator" : undefined}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-amber-700 hover:bg-amber-50 active:bg-amber-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                onClick={() => handleOpenStatusModal(m, 'suspended')}
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors"
                                onClick={() => handleOpenStatusModal(m, 'active')}
                              >
                                Reactivate
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isCurrentAdmin || isLastAdmin}
                              title={isCurrentAdmin ? "Cannot remove yourself" : isLastAdmin ? "Cannot remove sole administrator" : undefined}
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 active:bg-rose-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              onClick={() => handleOpenStatusModal(m, 'removed')}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-neutral-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                        <p className="text-sm font-medium text-neutral-600">No team members found</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Try adjusting your search query or role filter.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- TAB 3: CUSTOMER CONTACTS --- */}
      {activeTab === 'customers' && (
        <Card
          title="Customer Contacts"
          subtitle="External customer contacts established via bilateral relationships. You can promote contacts directly to internal team roles."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 text-neutral-600 uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-200/80">
                  <th className="py-3.5 px-4 font-semibold">Contact Name</th>
                  <th className="py-3.5 px-4 font-semibold">Email</th>
                  <th className="py-3.5 px-4 font-semibold">Customer Organization</th>
                  <th className="py-3.5 px-4 font-semibold">Current Scope</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {customerContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      {c.user?.full_name || 'Customer Contact'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-neutral-600">{c.user?.email}</td>
                    <td className="py-3.5 px-4 font-medium text-neutral-800">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                        {c.organization?.legal_name || 'Client Org'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant="warning">Customer Portal User</Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Sparkles}
                        onClick={() => handleOpenCrossBoundary(c)}
                      >
                        Promote to Internal Team
                      </Button>
                    </td>
                  </tr>
                ))}
                {customerContacts.length === 0 && (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-neutral-400">
                      <Users className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p className="text-sm font-medium text-neutral-600">No customer contacts found</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Contacts linked to bilateral customer accounts will appear here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- TAB 5: AUDIT TRAIL --- */}
      {activeTab === 'audit' && (
        <Card
          title="Role & Access Audit Log"
          subtitle="Activity records for all role modifications, member status updates, and account transitions."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-neutral-50/80 text-neutral-600 uppercase tracking-wider text-[11px] font-semibold border-b border-neutral-200/80">
                  <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold">Actor</th>
                  <th className="py-3.5 px-4 font-semibold">Target Member</th>
                  <th className="py-3.5 px-4 font-semibold">Transition</th>
                  <th className="py-3.5 px-4 font-semibold">Action</th>
                  <th className="py-3.5 px-4 font-semibold">Justification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 text-xs">
                    <td className="py-3.5 px-4 text-neutral-500 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      {log.actor_user?.full_name || log.actor_user?.email || 'Admin'}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-800 font-medium">
                      {log.target_user?.full_name || log.target_user?.email || 'Target User'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <span className="text-neutral-500 capitalize">{log.prior_role?.replace('_', ' ')}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="text-[#724B66] font-bold capitalize">{log.new_role?.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {log.is_cross_boundary ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Cross-Boundary
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 capitalize">
                          {log.action?.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-700 italic max-w-xs truncate">
                      "{log.reason}"
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-neutral-400">
                      <History className="w-8 h-8 mx-auto mb-2 text-neutral-300" />
                      <p className="text-sm font-medium text-neutral-600">No audit records found yet</p>
                      <p className="text-xs text-neutral-400 mt-0.5">Role modifications and access updates will automatically be logged here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- TAB 6: ROLE & PERMISSIONS MATRIX --- */}
      {activeTab === 'reference' && (
        <Card
          title="Role & Permissions Matrix"
          subtitle="Capability breakdown by role across workspace operations, commercial workflows, and administration."
          noPadding
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-neutral-50/90 border-b border-neutral-200/80">
                  <th className="py-4 px-5 text-xs font-bold text-neutral-700 uppercase tracking-wider w-[35%]">
                    Capability / Permission
                  </th>
                  <th className="py-4 px-3 text-center w-[13%]">
                    <Badge variant="role_admin" dot={false} className="mx-auto">Administrator</Badge>
                  </th>
                  <th className="py-4 px-3 text-center w-[13%]">
                    <Badge variant="role_sales_manager" dot={false} className="mx-auto">Sales Manager</Badge>
                  </th>
                  <th className="py-4 px-3 text-center w-[13%]">
                    <Badge variant="role_finance_ops" dot={false} className="mx-auto">Finance / Ops</Badge>
                  </th>
                  <th className="py-4 px-3 text-center w-[13%]">
                    <Badge variant="role_sales_rep" dot={false} className="mx-auto">Sales Rep</Badge>
                  </th>
                  <th className="py-4 px-3 text-center w-[13%]">
                    <Badge variant="role_customer_portal" dot={false} className="mx-auto">Customer Portal</Badge>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60 text-xs">
                {/* Section 1: Team & Workspace Access */}
                <tr className="bg-neutral-50/70">
                  <td colSpan="6" className="py-2.5 px-5 text-[11px] font-bold tracking-wider uppercase text-neutral-500">
                    Team & Workspace Access
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Assign & modify roles</div>
                    <div className="text-[11px] text-neutral-400">Promote, demote, or change team member roles</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Invite & suspend members</div>
                    <div className="text-[11px] text-neutral-400">Send workspace invitations or update membership status</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Convert customer contacts</div>
                    <div className="text-[11px] text-neutral-400">Promote external portal users to internal team roles</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>

                {/* Section 2: Commercial & Quotations */}
                <tr className="bg-neutral-50/70">
                  <td colSpan="6" className="py-2.5 px-5 text-[11px] font-bold tracking-wider uppercase text-neutral-500">
                    Commercial & Quotations
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Create & edit quotations</div>
                    <div className="text-[11px] text-neutral-400">Configure price lists, line items, and terms</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">All Deals</span>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-900 border border-blue-500/20">Own Deals</span>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Negotiate & counter-proposals</div>
                    <div className="text-[11px] text-neutral-400">Respond to customer comments and revise numbers</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-900 border border-blue-500/20">Assigned</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">Counter Only</span>
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Commercial quotation approvals</div>
                    <div className="text-[11px] text-neutral-400">Sign off on discount overrides and margin thresholds</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#724B66]/10 text-[#724B66] border border-[#724B66]/25">Executive</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-900 border border-amber-500/20">Manager Tier</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-900 border border-emerald-500/20">Credit Limit</span>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">Accept / Decline</span>
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Configure discount ceilings</div>
                    <div className="text-[11px] text-neutral-400">Define maximum allowable discounts per product category</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>

                {/* Section 3: Fulfillment & Inventory */}
                <tr className="bg-neutral-50/70">
                  <td colSpan="6" className="py-2.5 px-5 text-[11px] font-bold tracking-wider uppercase text-neutral-500">
                    Fulfillment & Operations
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Warehouse stock & inventory</div>
                    <div className="text-[11px] text-neutral-400">Receive stock, manage warehouse balances, and set reorder levels</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-700 border border-neutral-200/80">Full Access</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-900 border border-emerald-500/20">Manage Stock</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Order dispatch & shipping</div>
                    <div className="text-[11px] text-neutral-400">Ingest confirmed orders, split shipments, and mark delivered</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">Track Own</span>
                  </td>
                </tr>

                {/* Section 4: Invoicing & Subscriptions */}
                <tr className="bg-neutral-50/70">
                  <td colSpan="6" className="py-2.5 px-5 text-[11px] font-bold tracking-wider uppercase text-neutral-500">
                    Invoicing & Subscriptions
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Generate invoices & payments</div>
                    <div className="text-[11px] text-neutral-400">Post billing statements, record customer credits, and log receipts</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Subscription plans & lifecycle</div>
                    <div className="text-[11px] text-neutral-400">Manage recurring tiers, proration, and subscription renewals</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">View invoices & statements</div>
                    <div className="text-[11px] text-neutral-400">Access billing history and download invoice PDFs</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">View Only</span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200/80">Own Invoices</span>
                  </td>
                </tr>

                {/* Section 5: Analytics & Governance */}
                <tr className="bg-neutral-50/70">
                  <td colSpan="6" className="py-2.5 px-5 text-[11px] font-bold tracking-wider uppercase text-neutral-500">
                    Analytics & Governance
                  </td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">Deal health & risk analytics</div>
                    <div className="text-[11px] text-neutral-400">Monitor margin anomalies, stalled quotations, and slippage</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-900 border border-blue-500/20">Own Deals</span>
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
                <tr className="hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-5">
                    <div className="font-semibold text-neutral-800">System audit log</div>
                    <div className="text-[11px] text-neutral-400">Review full tamper-proof activity trail of all role and status updates</div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto" />
                  </td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                  <td className="py-3 px-3 text-center text-neutral-300 font-medium">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- MODAL 1: CHANGE ROLE MODAL (2-Step) --- */}
      <Modal
        isOpen={isChangeRoleModalOpen}
        onClose={() => setIsChangeRoleModalOpen(false)}
        title={confirmStep === 1 ? 'Change Member Role' : 'Confirm Role Change'}
      >
        {selectedMember && (
          <div className="space-y-4">
            {confirmStep === 1 ? (
              <>
                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200/60 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Member:</span>
                    <span className="font-bold text-[#111826]">{selectedMember.user?.full_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Email:</span>
                    <span className="font-mono text-neutral-700">{selectedMember.user?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Current Role:</span>
                    <Badge variant={getRoleBadgeVariant(selectedMember.role)}>
                      {formatRoleName(selectedMember.role)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                    Select New Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
                  >
                    <option value="sales_rep">Sales Representative</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="finance_ops">Finance / Operations</option>
                    <option value="admin">Administrator</option>
                    <option value="customer_portal">Customer Portal</option>
                  </select>
                </div>

                {/* Cross-Boundary Alert if applicable */}
                {((selectedMember.role === 'customer_portal' && targetRole !== 'customer_portal') ||
                  (selectedMember.role !== 'customer_portal' && targetRole === 'customer_portal')) && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cross-Boundary Role Transition</p>
                      <p className="mt-0.5">
                        Converting this user between a Customer Portal account and an Internal Team role
                        changes their access scope. Portal permissions for customer relationships will be updated accordingly.
                      </p>
                    </div>
                  </div>
                )}

                {/* Last Admin warning */}
                {selectedMember.role === 'admin' &&
                  targetRole !== 'admin' &&
                  metrics.admins_count <= 1 && (
                    <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Blocked: Sole Administrator Protection</p>
                        <p className="mt-0.5">
                          This organization has only 1 active Administrator. To prevent lockout, you must promote
                          another member to Administrator before changing this account's role.
                        </p>
                      </div>
                    </div>
                  )}

                <div>
                  <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                    Justification Reason <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g. Promoted following quarterly performance review..."
                    className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    required
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    This reason is recorded in the activity audit log.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
                  <Button variant="ghost" onClick={() => setIsChangeRoleModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    disabled={
                      !changeReason.trim() ||
                      targetRole === selectedMember.role ||
                      (selectedMember.role === 'admin' && targetRole !== 'admin' && metrics.admins_count <= 1)
                    }
                    onClick={() => setConfirmStep(2)}
                  >
                    Review & Confirm
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-[#724B66]/5 border border-[#724B66]/20 p-4 rounded-xl text-xs space-y-2">
                  <p className="font-bold text-[#724B66] text-sm">Review Role Modification</p>
                  <p className="text-neutral-700">
                    You are about to change the role of <strong>{selectedMember.user?.full_name}</strong> from{' '}
                    <span className="font-bold capitalize">{formatRoleName(selectedMember.role)}</span> to{' '}
                    <span className="font-bold text-[#724B66] capitalize">{formatRoleName(targetRole)}</span>.
                  </p>
                  <div className="pt-2 border-t border-neutral-200">
                    <span className="text-neutral-500 font-semibold block">Justification Reason:</span>
                    <span className="italic text-neutral-800 font-serif">"{changeReason}"</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-neutral-100">
                  <Button variant="ghost" onClick={() => setConfirmStep(1)}>
                    Back to Edit
                  </Button>
                  <Button variant="primary" onClick={handleExecuteChangeRole}>
                    Confirm Role Change
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* --- MODAL 2: SUSPEND / REMOVE STATUS MODAL --- */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={`Confirm Member ${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)}`}
      >
        {statusTargetMember && (
          <div className="space-y-4">
            <p className="text-xs text-neutral-600">
              Are you sure you want to mark <strong>{statusTargetMember.user?.full_name}</strong> as{' '}
              <strong className="capitalize">{targetStatus}</strong>?
            </p>

            {statusTargetMember.role === 'admin' &&
              ['suspended', 'removed'].includes(targetStatus) &&
              metrics.admins_count <= 1 && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-900 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Blocked: Sole Administrator Protection</p>
                    <p className="mt-0.5">
                      Cannot {targetStatus} the sole remaining Administrator of this organization.
                    </p>
                  </div>
                </div>
              )}

            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                Reason for Status Change <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="e.g. Employee offboarding or temporary account suspension..."
                className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setIsStatusModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant={targetStatus === 'removed' ? 'destructive' : 'primary'}
                disabled={
                  !statusReason.trim() ||
                  (statusTargetMember.role === 'admin' &&
                    ['suspended', 'removed'].includes(targetStatus) &&
                    metrics.admins_count <= 1)
                }
                onClick={handleExecuteStatusUpdate}
              >
                Confirm {targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- MODAL 3: CROSS-BOUNDARY PROMOTION MODAL --- */}
      <Modal
        isOpen={isCrossBoundaryModalOpen}
        onClose={() => setIsCrossBoundaryModalOpen(false)}
        title="Promote Customer Contact to Internal Team"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Cross-Boundary Role Transition
              </p>
              <p>
                Converting <strong>{selectedCustomer.user?.full_name}</strong> from{' '}
                <strong>{selectedCustomer.organization?.legal_name}</strong> into an internal team member.
                Their customer portal access for this bilateral relationship will be automatically transitioned.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                Target Internal Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={cbTargetRole}
                onChange={(e) => setCbTargetRole(e.target.value)}
                className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
              >
                <option value="sales_rep">Sales Representative</option>
                <option value="sales_manager">Sales Manager</option>
                <option value="finance_ops">Finance / Operations</option>
                <option value="admin">Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
                Justification Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={cbReason}
                onChange={(e) => setCbReason(e.target.value)}
                placeholder="e.g. Hired by provider organization as full-time account executive..."
                className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button variant="ghost" onClick={() => setIsCrossBoundaryModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!cbReason.trim()}
                onClick={handleExecuteCrossBoundary}
              >
                Confirm Conversion
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* --- MODAL 4: INVITE MEMBER MODAL --- */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite New Team Member"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Full Name <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={inviteForm.full_name}
              onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              placeholder="e.g. Sarah Connor"
              className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              value={inviteForm.email}
              onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              placeholder="s.connor@organization.com"
              className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#111826] uppercase tracking-wider mb-1">
              Initial Assigned Role <span className="text-rose-500">*</span>
            </label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
              className="w-full p-2.5 text-sm border border-neutral-300 rounded-lg bg-white outline-none focus:border-[#724B66]"
            >
              <option value="sales_rep">Sales Representative</option>
              <option value="sales_manager">Sales Manager</option>
              <option value="finance_ops">Finance / Operations</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeamRolesPage;
