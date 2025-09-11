import { create } from 'zustand';

interface User {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  bio?: string;
  company?: string;
  location?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  checkAuth: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,

  checkAuth: async () => {
    try {
      const token = await window.electronAPI.auth.getToken();
      if (token) {
        const user = await window.electronAPI.github.getUser();
        set({ isAuthenticated: true, token, user });
      } else {
        set({ isAuthenticated: false, token: null, user: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ isAuthenticated: false, token: null, user: null });
    }
  },

  login: async () => {
    try {
      const result = await window.electronAPI.auth.login();
      if (result.success) {
        const user = await window.electronAPI.github.getUser();
        set({ isAuthenticated: true, token: result.token, user });
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await window.electronAPI.auth.logout();
      set({ isAuthenticated: false, token: null, user: null });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
}));