import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('cb_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cb_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('cb_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('cb_token');
        localStorage.removeItem('cb_user');
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    persist(res.data);
    return res.data.user;
  }

  async function register(payload) {
    const res = await api.post('/auth/register', payload);
    persist(res.data);
    return res.data.user;
  }

  function persist({ token, user }) {
    localStorage.setItem('cb_token', token);
    localStorage.setItem('cb_user', JSON.stringify(user));
    setUser(user);
  }

  function logout() {
    localStorage.removeItem('cb_token');
    localStorage.removeItem('cb_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function dashboardPath(role) {
  switch (role) {
    case 'TEACHER':
      return '/teacher';
    case 'STUDENT':
      return '/student';
    case 'HEADTEACHER':
    case 'ADMIN':
      return '/headteacher';
    default:
      return '/login';
  }
}
