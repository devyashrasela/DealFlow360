import React from 'react';
import { Building, User, Briefcase } from 'lucide-react';

/**
 * OrgCard – visual card presenting an organization option.
 * Props:
 *   - org: organization object (slug, trading_name, legal_name, organization_type)
 *   - role: membership role string
 *   - onSelect: callback when the card is clicked
 */
export function OrgCard({ org, role, onSelect }) {
  const displayName = org?.trading_name || org?.legal_name || org?.slug || 'Organization';
  const type = org?.organization_type || 'org';
  const typeColor = type === 'provider' ? 'bg-indigo-600/20 text-indigo-300 border-indigo-700/50' : 'bg-emerald-600/20 text-emerald-300 border-emerald-700/50';
  const Icon = type === 'provider' ? Briefcase : Building;

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer w-full max-w-sm rounded-xl border border-neutral-700 bg-[#2E3141] hover:bg-[#3A3E4F] transition p-4 flex flex-col items-start"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded ${typeColor} flex items-center justify-center border`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-medium text-white">{displayName}</h3>
      </div>
      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${typeColor}`}> {type} </span>
      <p className="mt-2 text-xs text-neutral-400 capitalize">Role: {role?.replace('_', ' ')}</p>
    </div>
  );
}
