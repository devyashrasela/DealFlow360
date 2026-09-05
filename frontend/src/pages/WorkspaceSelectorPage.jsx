import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * WorkspaceSelectorPage — shown when a user has multiple memberships.
 * FR-1.3: Smart post-login routing for multi-tenant users.
 */
export function WorkspaceSelectorPage() {
  const { memberships, switchWorkspace } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (membership) => {
    switchWorkspace(membership.organization_id);
    const org = membership.organization;
    if (!org) {
      navigate('/');
      return;
    }
    if (org.organization_type === 'provider') {
      navigate(`/${org.slug}/dashboard`);
    } else {
      // customer — go to portal root; slug-based nav will resolve context
      navigate('/portal');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-600/20 mb-4">
            <svg className="w-7 h-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Select Workspace</h1>
          <p className="text-gray-400 mt-1 text-sm">You belong to multiple organizations. Choose one to continue.</p>
        </div>

        {/* Membership list */}
        <ul className="space-y-3">
          {memberships.map((m) => {
            const org = m.organization;
            const typeColor = org?.organization_type === 'provider'
              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-700/50'
              : 'bg-emerald-600/20 text-emerald-300 border-emerald-700/50';

            return (
              <li key={m.id}>
                <button
                  onClick={() => handleSelect(m)}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-lg bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-indigo-600 transition-all group"
                >
                  {/* Org avatar */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold text-lg">
                    {(org?.trading_name || org?.legal_name || '?')[0].toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">
                      {org?.trading_name || org?.legal_name || m.organization_id}
                    </p>
                    <p className="text-gray-400 text-xs capitalize mt-0.5">{m.role?.replace('_', ' ')}</p>
                  </div>

                  {/* Type badge */}
                  <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded border font-medium capitalize ${typeColor}`}>
                    {org?.organization_type || 'org'}
                  </span>

                  {/* Arrow */}
                  <svg className="flex-shrink-0 w-4 h-4 text-gray-500 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </li>
            );
          })}
        </ul>

        {memberships.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">No workspaces found. Contact your administrator.</p>
        )}
      </div>
    </div>
  );
}
