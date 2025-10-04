import { create } from "zustand";
import { GitHubAPI } from "../services/github";

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

  fetchBranches: (
    owner: string,
    repo: string,
    token: string,
    defaultBranch?: string,
    force?: boolean,
  ) => Promise<void>;
  clearBranches: (owner: string, repo: string) => void;
  clearAllBranches: () => void;
  isCacheStale: (owner: string, repo: string) => boolean;
  getLastFetchTime: (owner: string, repo: string) => number | undefined;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

const loadBranchesFromStorage = async (
  owner: string,
  repo: string,
): Promise<{ branches: Branch[]; lastSynced?: number } | null> => {
  const electron = (window as any)?.electron;
  if (!electron) return null;

  try {
    const repoKey = `${owner}/${repo}`;
    const storageKey = `branches_${repoKey}`;

    const result = await electron.settings.get(storageKey);
    if (!result.success || !result.value) return null;

    const storedData = result.value as { branches: Branch[]; lastSynced: number };
    return storedData;
  } catch (error) {
    console.error("Failed to load branches from storage:", error);
    return null;
  }
};

const persistBranchesToStorage = async (
  branches: Branch[],
  owner: string,
  repo: string,
) => {
  const electron = (window as any)?.electron;
  if (!electron) return;

  try {
    const repoKey = `${owner}/${repo}`;
    const storageKey = `branches_${repoKey}`;

    await electron.settings.set(storageKey, {
      branches,
      lastSynced: Date.now(),
    });
  } catch (error) {
    console.error("Failed to persist branches to storage:", error);
  }
};

export const useBranchStore = create<BranchState>((set, get) => ({
  branches: new Map(),
  loadedRepos: new Set(),
  loading: false,
  error: null,
  lastFetch: new Map(),

  fetchBranches: async (
    owner: string,
    repo: string,
    token: string,
    defaultBranch = "main",
    force = false,
  ) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();

    const inMemoryBranches = state.branches.get(repoKey);
    const lastFetchTime = state.lastFetch.get(repoKey);
    const now = Date.now();
    const isCacheValid =
      Boolean(lastFetchTime) && now - (lastFetchTime ?? 0) < CACHE_DURATION;

    if (!force && isCacheValid && inMemoryBranches && inMemoryBranches.length) {
      console.log(`Using cached branches for ${repoKey}`);
      return;
    }

    // Try loading from persistent storage first
    let storageTimestamp: number | undefined;
    if (!inMemoryBranches || inMemoryBranches.length === 0) {
      const cached = await loadBranchesFromStorage(owner, repo);
      if (cached && cached.branches.length > 0) {
        set((state) => {
          const newBranches = new Map(state.branches);
          newBranches.set(
            repoKey,
            cached.branches.map((branch) => ({
              ...branch,
              current: branch.name === defaultBranch,
            })),
          );

          const newLoadedRepos = new Set(state.loadedRepos);
          newLoadedRepos.add(repoKey);

          const newLastFetch = new Map(state.lastFetch);
          if (cached.lastSynced) {
            newLastFetch.set(repoKey, cached.lastSynced);
          }

          return {
            branches: newBranches,
            loadedRepos: newLoadedRepos,
            lastFetch: newLastFetch,
            loading: false,
          };
        });

        storageTimestamp = cached.lastSynced;
      }
    } else {
      storageTimestamp = lastFetchTime;
    }

    const refreshedState = get();
    const hasBranchesLoaded =
      (refreshedState.branches.get(repoKey)?.length ?? 0) > 0;

    if (!force) {
      const effectiveTimestamp = storageTimestamp ?? lastFetchTime;
      const isStorageFresh =
        effectiveTimestamp && now - effectiveTimestamp < CACHE_DURATION;
      if (hasBranchesLoaded && isStorageFresh) {
        console.log(`Using stored branches for ${repoKey}`);
        return;
      }
    }

    set({
      loading: hasBranchesLoaded ? false : true,
      error: null,
    });

    try {
      console.log(`Fetching branches for ${repoKey}...`);
      const api = new GitHubAPI(token);
      const branchData = await api.getBranches(owner, repo, defaultBranch);

      // Mark the default branch as current
      const branchesWithCurrent = branchData.map((branch) => ({
        ...branch,
        current: branch.name === defaultBranch,
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
          lastFetch: newLastFetch,
        };
      });

      await persistBranchesToStorage(branchesWithCurrent, owner, repo);

      console.log(
        `Successfully fetched ${branchesWithCurrent.length} branches for ${repoKey}`,
      );
    } catch (error) {
      console.error(`Failed to fetch branches for ${repoKey}:`, error);
      set({
        loading: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch branches",
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
        lastFetch: newLastFetch,
      };
    });
  },

  clearAllBranches: () => {
    set({
      branches: new Map(),
      loadedRepos: new Set(),
      lastFetch: new Map(),
      error: null,
    });
  },

  isCacheStale: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const lastFetchTime = state.lastFetch.get(repoKey);

    if (!lastFetchTime) return true;

    const now = Date.now();
    return now - lastFetchTime >= CACHE_DURATION;
  },

  getLastFetchTime: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    return get().lastFetch.get(repoKey);
  },
}));
