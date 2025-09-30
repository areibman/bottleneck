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
  selectedIssues: Set<string>;

  fetchIssues: (owner: string, repo: string, force?: boolean) => Promise<void>;
  updateIssue: (issue: Issue) => void;
  closeIssue: (owner: string, repo: string, issueNumber: number) => Promise<void>;
  reopenIssue: (owner: string, repo: string, issueNumber: number) => Promise<void>;
  closeSelectedIssues: (owner: string, repo: string) => Promise<void>;
  addLabel: (owner: string, repo: string, issueNumber: number, label: string) => Promise<void>;
  removeLabel: (owner: string, repo: string, issueNumber: number, label: string) => Promise<void>;
  toggleIssueSelection: (issueKey: string) => void;
  clearSelection: () => void;
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
    status: "all",
    labels: [],
    assignee: "all",
    author: "all",
  },
  selectedIssues: new Set(),

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
        // Mock mode - update the issue locally
        const key = `${owner}/${repo}#${issueNumber}`;
        const issue = get().issues.get(key);
        if (issue) {
          updatedIssue = { ...issue, state: "closed", closed_at: new Date().toISOString() };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.closeIssue(owner, repo, issueNumber);
      }

      get().updateIssue(updatedIssue);
    } catch (error) {
      console.error("Failed to close issue:", error);
      throw error;
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
        // Mock mode - update the issue locally
        const key = `${owner}/${repo}#${issueNumber}`;
        const issue = get().issues.get(key);
        if (issue) {
          updatedIssue = { ...issue, state: "open", closed_at: null };
        } else {
          throw new Error("Issue not found");
        }
      } else {
        const api = new GitHubAPI(token);
        updatedIssue = await api.reopenIssue(owner, repo, issueNumber);
      }

      get().updateIssue(updatedIssue);
    } catch (error) {
      console.error("Failed to reopen issue:", error);
      throw error;
    }
  },

  closeSelectedIssues: async (owner: string, repo: string) => {
    const selectedKeys = Array.from(get().selectedIssues);
    
    for (const key of selectedKeys) {
      const issue = get().issues.get(key);
      if (issue && issue.state === "open") {
        try {
          await get().closeIssue(owner, repo, issue.number);
        } catch (error) {
          console.error(`Failed to close issue #${issue.number}:`, error);
        }
      }
    }

    // Clear selection after closing
    get().clearSelection();
  },

  addLabel: async (owner: string, repo: string, issueNumber: number, label: string) => {
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
        // Mock mode - update the issue locally
        const key = `${owner}/${repo}#${issueNumber}`;
        const issue = get().issues.get(key);
        if (issue) {
          const updatedIssue = {
            ...issue,
            labels: [...issue.labels, { name: label, color: "cccccc" }],
          };
          get().updateIssue(updatedIssue);
        }
      } else {
        const api = new GitHubAPI(token);
        await api.addIssueLabels(owner, repo, issueNumber, [label]);
        // Fetch updated issue
        const updatedIssue = await api.getIssue(owner, repo, issueNumber);
        get().updateIssue(updatedIssue);
      }
    } catch (error) {
      console.error("Failed to add label:", error);
      throw error;
    }
  },

  removeLabel: async (owner: string, repo: string, issueNumber: number, label: string) => {
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
        // Mock mode - update the issue locally
        const key = `${owner}/${repo}#${issueNumber}`;
        const issue = get().issues.get(key);
        if (issue) {
          const updatedIssue = {
            ...issue,
            labels: issue.labels.filter((l) => l.name !== label),
          };
          get().updateIssue(updatedIssue);
        }
      } else {
        const api = new GitHubAPI(token);
        await api.removeIssueLabel(owner, repo, issueNumber, label);
        // Fetch updated issue
        const updatedIssue = await api.getIssue(owner, repo, issueNumber);
        get().updateIssue(updatedIssue);
      }
    } catch (error) {
      console.error("Failed to remove label:", error);
      throw error;
    }
  },

  toggleIssueSelection: (issueKey: string) => {
    set((state) => {
      const newSelection = new Set(state.selectedIssues);
      if (newSelection.has(issueKey)) {
        newSelection.delete(issueKey);
      } else {
        newSelection.add(issueKey);
      }
      return { selectedIssues: newSelection };
    });
  },

  clearSelection: () => {
    set({ selectedIssues: new Set() });
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
}));
