import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // { role, id, name, student_id/professor_id, courses, token }
  const [loading, setLoading] = useState(true);  // checking localStorage on mount

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      // Try to restore session
      api.get('/auth/me/')
        .then(res => setUser({ ...res.data, token }))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    // 1. Get JWT tokens
    const tokenRes = await api.post('/auth/login/', { username, password });
    const { access, refresh } = tokenRes.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);

    // 2. Get user profile + role
    const meRes = await api.get('/auth/me/');
    const userData = { ...meRes.data, token: access };
    setUser(userData);
    return userData;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
