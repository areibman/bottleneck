import { create } from "zustand";
import { GitHubAPI, Issue } from "../services/github";
import { mockIssues } from "../mockData";

export interface IssueFilters {
  status: "all" | "open" | "closed";
  labels: string[];
  assignee: "all" | "assigned" | "unassigned" | string;
  author: string;
}

export interface IssueWithMetadata extends Issue {
  relatedPRs?: Array<{
    number: number;
    state: string;
    merged: boolean;
    title: string;
  }>;
  kanbanColumn?: "unassigned" | "todo" | "in-progress" | "in-review" | "done" | "closed";
}

interface IssueState {
  issues: Map<string, Issue>;
  issuesMetadata: Map<string, { relatedPRs?: any[] }>;
  loadedRepos: Set<string>;
  loading: boolean;
  error: string | null;
  filters: IssueFilters;
  selectedIssues: Set<number>;
  repoLabels: Array<{ name: string; color: string; description: string | null }>;

  fetchIssues: (owner: string, repo: string, force?: boolean) => Promise<void>;
  fetchIssueMetadata: (owner: string, repo: string, issueNumber: number) => Promise<void>;
  updateIssue: (issue: Issue) => void;
  closeIssues: (owner: string, repo: string, issueNumbers: number[]) => Promise<void>;
  reopenIssues: (owner: string, repo: string, issueNumbers: number[]) => Promise<void>;
  toggleIssueSelection: (issueNumber: number) => void;
  clearSelection: () => void;
  selectAll: (issueNumbers: number[]) => void;
  fetchRepoLabels: (owner: string, repo: string) => Promise<void>;
  createLabel: (owner: string, repo: string, name: string, color: string, description?: string) => Promise<void>;
  addLabelsToIssues: (owner: string, repo: string, issueNumbers: number[], labels: string[]) => Promise<void>;
  removeLabelsFromIssues: (owner: string, repo: string, issueNumbers: number[], labels: string[]) => Promise<void>;
  assignIssue: (owner: string, repo: string, issueNumber: number, assignees: string[]) => Promise<void>;
  unassignIssue: (owner: string, repo: string, issueNumber: number, assignees: string[]) => Promise<void>;
  setFilter: (key: keyof IssueFilters, value: any) => void;
  setFilters: (filters: IssueFilters) => void;
  resetFilters: () => void;
}

