import { create } from "zustand";
import { GitHubAPI } from "../services/github";
import { CheckStatus, CheckStatusMap, CheckRunFilters, CheckStatusSettings } from "../types/githubActions";

interface CheckStatusState {
  checkStatuses: CheckStatusMap;
  loading: boolean;
  error: string | null;
  lastFetch: Map<string, number>; // Track last fetch time per repo
  settings: CheckStatusSettings;
  refreshIntervals: Map<string, NodeJS.Timeout>; // Auto-refresh intervals per repo

  // Actions
  fetchCheckStatuses: (
    owner: string,
    repo: string,
    branches: Array<{ name: string; commit: { sha: string } }>,
    token: string,
    force?: boolean
  ) => Promise<void>;
  fetchCheckStatusForBranch: (
    owner: string,
    repo: string,
    branchName: string,
    ref: string,
    token: string
  ) => Promise<void>;
  clearCheckStatuses: (owner: string, repo: string) => void;
  clearAllCheckStatuses: () => void;
  updateSettings: (settings: Partial<CheckStatusSettings>) => void;
  startAutoRefresh: (owner: string, repo: string) => void;
  stopAutoRefresh: (owner: string, repo: string) => void;
  stopAllAutoRefresh: () => void;
  isCacheStale: (owner: string, repo: string) => boolean;
  getCheckStatus: (owner: string, repo: string, branchName: string) => CheckStatus | null;
  filterCheckStatuses: (
    owner: string,
    repo: string,
    filters: CheckRunFilters
  ) => CheckStatus[];
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes cache for check statuses
const DEFAULT_REFRESH_INTERVAL = 30 * 1000; // 30 seconds

const defaultSettings: CheckStatusSettings = {
  autoRefresh: true,
  refreshInterval: DEFAULT_REFRESH_INTERVAL,
  showDetails: true,
  groupByStatus: false,
  notifications: {
    enabled: true,
    onFailure: true,
    onSuccess: false,
  },
};

export const useCheckStatusStore = create<CheckStatusState>((set, get) => ({
  checkStatuses: {},
  loading: false,
  error: null,
  lastFetch: new Map(),
  settings: defaultSettings,
  refreshIntervals: new Map(),

  fetchCheckStatuses: async (
    owner: string,
    repo: string,
    branches: Array<{ name: string; commit: { sha: string } }>,
    token: string,
    force = false
  ) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const lastFetchTime = state.lastFetch.get(repoKey);
    const now = Date.now();
    const isCacheValid = Boolean(lastFetchTime) && now - (lastFetchTime ?? 0) < CACHE_DURATION;

    if (!force && isCacheValid) {
      console.log(`Using cached check statuses for ${repoKey}`);
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log(`Fetching check statuses for ${repoKey}...`);
      const api = new GitHubAPI(token);
      const checkStatusesMap = await api.getCheckStatusForBranches(owner, repo, branches);

      // Convert Map to object for storage
      const checkStatusesObj: { [branchName: string]: CheckStatus } = {};
      checkStatusesMap.forEach((status, branchName) => {
        checkStatusesObj[branchName] = status;
      });

      set((state) => {
        const newCheckStatuses = { ...state.checkStatuses };
        newCheckStatuses[repoKey] = checkStatusesObj;

        const newLastFetch = new Map(state.lastFetch);
        newLastFetch.set(repoKey, now);

        return {
          checkStatuses: newCheckStatuses,
          lastFetch: newLastFetch,
          loading: false,
        };
      });

      console.log(`Successfully fetched check statuses for ${branches.length} branches in ${repoKey}`);

      // Start auto-refresh if enabled
      if (state.settings.autoRefresh) {
        get().startAutoRefresh(owner, repo);
      }
    } catch (error) {
      console.error(`Failed to fetch check statuses for ${repoKey}:`, error);
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch check statuses",
      });
    }
  },

