import axios from 'axios';

export const API_BASE = typeof window !== 'undefined' && window.location.origin
  ? `${window.location.origin}/api/v1`
  : '/api/v1';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('payviro_token') || localStorage.getItem('payverify_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle session expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const path = window.location.pathname;
    const isPublic = path.startsWith('/pay/') || path.startsWith('/link/') || path.startsWith('/invoice/') || path === '/' || path === '/login' || path === '/register';
    if (error.response?.status === 401 && !isPublic) {
      localStorage.removeItem('payviro_token');
      localStorage.removeItem('payviro_user');
      localStorage.removeItem('payverify_token');
      localStorage.removeItem('payverify_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
