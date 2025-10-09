import { IpcRendererEvent } from "electron";

declare global {
  interface Window {
    electron: {
      auth: {
        login: () => Promise<{
          success: boolean;
          token?: string;
          error?: string;
        }>;
        logout: () => Promise<{ success: boolean; error?: string }>;
        getToken: () => Promise<string | null>;
      };

      git: {
        clone: (
          repoUrl: string,
          localPath: string,
        ) => Promise<{ success: boolean; error?: string }>;
        checkout: (
          repoPath: string,
          branch: string,
        ) => Promise<{ success: boolean; error?: string }>;
        pull: (
          repoPath: string,
        ) => Promise<{ success: boolean; error?: string }>;
        fetch: (
          repoPath: string,
        ) => Promise<{ success: boolean; error?: string }>;
        getBranches: (
          repoPath: string,
        ) => Promise<{ success: boolean; data?: any[]; error?: string }>;
      };

      app: {
        selectDirectory: () => Promise<string | null>;
        getVersion: () => Promise<string>;
        zoomIn: () => Promise<{ success: boolean; zoomLevel?: number; error?: string }>;
        zoomOut: () => Promise<{ success: boolean; zoomLevel?: number; error?: string }>;
        zoomReset: () => Promise<{ success: boolean; zoomLevel?: number; error?: string }>;
        getZoomLevel: () => Promise<{ success: boolean; zoomLevel?: number; error?: string }>;
      };

      updater: {
        checkForUpdates: () => Promise<{ success: boolean; updateInfo?: any; error?: string }>;
        installUpdate: () => Promise<{ success: boolean; error?: string }>;
        getStatus: () => Promise<{ success: boolean; isDev: boolean; currentVersion: string }>;
        onCheckingForUpdate: (callback: () => void) => void;
        onUpdateAvailable: (callback: (info: { version: string; releaseDate?: string; releaseNotes?: string }) => void) => void;
        onUpdateNotAvailable: (callback: (info: { version: string }) => void) => void;
        onDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => void;
        onUpdateDownloaded: (callback: (info: { version: string; releaseDate?: string }) => void) => void;
        onError: (callback: (error: { message: string }) => void) => void;
        removeAllListeners: () => void;
      };

      utils: {
        fromBase64: (data: string) => Promise<string>;
      };

      settings: {
        get: (
          key?: string,
        ) => Promise<{
          success: boolean;
          value?: any;
          settings?: any;
          error?: string;
        }>;
        set: (
          key: string,
          value: any,
        ) => Promise<{ success: boolean; error?: string }>;
        clear: () => Promise<{ success: boolean; error?: string }>;
      };

      on: (
        channel: string,
        callback: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => void;
      off: (
        channel: string,
        callback: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => void;
      once: (
        channel: string,
        callback: (event: IpcRendererEvent, ...args: any[]) => void,
      ) => void;
    };
  }
}

export { };
