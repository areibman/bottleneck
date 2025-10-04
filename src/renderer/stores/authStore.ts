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

export const useAuthStore = create<AuthState>((set) => ({
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

      if (result.success && result.token) {
        const api = new GitHubAPI(result.token);
        const apiUser = await api.getCurrentUser();

        // Map GitHub API user to our User type
        const user: User = {
          login: apiUser.login,
          name: apiUser.name || apiUser.login,
          email: apiUser.email || "",
          avatar_url: apiUser.avatar_url,
          id: apiUser.id,
        };

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
    const start = performance.now();
    console.log("⏱️ [AUTH] checkAuth started");

    if (!window.electron) {
      console.warn("window.electron not available");
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
      return;
    }

    const tokenStart = performance.now();
    const token = await window.electron.auth.getToken();
    console.log(`⏱️ [AUTH] Token retrieved in ${(performance.now() - tokenStart).toFixed(2)}ms`);

    if (token) {
      try {
        const apiStart = performance.now();
        const api = new GitHubAPI(token);
        const apiUser = await api.getCurrentUser();
        console.log(`⏱️ [AUTH] User fetched in ${(performance.now() - apiStart).toFixed(2)}ms`);

        // Map GitHub API user to our User type
        const user: User = {
          login: apiUser.login,
          name: apiUser.name || apiUser.login,
          email: apiUser.email || "",
          avatar_url: apiUser.avatar_url,
          id: apiUser.id,
        };

        set({
          isAuthenticated: true,
          token,
          user,
        });
      } catch (error) {
        // Token might be invalid
        console.warn("⏱️ [AUTH] Token invalid");
        set({
          isAuthenticated: false,
          token: null,
          user: null,
        });
      }
    } else {
      console.log("⏱️ [AUTH] No token found");
      set({
        isAuthenticated: false,
        token: null,
        user: null,
      });
    }

    console.log(`⏱️ [AUTH] checkAuth completed in ${(performance.now() - start).toFixed(2)}ms`);
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: true,
      token: "dev-token", // Mock token for development
    });
  },
}));
