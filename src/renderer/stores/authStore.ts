import { create } from "zustand";
import { GitHubAPI } from "../services/github";

interface User {
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  id: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;

  login: () => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  token: null,
  user: null,
  loading: false,
  error: null,

  login: async () => {
    if (!window.electron) {
      set({ error: "Electron API not available" });
      return;
    }

    set({ loading: true, error: null });

    try {
      const result = await window.electron.auth.login();

      if (result.success) {
        const api = new GitHubAPI(result.token);
        const user = await api.getCurrentUser();

        set({
          isAuthenticated: true,
          token: result.token,
          user,
          loading: false,
        });
      } else {
        set({
          error: result.error || "Authentication failed",
          loading: false,
        });
      }
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false,
      });
    }
  },

  logout: async () => {
    if (!window.electron) {
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
      return;
    }

    set({ loading: true });

    try {
      await window.electron.auth.logout();
      set({
        isAuthenticated: false,
        token: null,
        user: null,
        loading: false,
      });
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false,
      });
    }
  },

  checkAuth: async () => {
    if (!window.electron) {
      console.warn("window.electron not available");
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
      return;
    }

    const token = await window.electron.auth.getToken();

    if (token) {
      try {
        const api = new GitHubAPI(token);
        const user = await api.getCurrentUser();

        set({
          isAuthenticated: true,
          token,
          user,
        });
      } catch (error) {
        // Token might be invalid
        set({
          isAuthenticated: false,
          token: null,
          user: null,
        });
      }
    } else {
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
    }
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: true,
      token: "dev-token", // Mock token for development
    });
  },
}));
