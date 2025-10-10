import { create } from "zustand";

// Saved team of authors for quick filtering
export interface AuthorTeam {
  id: string;
  name: string;
  members: string[]; // GitHub login names
  color?: string; // Optional HEX color (e.g. #AABBCC or AABBCC)
  icon?: string; // Optional emoji or short icon text
  description?: string;
}

interface Settings {
  // General
  autoSync: boolean;
  syncInterval: number;
  defaultBranch: string;
  cloneLocation: string;

  // Appearance
  theme: "dark" | "light" | "auto";
  fontSize: number;
  fontFamily: string;
  showWhitespace: boolean;
  wordWrap: boolean;

  // Notifications
  showDesktopNotifications: boolean;
  notifyOnPRUpdate: boolean;
  notifyOnReview: boolean;
  notifyOnMention: boolean;
  notifyOnMerge: boolean;

  // Advanced
  maxConcurrentRequests: number;
  cacheSize: number;
  enableDebugMode: boolean;
  enableTelemetry: boolean;

  // Saved author teams for filters
  authorTeams: AuthorTeam[];
}

interface SettingsState {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;

  // Team helpers
  setAuthorTeams: (teams: AuthorTeam[]) => Promise<void>;
  addAuthorTeam: (team: Omit<AuthorTeam, "id"> & { id?: string }) => Promise<AuthorTeam>;
  updateAuthorTeam: (team: AuthorTeam) => Promise<void>;
  deleteAuthorTeam: (teamId: string) => Promise<void>;
}

const defaultSettings: Settings = {
  // General
  autoSync: true,
  syncInterval: 5,
  defaultBranch: "main",
  cloneLocation: "~/repos",

  // Appearance
  theme: "dark",
  fontSize: 13,
  fontFamily: "SF Mono",
  showWhitespace: false,
  wordWrap: false,

  // Notifications
  showDesktopNotifications: true,
  notifyOnPRUpdate: true,
  notifyOnReview: true,
  notifyOnMention: true,
  notifyOnMerge: true,

  // Advanced
  maxConcurrentRequests: 10,
  cacheSize: 500,
  enableDebugMode: false,
  enableTelemetry: false,

  // Teams
  authorTeams: [],
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,

  updateSettings: (newSettings: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  loadSettings: async () => {
    const start = performance.now();
    console.log("⏱️ [SETTINGS] loadSettings started");

    try {
      // Load from electron store (only in renderer)
      if (typeof window !== "undefined" && (window as any).electron?.settings) {
        const result = await (window as any).electron.settings.get();
        if (result.success && result.settings) {
          set({ settings: { ...defaultSettings, ...result.settings } });
          console.log(`⏱️ [SETTINGS] Settings loaded in ${(performance.now() - start).toFixed(2)}ms`);
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  saveSettings: async () => {
    try {
      // Save to electron store (only in renderer)
      if (typeof window !== "undefined" && (window as any).electron?.settings) {
        const settings = get().settings;
        for (const [key, value] of Object.entries(settings)) {
          await (window as any).electron.settings.set(key, value);
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
  },

  // Team helpers
  setAuthorTeams: async (teams) => {
    set((state) => ({ settings: { ...state.settings, authorTeams: teams } }));
    try {
      if (typeof window !== "undefined" && (window as any).electron?.settings?.set) {
        await (window as any).electron.settings.set("authorTeams", teams);
      }
    } catch (error) {
      console.error("Failed to persist authorTeams:", error);
    }
  },
  addAuthorTeam: async (team) => {
    const generateId = () =>
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const id = team.id || generateId();
    const newTeam: AuthorTeam = {
      id,
      name: team.name?.trim() || "Untitled Team",
      members: Array.from(new Set(team.members || [])).sort(),
      color: team.color,
      icon: team.icon,
      description: team.description,
    };

    const currentTeams = get().settings.authorTeams || [];
    const nextTeams = [...currentTeams, newTeam];
    set({ settings: { ...get().settings, authorTeams: nextTeams } });
    try {
      if (typeof window !== "undefined" && (window as any).electron?.settings?.set) {
        await (window as any).electron.settings.set("authorTeams", nextTeams);
      }
    } catch (error) {
      console.error("Failed to persist authorTeams:", error);
    }
    return newTeam;
  },
  updateAuthorTeam: async (updated) => {
    const currentTeams = get().settings.authorTeams || [];
    const nextTeams = currentTeams.map((t) =>
      t.id === updated.id
        ? {
            ...t,
            name: updated.name?.trim() || t.name,
            members: Array.from(new Set(updated.members || [])).sort(),
            color: updated.color,
            icon: updated.icon,
            description: updated.description,
          }
        : t,
    );
    set({ settings: { ...get().settings, authorTeams: nextTeams } });
    try {
      if (typeof window !== "undefined" && (window as any).electron?.settings?.set) {
        await (window as any).electron.settings.set("authorTeams", nextTeams);
      }
    } catch (error) {
      console.error("Failed to persist authorTeams:", error);
    }
  },
  deleteAuthorTeam: async (teamId) => {
    const currentTeams = get().settings.authorTeams || [];
    const nextTeams = currentTeams.filter((t) => t.id !== teamId);
    set({ settings: { ...get().settings, authorTeams: nextTeams } });
    try {
      if (typeof window !== "undefined" && (window as any).electron?.settings?.set) {
        await (window as any).electron.settings.set("authorTeams", nextTeams);
      }
    } catch (error) {
      console.error("Failed to persist authorTeams:", error);
    }
  },
}));
