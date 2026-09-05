import React, { createContext, useContext, useState, useEffect } from 'react';
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
  
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [activeOrgId, setActiveOrgId] = useState(() => localStorage.getItem('activeOrgId') || null);
  
  const [activeRole, setActiveRole] = useState(null);

  useEffect(() => {
    if (activeOrgId && memberships.length > 0) {
      const membership = memberships.find(m => m.organization_id === activeOrgId);
      if (membership) {
        setActiveRole(membership.role);
      }
    }
  }, [activeOrgId, memberships]);

  const login = async (identifier, password) => {
    const response = await apiClient.post('/auth/login', { identifier, password });
    const { token: newToken, user: newUser, memberships: newMemberships } = response;
    
    setToken(newToken);
    setUser(newUser);
    setMemberships(newMemberships);
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('memberships', JSON.stringify(newMemberships));
    
    if (newMemberships.length > 0) {
      const defaultOrgId = newMemberships[0].organization_id;
      setActiveOrgId(defaultOrgId);
      localStorage.setItem('activeOrgId', defaultOrgId);
    }
    
    return response;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setMemberships([]);
    setActiveOrgId(null);
    setActiveRole(null);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('memberships');
    localStorage.removeItem('activeOrgId');
  };

  const switchWorkspace = (orgId) => {
    setActiveOrgId(orgId);
    localStorage.setItem('activeOrgId', orgId);
  };

  const activeOrg = memberships.find(m => m.organization_id === activeOrgId)?.organization || null;

  return (
    <AuthContext.Provider value={{
      user,
      memberships,
      token,
      activeOrgId,
      activeOrg,
      activeRole,
      login,
      logout,
      switchWorkspace
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
