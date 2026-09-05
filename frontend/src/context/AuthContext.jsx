import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [memberships, setMemberships] = useState(() => {
    const saved = localStorage.getItem('memberships');
    return saved ? JSON.parse(saved) : [];
  });

  // access_token (short-lived, 15m)
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  // refresh_token (long-lived, 30d, rotated on refresh)
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem('refresh_token') || null);

  const [activeOrgId, setActiveOrgId] = useState(() => localStorage.getItem('activeOrgId') || null);
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    if (activeOrgId && memberships.length > 0) {
      const membership = memberships.find(m => m.organization_id === activeOrgId);
      if (membership) setActiveRole(membership.role);
    }
  }, [activeOrgId, memberships]);

  // ── login ──────────────────────────────────────────────────────────────────
  const login = async (identifier, password) => {
    const response = await apiClient.post('/auth/login', { identifier, password });
    const { access_token, refresh_token, token: legacyToken, user: newUser, memberships: newMemberships, redirect } = response;

    const accessToken = access_token || legacyToken;
    const newRefreshToken = refresh_token;

    setToken(accessToken);
    setRefreshToken(newRefreshToken);
    setUser(newUser);
    setMemberships(newMemberships || []);

    localStorage.setItem('token', accessToken);
    if (newRefreshToken) localStorage.setItem('refresh_token', newRefreshToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('memberships', JSON.stringify(newMemberships || []));

    // Clear any stale org context so the selector card is forced
    setActiveOrgId(null);
    setActiveRole(null);
    localStorage.removeItem('activeOrgId');

    // Do NOT auto-select an org here. The user must explicitly
    // pick a workspace on the /select-workspace card screen.
    // activeOrgId remains null until switchWorkspace() is called.

    return { ...response, redirect };
  };

  // ── refresh access token ───────────────────────────────────────────────────
  const refreshAccessToken = useCallback(async () => {
    const storedRefresh = localStorage.getItem('refresh_token');
    if (!storedRefresh) return null;
    try {
      const res = await apiClient.post('/auth/refresh', { refresh_token: storedRefresh });
      const { access_token, refresh_token: newRefresh } = res;
      setToken(access_token);
      setRefreshToken(newRefresh);
      localStorage.setItem('token', access_token);
      localStorage.setItem('refresh_token', newRefresh);
      return access_token;
    } catch {
      return null;
    }
  }, []);

  // ── logout ─────────────────────────────────────────────────────────────────
  const logout = async () => {
    const storedRefresh = localStorage.getItem('refresh_token');
    try {
      if (storedRefresh) {
        await apiClient.post('/auth/logout', { refresh_token: storedRefresh });
      }
    } catch { /* ignore */ }

    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setMemberships([]);
    setActiveOrgId(null);
    setActiveRole(null);

    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    localStorage.removeItem('memberships');
    localStorage.removeItem('activeOrgId');
  };

  // ── workspace switch ───────────────────────────────────────────────────────
  const switchWorkspace = (orgId, membershipList = memberships) => {
    setActiveOrgId(orgId);
    localStorage.setItem('activeOrgId', orgId);
    const m = membershipList.find(item => item.organization_id === orgId);
    if (m) {
      setActiveRole(m.role);
    } else {
      setActiveRole('admin');
    }
  };

  // ── refresh user profile & memberships ─────────────────────────────────────
  const refreshProfile = async () => {
    try {
      const profile = await apiClient.get('/auth/profile');
      if (profile?.memberships) {
        setMemberships(profile.memberships);
        localStorage.setItem('memberships', JSON.stringify(profile.memberships));
        return profile.memberships;
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
    return [];
  };

  // ── create workspace ───────────────────────────────────────────────────────
  const createWorkspace = async (payload) => {
    const response = await apiClient.post('/auth/organizations', payload);
    const updatedMemberships = await refreshProfile();
    const newOrg = response.organization;
    if (newOrg) {
      switchWorkspace(newOrg.id, updatedMemberships);
    }
    return { ...response, memberships: updatedMemberships };
  };

  const activeOrg = memberships.find(m => m.organization_id === activeOrgId)?.organization || null;

  return (
    <AuthContext.Provider value={{
      user,
      memberships,
      token,
      refreshToken,
      activeOrgId,
      activeOrg,
      activeRole,
      login,
      logout,
      switchWorkspace,
      refreshAccessToken,
      refreshProfile,
      createWorkspace,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
