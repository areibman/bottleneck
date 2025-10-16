import { create } from "zustand";
import { GitHubAPI, Issue } from "../services/github";
import { mockIssues } from "../mockData";
import { getLinkedPRsFromCache } from "../utils/issueLinks";
import { usePRStore } from "./prStore";
import { useAuthStore } from "./authStore";

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
  createIssue: (owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[]) => Promise<Issue>;
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
  setIssueLabels: (owner: string, repo: string, issueNumber: number, labels: string[]) => Promise<void>;
  linkPRsToIssue: (owner: string, repo: string, issueNumber: number, prNumbers: number[]) => Promise<void>;
  unlinkPRFromIssue: (owner: string, repo: string, issueNumber: number, prNumber: number) => Promise<void>;
  refreshIssueLinks: (owner: string, repo: string, issueNumber: number, options?: { forceAPI?: boolean }) => Promise<void>;
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
  repoLabels: [],

  fetchIssues: async (owner: string, repo: string, force = false) => {
    const repoFullName = `${owner}/${repo}`;
    console.log(`[STORE] 🔄 fetchIssues: ${repoFullName} (force=${force})`);

    // Skip if already loading
    if (get().loading) {
      console.log(`[STORE] ⏸️  fetchIssues: Already loading, skipping`);
      return;
    }

    // Skip if already loaded (unless forced)
    if (get().loadedRepos.has(repoFullName) && !force) {
      console.log(`[STORE] ✅ fetchIssues: Already loaded and not forced, skipping`);
      // Still have data, just return without setting loading
      return;
    }

    console.log(`[STORE] 📡 fetchIssues: Starting fetch...`);
    set({ loading: true, error: null });

    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
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

      console.log(`[STORE] ✅ fetchIssues: Loaded ${issues.length} issues`);
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

  createIssue: async (owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[]) => {
    console.log(`[STORE] ➕ createIssue: Creating issue in ${owner}/${repo}`, { title, labels, assignees });

    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      let newIssue: Issue;

      // Use mock data for dev token
      if (token === "dev-token") {
        await new Promise((resolve) => setTimeout(resolve, 500));
        // Create a mock issue with a random number
        const mockNumber = Math.floor(Math.random() * 1000) + 100;
        newIssue = {
          id: mockNumber,
          number: mockNumber,
          title,
          body: body || null,
          state: "open",
          user: {
            login: "dev-user",
            avatar_url: "https://github.com/identicons/dev.png",
          },
          labels: (labels || []).map((name) => ({
            name,
            color: Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
          })),
          assignees: (assignees || []).map((login) => ({
            login,
            avatar_url: `https://github.com/${login}.png`,
          })),
          comments: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          closed_at: null,
          repository: {
            owner: { login: owner },
            name: repo,
          },
        };
      } else {
        const api = new GitHubAPI(token);
        newIssue = await api.createIssue(owner, repo, title, body, labels, assignees);

        // Ensure repository info is set
        if (!newIssue.repository) {
          newIssue.repository = {
            owner: { login: owner },
            name: repo,
          };
        }
      }

      // Add the new issue to the store
      const key = `${owner}/${repo}#${newIssue.number}`;
      set((state) => {
        const newIssues = new Map(state.issues);
        newIssues.set(key, newIssue);
        return { issues: newIssues };
      });

      console.log(`[STORE] ✅ createIssue: Created issue #${newIssue.number}`);
      return newIssue;
    } catch (error) {
      console.error(`[STORE] ❌ createIssue: Error creating issue:`, error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateIssue: (issue) => {
    if (!issue.repository) {
      console.error('[STORE] ❌ updateIssue: Issue has no repository information');
      return;
    }
    const key = `${issue.repository.owner.login}/${issue.repository.name}#${issue.number}`;
    console.log(`[STORE] 📝 updateIssue: #${issue.number}`, {
      labels: issue.labels.map(l => l.name),
      state: issue.state
    });
    set((state) => {
      const newIssues = new Map(state.issues);
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
        const authStore = useAuthStore.getState();
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
        const authStore = useAuthStore.getState();
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
        const authStore = useAuthStore.getState();
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
        const authStore = useAuthStore.getState();
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
        const authStore = useAuthStore.getState();
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
        const authStore = useAuthStore.getState();
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

  setIssueLabels: async (owner: string, repo: string, issueNumber: number, labels: string[]) => {
    console.log(`[STORE] 🏷️  setIssueLabels: #${issueNumber} → [${labels.join(', ')}]`);
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      if (token === "dev-token") {
        // Mock setting labels for dev mode
        console.log(`[STORE] 💤 setIssueLabels: Using dev-token, simulating delay...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            console.log(`[STORE] ✅ setIssueLabels: Updating #${issueNumber} in store (dev mode)`);
            newIssues.set(key, {
              ...issue,
              labels: labels.map(name => ({
                name,
                color: Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
              })),
            });
          }
          return { issues: newIssues };
        });
      } else {
        console.log(`[STORE] 🌐 setIssueLabels: Calling GitHub API...`);
        const api = new GitHubAPI(token);
        const updatedLabels = await api.setIssueLabels(owner, repo, issueNumber, labels);
        console.log(`[STORE] 📥 setIssueLabels: Received response from GitHub:`, updatedLabels.map(l => l.name));

        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            console.log(`[STORE] ✅ setIssueLabels: Updating #${issueNumber} in store with GitHub response`);
            newIssues.set(key, { ...issue, labels: updatedLabels });
          } else {
            console.warn(`[STORE] ⚠️  setIssueLabels: Issue #${issueNumber} not found in store`);
          }
          return { issues: newIssues };
        });
      }
    } catch (error) {
      console.error(`[STORE] ❌ setIssueLabels: Error for #${issueNumber}:`, error);
      set({ error: (error as Error).message });
    }
  },

  linkPRsToIssue: async (owner: string, repo: string, issueNumber: number, prNumbers: number[]) => {
    console.log(`[STORE] 🔗 linkPRsToIssue: Linking PRs [${prNumbers.join(', ')}] to issue #${issueNumber}`);
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      if (token === "dev-token") {
        // Mock linking for dev mode
        console.log(`[STORE] 💤 linkPRsToIssue: Using dev-token, simulating...`);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // For dev mode, we need to fetch the actual PR data from the PR store
        const prStore = usePRStore.getState();
        const newLinkedPRs = prNumbers.map(prNum => {
          // Try to find the PR in the store
          const prKeys = Array.from(prStore.pullRequests.keys()) as string[];
          const prId = prKeys.find(key => key.endsWith(`#${prNum}`));
          const pr = prId ? prStore.pullRequests.get(prId) : null;

          if (pr) {
            return {
              id: pr.id,
              number: pr.number,
              state: pr.state,
              merged: pr.merged,
              draft: pr.draft,
              title: pr.title,
              head: pr.head ? { ref: pr.head.ref } : undefined,
            };
          }

          // Fallback if PR not found
          return {
            id: prNum,
            number: prNum,
            state: "open" as const,
            merged: false,
            draft: false,
            title: `PR #${prNum}`,
            head: { ref: `branch-${prNum}` },
          };
        });

        // Add to existing linked PRs
        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            const existingPRs = issue.linkedPRs || [];
            const existingNumbers = new Set(existingPRs.map(pr => pr.number));
            const toAdd = newLinkedPRs.filter(pr => !existingNumbers.has(pr.number));
            const updatedLinkedPRs = [...existingPRs, ...toAdd];
            newIssues.set(key, { ...issue, linkedPRs: updatedLinkedPRs });
            console.log(`[STORE] ✅ linkPRsToIssue: Added ${toAdd.length} PRs, now ${updatedLinkedPRs.length} total linked PRs`);
          }
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);

        // Link each PR to the issue
        for (const prNumber of prNumbers) {
          await api.linkPRToIssue(owner, repo, issueNumber, prNumber);
        }

        console.log(`[STORE] ✅ linkPRsToIssue: Successfully linked PRs to issue #${issueNumber}`);

        // Refresh the issue to get updated linked PRs from GitHub (force API to verify)
        await get().refreshIssueLinks(owner, repo, issueNumber, { forceAPI: true });
      }
    } catch (error) {
      console.error(`[STORE] ❌ linkPRsToIssue: Error for #${issueNumber}:`, error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  unlinkPRFromIssue: async (owner: string, repo: string, issueNumber: number, prNumber: number) => {
    console.log(`[STORE] 🔓 unlinkPRFromIssue: Unlinking PR #${prNumber} from issue #${issueNumber}`);
    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      if (token === "dev-token") {
        // Mock unlinking for dev mode
        console.log(`[STORE] 💤 unlinkPRFromIssue: Using dev-token, simulating...`);
        await new Promise((resolve) => setTimeout(resolve, 500));

        // For dev mode, manually remove the PR from linkedPRs
        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue && issue.linkedPRs) {
            const updatedLinkedPRs = issue.linkedPRs.filter(pr => pr.number !== prNumber);
            newIssues.set(key, { ...issue, linkedPRs: updatedLinkedPRs });
            console.log(`[STORE] ✅ unlinkPRFromIssue: Removed PR #${prNumber}, now ${updatedLinkedPRs.length} linked PRs`);
          }
          return { issues: newIssues };
        });
      } else {
        const api = new GitHubAPI(token);
        await api.unlinkPRFromIssue(owner, repo, issueNumber, prNumber);

        console.log(`[STORE] ✅ unlinkPRFromIssue: Successfully unlinked PR #${prNumber} from issue #${issueNumber}`);

        // Refresh the issue to get updated linked PRs from GitHub (force API to verify)
        await get().refreshIssueLinks(owner, repo, issueNumber, { forceAPI: true });
      }
    } catch (error) {
      console.error(`[STORE] ❌ unlinkPRFromIssue: Error:`, error);
      set({ error: (error as Error).message });
      throw error;
    }
  },

  refreshIssueLinks: async (owner: string, repo: string, issueNumber: number, options?: { forceAPI?: boolean }) => {
    const { forceAPI = false } = options || {};

    console.log(`[STORE] 🔄 refreshIssueLinks: Refreshing links for issue #${issueNumber} (forceAPI=${forceAPI})`);

    try {
      let token: string | null = null;

      if (window.electron) {
        token = await window.electron.auth.getToken();
      } else {
        const authStore = useAuthStore.getState();
        token = authStore.token;
      }

      if (!token) throw new Error("Not authenticated");

      if (token === "dev-token") {
        // Mock linked PRs for dev mode
        console.log(`[STORE] 💤 refreshIssueLinks: Using dev-token, using mock data...`);
        const mockLinkedPRs = [
          {
            id: 1,
            number: 101,
            state: "open" as const,
            merged: false,
            draft: false,
            title: "cursor/fix-issue-" + issueNumber,
            head: { ref: "cursor/fix-issue-" + issueNumber },
            author: {
              login: "cursor-bot",
              avatarUrl: "https://github.com/identicons/cursor.png"
            }
          },
          {
            id: 2,
            number: 102,
            state: "open" as const,
            merged: false,
            draft: true,
            title: "devin/resolve-issue-" + issueNumber,
            head: { ref: "devin/resolve-issue-" + issueNumber },
            author: {
              login: "devin-bot",
              avatarUrl: "https://github.com/identicons/devin.png"
            }
          }
        ];

        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            newIssues.set(key, { ...issue, linkedPRs: mockLinkedPRs });
          }
          return { issues: newIssues };
        });
      } else {
        // OPTIMIZATION: Try to use cached PR data first
        if (!forceAPI) {
          const prStore = usePRStore.getState();
          const linkedPRs = getLinkedPRsFromCache(prStore.pullRequests, owner, repo, issueNumber);

          console.log(`[STORE] 💾 refreshIssueLinks: Using cached PR data, found ${linkedPRs.length} linked PRs for issue #${issueNumber}`);

          set((state) => {
            const newIssues = new Map(state.issues);
            const key = `${owner}/${repo}#${issueNumber}`;
            const issue = newIssues.get(key);
            if (issue) {
              const updatedIssue = { ...issue, linkedPRs };
              newIssues.set(key, updatedIssue);
            } else {
              console.warn(`[STORE] ⚠️  refreshIssueLinks: Issue #${issueNumber} not found in store with key: ${key}`);
            }
            return { issues: newIssues };
          });
          return;
        }

        // Only call API if explicitly requested (e.g., after linking/unlinking)
        console.log(`[STORE] 🌐 refreshIssueLinks: Fetching from API for issue #${issueNumber}`);
        const api = new GitHubAPI(token);
        const { pullRequests } = await api.getIssueDevelopment(owner, repo, issueNumber);

        console.log(`[STORE] 📥 refreshIssueLinks: Fetched ${pullRequests.length} PRs from API for issue #${issueNumber}`);

        set((state) => {
          const newIssues = new Map(state.issues);
          const key = `${owner}/${repo}#${issueNumber}`;
          const issue = newIssues.get(key);
          if (issue) {
            const updatedIssue = { ...issue, linkedPRs: pullRequests };
            newIssues.set(key, updatedIssue);
          } else {
            console.warn(`[STORE] ⚠️  refreshIssueLinks: Issue #${issueNumber} not found in store with key: ${key}`);
          }
          return { issues: newIssues };
        });
      }
    } catch (error) {
      console.error(`[STORE] ❌ refreshIssueLinks: Error:`, error);
      set({ error: (error as Error).message });
    }
  },
}));
