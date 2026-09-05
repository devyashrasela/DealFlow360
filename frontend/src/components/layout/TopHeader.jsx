import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, RefreshCw, LogOut, ChevronDown, User, Shield, Building } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export const TopHeader = ({ onRefresh, isRefreshing = false }) => {
  const { user, activeRole, activeOrg, memberships, switchWorkspace, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatRole = (role) => {
    if (!role) return 'Member';
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-neutral-200/80 px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Global Search Bar */}
      <div className="relative w-96 max-w-md">
        <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search quotations, customers, orders..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-[#F3F2F2] border border-transparent rounded-lg text-[#111826] placeholder-neutral-400 focus:outline-none focus:bg-[#FFFFFF] focus:border-[#724B66]/50 transition"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Global Reload Trigger */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Reload Data"
            className="p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] hover:text-[#724B66] transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#724B66]' : ''}`} />
          </button>
        )}

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] transition cursor-pointer">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#724B66] absolute top-1.5 right-1.5 ring-2 ring-[#FFFFFF]"></span>
        </button>

        <div className="h-6 w-px bg-neutral-200"></div>

        {/* User Badge with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F3F2F2] transition cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold ring-2 ring-[#724B66]/20">
              {getInitials(user?.full_name)}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-xs font-semibold text-[#111826] leading-tight">
                {user?.full_name || 'User'}
              </p>
              <p className="text-[11px] text-[#2E3141]/60 leading-tight">
                {formatRole(activeRole)}
              </p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-400 ml-0.5" />
          </button>

          {/* User Menu Dropdown */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-[#FFFFFF] rounded-xl shadow-lg border border-neutral-200/90 py-2 z-50 text-sm animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2.5 border-b border-neutral-100">
                <p className="text-xs font-semibold text-[#111826]">{user?.full_name}</p>
                <p className="text-[11px] text-[#2E3141]/60 truncate">{user?.email}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[#724B66] font-medium bg-[#724B66]/10 px-2 py-0.5 rounded-md w-fit">
                  <Shield className="w-3 h-3" />
                  <span>{formatRole(activeRole)}</span>
                </div>
              </div>

              {activeOrg && (
                <div className="px-4 py-2 border-b border-neutral-100 bg-neutral-50/50">
                  <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Organization</span>
                  <p className="text-xs font-medium text-[#111826] truncate mt-0.5">
                    {activeOrg.trading_name || activeOrg.legal_name || 'Organization'}
                  </p>
                </div>
              )}

              {/* Workspace switcher if user belongs to multiple orgs */}
              {memberships.length > 1 && (
                <div className="px-2 py-1.5 border-b border-neutral-100">
                  <p className="px-2 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Switch Org</p>
                  {memberships.map((m) => (
                    <button
                      key={m.organization_id}
                      onClick={() => {
                        switchWorkspace(m.organization_id);
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-2 py-1 text-xs rounded hover:bg-neutral-100 flex items-center justify-between"
                    >
                      <span className="truncate">{m.organization?.trading_name || m.organization?.legal_name}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{m.role}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
