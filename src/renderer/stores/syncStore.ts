import { create } from 'zustand';
import { usePRStore } from './prStore';

interface SyncState {
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncProgress: number;
  syncMessage: string;
  syncErrors: string[];
  
  syncAll: () => Promise<void>;
  syncRepository: (owner: string, repo: string) => Promise<void>;
  syncPullRequest: (owner: string, repo: string, number: number) => Promise<void>;
  setSyncProgress: (progress: number, message?: string) => void;
  addSyncError: (error: string) => void;
  clearSyncErrors: () => void;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isSyncing: false,
  lastSyncTime: null,
  syncProgress: 0,
  syncMessage: '',
  syncErrors: [],

  syncAll: async () => {
    set({ 
      isSyncing: true, 
      syncProgress: 0, 
      syncMessage: 'Starting sync...',
      syncErrors: [] 
    });

    try {
      // Get all repositories
      const prStore = usePRStore.getState();
      
      // Sync repositories first
      set({ syncMessage: 'Fetching repositories...' });
      await prStore.fetchRepositories();
      set({ syncProgress: 20 });

      const repos = prStore.repositories;
      const totalRepos = repos.length;
      
      // Sync PRs for each repository
      for (let i = 0; i < totalRepos; i++) {
        const repo = repos[i];
        const progress = 20 + (80 * (i / totalRepos));
        
        set({ 
          syncProgress: progress,
          syncMessage: `Syncing ${repo.full_name}...` 
        });
        
        try {
          await prStore.fetchPullRequests(repo.owner, repo.name);
        } catch (error) {
          get().addSyncError(`Failed to sync ${repo.full_name}: ${(error as Error).message}`);
        }
      }

      set({ 
        isSyncing: false,
        lastSyncTime: new Date(),
        syncProgress: 100,
        syncMessage: 'Sync complete!' 
      });

      // Clear message after a delay
      setTimeout(() => {
        set({ syncMessage: '', syncProgress: 0 });
      }, 3000);
    } catch (error) {
      set({ 
        isSyncing: false,
        syncMessage: 'Sync failed',
        syncProgress: 0 
      });
      get().addSyncError((error as Error).message);
    }
  },

  syncRepository: async (owner: string, repo: string) => {
    set({ 
      isSyncing: true,
      syncMessage: `Syncing ${owner}/${repo}...` 
    });

    try {
      const prStore = usePRStore.getState();
      await prStore.fetchPullRequests(owner, repo);
      
      set({ 
        isSyncing: false,
        lastSyncTime: new Date(),
        syncMessage: 'Repository synced!' 
      });

      setTimeout(() => {
        set({ syncMessage: '' });
      }, 3000);
    } catch (error) {
      set({ 
        isSyncing: false,
        syncMessage: 'Sync failed' 
      });
      get().addSyncError((error as Error).message);
    }
  },

  syncPullRequest: async (owner: string, repo: string, number: number) => {
    set({ 
      isSyncing: true,
      syncMessage: `Syncing PR #${number}...` 
    });

    try {
      const token = await window.electron.auth.getToken();
      if (!token) throw new Error('Not authenticated');

      const { GitHubAPI } = await import('../services/github');
      const api = new GitHubAPI(token);
      
      // Fetch PR details
      const pr = await api.getPullRequest(owner, repo, number);
      
      // Update in store
      const prStore = usePRStore.getState();
      prStore.updatePR(pr);
      
      set({ 
        isSyncing: false,
        lastSyncTime: new Date(),
        syncMessage: 'PR synced!' 
      });

      setTimeout(() => {
        set({ syncMessage: '' });
      }, 3000);
    } catch (error) {
      set({ 
        isSyncing: false,
        syncMessage: 'Sync failed' 
      });
      get().addSyncError((error as Error).message);
    }
  },

  setSyncProgress: (progress, message) => {
    set({ 
      syncProgress: progress,
      syncMessage: message || get().syncMessage 
    });
  },

  addSyncError: (error) => {
    set((state) => ({
      syncErrors: [...state.syncErrors, error]
    }));
  },

  clearSyncErrors: () => {
    set({ syncErrors: [] });
  },
}));
