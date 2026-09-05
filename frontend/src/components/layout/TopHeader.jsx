import React from 'react';
import { Search, Bell, RefreshCw, Calendar } from 'lucide-react';

export const TopHeader = ({ onRefresh, isRefreshing = false }) => {
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
            className="p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] hover:text-[#724B66] transition"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#724B66]' : ''}`} />
          </button>
        )}

        {/* Notification Bell */}
        <button className="relative p-2 rounded-lg text-[#2E3141] hover:bg-[#F3F2F2] transition">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#724B66] absolute top-1.5 right-1.5 ring-2 ring-[#FFFFFF]"></span>
        </button>

        <div className="h-6 w-px bg-neutral-200"></div>

        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#724B66] text-[#FFFFFF] flex items-center justify-center text-xs font-bold ring-2 ring-[#724B66]/20">
            AS
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-semibold text-[#111826]">Alex Sharma</p>
            <p className="text-[11px] text-[#2E3141]/60">Operations & Logistics</p>
          </div>
        </div>
      </div>
    </header>
  );
};
