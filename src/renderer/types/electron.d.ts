export interface ElectronAPI {
  auth: {
    login: () => Promise<{ success: boolean; token?: string; error?: string }>;
    logout: () => Promise<{ success: boolean }>;
    getToken: () => Promise<string | null>;
  };
  github: {
    getUser: () => Promise<any>;
    getRepos: (options: any) => Promise<any[]>;
    getPRs: (owner: string, repo: string, options: any) => Promise<any[]>;
    getPR: (owner: string, repo: string, number: number) => Promise<any>;
    getPRFiles: (owner: string, repo: string, number: number) => Promise<any[]>;
    getPRComments: (owner: string, repo: string, number: number) => Promise<any[]>;
    createComment: (owner: string, repo: string, number: number, data: any) => Promise<any>;
    updateComment: (owner: string, repo: string, commentId: number, body: string) => Promise<any>;
    deleteComment: (owner: string, repo: string, commentId: number) => Promise<void>;
    createReview: (owner: string, repo: string, number: number, data: any) => Promise<any>;
    mergePR: (owner: string, repo: string, number: number, options: any) => Promise<any>;
  };
  git: {
    clone: (url: string, path: string) => Promise<void>;
    checkout: (path: string, branch: string) => Promise<void>;
    pull: (path: string) => Promise<void>;
    getBranches: (path: string) => Promise<any[]>;
  };
  db: {
    getCachedPRs: (owner: string, repo: string) => Promise<any[]>;
    cachePR: (pr: any) => Promise<void>;
    getSettings: () => Promise<Record<string, any>>;
    saveSettings: (settings: any) => Promise<void>;
  };
  dialog: {
    selectDirectory: () => Promise<string | null>;
  };
  on: (channel: string, callback: Function) => void;
  removeListener: (channel: string, callback: Function) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}