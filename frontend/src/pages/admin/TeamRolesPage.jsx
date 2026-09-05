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
    const q = searchQuery.toLowerCase();
    const nameMatch = (m.user?.full_name || '').toLowerCase().includes(q);
    const emailMatch = (m.user?.email || '').toLowerCase().includes(q);
    const roleMatch = (m.role || '').toLowerCase().includes(q);
    const matchesSearch = nameMatch || emailMatch || roleMatch;

    if (!matchesSearch) return false;
    if (activeTab === 'internal') return m.role !== 'customer_portal' && m.status === 'active';
    if (activeTab === 'suspended') return m.status === 'suspended';
    return true;
  });

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'admin':
        return 'primary'; // aubergine
      case 'sales_manager':
        return 'warning';
      case 'finance_ops':
        return 'success';
      case 'sales_rep':
        return 'pickpack';
      case 'customer_portal':
        return 'outline';
      default:
        return 'default';
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
        return 'Customer Portal User';
      default:
        return role ? role.replace('_', ' ') : 'Unknown';
    }
  };

  return (
    <div className="space-y-6 pb-12 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/60 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-[#111826]">
              Team & Roles Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#724B66]/15 text-[#724B66] border border-[#724B66]/30">
              Screen 19 • RBAC Governance
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Govern organizational memberships, authority elevation, cross-boundary transitions, and audit trails.
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
          <p className="text-[11px] text-neutral-400 mt-1">Full Promotion Authority</p>
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
          <p className="text-[11px] text-neutral-400 mt-1">Bilateral Portal Users</p>
        </div>
      </div>

      {/* Tabs & Search Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/60">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'all'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            All Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('internal')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'internal'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Internal Team ({members.filter((m) => m.role !== 'customer_portal' && m.status === 'active').length})
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'customers'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Customer Contacts ({customerContacts.length})
          </button>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 ${
              activeTab === 'suspended'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            Suspended ({members.filter((m) => m.status === 'suspended').length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
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
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition border-b-2 flex items-center gap-1.5 ${
              activeTab === 'reference'
                ? 'border-[#724B66] text-[#724B66] bg-[#724B66]/5'
                : 'border-transparent text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Role Authority Matrix
          </button>
        </div>

        {activeTab !== 'audit' && activeTab !== 'reference' && (
          <div className="relative w-full sm:w-64 pb-2">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              placeholder="Search member, email, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-neutral-300 rounded-lg focus:outline-none focus:border-[#724B66]"
            />
          </div>
        )}
      </div>

      {/* --- TAB 1, 2, 4: MEMBERS TABLE --- */}
      {['all', 'internal', 'suspended'].includes(activeTab) && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                <tr>
                  <th className="p-3.5">Member Name</th>
                  <th className="p-3.5">Email / Identifier</th>
                  <th className="p-3.5">Current Role</th>
                  <th className="p-3.5">Membership Status</th>
                  <th className="p-3.5">Joined Date</th>
                  <th className="p-3.5 text-right">Governed Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {filteredMembers.map((m) => {
                  const isCurrentAdmin = m.user_id === currentUser?.id;
                  const isLastAdmin = m.role === 'admin' && metrics.admins_count <= 1;

                  return (
                    <tr key={m.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#724B66]/10 text-[#724B66] font-bold text-xs flex items-center justify-center border border-[#724B66]/20">
                            {(m.user?.full_name || m.user?.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111826] flex items-center gap-2">
                              {m.user?.full_name || 'Anonymous User'}
                              {isCurrentAdmin && (
                                <span className="text-[10px] bg-neutral-100 text-neutral-600 px-1.5 py-0.2 rounded font-normal">
                                  You
                                </span>
                              )}
                            </div>
                            {m.employee_identifier && (
                              <span className="text-[11px] text-neutral-400 font-mono">
                                ID: {m.employee_identifier}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-xs text-neutral-600">{m.user?.email}</td>
                      <td className="p-3.5">
                        <Badge variant={getRoleBadgeVariant(m.role)}>
                          {formatRoleName(m.role)}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.status === 'suspended'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-300'
                          }`}
                        >
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="p-3.5 text-xs text-neutral-500">
                        {new Date(m.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={ArrowRightLeft}
                          onClick={() => handleOpenChangeRole(m)}
                        >
                          Change Role
                        </Button>

                        {m.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-700 hover:bg-amber-50"
                            onClick={() => handleOpenStatusModal(m, 'suspended')}
                          >
                            Suspend
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleOpenStatusModal(m, 'active')}
                          >
                            Reactivate
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleOpenStatusModal(m, 'removed')}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-neutral-400 italic">
                      No members match the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- TAB 3: CUSTOMER CONTACTS (CROSS-BOUNDARY PROMOTION) --- */}
      {activeTab === 'customers' && (
        <Card
          title="Customer Portal Contacts"
          subtitle="Customer-side contacts established via bilateral relationships. Convert to internal roles via Governed Cross-Boundary Promotion."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                <tr>
                  <th className="p-3.5">Customer Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Customer Organization</th>
                  <th className="p-3.5">Current Scope</th>
                  <th className="p-3.5 text-right">Governed Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {customerContacts.map((c) => (
                  <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-3.5 font-semibold text-[#111826]">
                      {c.user?.full_name || 'Customer Contact'}
                    </td>
                    <td className="p-3.5 font-mono text-xs text-neutral-600">{c.user?.email}</td>
                    <td className="p-3.5 font-medium text-neutral-800">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-neutral-400" />
                        {c.organization?.legal_name || 'Client Org'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <Badge variant="warning">Customer Portal User</Badge>
                    </td>
                    <td className="p-3.5 text-right">
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
                    <td colSpan="5" className="p-8 text-center text-neutral-400 italic">
                      No customer contacts found across bilateral accounts.
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
          title="Role Promotion & Access Audit Trail"
          subtitle="Immutable, tamper-proof audit records for every role modification, suspension, and cross-boundary transition."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Actor (Admin)</th>
                  <th className="p-3.5">Target Member</th>
                  <th className="p-3.5">Transition</th>
                  <th className="p-3.5">Governed Action</th>
                  <th className="p-3.5">Mandatory Justification Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 text-xs">
                    <td className="p-3.5 text-neutral-500 font-mono whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-semibold text-[#111826]">
                      {log.actor_user?.full_name || log.actor_user?.email || 'Admin'}
                    </td>
                    <td className="p-3.5 text-neutral-800 font-medium">
                      {log.target_user?.full_name || log.target_user?.email || 'Target User'}
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 font-mono">
                        <span className="text-neutral-500 capitalize">{log.prior_role}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="text-[#724B66] font-bold capitalize">{log.new_role}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      {log.is_cross_boundary ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Cross-Boundary
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 capitalize">
                          {log.action.replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-neutral-700 italic max-w-xs truncate">
                      "{log.reason}"
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-neutral-400 italic">
                      No role change audit records found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* --- TAB 6: ROLE AUTHORITY MATRIX --- */}
      {activeTab === 'reference' && (
        <div className="space-y-6">
          <Card
            title="Role Promotion Authority Matrix"
            subtitle="As defined in PRD Section 4: Only an Admin can promote, demote, or modify roles within their organization."
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                  <tr>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Scope</th>
                    <th className="p-3.5 text-center">Can Change Roles?</th>
                    <th className="p-3.5">Key Capabilities</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60 text-xs">
                  <tr>
                    <td className="p-3.5 font-bold text-[#724B66]">Administrator</td>
                    <td className="p-3.5">Organization-wide</td>
                    <td className="p-3.5 text-center font-bold text-emerald-700">
                      ✅ Yes (Exclusive Authority)
                    </td>
                    <td className="p-3.5 text-neutral-600">
                      Full platform oversight, pricing policies, risk slabs, team promotion/demotion.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-neutral-800">Sales Manager</td>
                    <td className="p-3.5">Organization-wide</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">❌ No</td>
                    <td className="p-3.5 text-neutral-600">
                      Margin oversight, commercial quotation approvals, rep performance analytics.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-neutral-800">Finance / Ops</td>
                    <td className="p-3.5">Organization-wide</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">❌ No</td>
                    <td className="p-3.5 text-neutral-600">
                      Multi-warehouse inventory fulfillment, invoice processing, subscription lifecycle.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-neutral-800">Sales Representative</td>
                    <td className="p-3.5">Assigned Customers only</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">❌ No</td>
                    <td className="p-3.5 text-neutral-600">
                      Quotation builder, pricing negotiations, deal health diagnostics.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3.5 font-bold text-neutral-800">Customer (Portal User)</td>
                    <td className="p-3.5">Own Relationship only</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">❌ No</td>
                    <td className="p-3.5 text-neutral-600">
                      Review quotations, submit counter-proposals, download invoices, track dispatches.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* --- MODAL 1: CHANGE ROLE MODAL (2-Step) --- */}
      <Modal
        isOpen={isChangeRoleModalOpen}
        onClose={() => setIsChangeRoleModalOpen(false)}
        title={confirmStep === 1 ? 'Change Member Role' : 'Confirm Governed Role Elevation'}
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
                    <option value="customer_portal">Customer Portal User</option>
                  </select>
                </div>

                {/* Cross-Boundary Alert if applicable */}
                {((selectedMember.role === 'customer_portal' && targetRole !== 'customer_portal') ||
                  (selectedMember.role !== 'customer_portal' && targetRole === 'customer_portal')) && (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Cross-Boundary Role Transition Warning</p>
                      <p className="mt-0.5">
                        Converting this user between a Customer Portal User and an Internal Team role
                        fundamentally alters access context. Customer relationship access will be synchronized.
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
                          This organization has only 1 active Admin. To prevent lockout, you must promote
                          another member to Administrator before demoting this account.
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
                    placeholder="e.g. Promoted following quarterly performance review and oversight expansion..."
                    className="w-full p-2.5 text-xs border border-neutral-300 rounded-lg outline-none focus:border-[#724B66]"
                    required
                  />
                  <p className="text-[10px] text-neutral-400 mt-1">
                    This justification is permanently stored in the immutable audit log.
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
                  <p className="font-bold text-[#724B66] text-sm">Review Governed Role Modification</p>
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
                    Confirm & Audit Role Change
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
                      Cannot {targetStatus} the sole remaining Admin of this organization.
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
                placeholder="e.g. Employee offboarding or temporary administrative suspension..."
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
                Cross-Boundary Promotion Workflow (PRD Section 9)
              </p>
              <p>
                Converting <strong>{selectedCustomer.user?.full_name}</strong> from{' '}
                <strong>{selectedCustomer.organization?.legal_name}</strong> into an internal team member.
                Their customer portal privileges for this bilateral relationship will be automatically revoked.
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
                Execute Conversion
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
              Send Membership Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TeamRolesPage;
