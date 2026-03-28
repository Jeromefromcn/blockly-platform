import { createContext, useContext, useEffect, useState } from 'react';
import { apiPost } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = async (username, password) => {
    const res = await apiPost('/api/auth/login', { username, password });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Login failed');
    }
    const data = await res.json();
    setUser(data);
    return data;
  };

  const logout = async () => {
    try {
      await apiPost('/api/auth/logout');
    } catch {
      // ignore
    }
    setUser(null);
  };

  const hasPermission = (perm) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(perm);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, fetchMe, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
