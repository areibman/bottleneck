import { create } from "zustand";

export interface AuthorTeam {
  id: string;
  name: string;
  members: string[]; // GitHub logins
  color?: string; // Hex or named color
  icon?: string; // Optional emoji or icon name
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

  // User-defined
  authorTeams: AuthorTeam[];
}

interface SettingsState {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;

  // Teams management
  addAuthorTeam: (team: Omit<AuthorTeam, "id"> & { id?: string }) => void;
  updateAuthorTeam: (team: AuthorTeam) => void;
  deleteAuthorTeam: (teamId: string) => void;
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

  // User-defined
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
      // Load from electron store
      if (window.electron?.settings) {
        const result = await window.electron.settings.get();
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
      // Save to electron store
      if (window.electron?.settings) {
        const settings = get().settings;
        for (const [key, value] of Object.entries(settings)) {
          await window.electron.settings.set(key, value);
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
  },

  // Teams management
  addAuthorTeam: (teamInput) => {
    set((state) => {
      const id = teamInput.id ?? `team_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const newTeam: AuthorTeam = {
        id,
        name: teamInput.name?.trim() || "Untitled Team",
        members: Array.from(new Set(teamInput.members || [])).sort(),
        color: teamInput.color,
        icon: teamInput.icon,
        description: teamInput.description,
      };
      const nextSettings = {
        ...state.settings,
        authorTeams: [...(state.settings.authorTeams || []), newTeam],
      };

      // Persist immediately if electron is available
      if (typeof window !== "undefined" && window.electron?.settings?.set) {
        window.electron.settings.set("authorTeams", nextSettings.authorTeams).catch(() => {});
      }

      return {
        settings: {
          ...nextSettings,
        },
      };
    });
  },

  updateAuthorTeam: (team) => {
    set((state) => {
      const nextTeams = (state.settings.authorTeams || []).map((t) =>
        t.id === team.id
          ? {
              ...t,
              name: team.name?.trim() || t.name,
              members: Array.from(new Set(team.members || [])).sort(),
              color: team.color,
              icon: team.icon,
              description: team.description,
            }
          : t,
      );
      if (typeof window !== "undefined" && window.electron?.settings?.set) {
        window.electron.settings.set("authorTeams", nextTeams).catch(() => {});
      }
      return {
        settings: {
          ...state.settings,
          authorTeams: nextTeams,
        },
      };
    });
  },

  deleteAuthorTeam: (teamId) => {
    set((state) => {
      const nextTeams = (state.settings.authorTeams || []).filter((t) => t.id !== teamId);
      if (typeof window !== "undefined" && window.electron?.settings?.set) {
        window.electron.settings.set("authorTeams", nextTeams).catch(() => {});
      }
      return {
        settings: {
          ...state.settings,
          authorTeams: nextTeams,
        },
      };
    });
  },
}));
