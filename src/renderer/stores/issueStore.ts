import { create } from "zustand";
import { GitHubAPI, Issue, Repository } from "../services/github";
import { mockIssues } from "../mockData";

export interface IssueFilters {
  status: "all" | "open" | "closed";
  labels: string[];
  assignee: "all" | "assigned" | "unassigned" | string;
  author: string;
}

interface IssueState {
  issues: Map<string, Issue>;
  loadedRepos: Set<string>;
  loading: boolean;
  error: string | null;
  filters: IssueFilters;
  availableLabels: Map<string, Array<{ name: string; color: string; description: string | null }>>;

  fetchIssues: (owner: string, repo: string, force?: boolean) => Promise<void>;
  updateIssue: (issue: Issue) => void;
  closeIssue: (owner: string, repo: string, issueNumber: number) => Promise<void>;
  reopenIssue: (owner: string, repo: string, issueNumber: number) => Promise<void>;
  addIssueLabels: (owner: string, repo: string, issueNumber: number, labels: string[]) => Promise<void>;
  removeIssueLabel: (owner: string, repo: string, issueNumber: number, label: string) => Promise<void>;
  setIssueLabels: (owner: string, repo: string, issueNumber: number, labels: string[]) => Promise<void>;
  fetchRepositoryLabels: (owner: string, repo: string) => Promise<void>;
  setFilter: (key: keyof IssueFilters, value: any) => void;
  setFilters: (filters: IssueFilters) => void;
  resetFilters: () => void;
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: new Map(),
  loadedRepos: new Set(),
  loading: false,
  error: null,
  availableLabels: new Map(),
  filters: {
    status: "all",
    labels: [],
    assignee: "all",
    author: "all",
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
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let issues: Issue[];

      // Use mock data for dev token
      if (token === "dev-token") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        issues = mockIssues as Issue[];
      } else {
        const api = new GitHubAPI(token);
        issues = await api.getIssues(owner, repo, "all");
      }

      const issueMap = new Map<string, Issue>();
      issues.forEach((issue) => {
        issueMap.set(`${owner}/${repo}#${issue.number}`, issue);
      });

      set({
        issues: issueMap,
        loading: false,
      });

      get().loadedRepos.add(repoFullName);
    } catch (error) {
      set({
        error: (error as Error).message,
        loading: false,
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
        [key]: value,
      },
    }));
  },

  setFilters: (filters) => {
    set({ filters });
  },

  resetFilters: () => {
    set({
      filters: {
        status: "all",
        labels: [],
        assignee: "all",
        author: "all",
      },
    });
  },

  closeIssue: async (owner: string, repo: string, issueNumber: number) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let updatedIssue: Issue;

      if (token === "dev-token") {
        // Mock update for dev mode
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          updatedIssue = { ...currentIssue, state: "closed" as const };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.closeIssue(owner, repo, issueNumber);
      }

      // Update the issue in the store
      get().updateIssue(updatedIssue);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  reopenIssue: async (owner: string, repo: string, issueNumber: number) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let updatedIssue: Issue;

      if (token === "dev-token") {
        // Mock update for dev mode
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          updatedIssue = { ...currentIssue, state: "open" as const };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.reopenIssue(owner, repo, issueNumber);
      }

      // Update the issue in the store
      get().updateIssue(updatedIssue);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  addIssueLabels: async (owner: string, repo: string, issueNumber: number, labels: string[]) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let updatedIssue: Issue;

      if (token === "dev-token") {
        // Mock update for dev mode
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          const newLabels = labels.map(name => ({ name, color: "#" + Math.floor(Math.random()*16777215).toString(16) }));
          updatedIssue = { 
            ...currentIssue, 
            labels: [...currentIssue.labels, ...newLabels]
          };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.addIssueLabels(owner, repo, issueNumber, labels);
      }

      // Update the issue in the store
      get().updateIssue(updatedIssue);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  removeIssueLabel: async (owner: string, repo: string, issueNumber: number, label: string) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      if (token === "dev-token") {
        // Mock update for dev mode
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          const updatedIssue = { 
            ...currentIssue, 
            labels: currentIssue.labels.filter(l => l.name !== label)
          };
          get().updateIssue(updatedIssue);
        }
      } else {
        const api = new GitHubAPI(token);
        await api.removeIssueLabel(owner, repo, issueNumber, label);
        
        // Update the issue in the store by removing the label
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          const updatedIssue = { 
            ...currentIssue, 
            labels: currentIssue.labels.filter(l => l.name !== label)
          };
          get().updateIssue(updatedIssue);
        }
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setIssueLabels: async (owner: string, repo: string, issueNumber: number, labels: string[]) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let updatedIssue: Issue;

      if (token === "dev-token") {
        // Mock update for dev mode
        const key = `${owner}/${repo}#${issueNumber}`;
        const currentIssue = get().issues.get(key);
        if (currentIssue) {
          const newLabels = labels.map(name => ({ name, color: "#" + Math.floor(Math.random()*16777215).toString(16) }));
          updatedIssue = { 
            ...currentIssue, 
            labels: newLabels
          };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.setIssueLabels(owner, repo, issueNumber, labels);
      }

      // Update the issue in the store
      get().updateIssue(updatedIssue);
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchRepositoryLabels: async (owner: string, repo: string) => {
    const repoFullName = `${owner}/${repo}`;

    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let labels: Array<{ name: string; color: string; description: string | null }>;

      if (token === "dev-token") {
        // Mock labels for dev mode
        labels = [
          { name: "bug", color: "d73a4a", description: "Something isn't working" },
          { name: "enhancement", color: "a2eeef", description: "New feature or request" },
          { name: "good first issue", color: "7057ff", description: "Good for newcomers" },
          { name: "help wanted", color: "008672", description: "Extra attention is needed" },
          { name: "invalid", color: "e4e669", description: "This doesn't seem right" },
          { name: "question", color: "d876e3", description: "Further information is requested" },
          { name: "wontfix", color: "ffffff", description: "This will not be worked on" },
        ];
      } else {
        const api = new GitHubAPI(token);
        labels = await api.getRepositoryLabels(owner, repo);
      }

      set((state) => {
        const newAvailableLabels = new Map(state.availableLabels);
        newAvailableLabels.set(repoFullName, labels);
        return { availableLabels: newAvailableLabels };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
