import { create } from "zustand";
import { GitHubAPI, BranchCheckStatus } from "../services/github";

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
  checkStatus?: BranchCheckStatus;
}

interface BranchState {
  branches: Map<string, Branch[]>; // key: "owner/repo"
  loadedRepos: Set<string>;
  loading: boolean;
  error: string | null;
  lastFetch: Map<string, number>; // Track last fetch time per repo
  checkStatusCache: Map<string, BranchCheckStatus>; // key: "owner/repo:branch"
  lastCheckFetch: Map<string, number>; // Track last check fetch time per branch

  fetchBranches: (
    owner: string,
    repo: string,
    token: string,
    defaultBranch?: string,
    force?: boolean,
  ) => Promise<void>;
  fetchBranchCheckStatuses: (
    owner: string,
    repo: string,
    token: string,
    branchNames?: string[],
    force?: boolean,
  ) => Promise<void>;
  clearBranches: (owner: string, repo: string) => void;
  clearAllBranches: () => void;
  isCacheStale: (owner: string, repo: string) => boolean;
  isCheckCacheStale: (owner: string, repo: string, branch: string) => boolean;
  getLastFetchTime: (owner: string, repo: string) => number | undefined;
  getCheckStatus: (owner: string, repo: string, branch: string) => BranchCheckStatus | undefined;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
const CHECK_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for check status (more frequent updates)

const loadBranchesFromStorage = async (
  owner: string,
  repo: string,
): Promise<{ branches: Branch[]; lastSynced?: number } | null> => {
  const electron = (window as any)?.electron;
  if (!electron) return null;

  try {
    const repoResult = await electron.db.query(
      "SELECT id FROM repositories WHERE owner = ? AND name = ?",
      [owner, repo],
    );

    if (!repoResult.success || !repoResult.data || repoResult.data.length === 0)
      return null;

    const repoId = repoResult.data[0].id;

    const branchResult = await electron.db.query(
      `SELECT name, commit_sha, commit_message, commit_author, commit_date, ahead_by, behind_by, is_remote, last_synced
       FROM branches
       WHERE repository_id = ?
       ORDER BY name`,
      [repoId],
    );

    if (!branchResult.success || !branchResult.data) return null;

    const branches: Branch[] = branchResult.data.map((row: any) => ({
      name: row.name,
      commit: {
        sha: row.commit_sha ?? "",
        author: row.commit_author ?? "Unknown",
        authorEmail: "",
        message: row.commit_message ?? "",
        date:
          row.commit_date ??
          (row.last_synced
            ? new Date(row.last_synced).toISOString()
            : new Date().toISOString()),
      },
      protected: Boolean(row.is_remote),
      ahead: row.ahead_by ?? 0,
      behind: row.behind_by ?? 0,
    }));

    const lastSynced = branchResult.data.reduce((latest: number, row: any) => {
      if (!row.last_synced) return latest;
      const timestamp = new Date(row.last_synced).getTime();
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp);
    }, 0);

    return {
      branches,
      lastSynced: lastSynced || undefined,
    };
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
    const repoResult = await electron.db.query(
      "SELECT id FROM repositories WHERE owner = ? AND name = ?",
      [owner, repo],
    );

    if (!repoResult.success || !repoResult.data || repoResult.data.length === 0)
      return;

    const repoId = repoResult.data[0].id;

    // Replace existing branches for this repository
    await electron.db.execute(
      "DELETE FROM branches WHERE repository_id = ?",
      [repoId],
    );

    for (const branch of branches) {
      await electron.db.execute(
        `INSERT OR REPLACE INTO branches (
           repository_id,
           name,
           commit_sha,
           commit_message,
           commit_author,
           commit_date,
           ahead_by,
           behind_by,
           is_remote,
           is_local,
           last_synced
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          repoId,
          branch.name,
          branch.commit.sha,
          branch.commit.message,
          branch.commit.author,
          branch.commit.date,
          branch.ahead,
          branch.behind,
          branch.protected ? 1 : 0,
          0,
        ],
      );
    }
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
  checkStatusCache: new Map(),
  lastCheckFetch: new Map(),

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

  fetchBranchCheckStatuses: async (
    owner: string,
    repo: string,
    token: string,
    branchNames?: string[],
    force = false,
  ) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const branches = state.branches.get(repoKey);
    
    if (!branches || branches.length === 0) {
      console.log(`No branches found for ${repoKey}, skipping check status fetch`);
      return;
    }

    const branchesToCheck = branchNames 
      ? branches.filter(b => branchNames.includes(b.name))
      : branches;

    if (branchesToCheck.length === 0) return;

    // Check if we need to fetch (cache validation)
    if (!force) {
      const now = Date.now();
      const needsFetch = branchesToCheck.some(branch => {
        const checkKey = `${repoKey}:${branch.name}`;
        const lastFetchTime = state.lastCheckFetch.get(checkKey);
        return !lastFetchTime || (now - lastFetchTime) >= CHECK_CACHE_DURATION;
      });
      
      if (!needsFetch) {
        console.log(`Check status cache is fresh for ${repoKey}`);
        return;
      }
    }

    try {
      console.log(`Fetching check status for ${branchesToCheck.length} branches in ${repoKey}...`);
      const api = new GitHubAPI(token);
      
      // Prepare branch data for bulk fetch
      const branchData = branchesToCheck.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
      }));

      const checkStatuses = await api.getBulkBranchCheckStatus(owner, repo, branchData);
      const now = Date.now();

      // Update the store with check statuses
      set((state) => {
        const newBranches = new Map(state.branches);
        const updatedBranches = branches.map(branch => {
          const checkStatus = checkStatuses.get(branch.name);
          return checkStatus ? { ...branch, checkStatus } : branch;
        });
        newBranches.set(repoKey, updatedBranches);

        const newCheckStatusCache = new Map(state.checkStatusCache);
        const newLastCheckFetch = new Map(state.lastCheckFetch);
        
        checkStatuses.forEach((status, branchName) => {
          const checkKey = `${repoKey}:${branchName}`;
          newCheckStatusCache.set(checkKey, status);
          newLastCheckFetch.set(checkKey, now);
        });

        return {
          branches: newBranches,
          checkStatusCache: newCheckStatusCache,
          lastCheckFetch: newLastCheckFetch,
        };
      });

      console.log(`Successfully fetched check status for ${checkStatuses.size} branches in ${repoKey}`);
    } catch (error) {
      console.error(`Failed to fetch check statuses for ${repoKey}:`, error);
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

      // Clear check status cache for this repo
      const newCheckStatusCache = new Map(state.checkStatusCache);
      const newLastCheckFetch = new Map(state.lastCheckFetch);
      for (const key of newCheckStatusCache.keys()) {
        if (key.startsWith(repoKey + ':')) {
          newCheckStatusCache.delete(key);
          newLastCheckFetch.delete(key);
        }
      }

      return {
        branches: newBranches,
        loadedRepos: newLoadedRepos,
        lastFetch: newLastFetch,
        checkStatusCache: newCheckStatusCache,
        lastCheckFetch: newLastCheckFetch,
      };
    });
  },

  clearAllBranches: () => {
    set({
      branches: new Map(),
      loadedRepos: new Set(),
      lastFetch: new Map(),
      checkStatusCache: new Map(),
      lastCheckFetch: new Map(),
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

  isCheckCacheStale: (owner: string, repo: string, branch: string) => {
    const checkKey = `${owner}/${repo}:${branch}`;
    const state = get();
    const lastFetchTime = state.lastCheckFetch.get(checkKey);

    if (!lastFetchTime) return true;

    const now = Date.now();
    return now - lastFetchTime >= CHECK_CACHE_DURATION;
  },

  getCheckStatus: (owner: string, repo: string, branch: string) => {
    const checkKey = `${owner}/${repo}:${branch}`;
    return get().checkStatusCache.get(checkKey);
  },
}));
