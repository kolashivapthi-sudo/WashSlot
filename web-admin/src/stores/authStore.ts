import { create } from 'zustand';
import { api, parseApiError } from '../lib/api';

const TOKEN_KEY = 'washslot_token';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
}

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  initialize: () => Promise<void>;
  clearError: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isInitialized: false,

  /**
   * Called on app mount — checks if a saved token is still valid
   */
  initialize: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      set({ isInitialized: true });
      return;
    }
    try {
      const response = await api.get<AdminUser>('/auth/me');
      const user = response.data;
      // Only allow admin roles into the web admin panel
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        localStorage.removeItem(TOKEN_KEY);
        set({ isInitialized: true });
        return;
      }
      set({ user, token, isInitialized: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ isInitialized: true });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post<{ token: string; user: AdminUser }>('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data;

      // Block non-admin users from the admin panel
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        set({ isLoading: false, error: 'Access denied. Admin accounts only.' });
        return;
      }

      localStorage.setItem(TOKEN_KEY, token);
      set({ user, token, isLoading: false, error: null });
    } catch (err) {
      set({ isLoading: false, error: parseApiError(err) });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
