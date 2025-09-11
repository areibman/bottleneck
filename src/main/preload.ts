import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:get-token'),
  },
  github: {
    getUser: () => ipcRenderer.invoke('github:get-user'),
    getRepos: (options: any) => ipcRenderer.invoke('github:get-repos', options),
    getPRs: (owner: string, repo: string, options: any) => 
      ipcRenderer.invoke('github:get-prs', { owner, repo, options }),
    getPR: (owner: string, repo: string, number: number) => 
      ipcRenderer.invoke('github:get-pr', { owner, repo, number }),
    getPRFiles: (owner: string, repo: string, number: number) => 
      ipcRenderer.invoke('github:get-pr-files', { owner, repo, number }),
    getPRComments: (owner: string, repo: string, number: number) => 
      ipcRenderer.invoke('github:get-pr-comments', { owner, repo, number }),
    createComment: (owner: string, repo: string, number: number, data: any) => 
      ipcRenderer.invoke('github:create-comment', { owner, repo, number, ...data }),
    updateComment: (owner: string, repo: string, commentId: number, body: string) => 
      ipcRenderer.invoke('github:update-comment', { owner, repo, commentId, body }),
    deleteComment: (owner: string, repo: string, commentId: number) => 
      ipcRenderer.invoke('github:delete-comment', { owner, repo, commentId }),
    createReview: (owner: string, repo: string, number: number, data: any) => 
      ipcRenderer.invoke('github:create-review', { owner, repo, number, ...data }),
    mergePR: (owner: string, repo: string, number: number, options: any) => 
      ipcRenderer.invoke('github:merge-pr', { owner, repo, number, ...options }),
  },
  git: {
    clone: (url: string, path: string) => 
      ipcRenderer.invoke('git:clone', { url, path }),
    checkout: (path: string, branch: string) => 
      ipcRenderer.invoke('git:checkout', { path, branch }),
    pull: (path: string) => 
      ipcRenderer.invoke('git:pull', { path }),
    getBranches: (path: string) => 
      ipcRenderer.invoke('git:get-branches', { path }),
  },
  db: {
    getCachedPRs: (owner: string, repo: string) => 
      ipcRenderer.invoke('db:get-cached-prs', { owner, repo }),
    cachePR: (pr: any) => 
      ipcRenderer.invoke('db:cache-pr', pr),
    getSettings: () => 
      ipcRenderer.invoke('db:get-settings'),
    saveSettings: (settings: any) => 
      ipcRenderer.invoke('db:save-settings', settings),
  },
  dialog: {
    selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  },
  on: (channel: string, callback: Function) => {
    const validChannels = ['open-preferences', 'sync-status', 'notification'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_, ...args) => callback(...args));
    }
  },
  removeListener: (channel: string, callback: Function) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
});