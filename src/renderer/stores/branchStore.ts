import { create } from 'zustand';
import { GitHubAPI } from '../services/github';

interface Branch {
  name: string;
  commit: {
    sha: string;
    author: string;
    authorEmail: string;
    message: string;
    date: string;
  };
  protected: boolean;
  ahead: number;
  behind: number;
  current?: boolean;
}

interface BranchState {
  branches: Map<string, Branch[]>; // key: "owner/repo"
  loadedRepos: Set<string>;
  loading: boolean;
  error: string | null;
  lastFetch: Map<string, number>; // Track last fetch time per repo
  
  fetchBranches: (owner: string, repo: string, token: string, defaultBranch?: string, force?: boolean) => Promise<void>;
  clearBranches: (owner: string, repo: string) => void;
  clearAllBranches: () => void;
  isCacheStale: (owner: string, repo: string) => boolean;
  getLastFetchTime: (owner: string, repo: string) => number | undefined;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

export const useBranchStore = create<BranchState>((set, get) => ({
  branches: new Map(),
  loadedRepos: new Set(),
  loading: false,
  error: null,
  lastFetch: new Map(),

  fetchBranches: async (owner: string, repo: string, token: string, defaultBranch = 'main', force = false) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    
    // Check cache validity
    const lastFetchTime = state.lastFetch.get(repoKey);
    const now = Date.now();
    const isCacheValid = lastFetchTime && (now - lastFetchTime) < CACHE_DURATION;
    
    // Return cached data if valid and not forced
    if (!force && isCacheValid && state.branches.has(repoKey)) {
      console.log(`Using cached branches for ${repoKey}`);
      return;
    }

    // If already loading this repo, don't duplicate the request
    if (state.loading && state.loadedRepos.has(repoKey) && !force) {
      console.log(`Already loading branches for ${repoKey}`);
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log(`Fetching branches for ${repoKey}...`);
      const api = new GitHubAPI(token);
      const branchData = await api.getBranches(owner, repo);
      
      // Mark the default branch as current
      const branchesWithCurrent = branchData.map(branch => ({
        ...branch,
        current: branch.name === defaultBranch
      }));

      // Update state with new branches
      set((state) => {
        const newBranches = new Map(state.branches);
        newBranches.set(repoKey, branchesWithCurrent);
        
        const newLoadedRepos = new Set(state.loadedRepos);
        newLoadedRepos.add(repoKey);
        
        const newLastFetch = new Map(state.lastFetch);
        newLastFetch.set(repoKey, now);
        
        return {
          branches: newBranches,
          loadedRepos: newLoadedRepos,
          loading: false,
          lastFetch: newLastFetch
        };
      });

      console.log(`Successfully fetched ${branchesWithCurrent.length} branches for ${repoKey}`);
    } catch (error) {
      console.error(`Failed to fetch branches for ${repoKey}:`, error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch branches' 
      });
    }
  },

  clearBranches: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    set((state) => {
      const newBranches = new Map(state.branches);
      newBranches.delete(repoKey);
      
      const newLoadedRepos = new Set(state.loadedRepos);
      newLoadedRepos.delete(repoKey);
      
      const newLastFetch = new Map(state.lastFetch);
      newLastFetch.delete(repoKey);
      
      return {
        branches: newBranches,
        loadedRepos: newLoadedRepos,
        lastFetch: newLastFetch
      };
    });
  },

  clearAllBranches: () => {
    set({
      branches: new Map(),
      loadedRepos: new Set(),
      lastFetch: new Map(),
      error: null
    });
  },

  isCacheStale: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const lastFetchTime = state.lastFetch.get(repoKey);
    
    if (!lastFetchTime) return true;
    
    const now = Date.now();
    return (now - lastFetchTime) >= CACHE_DURATION;
  },

  getLastFetchTime: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    return get().lastFetch.get(repoKey);
  }
}));
