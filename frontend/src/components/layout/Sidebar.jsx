import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
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
  MessageSquare,
  User,
  LogOut,
  Building
} from 'lucide-react';

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeOrg, memberships, switchWorkspace, logout } = useAuth();
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  const orgSlug = activeOrg?.slug || 'acme';
  const orgName = activeOrg?.trading_name || activeOrg?.legal_name || 'Organization';

  const MAIN_NAV = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Quotations', path: '/quotations', icon: FileText },
    { name: 'Approvals', path: '/approvals', icon: Users },
    { name: 'Fulfillment', path: '/fulfillment', icon: Package },
    { name: 'Subscriptions', path: `/${orgSlug}/subscriptions`, icon: Repeat },
    { name: 'Invoices', path: `/${orgSlug}/invoices`, icon: Receipt },
    { name: 'Deal Health', path: '/deal-health', icon: Activity },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Admin Catalog', path: '/admin/catalog', icon: Settings },
    { name: 'Governance', path: '/admin/governance', icon: ShieldCheck }
  ];

  const CUSTOMER_PORTAL_NAV = [
    { name: 'Portal Dashboard', path: `/${orgSlug}/techstart/dashboard`, icon: LayoutDashboard },
    { name: 'My Quotes', path: `/${orgSlug}/techstart/quotes`, icon: FileText },
    { name: 'Messages', path: `/${orgSlug}/techstart/messages`, icon: MessageSquare },
    { name: 'Company Profile', path: `/${orgSlug}/techstart/profile`, icon: User },
  ];

  const CONFIG_NAV = [
    { name: 'Products', path: '/products', icon: Box },
    { name: 'Price Lists', path: '/price-lists', icon: Tags },
    { name: 'Discount Rules', path: '/discount-rules', icon: Percent },
    { name: 'Approval Chains', path: '/approval-chains', icon: GitBranch },
    { name: 'Warehouses', path: '/warehouses', icon: WarehouseIcon },
    { name: 'Subscription Plans', path: '/subscription-plans', icon: Layers },
  ];

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
          onClick={() => memberships.length > 1 && setOrgDropdownOpen((prev) => !prev)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-[#2E3141]/50 hover:bg-[#2E3141] rounded-lg text-neutral-200 transition ${memberships.length > 1 ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold shrink-0">
              {orgName.charAt(0).toUpperCase()}
            </div>
            <span className="truncate">{orgName}</span>
          </div>
          {memberships.length > 1 && (
            <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
          )}
        </button>

        {/* Dropdown for org switcher */}
        {orgDropdownOpen && memberships.length > 1 && (
          <div className="absolute left-4 right-4 top-14 bg-[#2E3141] border border-neutral-700 rounded-lg shadow-xl py-1 z-50">
            {memberships.map((m) => (
              <button
                key={m.organization_id}
                onClick={() => {
                  switchWorkspace(m.organization_id);
                  setOrgDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#111826] text-neutral-200 flex items-center justify-between"
              >
                <span className="truncate">{m.organization?.trading_name || m.organization?.legal_name}</span>
                <span className="text-[10px] text-neutral-400 uppercase font-mono">{m.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
        {/* Main Section */}
        <div className="space-y-1">
          {MAIN_NAV.map((item) => {
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
        
        {/* Customer Portal Demo Section */}
        <div className="pt-2 border-t border-neutral-800/60 space-y-1">
          <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Customer View Demo</p>
          {CUSTOMER_PORTAL_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

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

        {/* Configuration Section */}
        <div className="pt-2 border-t border-neutral-800/60 space-y-1">
           <p className="px-3 text-[10px] font-bold text-neutral-500 uppercase tracking-wider mb-2">Configuration</p>
          {CONFIG_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);

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
      </div>

      {/* Footer (Settings & Logout) */}
      <div className="p-3 border-t border-neutral-800/80 space-y-1">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-[#FFFFFF] hover:bg-[#2E3141]/40 transition"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
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
