import React from 'react';
import { Building, Briefcase, ArrowRight } from 'lucide-react';
import { Badge } from './ui/Badge.jsx';

/**
 * OrgCard – premium workspace selection card.
 */
export function OrgCard({ org, role, onSelect }) {
  const displayName = org?.trading_name || org?.legal_name || org?.slug || 'Organization';
  const type = org?.organization_type || 'org';
  const isProvider = type === 'provider';

  const roleDisplay = role?.replace(/_/g, ' ') || 'member';

  return (
    <button
      onClick={onSelect}
      className="cursor-pointer w-full rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 hover:border-[#724B66]/30 transition-all duration-200 p-4 flex items-center gap-4 group text-left"
    >
      {/* Icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors duration-200 ${
        isProvider
          ? 'bg-[#724B66]/10 border-[#724B66]/20 text-[#724B66] group-hover:bg-[#724B66]/15'
          : 'bg-emerald-50 border-emerald-200 text-emerald-600 group-hover:bg-emerald-100'
      }`}>
        {isProvider ? <Briefcase className="w-5 h-5" /> : <Building className="w-5 h-5" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-[#111826] truncate group-hover:text-[#724B66] transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 mt-1.5">
          <Badge status={`role_${role}`} size="sm" className="capitalize">
            {roleDisplay}
          </Badge>
          <span className="text-[10px] text-neutral-400 font-mono uppercase">{type}</span>
        </div>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-neutral-400 group-hover:text-[#724B66] group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
