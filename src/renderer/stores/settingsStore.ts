import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Team, CreateTeamData, UpdateTeamData } from "../types/teams";

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
}

interface SettingsState {
  settings: Settings;
  teams: Team[];
  updateSettings: (newSettings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
  
  // Team management
  createTeam: (teamData: CreateTeamData) => Team;
  updateTeam: (teamData: UpdateTeamData) => Team | null;
  deleteTeam: (teamId: string) => boolean;
  getTeam: (teamId: string) => Team | null;
  getAllTeams: () => Team[];
  saveTeams: () => Promise<void>;
  loadTeams: () => Promise<void>;
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
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      teams: [],

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

  // Team management functions
  createTeam: (teamData: CreateTeamData) => {
    const now = new Date().toISOString();
    const newTeam: Team = {
      id: `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...teamData,
      createdAt: now,
      updatedAt: now,
    };
    
    set((state) => ({
      teams: [...state.teams, newTeam],
    }));
    
    // Auto-save teams
    get().saveTeams();
    
    return newTeam;
  },

  updateTeam: (teamData: UpdateTeamData) => {
    const { id, ...updateData } = teamData;
    const now = new Date().toISOString();
    
    set((state) => ({
      teams: state.teams.map(team =>
        team.id === id
          ? { ...team, ...updateData, updatedAt: now }
          : team
      ),
    }));
    
    const updatedTeam = get().teams.find(team => team.id === id);
    if (updatedTeam) {
      get().saveTeams();
    }
    
    return updatedTeam || null;
  },

  deleteTeam: (teamId: string) => {
    set((state) => ({
      teams: state.teams.filter(team => team.id !== teamId),
    }));
    
    get().saveTeams();
    return true;
  },

  getTeam: (teamId: string) => {
    return get().teams.find(team => team.id === teamId) || null;
  },

  getAllTeams: () => {
    return get().teams;
  },

  saveTeams: async () => {
    try {
      if (window.electron?.settings) {
        const teams = get().teams;
        await window.electron.settings.set('teams', teams);
      }
    } catch (error) {
      console.error("Failed to save teams:", error);
    }
  },

  loadTeams: async () => {
    try {
      if (window.electron?.settings) {
        const result = await window.electron.settings.get('teams');
        if (result.success && result.value) {
          set({ teams: result.value });
        }
      }
    } catch (error) {
      console.error("Failed to load teams:", error);
    }
  },
}),
    {
      name: "settings-storage",
      partialize: (state) => ({
        settings: state.settings,
        teams: state.teams,
      }),
    }
  )
);
