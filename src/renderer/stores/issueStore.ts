import { create } from 'zustand';
import { GitHubAPI, Issue, Repository } from '../services/github';
import { mockIssues } from '../mockData';

export interface IssueFilters {
  status: 'all' | 'open' | 'closed';
  labels: string[];
  assignee: 'all' | 'assigned' | 'unassigned' | string;
}

interface IssueState {
  issues: Map<string, Issue>;
  loadedRepos: Set<string>;
  loading: boolean;
  error: string | null;
  filters: IssueFilters;
  
  fetchIssues: (owner: string, repo: string, force?: boolean) => Promise<void>;
  updateIssue: (issue: Issue) => void;
  setFilter: (key: keyof IssueFilters, value: any) => void;
  setFilters: (filters: IssueFilters) => void;
  resetFilters: () => void;
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: new Map(),
  loadedRepos: new Set(),
  loading: false,
  error: null,
  filters: {
    status: 'all',
    labels: [],
    assignee: 'all'
  },

  fetchIssues: async (owner: string, repo: string, force = false) => {
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
      
      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require('./authStore').useAuthStore.getState();
        token = authStore.token;
      }
      
      if (!token) throw new Error('Not authenticated');
      
      let issues: Issue[];
      
      // Use mock data for dev token
      if (token === 'dev-token') {
        await new Promise(resolve => setTimeout(resolve, 500));
        issues = mockIssues as Issue[];
      } else {
        const api = new GitHubAPI(token);
        issues = await api.getIssues(owner, repo, 'all');
      }
      
      const issueMap = new Map<string, Issue>();
      issues.forEach(issue => {
        issueMap.set(`${owner}/${repo}#${issue.number}`, issue);
      });
      
      set({ 
        issues: issueMap,
        loading: false 
      });

      get().loadedRepos.add(repoFullName);
      
    } catch (error) {
      set({ 
        error: (error as Error).message,
        loading: false 
      });
    }
  },

  updateIssue: (issue) => {
    set((state) => {
      const newIssues = new Map(state.issues);
      const key = `${issue.repository.owner.login}/${issue.repository.name}#${issue.number}`;
      newIssues.set(key, issue);
      return { issues: newIssues };
    });
  },

  setFilter: (key, value) => {
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: value
      }
    }));
  },

  setFilters: (filters) => {
    set({ filters });
  },

  resetFilters: () => {
    set({
      filters: {
        status: 'all',
        labels: [],
        assignee: 'all'
      }
    });
  },
}));
