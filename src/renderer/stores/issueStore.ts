import { create } from "zustand";
import { GitHubAPI, Issue } from "../services/github";
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
  selectedIssues: Set<number>;
  repoLabels: Array<{ name: string; color: string; description: string | null }>;

  fetchIssues: (owner: string, repo: string, force?: boolean) => Promise<void>;
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
  getLinkedPRs: (
    owner: string,
    repo: string,
    issueNumber: number
  ) => Promise<{ prNumbers: number[]; hasOpenPR: boolean; hasMergedPR: boolean; hasInReview: boolean }>;
  setFilter: (key: keyof IssueFilters, value: any) => void;
  setFilters: (filters: IssueFilters) => void;
  resetFilters: () => void;
  setIssueStatus: (
    owner: string,
    repo: string,
    issueNumber: number,
    status: "todo" | "in_progress" | "in_review" | "done" | "none"
  ) => Promise<void>;
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

  getLinkedPRs: async (owner: string, repo: string, issueNumber: number) => {
    try {
      let token: string | null = null;
      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }
      if (!token || token === "dev-token") {
        return { prNumbers: [], hasOpenPR: false, hasMergedPR: false, hasInReview: false };
      }
      const api = new GitHubAPI(token);
      const linked = await api.getLinkedPullRequestsForIssue(owner, repo, issueNumber);
      const prNumbers = linked.map((p) => p.number);
      const hasMergedPR = linked.some((p) => Boolean(p.mergedAt));
      const hasOpenPR = linked.some((p) => p.state === "OPEN");
      const hasInReview = linked.some((p) => p.state === "OPEN" && (p.reviewDecision === "REVIEW_REQUIRED" || p.reviewDecision === "CHANGES_REQUESTED"));
      return { prNumbers, hasOpenPR, hasMergedPR, hasInReview };
    } catch (error) {
      set({ error: (error as Error).message });
      return { prNumbers: [], hasOpenPR: false, hasMergedPR: false, hasInReview: false };
    }
  },

  setIssueStatus: async (
    owner: string,
    repo: string,
    issueNumber: number,
    status: "todo" | "in_progress" | "in_review" | "done" | "none"
  ) => {
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = require("./authStore").useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      // Compute new labels by removing any existing status: labels and adding the new one (except for none)
      const key = `${owner}/${repo}#${issueNumber}`;
      const currentIssue = get().issues.get(key);
      if (!currentIssue) return;

      const STATUS_LABELS = new Set(["status:todo", "status:in-progress", "status:in-review", "status:done"]);
      const filteredExisting = currentIssue.labels.filter((l) => !STATUS_LABELS.has(l.name));
      const statusToLabel: Record<string, string | null> = {
        todo: "status:todo",
        in_progress: "status:in-progress",
        in_review: "status:in-review",
        done: "status:done",
        none: null,
      };
      const newStatusLabel = statusToLabel[status];
      const nextLabelNames = [
        ...filteredExisting.map((l) => l.name),
        ...(newStatusLabel ? [newStatusLabel] : []),
      ];

      // Optimistic update
      set((state) => {
        const newIssues = new Map(state.issues);
        const updated = {
          ...currentIssue,
          labels: nextLabelNames.map((name) => {
            const existing = filteredExisting.find((l) => l.name === name);
            return existing || { name, color: "999999" } as any;
          }),
        } as Issue;
        newIssues.set(key, updated);
        return { issues: newIssues };
      });

      if (token === "dev-token") {
        // No server call in dev mode
        return;
      }

      const api = new GitHubAPI(token);
      const updatedLabels = await api.setIssueLabels(owner, repo, issueNumber, nextLabelNames);

      // Sync with server-confirmed labels
      set((state) => {
        const newIssues = new Map(state.issues);
        const issue = newIssues.get(key);
        if (issue) {
          newIssues.set(key, { ...issue, labels: updatedLabels });
        }
        return { issues: newIssues };
      });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },
}));
