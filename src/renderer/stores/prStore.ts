import { create } from "zustand";
import { GitHubAPI, PullRequest, Repository } from "../services/github";
import { mockPullRequests } from "../mockData";

interface PRGroup {
  id: string;
  prefix: string;
  pattern: string;
  prs: PullRequest[];
  count: number;
  openCount: number;
  mergedCount: number;
  closedCount: number;
}

export interface PRFilters {
  author: string;
  agent: string;
}

export type PRFilterType = 'open' | 'draft' | 'review-requested' | 'merged' | 'closed';

interface PRState {
  pullRequests: Map<string, PullRequest>;
  repositories: Repository[];
  selectedRepo: Repository | null;
  recentlyViewedRepos: Repository[];
  loadedRepos: Set<string>;
  currentRepoKey: string | null;
  pendingRepoKey: string | null;
  filters: PRFilters;
  statusFilters: PRFilterType[];
  groups: PRGroup[];
  loading: boolean;
  error: string | null;

  fetchPullRequests: (
    owner: string,
    repo: string,
    force?: boolean,
    options?: {
      replaceStore?: boolean;
    },
  ) => Promise<void>;
  fetchPRDetails: (
    owner: string,
    repo: string,
    pullNumber: number,
    options?: {
      updateStore?: boolean;
    },
  ) => Promise<PullRequest | null>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (repo: Repository | null) => void;
  addToRecentlyViewed: (repo: Repository) => void;
  removeFromRecentlyViewed: (repoId: number) => void;
  setFilter: (filter: PRFilterType) => void;
  setFilters: (filters: Partial<PRFilters>) => void;
  setStatusFilter: (filter: PRFilterType) => void;
  setStatusFilters: (filters: PRFilterType[]) => void;
  removeStatusFilter: (filter: PRFilterType) => void;
  clearFilters: () => void;
  groupPRsByPrefix: () => void;
  updatePR: (pr: PullRequest) => void;
  bulkUpdatePRs: (prs: PullRequest[]) => void;
  fetchPRStats: (owner: string, repo: string, prNumbers: number[]) => Promise<void>;
}

// Load recently viewed repos from electron store on initialization
const loadRecentlyViewedRepos = async (): Promise<Repository[]> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("recentlyViewedRepos");
      if (result.success && result.value) {
        return result.value as Repository[];
      }
    } catch (error) {
      console.error("Failed to load recently viewed repos:", error);
    }
  }
  return [];
};

// Save recently viewed repos to electron store
const saveRecentlyViewedRepos = async (repos: Repository[]) => {
  if (window.electron) {
    try {
      await window.electron.settings.set("recentlyViewedRepos", repos);
    } catch (error) {
      console.error("Failed to save recently viewed repos:", error);
    }
  }
};

// Load selected repo from electron store
const loadSelectedRepo = async (): Promise<Repository | null> => {
  if (window.electron) {
    try {
      const result = await window.electron.settings.get("selectedRepo");
      if (result.success && result.value) {
        return result.value as Repository;
      }
    } catch (error) {
      console.error("Failed to load selected repo:", error);
    }
  }
  return null;
};

// Save selected repo to electron store
const saveSelectedRepo = async (repo: Repository | null) => {
  if (window.electron) {
    try {
      await window.electron.settings.set("selectedRepo", repo);
    } catch (error) {
      console.error("Failed to save selected repo:", error);
    }
  }
};

