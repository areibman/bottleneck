import { create } from 'zustand';
import { PullRequest, Comment } from '../../main/database/DatabaseManager';

interface User {
  id: number;
  login: string;
  name: string;
  avatar_url: string;
  email?: string;
}

interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
  private: boolean;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
}

interface AppState {
  // Authentication
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;

  // Repositories
  repositories: Repository[];
  selectedRepository: string | null;

  // Pull Requests
  pullRequests: PullRequest[];
  selectedPR: PullRequest | null;
  prFilters: {
    state: 'open' | 'closed' | 'all';
    author?: string;
    labels?: string[];
    search?: string;
  };

  // UI State
  sidebarCollapsed: boolean;
  rightPanelVisible: boolean;
  activeTab: 'conversation' | 'files';
  selectedPRs: Set<string>;

  // Loading states
  loading: {
    repos: boolean;
    prs: boolean;
    prDetails: boolean;
  };

  // Actions
  setAuthenticated: (authenticated: boolean, user?: User, token?: string) => void;
  setRepositories: (repos: Repository[]) => void;
  setSelectedRepository: (repo: string | null) => void;
  setPullRequests: (prs: PullRequest[]) => void;
  setSelectedPR: (pr: PullRequest | null) => void;
  setPRFilters: (filters: Partial<AppState['prFilters']>) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightPanelVisible: (visible: boolean) => void;
  setActiveTab: (tab: 'conversation' | 'files') => void;
  setSelectedPRs: (prs: Set<string>) => void;
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  initialize: () => Promise<void>;
  loadRepositories: () => Promise<void>;
  loadPullRequests: (repo: string) => Promise<void>;
  loadPRDetails: (repo: string, prNumber: number) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  user: null,
  token: null,
  repositories: [],
  selectedRepository: null,
  pullRequests: [],
  selectedPR: null,
  prFilters: {
    state: 'open',
  },
  sidebarCollapsed: false,
  rightPanelVisible: true,
  activeTab: 'conversation',
  selectedPRs: new Set(),
  loading: {
    repos: false,
    prs: false,
    prDetails: false,
  },

  // Actions
  setAuthenticated: (authenticated, user, token) => 
    set({ isAuthenticated: authenticated, user, token }),

  setRepositories: (repositories) => 
    set({ repositories }),

  setSelectedRepository: (selectedRepository) => 
    set({ selectedRepository }),

  setPullRequests: (pullRequests) => 
    set({ pullRequests }),

  setSelectedPR: (selectedPR) => 
    set({ selectedPR }),

  setPRFilters: (filters) => 
    set((state) => ({ prFilters: { ...state.prFilters, ...filters } })),

  setSidebarCollapsed: (sidebarCollapsed) => 
    set({ sidebarCollapsed }),

  setRightPanelVisible: (rightPanelVisible) => 
    set({ rightPanelVisible }),

  setActiveTab: (activeTab) => 
    set({ activeTab }),

  setSelectedPRs: (selectedPRs) => 
    set({ selectedPRs }),

  setLoading: (key, loading) => 
    set((state) => ({ loading: { ...state.loading, [key]: loading } })),

  initialize: async () => {
    // Check if we have a stored token
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      try {
        const user = await window.electronAPI.github.getUser();
        set({ isAuthenticated: true, user, token: storedToken });
        await get().loadRepositories();
      } catch (error) {
        console.error('Failed to authenticate with stored token:', error);
        localStorage.removeItem('github_token');
      }
    }
  },

  loadRepositories: async () => {
    const { setLoading, setRepositories } = get();
    setLoading('repos', true);
    
    try {
      const repos = await window.electronAPI.github.getRepos();
      setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setLoading('repos', false);
    }
  },

  loadPullRequests: async (repo: string) => {
    const { setLoading, setPullRequests, prFilters } = get();
    setLoading('prs', true);
    
    try {
      const prs = await window.electronAPI.github.getPRs(repo, prFilters.state);
      setPullRequests(prs);
    } catch (error) {
      console.error('Failed to load pull requests:', error);
    } finally {
      setLoading('prs', false);
    }
  },

  loadPRDetails: async (repo: string, prNumber: number) => {
    const { setLoading, setSelectedPR } = get();
    setLoading('prDetails', true);
    
    try {
      const pr = await window.electronAPI.github.getPRDetails(repo, prNumber);
      setSelectedPR(pr);
    } catch (error) {
      console.error('Failed to load PR details:', error);
    } finally {
      setLoading('prDetails', false);
    }
  },
}));