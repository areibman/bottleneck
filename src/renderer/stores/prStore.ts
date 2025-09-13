import { create } from 'zustand';
import { GitHubAPI, PullRequest, Repository } from '../services/github';
import { mockPullRequests } from '../mockData';

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

interface PRState {
  pullRequests: Map<string, PullRequest>;
  repositories: Repository[];
  selectedRepo: Repository | null;
  loadedRepos: Set<string>;
  filters: string[];
  groups: PRGroup[];
  loading: boolean;
  error: string | null;
  
  fetchPullRequests: (owner: string, repo: string, force?: boolean) => Promise<void>;
  fetchRepositories: () => Promise<void>;
  setSelectedRepo: (repo: Repository | null) => void;
  setFilter: (filter: string) => void;
  removeFilter: (filter: string) => void;
  clearFilters: () => void;
  groupPRsByPrefix: () => void;
  updatePR: (pr: PullRequest) => void;
  bulkUpdatePRs: (prs: PullRequest[]) => void;
  storePRsInDB: (prs: PullRequest[], owner: string, repo: string) => Promise<void>;
  storeReposInDB: (repos: Repository[]) => Promise<void>;
}

export const usePRStore = create<PRState>((set, get) => ({
  pullRequests: new Map(),
  repositories: [],
  selectedRepo: null,
  loadedRepos: new Set(),
  filters: ['open'],
  groups: [],
  loading: false,
  error: null,

  fetchPullRequests: async (owner: string, repo: string, force = false) => {
    const repoFullName = `${owner}/${repo}`;
    
    // Skip if already loading
    if (get().loading) {
      return;
    }
    
    // Skip if already loaded (unless forced)
    if (get().loadedRepos.has(repoFullName) && !force) {
      // Still have data, just return without setting loading
      return;
    }

    set({ loading: true, error: null });
    
    try {
      let token: string | null = null;
      
      // Check if we're using electron or dev mode
      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        // In dev mode, get token from auth store
        const authStore = require('./authStore').useAuthStore.getState();
        token = authStore.token;
      }
      
      if (!token) throw new Error('Not authenticated');
      
      let prs: PullRequest[];
      
      // Use mock data for dev token
      if (token === 'dev-token') {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        prs = mockPullRequests as PullRequest[];
      } else {
        const api = new GitHubAPI(token);
        prs = await api.getPullRequests(owner, repo, 'all');
      }
      
      const prMap = new Map<string, PullRequest>();
      prs.forEach(pr => {
        prMap.set(`${owner}/${repo}#${pr.number}`, pr);
      });
      
      set({ 
        pullRequests: prMap,
        loading: false 
      });
      
      get().loadedRepos.add(repoFullName);

      // Auto-group PRs after fetching
      get().groupPRsByPrefix();
      
      // Store in database (skip for dev mode)
      if (token !== 'dev-token' && window.electron) {
        await get().storePRsInDB(prs, owner, repo);
      }
    } catch (error) {
      set({ 
        error: (error as Error).message,
        loading: false 
      });
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
        const authStore = require('./authStore').useAuthStore.getState();
        token = authStore.token;
      }
      
      if (!token) {
        set({ loading: false });
        return;
      }
      
      let repos: Repository[];
      
      // Use mock repositories for dev token
      if (token === 'dev-token') {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 300));
        repos = [
          {
            id: 1,
            owner: 'dev-user',
            name: 'bottleneck',
            full_name: 'dev-user/bottleneck',
            description: 'Fast GitHub PR review and branch management',
            default_branch: 'main',
            private: false,
            clone_url: 'https://github.com/dev-user/bottleneck.git'
          },
          {
            id: 2,
            owner: 'dev-user',
            name: 'sample-project',
            full_name: 'dev-user/sample-project',
            description: 'A sample project for testing',
            default_branch: 'main',
            private: false,
            clone_url: 'https://github.com/dev-user/sample-project.git'
          }
        ];
      } else {
        const api = new GitHubAPI(token);
        repos = await api.getRepositories();
      }
      
      set({ 
        repositories: repos,
        loading: false 
      });
      
      // Store in database (skip for dev mode)
      if (token !== 'dev-token' && window.electron) {
        await get().storeReposInDB(repos);
      }
    } catch (error) {
      set({ 
        error: (error as Error).message,
        loading: false 
      });
    }
  },

  setSelectedRepo: (repo) => {
    set({ selectedRepo: repo });
  },

  setFilter: (filter) => {
    set((state) => ({
      filters: state.filters.includes(filter) 
        ? state.filters.filter(f => f !== filter)
        : [...state.filters, filter]
    }));
  },

  removeFilter: (filter) => {
    set((state) => ({
      filters: state.filters.filter(f => f !== filter)
    }));
  },

  clearFilters: () => {
    set({ filters: [] });
  },

  groupPRsByPrefix: () => {
    const { pullRequests } = get();
    const groups = new Map<string, PRGroup>();
    
    // Group PRs by common prefixes
    pullRequests.forEach((pr) => {
      // Try to extract prefix from title or branch
      const title = pr.title.toLowerCase();
      const branch = pr.head.ref.toLowerCase();
      
      let prefix = '';
      
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
        
        if (pr.state === 'open') group.openCount++;
        else if (pr.merged) group.mergedCount++;
        else if (pr.state === 'closed') group.closedCount++;
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
      prs.forEach(pr => {
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
      'SELECT id FROM repositories WHERE owner = ? AND name = ?',
      [owner, repo]
    );
    
    if (!repoResult.success || !repoResult.data || repoResult.data.length === 0) return;
    
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
          pr.id, repoId, pr.number, pr.title, pr.body, pr.state, pr.draft ? 1 : 0,
          pr.merged ? 1 : 0, pr.mergeable ? 1 : 0, pr.merge_commit_sha,
          pr.head.ref, pr.head.sha, pr.base.ref, pr.base.sha,
          pr.user.login, pr.user.avatar_url,
          JSON.stringify(pr.assignees), JSON.stringify(pr.requested_reviewers),
          JSON.stringify(pr.labels), pr.created_at, pr.updated_at,
          pr.closed_at, pr.merged_at
        ]
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
          repo.owner, repo.name, repo.full_name, repo.description,
          repo.default_branch, repo.private ? 1 : 0, repo.clone_url
        ]
      );
    }
  },
}));
