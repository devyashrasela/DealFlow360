import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { isNavVisible } from '../../rbac/permissions.js';
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Repeat,
  Receipt,
  Activity,
  BarChart3,
  Box,
  Tags,
  Percent,
  GitBranch,
  Warehouse as WarehouseIcon,
  Layers,
  Settings, ShieldCheck,
  ChevronDown,
  LogOut,
  Plus,
  Check,
  ArrowLeftRight,
  DollarSign
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeOrg, activeRole, memberships, switchWorkspace, logout } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const orgSlug = activeOrg?.slug || 'acme';
  const orgName = activeOrg?.trading_name || activeOrg?.legal_name || 'Organization';

  // ── Nav definitions with role-gated paths ────────────────────────────────
  const MAIN_NAV = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Quotations', path: '/quotations', icon: FileText },
    { name: 'Approvals', path: '/approvals', icon: Users },
    { name: 'Fulfillment', path: '/fulfillment', icon: Package },
    { name: 'Subscriptions', path: `/${orgSlug}/subscriptions`, icon: Repeat },
    { name: 'Invoices', path: `/${orgSlug}/invoices`, icon: Receipt },
    { name: 'Deal Health', path: '/deal-health', icon: Activity },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
  ];

  const CONFIG_NAV = [
    { name: 'Catalog & Products', path: '/catalog', icon: Box },
    { name: 'Discount Rules', path: '/discount-rules', icon: Percent },
    { name: 'Approval Chains', path: '/approval-chains', icon: GitBranch },
    { name: 'Warehouses', path: '/warehouses', icon: WarehouseIcon },
    { name: 'Exchange Rates', path: '/exchange-rates', icon: DollarSign },
    { name: 'Team & Roles', path: '/team-roles', icon: Users },
  ];

  // Filter nav items by role
  const visibleMain = MAIN_NAV.filter((item) => isNavVisible(activeRole, item.path));
  const visibleConfig = CONFIG_NAV.filter((item) => isNavVisible(activeRole, item.path));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-[#111826] text-[#FFFFFF] flex flex-col h-screen shrink-0 select-none border-r border-neutral-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-800/80">
        <span className="text-xl font-bold tracking-tight text-[#FFFFFF]">
          DealFlow<span className="italic text-[#724B66]">360</span>
        </span>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-neutral-800/50 relative">
        <button
          onClick={() => setOrgDropdownOpen((prev) => !prev)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-[#2E3141]/50 hover:bg-[#2E3141] rounded-lg text-neutral-200 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold shrink-0">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{orgName}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${orgDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Role Badge */}
        {activeRole && (
          <div className="mt-2 px-3">
            <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-[#724B66]/20 text-[#724B66] border border-[#724B66]/30">
              {activeRole.replace('_', ' ')}
            </span>
          </div>
        )}

        {/* Dropdown for org switcher */}
        {orgDropdownOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOrgDropdownOpen(false)}
            />
            <div className="absolute left-4 right-4 top-14 bg-[#1b2230] border border-neutral-700 rounded-lg shadow-2xl py-1.5 z-50">
              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                Workspaces ({memberships.length})
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-800/40">
                {memberships.map((m) => {
                  const isCurrent = m.organization_id === activeOrg?.id;
                  return (
                    <button
                      key={m.organization_id}
                      onClick={() => {
                        switchWorkspace(m.organization_id);
                        setOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-[#2E3141] text-neutral-200 flex items-center justify-between transition cursor-pointer ${
                        isCurrent ? 'bg-[#2E3141]/60 font-semibold text-white' : ''
                      }`}
                    >
                      <div className="truncate flex items-center gap-1.5">
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#E892A2] shrink-0" />}
                        <span className="truncate">{m.organization?.trading_name || m.organization?.legal_name}</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono ml-2 shrink-0">{m.role}</span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-neutral-800 mt-1 pt-1 space-y-0.5">
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    navigate('/select-workspace?create=true');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-[#E892A2] hover:bg-[#2E3141] flex items-center gap-2 font-medium transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>Create Workspace</span>
                </button>
                <button
                  onClick={() => {
                    setOrgDropdownOpen(false);
                    navigate('/select-workspace');
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-neutral-300 hover:bg-[#2E3141] flex items-center gap-2 transition cursor-pointer"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span>Switch Workspace</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {/* Main Section */}
        <div className="space-y-1">
          {visibleMain.map((item) => {
            const Icon = item.icon;
            const isActive = item.path === '/' 
              ? location.pathname === '/' 
              : location.pathname.startsWith(item.path);

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition duration-150 ${
                  isActive
                    ? 'bg-[#724B66] text-[#FFFFFF] shadow-sm font-semibold'
                    : 'text-neutral-400 hover:text-[#FFFFFF] hover:bg-[#2E3141]/40'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Configuration Section — admin only */}
        {visibleConfig.length > 0 && (
          <div className="pt-2 border-t border-neutral-800/60 space-y-1">
            <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Configuration</p>
            {visibleConfig.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path) || (item.path === '/catalog' && (
                location.pathname.startsWith('/products') ||
                location.pathname.startsWith('/price-lists') ||
                location.pathname.startsWith('/subscription-plans') ||
                location.pathname.startsWith('/admin/catalog')
              ));

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-2 rounded-lg text-xs font-medium transition duration-150 ${
                    isActive
                      ? 'bg-[#724B66] text-[#FFFFFF]'
                      : 'text-neutral-400 hover:text-[#FFFFFF] hover:bg-[#2E3141]/40'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer (Settings & Logout) */}
      <div className="p-3 border-t border-neutral-800/80 space-y-1">
        {isNavVisible(activeRole, '/settings') && (
          <NavLink
            to="/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-[#FFFFFF] hover:bg-[#2E3141]/40 transition"
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Settings</span>
          </NavLink>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

