import { create } from 'zustand';

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed' | 'merged';
  draft: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  assignees: Array<{
    login: string;
    avatar_url: string;
  }>;
  requested_reviewers: Array<{
    login: string;
    avatar_url: string;
  }>;
  review_comments: number;
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  mergeable?: boolean;
  mergeable_state?: string;
}

interface PullRequestGroup {
  prefix: string;
  pullRequests: PullRequest[];
  expanded: boolean;
}

interface PullRequestState {
  pullRequests: PullRequest[];
  groups: PullRequestGroup[];
  selectedPRs: Set<number>;
  filters: {
    state: 'all' | 'open' | 'closed' | 'merged' | 'draft';
    author: string;
    label: string;
    reviewer: string;
    search: string;
  };
  sortBy: 'updated' | 'created' | 'title' | 'number';
  sortDirection: 'asc' | 'desc';
  
  setPullRequests: (prs: PullRequest[]) => void;
  setGroups: (groups: PullRequestGroup[]) => void;
  togglePRSelection: (prId: number) => void;
  selectAllPRs: () => void;
  clearSelection: () => void;
  setFilter: (key: string, value: any) => void;
  setSorting: (sortBy: string, direction: 'asc' | 'desc') => void;
  toggleGroupExpansion: (prefix: string) => void;
  groupPullRequests: () => void;
}

export const usePullRequestStore = create<PullRequestState>((set, get) => ({
  pullRequests: [],
  groups: [],
  selectedPRs: new Set(),
  filters: {
    state: 'open',
    author: '',
    label: '',
    reviewer: '',
    search: '',
  },
  sortBy: 'updated',
  sortDirection: 'desc',

  setPullRequests: (prs) => {
    set({ pullRequests: prs });
    get().groupPullRequests();
  },

  setGroups: (groups) => set({ groups }),

  togglePRSelection: (prId) => {
    const selectedPRs = new Set(get().selectedPRs);
    if (selectedPRs.has(prId)) {
      selectedPRs.delete(prId);
    } else {
      selectedPRs.add(prId);
    }
    set({ selectedPRs });
  },

  selectAllPRs: () => {
    const allIds = new Set(get().pullRequests.map(pr => pr.id));
    set({ selectedPRs: allIds });
  },

  clearSelection: () => set({ selectedPRs: new Set() }),

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }));
  },

  setSorting: (sortBy, direction) => {
    set({ sortBy: sortBy as any, sortDirection: direction });
  },

  toggleGroupExpansion: (prefix) => {
    set((state) => ({
      groups: state.groups.map(group =>
        group.prefix === prefix
          ? { ...group, expanded: !group.expanded }
          : group
      )
    }));
  },

  groupPullRequests: () => {
    const { pullRequests } = get();
    const groupMap = new Map<string, PullRequest[]>();
    const ungrouped: PullRequest[] = [];

    // Group PRs by prefix
    pullRequests.forEach(pr => {
      const prefix = extractPrefix(pr.title) || extractPrefix(pr.head.ref);
      if (prefix && prefix.length >= 3) {
        if (!groupMap.has(prefix)) {
          groupMap.set(prefix, []);
        }
        groupMap.get(prefix)!.push(pr);
      } else {
        ungrouped.push(pr);
      }
    });

    // Convert to groups array
    const groups: PullRequestGroup[] = [];
    
    // Add grouped PRs
    groupMap.forEach((prs, prefix) => {
      if (prs.length > 1) {
        groups.push({
          prefix,
          pullRequests: prs,
          expanded: true,
        });
      } else {
        ungrouped.push(...prs);
      }
    });

    // Add ungrouped PRs as a special group
    if (ungrouped.length > 0) {
      groups.push({
        prefix: '__ungrouped__',
        pullRequests: ungrouped,
        expanded: true,
      });
    }

    set({ groups });
  },
}));

function extractPrefix(text: string): string | null {
  // Extract prefix from patterns like: prefix/, prefix:, prefix-, agent-123/
  const match = text.match(/^([a-zA-Z0-9-]+)[/:_-]/);
  return match ? match[1].toLowerCase() : null;
}