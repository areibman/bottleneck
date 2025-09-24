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

      db: {
        query: (
          sql: string,
          params?: any[],
        ) => Promise<{ success: boolean; data?: any[]; error?: string }>;
        execute: (
          sql: string,
          params?: any[],
        ) => Promise<{ success: boolean; data?: any; error?: string }>;
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
