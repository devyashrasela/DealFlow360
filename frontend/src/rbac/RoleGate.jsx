import React from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { canAccess } from './permissions.js';

/**
 * RoleGate — wraps a route element.
 * If the user's activeRole cannot access the current path, renders 403.
 */
export function RoleGate({ children }) {
  const { activeRole, token } = useAuth();
  const location = useLocation();

  if (!token) return <Navigate to="/login" replace />;

  // Role is still being resolved from localStorage/useEffect — show nothing briefly
  if (!activeRole) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-6 h-6 border-2 border-[#724B66] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Customer portal users should never see internal routes
  if (activeRole === 'customer_portal') {
    return <Navigate to="/portal" replace />;
  }

  if (!canAccess(activeRole, location.pathname)) {
    return <ForbiddenPage />;
  }

  return children;
}

/**
 * 403 Forbidden page — shown when a user hits a route outside their role.
 */
export function ForbiddenPage() {
  const { activeRole } = useAuth();

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-[#111826]">403 — Forbidden</h2>
        <p className="text-sm text-neutral-500">
          Your role <span className="font-mono font-bold text-[#724B66]">{activeRole}</span> does not have access to this resource.
        </p>
        <p className="text-xs text-neutral-400">Contact your administrator if you believe this is an error.</p>
      </div>
    </div>
  );
}
