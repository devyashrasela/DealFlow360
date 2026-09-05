import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { OrgCard } from '../components/OrgCard.jsx';

/**
 * WorkspaceSelectorPage — displayed when a user belongs to multiple organizations.
 * It shows a grid of OrgCard components. Selecting a card switches the active workspace
 * and routes the user to the appropriate entry point based on organization type.
 */
export function WorkspaceSelectorPage() {
  const { memberships, switchWorkspace } = useAuth();
  const navigate = useNavigate();

  const handleSelect = (membership) => {
    const org = membership.organization;
    if (!org) return navigate('/');
    switchWorkspace(membership.organization_id);
    if (org.organization_type === 'provider') {
      navigate(`/${org.slug}/dashboard`);
    } else {
      // Customer portal root – the router will resolve the appropriate context.
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Select Workspace</h1>
          <p className="text-gray-400 mt-1 text-sm">You belong to multiple organizations. Choose one to continue.</p>
        </div>

        {/* Membership cards */}
        <div className="grid grid-cols-1 gap-4">
          {memberships.map((m) => (
            <OrgCard
              key={m.id}
              org={m.organization}
              role={m.role}
              onSelect={() => handleSelect(m)}
            />
          ))}
        </div>

        {/* Empty state */}
        {memberships.length === 0 && (
          <p className="text-center text-gray-500 text-sm mt-4">
            No workspaces found. Contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
}
