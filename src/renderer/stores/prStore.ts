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

interface PRState {
  pullRequests: Map<string, PullRequest>;
  repositories: Repository[];
  selectedRepo: Repository | null;
  recentlyViewedRepos: Repository[];
  loadedRepos: Set<string>;
  filters: PRFilters;
  groups: PRGroup[];
  loading: boolean;
  error: string | null;

  fetchPullRequests: (
    owner: string,
    repo: string,
    force?: boolean,
  ) => Promise<void>;
  fetchPRDetails: (
    owner: string,
    repo: string,
    pullNumber: number,
  ) => Promise<PullRequest | null>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (repo: Repository | null) => void;
  addToRecentlyViewed: (repo: Repository) => void;
  removeFromRecentlyViewed: (repoId: number) => void;
  setFilter: (filter: string) => void;
  setFilters: (filters: Partial<PRFilters>) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;
  groupPRsByPrefix: () => void;
  updatePR: (pr: PullRequest) => void;
  bulkUpdatePRs: (prs: PullRequest[]) => void;
  storePRsInDB: (
    prs: PullRequest[],
    owner: string,
    repo: string,
  ) => Promise<void>;
  storeReposInDB: (repos: Repository[]) => Promise<void>;
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

        // Auto-fetch PRs for the selected repo
        const repoToLoad = updates.selectedRepo;
        if (repoToLoad) {
          get().fetchPullRequests(repoToLoad.owner, repoToLoad.name);
        }
      }
    },
  );

  return {
    pullRequests: new Map(),
    repositories: [],
    selectedRepo: null,
    recentlyViewedRepos: [],
    loadedRepos: new Set(),
    filters: {
      author: "all",
      agent: "all",
    },
    groups: [],
    loading: false,
    error: null,

    fetchPullRequests: async (owner: string, repo: string, force = false) => {
      const repoFullName = `${owner}/${repo}`;

      // Skip if already loading
      if (get().loading) {
        return;
      }

      // Check if we need to fetch
      // We need to fetch if:
      // 1. Force is true
      // 2. We have no PRs at all
      // 3. The PRs we have are for a different repository
      const currentPRs = Array.from(get().pullRequests.values());
      const currentRepoFullName = currentPRs[0]
        ? `${currentPRs[0].base?.repo?.owner?.login}/${currentPRs[0].base?.repo?.name}`
        : null;
      const needsFetch =
        force ||
        currentPRs.length === 0 ||
        currentRepoFullName !== repoFullName;

      if (!needsFetch) {
        return; // We already have the right PRs
      }

      // Clear existing PRs and show loading state
      set({
        pullRequests: new Map(),
        loading: true,
        error: null,
      });

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

        set({
          pullRequests: prMap,
          loading: false,
        });

        // Auto-group PRs after fetching
        get().groupPRsByPrefix();

        // Store in database (skip for dev mode)
        if (token !== "dev-token" && window.electron) {
          await get().storePRsInDB(prs, owner, repo);
        }
      } catch (error) {
        set({
          error: (error as Error).message,
          loading: false,
        });
      }
    },

    fetchPRDetails: async (owner: string, repo: string, pullNumber: number) => {
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

          // Update the store
          get().updatePR(updatedPR);

          console.log(`Updated PR #${pullNumber} with detailed data:`, {
            changed_files: updatedPR.changed_files,
            additions: updatedPR.additions,
            deletions: updatedPR.deletions,
          });

          return updatedPR;
        }

        return detailedPR;
      } catch (error) {
        console.error(`Failed to fetch PR details for #${pullNumber}:`, error);
        return null;
      }
    },

    fetchRepositories: async () => {
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

        // Store in database (skip for dev mode)
        if (token !== "dev-token" && window.electron) {
          await get().storeReposInDB(repos);
        }
      } catch (error) {
        set({
          error: (error as Error).message,
          loading: false,
        });
      }
    },

    setSelectedRepo: (repo) => {
      set({ selectedRepo: repo });

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
        filters: state.filters.includes(filter)
          ? state.filters.filter((f) => f !== filter)
          : [...state.filters, filter],
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

    removeFilter: (filter) => {
      set((state) => ({
        filters: state.filters.filter((f) => f !== filter),
      }));
    },

    clearFilters: () => {
      set({
        filters: {
          author: "all",
          agent: "all",
        },
      });
    },

    groupPRsByPrefix: () => {
      const { pullRequests } = get();
      const groups = new Map<string, PRGroup>();

      // Group PRs by common prefixes
      pullRequests.forEach((pr) => {
        // Try to extract prefix from title or branch
        const title = pr.title.toLowerCase();
        const branch = pr.head.ref.toLowerCase();

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

    // Database operations
    storePRsInDB: async (prs: PullRequest[], owner: string, repo: string) => {
      // Get repo ID first
      const repoResult = await window.electron.db.query(
        "SELECT id FROM repositories WHERE owner = ? AND name = ?",
        [owner, repo],
      );

      if (
        !repoResult.success ||
        !repoResult.data ||
        repoResult.data.length === 0
      )
        return;

      const repoId = repoResult.data[0].id;

      // Store each PR
      for (const pr of prs) {
        await window.electron.db.execute(
          `INSERT OR REPLACE INTO pull_requests 
         (id, repository_id, number, title, body, state, draft, merged, mergeable,
          merge_commit_sha, head_ref, head_sha, base_ref, base_sha, author_login,
          author_avatar_url, assignees, reviewers, labels, created_at, updated_at,
          closed_at, merged_at, last_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            pr.id,
            repoId,
            pr.number,
            pr.title,
            pr.body,
            pr.state,
            pr.draft ? 1 : 0,
            pr.merged ? 1 : 0,
            pr.mergeable ? 1 : 0,
            pr.merge_commit_sha,
            pr.head.ref,
            pr.head.sha,
            pr.base.ref,
            pr.base.sha,
            pr.user.login,
            pr.user.avatar_url,
            JSON.stringify(pr.assignees),
            JSON.stringify(pr.requested_reviewers),
            JSON.stringify(pr.labels),
            pr.created_at,
            pr.updated_at,
            pr.closed_at,
            pr.merged_at,
          ],
        );
      }
    },

    storeReposInDB: async (repos: Repository[]) => {
      for (const repo of repos) {
        await window.electron.db.execute(
          `INSERT OR REPLACE INTO repositories 
         (owner, name, full_name, description, default_branch, private, clone_url, last_synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            repo.owner,
            repo.name,
            repo.full_name,
            repo.description,
            repo.default_branch,
            repo.private ? 1 : 0,
            repo.clone_url,
          ],
        );
      }
    },
  };
});
