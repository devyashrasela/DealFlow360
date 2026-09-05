import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { OrgCard } from '../components/OrgCard.jsx';
import { Plus } from 'lucide-react';

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

  const handleCreateOrg = () => {
    // Caveman simple placeholder for now!
    alert('Create organization feature coming soon!');
  };

  return (
    <div className="min-h-screen bg-[#111826] flex flex-col items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md mb-8">
        <h1 className="text-center text-3xl font-bold tracking-tight text-white">
          DealFlow<span className="italic text-[#724B66]">360</span>
        </h1>
      </div>

      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#724B66]/20 mb-4 border border-[#724B66]/30 shadow-inner">
            <svg className="w-8 h-8 text-[#724B66]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">Select Workspace</h2>
          <p className="text-gray-400 mt-2 text-sm">Choose an organization to continue</p>
        </div>

        {/* Membership cards */}
        <div className="grid grid-cols-1 gap-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
          {memberships.map((m) => (
            <OrgCard
              key={m.id}
              org={m.organization}
              role={m.role}
              onSelect={() => handleSelect(m)}
            />
          ))}
          
          {/* Empty state */}
          {memberships.length === 0 && (
            <div className="text-center py-6 bg-white/5 rounded-xl border border-white/10">
              <p className="text-gray-400 text-sm">
                No workspaces found.
              </p>
            </div>
          )}
        </div>

        {/* Create Organization Button */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <button
            onClick={handleCreateOrg}
            className="w-full group flex items-center justify-center gap-2 py-3.5 px-4 border border-dashed border-[#724B66]/50 rounded-xl text-sm font-semibold text-[#724B66] hover:text-white hover:border-[#724B66] hover:bg-[#724B66] transition-all duration-300 ease-in-out cursor-pointer"
          >
            <Plus className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
            Create New Organization
          </button>
        </div>
      </div>
    </div>
  );
}
