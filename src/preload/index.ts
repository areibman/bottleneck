import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";

const PRELOAD_START = performance.now();
console.log(`⏱️ [PRELOAD] Preload script started at ${PRELOAD_START.toFixed(2)}ms`);

// Define the API that will be exposed to the renderer process
const electronAPI = {
  // Authentication
  auth: {
    login: () => ipcRenderer.invoke("auth:login"),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getToken: () => ipcRenderer.invoke("auth:get-token"),
  },

  // Git operations
  git: {
    clone: (repoUrl: string, localPath: string) =>
      ipcRenderer.invoke("git:clone", repoUrl, localPath),
    checkout: (repoPath: string, branch: string) =>
      ipcRenderer.invoke("git:checkout", repoPath, branch),
    pull: (repoPath: string) => ipcRenderer.invoke("git:pull", repoPath),
    fetch: (repoPath: string) => ipcRenderer.invoke("git:fetch", repoPath),
    getBranches: (repoPath: string) =>
      ipcRenderer.invoke("git:branches", repoPath),
  },

  // App utilities
  app: {
    selectDirectory: () => ipcRenderer.invoke("app:select-directory"),
    getVersion: () => ipcRenderer.invoke("app:get-version"),
    zoomIn: () => ipcRenderer.invoke("app:zoom-in"),
    zoomOut: () => ipcRenderer.invoke("app:zoom-out"),
    zoomReset: () => ipcRenderer.invoke("app:zoom-reset"),
    getZoomLevel: () => ipcRenderer.invoke("app:get-zoom-level"),
  },

  // Auto-updater
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check-for-updates"),
    installUpdate: () => ipcRenderer.invoke("updater:install-update"),
    getStatus: () => ipcRenderer.invoke("updater:get-status"),
    onCheckingForUpdate: (callback: () => void) => {
      ipcRenderer.on("updater:checking-for-update", callback);
    },
    onUpdateAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on("updater:update-available", (_event, info) => callback(info));
    },
    onUpdateNotAvailable: (callback: (info: any) => void) => {
      ipcRenderer.on("updater:update-not-available", (_event, info) => callback(info));
    },
    onDownloadProgress: (callback: (progress: any) => void) => {
      ipcRenderer.on("updater:download-progress", (_event, progress) => callback(progress));
    },
    onUpdateDownloaded: (callback: (info: any) => void) => {
      ipcRenderer.on("updater:update-downloaded", (_event, info) => callback(info));
    },
    onError: (callback: (error: any) => void) => {
      ipcRenderer.on("updater:error", (_event, error) => callback(error));
    },
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners("updater:checking-for-update");
      ipcRenderer.removeAllListeners("updater:update-available");
      ipcRenderer.removeAllListeners("updater:update-not-available");
      ipcRenderer.removeAllListeners("updater:download-progress");
      ipcRenderer.removeAllListeners("updater:update-downloaded");
      ipcRenderer.removeAllListeners("updater:error");
    },
  },

  // Utility functions
  utils: {
    fromBase64: (data: string) => ipcRenderer.invoke("utils:fromBase64", data),
  },

  // Settings operations
  settings: {
    get: (key?: string) => ipcRenderer.invoke("settings:get", key),
    set: (key: string, value: any) =>
      ipcRenderer.invoke("settings:set", key, value),
    clear: () => ipcRenderer.invoke("settings:clear"),
  },

  // Find-in-page operations
  find: {
    start: () => ipcRenderer.invoke("find:start"),
    find: (text: string, options?: { forward?: boolean; matchCase?: boolean; findNext?: boolean }) =>
      ipcRenderer.invoke("find:find", text, options),
    stop: () => ipcRenderer.invoke("find:stop"),
  },

  // IPC event listeners
  on: (
    channel: string,
    callback: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => {
    const validChannels = [
      "open-preferences",
      "new-draft-pr",
      "clone-repository",
      "sync-all",
      "open-command-palette",
      "toggle-sidebar",
      "toggle-right-panel",
      "go-to-pr",
      "go-to-file",
      "next-pr",
      "previous-pr",
      "next-file",
      "previous-file",
      "next-comment",
      "previous-comment",
      "approve-pr",
      "request-changes",
      "submit-comment",
      "mark-file-viewed",
      "toggle-diff-view",
      "toggle-whitespace",
      "show-shortcuts",
    ];

    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },

  off: (
    channel: string,
    callback: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => {
    ipcRenderer.removeListener(channel, callback);
  },

  once: (
    channel: string,
    callback: (event: IpcRendererEvent, ...args: any[]) => void,
  ) => {
    ipcRenderer.once(channel, callback);
  },
};

// Expose the API to the renderer process
const beforeExpose = performance.now();
contextBridge.exposeInMainWorld("electron", electronAPI);

const elapsed = performance.now() - PRELOAD_START;
console.log(`⏱️ [PRELOAD] Context bridge exposed (took ${(performance.now() - beforeExpose).toFixed(2)}ms)`);
console.log(`⏱️ [PRELOAD] Preload complete in ${elapsed.toFixed(2)}ms`);

// Type definitions for TypeScript
export type ElectronAPI = typeof electronAPI;
