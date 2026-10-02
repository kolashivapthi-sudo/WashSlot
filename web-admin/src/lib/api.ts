import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const TOKEN_KEY = 'washslot_token';

// ─── Axios instance ───────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
});

// ─── Request interceptor — attach JWT ────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor — handle 401 ───────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage and reload to login
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

// ─── Error message extractor ──────────────────────────────────────────────────

export function parseApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;
    if (data?.message) {
      if (Array.isArray(data.message)) return String(data.message[0]);
      if (typeof data.message === 'string') return data.message;
    }
    switch (error.response?.status) {
      case 400: return 'Invalid request. Please check your details.';
      case 401: return 'Invalid email or password.';
      case 403: return 'You do not have permission for this action.';
      case 409: return 'An account with this email already exists.';
      case 500: return 'Server error. Please try again later.';
    }
    if (error.code === 'ECONNABORTED') return 'Connection timed out.';
    if (!error.response) return 'Could not reach the server. Check your connection.';
  }
  return 'Something went wrong. Please try again.';
}