  fetchCheckStatusForBranch: async (
    owner: string,
    repo: string,
    branchName: string,
    ref: string,
    token: string
  ) => {
    const repoKey = `${owner}/${repo}`;

    try {
      console.log(`Fetching check status for branch ${branchName} in ${repoKey}...`);
      const api = new GitHubAPI(token);
      const checkStatus = await api.getCheckStatusForBranch(owner, repo, branchName, ref);

      set((state) => {
        const newCheckStatuses = { ...state.checkStatuses };
        if (!newCheckStatuses[repoKey]) {
          newCheckStatuses[repoKey] = {};
        }
        newCheckStatuses[repoKey][branchName] = checkStatus;

        return { checkStatuses: newCheckStatuses };
      });

      console.log(`Successfully fetched check status for branch ${branchName}`);
    } catch (error) {
      console.error(`Failed to fetch check status for branch ${branchName}:`, error);
    }
  },

  clearCheckStatuses: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    set((state) => {
      const newCheckStatuses = { ...state.checkStatuses };
      delete newCheckStatuses[repoKey];

      const newLastFetch = new Map(state.lastFetch);
      newLastFetch.delete(repoKey);

      return {
        checkStatuses: newCheckStatuses,
        lastFetch: newLastFetch,
      };
    });

    // Stop auto-refresh for this repo
    get().stopAutoRefresh(owner, repo);
  },

  clearAllCheckStatuses: () => {
    set({
      checkStatuses: {},
      lastFetch: new Map(),
    });

    // Stop all auto-refresh intervals
    get().stopAllAutoRefresh();
  },

  updateSettings: (newSettings: Partial<CheckStatusSettings>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  startAutoRefresh: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();

    // Clear existing interval if any
    const existingInterval = state.refreshIntervals.get(repoKey);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // Start new interval
    const interval = setInterval(() => {
      const currentState = get();
      const repoCheckStatuses = currentState.checkStatuses[repoKey];
      
      if (repoCheckStatuses) {
        // Convert back to branch format for API call
        const branches = Object.values(repoCheckStatuses).map(status => ({
          name: status.branch,
          commit: { sha: status.checkRuns[0]?.check_suite.head_sha || "" },
        }));

        // Only refresh if we have valid branch data
        if (branches.length > 0 && branches[0].commit.sha) {
          currentState.fetchCheckStatuses(owner, repo, branches, "", true);
        }
      }
    }, state.settings.refreshInterval);

    set((state) => {
      const newRefreshIntervals = new Map(state.refreshIntervals);
      newRefreshIntervals.set(repoKey, interval);
      return { refreshIntervals: newRefreshIntervals };
    });
  },

  stopAutoRefresh: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const interval = state.refreshIntervals.get(repoKey);

    if (interval) {
      clearInterval(interval);
      set((state) => {
        const newRefreshIntervals = new Map(state.refreshIntervals);
        newRefreshIntervals.delete(repoKey);
        return { refreshIntervals: newRefreshIntervals };
      });
    }
  },

  stopAllAutoRefresh: () => {
    const state = get();
    state.refreshIntervals.forEach((interval) => {
      clearInterval(interval);
    });

    set({ refreshIntervals: new Map() });
  },

  isCacheStale: (owner: string, repo: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const lastFetchTime = state.lastFetch.get(repoKey);

    if (!lastFetchTime) return true;

    const now = Date.now();
    return now - lastFetchTime >= CACHE_DURATION;
  },

  getCheckStatus: (owner: string, repo: string, branchName: string) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    return state.checkStatuses[repoKey]?.[branchName] || null;
  },

  filterCheckStatuses: (owner: string, repo: string, filters: CheckRunFilters) => {
    const repoKey = `${owner}/${repo}`;
    const state = get();
    const repoCheckStatuses = state.checkStatuses[repoKey];

    if (!repoCheckStatuses) return [];

    let filtered = Object.values(repoCheckStatuses);

    if (filters.status) {
      filtered = filtered.filter(status => status.overallStatus === filters.status);
    }

    if (filters.app) {
      filtered = filtered.filter(status =>
        status.checkRuns.some(run => run.app.name.toLowerCase().includes(filters.app!.toLowerCase()))
      );
    }

    if (filters.conclusion) {
      filtered = filtered.filter(status =>
        status.checkRuns.some(run => run.conclusion === filters.conclusion)
      );
    }

    return filtered;
  },
}));