export const usePRStore = create<PRState>((set, get) => {
  // Initialize from storage
  Promise.all([loadRecentlyViewedRepos(), loadSelectedRepo()]).then(
    ([recentRepos, selectedRepo]) => {
      const updates: Partial<PRState> = {};

      if (recentRepos.length > 0) {
        updates.recentlyViewedRepos = recentRepos;
      }

      // Use the saved selected repo, or fall back to the most recent one
      if (selectedRepo) {
        updates.selectedRepo = selectedRepo;
      } else if (recentRepos.length > 0) {
        updates.selectedRepo = recentRepos[0];
      }

      if (Object.keys(updates).length > 0) {
        set(updates);

        // Don't auto-fetch here - let the sync store handle initial fetch
        // This prevents duplicate fetches on hard refresh
      }
    },
  );

  return {
    pullRequests: new Map(),
    repositories: [],
    selectedRepo: null,
    recentlyViewedRepos: [],
    loadedRepos: new Set(),
    currentRepoKey: null,
    pendingRepoKey: null,
    filters: {
      author: "all",
      agent: "all",
    },
    statusFilters: [],
    groups: [],
    loading: false,
    error: null,

    fetchPullRequests: async (
      owner: string,
      repo: string,
      force = false,
      options = {},
    ) => {
      const repoFullName = `${owner}/${repo}`;
      const { replaceStore = true } = options;
      const { loading, pendingRepoKey, currentRepoKey } = get();

      console.log(`[PRStore] fetchPullRequests called for ${repoFullName}`, {
        force,
        replaceStore,
        loading,
        currentRepoKey,
        pendingRepoKey,
      });

      if (replaceStore) {
        if (loading) {
          if (!force && pendingRepoKey === repoFullName) {
            return;
          }
          if (!force && pendingRepoKey && pendingRepoKey !== repoFullName) {
            return;
          }
        }

        const needsFetch = force || currentRepoKey !== repoFullName;

        if (!needsFetch) {
          return;
        }

        set({
          loading: true,
          error: null,
          pendingRepoKey: repoFullName,
        });
      }

      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) throw new Error("Not authenticated");

        let prs: PullRequest[];

        // Use mock data for dev token
        if (token === "dev-token") {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 500));
          prs = mockPullRequests as PullRequest[];
        } else {
          const api = new GitHubAPI(token);
          prs = await api.getPullRequests(owner, repo, "all");
          console.log("Fetched PRs from API:", prs);
        }

        const prMap = new Map<string, PullRequest>();
        prs.forEach((pr) => {
          prMap.set(`${owner}/${repo}#${pr.number}`, pr);
        });

        console.log("Setting PR map with", prs.length, "PRs");
        if (prs.length > 0) {
          console.log("First PR:", prs[0]);
        }

        if (replaceStore) {
          set({
            pullRequests: prMap,
            loading: false,
            currentRepoKey: repoFullName,
            pendingRepoKey: null,
          });

          // Auto-group PRs after fetching
          get().groupPRsByPrefix();
        }
      } catch (error) {
        if (replaceStore) {
          set({
            error: (error as Error).message,
            loading: false,
            pendingRepoKey: null,
          });
        } else {
          console.error(
            `Failed to fetch pull requests for ${repoFullName}:`,
            error,
          );
        }
      }
    },

    fetchPRDetails: async (
      owner: string,
      repo: string,
      pullNumber: number,
      options = {},
    ) => {
      const { updateStore = true } = options;
      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) return null;

        // Don't fetch details if using mock data
        if (token === "dev-token") {
          return null;
        }

        const api = new GitHubAPI(token);
        const detailedPR = await api.getPullRequest(owner, repo, pullNumber);

        // Update the PR in our store with the detailed data
        const prKey = `${owner}/${repo}#${pullNumber}`;
        const currentPR = get().pullRequests.get(prKey);

        if (currentPR) {
          // Merge the detailed data with existing data
          const updatedPR = {
            ...currentPR,
            ...detailedPR,
            // Ensure we keep the file stats from the detailed fetch
            changed_files: detailedPR.changed_files,
            additions: detailedPR.additions,
            deletions: detailedPR.deletions,
          };

          if (updateStore) {
            get().updatePR(updatedPR);

            console.log(`Updated PR #${pullNumber} with detailed data:`, {
              changed_files: updatedPR.changed_files,
              additions: updatedPR.additions,
              deletions: updatedPR.deletions,
            });
          }

          return updatedPR;
        }

        return detailedPR;
      } catch (error) {
        console.error(`Failed to fetch PR details for #${pullNumber}:`, error);
        return null;
      }
    },

    fetchRepositories: async () => {
      const start = performance.now();
      console.log("⏱️ [PR_STORE] fetchRepositories started");

      set({ loading: true, error: null });

      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token) {
          set({ loading: false });
          return;
        }

        let repos: Repository[];

        // Use mock repositories for dev token
        if (token === "dev-token") {
          // Simulate network delay
          await new Promise((resolve) => setTimeout(resolve, 300));
          repos = [
            {
              id: 1,
              owner: "dev-user",
              name: "bottleneck",
              full_name: "dev-user/bottleneck",
              description: "Fast GitHub PR review and branch management",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/dev-user/bottleneck.git",
              updated_at: new Date(Date.now() - 3600000).toISOString(),
              pushed_at: new Date(Date.now() - 3600000).toISOString(),
              stargazers_count: 42,
              open_issues_count: 5,
            },
            {
              id: 2,
              owner: "dev-user",
              name: "sample-project",
              full_name: "dev-user/sample-project",
              description: "A sample project for testing",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/dev-user/sample-project.git",
              updated_at: new Date(Date.now() - 86400000).toISOString(),
              pushed_at: new Date(Date.now() - 86400000).toISOString(),
              stargazers_count: 10,
              open_issues_count: 2,
            },
            {
              id: 3,
              owner: "my-org",
              name: "enterprise-app",
              full_name: "my-org/enterprise-app",
              description: "Enterprise application with microservices",
              default_branch: "main",
              private: true,
              clone_url: "https://github.com/my-org/enterprise-app.git",
              updated_at: new Date(Date.now() - 7200000).toISOString(),
              pushed_at: new Date(Date.now() - 7200000).toISOString(),
              stargazers_count: 128,
              open_issues_count: 15,
            },
            {
              id: 4,
              owner: "my-org",
              name: "ui-components",
              full_name: "my-org/ui-components",
              description: "Shared UI component library",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/my-org/ui-components.git",
              updated_at: new Date(Date.now() - 172800000).toISOString(),
              pushed_at: new Date(Date.now() - 172800000).toISOString(),
              stargazers_count: 256,
              open_issues_count: 8,
            },
            {
              id: 5,
              owner: "another-org",
              name: "api-gateway",
              full_name: "another-org/api-gateway",
              description: "API gateway service",
              default_branch: "main",
              private: false,
              clone_url: "https://github.com/another-org/api-gateway.git",
              updated_at: new Date(Date.now() - 1800000).toISOString(),
              pushed_at: new Date(Date.now() - 1800000).toISOString(),
              stargazers_count: 89,
              open_issues_count: 3,
            },
          ];
        } else {
          const api = new GitHubAPI(token);
          repos = await api.getRepositories();
        }

        set({
          repositories: repos,
          loading: false,
        });

        console.log(`⏱️ [PR_STORE] Fetched ${repos.length} repositories in ${(performance.now() - start).toFixed(2)}ms`);
      } catch (error) {
        console.error(`⏱️ [PR_STORE] fetchRepositories failed after ${(performance.now() - start).toFixed(2)}ms:`, error);
        set({
          error: (error as Error).message,
          loading: false,
        });
      }
    },

    setSelectedRepo: (repo) => {
      set(() => ({
        selectedRepo: repo,
        ...(repo
          ? {}
          : {
            pullRequests: new Map(),
            currentRepoKey: null,
            pendingRepoKey: null,
          }),
      }));

      // Save to electron store
      saveSelectedRepo(repo);

      if (repo) {
        get().addToRecentlyViewed(repo);
      }
    },

    addToRecentlyViewed: (repo) => {
      set((state) => {
        const filtered = state.recentlyViewedRepos.filter(
          (r) => r.id !== repo.id,
        );
        const newRecent = [repo, ...filtered].slice(0, 5); // Keep only 5 most recent

        // Save to electron store
        saveRecentlyViewedRepos(newRecent);

        return { recentlyViewedRepos: newRecent };
      });
    },

    removeFromRecentlyViewed: (repoId) => {
      set((state) => {
        const filtered = state.recentlyViewedRepos.filter(
          (r) => r.id !== repoId,
        );

        // Save to electron store
        saveRecentlyViewedRepos(filtered);

        return { recentlyViewedRepos: filtered };
      });
    },

    setFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.includes(filter)
          ? state.statusFilters.filter((f) => f !== filter)
          : [...state.statusFilters, filter],
      }));
    },

    setFilters: (newFilters) => {
      set((state) => ({
        filters: {
          ...state.filters,
          ...newFilters,
        },
      }));
    },

    setStatusFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.includes(filter)
          ? state.statusFilters.filter((f) => f !== filter)
          : [...state.statusFilters, filter],
      }));
    },

    setStatusFilters: (newFilters) => {
      set({
        statusFilters: newFilters,
      });
    },

    removeStatusFilter: (filter) => {
      set((state) => ({
        statusFilters: state.statusFilters.filter((f) => f !== filter),
      }));
    },

    clearFilters: () => {
      set({
        filters: {
          author: "all",
          agent: "all",
        },
        statusFilters: [],
      });
    },

    groupPRsByPrefix: () => {
      const { pullRequests } = get();
      const groups = new Map<string, PRGroup>();

      // Group PRs by common prefixes
      pullRequests.forEach((pr) => {
        // Try to extract prefix from title or branch
        const title = pr.title?.toLowerCase?.() ?? "";
        const branch = pr.head?.ref?.toLowerCase?.() ?? "";

        let prefix = "";

        // Check for common patterns
        const patterns = [
          /^(feat|fix|chore|docs|style|refactor|test|build|ci)[\/:]/,
          /^([a-z]+)[\/:]/,
          /^([a-z]+-\d+)[\/:]/,
        ];

        for (const pattern of patterns) {
          const titleMatch = title.match(pattern);
          const branchMatch = branch.match(pattern);

          if (titleMatch) {
            prefix = titleMatch[1];
            break;
          } else if (branchMatch) {
            prefix = branchMatch[1];
            break;
          }
        }

        if (prefix && prefix.length >= 3) {
          if (!groups.has(prefix)) {
            groups.set(prefix, {
              id: prefix,
              prefix,
              pattern: `${prefix}/*`,
              prs: [],
              count: 0,
              openCount: 0,
              mergedCount: 0,
              closedCount: 0,
            });
          }

          const group = groups.get(prefix)!;
          group.prs.push(pr);
          group.count++;

          if (pr.state === "open") group.openCount++;
          else if (pr.merged) group.mergedCount++;
          else if (pr.state === "closed") group.closedCount++;
        }
      });

      set({ groups: Array.from(groups.values()) });
    },

    updatePR: (pr) => {
      set((state) => {
        const newPRs = new Map(state.pullRequests);
        const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
        newPRs.set(key, pr);
        return { pullRequests: newPRs };
      });

      // Re-group after update
      get().groupPRsByPrefix();
    },

    bulkUpdatePRs: (prs) => {
      set((state) => {
        const newPRs = new Map(state.pullRequests);
        prs.forEach((pr) => {
          const key = `${pr.base.repo.owner.login}/${pr.base.repo.name}#${pr.number}`;
          newPRs.set(key, pr);
        });
        return { pullRequests: newPRs };
      });

      // Re-group after bulk update
      get().groupPRsByPrefix();
    },

    fetchPRStats: async (owner: string, repo: string, prNumbers: number[]) => {
      try {
        let token: string | null = null;

        // Check if we're using electron or dev mode
        if (window.electron) {
          token = await window.electron.auth.getToken();
        } else {
          // In dev mode, get token from auth store
          const authStore = require("./authStore").useAuthStore.getState();
          token = authStore.token;
        }

        if (!token || token === "dev-token") return;

        const api = new GitHubAPI(token);
        const stats = await api.fetchPRStatistics(owner, repo, prNumbers);

        // Update the PRs with the fetched stats
        set((state) => {
          const newPRs = new Map(state.pullRequests);
          stats.forEach((stat, prNumber) => {
            const prKey = `${owner}/${repo}#${prNumber}`;
            const pr = newPRs.get(prKey);
            if (pr) {
              newPRs.set(prKey, {
                ...pr,
                additions: stat.additions,
                deletions: stat.deletions,
                changed_files: stat.changed_files,
              });
            }
          });
          return { pullRequests: newPRs };
        });
      } catch (error) {
        console.error("Failed to fetch PR stats:", error);
      }
    },
  };
});
