import { create } from 'zustand';

interface Repository {
  id: number;
  owner: { login: string; avatar_url: string };
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string;
  default_branch: string;
}

interface AppState {
  isLoading: boolean;
  selectedRepo: Repository | null;
  repositories: Repository[];
  syncStatus: 'idle' | 'syncing' | 'error';
  lastSyncTime: Date | null;
  setLoading: (loading: boolean) => void;
  setSelectedRepo: (repo: Repository | null) => void;
  setRepositories: (repos: Repository[]) => void;
  setSyncStatus: (status: 'idle' | 'syncing' | 'error') => void;
  setLastSyncTime: (time: Date) => void;
  loadRepositories: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  isLoading: false,
  selectedRepo: null,
  repositories: [],
  syncStatus: 'idle',
  lastSyncTime: null,

  setLoading: (loading) => set({ isLoading: loading }),
  setSelectedRepo: (repo) => set({ selectedRepo: repo }),
  setRepositories: (repos) => set({ repositories: repos }),
  setSyncStatus: (status) => set({ syncStatus: status }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),

  loadRepositories: async () => {
    try {
      set({ isLoading: true });
      const repos = await window.electronAPI.github.getRepos({});
      set({ repositories: repos, isLoading: false });
    } catch (error) {
      console.error('Failed to load repositories:', error);
      set({ isLoading: false });
    }
  },
}));