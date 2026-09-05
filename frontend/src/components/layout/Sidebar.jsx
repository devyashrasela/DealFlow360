import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  Settings,
  ChevronDown,
} from 'lucide-react';

const MAIN_NAV = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Quotations', path: '/quotations', icon: FileText },
  { name: 'Approvals', path: '/approvals', icon: Users },
  { name: 'Fulfillment', path: '/fulfillment', icon: Package },
  { name: 'Subscriptions', path: '/subscriptions', icon: Repeat },
  { name: 'Invoices', path: '/invoices', icon: Receipt },
  { name: 'Deal Health', path: '/deal-health', icon: Activity },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
];

const CONFIG_NAV = [
  { name: 'Products', path: '/products', icon: Box },
  { name: 'Price Lists', path: '/price-lists', icon: Tags },
  { name: 'Discount Rules', path: '/discount-rules', icon: Percent },
  { name: 'Approval Chains', path: '/approval-chains', icon: GitBranch },
  { name: 'Warehouses', path: '/warehouses', icon: WarehouseIcon },
  { name: 'Subscription Plans', path: '/subscription-plans', icon: Layers },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="w-64 bg-[#111826] text-[#FFFFFF] flex flex-col h-screen shrink-0 select-none border-r border-neutral-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-neutral-800/80">
        <span className="text-xl font-bold tracking-tight text-[#FFFFFF]">
          DealFlow<span className="italic text-[#724B66]">360</span>
        </span>
      </div>

      {/* Organization Switcher */}
      <div className="px-4 py-3 border-b border-neutral-800/50">
        <button className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium bg-[#2E3141]/50 hover:bg-[#2E3141] rounded-lg text-neutral-200 transition">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-6 h-6 rounded bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold shrink-0">
              A
            </div>
            <span className="truncate">ACME Corp</span>
          </div>
          <ChevronDown className="w-4 h-4 text-neutral-400 shrink-0" />
        </button>
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

        {/* Configuration Section */}
        <div className="pt-2 border-t border-neutral-800/60 space-y-1">
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

      {/* Settings Footer */}
      <div className="p-3 border-t border-neutral-800/80">
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-neutral-400 hover:text-[#FFFFFF] hover:bg-[#2E3141]/40 transition"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
      </div>
    </aside>
  );
};
