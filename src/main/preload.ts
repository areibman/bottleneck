import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // GitHub API
  github: {
    authenticate: () => ipcRenderer.invoke('github:authenticate'),
    getUser: () => ipcRenderer.invoke('github:get-user'),
    getRepos: () => ipcRenderer.invoke('github:get-repos'),
    getPRs: (repo: string, state: string) => ipcRenderer.invoke('github:get-prs', repo, state),
    getPRDetails: (repo: string, prNumber: number) => ipcRenderer.invoke('github:get-pr-details', repo, prNumber),
    getPRFiles: (repo: string, prNumber: number) => ipcRenderer.invoke('github:get-pr-files', repo, prNumber),
    getPRComments: (repo: string, prNumber: number) => ipcRenderer.invoke('github:get-pr-comments', repo, prNumber),
    createReview: (repo: string, prNumber: number, review: any) => ipcRenderer.invoke('github:create-review', repo, prNumber, review),
    mergePR: (repo: string, prNumber: number, mergeMethod: string) => ipcRenderer.invoke('github:merge-pr', repo, prNumber, mergeMethod),
  },

  // Git API
  git: {
    clone: (url: string, path: string) => ipcRenderer.invoke('git:clone', url, path),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
    getBranches: (repoPath: string) => ipcRenderer.invoke('git:get-branches', repoPath),
    getDiff: (repoPath: string, base: string, head: string) => ipcRenderer.invoke('git:get-diff', repoPath, base, head),
  },

  // Database API
  db: {
    savePR: (pr: any) => ipcRenderer.invoke('db:save-pr', pr),
    getPRs: (filters: any) => ipcRenderer.invoke('db:get-prs', filters),
    saveComment: (comment: any) => ipcRenderer.invoke('db:save-comment', comment),
    getComments: (prId: string) => ipcRenderer.invoke('db:get-comments', prId),
  },

  // Dialog API
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  },
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      github: {
        authenticate: () => Promise<any>;
        getUser: () => Promise<any>;
        getRepos: () => Promise<any[]>;
        getPRs: (repo: string, state: string) => Promise<any[]>;
        getPRDetails: (repo: string, prNumber: number) => Promise<any>;
        getPRFiles: (repo: string, prNumber: number) => Promise<any[]>;
        getPRComments: (repo: string, prNumber: number) => Promise<any[]>;
        createReview: (repo: string, prNumber: number, review: any) => Promise<any>;
        mergePR: (repo: string, prNumber: number, mergeMethod: string) => Promise<any>;
      };
      git: {
        clone: (url: string, path: string) => Promise<any>;
        checkout: (repoPath: string, branch: string) => Promise<any>;
        getBranches: (repoPath: string) => Promise<any[]>;
        getDiff: (repoPath: string, base: string, head: string) => Promise<any>;
      };
      db: {
        savePR: (pr: any) => Promise<any>;
        getPRs: (filters: any) => Promise<any[]>;
        saveComment: (comment: any) => Promise<any>;
        getComments: (prId: string) => Promise<any[]>;
      };
      dialog: {
        selectDirectory: () => Promise<string | null>;
      };
    };
  }
}