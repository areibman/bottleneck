import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Example: invoke GitHub OAuth
  githubOAuth: () => ipcRenderer.invoke('github-oauth'),
});