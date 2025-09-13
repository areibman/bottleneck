import { create } from 'zustand';

interface Settings {
  // General
  autoSync: boolean;
  syncInterval: number;
  defaultBranch: string;
  cloneLocation: string;

  // Appearance
  theme: 'dark' | 'light' | 'auto';
  fontSize: number;
  fontFamily: string;
  terminalFontSize: number;
  terminalFontFamily: string;
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
  updateSettings: (newSettings: Partial<Settings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  // General
  autoSync: true,
  syncInterval: 5,
  defaultBranch: 'main',
  cloneLocation: '~/repos',

  // Appearance
  theme: 'dark',
  fontSize: 13,
  fontFamily: 'SF Mono',
  terminalFontSize: 13,
  terminalFontFamily: 'SF Mono',
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,

  updateSettings: (newSettings: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings }
    }));
  },

  loadSettings: async () => {
    try {
      // Load from electron store
      if (window.electron?.settings) {
        const result = await window.electron.settings.get();
        if (result.success && result.settings) {
          set({ settings: { ...defaultSettings, ...result.settings } });
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  saveSettings: async () => {
    try {
      // Save to electron store
      if (window.electron?.settings) {
        const settings = get().settings;
        // Save each setting individually to match how the terminal reads them
        for (const [key, value] of Object.entries(settings)) {
          await window.electron.settings.set(key, value);
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  resetSettings: () => {
    set({ settings: defaultSettings });
  },
}));