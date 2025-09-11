import { contextBridge, ipcRenderer } from 'electron';

const api = {
  ping: () => ipcRenderer.invoke('ping'),
  openExternal: (url: string) => ipcRenderer.invoke('openExternal', url),
  auth: {
    startDevice: (scopes?: string[]) => ipcRenderer.invoke('auth:startDevice', scopes),
    pollDevice: (deviceCode: string) => ipcRenderer.invoke('auth:pollDevice', deviceCode),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type PreloadApi = typeof api;
declare global { interface Window { api: PreloadApi } }

