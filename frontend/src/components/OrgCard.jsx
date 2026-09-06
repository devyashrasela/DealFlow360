import React from 'react';
import { Building, Briefcase, ArrowRight } from 'lucide-react';

/**
 * OrgCard – premium workspace selection card.
 */
export function OrgCard({ org, role, onSelect }) {
  const displayName = org?.trading_name || org?.legal_name || org?.slug || 'Organization';
  const type = org?.organization_type || 'org';
  const isProvider = type === 'provider';

  const roleBadgeColors = {
    admin: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    sales_manager: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    sales_rep: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    finance_ops: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    customer_portal: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  };

  const roleDisplay = role?.replace(/_/g, ' ') || 'member';
  const badgeColor = roleBadgeColors[role] || 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30';

  return (
    <button
      onClick={onSelect}
      className="cursor-pointer w-full rounded-xl border border-neutral-700/80 bg-[#1b2230] hover:bg-[#242d3d] hover:border-[#724B66]/50 transition-all duration-200 p-4 flex items-center gap-4 group text-left"
    >
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200 ${
        isProvider
          ? 'bg-[#724B66]/15 border-[#724B66]/30 text-[#E892A2] group-hover:bg-[#724B66]/25'
          : 'bg-emerald-600/15 border-emerald-600/30 text-emerald-400 group-hover:bg-emerald-600/25'
      }`}>
        {isProvider ? <Briefcase className="w-5 h-5" /> : <Building className="w-5 h-5" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white truncate group-hover:text-[#E892A2] transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md border capitalize ${badgeColor}`}>
            {roleDisplay}
          </span>
          <span className="text-[10px] text-neutral-500 font-mono uppercase">{type}</span>
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-neutral-600 group-hover:text-[#724B66] group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
