import 'dotenv/config';
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { checkoutBranch, gitRun } from './git';

let mainWindow: BrowserWindow | null = null;

const isDev = !!process.env.VITE_DEV_SERVER_URL;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 900,
    title: 'Bottleneck',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
    },
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  mainWindow.on('closed', () => (mainWindow = null));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });

ipcMain.handle('ping', () => 'pong');

ipcMain.handle('openExternal', (_e, url: string) => shell.openExternal(url));

// GitHub Device Code Auth (minimal)
type DeviceStartResponse = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
};

ipcMain.handle('auth:startDevice', async (_e, scopes: string[] = ['repo','read:org','read:user','workflow','write:discussion']) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return { error: 'missing_client_id' };
  }
  const body = new URLSearchParams({ client_id: clientId, scope: scopes.join(' ') });
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as DeviceStartResponse | { error: string };
  return data;
});

ipcMain.handle('auth:pollDevice', async (_e, deviceCode: string) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return { error: 'missing_client_id' };
  const body = new URLSearchParams({
    client_id: clientId,
    device_code: deviceCode,
    grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
  });
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  return data;
});

// Minimal Git wrapper IPC
ipcMain.handle('git:run', async (_e, args: string[], cwd?: string) => {
  return gitRun(args, cwd);
});

ipcMain.handle('git:checkout', async (_e, branch: string, cwd?: string) => {
  return checkoutBranch(branch, cwd);
});

