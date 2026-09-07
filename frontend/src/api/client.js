import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 anywhere means the token is gone/expired — bounce to login rather
// than letting every page handle it individually.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function fileUrl(relativePath) {
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}/${relativePath.replace(/\\/g, '/')}`;
}
