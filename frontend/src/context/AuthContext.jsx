import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('lm_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('lm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    // Re-validate the stored session against the server on load, so a
    // revoked/expired token doesn't leave the UI in a false-logged-in state.
    api
      .get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch(() => {
        localStorage.removeItem('lm_token');
        localStorage.removeItem('lm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function persist(token, user) {
    localStorage.setItem('lm_token', token);
    localStorage.setItem('lm_user', JSON.stringify(user));
    setUser(user);
  }

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    persist(data.token, data.user);
  }

  async function register(fullName, email, password) {
    const { data } = await api.post('/auth/register', { fullName, email, password });
    persist(data.token, data.user);
  }

  function logout() {
    localStorage.removeItem('lm_token');
    localStorage.removeItem('lm_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
