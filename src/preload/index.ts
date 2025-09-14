import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

console.log('Preload script is running!');

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // Authentication
  auth: {
    login: () => ipcRenderer.invoke('auth:login'),
    logout: () => ipcRenderer.invoke('auth:logout'),
    getToken: () => ipcRenderer.invoke('auth:get-token'),
  },

  // Database operations
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
  },

  // Git operations
  git: {
    clone: (repoUrl: string, localPath: string) => ipcRenderer.invoke('git:clone', repoUrl, localPath),
    checkout: (repoPath: string, branch: string) => ipcRenderer.invoke('git:checkout', repoPath, branch),
    pull: (repoPath: string) => ipcRenderer.invoke('git:pull', repoPath),
    fetch: (repoPath: string) => ipcRenderer.invoke('git:fetch', repoPath),
    getBranches: (repoPath: string) => ipcRenderer.invoke('git:branches', repoPath),
  },

  // App utilities
  app: {
    selectDirectory: () => ipcRenderer.invoke('app:select-directory'),
    getVersion: () => ipcRenderer.invoke('app:get-version'),
  },

  // Terminal operations
  terminal: {
    spawn: (cwd?: string) => ipcRenderer.invoke('terminal:spawn', cwd),
    write: (data: string) => ipcRenderer.send('terminal:write', data),
    kill: () => ipcRenderer.invoke('terminal:kill'),
    resize: (cols: number, rows: number) => ipcRenderer.invoke('terminal:resize', cols, rows),
    restart: (cwd?: string) => ipcRenderer.invoke('terminal:restart', cwd),
    health: () => ipcRenderer.invoke('terminal:health'),
    onData: (callback: (data: string) => void) => {
      ipcRenderer.on('terminal:data', (_event, data) => callback(data));
    },
    offData: () => {
      ipcRenderer.removeAllListeners('terminal:data');
    },
  },

  // Settings operations
  settings: {
    get: (key?: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('settings:set', key, value),
  },

  // Auto-updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    quitAndInstall: () => ipcRenderer.invoke('updater:quit-and-install'),
    onCheckingForUpdate: (cb: () => void) => ipcRenderer.on('updater:checking-for-update', cb),
    onUpdateAvailable: (cb: (event: IpcRendererEvent, info: any) => void) => ipcRenderer.on('updater:update-available', cb),
    onUpdateNotAvailable: (cb: (event: IpcRendererEvent, info: any) => void) => ipcRenderer.on('updater:update-not-available', cb),
    onError: (cb: (event: IpcRendererEvent, message: string) => void) => ipcRenderer.on('updater:error', cb),
    onDownloadProgress: (cb: (event: IpcRendererEvent, progress: any) => void) => ipcRenderer.on('updater:download-progress', cb),
    onUpdateDownloaded: (cb: (event: IpcRendererEvent, info: any) => void) => ipcRenderer.on('updater:update-downloaded', cb)
  },

  // IPC event listeners
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    const validChannels = [
      'open-preferences',
      'new-draft-pr',
      'clone-repository',
      'sync-all',
      'open-command-palette',
      'toggle-sidebar',
      'toggle-right-panel',
      'go-to-pr',
      'go-to-file',
      'next-pr',
      'previous-pr',
      'next-file',
      'previous-file',
      'next-comment',
      'previous-comment',
      'approve-pr',
      'request-changes',
      'submit-comment',
      'mark-file-viewed',
      'toggle-diff-view',
      'toggle-whitespace',
      'show-shortcuts'
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  off: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback);
  },

  once: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    ipcRenderer.once(channel, callback);
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electron', electronAPI);

console.log('Electron API exposed to window.electron');

// Type definitions for TypeScript
export type ElectronAPI = typeof electronAPI;