export const useIssueStore = create<IssueState>((set, get) => ({
  issues: new Map(),
  issuesMetadata: new Map(),
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
  repoLabels: [],

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

  toggleIssueSelection: (issueNumber: number) => {
    set((state) => {
      const newSelected = new Set(state.selectedIssues);
      if (newSelected.has(issueNumber)) {
        newSelected.delete(issueNumber);
      } else {
        newSelected.add(issueNumber);
      }
      return { selectedIssues: newSelected };
    });
  },

  clearSelection: () => {
    set({ selectedIssues: new Set() });
  },

  selectAll: (issueNumbers: number[]) => {
    set({ selectedIssues: new Set(issueNumbers) });
  },

  closeIssues: async (owner: string, repo: string, issueNumbers: number[]) => {
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
        // Mock closing for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          issueNumbers.forEach((number) => {
            const key = `${owner}/${repo}#${number}`;
            const issue = newIssues.get(key);
            if (issue) {
              newIssues.set(key, { ...issue, state: "closed" });
            }
          });
          return { issues: newIssues, selectedIssues: new Set() };
        });
      } else {
        const api = new GitHubAPI(token);
        const closedIssues = await Promise.all(
          issueNumbers.map((number) => api.closeIssue(owner, repo, number))
        );

        set((state) => {
          const newIssues = new Map(state.issues);
          closedIssues.forEach((issue) => {
            const key = `${owner}/${repo}#${issue.number}`;
            newIssues.set(key, issue);
          });
          return { issues: newIssues, selectedIssues: new Set() };
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  reopenIssues: async (owner: string, repo: string, issueNumbers: number[]) => {
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
        // Mock reopening for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          issueNumbers.forEach((number) => {
            const key = `${owner}/${repo}#${number}`;
            const issue = newIssues.get(key);
            if (issue) {
              newIssues.set(key, { ...issue, state: "open" });
            }
          });
          return { issues: newIssues, selectedIssues: new Set() };
        });
      } else {
        const api = new GitHubAPI(token);
        const openedIssues = await Promise.all(
          issueNumbers.map((number) => api.reopenIssue(owner, repo, number))
        );

        set((state) => {
          const newIssues = new Map(state.issues);
          openedIssues.forEach((issue) => {
            const key = `${owner}/${repo}#${issue.number}`;
            newIssues.set(key, issue);
          });
          return { issues: newIssues, selectedIssues: new Set() };
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchRepoLabels: async (owner: string, repo: string) => {
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
        // Mock labels for dev mode
        set({
          repoLabels: [
            { name: "bug", color: "d73a4a", description: "Something isn't working" },
            { name: "enhancement", color: "a2eeef", description: "New feature or request" },
            { name: "documentation", color: "0075ca", description: "Improvements or additions to documentation" },
            { name: "duplicate", color: "cfd3d7", description: "This issue or pull request already exists" },
            { name: "good first issue", color: "7057ff", description: "Good for newcomers" },
            { name: "help wanted", color: "008672", description: "Extra attention is needed" },
            { name: "invalid", color: "e4e669", description: "This doesn't seem right" },
            { name: "question", color: "d876e3", description: "Further information is requested" },
            { name: "wontfix", color: "ffffff", description: "This will not be worked on" },
          ],
        });
      } else {
        const api = new GitHubAPI(token);
        const labels = await api.getRepoLabels(owner, repo);
        set({ repoLabels: labels });
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  createLabel: async (owner: string, repo: string, name: string, color: string, description?: string) => {
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
        // Add to mock labels
        const newLabel = { name, color, description: description || null };
        set({ repoLabels: [...get().repoLabels, newLabel] });
      } else {
        const api = new GitHubAPI(token);
        const newLabel = await api.createLabel(owner, repo, name, color, description);
        set({ repoLabels: [...get().repoLabels, newLabel] });
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  addLabelsToIssues: async (owner: string, repo: string, issueNumbers: number[], labels: string[]) => {
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
        // Mock adding labels for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          issueNumbers.forEach((number) => {
            const key = `${owner}/${repo}#${number}`;
            const issue = newIssues.get(key);
            if (issue) {
              const existingLabels = new Set(issue.labels.map(l => l.name));
              const newLabels = labels.filter(l => !existingLabels.has(l));
              const mockLabels = newLabels.map(name => ({
                name,
                color: Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
              }));
              newIssues.set(key, {
                ...issue,
                labels: [...issue.labels, ...mockLabels],
              });
            }
          });
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);
        await Promise.all(
          issueNumbers.map(async (number) => {
            const updatedLabels = await api.addIssueLabels(owner, repo, number, labels);
            set((state) => {
              const newIssues = new Map(state.issues);
              const key = `${owner}/${repo}#${number}`;
              const issue = newIssues.get(key);
              if (issue) {
                newIssues.set(key, { ...issue, labels: updatedLabels });
              }
              return { issues: newIssues };
            });
          })
        );
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  removeLabelsFromIssues: async (owner: string, repo: string, issueNumbers: number[], labels: string[]) => {
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
        // Mock removing labels for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          issueNumbers.forEach((number) => {
            const key = `${owner}/${repo}#${number}`;
            const issue = newIssues.get(key);
            if (issue) {
              const labelsToRemove = new Set(labels);
              newIssues.set(key, {
                ...issue,
                labels: issue.labels.filter(l => !labelsToRemove.has(l.name)),
              });
            }
          });
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);
        await Promise.all(
          issueNumbers.flatMap((number) =>
            labels.map((label) => api.removeIssueLabel(owner, repo, number, label))
          )
        );

        // Refetch issues to get updated labels
        await get().fetchIssues(owner, repo, true);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  fetchIssueMetadata: async (owner: string, repo: string, issueNumber: number) => {
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
        // Mock metadata for dev mode
        set((state) => {
          const newMetadata = new Map(state.issuesMetadata);
          newMetadata.set(`${owner}/${repo}#${issueNumber}`, {
            relatedPRs: [],
          });
          return { issuesMetadata: newMetadata };
        });
      } else {
        const api = new GitHubAPI(token);
        const relatedPRs = await api.getRelatedPullRequests(owner, repo, issueNumber);
        
        set((state) => {
          const newMetadata = new Map(state.issuesMetadata);
          newMetadata.set(`${owner}/${repo}#${issueNumber}`, {
            relatedPRs,
          });
          return { issuesMetadata: newMetadata };
        });
      }
    } catch (error) {
      console.error("Failed to fetch issue metadata:", error);
    }
  },

  assignIssue: async (owner: string, repo: string, issueNumber: number, assignees: string[]) => {
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
        // Mock assigning for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            newIssues.set(key, {
              ...issue,
              assignees: [
                ...issue.assignees,
                ...assignees.map(login => ({
                  login,
                  avatar_url: `https://github.com/${login}.png`,
                })),
              ],
            });
          }
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);
        const updatedIssue = await api.assignIssueTo(owner, repo, issueNumber, assignees);
        get().updateIssue(updatedIssue);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  unassignIssue: async (owner: string, repo: string, issueNumber: number, assignees: string[]) => {
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
        // Mock unassigning for dev mode
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            const assigneesToRemove = new Set(assignees);
            newIssues.set(key, {
              ...issue,
              assignees: issue.assignees.filter(a => !assigneesToRemove.has(a.login)),
            });
          }
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);
        const updatedIssue = await api.unassignIssue(owner, repo, issueNumber, assignees);
        get().updateIssue(updatedIssue);
      }
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
